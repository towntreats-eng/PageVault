import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page, Layout, Card, Text, Badge, BlockStack, InlineStack, Divider, Banner, Button, ProgressBar, Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { getSubscriptionStatus } from "../services/billing.server";
import { getGscConnectionStatus } from "../services/gsc.server";
import { configuredEngines } from "../services/ai_citation.server";
import { queueHealth } from "../services/queue.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const [subscription, gsc, budget, changeCount, pageCount] = await Promise.all([
    getSubscriptionStatus(shopDomain),
    getGscConnectionStatus(shopDomain),
    prisma.aiBudget.findUnique({ where: { shop_domain: shopDomain } }),
    prisma.change.count({ where: { shop_domain: shopDomain } }),
    prisma.pageRecord.count({ where: { shop_domain: shopDomain } }),
  ]);

  return json({
    shopDomain,
    subscription,
    gsc,
    aiEngines: configuredEngines(),
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
  });
};

export default function SettingsPage() {
  const { shopDomain, subscription, gsc, aiEngines, queue, budget, changeCount, pageCount } =
    useLoaderData<typeof loader>();

  return (
    <Page title="Settings" subtitle={shopDomain}>
      <Layout>
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
