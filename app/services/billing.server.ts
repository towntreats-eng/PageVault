/**
 * SaaS Billing & Plan Quotas Service
 * Manages tiers, quotas, token budgets, and billing state.
 */

import prisma from "../db.server";

export interface PlanDefinition {
  id: string;
  name: string;
  price: number;
  monthlyCredits: number;
  badgeTone: "info" | "attention" | "success" | "warning";
  popular?: boolean;
  description: string;
  features: string[];
}

export const BILLING_PLANS: Record<string, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free Trial",
    price: 0,
    monthlyCredits: 5,
    badgeTone: "info",
    description: "Essential technical audit & baseline SEO diagnostics for testing store capabilities.",
    features: [
      "Rule-based Store SEO Health Audit",
      "5 AI Product & Meta Optimizations",
      "Side-by-Side Diff Preview",
      "1-Click Rollback & Version History",
      "Manual Schema Generator",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter Growth",
    price: 19,
    monthlyCredits: 50,
    badgeTone: "attention",
    description: "Ideal for growing independent merchants scaling their organic search footprint.",
    features: [
      "Everything in Free Trial",
      "50 AI Optimizations / month",
      "Image ALT Text Batch Optimizer",
      "Blog Article SEO Optimizer",
      "Keyword Opportunity & Intent Mapping",
      "Google Search Console Integration",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth Pro",
    price: 49,
    monthlyCredits: 250,
    badgeTone: "success",
    popular: true,
    description: "Complete autonomous power for scaling e-commerce brands dominating search.",
    features: [
      "Everything in Starter",
      "250 AI Optimizations / month",
      "Autonomous AI SEO Agent (Autopilot)",
      "Competitor Gap & Market Overlap Analyzer",
      "Bulk Catalog Async Optimization Queue",
      "Keyword Cannibalization Shield",
      "Priority Gemini 2.0 Flash Processing",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro Enterprise",
    price: 99,
    monthlyCredits: 9999, // Unlimited
    badgeTone: "warning",
    description: "Enterprise performance, custom brand voice modeling, and unlimited generation capacity.",
    features: [
      "Everything in Growth Pro",
      "Unlimited AI Optimizations",
      "Custom Brand Voice Tuning & Tone Guard",
      "Zero-Throttle Dedicated Processing",
      "Advanced GEO & Answer Engine Syndication",
      "VIP Dedicated Priority Support",
    ],
  },
};

export class BillingService {
  /**
   * Get complete plan details and usage metrics for a shop.
   */
  static async getShopUsage(shopDomain: string) {
    const shop = await prisma.shop.findUnique({
      where: { domain: shopDomain },
      select: { plan: true },
    });

    const currentPlanId = shop?.plan || "free";
    const planConfig = BILLING_PLANS[currentPlanId] || BILLING_PLANS.free;

    // Calculate usage in current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageCount = await prisma.aiUsageRecord.count({
      where: {
        shopDomain,
        createdAt: { gte: startOfMonth },
      },
    });

    const isUnlimited = planConfig.monthlyCredits >= 9999;
    const remainingCredits = isUnlimited
      ? 9999
      : Math.max(0, planConfig.monthlyCredits - usageCount);
    const usagePercent = isUnlimited
      ? Math.min(100, Math.round((usageCount / 1000) * 100))
      : Math.min(100, Math.round((usageCount / planConfig.monthlyCredits) * 100));

    return {
      currentPlan: planConfig,
      allPlans: Object.values(BILLING_PLANS),
      usageCount,
      remainingCredits,
      usagePercent,
      isQuotaExceeded: !isUnlimited && usageCount >= planConfig.monthlyCredits,
    };
  }

  /**
   * Record an AI action usage event
   */
  static async recordAiUsage(
    shopDomain: string,
    actionType: string,
    inputTokens = 0,
    outputTokens = 0
  ) {
    return prisma.aiUsageRecord.create({
      data: {
        shopDomain,
        actionType,
        inputTokens,
        outputTokens,
      },
    });
  }

  /**
   * Change or upgrade a shop's plan
   */
  static async updatePlan(shopDomain: string, newPlanId: string) {
    if (!BILLING_PLANS[newPlanId]) {
      throw new Error(`Invalid plan: ${newPlanId}`);
    }

    return prisma.shop.update({
      where: { domain: shopDomain },
      data: { plan: newPlanId },
    });
  }
}
