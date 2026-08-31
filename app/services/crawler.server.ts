import prisma from "../db.server";
import { fetchAndParsePage } from "./parser.server";
import { auditAndRecordPageIssues } from "./issues.server";
import { enqueue, registerHandler } from "./queue.server";

export interface CrawlSummary {
  shopDomain: string;
  totalPages: number;
  productsCount: number;
  collectionsCount: number;
  pagesCount: number;
  articlesCount: number;
  homeCount: number;
  /** Pages we actually fetched and parsed in this pass. */
  pagesFetched: number;
  /** Pages that did not return 2xx/3xx. */
  pagesUnreachable: number;
  issuesFound: number;
  /** URLs discovered but not fetched in this pass. */
  pagesDeferred: number;
  /** True only if the deferred pages were really handed to a queue. */
  deferredScheduled: boolean;
  crawledAt: Date;
}

const FETCH_CONCURRENCY = 5;
const POLITE_DELAY_MS = 200;
/** Fetched inline so the merchant sees a result immediately; the rest is queued. */
const INLINE_PAGE_BUDGET = 40;

export function detectResourceType(url: string): "product" | "collection" | "page" | "article" | "home" {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return "page";
  }
  if (path === "/" || path === "") return "home";
  if (path.includes("/products/")) return "product";
  if (path.includes("/collections/")) return "collection";
  if (path.includes("/blogs/") || path.includes("/articles/")) return "article";
  if (path.includes("/pages/")) return "page";
  return "page";
}

async function fetchXml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ProofSEO-Crawler/1.0 (+https://proofseo.app)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    console.warn(`[crawler] sitemap fetch failed for ${url}:`, (err as Error).message);
    return null;
  }
}

/** Reads sitemap.xml and every sub-sitemap. Returns discovered URLs only — nothing is fetched here. */
export async function discoverStoreUrls(shopDomain: string): Promise<string[]> {
  const baseUrl = shopDomain.startsWith("http") ? shopDomain : `https://${shopDomain}`;
  const found = new Set<string>([`${baseUrl}/`]);

  const rootXml = await fetchXml(`${baseUrl}/sitemap.xml`);
  if (!rootXml) return Array.from(found);

  const rootLocs = Array.from(rootXml.matchAll(/<loc>(.*?)<\/loc>/g)).map((m) => m[1].trim());
  const subSitemaps = rootLocs.filter((l) => l.endsWith(".xml"));
  rootLocs.filter((l) => !l.endsWith(".xml")).forEach((l) => found.add(l));

  for (const sub of subSitemaps) {
    const subXml = await fetchXml(sub);
    if (!subXml) continue;
    Array.from(subXml.matchAll(/<loc>(.*?)<\/loc>/g))
      .map((m) => m[1].trim())
      .filter((l) => !l.endsWith(".xml"))
      .forEach((l) => found.add(l));
  }

  return Array.from(found);
}

/**
 * Fetches each URL, records its REAL status code, parses the rendered HTML and
 * writes Issue rows from the rule engine. Nothing here is assumed — a page we
 * could not fetch is stored with the status we actually got, never 200.
 */
async function crawlUrlBatch(shopDomain: string, urls: string[]) {
  let pagesFetched = 0;
  let pagesUnreachable = 0;
  let issuesFound = 0;

  for (let i = 0; i < urls.length; i += FETCH_CONCURRENCY) {
    const batch = urls.slice(i, i + FETCH_CONCURRENCY);

    const parsedBatch = await Promise.all(
      batch.map(async (url) => ({ url, parsed: await fetchAndParsePage(url) }))
    );

    for (const { url, parsed } of parsedBatch) {
      const resourceType = detectResourceType(url);
      pagesFetched++;
      if (!parsed.isReachable) pagesUnreachable++;

      const record = await prisma.pageRecord.upsert({
        where: { shop_domain_url: { shop_domain: shopDomain, url } },
        update: {
          resource_type: resourceType,
          status_code: parsed.statusCode,
          last_crawled_at: new Date(),
        },
        create: {
          shop_domain: shopDomain,
          url,
          resource_type: resourceType,
          status_code: parsed.statusCode,
        },
      });

      if (parsed.isReachable) {
        const issues = await auditAndRecordPageIssues(shopDomain, record.id, parsed);
        issuesFound += issues.length;
      }
    }

    if (i + FETCH_CONCURRENCY < urls.length) {
      await new Promise((r) => setTimeout(r, POLITE_DELAY_MS));
    }
  }

  return { pagesFetched, pagesUnreachable, issuesFound };
}

// Background continuation of a crawl. Registered here so the queue module stays dependency-free.
registerHandler("crawl", async (data: { shopDomain: string; urls: string[] }) => {
  return crawlUrlBatch(data.shopDomain, data.urls);
});

export async function runStoreSitemapCrawl(shopDomain: string): Promise<CrawlSummary> {
  const urls = await discoverStoreUrls(shopDomain);

  const counts = { product: 0, collection: 0, page: 0, article: 0, home: 0 };
  for (const url of urls) counts[detectResourceType(url)]++;

  const inlineUrls = urls.slice(0, INLINE_PAGE_BUDGET);
  const deferredUrls = urls.slice(INLINE_PAGE_BUDGET);

  const { pagesFetched, pagesUnreachable, issuesFound } = await crawlUrlBatch(shopDomain, inlineUrls);

  let deferredScheduled = false;
  if (deferredUrls.length > 0) {
    // Chunked so one failed job cannot lose the whole remainder.
    const chunks: string[][] = [];
    for (let i = 0; i < deferredUrls.length; i += 40) chunks.push(deferredUrls.slice(i, i + 40));

    const results = await Promise.all(
      chunks.map((chunk, idx) =>
        enqueue("crawl", { shopDomain, urls: chunk }, { delayMs: idx * 5_000 })
      )
    );
    deferredScheduled = results.every((r) => r.scheduled);
  }

  return {
    shopDomain,
    totalPages: urls.length,
    productsCount: counts.product,
    collectionsCount: counts.collection,
    pagesCount: counts.page,
    articlesCount: counts.article,
    homeCount: counts.home,
    pagesFetched,
    pagesUnreachable,
    issuesFound,
    pagesDeferred: deferredUrls.length,
    deferredScheduled,
    crawledAt: new Date(),
  };
}

export async function getPageRecords(shopDomain: string) {
  return await prisma.pageRecord.findMany({
    where: { shop_domain: shopDomain },
    orderBy: { created_at: "desc" },
    take: 100,
  });
}
