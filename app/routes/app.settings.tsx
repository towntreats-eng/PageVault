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
  Divider,
  Banner,
  Button,
  ProgressBar,
  Box,
  IndexTable,
  TextField,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { getSubscriptionStatus } from "../services/billing.server";
import { getGscConnectionStatus } from "../services/gsc.server";
import { configuredEngines } from "../services/ai_citation.server";
import { queueHealth } from "../services/queue.server";
import { getIndexNowKey, getIndexNowLogs, submitToIndexNow } from "../services/indexnow.server";
import { getSeoSettings, updateSeoSettings } from "../services/seo.server";
import { testGeminiConnection, getGeminiApiKey } from "../services/gemini.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const [
    subscription,
    gsc,
    budget,
    changeCount,
    pageCount,
    indexNowKey,
    indexNowLogs,
    seoSettings,
    aiEnginesList,
    geminiKey,
  ] = await Promise.all([
    getSubscriptionStatus(shopDomain),
    getGscConnectionStatus(shopDomain),
    prisma.aiBudget.findUnique({ where: { shop_domain: shopDomain } }),
    prisma.change.count({ where: { shop_domain: shopDomain } }),
    prisma.pageRecord.count({ where: { shop_domain: shopDomain } }),
    getIndexNowKey(shopDomain),
    getIndexNowLogs(shopDomain, 10),
    getSeoSettings(shopDomain),
    configuredEngines(shopDomain),
    getGeminiApiKey(shopDomain),
  ]);

  return json({
    shopDomain,
    subscription,
    gsc,
    aiEngines: aiEnginesList,
    geminiConfigured: Boolean(geminiKey),
    geminiKeyMasked: geminiKey
      ? `${geminiKey.slice(0, 6)}••••••••${geminiKey.slice(-4)}`
      : "",
    geminiSource: seoSettings.gemini_api_key
      ? "database"
      : process.env.GEMINI_API_KEY
      ? "env"
      : "none",
    queue: queueHealth(),
    budget: budget
      ? {
          spend: Number((budget.llm_spend_usd + budget.dataforseo_spend_usd).toFixed(2)),
          cap: budget.budget_cap_usd,
          month: budget.month,
        }
      : null,
    changeCount,
    pageCount,
    indexNowKey,
    indexNowLogs,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save_gemini_key") {
    const apiKey = String(formData.get("geminiApiKey") || "").trim();
    await updateSeoSettings(session.shop, {
      gemini_api_key: apiKey.length > 0 ? apiKey : null,
    });
    return json({
      kind: "gemini_saved" as const,
      success: true,
      message: apiKey
        ? "Google Gemini API Key saved successfully! AI tools are now active."
        : "Google Gemini API Key removed.",
    });
  }

  if (intent === "test_gemini_key") {
    const testKey = String(formData.get("geminiApiKey") || "").trim();
    const effectiveKey = testKey || (await getGeminiApiKey(session.shop));
    if (!effectiveKey) {
      return json({
        kind: "gemini_test" as const,
        success: false,
        latencyMs: 0,
        model: "",
        error: "Please enter a Gemini API Key to test.",
      });
    }
    const testResult = await testGeminiConnection(effectiveKey);
    return json({
      kind: "gemini_test" as const,
      success: testResult.ok,
      latencyMs: testResult.latencyMs || 0,
      model: testResult.model || "",
      error: testResult.error,
    });
  }

  if (intent === "submit_indexnow_catalog") {
    const pages = await prisma.pageRecord.findMany({
      where: { shop_domain: session.shop },
      select: { url: true },
      take: 100,
    });
    const urls = pages.map((p) => p.url);
    if (urls.length === 0) {
      urls.push(`https://${session.shop}/`);
    }
    const result = await submitToIndexNow(session.shop, urls);
    return json({ kind: "indexnow" as const, result });
  }

  return json({ kind: "none" as const });
};

