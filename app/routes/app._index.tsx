import { useEffect } from "react";
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
  Box,
  Banner,
  Grid,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Retrieve or initialize Shop record
  let shopRecord = await db.shop.findUnique({
    where: { domain: shopDomain },
  });

  if (!shopRecord) {
    // Fetch shop currency from GraphQL Admin API
    const response = await admin.graphql(
      `#graphql
        query getShopDetails {
          shop {
            name
            currencyCode
            billingAddress {
              countryCodeV2
            }
          }
        }`
    );
    const responseJson = await response.json();
    const shopData = responseJson?.data?.shop;
    const currency = shopData?.currencyCode || "USD";

    shopRecord = await db.shop.create({
      data: {
        domain: shopDomain,
        plan: "free",
        currency,
      },
    });
  }

  // Retrieve active subscription details
  const activeSubscription = await db.subscription.findFirst({
    where: { shop_domain: shopDomain, status: "active" },
    orderBy: { created_at: "desc" },
  });

  return {
    shop: shopRecord,
    tier: activeSubscription?.tier || shopRecord.plan || "free",
    currency: shopRecord.currency,
    orderCount: shopRecord.order_count_this_period,
  };
};

export default function ShopForgeIndex() {
  const { shop, tier, currency, orderCount } = useLoaderData<typeof loader>();

  return (
    <Page title="Shop Forge — Conversion Suite">
      <TitleBar title="Dashboard | Shop Forge" />
      <BlockStack gap="500">
        <Banner title="Shop Forge Store OS Initialized" tone="success">
          <p>
            Your store is running on the <strong>{tier.toUpperCase()}</strong> tier ({currency}).
            All page blocks and dynamic runtime features are active.
          </p>
        </Banner>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Current Plan & Tier Usage
                  </Text>
                  <Badge tone={tier === "free" ? "attention" : "success"}>
                    {tier.toUpperCase()} TIER
                  </Badge>
                </InlineStack>

                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                      <BlockStack gap="100">
                        <Text as="span" variant="bodySm" tone="subdued">
                          Installed Store
                        </Text>
                        <Text as="h3" variant="headingSm">
                          {shop.domain}
                        </Text>
                      </BlockStack>
                    </Box>
                  </Grid.Cell>

                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                      <BlockStack gap="100">
                        <Text as="span" variant="bodySm" tone="subdued">
                          Orders This Period
                        </Text>
                        <Text as="h3" variant="headingSm">
                          {orderCount} Orders
                        </Text>
                      </BlockStack>
                    </Box>
                  </Grid.Cell>

                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                      <BlockStack gap="100">
                        <Text as="span" variant="bodySm" tone="subdued">
                          Store Currency
                        </Text>
                        <Text as="h3" variant="headingSm">
                          {currency}
                        </Text>
                      </BlockStack>
                    </Box>
                  </Grid.Cell>
                </Grid>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Store OS Capabilities & Feature Pack Overview
                </Text>
                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Text as="h3" variant="headingSm">
                            India Essentials Pack
                          </Text>
                          <Badge tone="info">STARTER TIER</Badge>
                        </InlineStack>
                        <Text as="p" variant="bodySm">
                          COD Badges, Courier Pincode Serviceability & ETA Checker, WhatsApp CTA, UPI Trustmarks, GST Notes, and Bilingual Copy.
                        </Text>
                      </BlockStack>
                    </Box>
                  </Grid.Cell>

                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Text as="h3" variant="headingSm">
                            Growth App Replacement
                          </Text>
                          <Badge tone="success">GROWTH TIER</Badge>
                        </InlineStack>
                        <Text as="p" variant="bodySm">
                          Photo Reviews with moderation & request emails, Customer Wishlist, Back-In-Stock SMS/Email Alerts, Product Bundles & Sticky Urgency ATC.
                        </Text>
                      </BlockStack>
                    </Box>
                  </Grid.Cell>
                </Grid>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Compliance & API Architecture Status
                </Text>
                <InlineStack gap="400">
                  <Badge tone="success">GraphQL Admin API Only (2026-04)</Badge>
                  <Badge tone="success">GDPR Webhooks Configured</Badge>
                  <Badge tone="success">Shopify Billing API Integrated</Badge>
                  <Badge tone="success">Theme App Extension Engine Ready</Badge>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
