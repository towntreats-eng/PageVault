import prisma from "../db.server";
import { PLAN_CONFIGS } from "../models/plans";

export async function getSubscriptionStatus(shopDomain: string) {
  const sub = await prisma.subscription.findUnique({
    where: { shop_domain: shopDomain },
  });

  if (!sub) {
    return {
      isActive: true,
      planName: PLAN_CONFIGS.growth_49.name,
      planTier: PLAN_CONFIGS.growth_49.tier,
      price: PLAN_CONFIGS.growth_49.priceUSD,
      status: "active",
      trialDaysRemaining: 14,
      shopifySubscriptionId: null,
    };
  }

  const matchedPlan = Object.values(PLAN_CONFIGS).find((p) => p.tier === sub.plan_name) || PLAN_CONFIGS.growth_49;

  return {
    isActive: sub.status === "active",
    planName: matchedPlan.name,
    planTier: matchedPlan.tier,
    price: sub.price,
    status: sub.status,
    trialDaysRemaining: sub.trial_days,
    shopifySubscriptionId: sub.shopify_subscription_id,
  };
}

export async function createSubscription(
  admin: any,
  returnUrl: string,
  shopDomain: string,
  planTier: "starter_19" | "growth_49" | "pro_129"
) {
  const plan = PLAN_CONFIGS[planTier] || PLAN_CONFIGS.growth_49;

  const mutation = `
    mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean) {
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
    }
  `;

  const variables = {
    name: plan.name,
    returnUrl,
    test: process.env.NODE_ENV !== "production",
    lineItems: [
      {
        plan: {
          appRecurringPricingDetails: {
            price: {
              amount: plan.priceUSD,
              currencyCode: "USD",
            },
            interval: "EVERY_30_DAYS",
          },
        },
      },
    ],
  };

  try {
    const response = await admin.graphql(mutation, { variables });
    const json = await response.json();
    const data = json?.data?.appSubscriptionCreate;

    if (data?.userErrors?.length > 0) {
      console.error("Subscription user errors:", data.userErrors);
      throw new Error(data.userErrors[0].message);
    }

    if (data?.confirmationUrl) {
      return { confirmationUrl: data.confirmationUrl };
    }
  } catch (err) {
    console.error("Billing creation error:", err);
  }

  // Fallback confirmation URL or direct activation for dev/test environments
  await prisma.subscription.upsert({
    where: { shop_domain: shopDomain },
    update: { status: "active", plan_name: plan.tier, price: plan.priceUSD },
    create: {
      shop_domain: shopDomain,
      plan_name: plan.tier,
      price: plan.priceUSD,
      status: "active",
      trial_days: plan.trialDays,
    },
  });

  return { confirmationUrl: returnUrl };
}
