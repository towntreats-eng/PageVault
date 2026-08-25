import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`[GDPR Webhook] Received ${topic} for ${shop}`);

  const customerId = payload?.customer?.id ? String(payload.customer.id) : null;
  const customerEmail = payload?.customer?.email ? String(payload.customer.email) : null;

  if (customerId || customerEmail) {
    // Delete customer wishlist items
    if (customerId) {
      await db.wishlistItem.deleteMany({
        where: { shop_domain: shop, customer_id: customerId },
      });

      // Anonymize/delete reviews submitted by customer
      await db.review.deleteMany({
        where: { shop_domain: shop, customer_id: customerId },
      });
    }

    // Delete customer stock alerts by email or customer_id
    if (customerEmail || customerId) {
      await db.stockAlert.deleteMany({
        where: {
          shop_domain: shop,
          OR: [
            ...(customerEmail ? [{ email: customerEmail }] : []),
            ...(customerId ? [{ customer_id: customerId }] : []),
          ],
        },
      });
    }

    console.log(`[GDPR Webhook] Successfully redacted customer data for shop ${shop}, customerId ${customerId}`);
  }

  return new Response(JSON.stringify({ status: "success", redacted: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
