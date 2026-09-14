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

export class GoogleSuggestKeywordProvider implements KeywordProvider {
  name = "GoogleSuggestLiveEngine";

  async expandSeedKeyword(seed: string): Promise<KeywordMetric[]> {
    const clean = seed.trim().toLowerCase();
    const prefixes = [clean, `best ${clean}`, `how to ${clean}`, `${clean} for`, `buy ${clean}`];

    const uniqueKeywords = new Set<string>();
    uniqueKeywords.add(clean);

    try {
      const fetchQueries = prefixes.map(async (query) => {
        const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data[1]) ? (data[1] as string[]) : [];
      });

      const settled = await Promise.allSettled(fetchQueries);
      for (const result of settled) {
        if (result.status === "fulfilled") {
          for (const item of result.value) {
            const cleanItem = item.toLowerCase().trim();
            if (cleanItem.length > 3) uniqueKeywords.add(cleanItem);
          }
        }
      }
    } catch (err) {
      console.warn("[GoogleSuggest] Autocomplete fetch failed, falling back to semantic generation:", err);
    }

    // If Google Suggest returned fewer than 5 (or offline), augment with semantic patterns
    if (uniqueKeywords.size < 5) {
      const suffixes = [
        "review", "guide", "best", "buy online", "vs",
        "for beginners", "tips", "how to use", "alternatives", "near me",
        "price", "discount", "sale", "comparison", "benefits",
      ];
      for (const suffix of suffixes) {
        const candidate = `${clean} ${suffix}`;
        if (candidate.length > 3) uniqueKeywords.add(candidate);
        if (uniqueKeywords.size >= 15) break;
      }
    }

    const results: KeywordMetric[] = [];
    for (const kw of uniqueKeywords) {
      const words = kw.split(/\s+/);
      const isQuestion = /^(how|what|why|guide|tips|routine|benefits|when)/i.test(kw) || kw.includes("how to");
      const isTransactional = /(buy|order|price|cheap|discount|sale|shop|deal|coupon)/i.test(kw);
      const isCommercial = /(best|top|review|vs|comparison|luxury|organic|custom|brand)/i.test(kw);

      const intent: SearchIntent = isQuestion
        ? "informational"
        : isTransactional
        ? "transactional"
        : isCommercial
        ? "commercial"
        : "commercial";

      const category = isQuestion ? "question" : words.length >= 4 ? "long_tail" : "commercial";

      // Relative search difficulty estimation based on query specificity
      const estimatedDifficulty = words.length <= 2 ? 68 : words.length === 3 ? 42 : 24;

      results.push({
        keyword: kw,
        searchVolume: null, // Zero fabricated volume
        difficulty: estimatedDifficulty,
        cpc: null,
        searchIntent: intent,
        category,
        isAvailable: true,
      });
    }

    return results.slice(0, 30);
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
 * Detect Real Keyword Cannibalization across Store Products and Collections.
 * Filters out brand names, vendor names, and generic e-commerce stopwords to eliminate false positives.
 */
export async function detectKeywordCannibalization(shopDomain: string): Promise<CannibalizationIssue[]> {
  const [products, collections, shop] = await Promise.all([
    prisma.productRecord.findMany({ where: { shopDomain }, select: { shopifyGid: true, title: true, handle: true, seoTitle: true, vendor: true } }),
    prisma.collectionRecord.findMany({ where: { shopDomain }, select: { shopifyGid: true, title: true, handle: true, seoTitle: true } }),
    prisma.shop.findUnique({ where: { domain: shopDomain }, select: { name: true, domain: true } }),
  ]);

  // Collect brand words and stopwords to ignore
  const ignoreWords = new Set([
    "with", "from", "your", "best", "shop", "item", "items", "store", "official",
    "free", "shipping", "online", "quality", "brand", "company", "edition", "collection",
    "pack", "size", "mini", "full", "daily", "pure", "care",
  ]);

  if (shop?.name) {
    shop.name.toLowerCase().split(/\s+/).forEach((w) => ignoreWords.add(w.replace(/[^a-z0-9]/g, "")));
  }
  for (const p of products) {
    if (p.vendor) {
      p.vendor.toLowerCase().split(/\s+/).forEach((w) => ignoreWords.add(w.replace(/[^a-z0-9]/g, "")));
    }
  }

  const keywordMap = new Map<string, Array<{ title: string; resourceGid: string; resourceType: string; handle: string }>>();

  // Extract non-brand specific 2-word key phrases
  const extractSpecificPhrases = (text: string) => {
    // Strip trailing vendor e.g. " | Luma Beauty Co."
    const cleanText = text.split("|")[0].split("–")[0].split("-")[0];
    const tokens = cleanText.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !ignoreWords.has(w));
    const phrases: string[] = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      phrases.push(`${tokens[i]} ${tokens[i + 1]}`);
    }
    return phrases;
  };

  for (const p of products) {
    const phrases = extractSpecificPhrases(p.title);
    for (const ph of phrases) {
      const list = keywordMap.get(ph) || [];
      if (!list.some((item) => item.resourceGid === p.shopifyGid)) {
        list.push({ title: p.title, resourceGid: p.shopifyGid, resourceType: "product", handle: p.handle });
        keywordMap.set(ph, list);
      }
    }
  }

  for (const c of collections) {
    const phrases = extractSpecificPhrases(c.title);
    for (const ph of phrases) {
      const list = keywordMap.get(ph) || [];
      if (!list.some((item) => item.resourceGid === c.shopifyGid)) {
        list.push({ title: c.title, resourceGid: c.shopifyGid, resourceType: "collection", handle: c.handle });
        keywordMap.set(ph, list);
      }
    }
  }

  const issues: CannibalizationIssue[] = [];
  for (const [kw, pages] of keywordMap.entries()) {
    // Only flag if 3 or more distinct products/collections compete for the exact same specific non-brand phrase
    if (pages.length >= 3) {
      issues.push({
        keyword: kw,
        competingPages: pages.slice(0, 5),
        severity: pages.length >= 4 ? "high" : "medium",
        recommendation: `Multiple distinct pages compete for the specific term "${kw}". Differentiate sub-product titles or designate a primary collection landing page to preserve topical authority.`,
      });
    }
  }

  return issues.slice(0, 8);
}
