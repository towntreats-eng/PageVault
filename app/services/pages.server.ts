import prisma from "../db.server";
import { fetchAndParsePage } from "./parser.server";

export interface PageListRow {
  id: string;
  url: string;
  resourceType: string;
  statusCode: number;
  issueCount: number;
  criticalCount: number;
  lastCrawledAt: Date;
}

export async function listCrawledPages(shopDomain: string): Promise<PageListRow[]> {
  const pages = await prisma.pageRecord.findMany({
    where: { shop_domain: shopDomain },
    orderBy: { last_crawled_at: "desc" },
    take: 500,
  });
  if (pages.length === 0) return [];

  const issues = await prisma.issue.findMany({
    where: { shop_domain: shopDomain, resolved_at: null },
    select: { page_record_id: true, severity: true },
  });

  const counts = new Map<string, { total: number; critical: number }>();
  for (const i of issues) {
    const c = counts.get(i.page_record_id) ?? { total: 0, critical: 0 };
    c.total++;
    if (i.severity === "critical") c.critical++;
    counts.set(i.page_record_id, c);
  }

  return pages.map((p) => ({
    id: p.id,
    url: p.url,
    resourceType: p.resource_type,
    statusCode: p.status_code,
    issueCount: counts.get(p.id)?.total ?? 0,
    criticalCount: counts.get(p.id)?.critical ?? 0,
    lastCrawledAt: p.last_crawled_at,
  }));
}

/**
 * Everything we know about one URL, including a fresh read of the live page.
 * The live read is what makes this page evidence rather than a summary.
 */
export async function getPageDetail(shopDomain: string, pageRecordId: string) {
  const page = await prisma.pageRecord.findUnique({ where: { id: pageRecordId } });
  if (!page || page.shop_domain !== shopDomain) return null;

  const [issues, live] = await Promise.all([
    prisma.issue.findMany({ where: { page_record_id: page.id, resolved_at: null } }),
    fetchAndParsePage(page.url),
  ]);

  // Changes we made to this URL, newest first, each with its latest check.
  const changes = await prisma.change.findMany({
    where: { shop_domain: shopDomain },
    orderBy: { applied_at: "desc" },
    take: 200,
  });
  const verifications = await prisma.verification.findMany({
    where: { shop_domain: shopDomain, fetched_url: page.url },
    orderBy: { attempted_at: "desc" },
    take: 50,
  });
  const changeIds = new Set(verifications.map((v) => v.change_id));
  const pageChanges = changes.filter((c) => changeIds.has(c.id));

  return {
    page: {
      id: page.id,
      url: page.url,
      resourceType: page.resource_type,
      statusCode: page.status_code,
      lastCrawledAt: page.last_crawled_at.toISOString(),
    },
    live: {
      reachable: live.isReachable,
      statusCode: live.statusCode,
      title: live.title,
      titleLength: live.titleLength,
      description: live.description,
      descriptionLength: live.descriptionLength,
      canonical: live.canonical,
      h1: live.h1,
      h1Count: live.h1Count,
      imagesTotal: live.imagesTotal,
      imagesMissingAlt: live.imagesMissingAlt,
      imageAlts: live.imageAlts.slice(0, 20),
      jsonLdTypes: live.jsonLdBlocks
        .map((b) => {
          const t = (b as any)?.["@type"];
          return Array.isArray(t) ? t.join("/") : t;
        })
        .filter(Boolean) as string[],
      wordCount: live.wordCount,
    },
    issues: issues.map((i) => ({ id: i.id, code: i.code, severity: i.severity, detail: i.detail })),
    verifications: verifications.map((v) => ({
      id: v.id,
      fetched_url: v.fetched_url,
      result: v.result,
      reason_code: v.reason_code,
      observed_value: v.observed_value,
      attempted_at: v.attempted_at.toISOString(),
    })),
    changes: pageChanges.map((c) => ({
      id: c.id,
      field: c.field,
      before: c.before_value,
      after: c.after_value,
      appliedAt: c.applied_at.toISOString(),
    })),
  };
}
