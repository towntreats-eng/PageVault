import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getShopEntitlements } from "../services/entitlement.server";

// CORS headers for storefront App Proxy calls
const proxyCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const path = params["*"] || "";
  const shopDomain = url.searchParams.get("shop") || "demo-store.myshopify.com";

  if (path === "status" || path === "seo") {
    const entitlement = await getShopEntitlements(shopDomain);
    return json(
      {
        status: "active",
        plan: entitlement.tier,
        autoOptimize: true,
      },
      { headers: proxyCorsHeaders }
    );
  }

  return json({ status: "SEO Forge App Proxy active" }, { headers: proxyCorsHeaders });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return json({ success: true }, { headers: proxyCorsHeaders });
};
