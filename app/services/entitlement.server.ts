import db from "../db.server";

// In-Memory Entitlement Cache for Storefront Zero-Latency Checks
const entitlementCache = new Map<string, { tier: string; flags: Set<string>; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

/**
 * Get active shop entitlement tier & allowed feature keys
 */
export async function getShopEntitlements(shopDomain: string): Promise<{
  tier: string;
  allowedFeatures: Set<string>;
  orderCount: number;
  capOrders: number;
  overageState: "ok" | "approaching" | "exceeded";
}> {
  const cached = entitlementCache.get(shopDomain);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      tier: cached.tier,
      allowedFeatures: cached.flags,
      orderCount: 0,
      capOrders: 500,
      overageState: "ok",
    };
  }

  // Fetch shop and active subscription
  let shop = await db.shop.findUnique({ where: { domain: shopDomain } });
  if (!shop) {
    shop = await db.shop.create({
      data: { domain: shopDomain, plan: "free" },
    });
  }

  const activeSub = await db.subscription.findFirst({
    where: { shop_domain: shopDomain, status: "active" },
    orderBy: { created_at: "desc" },
  });

  const tier = activeSub?.tier || shop.plan || "free";
  const capOrders = activeSub?.cap_orders ?? 100;
  const orderCount = shop.order_count_this_period || 0;

  let overageState: "ok" | "approaching" | "exceeded" = "ok";
  if (capOrders > 0) {
    if (orderCount >= capOrders) {
      overageState = "exceeded";
    } else if (orderCount >= capOrders * 0.8) {
      overageState = "approaching";
    }
  }

  // Fetch enabled feature flags for tier
  const flags = await db.featureFlag.findMany({
    where: { tier, enabled: true },
  });

  const allowedFeatures = new Set(flags.map((f) => f.feature_key));

  // Cache entitlement result
  entitlementCache.set(shopDomain, {
    tier,
    flags: allowedFeatures,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return {
    tier,
    allowedFeatures,
    orderCount,
    capOrders,
    overageState,
  };
}

/**
 * Check if a specific feature is enabled for a shop
 * If blocked, logs a feature_blocked event for contextual upgrade prompts!
 */
export async function checkFeatureAccess(
  shopDomain: string,
  featureKey: string
): Promise<{ allowed: boolean; tier: string; overageState: string }> {
  const entitlement = await getShopEntitlements(shopDomain);

  // If order cap exceeded or feature not in allowed list, feature is blocked
  const isCapExceeded = entitlement.overageState === "exceeded";
  const isAllowed = entitlement.allowedFeatures.has(featureKey) && !isCapExceeded;

  if (!isAllowed) {
    // Log feature_blocked event to database
    await db.event.create({
      data: {
        shop_domain: shopDomain,
        type: "feature_blocked",
        payload: JSON.stringify({
          featureKey,
          currentTier: entitlement.tier,
          overageState: entitlement.overageState,
          timestamp: new Date().toISOString(),
        }),
      },
    }).catch(() => null); // Non-blocking async event write
  }

  return {
    allowed: isAllowed,
    tier: entitlement.tier,
    overageState: entitlement.overageState,
  };
}

/**
 * Invalidate cache when shop updates plan or subscription status
 */
export function invalidateShopEntitlementCache(shopDomain: string) {
  entitlementCache.delete(shopDomain);
}
