import { useState } from "react";
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Badge,
  Banner,
  DataTable,
  Divider,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getGscData, saveGscVerificationTag } from "../services/gsc.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const gsc = await getGscData(session.shop);
    return json({ gsc });
  } catch (err) {
    console.error("[GSC Loader Error]", err);
    return json({
      gsc: {
        isConnected: false,
        verificationTag: null,
        siteUrl: null,
        totalClicks: 0,
        totalImpressions: 0,
        avgCtr: 0,
        avgPosition: 0,
        queries: [],
        ctrOpportunities: [],
      },
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "save_tag") {
    const rawTag = formData.get("verificationTag") as string;
    if (!rawTag || rawTag.trim().length === 0) {
      return json({ error: "Please enter a valid Google verification meta tag or code." }, { status: 400 });
    }

    try {
      const savedToken = await saveGscVerificationTag(session.shop, rawTag);
      return json({
        success: true,
        message: `Google Search Console verification tag "${savedToken}" saved successfully! Search analytics activated.`,
      });
    } catch (err: any) {
      return json({ error: err.message || "Failed to save verification tag." }, { status: 500 });
    }
  }

  return json({ success: false, message: "Unknown action" });
};

export default function GoogleSearchConsolePage() {
  const { gsc } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [tagInput, setTagInput] = useState(gsc.verificationTag || "");

  const isSaving =
    navigation.state === "submitting" && navigation.formData?.get("actionType") === "save_tag";

  const handleSaveTag = () => {
    if (!tagInput.trim()) return;
    submit({ actionType: "save_tag", verificationTag: tagInput }, { method: "post" });
  };

  const queryRows = gsc.queries.map((q) => [
    <Text as="span" variant="bodyMd" fontWeight="bold">
      {q.query}
    </Text>,
    q.targetPage,
    q.clicks.toLocaleString(),
    q.impressions.toLocaleString(),
    `${q.ctr}%`,
    <Badge tone={q.position <= 3 ? "success" : q.position <= 10 ? "info" : "attention"}>
      {`#${q.position}`}
    </Badge>,
  ]);

  return (
    <Page
      title="Google Search Console (GSC) Sync"
      subtitle="Connect your store's Google Search Console property to monitor real search clicks, discover CTR opportunities, and protect organic rankings."
    >
      <BlockStack gap="500">
        {actionData?.message && (
          <Banner tone="success" onDismiss={() => {}}>
            <p>{actionData.message}</p>
          </Banner>
        )}
        {actionData?.error && (
          <Banner tone="critical" onDismiss={() => {}}>
            <p>{actionData.error}</p>
          </Banner>
        )}

        {/* Verification & Connection Setup Card */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <BlockStack gap="100">
                <Text as="h2" variant="headingMd">
                  Store Ownership Verification
                </Text>
                <Text as="p" tone="subdued">
                  Paste your Google Search Console HTML verification meta tag or token below to verify ownership.
                </Text>
              </BlockStack>
              <Badge tone={gsc.isConnected ? "success" : "attention"}>
                {gsc.isConnected ? "CONNECTED & VERIFIED" : "NOT CONNECTED"}
              </Badge>
            </InlineStack>

            <Divider />

            <BlockStack gap="300">
              <TextField
                label="Google Site Verification Tag / Code"
                value={tagInput}
                onChange={setTagInput}
                autoComplete="off"
                placeholder='e.g. <meta name="google-site-verification" content="abcdef123..." /> or abcdef123...'
                helpText="From Google Search Console > Settings > Ownership verification > HTML tag."
              />
              <InlineStack gap="300">
                <Button variant="primary" loading={isSaving} onClick={handleSaveTag}>
                  Save & Verify Ownership
                </Button>
                {gsc.isConnected && (
                  <Button
                    url={`https://search.google.com/search-console?resource_id=${encodeURIComponent(gsc.siteUrl || "")}`}
                    target="_blank"
                  >
                    Open Google Search Console ↗
                  </Button>
                )}
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Card>

        {/* Performance Metrics Overview */}
        {gsc.isConnected ? (
          <>
            <Layout>
              <Layout.Section variant="oneThird">
                <Card>
                  <BlockStack gap="200">
                    <Text as="p" tone="subdued" variant="bodySm">
                      Total Organic Clicks
                    </Text>
                    <Text as="h3" variant="headingXl" fontWeight="bold">
                      {gsc.totalClicks.toLocaleString()}
                    </Text>
                    <Badge tone="success">Last 28 Days</Badge>
                  </BlockStack>
                </Card>
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <Card>
                  <BlockStack gap="200">
                    <Text as="p" tone="subdued" variant="bodySm">
                      Total Impressions
                    </Text>
                    <Text as="h3" variant="headingXl" fontWeight="bold">
                      {gsc.totalImpressions.toLocaleString()}
                    </Text>
                    <Badge tone="info">Google Search SERP</Badge>
                  </BlockStack>
                </Card>
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <Card>
                  <BlockStack gap="200">
                    <Text as="p" tone="subdued" variant="bodySm">
                      Average CTR & Position
                    </Text>
                    <InlineStack gap="300" blockAlign="baseline">
                      <Text as="h3" variant="headingXl" fontWeight="bold">
                        {gsc.avgCtr}%
                      </Text>
                      <Text as="span" tone="subdued">
                        (Avg Pos #{gsc.avgPosition})
                      </Text>
                    </InlineStack>
                    <Badge tone="attention">High Growth Room</Badge>
                  </BlockStack>
                </Card>
              </Layout.Section>
            </Layout>

            {/* CTR Opportunities Card */}
            {gsc.ctrOpportunities.length > 0 && (
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingMd">
                        ⚡ High-Impact CTR Opportunities (Low-Hanging Traffic)
                      </Text>
                      <Text as="p" tone="subdued">
                        These queries already rank on Page 1 & 2 of Google but suffer from below-average click-through rates. Improving titles and meta descriptions will unlock immediate traffic.
                      </Text>
                    </BlockStack>
                    <Badge tone="critical">{`${gsc.ctrOpportunities.length} OPPORTUNITIES`}</Badge>
                  </InlineStack>

                  <Divider />

                  <BlockStack gap="300">
                    {gsc.ctrOpportunities.map((opp, idx) => (
                      <Box key={idx} padding="300" background="bg-surface-secondary" borderRadius="200">
                        <BlockStack gap="200">
                          <InlineStack align="space-between">
                            <InlineStack gap="200">
                              <Text as="span" fontWeight="bold">
                                {`"${opp.query}"`}
                              </Text>
                              <Badge tone="info">{`Google Rank #${opp.position}`}</Badge>
                              <Badge tone="attention">{`Current CTR: ${opp.currentCtr}%`}</Badge>
                            </InlineStack>
                            <Badge tone="success">{opp.expectedTrafficGain}</Badge>
                          </InlineStack>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {opp.recommendedAction}
                          </Text>
                        </BlockStack>
                      </Box>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Card>
            )}

            {/* Top Queries Table */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Top Organic Google Search Queries
                </Text>
                <DataTable
                  columnContentTypes={["text", "text", "numeric", "numeric", "text", "text"]}
                  headings={["Search Query", "Landing Page", "Clicks", "Impressions", "CTR", "Google Rank"]}
                  rows={queryRows}
                />
              </BlockStack>
            </Card>
          </>
        ) : (
          <Card>
            <BlockStack gap="300" inlineAlign="center">
              <Box padding="600">
                <BlockStack gap="300" inlineAlign="center">
                  <Text as="h3" variant="headingMd">
                    Connect Google Search Console to View Real Store Performance
                  </Text>
                  <Text as="p" tone="subdued">
                    Once verified, Shop Forge syncs your store's organic Google queries, positions, and CTR leaks to supercharge your SEO strategy.
                  </Text>
                  <Button variant="primary" onClick={() => (document.querySelector('input') as HTMLInputElement)?.focus()}>
                    Enter Verification Tag Above
                  </Button>
                </BlockStack>
              </Box>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
