import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  TextField,
  Banner,
  IndexTable,
  Badge,
  Grid,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getSeoSettings, updateSeoSettings } from "../services/seo.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getSeoSettings(session.shop);

  const sampleProducts = [
    { id: "p1", title: "Luxury Silk Evening Dress", seoTitle: "Luxury Silk Evening Dress - Buy Online at Shop", status: "optimized" },
    { id: "p2", title: "Leather Oxford Shoes", seoTitle: "Leather Oxford Shoes - Premium Footwear", status: "optimized" },
    { id: "p3", title: "Minimalist Gold Watch", seoTitle: "Minimalist Gold Watch - Waterproof Timepiece", status: "optimized" },
    { id: "p4", title: "Cashmere Wool Sweater", seoTitle: "Cashmere Wool Sweater in Off-White", status: "optimized" },
  ];

  return json({ settings, products: sampleProducts });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const titleTemplate = String(formData.get("titleTemplate") || "");
  const descTemplate = String(formData.get("descTemplate") || "");

  await updateSeoSettings(session.shop, {
    product_title_template: titleTemplate,
    product_desc_template: descTemplate,
  });

  return json({ success: true });
};

export default function MetaTagsPage() {
  const { settings, products } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const isSaving = navigation.state === "submitting";
  const [saved, setSaved] = useState(false);
  const [titleTemplate, setTitleTemplate] = useState(settings.product_title_template);
  const [descTemplate, setDescTemplate] = useState(settings.product_desc_template);

  const handleSave = () => {
    setSaved(true);
    submit({ titleTemplate, descTemplate }, { method: "post" });
  };

  const rowMarkup = products.map((p, index) => (
    <IndexTable.Row id={p.id} key={p.id} position={index}>
      <IndexTable.Cell>
        <Text as="span" fontWeight="bold">{p.title}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span">{p.seoTitle}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone="success">OPTIMIZED</Badge>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="📝 Meta Title & Description Optimizer"
      subtitle="Define automated high-CTR meta title & description templates for your catalog."
      primaryAction={{
        content: isSaving ? "Saving Templates..." : "Save Meta Templates",
        loading: isSaving,
        onAction: handleSave,
      }}
    >
      <BlockStack gap="500">
        {saved && (
          <Banner title="SEO Meta Templates Saved Successfully!" status="success" onDismiss={() => setSaved(false)}>
            <p>New meta tag templates will automatically apply to all newly added products and pages.</p>
          </Banner>
        )}

        <Card padding="500">
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Product SEO Meta Tag Templates</Text>

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
              helpText="Keep between 140-160 characters for best Google CTR performance."
              autoComplete="off"
            />

            <InlineStack align="end">
              <Button variant="primary" onClick={handleSave} loading={isSaving}>
                Apply Template to Catalog
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
                { title: "Generated SEO Title Tag" },
                { title: "Status" },
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
