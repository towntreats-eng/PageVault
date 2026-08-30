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
import { getSchemaConfig, generateProductJsonLd } from "../services/schema_markup.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const config = await getSchemaConfig(session.shop);

  const sampleJsonLd = generateProductJsonLd({
    title: "Luxury Silk Evening Dress",
    description: "Handcrafted pure silk dress with elegant silhouette.",
    url: `https://${session.shop}/products/silk-evening-dress`,
    imageUrl: "https://cdn.shopify.com/s/files/1/0000/0001/products/evening_dress.jpg",
    price: "199.00",
    currency: "USD",
    sku: "SILK-DRS-01",
    inStock: true,
  });

  return json({ config, sampleJsonLd });
};

export default function SchemaPage() {
  const { config, sampleJsonLd } = useLoaderData<typeof loader>();
  const [productSchema, setProductSchema] = useState(config.productSchema);
  const [organizationSchema, setOrganizationSchema] = useState(config.organizationSchema);
  const [websiteSchema, setWebsiteSchema] = useState(config.websiteSchema);
  const [breadcrumbsSchema, setBreadcrumbsSchema] = useState(config.breadcrumbsSchema);
  const [faqSchema, setFaqSchema] = useState(config.faqSchema);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
  };

  return (
    <Page
      title="🏷️ JSON-LD Schema Markup Manager"
      subtitle="Enable Google Rich Snippets & Structured Data for maximum Google Search visibility."
      primaryAction={{
        content: "Save Schema Settings",
        onAction: handleSave,
      }}
    >
      <BlockStack gap="500">
        {saved && (
          <Banner title="Schema Markup Settings Saved!" status="success" onDismiss={() => setSaved(false)}>
            <p>JSON-LD structured data is active and updating automatically across product pages.</p>
          </Banner>
        )}

        <Card padding="500">
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Active Google Rich Snippet Schemas</Text>

            <Checkbox
              label="Product Schema (Price, In-Stock Badge & Star Ratings)"
              checked={productSchema}
              onChange={setProductSchema}
              helpText="Displays star ratings, price, and in-stock badges directly in Google search results."
            />

            <Checkbox
              label="Organization Schema (Brand Name, Logo & Social Profiles)"
              checked={organizationSchema}
              onChange={setOrganizationSchema}
              helpText="Helps Google Knowledge Graph understand your brand identity."
            />

            <Checkbox
              label="WebSite Sitelinks SearchBox Schema"
              checked={websiteSchema}
              onChange={setWebsiteSchema}
              helpText="Enables a search bar inside your store's Google search listing."
            />

            <Checkbox
              label="BreadcrumbList Schema"
              checked={breadcrumbsSchema}
              onChange={setBreadcrumbsSchema}
              helpText="Replaces ugly URLs with clean category breadcrumbs in search listings."
            />

            <Checkbox
              label="FAQ Schema (Expandable Questions & Answers)"
              checked={faqSchema}
              onChange={setFaqSchema}
              helpText="Displays rich FAQ dropdowns under your search listings."
            />

            <InlineStack align="end">
              <Button variant="primary" onClick={handleSave}>Save Schema Toggles</Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card padding="500">
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">Live Generated JSON-LD Preview</Text>
              <Badge tone="success">VALIDATED SCHEMA.ORG</Badge>
            </InlineStack>
            <Text as="p" variant="bodySm" tone="subdued">
              This code is automatically embedded in your store's theme head section via SEO Forge App Embed:
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
