export interface AgentProposal {
  id: string;
  resourceGid: string;
  resourceTitle: string;
  resourceType: "product" | "collection" | "page";
  original: {
    title: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
    imageAlts?: Array<{ id: string; altText: string }>;
  };
  proposed: {
    title: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
    imageAlts?: Array<{ id: string; altText: string }>;
    suggestedKeywords?: string[];
    suggestedFaqs?: Array<{ question: string; answer: string }>;
  };
  rationale: {
    issueAddressed: string;
    expectedBenefit: string;
    confidenceScore: number;
    estimatedCtrLift: string;
  };
  status: "pending" | "approved" | "rejected" | "applied";
}

export interface AgentGoalPreset {
  id: string;
  category: "defects" | "transactional_keywords" | "geo_ai" | "conversion_copy" | "custom";
  title: string;
  description: string;
  badgeTone: "critical" | "warning" | "success" | "info";
  expectedImpact: string;
}

export const AGENT_GOALS: AgentGoalPreset[] = [
  {
    id: "critical_defects",
    category: "defects",
    title: "Fix All Critical Deficiencies & Missing Alt Texts",
    description: "Targets items with missing meta descriptions, short titles, and unindexed image assets to restore baseline store health.",
    badgeTone: "critical",
    expectedImpact: "+15% Crawlability & Health Score Lift",
  },
  {
    id: "transactional_keywords",
    category: "transactional_keywords",
    title: "Rank for High-Intent Transactional Buyer Keywords",
    description: "Infuses commercial modifiers ('Buy', 'Best', 'Organic', 'Export Quality') into product titles and high-CTR meta snippets.",
    badgeTone: "success",
    expectedImpact: "+25-35% Organic Click-Through Rate",
  },
  {
    id: "geo_ai",
    category: "geo_ai",
    title: "Generative Engine Optimization (GEO & AI Search Overviews)",
    description: "Structures descriptions with clear entity definitions and structured FAQ pairs for citations in ChatGPT, Perplexity & Gemini.",
    badgeTone: "info",
    expectedImpact: "High AI Overviews & Answer Engine Visibility",
  },
  {
    id: "conversion_copy",
    category: "conversion_copy",
    title: "High-Conversion Copy & Benefit-Driven Overhaul",
    description: "Re-engineers body descriptions using the AIDA framework, feature-to-benefit bullet points, and trust badges.",
    badgeTone: "warning",
    expectedImpact: "+18% Add-to-Cart Rate from Organic Search",
  },
];
