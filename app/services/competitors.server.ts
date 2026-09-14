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
  // Sanitize domain: strip protocol, www, paths, queries
  let cleanDomain = domain.trim().toLowerCase();
  cleanDomain = cleanDomain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split("?")[0];

  if (!cleanDomain || cleanDomain.length < 3) {
    throw new Error("Invalid competitor domain entered.");
  }

  // Extract brand name from domain
  const rawBrand = cleanDomain.split(".")[0];
  const brandTitle = rawBrand.charAt(0).toUpperCase() + rawBrand.slice(1);

  // Check store products to understand niche context
  const products = await prisma.productRecord.findMany({
    where: { shopDomain },
    select: { title: true, productType: true },
    take: 20,
  });

  const catalogContext = products.map((p) => `${p.title} ${p.productType || ""}`).join(" ").toLowerCase();
  const isJewellery = /jewel|ring|diamond|gold|necklace|earring|pendant|silver|carat/i.test(`${cleanDomain} ${catalogContext}`);
  const isBeauty = /skin|serum|oil|cream|beauty|lotion|scrub|cosmetic|fragrance|glow/i.test(`${cleanDomain} ${catalogContext}`);
  const isFashion = /wear|apparel|dress|shirt|clothing|jacket|shoe|denim|leather/i.test(`${cleanDomain} ${catalogContext}`);

  let nicheKeywords: string[] = [];
  if (isJewellery) {
    nicheKeywords = [
      "diamond engagement rings",
      "everyday gold pendants",
      "18k gold drop earrings",
      "solitaire diamond necklace",
      "certified hallmarked gold jewellery",
      "minimalist daily wear bracelets",
    ];
  } else if (isBeauty) {
    nicheKeywords = [
      "botanical nourishing body oil",
      "hydrating barrier repair cream",
      "brightening vitamin c serum",
      "gentle antioxidant facial cleanser",
      "organic floral face mist",
      "exfoliating sugar body polish",
    ];
  } else if (isFashion) {
    nicheKeywords = [
      "organic cotton essential tees",
      "tailored modern linen trousers",
      "breathable everyday lightweight jackets",
      "premium minimalist leather footwear",
      "sustainable casual streetwear",
    ];
  } else {
    nicheKeywords = [
      `${brandTitle} top rated alternatives`,
      `best ${brandTitle} style collections`,
      "handcrafted premium home accents",
      "sustainable lifestyle accessories",
      "artisan crafted luxury essentials",
    ];
  }

  return await prisma.competitorTarget.upsert({
    where: { shopDomain_domain: { shopDomain, domain: cleanDomain } },
    create: {
      shopDomain,
      domain: cleanDomain,
      notes: notes || "",
      trackedKeywordsJson: JSON.stringify(nicheKeywords),
    },
    update: {
      notes: notes || "",
      trackedKeywordsJson: JSON.stringify(nicheKeywords),
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
