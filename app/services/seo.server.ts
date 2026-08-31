import prisma from "../db.server";
import { executeShopifyGraphQL } from "./graphql.server";

export interface SeoStats {
  /** false when the Admin API failed. A failure is never rendered as a healthy store. */
  available: boolean;
  error?: string;
  healthScore: number | null;
  scoreBreakdown: string;
  totalProducts: number;
  imagesScanned: number;
  missingTitles: number;
  missingDescs: number;
  missingAlts: number;
  /** Real counts from our own Change / Verification tables. */
  changesApplied: number;
  changesVerified: number;
  hasProducts: boolean;
}

export interface StoreDiagnosticItem {
  id: string;
  resourceTitle: string;
  resourceType: "product" | "collection" | "page";
  issueCode: "missing_meta_title" | "missing_meta_desc" | "missing_alt_text";
  severity: "critical" | "warning";
  description: string;
  fixAction: string;
}

export async function getSeoSettings(shopDomain: string) {
  let settings = await prisma.seoSetting.findUnique({
    where: { shop_domain: shopDomain },
  });

  if (!settings) {
    settings = await prisma.seoSetting.create({
      data: {
        shop_domain: shopDomain,
        product_title_template: "{product_title} - Buy Online at {shop_name}",
        product_desc_template: "Shop {product_title} online. Best prices, premium quality & fast shipping at {shop_name}.",
        image_alt_template: "{product_title} - {shop_name}",
        auto_alt_text: true,
        auto_compress_images: true,
        auto_jsonld_schema: true,
        auto_meta_tags: true,
      },
    });
  }

  return settings;
}

export async function updateSeoSettings(shopDomain: string, data: Partial<{
  product_title_template: string;
  product_desc_template: string;
  image_alt_template: string;
  auto_alt_text: boolean;
  auto_compress_images: boolean;
  auto_jsonld_schema: boolean;
  auto_meta_tags: boolean;
}>) {
  return await prisma.seoSetting.upsert({
    where: { shop_domain: shopDomain },
    update: data,
    create: {
      shop_domain: shopDomain,
      ...data,
    },
  });
}

/**
 * Live Dynamic Store Audit: Queries real GraphQL products from merchant store
 * Zero fake numbers, zero hardcoded 48.5MB / 142 compressed images.
 */
export async function getSeoAuditSummary(admin: any, shopDomain: string): Promise<SeoStats> {
  const empty: SeoStats = {
    available: true,
    healthScore: null,
    scoreBreakdown: "",
    totalProducts: 0,
    imagesScanned: 0,
    missingTitles: 0,
    missingDescs: 0,
    missingAlts: 0,
    changesApplied: 0,
    changesVerified: 0,
    hasProducts: false,
  };

  try {
    let cursor: string | null = null;
    let totalProducts = 0;
    let imagesScanned = 0;
    let missingAlts = 0;
    let missingTitles = 0;
    let missingDescs = 0;

    // Paginate the whole catalogue. Reading only the first page would let us
    // report a healthy store while thousands of products go unchecked.
    for (let page = 0; page < 20; page++) {
      const resJson: any = await executeShopifyGraphQL(
        admin,
        `query auditProducts($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id
                title
                seo { title description }
                media(first: 20) {
                  edges { node { ... on MediaImage { id alt } } }
                }
              }
            }
          }
        }`,
        { first: 100, after: cursor }
      );

      const conn = resJson?.data?.products;
      if (!conn) break;

      for (const edge of conn.edges || []) {
        const p = edge.node;
        totalProducts++;
        for (const m of p.media?.edges || []) {
          if (!m.node?.id) continue;
          imagesScanned++;
          if (!(m.node.alt || "").trim()) missingAlts++;
        }
        if (!p.seo?.title) missingTitles++;
        if (!p.seo?.description) missingDescs++;
      }

      if (!conn.pageInfo?.hasNextPage) break;
      cursor = conn.pageInfo.endCursor;
    }

    const [changesApplied, changesVerified] = await Promise.all([
      prisma.change.count({ where: { shop_domain: shopDomain, reverted_at: null } }),
      prisma.verification.count({ where: { shop_domain: shopDomain, result: "PASS" } }),
    ]);

    if (totalProducts === 0) {
      return { ...empty, changesApplied, changesVerified };
    }

    // Transparent maths: every deduction is shown to the merchant.
    const criticals = missingTitles + missingDescs;
    const warnings = missingAlts;
    const raw = 100 - criticals * 2 - warnings * 0.5;
    const healthScore = Math.max(0, Math.min(100, Math.round(raw)));

    return {
      available: true,
      healthScore,
      scoreBreakdown: `100 − (${criticals} missing meta tags × 2) − (${missingAlts} images without alt text × 0.5)`,
      totalProducts,
      imagesScanned,
      missingTitles,
      missingDescs,
      missingAlts,
      changesApplied,
      changesVerified,
      hasProducts: true,
    };
  } catch (err) {
    console.error("[seo] audit summary failed:", err);
    return { ...empty, available: false, error: (err as Error).message };
  }
}

/**
 * Systematic Store Diagnostic Scanner: Scans GraphQL Admin API and returns itemized list of exact SEO defects
 */
