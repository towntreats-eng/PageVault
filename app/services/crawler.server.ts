import prisma from "../db.server";

export interface CrawlSummary {
  shopDomain: string;
  totalPages: number;
  productsCount: number;
  collectionsCount: number;
  pagesCount: number;
  articlesCount: number;
  homeCount: number;
  crawledAt: Date;
}

export function detectResourceType(url: string): "product" | "collection" | "page" | "article" | "home" {
  const path = new URL(url).pathname;
  if (path === "/" || path === "") return "home";
  if (path.includes("/products/")) return "product";
  if (path.includes("/collections/")) return "collection";
  if (path.includes("/pages/")) return "page";
  if (path.includes("/blogs/") || path.includes("/articles/")) return "article";
  return "page";
}

export async function runStoreSitemapCrawl(shopDomain: string): Promise<CrawlSummary> {
  const baseUrl = shopDomain.startsWith("http") ? shopDomain : `https://${shopDomain}`;
  const sitemapUrl = `${baseUrl}/sitemap.xml`;

  const foundUrls: { url: string; resourceType: "product" | "collection" | "page" | "article" | "home" }[] = [
    { url: `${baseUrl}/`, resourceType: "home" },
  ];

  try {
    const res = await fetch(sitemapUrl, {
      headers: { "User-Agent": "ProofSEO-Crawler/1.0 (+https://proofseo.app)" },
    });

    if (res.ok) {
      const xmlText = await res.text();
      // Extract sub-sitemap URLs or loc tags from sitemap.xml
      const locMatches = Array.from(xmlText.matchAll(/<loc>(.*?)<\/loc>/g)).map((m) => m[1]);

      for (const loc of locMatches) {
        if (loc.endsWith(".xml")) {
          // Fetch sub-sitemap
          try {
            const subRes = await fetch(loc);
            if (subRes.ok) {
              const subXml = await subRes.text();
              const subLocs = Array.from(subXml.matchAll(/<loc>(.*?)<\/loc>/g)).map((m) => m[1]);
              for (const subUrl of subLocs) {
                if (!subUrl.endsWith(".xml")) {
                  foundUrls.push({
                    url: subUrl,
                    resourceType: detectResourceType(subUrl),
                  });
                }
              }
            }
          } catch (subErr) {
            console.warn(`[Crawler] Sub-sitemap fetch error for ${loc}:`, subErr);
          }
        } else {
          foundUrls.push({
            url: loc,
            resourceType: detectResourceType(loc),
          });
        }
      }
    }
  } catch (err) {
    console.warn(`[Crawler] Main sitemap fetch fallback for ${shopDomain}:`, err);
  }

  // Deduplicate URLs
  const uniqueMap = new Map<string, "product" | "collection" | "page" | "article" | "home">();
  for (const item of foundUrls) {
    uniqueMap.set(item.url, item.resourceType);
  }

  let productsCount = 0;
  let collectionsCount = 0;
  let pagesCount = 0;
  let articlesCount = 0;
  let homeCount = 0;

  for (const [url, resourceType] of uniqueMap.entries()) {
    if (resourceType === "product") productsCount++;
    else if (resourceType === "collection") collectionsCount++;
    else if (resourceType === "page") pagesCount++;
    else if (resourceType === "article") articlesCount++;
    else if (resourceType === "home") homeCount++;

    await prisma.pageRecord.upsert({
      where: {
        shop_domain_url: {
          shop_domain: shopDomain,
          url,
        },
      },
      update: {
        resource_type: resourceType,
        last_crawled_at: new Date(),
      },
      create: {
        shop_domain: shopDomain,
        url,
        resource_type: resourceType,
        status_code: 200,
      },
    });
  }

  return {
    shopDomain,
    totalPages: uniqueMap.size,
    productsCount,
    collectionsCount,
    pagesCount,
    articlesCount,
    homeCount,
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
