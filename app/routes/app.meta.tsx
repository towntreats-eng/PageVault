import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  TextField,
  Banner,
  IndexTable,
  Badge,
  Divider,
  Box,
  ProgressBar,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getSeoSettings, updateSeoSettings } from "../services/seo.server";
import { renderMetaTemplate } from "../utils/template";
import { isGeminiConfigured, generateAiMetaTags } from "../services/gemini.server";
import { writeResourceSeoMetafield, revertLast24HourChanges } from "../services/meta_writer.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const settings = await getSeoSettings(session.shop);
  const shopName = session.shop.replace(".myshopify.com", "");
  const geminiActive = await isGeminiConfigured(session.shop);

  const { executeShopifyGraphQL } = await import("../services/graphql.server");
  const prisma = (await import("../db.server")).default;

  const res: any = await executeShopifyGraphQL(
    admin,
    `query metaProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            vendor
            description
            seo { title description }
            priceRangeV2 { minVariantPrice { amount currencyCode } }
          }
        }
      }
    }`,
    { first: 50 }
  );

  const nodes = (res?.data?.products?.edges ?? []).map((e: any) => e.node);

  const changes = await prisma.change.findMany({
    where: { shop_domain: session.shop, field: "title_tag", reverted_at: null },
    orderBy: { applied_at: "desc" },
  });
  const verifications = await prisma.verification.findMany({
    where: { shop_domain: session.shop },
    orderBy: { attempted_at: "desc" },
  });
  const latestChangeByGid = new Map<string, string>();
  for (const c of changes) if (!latestChangeByGid.has(c.resource_gid)) latestChangeByGid.set(c.resource_gid, c.id);
  const resultByChangeId = new Map(verifications.map((v) => [v.change_id, v.result]));

  type MetaProductRow = {
    id: string;
    title: string;
    handle: string;
    description: string;
    vendor: string;
    price: string;
    currentMetaTitle: string | null;
    currentMetaDesc: string | null;
    humanCustomTitle: string | null;
    status: string;
  };

  const products: MetaProductRow[] = nodes.map((n: any) => {
    const changeId = latestChangeByGid.get(n.id);
    const verdict = changeId ? resultByChangeId.get(changeId) : undefined;
    return {
      id: n.id,
      title: n.title,
      handle: n.handle || "",
      description: n.description || "",
      vendor: n.vendor ?? "",
      price: n.priceRangeV2?.minVariantPrice
        ? `${n.priceRangeV2.minVariantPrice.amount} ${n.priceRangeV2.minVariantPrice.currencyCode}`
        : "",
      currentMetaTitle: n.seo?.title || null,
      currentMetaDesc: n.seo?.description || null,
      humanCustomTitle: !changeId && n.seo?.title ? n.seo.title : null,
      status: verdict === "PASS" ? "Verified" : verdict === "PENDING" ? "Applied" : verdict === "FAIL" ? "Not detected" : changeId ? "Applied" : "Not started",
    };
  });

  return json({ settings, products, shopName, geminiActive, shopDomain: session.shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "undo_24h") {
    const undoResult = await revertLast24HourChanges(admin, session.shop);
    return json({ kind: "undo" as const, success: true, message: `Reverted ${undoResult.revertedCount} meta changes applied in the last 24 hours.` });
  }

  if (intent === "save_template") {
    const titleTemplate = String(formData.get("titleTemplate") || "");
    const descTemplate = String(formData.get("descTemplate") || "");
    await updateSeoSettings(session.shop, {
      product_title_template: titleTemplate,
      product_desc_template: descTemplate,
    });
    return json({ kind: "template_saved" as const, success: true, message: "Templates saved successfully." });
  }

  if (intent === "generate_ai_meta") {
    const productId = String(formData.get("productId") || "");
    const productTitle = String(formData.get("productTitle") || "");
    const description = String(formData.get("description") || "");
    const vendor = String(formData.get("vendor") || "");
    const price = String(formData.get("price") || "");
    const shopName = session.shop.replace(".myshopify.com", "");

    try {
      const aiMeta = await generateAiMetaTags({
        productTitle,
        description,
        vendor,
        price,
        shopName,
        shopDomain: session.shop,
      });
      return json({ kind: "ai_generated" as const, success: true, productId, aiMeta });
    } catch (err) {
      return json({ kind: "ai_generated" as const, success: false, productId, error: (err as Error).message });
    }
  }

  if (intent === "apply_ai_meta") {
    const productId = String(formData.get("productId") || "");
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const handle = String(formData.get("handle") || "");
    const pageUrl = `https://${session.shop}/products/${handle}`;

    try {
      if (title) {
        await writeResourceSeoMetafield(admin, session.shop, productId, "title_tag", title, pageUrl, "manual");
      }
      if (description) {
        await writeResourceSeoMetafield(admin, session.shop, productId, "description_tag", description, pageUrl, "manual");
      }
      return json({ kind: "ai_applied" as const, success: true, productId, message: `Successfully updated SEO tags for this product and queued live verification.` });
    } catch (err) {
      return json({ kind: "ai_applied" as const, success: false, productId, error: (err as Error).message });
    }
  }

  if (intent === "bulk_ai_optimize") {
    const rawIds = String(formData.get("productIds") || "[]");
    const ids: string[] = JSON.parse(rawIds);
    const shopName = session.shop.replace(".myshopify.com", "");

    // Fetch product details for these IDs
    const { executeShopifyGraphQL } = await import("../services/graphql.server");
    let optimizedCount = 0;
    const errors: string[] = [];

    for (const pid of ids.slice(0, 10)) { // limit to 10 per request to avoid timeout
      try {
        const prodRes: any = await executeShopifyGraphQL(
          admin,
          `query getProd($id: ID!) {
            product(id: $id) {
              id title handle vendor description
              priceRangeV2 { minVariantPrice { amount currencyCode } }
            }
          }`,
          { id: pid }
        );
        const p = prodRes?.data?.product;
        if (!p) continue;

        const ai = await generateAiMetaTags({
          productTitle: p.title,
          description: p.description,
          vendor: p.vendor,
          price: p.priceRangeV2?.minVariantPrice?.amount,
          shopName,
          shopDomain: session.shop,
        });

        const targetUrl = `https://${session.shop}/products/${p.handle}`;
        await writeResourceSeoMetafield(admin, session.shop, p.id, "title_tag", ai.title, targetUrl, "bulk");
        await writeResourceSeoMetafield(admin, session.shop, p.id, "description_tag", ai.description, targetUrl, "bulk");
        optimizedCount++;
      } catch (err) {
        errors.push((err as Error).message);
      }
    }

    return json({
      kind: "bulk_applied" as const,
      success: optimizedCount > 0,
      optimizedCount,
      errors,
      message: `Bulk AI Optimization: ${optimizedCount} products optimized with Google Gemini and queued for verification.`,
    });
  }

  return json({ kind: "none" as const });
};

