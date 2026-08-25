export interface PlanConfig {
  tier: "free" | "starter" | "growth" | "scale" | "pro";
  name: string;
  priceINR: number;
  priceUSD: number;
  capOrders: number; // 100 | 500 | 2000 | -1 (unlimited)
  features: string[];
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  free: {
    tier: "free",
    name: "Free Tier",
    priceINR: 0,
    priceUSD: 0,
    capOrders: -1,
    features: ["5 static pages/sections", "Full design quality", "No watermark"],
  },
  starter: {
    tier: "starter",
    name: "Starter Tier",
    priceINR: 799,
    priceUSD: 9,
    capOrders: 100,
    features: [
      "Full page + section library",
      "India essentials pack",
      "COD badge & Pincode delivery checker",
      "WhatsApp CTA & UPI trustmarks",
      "GST notes & bilingual copy",
      "Basic star ratings",
    ],
  },
  growth: {
    tier: "growth",
    name: "Growth Tier (Recommended)",
    priceINR: 2499,
    priceUSD: 29,
    capOrders: 500,
    features: [
      "Everything in Starter",
      "Photo reviews with moderation & request emails",
      "Customer Wishlist",
      "Back-in-stock alerts",
      "Product bundle & upsell blocks",
      "Sticky ATC with real inventory urgency",
    ],
  },
  scale: {
    tier: "scale",
    name: "Scale Tier",
    priceINR: 4999,
    priceUSD: 59,
    capOrders: 2000,
    features: [
      "Everything in Growth",
      "A/B testing on page variants",
      "Conversion analytics per block",
      "Advanced bundle rules",
      "Priority support",
    ],
  },
  pro: {
    tier: "pro",
    name: "Pro Tier",
    priceINR: 8999,
    priceUSD: 99,
    capOrders: -1,
    features: [
      "Everything in Scale",
      "Unlimited order volume",
      "Dedicated account manager",
      "Early access to new blocks",
    ],
  },
};
