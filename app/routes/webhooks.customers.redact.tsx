import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`[GDPR Webhook] Received ${topic} for ${shop}. No personal customer data stored by SEO Forge.`);

  return new Response(JSON.stringify({ status: "success", redacted: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
