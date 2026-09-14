/**
 * Shopify Store Content Scanner & Importer
 * Scans products, collections, pages, blogs, and theme metadata using resilient cursor-paginated GraphQL queries.
 */

import prisma from "../db.server";
import { executeGraphQL } from "./graphql.server";
import { auditProduct, auditCollection, auditPage, auditArticle } from "./audit.server";

const PRODUCTS_QUERY = `#graphql
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        descriptionHtml
        handle
        productType
        vendor
        tags
        seo {
          title
          description
        }
        titleTag: metafield(namespace: "global", key: "title_tag") {
          value
        }
        descTag: metafield(namespace: "global", key: "description_tag") {
          value
        }
        media(first: 8) {
          nodes {
            ... on MediaImage {
              id
              image {
                id
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;

const COLLECTIONS_QUERY = `#graphql
  query getCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        descriptionHtml
        handle
        seo {
          title
          description
        }
        titleTag: metafield(namespace: "global", key: "title_tag") {
          value
        }
        descTag: metafield(namespace: "global", key: "description_tag") {
          value
        }
      }
    }
  }
`;

const PAGES_QUERY = `#graphql
  query getPages($first: Int!, $after: String) {
    pages(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        body
        handle
        seo {
          title
          description
        }
      }
    }
  }
`;

const ARTICLES_QUERY = `#graphql
  query getArticles($first: Int!, $after: String) {
    articles(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        body
        handle
        tags
        authorV2 {
          name
        }
        blog {
          id
          title
        }
        seo {
          title
          description
        }
      }
    }
  }
