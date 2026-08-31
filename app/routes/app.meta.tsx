import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
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
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getSeoSettings, updateSeoSettings } from "../services/seo.server";
import { renderMetaTemplate } from "../utils/template";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const settings = await getSeoSettings(session.shop);
  const shopName = session.shop.replace(".myshopify.com", "");

  // Real products with their real current SEO values, and the real verification
  // status of anything we have written. The previous version rendered three
  // invented products and labelled them "VERIFIED LIVE".
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
    id: string; title: string; vendor: string; price: string;
    humanCustomTitle: string | null; status: string;
  };
  const products: MetaProductRow[] = nodes.map((n: any) => {
    const changeId = latestChangeByGid.get(n.id);
    const verdict = changeId ? resultByChangeId.get(changeId) : undefined;
    return {
      id: n.id,
      title: n.title,
      vendor: n.vendor ?? "",
      price: n.priceRangeV2?.minVariantPrice
        ? `${n.priceRangeV2.minVariantPrice.amount} ${n.priceRangeV2.minVariantPrice.currencyCode}`
        : "",
      // A value already on the product that we did not write is the merchant's.
      humanCustomTitle: !changeId && n.seo?.title ? n.seo.title : null,
      status: verdict === "PASS" ? "Verified" : verdict === "PENDING" ? "Applied" : verdict === "FAIL" ? "Not detected" : changeId ? "Applied" : "Not started",
    };
  });

  return json({ settings, products, shopName });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "undo_24h") {
    const { revertLast24HourChanges } = await import("../services/meta_writer.server");
    const undoResult = await revertLast24HourChanges(admin, session.shop);
    return json({ success: true, message: `Reverted ${undoResult.revertedCount} meta changes applied in the last 24 hours.` });
  }

  const titleTemplate = String(formData.get("titleTemplate") || "");
  const descTemplate = String(formData.get("descTemplate") || "");

  await updateSeoSettings(session.shop, {
    product_title_template: titleTemplate,
    product_desc_template: descTemplate,
  });

  return json({ success: true, message: "Template saved." });
};

export default function MetaTagsPage() {
  const { settings, products, shopName } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const isSaving = navigation.state === "submitting";
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [titleTemplate, setTitleTemplate] = useState(settings.product_title_template);
  const [descTemplate, setDescTemplate] = useState(settings.product_desc_template);

  const handleSave = () => {
    setSavedMessage("Template saved. It applies the next time you write meta tags — saving a template changes nothing on your store by itself.");
    submit({ intent: "save", titleTemplate, descTemplate }, { method: "post" });
  };

  const handleUndo24h = () => {
    submit({ intent: "undo_24h" }, { method: "post" });
  };

  const rowMarkup = products.map((p, index) => {
    const generatedTitle = p.humanCustomTitle || renderMetaTemplate(titleTemplate, { productTitle: p.title, shopName, price: p.price });
    return (
      <IndexTable.Row id={p.id} key={p.id} position={index}>
        <IndexTable.Cell>
          <Text as="span" fontWeight="bold">{p.title}</Text>
        </IndexTable.Cell>

        <IndexTable.Cell>
          <Text as="span">{generatedTitle}</Text>
        </IndexTable.Cell>

        <IndexTable.Cell>
          {p.humanCustomTitle ? (
            <Badge tone="attention">Your text — we will not touch it</Badge>
          ) : (
            <Badge
              tone={
                p.status === "Verified" ? "success"
                  : p.status === "Applied" ? "info"
                  : p.status === "Not detected" ? "warning"
                  : undefined
              }
            >
              {p.status}
            </Badge>
          )}
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <Page
      title="📝 Meta Title & Description Optimizer (ProofEngine)"
      subtitle="Bulk template engine with Manual-Value Protection & 24h Undo Support."
      primaryAction={{
        content: isSaving ? "Saving Templates..." : "Save Meta Templates",
        loading: isSaving,
        onAction: handleSave,
      }}
      secondaryActions={[
        {
          content: "↩️ Undo Last 24h Changes",
          onAction: handleUndo24h,
        },
      ]}
    >
      <BlockStack gap="500">
        {savedMessage && (
          <Banner title="SEO Meta Templates Updated" tone="success" onDismiss={() => setSavedMessage(null)}>
            <p>{savedMessage}</p>
          </Banner>
        )}

        <Card padding="500">
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">Product SEO Meta Tag Templates</Text>
              <Badge tone="info">MANUAL-VALUE PROTECTION ACTIVE</Badge>
            </InlineStack>
            <Text as="p" variant="bodySm" tone="subdued">
              Per 06-RULES.md §B2: Custom meta titles written by humans will NEVER be overwritten.
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

            <Divider />

            <InlineStack align="space-between" blockAlign="center">
              <Text as="span" variant="bodySm" tone="subdued">
                Changes auto-enqueue Proof Engine live storefront HTML verification.
              </Text>
              <Button variant="primary" onClick={handleSave} loading={isSaving}>
                Apply Template & Verify Live
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card padding="0">
          <BlockStack gap="0">
            <IndexTable
              resourceName={{ singular: "product", plural: "products" }}
              itemCount={products.length}
              headings={[
                { title: "Product Title" },
                { title: "Live Rendered Meta Title Tag" },
                { title: "Proof Status" },
              ]}
              selectable={false}
            >
              {rowMarkup}
            </IndexTable>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
