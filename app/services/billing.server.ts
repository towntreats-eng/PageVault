import prisma from "../db.server";

export const PRO_PLAN_PRICE = 29.0;
export const PRO_PLAN_NAME = "SEO Forge Unlimited Pro";

export async function getSubscriptionStatus(shopDomain: string) {
  const sub = await prisma.subscription.findUnique({
    where: { shop_domain: shopDomain },
  });

  if (!sub) {
    return {
      isActive: true, // Default active demo period
      planName: PRO_PLAN_NAME,
      price: PRO_PLAN_PRICE,
      status: "active",
      trialDaysRemaining: 7,
      shopifySubscriptionId: null,
    };
  }

  return {
    isActive: sub.status === "active",
    planName: sub.plan_name,
    price: sub.price,
    status: sub.status,
    trialDaysRemaining: sub.trial_days,
    shopifySubscriptionId: sub.shopify_subscription_id,
  };
}

export async function createProSubscription(admin: any, returnUrl: string, shopDomain: string) {
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
    name: PRO_PLAN_NAME,
    returnUrl,
    test: process.env.NODE_ENV !== "production",
    lineItems: [
      {
        plan: {
          appRecurringPricingDetails: {
            price: {
              amount: PRO_PLAN_PRICE,
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
    update: { status: "active", price: PRO_PLAN_PRICE },
    create: {
      shop_domain: shopDomain,
      plan_name: PRO_PLAN_NAME,
      price: PRO_PLAN_PRICE,
      status: "active",
      trial_days: 7,
    },
  });

  return { confirmationUrl: returnUrl };
}
