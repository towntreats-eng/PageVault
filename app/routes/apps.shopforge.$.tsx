import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { checkFeatureAccess, getShopEntitlements } from "../services/entitlement.server";
import { lookupPincodeServiceability } from "../services/pincode.server";
import db from "../db.server";

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

  // 1. Entitlement Status Endpoint
  if (path === "entitlements") {
    const entitlement = await getShopEntitlements(shopDomain);
    return json(
      {
        tier: entitlement.tier,
        overageState: entitlement.overageState,
        features: Array.from(entitlement.allowedFeatures),
      },
      { headers: proxyCorsHeaders }
    );
  }

  // 2. India Pincode Checker Endpoint (Starter Tier Feature)
  if (path === "pincode") {
    const pincode = url.searchParams.get("pincode") || "";
    const access = await checkFeatureAccess(shopDomain, "pincode_checker");

    if (!access.allowed) {
      // Graceful Degradation Response (no error, fallback default serviceability)
      return json(
        {
          serviceable: true,
          codAvailable: true,
          etaDays: 3,
          courier: "Standard Shipping",
          degraded: true,
        },
        { headers: proxyCorsHeaders }
      );
    }

    // Measure lookup performance (<300ms SLA)
    const result = await lookupPincodeServiceability(pincode);

    return json(result, { headers: proxyCorsHeaders });
  }

  return json({ status: "Shop Forge App Proxy active" }, { headers: proxyCorsHeaders });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const url = new URL(request.url);
  const path = params["*"] || "";
  const shopDomain = url.searchParams.get("shop") || "demo-store.myshopify.com";

  // Handle Review Submission (Growth Tier Feature)
  if (path === "reviews") {
    const access = await checkFeatureAccess(shopDomain, "photo_reviews");

    if (!access.allowed) {
      return json(
        {
          success: false,
          degraded: true,
          message: "Photo reviews feature is currently unavailable.",
        },
        { status: 200, headers: proxyCorsHeaders }
      );
    }

    const body = await request.json();
    const review = await db.review.create({
      data: {
        shop_domain: shopDomain,
        product_id: String(body.productId),
        customer_id: body.customerId ? String(body.customerId) : null,
        rating: Number(body.rating) || 5,
        body: String(body.body || ""),
        photos: JSON.stringify(body.photos || []),
        author: String(body.author || "Anonymous Customer"),
        status: "pending",
      },
    });

    return json({ success: true, reviewId: review.id }, { headers: proxyCorsHeaders });
  }

  return json({ success: true }, { headers: proxyCorsHeaders });
};
