import prisma from "../db.server";
import { executeShopifyGraphQL } from "./graphql.server";

export interface RedirectRecord {
  id: string;
  path: string;
  target: string;
  shopifyGid?: string;
  createdAt: Date;
}

/**
 * Task 4.1 - Creates a 301 URL Redirect in Shopify via urlRedirectCreate GraphQL mutation
 * Uses write_online_store_navigation scope per 02-SHOPIFY-REALITY.md §1
 */
export async function createShopify301Redirect(
  admin: any,
  shopDomain: string,
  path: string,
  target: string
) {
  // Normalize path & target
  const formattedPath = path.startsWith("/") ? path : `/${path}`;
  const formattedTarget = target.startsWith("/") || target.startsWith("http") ? target : `/${target}`;

  const mutation = `
    mutation urlRedirectCreate($urlRedirect: UrlRedirectInput!) {
      urlRedirectCreate(urlRedirect: $urlRedirect) {
        urlRedirect {
          id
          path
          target
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    urlRedirect: {
      path: formattedPath,
      target: formattedTarget,
    },
  };

  const responseJson = await executeShopifyGraphQL(admin, mutation, variables);
  const errors = responseJson?.data?.urlRedirectCreate?.userErrors;

  if (errors && errors.length > 0) {
    throw new Error(`urlRedirectCreate error: ${errors[0].message}`);
  }

  const shopifyGid = responseJson?.data?.urlRedirectCreate?.urlRedirect?.id;

  // Record in DB & mark broken links fixed
  await prisma.brokenLink.updateMany({
    where: { shop_domain: shopDomain, source_url: formattedPath },
    data: { fixed: true, target_url: formattedTarget },
  });

  return {
    success: true,
    shopifyGid,
    path: formattedPath,
    target: formattedTarget,
  };
}

/**
 * Task 4.1 - Handle Change Detection & Auto 301 Redirect creation
 */
export async function handleProductHandleChange(
  admin: any,
  shopDomain: string,
  oldHandle: string,
  newHandle: string
) {
  if (oldHandle === newHandle) return null;

  const oldPath = `/products/${oldHandle}`;
  const newPath = `/products/${newHandle}`;

  console.log(`[Handle Change Detected] ${oldPath} -> ${newPath}. Creating 301 redirect.`);

  return await createShopify301Redirect(admin, shopDomain, oldPath, newPath);
}

/**
 * 404 report, built from what the crawler actually found.
 * The previous version returned two invented broken links ("summer-collection-old",
 * "vintage-leather-boots") whenever the store had none.
 */
export async function getBrokenLinksReport(shopDomain: string) {
  // Anything the crawler fetched and got a 4xx/5xx for is a real broken URL.
  const broken = await prisma.pageRecord.findMany({
    where: { shop_domain: shopDomain, status_code: { gte: 400 } },
    orderBy: { last_crawled_at: "desc" },
    take: 200,
  });

  const live = await prisma.pageRecord.findMany({
    where: { shop_domain: shopDomain, status_code: { gte: 200, lt: 400 } },
    select: { url: true },
    take: 2000,
  });
  const liveUrls = live.map((l) => l.url);

  const existing = await prisma.brokenLink.findMany({
    where: { shop_domain: shopDomain },
    orderBy: { created_at: "desc" },
    take: 200,
  });
  const fixedByPath = new Map(existing.map((e) => [e.source_url, e]));

  return broken.map((b) => {
    let path = b.url;
    try {
      path = new URL(b.url).pathname;
    } catch {
      /* keep raw */
    }
    const record = fixedByPath.get(path);
    const suggestion = suggestRedirectTarget(b.url, liveUrls);
    return {
      id: b.id,
      sourceUrl: path,
      statusCode: b.status_code,
      // A suggestion, clearly separate from a decision. Null means we have nothing
      // sensible to propose - we do not quietly point it at /collections/all.
      suggestedTarget: record?.target_url ?? suggestion.target,
      suggestionConfidence: record?.target_url ? "chosen by you" : suggestion.confidence,
      fixed: Boolean(record?.fixed),
      lastSeenAt: b.last_crawled_at,
    };
  });
}

/**
 * Picks the closest live URL by handle similarity. Returns null rather than
 * guessing when nothing is close - a blanket redirect to the homepage is a
 * soft-404 in Google's eyes and is never the default here.
 */
export function suggestRedirectTarget(
  brokenUrl: string,
  liveUrls: string[]
): { target: string | null; confidence: "high" | "low" | "none" } {
  let brokenPath: string;
  try {
    brokenPath = new URL(brokenUrl).pathname;
  } catch {
    brokenPath = brokenUrl;
  }

  const handle = brokenPath.split("/").filter(Boolean).pop() ?? "";
  if (!handle) return { target: null, confidence: "none" };

  const tokens = handle.split("-").filter((t) => t.length > 2);
  if (tokens.length === 0) return { target: null, confidence: "none" };

  let best: { url: string; score: number } | null = null;
  for (const url of liveUrls) {
    let livePath: string;
    try {
      livePath = new URL(url).pathname;
    } catch {
      continue;
    }
    if (livePath === brokenPath) continue;

    const liveHandle = livePath.split("/").filter(Boolean).pop() ?? "";
    const liveTokens = new Set(liveHandle.split("-"));
    const overlap = tokens.filter((t) => liveTokens.has(t)).length;
    const sameType = livePath.split("/")[1] === brokenPath.split("/")[1];
    const score = overlap / tokens.length + (sameType ? 0.25 : 0);

    if (!best || score > best.score) best = { url: livePath, score };
  }

  if (!best || best.score < 0.5) return { target: null, confidence: "none" };
  return { target: best.url, confidence: best.score >= 0.9 ? "high" : "low" };
}
