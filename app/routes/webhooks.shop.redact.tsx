import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`[GDPR Webhook] Received ${topic} for ${shop}. Purging all shop data.`);

  if (shop) {
    // Execute full database redaction for shop
    await db.review.deleteMany({ where: { shop_domain: shop } });
    await db.wishlistItem.deleteMany({ where: { shop_domain: shop } });
    await db.stockAlert.deleteMany({ where: { shop_domain: shop } });
    await db.install.deleteMany({ where: { shop_domain: shop } });
    await db.event.deleteMany({ where: { shop_domain: shop } });
    await db.subscription.deleteMany({ where: { shop_domain: shop } });
    await db.shop.deleteMany({ where: { domain: shop } });
    await db.session.deleteMany({ where: { shop } });

    console.log(`[GDPR Webhook] Completed 48-hour data purge for shop ${shop}`);
  }

  return new Response(JSON.stringify({ status: "success", purged: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
