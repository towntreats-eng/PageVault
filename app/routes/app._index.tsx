import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useRouteError, useSubmit } from "@remix-run/react";
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

  try {
    // Ensure shop record exists
    await prisma.shop.upsert({
      where: { domain: shopDomain },
      create: { domain: shopDomain },
      update: {},
    });

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
      loadError: null,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      throw error;
    }
    console.error("[Dashboard Loader Error]", error);
    return json({
      shopDomain,
      productCount: 0,
      audit: {
        overallScore: 100,
        totalResources: 0,
        optimizedCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        categories: [],
        defects: [],
      },
      recentHistory: [],
      loadError: error.message || "Failed to load store data",
    });
  }
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
  const { productCount, audit, recentHistory, loadError } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const isScanning = navigation.state === "submitting" && navigation.formData?.get("actionType") === "scan";

  const handleScan = () => {
    submit({ actionType: "scan" }, { method: "post" });
  };

  const getScoreBadgeTone = (score: number): "success" | "attention" | "critical" => {
    if (score >= 80) return "success";
    if (score >= 60) return "attention";
    return "critical";
  };

  const getScoreTextTone = (score: number): "success" | "caution" | "critical" => {
    if (score >= 80) return "success";
    if (score >= 60) return "caution";
    return "critical";
  };

  const getProgressBarTone = (score: number): "success" | "primary" | "critical" => {
    if (score >= 80) return "success";
    if (score >= 60) return "primary";
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
        {loadError && (
          <Banner title="Database Initialization in Progress" tone="warning">
            <p>Your store data is being connected. Click "Run Complete Store Scan" above to sync your store catalog.</p>
          </Banner>
        )}

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

        {/* 1-Click Store SEO Booster Hero Card */}
        <Card background="bg-surface-secondary">
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h2" variant="headingLg" fontWeight="bold">
                    ⚡ 1-Click Full Store SEO Booster
                  </Text>
                  <Badge tone="success">PRO AUTOMATION</Badge>
                </InlineStack>
                <Text as="p" tone="subdued">
                  Autonomous AI SEO Agent, deep catalog scanner, Google Rich Snippets, AEO/GEO citations, and 1-click batch optimization with instant rollback.
                </Text>
              </BlockStack>
              <InlineStack gap="200">
                <Button variant="primary" size="large" url="/app/agent">
                  🤖 Launch AI SEO Agent
                </Button>
                <Button size="large" url="/app/products">
                  ⚡ Products
                </Button>
                <Button size="large" url="/app/schema">
                  🏷️ Schema & AEO
                </Button>
                <Button size="large" url="/app/images">
                  🖼️ Image SEO
                </Button>
              </InlineStack>
            </InlineStack>
          </BlockStack>
        </Card>

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
                        <Text as="span" variant="bodySm" tone={getScoreTextTone(cat.score)}>
                          {cat.score}%
                        </Text>
                      </InlineStack>
                      <ProgressBar progress={cat.score} tone={getProgressBarTone(cat.score)} size="small" />
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
                      {v.reason || "Optimized via AI"} • {typeof v.appliedAt === "string" ? v.appliedAt.slice(0, 10) : new Date(v.appliedAt).toISOString().slice(0, 10)}
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

export function ErrorBoundary() {
  const error = useRouteError();
  console.error("[Dashboard Route ErrorBoundary]", error);

  return (
    <Page title="Store SEO Health & AI Management">
      <BlockStack gap="400">
        <Banner
          title="Store SEO Dashboard Error"
          tone="critical"
          action={{
            content: "Reload Dashboard",
            onAction: () => window.location.reload(),
          }}
        >
          <p>
            An unexpected error occurred while loading your store SEO audit. Please refresh the page to retry.
          </p>
          {(error as any)?.message && (
            <Box paddingBlockStart="200">
              <Text as="p" variant="bodySm" tone="critical">
                {(error as any).message}
              </Text>
            </Box>
          )}
        </Banner>
      </BlockStack>
    </Page>
  );
}
