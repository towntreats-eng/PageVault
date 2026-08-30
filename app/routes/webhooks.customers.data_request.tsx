import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`[GDPR Webhook] Received ${topic} for ${shop}`);

  return new Response(
    JSON.stringify({
      shop,
      customer: payload?.customer,
      data: { message: "No personal customer data stored by SEO Forge." },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
