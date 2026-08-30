import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  const shopDomain = session.shop;
  const chargeId = url.searchParams.get("charge_id") || url.searchParams.get("subscription_id");

  // Activate Pro $29/mo subscription record
  await db.subscription.upsert({
    where: { shop_domain: shopDomain },
    update: {
      status: "active",
      shopify_subscription_id: chargeId ? String(chargeId) : `sub_${Date.now()}`,
      price: 29.0,
      plan_name: "SEO Forge Unlimited Pro",
    },
    create: {
      shop_domain: shopDomain,
      shopify_subscription_id: chargeId ? String(chargeId) : `sub_${Date.now()}`,
      status: "active",
      price: 29.0,
      plan_name: "SEO Forge Unlimited Pro",
      trial_days: 7,
    },
  });

  await db.shop.upsert({
    where: { domain: shopDomain },
    update: { plan: "pro_29" },
    create: { domain: shopDomain, plan: "pro_29" },
  });

  await db.event.create({
    data: {
      shop_domain: shopDomain,
      type: "subscribe_29",
      payload: JSON.stringify({ chargeId, price: 29 }),
    },
  });

  return redirect("/app/billing");
};
