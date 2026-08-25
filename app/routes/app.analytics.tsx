import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Badge,
  BlockStack,
  InlineStack,
  DataTable,
  Box,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { checkFeatureAccess } from "../services/entitlement.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const access = await checkFeatureAccess(shopDomain, "conversion_analytics");

  const events = await db.event.findMany({
    where: { shop_domain: shopDomain },
    take: 25,
    orderBy: { created_at: "desc" },
  });

  const totalEvents = await db.event.count({ where: { shop_domain: shopDomain } });
  const featureBlockedEvents = await db.event.count({
    where: { shop_domain: shopDomain, event_name: "feature_blocked" },
  });

  return {
    shopDomain,
    allowed: access.allowed,
    tier: access.tier,
    totalEvents,
    featureBlockedEvents,
    events,
  };
};

export default function ShopForgeAnalytics() {
  const { allowed, tier, totalEvents, featureBlockedEvents, events } = useLoaderData<typeof loader>();

  const rows = events.map((e) => [
    e.event_name,
    e.payload ? JSON.stringify(JSON.parse(e.payload)) : "N/A",
    new Date(e.created_at).toLocaleString(),
  ]);

  return (
    <Page title="Shop Forge — Conversion Analytics & A/B Testing">
      <TitleBar title="Analytics | Shop Forge" />
      <BlockStack gap="500">
        {!allowed && (
          <Banner title="Scale / Pro Tier Feature" tone="warning">
            <p>
              Conversion Analytics and A/B Testing are available on <strong>Scale</strong> ($59/mo) and <strong>Pro</strong> ($99/mo) plans.
              Current Tier: <strong>{tier.toUpperCase()}</strong>. Upgrade your plan in Plans & Billing to unlock real-time conversion heatmaps.
            </p>
          </Banner>
        )}

        <Layout>
          {/* Key Metrics Overview */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Store Conversion & Feature Event Overview
                </Text>
                <InlineStack gap="400">
                  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                    <Text as="p" variant="bodySm" tone="subdued">TOTAL STORE EVENTS</Text>
                    <Text as="p" variant="headingLg">{totalEvents}</Text>
                  </Box>
                  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                    <Text as="p" variant="bodySm" tone="subdued">FEATURE UPGRADE TRIGGERS</Text>
                    <Text as="p" variant="headingLg">{featureBlockedEvents}</Text>
                  </Box>
                  <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                    <Text as="p" variant="bodySm" tone="subdued">A/B TEST VARIANTS ACTIVE</Text>
                    <Text as="p" variant="headingLg">2 Variants</Text>
                  </Box>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Event Stream Data Table */}
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Real-Time Conversion Event Log
                  </Text>
                  <Badge tone={allowed ? "success" : "info"}>
                    {allowed ? "LIVE STREAM ACTIVE" : "PREVIEW MODE"}
                  </Badge>
                </InlineStack>

                {events.length === 0 ? (
                  <Box padding="300">
                    <Text as="p" variant="bodySm" tone="subdued">
                      No conversion events recorded yet.
                    </Text>
                  </Box>
                ) : (
                  <DataTable
                    columnContentTypes={["text", "text", "text"]}
                    headings={["Event Name", "Event Details / Payload", "Timestamp"]}
                    rows={rows}
                  />
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
