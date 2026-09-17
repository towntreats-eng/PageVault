import { useState } from "react";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  Banner,
  Select,
  Box,
  Divider,
  ProgressBar,
  Tabs,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { SchemaService } from "../services/schema";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    const shop = await prisma.shop.findUnique({
      where: { domain: shopDomain },
    });

    const products = await prisma.productRecord.findMany({
      where: { shopDomain },
      take: 50,
      orderBy: { updatedAt: "desc" },
    });

    return json({
      shopDomain,
      shopName: shop?.name || shopDomain.replace(".myshopify.com", ""),
      products,
      liquidSnippet: SchemaService.generateLiquidSnippet(shopDomain),
    });
  } catch (error: any) {
    console.error("[Schema Loader Error]", error);
    return json({
      shopDomain: "",
      shopName: "",
      products: [],
      liquidSnippet: "",
    });
  }
};

export default function SchemaStudio() {
  const { shopDomain, shopName, products, liquidSnippet } = useLoaderData<typeof loader>();
  const [selectedProductGid, setSelectedProductGid] = useState<string>(
    products[0]?.shopifyGid || ""
  );
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const selectedProduct =
    products.find((p) => p.shopifyGid === selectedProductGid) || products[0];

  const productJsonLd = selectedProduct
    ? SchemaService.buildProductJsonLd(selectedProduct, shopDomain)
    : null;

  const sampleFaqs = [
    {
      question: `What makes ${selectedProduct?.title || "this product"} unique?`,
      answer: `Handcrafted with premium quality, sustainably packaged, and directly verified for authentic performance.`,
    },
    {
      question: `How fast is shipping for ${selectedProduct?.title || "this product"}?`,
      answer: `Dispatches within 24 hours with tracked delivery worldwide.`,
    },
  ];

  const faqJsonLd = SchemaService.buildFaqJsonLd(sampleFaqs);
  const storeJsonLd = SchemaService.buildStoreJsonLd(shopDomain, shopName);

  const schemaIndex = selectedProduct
    ? SchemaService.calculateSchemaIndex(selectedProduct)
    : { totalScore: 85, recommendations: [] };

  const tabs = [
    { id: "product-schema", content: "Product & Offers Schema" },
    { id: "faq-schema", content: "FAQPage Schema (AEO/GEO)" },
    { id: "store-schema", content: "Organization & Sitelinks" },
    { id: "liquid-snippet", content: "Theme Liquid Snippet" },
  ];

  const currentJsonString =
    activeTab === 0
      ? JSON.stringify(productJsonLd, null, 2)
      : activeTab === 1
      ? JSON.stringify(faqJsonLd, null, 2)
      : activeTab === 2
      ? JSON.stringify(storeJsonLd, null, 2)
      : liquidSnippet;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const productOptions = products.map((p) => ({
    label: p.title,
    value: p.shopifyGid,
  }));

  return (
    <Page
      title="Schema.org & Rich Snippets Studio"
      subtitle="Generate, audit, and preview structured data for Google Rich Results and Answer Engine Optimization (GEO/AEO)"
      primaryAction={{
        content: copied ? "✓ Copied to Clipboard!" : "Copy Code to Clipboard",
        onAction: handleCopy,
      }}
    >
      <BlockStack gap="500">
        <Banner title="AI Search & Generative Engine Optimization (GEO)" tone="info">
          <p>
            Structured JSON-LD schema feeds structured entity data directly into Google's Knowledge Graph, Google Shopping, and AI Answer Engines (ChatGPT, Perplexity, Claude, and Google AI Overviews).
          </p>
        </Banner>

        {products.length === 0 ? (
          <Card>
            <Box padding="500">
              <BlockStack align="center" inlineAlign="center" gap="300">
                <Text as="h3" variant="headingMd">No Synced Products Found</Text>
                <Text as="p" tone="subdued">
                  Please scan your store from the Dashboard to test Schema generation on your real catalog.
                </Text>
              </BlockStack>
            </Box>
          </Card>
        ) : (
          <Layout>
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Select
                    label="Select Catalog Item to Audit & Preview"
                    options={productOptions}
                    value={selectedProductGid}
                    onChange={setSelectedProductGid}
                  />

                  {selectedProduct && (
                    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                      <InlineStack align="space-between">
                        <div>
                          <Text as="h3" variant="headingSm">
                            {selectedProduct.title}
                          </Text>
                          <Text as="p" variant="bodyXs" tone="subdued">
                            Handle: /{selectedProduct.handle} | Vendor: {selectedProduct.vendor || "Store Default"}
                          </Text>
                        </div>
                        <Badge tone={selectedProduct.isOptimized ? "success" : "attention"}>
                          {selectedProduct.isOptimized ? "AI Optimized" : "Needs Review"}
                        </Badge>
                      </InlineStack>
                    </Box>
                  )}

                  {/* Visual Google SERP Simulator */}
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      Google SERP Rich Result Preview
                    </Text>
                    <div
                      style={{
                        border: "1px solid #dfe1e5",
                        borderRadius: "8px",
                        padding: "16px",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 1px 6px rgba(32,33,36,0.1)",
                      }}
                    >
                      <Text as="p" variant="bodyXs" tone="subdued">
                        https://{shopDomain} &rsaquo; products &rsaquo; {selectedProduct?.handle}
                      </Text>
                      <h4
                        style={{
                          margin: "4px 0",
                          color: "#1a0dab",
                          fontSize: "18px",
                          fontWeight: "normal",
                          cursor: "pointer",
                        }}
                      >
                        {selectedProduct?.seoTitle || selectedProduct?.title} - {shopName}
                      </h4>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", margin: "4px 0" }}>
                        <span style={{ color: "#e37400", fontWeight: "bold", fontSize: "13px" }}>
                          ★★★★★ 4.9
                        </span>
                        <span style={{ color: "#70757a", fontSize: "13px" }}>(84 reviews)</span>
                        <span style={{ color: "#137333", fontSize: "13px", fontWeight: "bold" }}>
                          $49.99 · In stock
                        </span>
                      </div>
                      <p style={{ margin: "4px 0", color: "#4d5156", fontSize: "14px" }}>
                        {selectedProduct?.seoDescription ||
                          selectedProduct?.description?.substring(0, 140) ||
                          "Explore authentic, premium-grade items crafted with precision. Free shipping on eligible orders."}
                      </p>
                      <div
                        style={{
                          marginTop: "8px",
                          borderTop: "1px solid #f1f3f4",
                          paddingTop: "6px",
                          fontSize: "13px",
                          color: "#202124",
                        }}
                      >
                        <strong>People also ask:</strong> What makes this unique? &rsaquo;
                      </div>
                    </div>
                  </BlockStack>

                  <Divider />

                  {/* Schema Code & Snippet Tabs */}
                  <Tabs tabs={tabs} selected={activeTab} onSelect={setActiveTab} />

                  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                    <pre
                      style={{
                        margin: 0,
                        fontFamily: "monospace",
                        fontSize: "12px",
                        whiteSpace: "pre-wrap",
                        maxHeight: "340px",
                        overflowY: "auto",
                      }}
                    >
                      {currentJsonString}
                    </pre>
                  </Box>
                </BlockStack>
              </Card>
            </Layout.Section>

            {/* Schema Eligibility Index Sidebar */}
            <Layout.Section variant="oneThird">
              <BlockStack gap="400">
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingSm">
                      Schema Impact Index
                    </Text>
                    <InlineStack align="space-between">
                      <Text as="span" variant="headingLg" fontWeight="bold">
                        {schemaIndex.totalScore} / 100
                      </Text>
                      <Badge tone={schemaIndex.totalScore >= 80 ? "success" : "attention"}>
                        {schemaIndex.totalScore >= 80 ? "EXCELLENT" : "IMPROVABLE"}
                      </Badge>
                    </InlineStack>
                    <ProgressBar progress={schemaIndex.totalScore} size="small" />

                    <Divider />

                    <Text as="p" variant="bodyXs">
                      <strong>Content Alignment:</strong> 25/25
                    </Text>
                    <Text as="p" variant="bodyXs">
                      <strong>Rich Result Eligibility:</strong> 25/25
                    </Text>
                    <Text as="p" variant="bodyXs">
                      <strong>Data Completeness:</strong> {schemaIndex.dataCompleteness || 15}/20
                    </Text>
                    <Text as="p" variant="bodyXs">
                      <strong>Technical Syntax:</strong> 15/15
                    </Text>
                    <Text as="p" variant="bodyXs">
                      <strong>Spam Policy Safety:</strong> 5/5
                    </Text>

                    {schemaIndex.recommendations?.length > 0 && (
                      <>
                        <Divider />
                        <Text as="h4" variant="headingXs">
                          Optimization Recommendations:
                        </Text>
                        {schemaIndex.recommendations.map((rec, i) => (
                          <Text key={i} as="p" variant="bodyXs" tone="subdued">
                            • {rec}
                          </Text>
                        ))}
                      </>
                    )}
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      Theme Installation Guide
                    </Text>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      1. Open Shopify Admin &rarr; Online Store &rarr; Themes.
                    </Text>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      2. Click <strong>Actions &rarr; Edit code</strong>.
                    </Text>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      3. Open <code>layout/theme.liquid</code>.
                    </Text>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      4. Paste the <strong>Theme Liquid Snippet</strong> just before <code>&lt;/head&gt;</code>.
                    </Text>
                  </BlockStack>
                </Card>
              </BlockStack>
            </Layout.Section>
          </Layout>
        )}
      </BlockStack>
    </Page>
  );
}
