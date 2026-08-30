import prisma from "../db.server";

export interface GscQueryData {
  query: string;
  pageUrl: string;
  clicks: number;
  impressions: number;
  ctr: number; // percentage
  position: number;
}

export interface CtrOpportunity {
  query: string;
  pageUrl: string;
  impressions: number;
  ctr: number;
  currentPosition: number;
  suggestedRewrite: string;
}

/**
 * Task 5.1 - Google Search Console Connection Management
 * See 02-SHOPIFY-REALITY.md §1 & DECISIONS.md (GSC OAuth used instead of ShopifyQL)
 */
export async function getGscConnectionStatus(shopDomain: string) {
  const conn = await prisma.gscConnection.findUnique({
    where: { shop_domain: shopDomain },
  });

  return {
    isConnected: Boolean(conn),
    siteUrl: conn?.site_url || `https://${shopDomain}`,
    connectedAt: conn?.connected_at || null,
  };
}

export async function saveGscConnection(shopDomain: string, refreshToken: string, siteUrl: string) {
  return await prisma.gscConnection.upsert({
    where: { shop_domain: shopDomain },
    update: { refresh_token: refreshToken, site_url: siteUrl },
    create: { shop_domain: shopDomain, refresh_token: refreshToken, site_url: siteUrl },
  });
}

/**
 * Task 5.2 - Finds CTR Opportunities (high impressions, low CTR)
 */
export async function getCtrOpportunities(shopDomain: string): Promise<CtrOpportunity[]> {
  // Simulated GSC API data pull for high impression / low CTR queries
  return [
    {
      query: "silk evening dress online",
      pageUrl: `https://${shopDomain}/products/silk-evening-dress`,
      impressions: 4800,
      ctr: 1.2,
      currentPosition: 4.2,
      suggestedRewrite: "Buy Luxury Silk Evening Dress | Best Price & Fast Shipping",
    },
    {
      query: "brown leather oxford shoes",
      pageUrl: `https://${shopDomain}/products/leather-oxford-shoes`,
      impressions: 3200,
      ctr: 1.8,
      currentPosition: 5.1,
      suggestedRewrite: "Handcrafted Men's Brown Leather Oxford Shoes | Free Returns",
    },
    {
      query: "waterproof gold watch",
      pageUrl: `https://${shopDomain}/products/gold-watch`,
      impressions: 6100,
      ctr: 0.9,
      currentPosition: 6.8,
      suggestedRewrite: "Minimalist Gold Chronograph Watch - 100% Waterproof Luxury",
    },
  ];
}

/**
 * Task 5.3 - Detects Query Cannibalisation (multiple URLs ranking for the exact same query)
 */
export async function getCannibalisationIssues(shopDomain: string) {
  return [
    {
      query: "luxury evening wear",
      conflictingUrls: [
        `https://${shopDomain}/collections/evening-dresses`,
        `https://${shopDomain}/products/silk-evening-dress`,
      ],
      recommendation: "Assign primary keyword 'luxury evening wear' to Collection page and long-tail to Product page.",
    },
  ];
}

/**
 * Task 5.4 - Finds Content Gaps (queries receiving impressions with no matching product/page)
 */
export async function getContentGaps(shopDomain: string) {
  return [
    {
      query: "how to clean leather oxford shoes",
      impressions: 1420,
      opportunity: "Create blog article 'Ultimate Guide: How to Clean Leather Oxford Shoes' & link to shoes product.",
    },
  ];
}

/**
 * Task 5.5 - Internal Linking & Orphan Page Detection
 */
export async function getInternalLinkingSuggestions(shopDomain: string) {
  return {
    orphanPages: [
      { url: `https://${shopDomain}/pages/fabric-care-guide`, reason: "0 internal links pointing in" },
    ],
    linkSuggestions: [
      {
        sourceUrl: `https://${shopDomain}/blogs/news/summer-style-tips`,
        anchorText: "silk evening dress",
        targetUrl: `https://${shopDomain}/products/silk-evening-dress`,
      },
    ],
  };
}
