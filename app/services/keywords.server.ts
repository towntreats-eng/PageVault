/**
 * Keyword Research & Opportunity Engine
 * Provider abstraction, intent categorization, cannibalization detection, and mapping.
 */

import prisma from "../db.server";

export type SearchIntent = "informational" | "commercial" | "transactional" | "navigational";

export interface KeywordMetric {
  keyword: string;
  searchVolume: number | null;
  difficulty: number | null;
  cpc: number | null;
  searchIntent: SearchIntent;
  category: "related" | "long_tail" | "question" | "commercial" | "informational";
  isAvailable: boolean;
}

export interface KeywordProvider {
  name: string;
  expandSeedKeyword(seed: string): Promise<KeywordMetric[]>;
}

export class LocalSemanticKeywordProvider implements KeywordProvider {
  name = "LocalSemanticEngine";

  async expandSeedKeyword(seed: string): Promise<KeywordMetric[]> {
    const clean = seed.trim().toLowerCase();
    const words = clean.split(/\s+/).filter(Boolean);
    const results: KeywordMetric[] = [];

    // 1. Direct seed
    results.push({
      keyword: clean,
      searchVolume: null,
      difficulty: null,
      cpc: null,
      searchIntent: words.some((w) => ["buy", "order", "price", "shop"].includes(w))
        ? "transactional"
        : "commercial",
      category: "commercial",
      isAvailable: false,
    });

    // 2. Commercial / Transactional variations
    const commercialModifiers = ["best", "top rated", "affordable", "premium", "custom", "buy", "online"];
    for (const mod of commercialModifiers) {
      results.push({
        keyword: `${mod} ${clean}`,
        searchVolume: null,
        difficulty: null,
        cpc: null,
        searchIntent: "commercial",
        category: "commercial",
        isAvailable: false,
      });
    }

    // 3. Informational / Question variations
    const questions = [
      `how to choose ${clean}`,
      `what is the best ${clean}`,
      `guide to ${clean}`,
      `${clean} vs alternatives`,
      `why use ${clean}`,
    ];
    for (const q of questions) {
      results.push({
        keyword: q,
        searchVolume: null,
        difficulty: null,
        cpc: null,
        searchIntent: "informational",
        category: "question",
        isAvailable: false,
      });
    }

    // 4. Long-tail variations
    const longTails = [
      `${clean} for beginners`,
      `${clean} reviews and ratings`,
      `${clean} under budget`,
      `${clean} with fast shipping`,
    ];
    for (const lt of longTails) {
      results.push({
        keyword: lt,
        searchVolume: null,
        difficulty: null,
        cpc: null,
        searchIntent: "commercial",
        category: "long_tail",
        isAvailable: false,
      });
    }

    return results;
  }
}

export interface CannibalizationIssue {
  keyword: string;
  competingPages: Array<{
    title: string;
    resourceGid: string;
    resourceType: string;
    handle: string;
  }>;
  severity: "high" | "medium";
  recommendation: string;
}

/**
 * Detect Keyword Cannibalization across Store Products and Collections
 */
export async function detectKeywordCannibalization(shopDomain: string): Promise<CannibalizationIssue[]> {
  const [products, collections] = await Promise.all([
    prisma.productRecord.findMany({ where: { shopDomain }, select: { shopifyGid: true, title: true, handle: true, seoTitle: true } }),
    prisma.collectionRecord.findMany({ where: { shopDomain }, select: { shopifyGid: true, title: true, handle: true, seoTitle: true } }),
  ]);

  const keywordMap = new Map<string, Array<{ title: string; resourceGid: string; resourceType: string; handle: string }>>();

  // Extract core 2-3 word key phrases from titles
  const extractPhrases = (text: string) => {
    const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
    const phrases: string[] = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      phrases.push(`${tokens[i]} ${tokens[i + 1]}`);
    }
    return phrases;
  };

  for (const p of products) {
    const phrases = extractPhrases(p.seoTitle || p.title);
    for (const ph of phrases) {
      const list = keywordMap.get(ph) || [];
      list.push({ title: p.title, resourceGid: p.shopifyGid, resourceType: "product", handle: p.handle });
      keywordMap.set(ph, list);
    }
  }

  for (const c of collections) {
    const phrases = extractPhrases(c.seoTitle || c.title);
    for (const ph of phrases) {
      const list = keywordMap.get(ph) || [];
      list.push({ title: c.title, resourceGid: c.shopifyGid, resourceType: "collection", handle: c.handle });
      keywordMap.set(ph, list);
    }
  }

  const issues: CannibalizationIssue[] = [];
  for (const [kw, pages] of keywordMap.entries()) {
    if (pages.length >= 3) {
      issues.push({
        keyword: kw,
        competingPages: pages.slice(0, 5),
        severity: pages.length > 4 ? "high" : "medium",
        recommendation: `Multiple pages compete for "${kw}". Designate a primary canonical landing page (e.g. the category collection) and differentiate secondary product titles.`,
      });
    }
  }

  return issues.slice(0, 10);
}
