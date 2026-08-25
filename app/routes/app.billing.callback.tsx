import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PLAN_CONFIGS } from "../services/billing.server";
import { invalidateShopEntitlementCache } from "../services/entitlement.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  const shopDomain = session.shop;
  const tier = url.searchParams.get("tier") || "starter";
  const chargeId = url.searchParams.get("charge_id") || url.searchParams.get("subscription_id");

  const plan = PLAN_CONFIGS[tier];
  const capOrders = plan?.capOrders ?? 100;

  // Deactivate previous active subscriptions for shop
  await db.subscription.updateMany({
    where: { shop_domain: shopDomain, status: "active" },
    data: { status: "cancelled" },
  });

  // Create new active subscription record
  await db.subscription.create({
    data: {
      shop_domain: shopDomain,
      tier,
      shopify_subscription_id: chargeId ? String(chargeId) : `sub_${Date.now()}`,
      status: "active",
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cap_orders: capOrders,
      overage_state: "ok",
    },
  });

  // Update shop plan
  await db.shop.update({
    where: { domain: shopDomain },
    data: { plan: tier },
  });

  // Log subscription event
  await db.event.create({
    data: {
      shop_domain: shopDomain,
      type: "upgrade",
      payload: JSON.stringify({ tier, chargeId }),
    },
  });

  invalidateShopEntitlementCache(shopDomain);

  return redirect("/app/billing");
};