export async function getSystematicStoreDiagnostic(admin: any, shopDomain: string): Promise<StoreDiagnosticItem[]> {
  try {
    const resJson = await executeShopifyGraphQL(admin, `
      query {
        products(first: 50) {
          edges {
            node {
              id
              title
              seo {
                title
                description
              }
              images(first: 5) {
                edges {
                  node {
                    id
                    altText
                  }
                }
              }
            }
          }
        }
      }
    `);

    const products = resJson?.data?.products?.edges || [];
    const diagnosticItems: StoreDiagnosticItem[] = [];

    for (const edge of products) {
      const p = edge.node;
      
      if (!p.seo?.title) {
        diagnosticItems.push({
          id: `${p.id}-title`,
          resourceTitle: p.title,
          resourceType: "product",
          issueCode: "missing_meta_title",
          severity: "critical",
          description: `Product "${p.title}" is missing Google search title tag.`,
          fixAction: `Generate high-CTR title: "${p.title} - Buy Online"`,
        });
      }

      if (!p.seo?.description) {
        diagnosticItems.push({
          id: `${p.id}-desc`,
          resourceTitle: p.title,
          resourceType: "product",
          issueCode: "missing_meta_desc",
          severity: "warning",
          description: `Product "${p.title}" is missing Google meta description.`,
          fixAction: `Generate search meta description with pricing & free shipping text.`,
        });
      }

      const images = p.images?.edges || [];
      for (const imgEdge of images) {
        if (!imgEdge.node.altText) {
          diagnosticItems.push({
            id: `${imgEdge.node.id}-alt`,
            resourceTitle: p.title,
            resourceType: "product",
            issueCode: "missing_alt_text",
            severity: "critical",
            description: `Image on "${p.title}" is missing accessibility ALT text.`,
            fixAction: `Set ALT tag: "${p.title} - High Quality Product Image"`,
          });
          break; // Report once per product to avoid clutter
        }
      }
    }

    return diagnosticItems;
  } catch (err) {
    console.error("Systematic diagnostic scan error:", err);
    return [];
  }
}

/**
 * Applies the fixes we can apply safely, and reports ONLY what was actually written.
 *
 * The previous implementation of this function wrote nothing to Shopify. It counted
 * missing meta tags, reported that count as "fixed", stored healthScore 100 in the
 * database and invented "MB saved". That is the exact failure this product exists to
 * attack (01-PRODUCT.md Gap 1) and it has been removed.
 */
export async function runFullAutoSeoOptimization(admin: any, shopDomain: string) {
  const { writeResourceSeoMetafield } = await import("./meta_writer.server");

  let shopName = shopDomain.replace(".myshopify.com", "");
  const written: { gid: string; field: string; value: string }[] = [];
  const skippedHumanValue: string[] = [];
  const failed: { gid: string; message: string }[] = [];
  let productsScanned = 0;

  try {
    let cursor: string | null = null;

    for (let page = 0; page < 20; page++) {
      const resJson: any = await executeShopifyGraphQL(
        admin,
        `query autoFix($first: Int!, $after: String) {
          shop { name }
          products(first: $first, after: $after) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id
                title
                handle
                description
                seo { title description }
              }
            }
          }
        }`,
        { first: 50, after: cursor }
      );

      if (resJson?.data?.shop?.name) shopName = resJson.data.shop.name;
      const conn = resJson?.data?.products;
      if (!conn) break;

      for (const edge of conn.edges || []) {
        const p = edge.node;
        productsScanned++;
        const targetUrl = `https://${shopDomain}/products/${p.handle}`;

        if (!p.seo?.title) {
          const value = `${p.title} | ${shopName}`.slice(0, 60);
          try {
            const res: any = await writeResourceSeoMetafield(
              admin, shopDomain, p.id, "title_tag", value, targetUrl, "bulk"
            );
            if (res?.success) written.push({ gid: p.id, field: "title_tag", value });
            else if (res?.protected) skippedHumanValue.push(p.id);
          } catch (err) {
            failed.push({ gid: p.id, message: (err as Error).message });
          }
        }

        if (!p.seo?.description) {
          const source = (p.description || "").replace(/\s+/g, " ").trim();
          if (source.length >= 50) {
            const value = source.slice(0, 155);
            try {
              const res: any = await writeResourceSeoMetafield(
                admin, shopDomain, p.id, "description_tag", value, targetUrl, "bulk"
              );
              if (res?.success) written.push({ gid: p.id, field: "description_tag", value });
              else if (res?.protected) skippedHumanValue.push(p.id);
            } catch (err) {
              failed.push({ gid: p.id, message: (err as Error).message });
            }
          }
          // No product description = nothing truthful to write. We leave it and report it.
        }
      }

      if (!conn.pageInfo?.hasNextPage) break;
      cursor = conn.pageInfo.endCursor;
    }

    await prisma.event.create({
      data: {
        shop_domain: shopDomain,
        type: "bulk_meta_apply",
        payload: JSON.stringify({
          productsScanned,
          written: written.length,
          skippedHumanValue: skippedHumanValue.length,
          failed: failed.length,
        }),
      },
    });

    return {
      success: failed.length === 0,
      productsScanned,
      metaTitlesWritten: written.filter((w) => w.field === "title_tag").length,
      metaDescsWritten: written.filter((w) => w.field === "description_tag").length,
      skippedHumanValue: skippedHumanValue.length,
      failed,
      // Every write above scheduled its own live-page verification.
      status: "Applied — verification pending" as const,
    };
  } catch (error) {
    console.error("[seo] bulk apply failed:", error);
    return {
      success: false,
      productsScanned,
      metaTitlesWritten: written.filter((w) => w.field === "title_tag").length,
      metaDescsWritten: written.filter((w) => w.field === "description_tag").length,
      skippedHumanValue: skippedHumanValue.length,
      failed: [...failed, { gid: "-", message: (error as Error).message }],
      status: "Failed" as const,
    };
  }
}
