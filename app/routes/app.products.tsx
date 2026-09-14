import { useState } from "react";
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  TextField,
  Banner,
  useIndexResourceState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { AIService } from "../services/ai.server";
import { executeGraphQL } from "../services/graphql.server";
import { recordContentVersion } from "../services/versions.server";
import { DiffPreviewModal, type DiffPreviewData } from "../components/DiffPreviewModal";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const filter = url.searchParams.get("filter") || "all";

  try {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    const shop = await prisma.shop.findUnique({
      where: { domain: shopDomain },
      select: { brandVoice: true },
    });

    const whereClause: any = { shopDomain };
    if (query) {
      whereClause.OR = [
        { title: { contains: query } },
        { productType: { contains: query } },
        { vendor: { contains: query } },
      ];
    }
    if (filter === "needs_opt") {
      whereClause.isOptimized = false;
    } else if (filter === "optimized") {
      whereClause.isOptimized = true;
    }

    const products = await prisma.productRecord.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return json({
      products,
      brandVoice: shop?.brandVoice || "professional",
      query,
      filter,
    });
  } catch (error) {
    console.error("[Products Loader Error]", error);
    return json({
      products: [],
      brandVoice: "professional",
      query,
      filter,
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "preview_single") {
    const productGid = formData.get("productGid") as string;
    const product = await prisma.productRecord.findUnique({ where: { shopifyGid: productGid } });
    if (!product) return json({ error: "Product not found" }, { status: 404 });

    const shop = await prisma.shop.findUnique({ where: { domain: shopDomain } });
    const aiResult = await AIService.optimizeProduct(shopDomain, product, shop?.brandVoice || "professional");

    const previewData: DiffPreviewData = {
      resourceGid: product.shopifyGid,
      resourceTitle: product.title,
      original: {
        title: product.title,
        description: product.description || "",
        seoTitle: product.seoTitle || "",
        seoDescription: product.seoDescription || "",
      },
      proposed: {
        title: aiResult.title,
        description: aiResult.description,
        seoTitle: aiResult.seoTitle,
        seoDescription: aiResult.seoDescription,
        imageAlts: aiResult.imageAlts,
        rationale: aiResult.rationale,
      },
    };

    return json({ actionType: "preview_single", previewData });
  }

  if (actionType === "publish_changes") {
    const productGid = formData.get("productGid") as string;
    const newTitle = formData.get("title") as string;
    const newDesc = formData.get("description") as string;
    const newSeoTitle = formData.get("seoTitle") as string;
    const newSeoDesc = formData.get("seoDescription") as string;

    const product = await prisma.productRecord.findUnique({ where: { shopifyGid: productGid } });
    if (!product) return json({ error: "Product not found" }, { status: 404 });

    // 1. Save Pre-Change Version Snapshots
    await Promise.all([
      recordContentVersion({
        shopDomain,
        resourceType: "product",
        resourceGid: productGid,
        field: "title",
        beforeValue: product.title,
        afterValue: newTitle,
      }),
      recordContentVersion({
        shopDomain,
        resourceType: "product",
        resourceGid: productGid,
        field: "description",
        beforeValue: product.description || "",
        afterValue: newDesc,
      }),
      recordContentVersion({
        shopDomain,
        resourceType: "product",
        resourceGid: productGid,
        field: "seo_title",
        beforeValue: product.seoTitle || "",
        afterValue: newSeoTitle,
      }),
      recordContentVersion({
        shopDomain,
        resourceType: "product",
        resourceGid: productGid,
        field: "seo_description",
        beforeValue: product.seoDescription || "",
        afterValue: newSeoDesc,
      }),
    ]);

    // 2. Publish to Shopify GraphQL
    const updateProductMutation = `#graphql
      mutation updateProduct($input: ProductInput!) {
        productUpdate(input: $input) {
          product { id title }
          userErrors { field message }
        }
      }
    `;
    await executeGraphQL(admin, updateProductMutation, {
      input: {
        id: productGid,
        title: newTitle,
        descriptionHtml: newDesc,
      },
    });

    // Publish Metafields (title_tag and description_tag)
    const setMetafieldsMutation = `#graphql
      mutation setMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id value }
          userErrors { field message }
        }
      }
    `;
    await executeGraphQL(admin, setMetafieldsMutation, {
      metafields: [
        {
          ownerId: productGid,
          namespace: "global",
          key: "title_tag",
          value: newSeoTitle,
          type: "single_line_text_field",
        },
        {
          ownerId: productGid,
          namespace: "global",
          key: "description_tag",
          value: newSeoDesc,
          type: "single_line_text_field",
        },
      ],
    });

    // 3. Update local product record
    await prisma.productRecord.update({
      where: { shopifyGid: productGid },
      data: {
        title: newTitle,
        description: newDesc,
        seoTitle: newSeoTitle,
        seoDescription: newSeoDesc,
        isOptimized: true,
      },
    });

    return json({
      actionType: "publish_changes",
      success: true,
      message: `Successfully published AI SEO updates to Shopify for "${newTitle}". Version snapshot saved.`,
    });
  }

  return json({ success: false, message: "Unknown action" });
};

export default function ProductsPage() {
  const { products, query: initialQuery } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [query, setQuery] = useState(initialQuery);
  const [activePreview, setActivePreview] = useState<DiffPreviewData | null>(null);

  const resourceIDResolver = (product: (typeof products)[0]) => product.id;
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products, { resourceIDResolver });

  // Open modal when preview data arrives from action
  if (actionData?.actionType === "preview_single" && actionData.previewData && !activePreview) {
    setActivePreview(actionData.previewData);
  }

  const handleGeneratePreview = (productGid: string) => {
    submit({ actionType: "preview_single", productGid }, { method: "post" });
  };

  const handleApplyDiff = (edited: {
    title: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
  }) => {
    if (!activePreview) return;
    submit(
      {
        actionType: "publish_changes",
        productGid: activePreview.resourceGid,
        title: edited.title,
        description: edited.description,
        seoTitle: edited.seoTitle,
        seoDescription: edited.seoDescription,
      },
      { method: "post" }
    );
    setActivePreview(null);
  };

  const isPreviewLoading =
    navigation.state === "submitting" && navigation.formData?.get("actionType") === "preview_single";

  const rowMarkup = products.map((p, index) => (
    <IndexTable.Row
      id={p.id}
      key={p.id}
      selected={selectedResources.includes(p.id)}
      position={index}
    >
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" fontWeight="bold">
          {p.title}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{p.productType || "Standard"}</IndexTable.Cell>
      <IndexTable.Cell>
        {p.seoTitle ? (
          <Text as="span" variant="bodySm" tone="success">
            Configured ({p.seoTitle.length} chars)
          </Text>
        ) : (
          <Text as="span" variant="bodySm" tone="critical">
            Missing
          </Text>
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {p.seoDescription ? (
          <Text as="span" variant="bodySm" tone="success">
            Configured ({p.seoDescription.length} chars)
          </Text>
        ) : (
          <Text as="span" variant="bodySm" tone="critical">
            Missing
          </Text>
        )}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={p.isOptimized ? "success" : "attention"}>
          {p.isOptimized ? "Optimized" : "Needs SEO"}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Button
          size="micro"
          variant="primary"
          onClick={() => handleGeneratePreview(p.shopifyGid)}
          loading={isPreviewLoading && navigation.formData?.get("productGid") === p.shopifyGid}
        >
          AI Optimize
        </Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Product SEO Optimizer"
      subtitle="Analyze and rewrite product titles, conversion descriptions, and Google SERP snippets"
      primaryAction={{
        content: "Scan / Refresh Catalog",
        url: "/app",
      }}
    >
      <BlockStack gap="400">
        {actionData?.message && (
          <Banner tone={actionData.success ? "success" : "critical"}>
            <p>{actionData.message}</p>
          </Banner>
        )}

        <Card padding="300">
          <InlineStack align="space-between">
            <div style={{ flex: 1, maxWidth: "400px" }}>
              <TextField
                label="Search Products"
                labelHidden
                placeholder="Search by title, product type, vendor..."
                value={query}
                onChange={setQuery}
                clearButton
                onClearButtonClick={() => setQuery("")}
                autoComplete="off"
              />
            </div>
            <InlineStack gap="200">
              <Button url="/app/products?filter=all">All ({products.length})</Button>
              <Button url="/app/products?filter=needs_opt">Needs SEO</Button>
              <Button url="/app/products?filter=optimized">Optimized</Button>
            </InlineStack>
          </InlineStack>
        </Card>

        <Card padding="0">
          <IndexTable
            resourceName={{ singular: "product", plural: "products" }}
            itemCount={products.length}
            selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
            onSelectionChange={handleSelectionChange}
            headings={[
              { title: "Product Title" },
              { title: "Product Type" },
              { title: "SEO Title Tag" },
              { title: "Meta Description" },
              { title: "Status" },
              { title: "Action" },
            ]}
          >
            {rowMarkup}
          </IndexTable>
        </Card>

        {/* Reusable Side-by-Side Diff Preview Modal */}
        <DiffPreviewModal
          open={Boolean(activePreview)}
          data={activePreview}
          onClose={() => setActivePreview(null)}
          onApply={handleApplyDiff}
          loading={navigation.state === "submitting" && navigation.formData?.get("actionType") === "publish_changes"}
        />
      </BlockStack>
    </Page>
  );
}
