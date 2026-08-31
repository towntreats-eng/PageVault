import prisma from "../db.server";
import { fetchSearchAnalytics } from "./gsc.server";

/**
 * Keyword engine.
 *
 * v1 gets its numbers from the merchant's own Search Console data — real
 * impressions and real average positions for the queries their store is already
 * seen for. Third-party search volume and difficulty need a paid provider
 * (DataForSEO / Semrush); until a key is configured those fields stay 0 and the
 * UI must show them as unknown, not as a number.
 *
 * The previous implementation hardcoded volume 1800 / difficulty 28 for every
 * keyword, invented rank movements (18 -> 12 -> 4), returned two fictional
 * keywords for every store, displayed a UUID as the keyword term, wrote fake
 * RankSnapshot rows with position 14 and invented competitor domains, and
 * charged the shop's budget for SERP API calls that were never made.
 */

export interface KeywordResult {
  id: string;
  term: string;
  market: string;
  language: string;
  /** 0 = unknown. A provider is needed for real volume; do not render 0 as "no searches". */
  volume: number;
  cpc: number;
  difficulty: number;
  intent: "transactional" | "informational" | "navigational";
  winnability: "winnable_now" | "winnable_6m" | "aspirational" | "unknown";
  source: string;
}

/** Per-shop monthly spend cap. See 03-ARCHITECTURE.md §9. */
export async function trackDataSpend(shopDomain: string, dataCostUsd: number, llmCostUsd = 0) {
  const currentMonth = new Date().toISOString().substring(0, 7);

  const budget = await prisma.aiBudget.upsert({
    where: { shop_domain: shopDomain },
    update: {
      dataforseo_spend_usd: { increment: dataCostUsd },
      llm_spend_usd: { increment: llmCostUsd },
    },
    create: {
      shop_domain: shopDomain,
      month: currentMonth,
      dataforseo_spend_usd: dataCostUsd,
      llm_spend_usd: llmCostUsd,
      budget_cap_usd: 15.0,
    },
  });

  const totalSpend = budget.dataforseo_spend_usd + budget.llm_spend_usd;
  return { capped: totalSpend > budget.budget_cap_usd, totalSpend, cap: budget.budget_cap_usd };
}

export async function isOverBudget(shopDomain: string) {
  const budget = await prisma.aiBudget.findUnique({ where: { shop_domain: shopDomain } });
  if (!budget) return false;
  return budget.dataforseo_spend_usd + budget.llm_spend_usd >= budget.budget_cap_usd;
}

export function calculateWinnability(
  difficulty: number,
  storeAuthority = 35
): "winnable_now" | "winnable_6m" | "aspirational" | "unknown" {
  if (!difficulty) return "unknown";
  if (difficulty <= storeAuthority + 10) return "winnable_now";
  if (difficulty <= storeAuthority + 25) return "winnable_6m";
  return "aspirational";
}

/**
 * Assigns one primary keyword to one URL per market.
 * No metrics are invented here. Volume and difficulty stay 0 until a data
 * provider fills them; position comes from Search Console via refreshRanksFromGsc().
 */
export async function assignPrimaryKeyword(
  shopDomain: string,
  resourceGid: string,
  url: string,
  keywordTerm: string,
  market = "US"
) {
  const term = keywordTerm.trim().toLowerCase();
  if (!term) throw new Error("Keyword cannot be empty.");

  const keyword = await prisma.keyword.upsert({
    where: { term_market: { term, market } },
    update: {},
    create: {
      term,
      market,
      volume: 0,
      cpc: 0,
      difficulty: 0,
      intent: "transactional",
      winnability: "unknown",
      source: "merchant",
    },
  });

  // The unique constraint on [resource_gid, market, role] is what enforces
  // one primary keyword per URL per market.
  return prisma.keywordAssignment.upsert({
    where: { resource_gid_market_role: { resource_gid: resourceGid, market, role: "primary" } },
    update: { keyword_id: keyword.id, url },
    create: { shop_domain: shopDomain, keyword_id: keyword.id, resource_gid: resourceGid, url, market, role: "primary" },
  });
}

/**
 * Pulls real average positions from Search Console and stores them as rank
 * snapshots. This is the only function that may create a RankSnapshot.
 */
