import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`[GDPR Webhook] Received ${topic} for ${shop}. Purging all shop data.`);

  if (shop) {
    await db.seoAudit.deleteMany({ where: { shop_domain: shop } }).catch(() => null);
    await db.seoSetting.deleteMany({ where: { shop_domain: shop } }).catch(() => null);
    await db.imageOptLog.deleteMany({ where: { shop_domain: shop } }).catch(() => null);
    await db.brokenLink.deleteMany({ where: { shop_domain: shop } }).catch(() => null);
    await db.event.deleteMany({ where: { shop_domain: shop } }).catch(() => null);
    await db.subscription.deleteMany({ where: { shop_domain: shop } }).catch(() => null);
    await db.shop.deleteMany({ where: { domain: shop } }).catch(() => null);
    await db.session.deleteMany({ where: { shop } }).catch(() => null);
  }

  return new Response(JSON.stringify({ status: "success", purged: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
