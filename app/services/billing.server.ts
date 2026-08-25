import db from "../db.server";
import { PLAN_CONFIGS } from "../models/plans";

export { PLAN_CONFIGS };

/**
 * Initialize default Feature Flags in DB for all tiers
 */
export async function seedFeatureFlags() {
  const flags = [
    // Starter Features
    { tier: "starter", feature_key: "pincode_checker", enabled: true },
    { tier: "starter", feature_key: "cod_badge", enabled: true },
    { tier: "starter", feature_key: "whatsapp_cta", enabled: true },

    // Growth Features
    { tier: "growth", feature_key: "pincode_checker", enabled: true },
    { tier: "growth", feature_key: "cod_badge", enabled: true },
    { tier: "growth", feature_key: "whatsapp_cta", enabled: true },
    { tier: "growth", feature_key: "photo_reviews", enabled: true },
    { tier: "growth", feature_key: "wishlist", enabled: true },
    { tier: "growth", feature_key: "stock_alerts", enabled: true },
    { tier: "growth", feature_key: "bundle_upsell", enabled: true },
    { tier: "growth", feature_key: "sticky_urgency_atc", enabled: true },

    // Scale Features
    { tier: "scale", feature_key: "pincode_checker", enabled: true },
    { tier: "scale", feature_key: "cod_badge", enabled: true },
    { tier: "scale", feature_key: "whatsapp_cta", enabled: true },
    { tier: "scale", feature_key: "photo_reviews", enabled: true },
    { tier: "scale", feature_key: "wishlist", enabled: true },
    { tier: "scale", feature_key: "stock_alerts", enabled: true },
    { tier: "scale", feature_key: "bundle_upsell", enabled: true },
    { tier: "scale", feature_key: "sticky_urgency_atc", enabled: true },
    { tier: "scale", feature_key: "ab_testing", enabled: true },
    { tier: "scale", feature_key: "conversion_analytics", enabled: true },

    // Pro Features
    { tier: "pro", feature_key: "pincode_checker", enabled: true },
    { tier: "pro", feature_key: "cod_badge", enabled: true },
    { tier: "pro", feature_key: "whatsapp_cta", enabled: true },
    { tier: "pro", feature_key: "photo_reviews", enabled: true },
    { tier: "pro", feature_key: "wishlist", enabled: true },
    { tier: "pro", feature_key: "stock_alerts", enabled: true },
    { tier: "pro", feature_key: "bundle_upsell", enabled: true },
    { tier: "pro", feature_key: "sticky_urgency_atc", enabled: true },
    { tier: "pro", feature_key: "ab_testing", enabled: true },
    { tier: "pro", feature_key: "conversion_analytics", enabled: true },
  ];

  for (const flag of flags) {
    await db.featureFlag.upsert({
      where: {
        tier_feature_key: {
          tier: flag.tier,
          feature_key: flag.feature_key,
        },
      },
      update: { enabled: flag.enabled },
      create: flag,
    });
  }
}

/**
 * Creates Shopify App Subscription via GraphQL Admin API
 */
export async function createShopifySubscription({
  admin,
  shopDomain,
  tier,
  returnUrl,
}: {
  admin: any;
  shopDomain: string;
  tier: "starter" | "growth" | "scale" | "pro";
  returnUrl: string;
}) {
  const plan = PLAN_CONFIGS[tier];
  if (!plan) throw new Error(`Invalid plan tier: ${tier}`);

  // Fetch shop currency from DB
  const shop = await db.shop.findUnique({ where: { domain: shopDomain } });
  const isINR = shop?.currency === "INR";
  const amount = isINR ? plan.priceINR : plan.priceUSD;
  const currencyCode = isINR ? "INR" : "USD";

  const response = await admin.graphql(
    `#graphql
      mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean) {
        appSubscriptionCreate(name: $name, lineItems: $lineItems, returnUrl: $returnUrl, test: $test) {
          appSubscription {
            id
            status
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        name: `Shop Forge ${plan.name}`,
        returnUrl,
        test: process.env.NODE_ENV !== "production",
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: {
                  amount,
                  currencyCode,
                },
                interval: "EVERY_30_DAYS",
              },
            },
          },
        ],
      },
    }
  );

  const responseJson = await response.json();
  const data = responseJson?.data?.appSubscriptionCreate;

  if (data?.userErrors?.length > 0) {
    throw new Error(`Shopify Billing Error: ${data.userErrors[0].message}`);
  }

  return {
    confirmationUrl: data.confirmationUrl,
    subscriptionId: data.appSubscription?.id,
  };
}
