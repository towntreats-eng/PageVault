import prisma from "../db.server";

/**
 * Google Search Console.
 *
 * Everything here comes from the merchant's own Search Console property.
 * The previous implementation returned invented rows ("silk evening dress",
 * "leather oxford shoes") for every store and never called Google at all.
 * If the property is not connected, these functions say so — they do not
 * fill the screen with examples.
 */

export interface GscRow {
  query: string;
  pageUrl: string;
  clicks: number;
  impressions: number;
  ctr: number; // percentage, 0-100
  position: number;
}

export interface GscResult<T> {
  connected: boolean;
  available: boolean;
  error?: string;
  rows: T[];
  /** Range the numbers cover, so the UI never shows a figure without its window. */
  range?: { startDate: string; endDate: string };
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GSC_API = "https://searchconsole.googleapis.com/webmasters/v3";

export async function getGscConnectionStatus(shopDomain: string) {
  const conn = await prisma.gscConnection.findUnique({ where: { shop_domain: shopDomain } });
  return {
    isConnected: Boolean(conn),
    siteUrl: conn?.site_url ?? null,
    connectedAt: conn?.connected_at ?? null,
    oauthConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  };
}

export async function saveGscConnection(shopDomain: string, refreshToken: string, siteUrl: string) {
  return prisma.gscConnection.upsert({
    where: { shop_domain: shopDomain },
    update: { refresh_token: refreshToken, site_url: siteUrl },
    create: { shop_domain: shopDomain, refresh_token: refreshToken, site_url: siteUrl },
  });
}

async function getAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set on the server.");
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Google refused the refresh token (HTTP ${res.status}). Reconnect Search Console.`);
  }
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("Google returned no access token.");
  return body.access_token;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

/** Raw Search Console query. Every other function in this file builds on it. */
export async function fetchSearchAnalytics(
  shopDomain: string,
  opts: { days?: number; dimensions?: string[]; rowLimit?: number } = {}
): Promise<GscResult<GscRow>> {
  const conn = await prisma.gscConnection.findUnique({ where: { shop_domain: shopDomain } });
  if (!conn) {
    return { connected: false, available: false, rows: [] };
  }

  // GSC data lags ~2 days; asking for today returns an empty set and looks like a bug.
  const endDate = daysAgo(2);
  const startDate = daysAgo((opts.days ?? 28) + 2);

  try {
    const accessToken = await getAccessToken(conn.refresh_token);
    const res = await fetch(
      `${GSC_API}/sites/${encodeURIComponent(conn.site_url)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: opts.dimensions ?? ["query", "page"],
          rowLimit: opts.rowLimit ?? 500,
          dataState: "final",
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return {
        connected: true,
        available: false,
        error: `Search Console returned HTTP ${res.status}. ${text.slice(0, 200)}`,
        rows: [],
      };
    }

    const body = (await res.json()) as { rows?: any[] };
    const rows: GscRow[] = (body.rows ?? []).map((r) => {
      const keys: string[] = r.keys ?? [];
      const dims = opts.dimensions ?? ["query", "page"];
      return {
        query: keys[dims.indexOf("query")] ?? "",
        pageUrl: keys[dims.indexOf("page")] ?? "",
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: Math.round((r.ctr ?? 0) * 1000) / 10,
        position: Math.round((r.position ?? 0) * 10) / 10,
      };
    });

    return { connected: true, available: true, rows, range: { startDate, endDate } };
  } catch (err) {
    return { connected: true, available: false, error: (err as Error).message, rows: [] };
  }
}

export interface CtrOpportunity extends GscRow {
  /** Median CTR seen at this position, for context. Not a promise. */
  typicalCtrAtPosition: number;
  gap: number;
}

/** Position-1..10 CTR reference. Public aggregate benchmarks, used only for comparison. */
const TYPICAL_CTR: Record<number, number> = {
  1: 27.6, 2: 15.8, 3: 11.0, 4: 8.4, 5: 6.3, 6: 4.9, 7: 3.9, 8: 3.3, 9: 2.7, 10: 2.4,
};

function typicalCtr(position: number) {
  const p = Math.max(1, Math.min(10, Math.round(position)));
  return TYPICAL_CTR[p] ?? 1.5;
}

/** Pages that are already ranking but are not being clicked. */
export async function getCtrOpportunities(shopDomain: string): Promise<GscResult<CtrOpportunity>> {
  const base = await fetchSearchAnalytics(shopDomain, { days: 28 });
  if (!base.available) return { ...base, rows: [] };

  const rows = base.rows
    .filter((r) => r.impressions >= 100 && r.position <= 20)
    .map((r) => {
      const expected = typicalCtr(r.position);
      return { ...r, typicalCtrAtPosition: expected, gap: Math.round((expected - r.ctr) * 10) / 10 };
    })
    .filter((r) => r.gap > 1)
    .sort((a, b) => b.impressions * b.gap - a.impressions * a.gap)
    .slice(0, 50);

  return { ...base, rows };
}

export interface CannibalisationIssue {
  query: string;
  urls: { pageUrl: string; impressions: number; position: number }[];
}

/** One query, several of your own pages competing for it. */
export async function getCannibalisationIssues(shopDomain: string): Promise<GscResult<CannibalisationIssue>> {
  const base = await fetchSearchAnalytics(shopDomain, { days: 28, rowLimit: 1000 });
  if (!base.available) return { ...base, rows: [] };

  const byQuery = new Map<string, GscRow[]>();
  for (const r of base.rows) {
    if (!r.query || !r.pageUrl) continue;
    const list = byQuery.get(r.query) ?? [];
    list.push(r);
    byQuery.set(r.query, list);
  }

  const rows: CannibalisationIssue[] = [];
  for (const [query, list] of byQuery) {
    const ranking = list.filter((r) => r.impressions >= 20 && r.position <= 30);
    if (ranking.length > 1) {
      rows.push({
        query,
        urls: ranking
          .sort((a, b) => a.position - b.position)
          .map((r) => ({ pageUrl: r.pageUrl, impressions: r.impressions, position: r.position })),
      });
    }
  }

  rows.sort((a, b) => b.urls.length - a.urls.length);
  return { ...base, rows: rows.slice(0, 50) };
}

export interface ContentGap {
  query: string;
  impressions: number;
  position: number;
  bestExistingUrl: string;
}

/** Queries you are seen for but rank badly on — the pages you have not written yet. */
export async function getContentGaps(shopDomain: string): Promise<GscResult<ContentGap>> {
  const base = await fetchSearchAnalytics(shopDomain, { days: 28, rowLimit: 1000 });
  if (!base.available) return { ...base, rows: [] };

  const rows = base.rows
    .filter((r) => r.impressions >= 50 && r.position > 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 50)
    .map((r) => ({
      query: r.query,
      impressions: r.impressions,
      position: r.position,
      bestExistingUrl: r.pageUrl,
    }));

  return { ...base, rows };
}

/**
 * Internal linking suggestions from real query overlap: pages that already rank
 * for the same query, where the weaker page could link to the stronger one.
 */
export async function getInternalLinkingSuggestions(shopDomain: string) {
  const cannibal = await getCannibalisationIssues(shopDomain);
  if (!cannibal.available) return cannibal;

  const rows = cannibal.rows.slice(0, 25).map((issue) => {
    const [target, ...others] = issue.urls;
    return {
      query: issue.query,
      targetUrl: target.pageUrl,
      linkFrom: others.map((o) => o.pageUrl),
      reason: `Both pages rank for "${issue.query}". Linking the weaker pages to the stronger one consolidates the signal.`,
    };
  });

  return { ...cannibal, rows };
}