`;

export interface ScanResult {
  productsScanned: number;
  collectionsScanned: number;
  pagesScanned: number;
  articlesScanned: number;
  issuesDetected: number;
  durationMs: number;
}

export async function scanStoreContent(
  admin: { graphql: any },
  shopDomain: string
): Promise<ScanResult> {
  const startTime = Date.now();

  // Ensure Shop record exists
  await prisma.shop.upsert({
    where: { domain: shopDomain },
    create: { domain: shopDomain },
    update: {},
  });

  let productsScanned = 0;
  let collectionsScanned = 0;
  let pagesScanned = 0;
  let articlesScanned = 0;

  // 1. Scan Products with cursor pagination
  let productCursor: string | null = null;
  let hasMoreProducts = true;

  while (hasMoreProducts) {
    const data: any = await executeGraphQL(admin, PRODUCTS_QUERY, {
      first: 50,
      after: productCursor,
    });

    const productNodes = data?.products?.nodes || [];
    for (const p of productNodes) {
      productsScanned++;
      const seoTitle = p.titleTag?.value || p.seo?.title || null;
      const seoDesc = p.descTag?.value || p.seo?.description || null;

      const mediaImages = (p.media?.nodes || [])
        .filter((m: any) => m.image?.url)
        .map((m: any) => ({
          id: m.id,
          url: m.image.url,
          altText: m.image.altText || null,
        }));

      await prisma.productRecord.upsert({
        where: { shopifyGid: p.id },
        create: {
          shopDomain,
          shopifyGid: p.id,
          title: p.title,
          description: p.descriptionHtml || "",
          handle: p.handle,
          productType: p.productType || "",
          vendor: p.vendor || "",
          tags: Array.isArray(p.tags) ? p.tags.join(", ") : p.tags || "",
          seoTitle,
          seoDescription: seoDesc,
          imagesJson: JSON.stringify(mediaImages),
          lastScannedAt: new Date(),
        },
        update: {
          title: p.title,
          description: p.descriptionHtml || "",
          handle: p.handle,
          productType: p.productType || "",
          vendor: p.vendor || "",
          tags: Array.isArray(p.tags) ? p.tags.join(", ") : p.tags || "",
          seoTitle,
          seoDescription: seoDesc,
          imagesJson: JSON.stringify(mediaImages),
          lastScannedAt: new Date(),
        },
      });
    }

    hasMoreProducts = data?.products?.pageInfo?.hasNextPage && productNodes.length > 0;
    productCursor = data?.products?.pageInfo?.endCursor || null;
  }

  // 2. Scan Collections
  let colCursor: string | null = null;
  let hasMoreCols = true;

  while (hasMoreCols) {
    const data: any = await executeGraphQL(admin, COLLECTIONS_QUERY, {
      first: 50,
      after: colCursor,
    });

    const colNodes = data?.collections?.nodes || [];
    for (const c of colNodes) {
      collectionsScanned++;
      const seoTitle = c.titleTag?.value || c.seo?.title || null;
      const seoDesc = c.descTag?.value || c.seo?.description || null;

      await prisma.collectionRecord.upsert({
        where: { shopifyGid: c.id },
        create: {
          shopDomain,
          shopifyGid: c.id,
          title: c.title,
          description: c.descriptionHtml || "",
          handle: c.handle,
          seoTitle,
          seoDescription: seoDesc,
          lastScannedAt: new Date(),
        },
        update: {
          title: c.title,
          description: c.descriptionHtml || "",
          handle: c.handle,
          seoTitle,
          seoDescription: seoDesc,
          lastScannedAt: new Date(),
        },
      });
    }

    hasMoreCols = data?.collections?.pageInfo?.hasNextPage && colNodes.length > 0;
    colCursor = data?.collections?.pageInfo?.endCursor || null;
  }

  // 3. Scan Pages
  let pageCursor: string | null = null;
  let hasMorePages = true;

  while (hasMorePages) {
    const data: any = await executeGraphQL(admin, PAGES_QUERY, {
      first: 50,
      after: pageCursor,
    });

    const pageNodes = data?.pages?.nodes || [];
    for (const pg of pageNodes) {
      pagesScanned++;
      await prisma.pageRecord.upsert({
        where: { shopifyGid: pg.id },
        create: {
          shopDomain,
          shopifyGid: pg.id,
          title: pg.title,
          body: pg.body || "",
          handle: pg.handle,
          seoTitle: pg.seo?.title || null,
          seoDescription: pg.seo?.description || null,
          lastScannedAt: new Date(),
        },
        update: {
          title: pg.title,
          body: pg.body || "",
          handle: pg.handle,
          seoTitle: pg.seo?.title || null,
          seoDescription: pg.seo?.description || null,
          lastScannedAt: new Date(),
        },
      });
    }

    hasMorePages = data?.pages?.pageInfo?.hasNextPage && pageNodes.length > 0;
    pageCursor = data?.pages?.pageInfo?.endCursor || null;
  }

  // 4. Scan Articles
  let articleCursor: string | null = null;
  let hasMoreArticles = true;

  while (hasMoreArticles) {
    const data: any = await executeGraphQL(admin, ARTICLES_QUERY, {
      first: 50,
      after: articleCursor,
    });

    const articleNodes = data?.articles?.nodes || [];
    for (const art of articleNodes) {
      articlesScanned++;
      await prisma.articleRecord.upsert({
        where: { shopifyGid: art.id },
        create: {
          shopDomain,
          shopifyGid: art.id,
          blogGid: art.blog?.id || "",
          title: art.title,
          body: art.body || "",
          handle: art.handle,
          author: art.authorV2?.name || "",
          tags: Array.isArray(art.tags) ? art.tags.join(", ") : art.tags || "",
          seoTitle: art.seo?.title || null,
          seoDescription: art.seo?.description || null,
          lastScannedAt: new Date(),
        },
        update: {
          title: art.title,
          body: art.body || "",
          handle: art.handle,
          author: art.authorV2?.name || "",
          tags: Array.isArray(art.tags) ? art.tags.join(", ") : art.tags || "",
          seoTitle: art.seo?.title || null,
          seoDescription: art.seo?.description || null,
          lastScannedAt: new Date(),
        },
      });
    }

    hasMoreArticles = data?.articles?.pageInfo?.hasNextPage && articleNodes.length > 0;
    articleCursor = data?.articles?.pageInfo?.endCursor || null;
  }

  // 5. Run Issue Audit across all newly scanned resources
  const [products, collections, pages, articles] = await Promise.all([
    prisma.productRecord.findMany({ where: { shopDomain } }),
    prisma.collectionRecord.findMany({ where: { shopDomain } }),
    prisma.pageRecord.findMany({ where: { shopDomain } }),
    prisma.articleRecord.findMany({ where: { shopDomain } }),
  ]);

  const allDefects = [
    ...products.flatMap(auditProduct),
    ...collections.flatMap(auditCollection),
    ...pages.flatMap(auditPage),
    ...articles.flatMap(auditArticle),
  ];

  // Refresh SeoIssue table for this shop
  await prisma.seoIssue.deleteMany({ where: { shopDomain } });

  if (allDefects.length > 0) {
    await prisma.seoIssue.createMany({
      data: allDefects.map((d) => ({
        shopDomain,
        resourceType: d.resourceType,
        resourceGid: d.resourceGid,
        issueType: d.issueType,
        severity: d.severity,
        title: d.title,
        description: d.description,
        impact: d.impact,
        recommendedFix: d.recommendedFix,
        isResolved: false,
      })),
    });
  }

  return {
    productsScanned,
    collectionsScanned,
    pagesScanned,
    articlesScanned,
    issuesDetected: allDefects.length,
    durationMs: Date.now() - startTime,
  };
}
