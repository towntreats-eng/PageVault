import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  Banner,
  ProgressBar,
  Divider,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { calculateStoreAudit } from "../services/audit.server";
import { scanStoreContent } from "../services/scanner.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const productCount = await prisma.productRecord.count({ where: { shopDomain } });
  const audit = await calculateStoreAudit(shopDomain);
  const recentHistory = await prisma.contentVersion.findMany({
    where: { shopDomain },
    orderBy: { appliedAt: "desc" },
    take: 5,
  });

  return json({
    shopDomain,
    productCount,
    audit,
    recentHistory,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "scan") {
    const result = await scanStoreContent(admin, session.shop);
    return json({
      success: true,
      message: `Store scan completed in ${Math.round(result.durationMs / 1000)}s. Scanned ${result.productsScanned} products, ${result.collectionsScanned} collections, ${result.pagesScanned} pages. Found ${result.issuesDetected} SEO opportunities.`,
      result,
    });
  }

  return json({ success: false, message: "Unknown action" });
};

export default function Dashboard() {
  const { productCount, audit, recentHistory } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const isScanning = navigation.state === "submitting" && navigation.formData?.get("actionType") === "scan";

  const handleScan = () => {
    submit({ actionType: "scan" }, { method: "post" });
  };

  const getScoreBadgeTone = (score: number) => {
    if (score >= 80) return "success";
    if (score >= 60) return "attention";
    return "critical";
  };

  return (
    <Page
      title="Store SEO Health & AI Management"
      subtitle="Comprehensive technical, on-page, and conversion audit for your Shopify store"
      primaryAction={{
        content: isScanning ? "Scanning Catalog..." : "Run Complete Store Scan",
        onAction: handleScan,
        loading: isScanning,
      }}
    >
      <BlockStack gap="500">
        {actionData?.message && (
          <Banner tone={actionData.success ? "success" : "critical"}>
            <p>{actionData.message}</p>
          </Banner>
        )}

        {productCount === 0 && (
          <Banner
            title="Your Store Catalog Has Not Been Scanned Yet"
            tone="warning"
            action={{
              content: "Scan Store Now",
              onAction: handleScan,
              loading: isScanning,
            }}
          >
            <p>
              Click "Scan Store Now" to import your products, collections, pages, and blog articles so the AI engine can identify SEO defects and keyword opportunities.
            </p>
          </Banner>
        )}

        {/* Top Summary Grid */}
        <Layout>
          {/* Main Health Score Card */}
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400" align="center">
                <Text as="h2" variant="headingMd">
                  Store SEO Health Score
                </Text>
                <div style={{ textAlign: "center", padding: "12px 0" }}>
                  <Text as="span" variant="heading3xl">
                    {audit.overallScore}
                  </Text>
                  <Text as="span" variant="headingLg" tone="subdued">
                    {" "}/ 100
                  </Text>
                </div>
                <Badge tone={getScoreBadgeTone(audit.overallScore)} size="large">
                  {audit.overallScore >= 80 ? "Good Visibility" : audit.overallScore >= 60 ? "Moderate Needs Attention" : "Critical SEO Defects"}
                </Badge>
                <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                  Score calculated deterministically from title lengths, meta descriptions, image ALTs, and content depth.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Quick Metrics */}
          <Layout.Section>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
              <Card>
                <BlockStack gap="100">
                  <Text as="span" tone="subdued" variant="bodySm">
                    Catalog Products
                  </Text>
                  <Text as="p" variant="headingXl">
                    {productCount}
                  </Text>
                  <Text as="span" variant="bodyXs" tone="success">
                    {audit.optimizedCount} AI Optimized
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="100">
                  <Text as="span" tone="subdued" variant="bodySm">
                    Critical Defects
                  </Text>
                  <Text as="p" variant="headingXl">
                    {audit.criticalCount}
                  </Text>
                  <Text as="span" variant="bodyXs" tone="critical">
                    High ranking penalty
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="100">
                  <Text as="span" tone="subdued" variant="bodySm">
                    High Priority Fixes
                  </Text>
                  <Text as="p" variant="headingXl">
                    {audit.highCount}
                  </Text>
                  <Text as="span" variant="bodyXs" tone="caution">
                    Missing alts / short meta
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="100">
                  <Text as="span" tone="subdued" variant="bodySm">
                    Medium Opportunities
                  </Text>
                  <Text as="p" variant="headingXl">
                    {audit.mediumCount}
                  </Text>
                  <Text as="span" variant="bodyXs" tone="subdued">
                    SERP length tweaks
                  </Text>
                </BlockStack>
              </Card>
            </div>

            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    Category Audit Breakdown
                  </Text>
                  {audit.categories.map((cat) => (
                    <BlockStack gap="100" key={cat.category}>
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodySm">
                          {cat.category}
                        </Text>
                        <Text as="span" variant="bodySm" tone={getScoreBadgeTone(cat.score)}>
                          {cat.score}%
                        </Text>
                      </InlineStack>
                      <ProgressBar progress={cat.score} tone={getScoreBadgeTone(cat.score)} size="small" />
                    </BlockStack>
                  ))}
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>
        </Layout>

        {/* Itemized Defect Issues */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">
                Itemized SEO Defects & Recommended Actions ({audit.defects.length})
              </Text>
              <Button url="/app/products" variant="plain">
                View All in Product Optimizer →
              </Button>
            </InlineStack>
            <Divider />

            {audit.defects.length === 0 ? (
              <Box padding="400">
                <Text as="p" tone="subdued" alignment="center">
                  No SEO defects detected! Run a scan or import your catalog to begin optimization.
                </Text>
              </Box>
            ) : (
              <BlockStack gap="300">
                {audit.defects.slice(0, 8).map((d, index) => (
                  <Box
                    key={`${d.resourceGid}-${index}`}
                    padding="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                    borderWidth="025"
                    borderColor="border"
                  >
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <InlineStack gap="200">
                          <Badge tone={d.severity === "critical" ? "critical" : d.severity === "high" ? "attention" : "info"}>
                            {d.severity.toUpperCase()}
                          </Badge>
                          <Text as="strong" variant="headingSm">
                            {d.title}
                          </Text>
                        </InlineStack>
                        <Button url="/app/products" size="micro" variant="primary">
                          AI Fix
                        </Button>
                      </InlineStack>
                      <Text as="p" variant="bodySm">
                        <strong>What's wrong:</strong> {d.description}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        <strong>Why it matters:</strong> {d.impact}
                      </Text>
                      <Text as="p" variant="bodySm" tone="success">
                        <strong>Recommended fix:</strong> {d.recommendedFix}
                      </Text>
                    </BlockStack>
                  </Box>
                ))}
              </BlockStack>
            )}
          </BlockStack>
        </Card>

        {/* Recent Change History snapshot */}
        {recentHistory.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text as="h3" variant="headingSm">
                  Recent AI Optimizations & Version Log
                </Text>
                <Button url="/app/history" variant="plain">
                  View Full History & Rollback →
                </Button>
              </InlineStack>
              <Divider />
              {recentHistory.map((v) => (
                <InlineStack key={v.id} align="space-between">
                  <BlockStack gap="050">
                    <Text as="span" variant="bodySm" fontWeight="bold">
                      {v.resourceType.toUpperCase()} ({v.field})
                    </Text>
                    <Text as="span" variant="bodyXs" tone="subdued">
                      {v.reason || "Optimized via AI"} • {new Date(v.appliedAt).toLocaleString()}
                    </Text>
                  </BlockStack>
                  <Badge tone={v.revertedAt ? "subdued" : "success"}>
                    {v.revertedAt ? "Rolled Back" : "Live"}
                  </Badge>
                </InlineStack>
              ))}
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
