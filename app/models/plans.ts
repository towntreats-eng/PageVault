export interface PlanConfig {
  name: string;
  tier: "free" | "starter_19" | "growth_49" | "pro_129";
  priceUSD: number;
  productsLimit: number; // -1 for unlimited
  keywordsLimit: number;
  marketsLimit: number; // -1 for unlimited
  aiQueriesMonthly: number;
  trialDays: number;
  features: string[];
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  free: {
    name: "Free Baseline",
    tier: "free",
    priceUSD: 0,
    productsLimit: 50,
    keywordsLimit: 10,
    marketsLimit: 1,
    aiQueriesMonthly: 0,
    trialDays: 0,
    features: [
      "Up to 50 Products",
      "10 Tracked Keywords",
      "1 Market Region",
      "Basic Proof Engine Verification",
      "Manual Meta Tag Editor",
    ],
  },
  starter_19: {
    name: "Starter Plan",
    tier: "starter_19",
    priceUSD: 19,
    productsLimit: 500,
    keywordsLimit: 100,
    marketsLimit: 1,
    aiQueriesMonthly: 0,
    trialDays: 14,
    features: [
      "Up to 500 Products",
      "100 Tracked Keywords",
      "1 Market Region",
      "Full Image WebP Compression & Alt Generator",
      "Auto Meta Title & Description Templates",
      "Google JSON-LD Rich Snippets Schema",
      "14-Day Free Trial",
    ],
  },
  growth_49: {
    name: "Growth Plan",
    tier: "growth_49",
    priceUSD: 49,
    productsLimit: 2500,
    keywordsLimit: 500,
    marketsLimit: 3,
    aiQueriesMonthly: 75, // 25 queries × 3 engines
    trialDays: 14,
    features: [
      "Up to 2,500 Products",
      "500 Tracked Keywords",
      "Up to 3 Market Regions",
      "AI Visibility Citation Tracker (ChatGPT, Perplexity, Gemini)",
      "Google Search Console Intent Analytics",
      "404 Broken Link Auto Redirects",
      "14-Day Free Trial",
    ],
  },
  pro_129: {
    name: "Pro / Agency Plan",
    tier: "pro_129",
    priceUSD: 129,
    productsLimit: -1, // Unlimited
    keywordsLimit: 2000,
    marketsLimit: -1, // Unlimited
    aiQueriesMonthly: 300, // 100 queries × 3 engines
    trialDays: 14,
    features: [
      "Unlimited Products",
      "2,000 Tracked Keywords",
      "Unlimited Market Regions",
      "Advanced AI Visibility & Citation Audit",
      "Bulk Keyword Engine & DataForSEO Rank Tracking",
      "Priority Batch Queue & Multi-Market Targeting",
      "14-Day Free Trial",
    ],
  },
};
