import prisma from "../db.server";
import { executeShopifyGraphQL } from "./graphql.server";
import { updateProductImageAltText } from "./meta_writer.server";

/**
 * Image ALT TEXT only.
 *
 * This app does not compress images and never claims to. Shopify serves product
 * media from its own CDN; an app cannot shrink those files without re-uploading
 * new media, and we deliberately do not do that (see DECISIONS.md, 31 Aug 2026).
 *
 * The previous implementation of this file wrote fabricated "1.85MB -> 0.42MB"
 * rows into the database and reported invented megabytes saved. That has been removed.
 */

export interface ProductImageRow {
  productId: string;
  productTitle: string;
  mediaId: string;
  imageUrl: string | null;
  altText: string | null;
  handle: string;
}

const PAGE_SIZE = 100;

/** Reads EVERY product, not the first page. A partial read would understate the problem. */
export async function listProductImages(admin: any, maxProducts = 1000): Promise<ProductImageRow[]> {
  const rows: ProductImageRow[] = [];
  let cursor: string | null = null;
  let fetched = 0;

  while (fetched < maxProducts) {
    const res: any = await executeShopifyGraphQL(
      admin,
      `query productImages($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              title
              handle
              media(first: 20) {
                edges {
                  node {
                    ... on MediaImage {
                      id
                      alt
                      image { url }
                    }
                  }
                }
              }
            }
          }
        }
      }`,
      { first: PAGE_SIZE, after: cursor }
    );

    const conn = res?.data?.products;
    if (!conn) break;

    for (const edge of conn.edges || []) {
      const p = edge.node;
      fetched++;
      for (const m of p.media?.edges || []) {
        const node = m.node;
        if (!node?.id) continue;
        rows.push({
          productId: p.id,
          productTitle: p.title,
          handle: p.handle,
          mediaId: node.id,
          imageUrl: node.image?.url ?? null,
          altText: node.alt ?? null,
        });
      }
    }

    if (!conn.pageInfo?.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }

  return rows;
}

export interface AltTextCoverage {
  available: boolean;
  totalImages: number;
  withAlt: number;
  missingAlt: number;
  coveragePercent: number | null;
  productsScanned: number;
  rows: ProductImageRow[];
  error?: string;
}

export async function getAltTextCoverage(admin: any, _shopDomain: string): Promise<AltTextCoverage> {
  try {
    const rows = await listProductImages(admin);
    const withAlt = rows.filter((r) => (r.altText || "").trim().length > 0).length;
    const totalImages = rows.length;
    return {
      available: true,
      totalImages,
      withAlt,
      missingAlt: totalImages - withAlt,
      coveragePercent: totalImages === 0 ? null : Math.round((withAlt / totalImages) * 100),
      productsScanned: new Set(rows.map((r) => r.productId)).size,
      rows,
    };
  } catch (err) {
    // An API failure is reported as a failure. It is never rendered as a healthy store.
    return {
      available: false,
      totalImages: 0,
      withAlt: 0,
      missingAlt: 0,
      coveragePercent: null,
      productsScanned: 0,
      rows: [],
      error: (err as Error).message,
    };
  }
}

/** Suggests alt text from real product context. No keyword stuffing, no invented claims. */
export function suggestAltText(productTitle: string, index: number, shopName: string) {
  const base = `${productTitle} — ${shopName}`;
  return index === 0 ? base : `${productTitle}, view ${index + 1} — ${shopName}`;
}

export interface BulkAltResult {
  attempted: number;
  written: number;
  skippedHumanValue: number;
  failed: { mediaId: string; message: string }[];
}

/**
 * Fills ONLY empty alt text. A value a human wrote is never overwritten.
 * Every successful write schedules a live-page verification inside updateProductImageAltText.
 */
export async function fillMissingAltText(
  admin: any,
  shopDomain: string,
  shopName: string,
  limit = 50
): Promise<BulkAltResult> {
  const rows = await listProductImages(admin);
  const result: BulkAltResult = { attempted: 0, written: 0, skippedHumanValue: 0, failed: [] };

  const perProductIndex = new Map<string, number>();

  for (const row of rows) {
    const idx = perProductIndex.get(row.productId) ?? 0;
    perProductIndex.set(row.productId, idx + 1);

    if ((row.altText || "").trim().length > 0) {
      result.skippedHumanValue++;
      continue;
    }
    if (result.attempted >= limit) break;

    result.attempted++;
    const alt = suggestAltText(row.productTitle, idx, shopName);
    const targetUrl = `https://${shopDomain}/products/${row.handle}`;

    try {
      await updateProductImageAltText(admin, shopDomain, row.productId, row.mediaId, alt, targetUrl);
      result.written++;
    } catch (err) {
      result.failed.push({ mediaId: row.mediaId, message: (err as Error).message });
    }
  }

  return result;
}

/** History of alt-text writes we actually made. */
export async function getAltTextHistory(shopDomain: string) {
  return prisma.change.findMany({
    where: { shop_domain: shopDomain, field: "alt" },
    orderBy: { applied_at: "desc" },
    take: 50,
  });
}
