import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`[GDPR Webhook] Received ${topic} for ${shop}`);

  const customerId = payload?.customer?.id ? String(payload.customer.id) : null;
  const customerEmail = payload?.customer?.email ? String(payload.customer.email) : null;

  if (!customerId && !customerEmail) {
    return new Response(JSON.stringify({ status: "no customer details provided" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Retrieve customer data across Shop Forge models
  const reviews = customerId
    ? await db.review.findMany({
        where: { shop_domain: shop, customer_id: customerId },
      })
    : [];

  const wishlistItems = customerId
    ? await db.wishlistItem.findMany({
        where: { shop_domain: shop, customer_id: customerId },
      })
    : [];

  const stockAlerts = customerEmail
    ? await db.stockAlert.findMany({
        where: { shop_domain: shop, email: customerEmail },
      })
    : [];

  const customerDataExport = {
    shop,
    customer: payload.customer,
    data: {
      reviews,
      wishlistItems,
      stockAlerts,
    },
  };

  return new Response(JSON.stringify(customerDataExport), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
