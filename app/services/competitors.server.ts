/**
 * Competitor SEO Analyzer & Keyword Gap Engine
 */

import prisma from "../db.server";

export interface CompetitorGapItem {
  keyword: string;
  competitorDomain: string;
  searchIntent: "commercial" | "informational" | "transactional";
  recommendedAction: "create_collection" | "write_blog" | "enrich_product";
  suggestedTitle: string;
}

export async function addCompetitor(shopDomain: string, domain: string, notes?: string) {
  const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Generate sample seed niche keywords based on the domain name
  const domainParts = cleanDomain.split(".")[0].split("-").filter(Boolean);
  const sampleKeywords = domainParts.map((p) => `${p} online`).concat([`${cleanDomain.split(".")[0]} collection`]);

  return await prisma.competitorTarget.upsert({
    where: { shopDomain_domain: { shopDomain, domain: cleanDomain } },
    create: {
      shopDomain,
      domain: cleanDomain,
      notes: notes || "",
      trackedKeywordsJson: JSON.stringify(sampleKeywords),
    },
    update: {
      notes: notes || "",
    },
  });
}

export async function analyzeCompetitorGaps(shopDomain: string): Promise<CompetitorGapItem[]> {
  const competitors = await prisma.competitorTarget.findMany({ where: { shopDomain } });
  const products = await prisma.productRecord.findMany({ where: { shopDomain }, select: { title: true, tags: true } });

  const storeText = products.map((p) => `${p.title} ${p.tags || ""}`.toLowerCase()).join(" ");

  const gaps: CompetitorGapItem[] = [];

  for (const comp of competitors) {
    let compKeywords: string[] = [];
    if (comp.trackedKeywordsJson) {
      try {
        compKeywords = JSON.parse(comp.trackedKeywordsJson);
      } catch {
        compKeywords = [];
      }
    }

    for (const kw of compKeywords) {
      // If store does not mention this keyword anywhere
      if (!storeText.includes(kw.toLowerCase())) {
        const isInfo = kw.startsWith("how") || kw.startsWith("guide") || kw.includes("tips");
        gaps.push({
          keyword: kw,
          competitorDomain: comp.domain,
          searchIntent: isInfo ? "informational" : "commercial",
          recommendedAction: isInfo ? "write_blog" : "create_collection",
          suggestedTitle: isInfo
            ? `The Ultimate Guide to ${kw}`
            : `Shop Premium ${kw.charAt(0).toUpperCase() + kw.slice(1)} Collection`,
        });
      }
    }
  }

  return gaps;
}
