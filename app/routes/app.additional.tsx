import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  IndexTable,
  Banner,
  EmptyState,
  Button,
  ProgressBar,
  Divider,
  Tabs,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  getAiVisibilityReport,
  runCitationScan,
  calculateAiProductCompleteness,
  bulkFillDerivableFields,
  getMerchantCenterStatus,
} from "../services/ai_citation.server";
import { generateWeeklyProofReport } from "../services/autopilot.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const [aiReport, weeklyReport, completeness, merchantCenter] = await Promise.all([
    getAiVisibilityReport(session.shop),
    generateWeeklyProofReport(session.shop),
    calculateAiProductCompleteness(admin, session.shop),
    getMerchantCenterStatus(admin, session.shop),
  ]);
  return json({ aiReport, weeklyReport, completeness, merchantCenter, shopDomain: session.shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "bulk_fill_derivable") {
    const fillResult = await bulkFillDerivableFields(admin, session.shop, {
      fillAltText: true,
      fillProductType: true,
      enrichWithGemini: true,
    });
    return json({ kind: "bulk_fill" as const, fillResult, result: null });
  }

  const result = await runCitationScan(admin, session.shop);
  return json({ kind: "citation" as const, result, fillResult: null });
};

export default function AiVisibilityPage() {
  const { aiReport, weeklyReport, completeness, merchantCenter, shopDomain } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";
  const [selectedTab, setSelectedTab] = useState(0);

  const configured = aiReport.configuredEngines.length > 0;

  const tabs = [
    { id: "ai-completeness", content: "Product Data Completeness", accessibilityLabel: "Product Data Completeness" },
    { id: "ai-citations", content: "AI Citations (Gemini/ChatGPT/Perplexity)", accessibilityLabel: "AI Citations" },
    { id: "merchant-center", content: "Merchant Center & Feeds", accessibilityLabel: "Merchant Center & Feeds" },
  ];

  return (
    <Page
      title="AI Search & Shopping"
      subtitle="Optimize product data completeness for Google Gemini, ChatGPT Search, Google AI Overviews, Perplexity & Google Merchant Center."
      primaryAction={{
        content: busy ? "Working…" : "Run Citation Scan",
        loading: busy,
        disabled: !configured,
        onAction: () => submit({ intent: "scan_citations" }, { method: "post" }),
      }}
      secondaryActions={[
        {
          content: "⚡ Auto-Fill & Enrich with Gemini",
          loading: busy,
          disabled: completeness.totalProducts === 0,
          onAction: () => submit({ intent: "bulk_fill_derivable" }, { method: "post" }),
        },
      ]}
    >
      <Layout>
        {actionData?.kind === "bulk_fill" && actionData.fillResult && (
          <Layout.Section>
            <Banner tone="success" title="AI Data Enrichment Complete">
              <p>
                Updated {actionData.fillResult.altTextUpdated} missing image ALT tags, {actionData.fillResult.productTypeUpdated} product categories
                {actionData.fillResult.descriptionsEnriched > 0 ? `, and enriched ${actionData.fillResult.descriptionsEnriched} thin descriptions with Google Gemini.` : "."}
                Live storefront verification has been queued.
              </p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.kind === "citation" && actionData.result && (
          <Layout.Section>
            <Banner
              tone={actionData.result.ran ? "success" : "warning"}
              title={actionData.result.ran ? "AI Citation Check Complete" : "Check Did Not Run"}
            >
              <p>
                {actionData.result.ran
                  ? `Asked ${actionData.result.queriesAsked} buying question(s) across ${actionData.result.callsMade} AI calls. Mentioned: ${actionData.result.citations} time(s).`
                  : actionData.result.reason}
              </p>
            </Banner>
          </Layout.Section>
        )}

        {/* Weekly Proof Summary Card */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">Weekly Proof Status for {shopDomain}</Text>
                <Badge tone="info">Live Storefront Sync</Badge>
              </InlineStack>
              <Text as="p">{weeklyReport.emailBody}</Text>
              <InlineStack gap="200">
                <Badge tone="success">{`${weeklyReport.verified} verified live`}</Badge>
                <Badge tone="info">{`${weeklyReport.pending} verification pending`}</Badge>
                <Badge tone="warning">{`${weeklyReport.notDetected} not detected`}</Badge>
                {weeklyReport.verificationRate !== null && (
                  <Badge>{`${weeklyReport.verificationRate}% verification pass rate`}</Badge>
                )}
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
            <Box paddingBlockStart="400">
              {/* TAB 0: AI Product Completeness */}
              {selectedTab === 0 && (
                <BlockStack gap="400">
                  <Card>
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <Text as="h3" variant="headingMd">AI Product-Data Completeness Score</Text>
                          <Text as="p" tone="subdued" variant="bodySm">
                            AI engines (ChatGPT, Google AI, Perplexity) crawl structured data, GTINs, and descriptions to select products.
                          </Text>
                        </BlockStack>
                        <Text as="p" variant="heading2xl">
                          {completeness.averageScore}%
                        </Text>
                      </InlineStack>
                      <ProgressBar progress={completeness.averageScore} size="medium" tone={completeness.averageScore >= 75 ? "success" : "highlight"} />
                      <InlineStack gap="400">
                        <Text as="span" variant="bodySm">Total Products: <strong>{completeness.totalProducts}</strong></Text>
                        <Text as="span" variant="bodySm">AI-Ready (≥75%): <strong style={{ color: "green" }}>{completeness.aiReadyCount}</strong></Text>
                        <Text as="span" variant="bodySm">Needs Work: <strong style={{ color: "#d82c0d" }}>{completeness.needsWorkCount}</strong></Text>
                      </InlineStack>
                    </BlockStack>
                  </Card>

                  {/* 8 AI Signals Coverage */}
                  <Card>
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">8 Essential AI Signals Coverage</Text>
                      <Divider />
                      <InlineStack gap="400" wrap>
                        <Box minWidth="200px">
                          <Text as="p" variant="bodySm" tone="subdued">Barcode / GTIN / UPC</Text>
                          <Text as="p" variant="headingLg">{completeness.fieldCoverage.hasGtinBarcodePct}%</Text>
                        </Box>
                        <Box minWidth="200px">
                          <Text as="p" variant="bodySm" tone="subdued">Rich Description (≥30w)</Text>
                          <Text as="p" variant="headingLg">{completeness.fieldCoverage.richDescriptionPct}%</Text>
                        </Box>
                        <Box minWidth="200px">
                          <Text as="p" variant="bodySm" tone="subdued">Product Category / Type</Text>
                          <Text as="p" variant="headingLg">{completeness.fieldCoverage.hasProductTypePct}%</Text>
                        </Box>
                        <Box minWidth="200px">
                          <Text as="p" variant="bodySm" tone="subdued">Vendor / Brand</Text>
                          <Text as="p" variant="headingLg">{completeness.fieldCoverage.hasVendorPct}%</Text>
                        </Box>
                        <Box minWidth="200px">
                          <Text as="p" variant="bodySm" tone="subdued">Image Alt Text</Text>
                          <Text as="p" variant="headingLg">{completeness.fieldCoverage.hasImageAltPct}%</Text>
                        </Box>
                        <Box minWidth="200px">
                          <Text as="p" variant="bodySm" tone="subdued">Price & Availability</Text>
                          <Text as="p" variant="headingLg">{completeness.fieldCoverage.hasPriceAndStockPct}%</Text>
                        </Box>
                      </InlineStack>
                    </BlockStack>
                  </Card>

                  {/* Product Breakdown Table */}
                  <Card padding="0">
                    <IndexTable
                      resourceName={{ singular: "product", plural: "products" }}
                      itemCount={completeness.productAudits.length}
                      selectable={false}
                      headings={[
                        { title: "Product" },
                        { title: "AI Score" },
                        { title: "Brand" },
                        { title: "Category" },
                        { title: "Missing Fields" },
                      ]}
                    >
                      {completeness.productAudits.slice(0, 30).map((prod, index) => (
                        <IndexTable.Row id={prod.id} key={prod.id} position={index}>
                          <IndexTable.Cell>
                            <Text as="span" fontWeight="semibold">{prod.title}</Text>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <Badge tone={prod.score >= 75 ? "success" : prod.score >= 50 ? "info" : "warning"}>
                              {`${prod.score}/100`}
                            </Badge>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <Text as="span">{prod.vendor || "—"}</Text>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <Text as="span">{prod.productType || "—"}</Text>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            {prod.missingFields.length === 0 ? (
                              <Badge tone="success">Complete</Badge>
                            ) : (
                              <Text as="span" tone="critical" variant="bodySm">
                                {prod.missingFields.join(", ")}
                              </Text>
                            )}
                          </IndexTable.Cell>
                        </IndexTable.Row>
                      ))}
                    </IndexTable>
                  </Card>
                </BlockStack>
              )}

              {/* TAB 1: AI Citations */}
              {selectedTab === 1 && (
                <BlockStack gap="400">
                  {!configured && (
                    <Banner tone="warning" title="No AI Answer Engine API Keys Set">
                      <p>
                        To run live buying queries against Google Gemini, ChatGPT (OpenAI), Claude (Anthropic), or Perplexity, set your API key in Settings or server environment variables.
                      </p>
                    </Banner>
                  )}

                  {configured && (
                    <Card>
                      <InlineStack gap="800" wrap>
                        <BlockStack gap="100">
                          <Text as="p" variant="bodySm" tone="subdued">Checks run</Text>
                          <Text as="p" variant="heading2xl">{aiReport.totalChecks}</Text>
                        </BlockStack>
                        <BlockStack gap="100">
                          <Text as="p" variant="bodySm" tone="subdued">Times you were mentioned</Text>
                          <Text as="p" variant="heading2xl">{aiReport.citedCount}</Text>
                        </BlockStack>
                        <BlockStack gap="100">
                          <Text as="p" variant="bodySm" tone="subdued">Mention rate</Text>
                          <Text as="p" variant="heading2xl">
                            {aiReport.citationRate === null ? "—" : `${aiReport.citationRate}%`}
                          </Text>
                        </BlockStack>
                        <BlockStack gap="100">
                          <Text as="p" variant="bodySm" tone="subdued">Engines configured</Text>
                          <Text as="p" variant="heading2xl">{aiReport.configuredEngines.length}</Text>
                        </BlockStack>
                      </InlineStack>
                    </Card>
                  )}

                  <Card padding="0">
                    {!aiReport.hasData ? (
                      <EmptyState heading="No citation scans run yet" image="">
                        <p>
                          Click &quot;Run Citation Scan&quot; to test whether ChatGPT, Claude, and Perplexity recommend your store for real shopping questions.
                        </p>
                      </EmptyState>
                    ) : (
                      <IndexTable
                        resourceName={{ singular: "check", plural: "checks" }}
                        itemCount={aiReport.recentQueries.length}
                        selectable={false}
                        headings={[
                          { title: "Question asked" },
                          { title: "Engine" },
                          { title: "Mentioned" },
                          { title: "Other Domains Cited" },
                          { title: "Date" },
                        ]}
                      >
                        {aiReport.recentQueries.map((q, index) => (
                          <IndexTable.Row id={`${q.query}-${index}`} key={`${q.query}-${index}`} position={index}>
                            <IndexTable.Cell><Text as="span">{q.query}</Text></IndexTable.Cell>
                            <IndexTable.Cell><Text as="span">{q.engine}</Text></IndexTable.Cell>
                            <IndexTable.Cell>
                              <Badge tone={q.cited ? "success" : "warning"}>{q.cited ? "Yes" : "No"}</Badge>
                            </IndexTable.Cell>
                            <IndexTable.Cell>
                              <Text as="span" tone="subdued">{q.competitors.slice(0, 4).join(", ") || "—"}</Text>
                            </IndexTable.Cell>
                            <IndexTable.Cell>
                              <Text as="span" tone="subdued">{new Date(q.checkedAt).toLocaleDateString()}</Text>
                            </IndexTable.Cell>
                          </IndexTable.Row>
                        ))}
                      </IndexTable>
                    )}
                  </Card>
                </BlockStack>
              )}

              {/* TAB 2: Google Merchant Center & Feeds */}
              {selectedTab === 2 && (
                <BlockStack gap="400">
                  <Card>
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h3" variant="headingMd">Google & Bing Merchant Center Feed Readiness</Text>
                        <Badge tone={merchantCenter.isFeedReady ? "success" : "attention"}>
                          {merchantCenter.isFeedReady ? "Feed Ready" : "Action Needed"}
                        </Badge>
                      </InlineStack>
                      <Divider />
                      <Text as="p">
                        Google Merchant Center and Bing Shopping pull catalog data via structured feeds. Barcode (GTIN) coverage is the #1 reason merchant feeds get approved or disapproved.
                      </Text>
                      <InlineStack gap="600">
                        <BlockStack gap="050">
                          <Text as="p" variant="bodySm" tone="subdued">GTIN / Barcode Coverage</Text>
                          <Text as="p" variant="headingLg">{merchantCenter.barcodeCoveragePct}%</Text>
                        </BlockStack>
                        <BlockStack gap="050">
                          <Text as="p" variant="bodySm" tone="subdued">Store Currency</Text>
                          <Text as="p" variant="headingLg">{merchantCenter.currency}</Text>
                        </BlockStack>
                        <BlockStack gap="050">
                          <Text as="p" variant="bodySm" tone="subdued">Product Feed URL</Text>
                          <Text as="p" variant="bodyMd" fontWeight="semibold">{merchantCenter.publicFeedUrl}</Text>
                        </BlockStack>
                      </InlineStack>
                    </BlockStack>
                  </Card>

                  <Card>
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">Shopping Feed Recommendations</Text>
                      <Divider />
                      <BlockStack gap="200">
                        {merchantCenter.recommendations.map((rec, i) => (
                          <Text as="p" key={i}>• {rec}</Text>
                        ))}
                      </BlockStack>
                    </BlockStack>
                  </Card>
                </BlockStack>
              )}
            </Box>
          </Tabs>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