export async function refreshRanksFromGsc(shopDomain: string) {
  const gsc = await fetchSearchAnalytics(shopDomain, { days: 7, rowLimit: 1000 });
  if (!gsc.available) {
    return { updated: 0, connected: gsc.connected, error: gsc.error ?? null };
  }

  const assignments = await prisma.keywordAssignment.findMany({ where: { shop_domain: shopDomain } });
  if (assignments.length === 0) return { updated: 0, connected: true, error: null };

  const keywords = await prisma.keyword.findMany({
    where: { id: { in: assignments.map((a) => a.keyword_id) } },
  });
  const termById = new Map(keywords.map((k) => [k.id, k.term]));

  let updated = 0;
  for (const a of assignments) {
    const term = termById.get(a.keyword_id);
    if (!term) continue;

    const match = gsc.rows.find(
      (r) => r.query.toLowerCase() === term && r.pageUrl.replace(/\/$/, "") === a.url.replace(/\/$/, "")
    );
    if (!match) continue;

    await prisma.rankSnapshot.create({
      data: {
        assignment_id: a.id,
        market: a.market,
        device: "desktop",
        position: Math.round(match.position),
        ai_overview_present: false, // unknown from GSC; never guessed
        top10_domains_json: null,
      },
    });
    updated++;
  }

  return { updated, connected: true, error: null };
}

export interface AssignedKeywordRow {
  id: string;
  term: string;
  market: string;
  url: string;
  volume: number;
  difficulty: number;
  winnability: string;
  /** null = we have not measured this yet. Never rendered as a position. */
  latestPosition: number | null;
  previousPosition: number | null;
  measuredAt: string | null;
}

export async function getAssignedKeywordsWithRanks(shopDomain: string): Promise<AssignedKeywordRow[]> {
  const assignments = await prisma.keywordAssignment.findMany({
    where: { shop_domain: shopDomain },
    orderBy: { assigned_at: "desc" },
    take: 100,
  });
  if (assignments.length === 0) return [];

  const [keywords, snapshots] = await Promise.all([
    prisma.keyword.findMany({ where: { id: { in: assignments.map((a) => a.keyword_id) } } }),
    prisma.rankSnapshot.findMany({
      where: { assignment_id: { in: assignments.map((a) => a.id) } },
      orderBy: { checked_at: "desc" },
    }),
  ]);

  const kwById = new Map(keywords.map((k) => [k.id, k]));

  return assignments.map((a) => {
    const kw = kwById.get(a.keyword_id);
    const mine = snapshots.filter((s) => s.assignment_id === a.id);
    return {
      id: a.id,
      term: kw?.term ?? "(keyword missing)",
      market: a.market,
      url: a.url,
      volume: kw?.volume ?? 0,
      difficulty: kw?.difficulty ?? 0,
      winnability: kw?.winnability ?? "unknown",
      latestPosition: mine[0]?.position ?? null,
      previousPosition: mine[1]?.position ?? null,
      measuredAt: mine[0]?.checked_at.toISOString() ?? null,
    };
  });
}

/**
 * Keyword-aware title with a stuffing check.
 * Real logic, kept as it was.
 */
export function generateKeywordAwareTitle(
  productTitle: string,
  keyword: string,
  shopName: string
): { title: string; passedStuffingCheck: boolean } {
  const candidate = `${productTitle} - ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} | ${shopName}`;
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const occurrences = (candidate.toLowerCase().match(new RegExp(escaped, "g")) || []).length;
  return { title: candidate, passedStuffingCheck: occurrences === 1 && candidate.length <= 60 };
}

/**
 * Content brief built from the store's OWN related Search Console queries.
 * Returns available:false when there is no data — it does not invent subtopics.
 */
export async function generateContentBrief(shopDomain: string, keyword: string, market = "US") {
  const gsc = await fetchSearchAnalytics(shopDomain, { days: 90, rowLimit: 1000 });
  if (!gsc.available) {
    return {
      available: false,
      reason: gsc.connected
        ? gsc.error ?? "Search Console did not return data."
        : "Connect Google Search Console to build a brief from queries your store is really seen for.",
      targetKeyword: keyword,
      market,
      relatedQueries: [] as { query: string; impressions: number; position: number }[],
    };
  }

  const term = keyword.toLowerCase();
  const related = gsc.rows
    .filter((r) => r.query.includes(term) && r.query !== term)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 25)
    .map((r) => ({ query: r.query, impressions: r.impressions, position: r.position }));

  return { available: true, targetKeyword: keyword, market, relatedQueries: related, range: gsc.range };
}
