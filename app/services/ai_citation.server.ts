import prisma from "../db.server";
import { executeShopifyGraphQL } from "./graphql.server";
import { isOverBudget, trackDataSpend } from "./keyword_engine.server";

/**
 * AI citation tracking.
 *
 * Asks real AI answer engines a real buying question and records whether this
 * store was mentioned. Every row in the report comes from a call we actually
 * made; if no provider key is configured, the report says so and shows nothing.
 *
 * The previous implementation returned a hardcoded array — "best luxury silk
 * evening dresses", "handcrafted men's leather oxford shoes", named competitors
 * and a 58/100 score — identically for every store, without ever calling an API.
 */

export type AiEngine = "chatgpt" | "claude" | "perplexity";

interface ProviderConfig {
  engine: AiEngine;
  envKey: string;
  url: string;
  model: string;
  /** Rough cost of one short answer, for the budget meter. */
  costUsd: number;
}

const PROVIDERS: ProviderConfig[] = [
  { engine: "chatgpt", envKey: "OPENAI_API_KEY", url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini", costUsd: 0.002 },
  { engine: "claude", envKey: "ANTHROPIC_API_KEY", url: "https://api.anthropic.com/v1/messages", model: "claude-3-5-haiku-latest", costUsd: 0.002 },
  { engine: "perplexity", envKey: "PERPLEXITY_API_KEY", url: "https://api.perplexity.ai/chat/completions", model: "sonar", costUsd: 0.005 },
];

export function configuredEngines(): AiEngine[] {
  return PROVIDERS.filter((p) => Boolean(process.env[p.envKey])).map((p) => p.engine);
}

async function askProvider(p: ProviderConfig, question: string): Promise<string | null> {
  const key = process.env[p.envKey];
  if (!key) return null;

  try {
    if (p.engine === "claude") {
      const res = await fetch(p.url, {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: p.model,
          max_tokens: 600,
          messages: [{ role: "user", content: question }],
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) return null;
      const body: any = await res.json();
      return (body.content ?? []).map((c: any) => c.text ?? "").join(" ");
    }

    const res = await fetch(p.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: p.model,
        max_tokens: 600,
        messages: [{ role: "user", content: question }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return null;
    const body: any = await res.json();
    return body.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.warn(`[ai_citation] ${p.engine} call failed:`, (err as Error).message);
    return null;
  }
}

/** Buying questions built from the store's own product types and vendors. */
export async function buildStoreQueries(admin: any, limit = 5): Promise<string[]> {
  const res: any = await executeShopifyGraphQL(
    admin,
    `query storeShape {
      shop { name }
      products(first: 50) {
        edges { node { productType vendor title } }
      }
    }`
  );

  const types = new Map<string, number>();
  for (const e of res?.data?.products?.edges ?? []) {
    const t = (e.node.productType || "").trim();
    if (t) types.set(t, (types.get(t) ?? 0) + 1);
  }

  const ranked = Array.from(types.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (ranked.length === 0) return [];

  return ranked.map(([type]) => `What are the best online stores to buy ${type.toLowerCase()} from right now?`);
}

function mentionsStore(answer: string, shopDomain: string, shopName: string) {
  const hay = answer.toLowerCase();
  const domainRoot = shopDomain.replace(".myshopify.com", "").replace(/\..*$/, "").toLowerCase();
  return hay.includes(shopDomain.toLowerCase()) || hay.includes(domainRoot) || (shopName.length > 3 && hay.includes(shopName.toLowerCase()));
}

export interface CitationRunResult {
  ran: boolean;
  reason?: string;
  queriesAsked: number;
  callsMade: number;
  citations: number;
}

export async function runCitationScan(admin: any, shopDomain: string): Promise<CitationRunResult> {
  const engines = PROVIDERS.filter((p) => Boolean(process.env[p.envKey]));
  if (engines.length === 0) {
    return { ran: false, reason: "No AI provider key is configured on the server.", queriesAsked: 0, callsMade: 0, citations: 0 };
  }
  if (await isOverBudget(shopDomain)) {
    return { ran: false, reason: "This shop has reached its monthly AI budget cap.", queriesAsked: 0, callsMade: 0, citations: 0 };
  }

  const queries = await buildStoreQueries(admin);
  if (queries.length === 0) {
    return { ran: false, reason: "Your products have no product type set, so we cannot build a buying question yet.", queriesAsked: 0, callsMade: 0, citations: 0 };
  }

  const shopRes: any = await executeShopifyGraphQL(admin, `query { shop { name } }`);
  const shopName = shopRes?.data?.shop?.name ?? shopDomain.replace(".myshopify.com", "");

  let callsMade = 0;
  let citations = 0;

  for (const query of queries) {
    for (const provider of engines) {
      if (await isOverBudget(shopDomain)) break;

      const answer = await askProvider(provider, query);
      callsMade++;
      await trackDataSpend(shopDomain, 0, provider.costUsd);
      if (answer === null) continue;

      const cited = mentionsStore(answer, shopDomain, shopName);
      if (cited) citations++;

      await prisma.aiCitation.create({
        data: {
          shop_domain: shopDomain,
          query,
          ai_engine: provider.engine,
          cited,
          competitor_domains_json: JSON.stringify(extractDomains(answer).slice(0, 10)),
        },
      });
    }
  }

  return { ran: true, queriesAsked: queries.length, callsMade, citations };
}

function extractDomains(text: string): string[] {
  const matches = text.match(/\b[a-z0-9-]+\.(com|co|io|shop|store|net|org)\b/gi) ?? [];
  return Array.from(new Set(matches.map((m) => m.toLowerCase())));
}

export interface AiVisibilityReport {
  configuredEngines: AiEngine[];
  hasData: boolean;
  lastCheckedAt: string | null;
  totalChecks: number;
  citedCount: number;
  /** null when we have never run a check. Never rendered as 0. */
  citationRate: number | null;
  byEngine: { engine: string; checks: number; cited: number }[];
  recentQueries: { query: string; engine: string; cited: boolean; competitors: string[]; checkedAt: string }[];
}

export async function getAiVisibilityReport(shopDomain: string): Promise<AiVisibilityReport> {
  const rows = await prisma.aiCitation.findMany({
    where: { shop_domain: shopDomain },
    orderBy: { checked_at: "desc" },
    take: 200,
  });

  const byEngine = new Map<string, { checks: number; cited: number }>();
  for (const r of rows) {
    const e = byEngine.get(r.ai_engine) ?? { checks: 0, cited: 0 };
    e.checks++;
    if (r.cited) e.cited++;
    byEngine.set(r.ai_engine, e);
  }

  const citedCount = rows.filter((r) => r.cited).length;

  return {
    configuredEngines: configuredEngines(),
    hasData: rows.length > 0,
    lastCheckedAt: rows[0]?.checked_at.toISOString() ?? null,
    totalChecks: rows.length,
    citedCount,
    citationRate: rows.length === 0 ? null : Math.round((citedCount / rows.length) * 100),
    byEngine: Array.from(byEngine.entries()).map(([engine, v]) => ({ engine, ...v })),
    recentQueries: rows.slice(0, 25).map((r) => ({
      query: r.query,
      engine: r.ai_engine,
      cited: r.cited,
      competitors: r.competitor_domains_json ? (JSON.parse(r.competitor_domains_json) as string[]) : [],
      checkedAt: r.checked_at.toISOString(),
    })),
  };
}
