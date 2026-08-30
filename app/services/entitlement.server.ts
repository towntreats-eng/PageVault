import db from "../db.server";

/**
 * Get active shop entitlement tier & SEO features
 */
export async function getShopEntitlements(shopDomain: string) {
  let shop = await db.shop.findUnique({ where: { domain: shopDomain } });
  if (!shop) {
    shop = await db.shop.create({
      data: { domain: shopDomain, plan: "pro_29" },
    });
  }

  const activeSub = await db.subscription.findUnique({
    where: { shop_domain: shopDomain },
  });

  const isPro = activeSub?.status === "active" || shop.plan === "pro_29";

  return {
    tier: isPro ? "pro_29" : "free",
    isPro,
    planName: activeSub?.plan_name || "SEO Forge Unlimited Pro",
    status: activeSub?.status || "active",
  };
}

export async function checkFeatureAccess(shopDomain: string, _featureKey: string) {
  const entitlement = await getShopEntitlements(shopDomain);
  return {
    allowed: entitlement.isPro,
    tier: entitlement.tier,
    overageState: "ok",
  };
}

export function invalidateShopEntitlementCache(_shopDomain: string) {
  // No-op for fresh DB lookups
}
