import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Badge,
  BlockStack,
  InlineStack,
  Grid,
  Button,
  Box,
  Banner,
  ProgressBar,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { PLAN_CONFIGS } from "../models/plans";
import { createShopifySubscription, seedFeatureFlags } from "../services/billing.server";
import { getShopEntitlements, invalidateShopEntitlementCache } from "../services/entitlement.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Ensure DB feature flags are seeded
  await seedFeatureFlags();

  const entitlement = await getShopEntitlements(shopDomain);
  const shopRecord = await db.shop.findUnique({ where: { domain: shopDomain } });

  const currency = shopRecord?.currency || "USD";
  const isINR = currency === "INR";

  return {
    shopDomain,
    currentTier: entitlement.tier,
    currency,
    isINR,
    orderCount: entitlement.orderCount,
    capOrders: entitlement.capOrders,
    overageState: entitlement.overageState,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const targetTier = String(formData.get("targetTier") || "");
  const shopDomain = session.shop;

  if (targetTier === "free") {
    // Cancel subscription or downgrade to Free tier
    await db.subscription.updateMany({
      where: { shop_domain: shopDomain, status: "active" },
      data: { status: "cancelled" },
    });

    await db.shop.update({
      where: { domain: shopDomain },
      data: { plan: "free" },
    });

    invalidateShopEntitlementCache(shopDomain);
    return json({ success: true, message: "Downgraded to Free tier. Layouts remain fully intact!" });
  }

  if (["starter", "growth", "scale", "pro"].includes(targetTier)) {
    const appUrl = process.env.SHOPIFY_APP_URL || "https://example.com";
    const returnUrl = `${appUrl}/app/billing/callback?shop=${shopDomain}&tier=${targetTier}`;

    try {
      const { confirmationUrl } = await createShopifySubscription({
        admin,
        shopDomain,
        tier: targetTier as any,
        returnUrl,
      });

      if (confirmationUrl) {
        return redirect(confirmationUrl);
      }
    } catch (err: any) {
      return json({ error: err.message || "Failed to create subscription" }, { status: 400 });
    }
  }

  return json({ error: "Invalid tier selection" }, { status: 400 });
};

export default function ShopForgeBilling() {
  const { currentTier, currency, isINR, orderCount, capOrders, overageState } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const handleSelectPlan = (tier: string) => {
    const form = new FormData();
    form.append("targetTier", tier);
    submit(form, { method: "post" });
  };

  const capPercentage = capOrders > 0 ? Math.min(100, Math.round((orderCount / capOrders) * 100)) : 0;

  return (
    <Page title="Shop Forge — Plans & Subscriptions">
      <TitleBar title="Billing | Shop Forge" />
      <BlockStack gap="500">
        {actionData?.error && (
          <Banner title="Subscription Error" tone="critical">
            <p>{actionData.error}</p>
          </Banner>
        )}

        {actionData?.message && (
          <Banner title="Plan Updated" tone="success">
            <p>{actionData.message}</p>
          </Banner>
        )}

        {/* Order Volume Cap Gauge */}
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Billing Period Order Usage
              </Text>
              <Badge tone={overageState === "exceeded" ? "critical" : overageState === "approaching" ? "warning" : "success"}>
                {overageState.toUpperCase()}
              </Badge>
            </InlineStack>

            <Text as="p" variant="bodySm" tone="subdued">
              Current Plan: <strong>{currentTier.toUpperCase()}</strong> • Order Limit:{" "}
              {capOrders === -1 ? "Unlimited" : `${capOrders} Orders/mo`}
            </Text>

            {capOrders > 0 && (
              <BlockStack gap="200">
                <ProgressBar progress={capPercentage} tone={capPercentage >= 100 ? "critical" : capPercentage >= 80 ? "highlight" : "primary"} />
                <Text as="span" variant="bodySm">
                  {orderCount} of {capOrders} orders processed ({capPercentage}%)
                </Text>
              </BlockStack>
            )}

            {overageState === "approaching" && (
              <Banner title="Approaching Order Cap" tone="warning">
                <p>You have reached 80%+ of your current plan order cap. Upgrade to the next tier to avoid feature pauses.</p>
              </Banner>
            )}
          </BlockStack>
        </Card>

        {/* Pricing Ladder Grid */}
        <Grid>
          {Object.entries(PLAN_CONFIGS).map(([tierKey, plan]) => {
            const isCurrent = currentTier === tierKey;
            const priceText = isINR ? `₹${plan.priceINR.toLocaleString("en-IN")}/mo` : `$${plan.priceUSD}/mo`;

            return (
              <Grid.Cell key={tierKey} columnSpan={{ xs: 12, sm: 6, md: 4, lg: 4, xl: 4 }}>
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h3" variant="headingSm">
                        {plan.name}
                      </Text>
                      {isCurrent && <Badge tone="success">CURRENT PLAN</Badge>}
                      {tierKey === "growth" && !isCurrent && <Badge tone="attention">MOST POPULAR</Badge>}
                    </InlineStack>

                    <div>
                      <Text as="h2" variant="headingLg">
                        {priceText}
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">
                        Order Cap: {plan.capOrders === -1 ? "Unlimited" : `≤${plan.capOrders} orders/mo`}
                      </Text>
                    </div>

                    <BlockStack gap="200">
                      {plan.features.map((feat, idx) => (
                        <Text key={idx} as="p" variant="bodySm">
                          ✓ {feat}
                        </Text>
                      ))}
                    </BlockStack>

                    <Button
                      variant={isCurrent ? "secondary" : tierKey === "growth" ? "primary" : "secondary"}
                      disabled={isCurrent}
                      onClick={() => handleSelectPlan(tierKey)}
                    >
                      {isCurrent ? "Active Plan" : `Choose ${plan.tier.toUpperCase()}`}
                    </Button>
                  </BlockStack>
                </Card>
              </Grid.Cell>
            );
          })}
        </Grid>
      </BlockStack>
    </Page>
  );
}
