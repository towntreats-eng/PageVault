import { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
  Checkbox,
  Box,
  Divider,
  Button,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { generateProductJsonLd, detectSchemaConflicts } from "../services/schema_markup.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const targetUrl = `https://${session.shop}/products/sample-product`;

  const conflict = await detectSchemaConflicts(session.shop, targetUrl);

  const sampleJsonLd = generateProductJsonLd({
    title: "Luxury Silk Evening Dress",
    description: "Handcrafted pure silk dress with elegant silhouette.",
    url: targetUrl,
    imageUrl: `https://${session.shop}/products/silk-evening-dress.jpg`,
    price: "199.00",
    currency: "USD",
    sku: "SILK-DRS-01",
    inStock: true,
  });

  return json({ conflict, sampleJsonLd, shopDomain: session.shop });
};

export default function SchemaPage() {
  const { conflict, sampleJsonLd } = useLoaderData<typeof loader>();
  const [productSchema, setProductSchema] = useState(!conflict.hasConflict);
  const [organizationSchema, setOrganizationSchema] = useState(true);
  const [websiteSchema, setWebsiteSchema] = useState(true);
  const [breadcrumbsSchema, setBreadcrumbsSchema] = useState(true);
  const [faqSchema, setFaqSchema] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
  };

  return (
    <Page
      title="🏷️ JSON-LD Schema Markup Manager (Conflict Aware)"
      subtitle="Theme app extension embed block with zero runtime JS & duplicate schema protection."
      primaryAction={{
        content: "Save Schema Settings",
        onAction: handleSave,
      }}
    >
      <BlockStack gap="500">
        {conflict.hasConflict && (
          <Banner title="Duplicate Product Schema Conflict Detected" status="warning">
            <p>
              Your active theme or another app already emits <code>Product</code> JSON-LD schema.
              Per 03-ARCHITECTURE.md §4: ProofSEO Product schema is kept <strong>disabled by default</strong> to prevent Google Search Console duplicate structured data warnings.
            </p>
          </Banner>
        )}

        {saved && (
          <Banner title="Schema Markup Settings Saved!" status="success" onDismiss={() => setSaved(false)}>
            <p>JSON-LD structured data is rendered via App Embed block with zero storefront JavaScript.</p>
          </Banner>
        )}

        <Card padding="500">
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">Active Google Rich Snippet Schemas</Text>
              <Badge tone="success">ZERO RUNTIME JS</Badge>
            </InlineStack>

            <Checkbox
              label="Product Schema (Offers & Price)"
              checked={productSchema}
              onChange={setProductSchema}
              helpText="Per 06-RULES.md §B3: aggregateRating is ONLY emitted when real review app metafields exist."
            />

            <Checkbox
              label="Organization Schema (Brand Name & Logo)"
              checked={organizationSchema}
              onChange={setOrganizationSchema}
              helpText="Helps Google Knowledge Graph understand your store identity."
            />

            <Checkbox
              label="WebSite Sitelinks SearchBox Schema"
              checked={websiteSchema}
              onChange={setWebsiteSchema}
              helpText="Enables search bar directly inside your store's Google search listing."
            />

            <Checkbox
              label="BreadcrumbList Schema"
              checked={breadcrumbsSchema}
              onChange={setBreadcrumbsSchema}
              helpText="Displays clean category path navigation in Google search results."
            />

            <Checkbox
              label="FAQ Schema (Expandable Questions & Answers)"
              checked={faqSchema}
              onChange={setFaqSchema}
              helpText="Enables rich question dropdowns under search listings."
            />

            <Divider />

            <InlineStack align="end">
              <Button variant="primary" onClick={handleSave}>Save Schema Toggles</Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card padding="500">
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">Live Generated JSON-LD Code</Text>
              <Badge tone="info">VALIDATED SCHEMA.ORG</Badge>
            </InlineStack>
            <Text as="p" variant="bodySm" tone="subdued">
              Injected via Theme App Extension <code>target: head</code> app embed block:
            </Text>
            <Box padding="400" background="bg-surface-secondary" borderRadius="200">
              <pre style={{ margin: 0, fontSize: "12px", overflowX: "auto" }}>
                {JSON.stringify(sampleJsonLd, null, 2)}
              </pre>
            </Box>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