export default function MetaTagsPage() {
  const { settings, products, shopName, geminiActive, shopDomain } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const isBusy = navigation.state === "submitting";
  const [titleTemplate, setTitleTemplate] = useState(settings.product_title_template);
  const [descTemplate, setDescTemplate] = useState(settings.product_desc_template);

  // Active AI generation preview state
  const [activeAiProductId, setActiveAiProductId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDesc, setEditingDesc] = useState("");
  const [focusKeywords, setFocusKeywords] = useState<string[]>([]);
  const [reasoning, setReasoning] = useState("");

  // Sync action data when AI responds
  if (
    actionData?.kind === "ai_generated" &&
    actionData.success &&
    "aiMeta" in actionData &&
    actionData.aiMeta &&
    activeAiProductId !== actionData.productId
  ) {
    setActiveAiProductId(actionData.productId);
    setEditingTitle(actionData.aiMeta.title);
    setEditingDesc(actionData.aiMeta.description);
    setFocusKeywords(actionData.aiMeta.focusKeywords || []);
    setReasoning(actionData.aiMeta.reasoning || "");
  }

  const handleGenerateAi = (product: any) => {
    setActiveAiProductId(product.id);
    submit(
      {
        intent: "generate_ai_meta",
        productId: product.id,
        productTitle: product.title,
        description: product.description,
        vendor: product.vendor,
        price: product.price,
      },
      { method: "post" }
    );
  };

  const handleApplyAi = (product: any) => {
    submit(
      {
        intent: "apply_ai_meta",
        productId: product.id,
        title: editingTitle,
        description: editingDesc,
        handle: product.handle,
      },
      { method: "post" }
    );
  };

  const handleBulkAiOptimize = () => {
    const targetIds = products
      .filter((p) => !p.humanCustomTitle || p.status !== "Verified")
      .slice(0, 8)
      .map((p) => p.id);

    submit(
      {
        intent: "bulk_ai_optimize",
        productIds: JSON.stringify(targetIds),
      },
      { method: "post" }
    );
  };

  const handleSaveTemplate = () => {
    submit({ intent: "save_template", titleTemplate, descTemplate }, { method: "post" });
  };

  const handleUndo24h = () => {
    submit({ intent: "undo_24h" }, { method: "post" });
  };

  const activeProduct = products.find((p) => p.id === activeAiProductId);

  return (
    <Page
      title="Meta Tag Studio"
      subtitle="AI-driven Meta Title & Description Generator powered by Google Gemini 2.5 Flash."
      primaryAction={{
        content: isBusy ? "Processing..." : "⚡ Bulk AI Optimize (Gemini)",
        loading: isBusy,
        disabled: !geminiActive,
        onAction: handleBulkAiOptimize,
      }}
      secondaryActions={[
        {
          content: "↩️ Undo Last 24h Changes",
          onAction: handleUndo24h,
        },
      ]}
    >
      <BlockStack gap="500">
        {/* Gemini Status Banner */}
        {!geminiActive ? (
          <Banner
            tone="warning"
            title="Google Gemini API Key Required"
            action={{ content: "Configure Gemini Key", url: "/app/settings" }}
          >
            <p>
              To generate high-CTR, search-optimized Title and Meta Descriptions with Google Gemini AI, configure your API key in Settings.
            </p>
          </Banner>
        ) : (
          <Banner tone="success" title="⚡ Google Gemini 2.5 Flash Active">
            <p>
              AI Meta Generator is operational. Click <strong>Generate with Gemini</strong> on any product below to create tailored, ranking-optimized search snippets.
            </p>
          </Banner>
        )}

        {/* Action Notifications */}
        {actionData?.kind === "ai_applied" && (
          <Banner tone={actionData.success ? "success" : "critical"} title={actionData.success ? "Applied & Queued" : "Error"}>
            <p>
              {"message" in actionData
                ? actionData.message
                : "error" in actionData
                ? actionData.error
                : "Applied."}
            </p>
          </Banner>
        )}

        {actionData?.kind === "bulk_applied" && (
          <Banner tone={actionData.success ? "success" : "warning"} title="Bulk AI Optimization Complete">
            <p>{actionData.message}</p>
          </Banner>
        )}

        {actionData?.kind === "template_saved" && (
          <Banner tone="success" title="Templates Saved">
            <p>{actionData.message}</p>
          </Banner>
        )}

        {actionData?.kind === "undo" && (
          <Banner tone="info" title="Undo Complete">
            <p>{actionData.message}</p>
          </Banner>
        )}

        {/* Active AI Inspector / Preview Modal Card */}
        {activeProduct && (
          <Card padding="500">
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="300" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    ⚡ Gemini AI Optimizer: {activeProduct.title}
                  </Text>
                  <Badge tone="info">Live AI Preview</Badge>
                </InlineStack>
                <Button variant="plain" onClick={() => setActiveAiProductId(null)}>
                  Close
                </Button>
              </InlineStack>

              <Divider />

              {/* Google Search Live SERP Preview Box */}
              <Box
                padding="400"
                background="bg-surface-secondary"
                borderRadius="200"
                borderWidth="025"
                borderColor="border"
              >
                <BlockStack gap="100">
                  <Text as="p" variant="bodyXs" tone="subdued">
                    Google Search Result Snippet Preview:
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    https://{shopDomain} &gt; products &gt; {activeProduct.handle}
                  </Text>
                  <Text as="p" variant="headingMd" fontWeight="semibold">
                    <span style={{ color: "#1a0dab", cursor: "pointer" }}>
                      {editingTitle || activeProduct.title}
                    </span>
                  </Text>
                  <Text as="p" variant="bodySm">
                    <span style={{ color: "#4d5156" }}>
                      {editingDesc || "Shop now with fast delivery and premium quality guaranteed."}
                    </span>
                  </Text>
                </BlockStack>
              </Box>

              {/* Editing Controls */}
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm" fontWeight="semibold">
                    Optimized Meta Title Tag
                  </Text>
                  <Badge
                    tone={
                      editingTitle.length >= 50 && editingTitle.length <= 60
                        ? "success"
                        : editingTitle.length > 60
                        ? "warning"
                        : "attention"
                    }
                  >
                    {`${editingTitle.length}/60 chars (Recommended: 50-60)`}
                  </Badge>
                </InlineStack>
                <TextField
                  label=""
                  labelHidden
                  value={editingTitle}
                  onChange={setEditingTitle}
                  autoComplete="off"
                />

                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm" fontWeight="semibold">
                    Optimized Meta Description Tag
                  </Text>
                  <Badge
                    tone={
                      editingDesc.length >= 140 && editingDesc.length <= 160
                        ? "success"
                        : editingDesc.length > 160
                        ? "warning"
                        : "attention"
                    }
                  >
                    {`${editingDesc.length}/160 chars (Recommended: 140-160)`}
                  </Badge>
                </InlineStack>
                <TextField
                  label=""
                  labelHidden
                  value={editingDesc}
                  onChange={setEditingDesc}
                  multiline={3}
                  autoComplete="off"
                />

                {focusKeywords.length > 0 && (
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="span" variant="bodySm" tone="subdued">Target Keywords:</Text>
                    {focusKeywords.map((kw, i) => (
                      <Badge key={i}>{kw}</Badge>
                    ))}
                  </InlineStack>
                )}

                {reasoning && (
                  <Text as="p" variant="bodyXs" tone="subdued">
                    AI Strategy: {reasoning}
                  </Text>
                )}

                <InlineStack gap="300">
                  <Button
                    variant="primary"
                    loading={isBusy}
                    onClick={() => handleApplyAi(activeProduct)}
                  >
                    ✓ Apply to Store & Verify Live
                  </Button>
                  <Button
                    loading={isBusy}
                    onClick={() => handleGenerateAi(activeProduct)}
                  >
                    🔄 Re-generate with Gemini
                  </Button>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        )}

        {/* Bulk Template Rules Engine */}
        <Card padding="500">
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">Bulk Meta Tag Formula Template</Text>
              <Badge tone="info">MANUAL-VALUE PROTECTION ACTIVE</Badge>
            </InlineStack>
            <Text as="p" variant="bodySm" tone="subdued">
              Used as fallback template. Custom human-written meta titles will never be overwritten.
            </Text>

            <TextField
              label="Product Title SEO Template"
              value={titleTemplate}
              onChange={setTitleTemplate}
              helpText="Available variables: {product_title}, {shop_name}, {price}, {vendor}"
              autoComplete="off"
            />

            <TextField
              label="Product Meta Description SEO Template"
              value={descTemplate}
              onChange={setDescTemplate}
              multiline={3}
              helpText="Keep between 140-160 characters for maximum Google search CTR."
              autoComplete="off"
            />

            <InlineStack align="end">
              <Button onClick={handleSaveTemplate} loading={isBusy}>
                Save Fallback Templates
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Product Catalog SEO Table */}
        <Card padding="0">
          <BlockStack gap="0">
            <IndexTable
              resourceName={{ singular: "product", plural: "products" }}
              itemCount={products.length}
              headings={[
                { title: "Product" },
                { title: "Current Search Title Tag" },
                { title: "Status" },
                { title: "AI Action" },
              ]}
              selectable={false}
            >
              {products.map((p, index) => {
                const generatedTitle =
                  p.humanCustomTitle ||
                  renderMetaTemplate(titleTemplate, {
                    productTitle: p.title,
                    shopName,
                    price: p.price,
                  });

                return (
                  <IndexTable.Row id={p.id} key={p.id} position={index}>
                    <IndexTable.Cell>
                      <BlockStack gap="050">
                        <Text as="span" fontWeight="bold">
                          {p.title}
                        </Text>
                        <Text as="span" variant="bodyXs" tone="subdued">
                          {p.vendor || "No brand"} · {p.price || "Free"}
                        </Text>
                      </BlockStack>
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <Text as="span">{p.currentMetaTitle || generatedTitle}</Text>
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      {p.humanCustomTitle ? (
                        <Badge tone="attention">Human Custom</Badge>
                      ) : (
                        <Badge
                          tone={
                            p.status === "Verified"
                              ? "success"
                              : p.status === "Applied"
                              ? "info"
                              : p.status === "Not detected"
                              ? "warning"
                              : undefined
                          }
                        >
                          {p.status}
                        </Badge>
                      )}
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <Button
                        size="slim"
                        disabled={!geminiActive}
                        loading={isBusy && activeAiProductId === p.id}
                        onClick={() => handleGenerateAi(p)}
                      >
                        ⚡ Generate with Gemini
                      </Button>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                );
              })}
            </IndexTable>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