export default function SettingsPage() {
  const {
    shopDomain,
    subscription,
    gsc,
    aiEngines,
    geminiConfigured,
    geminiKeyMasked,
    geminiSource,
    queue,
    budget,
    changeCount,
    pageCount,
    indexNowKey,
    indexNowLogs,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";

  const [geminiInput, setGeminiInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  const handleTestGemini = () => {
    submit(
      { intent: "test_gemini_key", geminiApiKey: geminiInput },
      { method: "post" }
    );
  };

  const handleSaveGemini = () => {
    submit(
      { intent: "save_gemini_key", geminiApiKey: geminiInput },
      { method: "post" }
    );
  };

  return (
    <Page title="Settings" subtitle={shopDomain}>
      <Layout>
        {actionData?.kind === "indexnow" && actionData.result && (
          <Layout.Section>
            <Banner
              tone={actionData.result.success ? "success" : "warning"}
              title={actionData.result.success ? "IndexNow Submission Successful" : "IndexNow Submission Warning"}
            >
              <p>{actionData.result.message}</p>
            </Banner>
          </Layout.Section>
        )}
        {actionData?.kind === "gemini_saved" && (
          <Layout.Section>
            <Banner
              tone={actionData.success ? "success" : "critical"}
              title={actionData.success ? "Gemini Configuration Updated" : "Error"}
            >
              <p>{actionData.message}</p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.kind === "gemini_test" && (
          <Layout.Section>
            <Banner
              tone={actionData.success ? "success" : "critical"}
              title={actionData.success ? "✓ Google Gemini Connection Successful" : "Google Gemini Connection Failed"}
            >
              {actionData.success ? (
                <p>
                  Connected to Google Gemini (Model: <strong>{actionData.model}</strong>) in <strong>{actionData.latencyMs}ms</strong>. Your AI SEO tools are 100% operational!
                </p>
              ) : (
                <p>{actionData.error}</p>
              )}
            </Banner>
          </Layout.Section>
        )}

        {/* Google Gemini AI Configuration Card */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="300" blockAlign="center">
                  <Text as="h2" variant="headingMd">Google Gemini AI Engine</Text>
                  <Badge tone={geminiConfigured ? "success" : "attention"}>
                    {geminiConfigured ? "Active (gemini-2.5-flash)" : "Key Required"}
                  </Badge>
                </InlineStack>
                {geminiSource === "env" && (
                  <Badge tone="info">Configured via .env</Badge>
                )}
                {geminiSource === "database" && (
                  <Badge tone="success">Saved in Store DB</Badge>
                )}
              </InlineStack>

              <Divider />

              <Text as="p">
                Powers <strong>1-Click AI Meta Tag Generation</strong>, <strong>SEO Blog Article Drafting</strong>, <strong>Rich Product Enrichment</strong>, and <strong>AI Shopping Citations</strong> via Google&apos;s latest Gemini AI models.
              </Text>

              {geminiKeyMasked && (
                <Banner tone="info" title="Current Configured Key">
                  <p>Active Key: <code>{geminiKeyMasked}</code></p>
                </Banner>
              )}

              <TextField
                label="Google Gemini API Key"
                value={geminiInput}
                onChange={setGeminiInput}
                type={showKey ? "text" : "password"}
                autoComplete="off"
                placeholder={geminiKeyMasked ? "Enter new key to update..." : "AIzaSy..."}
                helpText={
                  <span>
                    Get a free API key at{" "}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc", textDecoration: "underline" }}>
                      Google AI Studio (aistudio.google.com)
                    </a>
                  </span>
                }
              />

              <InlineStack gap="300">
                <Button
                  variant="primary"
                  loading={busy}
                  onClick={handleSaveGemini}
                >
                  Save API Key
                </Button>
                <Button
                  loading={busy}
                  onClick={handleTestGemini}
                >
                  ⚡ Test Gemini Connection
                </Button>
                <Button
                  variant="plain"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? "Hide Key" : "Show Key"}
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Plan</Text>
              <Divider />
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="050">
                  <Text as="p" fontWeight="semibold">{subscription?.planName ?? "Free"}</Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    Cancelling in Shopify stops the charge immediately. We never bill after an uninstall.
                  </Text>
                </BlockStack>
                <Button url="/app/billing">Change plan</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Task 9.10: Site Verification Info */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Search Engine Site Verification</Text>
              <Divider />
              <Text as="p">
                Verify your domain with Google Search Console & Bing Webmaster Tools with zero theme code edits.
              </Text>
              <Banner tone="info" title="How to verify without touching theme.liquid">
                <p>
                  Go to <strong>Online Store &gt; Themes &gt; Customize</strong>, open <strong>App Embeds</strong>, and paste your Google or Bing verification code into the <strong>ProofSEO</strong> app embed block. It will be injected directly into the storefront &lt;head&gt;.
                </p>
              </Banner>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Task 9.11: IndexNow Instant Ping */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="050">
                  <Text as="h2" variant="headingMd">IndexNow (Instant Search Indexing)</Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    Pushes newly modified or created URLs directly to Microsoft Bing, Yandex, and Seznam within seconds.
                  </Text>
                </BlockStack>
                <Button
                  loading={busy}
                  onClick={() => submit({ intent: "submit_indexnow_catalog" }, { method: "post" })}
                >
                  Submit Crawled URLs Now
                </Button>
              </InlineStack>
              <Divider />
              <InlineStack gap="400" align="space-between">
                <BlockStack gap="050">
                  <Text as="p" variant="bodySm" tone="subdued">Your Shop IndexNow Key</Text>
                  <Text as="p" fontWeight="semibold">{indexNowKey}</Text>
                </BlockStack>
                <Badge tone="success">Active</Badge>
              </InlineStack>

              {indexNowLogs.length > 0 && (
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">Recent Submissions</Text>
                  <IndexTable
                    resourceName={{ singular: "submission", plural: "submissions" }}
                    itemCount={indexNowLogs.length}
                    selectable={false}
                    headings={[
                      { title: "Timestamp" },
                      { title: "Status" },
                      { title: "URLs Submitted" },
                    ]}
                  >
                    {indexNowLogs.map((log: any, index: number) => (
                      <IndexTable.Row id={log.id} key={log.id} position={index}>
                        <IndexTable.Cell>
                          <Text as="span">{new Date(log.timestamp).toLocaleString()}</Text>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Badge tone={log.success ? "success" : "warning"}>
                            {`HTTP ${log.statusCode}`}
                          </Badge>
                        </IndexTable.Cell>
                        <IndexTable.Cell>
                          <Text as="span">{`${log.urlCount} URL(s)`}</Text>
                        </IndexTable.Cell>
                      </IndexTable.Row>
                    ))}
                  </IndexTable>
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Connections</Text>
              <Divider />

              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="050">
                  <Text as="p" fontWeight="semibold">Google Search Console</Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    {gsc.isConnected
                      ? `Connected to ${gsc.siteUrl}`
                      : gsc.oauthConfigured
                      ? "Not connected. Keyword positions, clicks and impressions stay empty until it is."
                      : "Not connected, and the server has no Google credentials configured."}
                  </Text>
                </BlockStack>
                <Badge tone={gsc.isConnected ? "success" : "warning"}>
                  {gsc.isConnected ? "Connected" : "Not connected"}
                </Badge>
              </InlineStack>

              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="050">
                  <Text as="p" fontWeight="semibold">AI answer engines</Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    {aiEngines.length > 0
                      ? `Configured: ${aiEngines.join(", ")}`
                      : "No provider key configured, so AI visibility checks cannot run."}
                  </Text>
                </BlockStack>
                <Badge tone={aiEngines.length > 0 ? "success" : "warning"}>
                  {aiEngines.length > 0 ? `${aiEngines.length} configured` : "None"}
                </Badge>
              </InlineStack>

              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="050">
                  <Text as="p" fontWeight="semibold">Background checks</Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    {queue.redisConnected
                      ? "Durable. Scheduled re-checks survive a restart."
                      : "Running in memory only. Scheduled re-checks are lost if the app restarts."}
                  </Text>
                </BlockStack>
                <Badge tone={queue.redisConnected ? "success" : "warning"}>{queue.mode}</Badge>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {budget && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Usage</Text>
                <Divider />
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="p">{`AI and data spend, ${budget.month}`}</Text>
                    <Text as="p">{`$${budget.spend.toFixed(2)} of $${budget.cap.toFixed(2)}`}</Text>
                  </InlineStack>
                  <ProgressBar progress={Math.min(100, (budget.spend / budget.cap) * 100)} size="small" />
                  <Text as="p" tone="subdued" variant="bodySm">
                    We stop making paid calls when this cap is reached. You are never billed for overage.
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Your data</Text>
              <Divider />
              <Text as="p">
                {`We hold ${pageCount} crawled page record${pageCount === 1 ? "" : "s"} and ${changeCount} change record${changeCount === 1 ? "" : "s"} for this store.`}
              </Text>
              <Banner tone="info" title="What happens if you uninstall">
                <p>
                  Your meta titles and descriptions stay exactly where they are — they are stored on your products as
                  Shopify metafields, and they are your data, not ours. We do not delete them. We restore any theme file
                  we touched, and we stop billing immediately.
                </p>
              </Banner>
              <InlineStack>
                <Button url={`/app/settings/export`} disabled>Export everything (CSV)</Button>
              </InlineStack>
              <Text as="p" tone="subdued" variant="bodySm">
                Export is not built yet. It is listed here because it is promised in the spec and we are not going to
                hide that it is missing.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Box paddingBlockEnd="800" />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
