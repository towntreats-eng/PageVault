import prisma from "../db.server";
import { executeShopifyGraphQL } from "./graphql.server";
import { isOverBudget, trackDataSpend } from "./keyword_engine.server";

/**
 * AI citation tracking.
 *
 * Asks real AI answer engines a real buying question and records whether this
 * store was mentioned. Every row in the report comes from a call we actually
 * made; if no provider key is configured, the report says so and shows nothing.
 *
 * The previous implementation returned a hardcoded array — "best luxury silk
 * evening dresses", "handcrafted men's leather oxford shoes", named competitors
 * and a 58/100 score — identically for every store, without ever calling an API.
 */

import { getGeminiApiKey, askGeminiBuyingQuestion, isGeminiConfigured } from "./gemini.server";

export type AiEngine = "gemini" | "chatgpt" | "claude" | "perplexity";

interface ProviderConfig {
  engine: AiEngine;
  envKey: string;
  url: string;
  model: string;
  /** Rough cost of one short answer, for the budget meter. */
  costUsd: number;
}

const PROVIDERS: ProviderConfig[] = [
  { engine: "gemini", envKey: "GEMINI_API_KEY", url: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.5-flash", costUsd: 0.0005 },
  { engine: "chatgpt", envKey: "OPENAI_API_KEY", url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini", costUsd: 0.002 },
  { engine: "claude", envKey: "ANTHROPIC_API_KEY", url: "https://api.anthropic.com/v1/messages", model: "claude-3-5-haiku-latest", costUsd: 0.002 },
  { engine: "perplexity", envKey: "PERPLEXITY_API_KEY", url: "https://api.perplexity.ai/chat/completions", model: "sonar", costUsd: 0.005 },
];

export async function configuredEngines(shopDomain?: string): Promise<AiEngine[]> {
  const result: AiEngine[] = [];
  if (await isGeminiConfigured(shopDomain)) result.push("gemini");
  if (process.env.OPENAI_API_KEY) result.push("chatgpt");
  if (process.env.ANTHROPIC_API_KEY) result.push("claude");
  if (process.env.PERPLEXITY_API_KEY) result.push("perplexity");
  return result;
}

async function askProvider(p: ProviderConfig, question: string, shopDomain?: string): Promise<string | null> {
  if (p.engine === "gemini") {
    const key = await getGeminiApiKey(shopDomain);
    if (!key) return null;
    return await askGeminiBuyingQuestion(question, key);
  }

  const key = process.env[p.envKey];
  if (!key) return null;

  try {
    if (p.engine === "claude") {
      const res = await fetch(p.url, {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: p.model,
          max_tokens: 600,
          messages: [{ role: "user", content: question }],
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) return null;
      const body: any = await res.json();
      return (body.content ?? []).map((c: any) => c.text ?? "").join(" ");
    }

    const res = await fetch(p.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: p.model,
        max_tokens: 600,
        messages: [{ role: "user", content: question }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return null;
    const body: any = await res.json();
    return body.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.warn(`[ai_citation] ${p.engine} call failed:`, (err as Error).message);
    return null;
  }
}

/** Buying questions built from the store's own product types and vendors. */
export async function buildStoreQueries(admin: any, limit = 5): Promise<string[]> {
  const res: any = await executeShopifyGraphQL(
    admin,
    `query storeShape {
      shop { name }
      products(first: 50) {
        edges { node { productType vendor title } }
      }
    }`
  );

  const types = new Map<string, number>();
  for (const e of res?.data?.products?.edges ?? []) {
    const t = (e.node.productType || "").trim();
    if (t) types.set(t, (types.get(t) ?? 0) + 1);
  }

  const ranked = Array.from(types.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (ranked.length === 0) return [];

  return ranked.map(([type]) => `What are the best online stores to buy ${type.toLowerCase()} from right now?`);
}

function mentionsStore(answer: string, shopDomain: string, shopName: string) {
  const hay = answer.toLowerCase();
  const domainRoot = shopDomain.replace(".myshopify.com", "").replace(/\..*$/, "").toLowerCase();
  return hay.includes(shopDomain.toLowerCase()) || hay.includes(domainRoot) || (shopName.length > 3 && hay.includes(shopName.toLowerCase()));
}

export interface CitationRunResult {
  ran: boolean;
  reason?: string;
  queriesAsked: number;
  callsMade: number;
  citations: number;
}

export async function runCitationScan(admin: any, shopDomain: string): Promise<CitationRunResult> {
  const activeEngines = await configuredEngines(shopDomain);
  const engines = PROVIDERS.filter((p) => activeEngines.includes(p.engine));
  if (engines.length === 0) {
    return { ran: false, reason: "No AI provider key is configured on the server or in Settings.", queriesAsked: 0, callsMade: 0, citations: 0 };
  }
  if (await isOverBudget(shopDomain)) {
    return { ran: false, reason: "This shop has reached its monthly AI budget cap.", queriesAsked: 0, callsMade: 0, citations: 0 };
  }

  const queries = await buildStoreQueries(admin);
  if (queries.length === 0) {
    return { ran: false, reason: "Your products have no product type set, so we cannot build a buying question yet.", queriesAsked: 0, callsMade: 0, citations: 0 };
  }

  const shopRes: any = await executeShopifyGraphQL(admin, `query { shop { name } }`);
  const shopName = shopRes?.data?.shop?.name ?? shopDomain.replace(".myshopify.com", "");

  let callsMade = 0;
  let citations = 0;

  for (const query of queries) {
    for (const provider of engines) {
      if (await isOverBudget(shopDomain)) break;

      const answer = await askProvider(provider, query, shopDomain);
      callsMade++;
      await trackDataSpend(shopDomain, 0, provider.costUsd);
      if (answer === null) continue;

      const cited = mentionsStore(answer, shopDomain, shopName);
      if (cited) citations++;

      await prisma.aiCitation.create({
        data: {
          shop_domain: shopDomain,
          query,
          ai_engine: provider.engine,
          cited,
          competitor_domains_json: JSON.stringify(extractDomains(answer).slice(0, 10)),
        },
      });
    }
  }

  return { ran: true, queriesAsked: queries.length, callsMade, citations };
}

function extractDomains(text: string): string[] {
  const matches = text.match(/\b[a-z0-9-]+\.(com|co|io|shop|store|net|org)\b/gi) ?? [];
  return Array.from(new Set(matches.map((m) => m.toLowerCase())));
}

export interface AiVisibilityReport {
  configuredEngines: AiEngine[];
  hasData: boolean;
  lastCheckedAt: string | null;
  totalChecks: number;
  citedCount: number;
  /** null when we have never run a check. Never rendered as 0. */
  citationRate: number | null;
  byEngine: { engine: string; checks: number; cited: number }[];
  recentQueries: { query: string; engine: string; cited: boolean; competitors: string[]; checkedAt: string }[];
}

export async function getAiVisibilityReport(shopDomain: string): Promise<AiVisibilityReport> {
  const rows = await prisma.aiCitation.findMany({
    where: { shop_domain: shopDomain },
    orderBy: { checked_at: "desc" },
    take: 200,
  });

  const byEngine = new Map<string, { checks: number; cited: number }>();
  for (const r of rows) {
    const e = byEngine.get(r.ai_engine) ?? { checks: 0, cited: 0 };
    e.checks++;
    if (r.cited) e.cited++;
    byEngine.set(r.ai_engine, e);
  }

  const citedCount = rows.filter((r) => r.cited).length;

  return {
    configuredEngines: await configuredEngines(shopDomain),
    hasData: rows.length > 0,
    lastCheckedAt: rows[0]?.checked_at.toISOString() ?? null,
    totalChecks: rows.length,
    citedCount,
    citationRate: rows.length === 0 ? null : Math.round((citedCount / rows.length) * 100),
    byEngine: Array.from(byEngine.entries()).map(([engine, v]) => ({ engine, ...v })),
    recentQueries: rows.slice(0, 25).map((r) => ({
      query: r.query,
      engine: r.ai_engine,
      cited: r.cited,
      competitors: r.competitor_domains_json ? (JSON.parse(r.competitor_domains_json) as string[]) : [],
      checkedAt: r.checked_at.toISOString(),
    })),
  };
}

/**
 * Task 6A.1: AI product-data completeness score.
 * Evaluates store products against the 8 attributes required by modern AI shopping engines
 * (ChatGPT Search, Perplexity Pro, Google AI Overviews, Gemini).
 */
export interface AiProductCompletenessResult {
  totalProducts: number;
  averageScore: number;
  aiReadyCount: number;
  needsWorkCount: number;
  fieldCoverage: {
    titleValidPct: number;
    richDescriptionPct: number;
    hasProductTypePct: number;
    hasVendorPct: number;
    hasGtinBarcodePct: number;
    hasSkuPct: number;
    hasImageAltPct: number;
    hasPriceAndStockPct: number;
  };
  productAudits: {
    id: string;
    title: string;
    handle: string;
    featuredImageId: string | null;
    score: number;
    missingFields: string[];
    derivableFields: string[];
    vendor: string;
    productType: string;
    hasBarcode: boolean;
    hasImageAlt: boolean;
  }[];
}

export async function calculateAiProductCompleteness(
  admin: any,
  shopDomain: string
): Promise<AiProductCompletenessResult> {
  const query = `
    query getProductsForAiAudit($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            description
            descriptionHtml
            productType
            vendor
            featuredImage {
              id
              altText
            }
            variants(first: 5) {
              edges {
                node {
                  id
                  sku
                  barcode
                  price
                  availableForSale
                }
              }
            }
          }
        }
      }
    }
  `;

  const res: any = await executeShopifyGraphQL(admin, query, { first: 100 });
  const rawProducts = (res?.data?.products?.edges ?? []).map((e: any) => e.node);

  if (rawProducts.length === 0) {
    return {
      totalProducts: 0,
      averageScore: 0,
      aiReadyCount: 0,
      needsWorkCount: 0,
      fieldCoverage: {
        titleValidPct: 0,
        richDescriptionPct: 0,
        hasProductTypePct: 0,
        hasVendorPct: 0,
        hasGtinBarcodePct: 0,
        hasSkuPct: 0,
        hasImageAltPct: 0,
        hasPriceAndStockPct: 0,
      },
      productAudits: [],
    };
  }

  let totalScoreSum = 0;
  let titleValidCount = 0;
  let richDescCount = 0;
  let productTypeCount = 0;
  let vendorCount = 0;
  let gtinBarcodeCount = 0;
  let skuCount = 0;
  let imageAltCount = 0;
  let priceAndStockCount = 0;

  const productAudits = rawProducts.map((p: any) => {
    let score = 0;
    const missing: string[] = [];
    const derivable: string[] = [];

    // 1. Title (10 pts)
    const titleLen = (p.title || "").trim().length;
    if (titleLen >= 10) {
      score += 10;
      titleValidCount++;
    } else {
      missing.push("Descriptive title (≥10 chars)");
    }

    // 2. Rich Description (20 pts) - AI engines need textual context
    const cleanDesc = (p.description || "").replace(/<[^>]*>?/gm, "").trim();
    const wordCount = cleanDesc.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 30) {
      score += 20;
      richDescCount++;
    } else {
      missing.push(`Rich description (currently ${wordCount} words, target ≥30)`);
    }

    // 3. Product Type / Taxonomy (15 pts)
    const hasType = Boolean((p.productType || "").trim());
    if (hasType) {
      score += 15;
      productTypeCount++;
    } else {
      missing.push("Product Category / Type");
      derivable.push("Product Type (from title/tags)");
    }

    // 4. Vendor / Brand (15 pts) - Entity resolution
    const hasVendor = Boolean((p.vendor || "").trim());
    if (hasVendor) {
      score += 15;
      vendorCount++;
    } else {
      missing.push("Vendor / Brand");
    }

    // 5. Barcode / GTIN (15 pts) - AI Shopping Engine Matching
    const defaultVariant = p.variants?.edges?.[0]?.node;
    const hasBarcode = Boolean((defaultVariant?.barcode || "").trim());
    if (hasBarcode) {
      score += 15;
      gtinBarcodeCount++;
    } else {
      missing.push("Barcode / GTIN / UPC");
    }

    // 6. SKU (5 pts)
    const hasSku = Boolean((defaultVariant?.sku || "").trim());
    if (hasSku) {
      score += 5;
      skuCount++;
    } else {
      missing.push("SKU");
    }

    // 7. Image Alt Text (10 pts) - Multimodal context
    const hasAlt = Boolean((p.featuredImage?.altText || "").trim());
    if (hasAlt) {
      score += 10;
      imageAltCount++;
    } else {
      missing.push("Featured Image Alt Text");
      derivable.push("Image Alt Text (from title + brand)");
    }

    // 8. Price & Availability (10 pts)
    const hasPrice = Boolean(defaultVariant?.price && Number(defaultVariant.price) > 0);
    if (hasPrice) {
      score += 10;
      priceAndStockCount++;
    } else {
      missing.push("Valid Price");
    }

    totalScoreSum += score;

    return {
      id: p.id,
      title: p.title,
      handle: p.handle || "",
      featuredImageId: p.featuredImage?.id || null,
      score,
      missingFields: missing,
      derivableFields: derivable,
      vendor: p.vendor || "",
      productType: p.productType || "",
      hasBarcode,
      hasImageAlt: hasAlt,
    };
  });

  const total = rawProducts.length;
  const averageScore = Math.round(totalScoreSum / total);
  const aiReadyCount = productAudits.filter((a: any) => a.score >= 75).length;
  const needsWorkCount = total - aiReadyCount;

  return {
    totalProducts: total,
    averageScore,
    aiReadyCount,
    needsWorkCount,
    fieldCoverage: {
      titleValidPct: Math.round((titleValidCount / total) * 100),
      richDescriptionPct: Math.round((richDescCount / total) * 100),
      hasProductTypePct: Math.round((productTypeCount / total) * 100),
      hasVendorPct: Math.round((vendorCount / total) * 100),
      hasGtinBarcodePct: Math.round((gtinBarcodeCount / total) * 100),
      hasSkuPct: Math.round((skuCount / total) * 100),
      hasImageAltPct: Math.round((imageAltCount / total) * 100),
      hasPriceAndStockPct: Math.round((priceAndStockCount / total) * 100),
    },
    productAudits,
  };
}

/**
 * Task 6A.2: Bulk fill for derivable fields.
 * Derives missing productType or altText from existing store context,
 * performs real updates via GraphQL and auto-enqueues verification.
 */
export async function bulkFillDerivableFields(
  admin: any,
  shopDomain: string,
  options: { fillAltText?: boolean; fillProductType?: boolean; enrichWithGemini?: boolean }
): Promise<{ altTextUpdated: number; productTypeUpdated: number; descriptionsEnriched: number }> {
  const audit = await calculateAiProductCompleteness(admin, shopDomain);
  let altTextUpdated = 0;
  let productTypeUpdated = 0;
  let descriptionsEnriched = 0;

  const { updateProductImageAltText } = await import("./meta_writer.server");
  const { generateAiProductEnrichment, isGeminiConfigured } = await import("./gemini.server");
  const hasGemini = await isGeminiConfigured(shopDomain);

  for (const item of audit.productAudits) {
    // 1. Fill missing Alt Text if requested
    if (options.fillAltText && !item.hasImageAlt && item.featuredImageId) {
      const altValue = item.vendor ? `${item.title} by ${item.vendor}` : item.title;
      const targetUrl = `https://${shopDomain}/products/${item.handle}`;
      try {
        const updateRes = await updateProductImageAltText(
          admin,
          shopDomain,
          item.id,
          item.featuredImageId,
          altValue,
          targetUrl
        );
        if (updateRes?.success) {
          altTextUpdated++;
        }
      } catch (err) {
        console.warn(`[bulkFillDerivableFields] Alt update failed for ${item.id}:`, (err as Error).message);
      }
    }

    // 2. Fill missing Product Type if requested and derivable from title
    if (options.fillProductType && !item.productType) {
      const derivedType = guessProductTypeFromTitle(item.title);
      if (derivedType) {
        try {
          const res: any = await executeShopifyGraphQL(
            admin,
            `mutation updateProductType($input: ProductInput!) {
              productUpdate(input: $input) {
                product { id productType }
                userErrors { field message }
              }
            }`,
            {
              input: {
                id: item.id,
                productType: derivedType,
              },
            }
          );
          const errors = res?.data?.productUpdate?.userErrors ?? [];
          if (errors.length === 0) {
            productTypeUpdated++;
          }
        } catch (err) {
          console.warn(`[bulkFillDerivableFields] ProductType update failed for ${item.id}:`, (err as Error).message);
        }
      }
    }

    // 3. Enrich thin product descriptions with Gemini if requested
    if (options.enrichWithGemini && hasGemini && item.score < 75) {
      try {
        const enriched = await generateAiProductEnrichment({
          productTitle: item.title,
          vendor: item.vendor,
          category: item.productType,
          shopDomain,
        });

        if (enriched.enhancedDescriptionHtml) {
          const res: any = await executeShopifyGraphQL(
            admin,
            `mutation updateDescription($input: ProductInput!) {
              productUpdate(input: $input) {
                product { id }
                userErrors { field message }
              }
            }`,
            {
              input: {
                id: item.id,
                descriptionHtml: enriched.enhancedDescriptionHtml,
              },
            }
          );
          const errors = res?.data?.productUpdate?.userErrors ?? [];
          if (errors.length === 0) {
            descriptionsEnriched++;
          }
        }
      } catch (err) {
        console.warn(`[bulkFillDerivableFields] Description enrichment failed for ${item.id}:`, (err as Error).message);
      }
    }
  }

  return { altTextUpdated, productTypeUpdated, descriptionsEnriched };
}

function guessProductTypeFromTitle(title: string): string | null {
  const t = title.toLowerCase();
  const patterns: [RegExp, string][] = [
    [/\b(shirt|t-shirt|tee|polo)\b/i, "Apparel & Shirts"],
    [/\b(shoe|sneaker|boot|sandal|heel|loafer)\b/i, "Footwear"],
    [/\b(pant|jean|trouser|short|jogger)\b/i, "Apparel & Bottoms"],
    [/\b(dress|gown|skirt)\b/i, "Apparel & Dresses"],
    [/\b(jacket|coat|hoodie|sweater)\b/i, "Outerwear"],
    [/\b(bag|backpack|wallet|tote|purse)\b/i, "Bags & Accessories"],
    [/\b(ring|necklace|bracelet|earring|jewelry)\b/i, "Jewelry"],
    [/\b(cream|lotion|serum|cleanser|moisturizer|oil|mask)\b/i, "Skincare & Beauty"],
    [/\b(candle|diffuser|decor|vase)\b/i, "Home Decor"],
    [/\b(coffee|tea|snack|chocolate)\b/i, "Food & Beverage"],
  ];

  for (const [regex, category] of patterns) {
    if (regex.test(t)) return category;
  }
  return null;
}

/**
 * Task 6A.3: Bing & Google Merchant Center wizard.
 * Audits store readiness for shopping syndication and provides feed guidance.
 */
export async function getMerchantCenterStatus(admin: any, shopDomain: string) {
  const [shopRes, audit] = await Promise.all([
    executeShopifyGraphQL(
      admin,
      `query merchantStatus {
        shop {
          name
          currencyCode
          shipsToCountries
        }
      }`
    ),
    calculateAiProductCompleteness(admin, shopDomain),
  ]);

  const shop = (shopRes as any)?.data?.shop;
  const total = audit.totalProducts;
  const barcodePct = audit.fieldCoverage.hasGtinBarcodePct;
  const readyForGmc = barcodePct >= 80 && audit.averageScore >= 70;

  return {
    shopName: shop?.name || shopDomain,
    currency: shop?.currencyCode || "USD",
    totalProducts: total,
    barcodeCoveragePct: barcodePct,
    aiCompletenessScore: audit.averageScore,
    isFeedReady: readyForGmc,
    publicFeedUrl: `https://${shopDomain}/collections/all.atom`,
    recommendations: [
      barcodePct < 80
        ? `Only ${barcodePct}% of products have barcodes (GTIN/UPC). Google Merchant Center rejects products without GTINs if brand is specified.`
        : "Barcode / GTIN coverage meets Google Merchant Center standards.",
      audit.fieldCoverage.hasProductTypePct < 100
        ? "Some products lack categories. Set Product Type for all products to improve Google Product Category mapping."
        : "Product taxonomy and types are fully mapped.",
      "Ensure store policies (Return Policy & Shipping) are published in Shopify Admin > Settings > Policies.",
    ],
  };
}
