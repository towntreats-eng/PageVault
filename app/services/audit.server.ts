/**
 * Transparent, Rule-Based Store SEO Audit Engine
 * Non-arbitrary, deterministic scoring based on search engine best practices.
 */

import prisma from "../db.server";

export interface AuditDefect {
  resourceType: "product" | "collection" | "page" | "article" | "theme";
  resourceGid: string;
  issueType: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
  recommendedFix: string;
}

export interface CategoryScore {
  category: string;
  score: number;
  totalChecks: number;
  passedChecks: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
}

export interface StoreAuditSummary {
  overallScore: number;
  totalResources: number;
  optimizedCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  categories: CategoryScore[];
  defects: AuditDefect[];
}

export function auditProduct(product: {
  shopifyGid: string;
  title: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  imagesJson: string | null;
}): AuditDefect[] {
  const defects: AuditDefect[] = [];
  const activeTitle = (product.seoTitle || product.title || "").trim();
  const activeDesc = (product.seoDescription || "").trim();
  const bodyText = (product.description || "").replace(/<[^>]*>/g, " ").trim();

  // 1. Title Audit
  if (!activeTitle) {
    defects.push({
      resourceType: "product",
      resourceGid: product.shopifyGid,
      issueType: "missing_title",
      severity: "critical",
      title: "Missing Product Title",
      description: "This product has no identifiable title in Shopify.",
      impact: "Search engines and shoppers cannot index or understand what this product is.",
      recommendedFix: "Provide a clear, descriptive product title of 30–60 characters.",
    });
  } else if (activeTitle.length < 20) {
    defects.push({
      resourceType: "product",
      resourceGid: product.shopifyGid,
      issueType: "short_title",
      severity: "high",
      title: "Product Title Too Short",
      description: `Title is only ${activeTitle.length} characters ("${activeTitle}").`,
      impact: "Short titles miss relevant search queries, keyword intent, and key brand qualifiers.",
      recommendedFix: "Expand title to 30–60 characters with primary keyword, material, or key differentiator.",
    });
  } else if (activeTitle.length > 70) {
    defects.push({
      resourceType: "product",
      resourceGid: product.shopifyGid,
      issueType: "long_title",
      severity: "medium",
      title: "Product Title Exceeds SERP Limit",
      description: `Title is ${activeTitle.length} characters, exceeding Google's display boundary (approx 60–70 chars).`,
      impact: "Google will truncate the title with an ellipsis in search results, hiding valuable buying signals.",
      recommendedFix: "Condense the title to under 65 characters while keeping target keywords upfront.",
    });
  }

  // 2. Meta Description Audit
  if (!activeDesc) {
    defects.push({
      resourceType: "product",
      resourceGid: product.shopifyGid,
      issueType: "missing_meta_desc",
      severity: "critical",
      title: "Missing SEO Meta Description",
      description: "No dedicated SEO meta description tag is configured for this product.",
      impact: "Search engines will auto-generate snippets from random page text, reducing organic click-through rate (CTR).",
      recommendedFix: "Write a compelling, benefit-driven meta description of 120–155 characters.",
    });
  } else if (activeDesc.length < 80) {
    defects.push({
      resourceType: "product",
      resourceGid: product.shopifyGid,
      issueType: "short_meta_desc",
      severity: "high",
      title: "Meta Description Too Short",
      description: `Meta description is only ${activeDesc.length} characters (ideal is 120–155 chars).`,
      impact: "Underutilized snippet space limits your ability to convey value props and call to actions in search results.",
      recommendedFix: "Expand description with key customer benefits, specs, and a clear reason to click.",
    });
  } else if (activeDesc.length > 165) {
    defects.push({
      resourceType: "product",
      resourceGid: product.shopifyGid,
      issueType: "long_meta_desc",
      severity: "medium",
      title: "Meta Description Truncated in SERPs",
      description: `Meta description is ${activeDesc.length} characters, exceeding Google's maximum display snippet.`,
      impact: "Search engines will cut off the end of your sentence, potentially hiding phone numbers or CTAs.",
      recommendedFix: "Shorten meta description to between 130 and 155 characters.",
    });
  }

  // 3. Body Content / Thin Content
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  if (wordCount < 30) {
    defects.push({
      resourceType: "product",
      resourceGid: product.shopifyGid,
      issueType: "thin_content",
      severity: "high",
      title: "Thin Product Description",
      description: `Product body copy contains only ${wordCount} words.`,
      impact: "Google Panda and modern helpful content systems penalize low-effort or thin product listings.",
      recommendedFix: "Enrich the product description with specifications, benefits, care instructions, and FAQs (150+ words).",
    });
  }

  // 4. Image ALT Text
  if (product.imagesJson) {
    try {
      const images: Array<{ id: string; url: string; altText: string | null }> = JSON.parse(product.imagesJson);
      const missingAltImages = images.filter((img) => !img.altText || img.altText.trim() === "");
      if (missingAltImages.length > 0) {
        defects.push({
          resourceType: "product",
          resourceGid: product.shopifyGid,
          issueType: "missing_image_alt",
          severity: "high",
          title: `Missing ALT Text on ${missingAltImages.length} Image(s)`,
          description: `${missingAltImages.length} of ${images.length} product photos have empty ALT tags.`,
          impact: "Loses organic traffic from Google Images and violates web accessibility standards (WCAG).",
          recommendedFix: "Add descriptive ALT attributes incorporating product type and distinctive features.",
        });
      }
    } catch {
      // ignore parse error
    }
  }

  return defects;
}

export function auditCollection(collection: {
  shopifyGid: string;
  title: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}): AuditDefect[] {
  const defects: AuditDefect[] = [];
  const activeTitle = (collection.seoTitle || collection.title || "").trim();
  const activeDesc = (collection.seoDescription || "").trim();
  const bodyText = (collection.description || "").replace(/<[^>]*>/g, " ").trim();

  if (!activeDesc) {
    defects.push({
      resourceType: "collection",
      resourceGid: collection.shopifyGid,
      issueType: "missing_meta_desc",
      severity: "high",
      title: "Missing Collection Meta Description",
      description: "This category/collection has no SEO meta description defined.",
      impact: "Category pages are high-intent landing pages; missing snippets lower search ranking and CTR.",
      recommendedFix: "Add a 120–155 character overview summarizing the products found in this collection.",
    });
  }

  if (bodyText.length < 20) {
    defects.push({
      resourceType: "collection",
      resourceGid: collection.shopifyGid,
      issueType: "thin_collection_content",
      severity: "medium",
      title: "Missing Collection Header Description",
      description: "Collection has virtually no introductory text.",
      impact: "Category pages without descriptive contextual copy rank poorly for broad commercial keywords.",
      recommendedFix: "Add 1–2 paragraphs describing the collection theme, curation criteria, and buyer guidance.",
    });
  }

  return defects;
}

export function auditPage(page: {
  shopifyGid: string;
  title: string;
  body: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}): AuditDefect[] {
  const defects: AuditDefect[] = [];
  if (!page.seoDescription && (!page.body || page.body.length < 100)) {
    defects.push({
      resourceType: "page",
      resourceGid: page.shopifyGid,
      issueType: "thin_page",
      severity: "medium",
      title: "Thin Page Content & Missing Meta",
      description: `Store page "${page.title}" has sparse content and no meta description.`,
      impact: "May be flagged as low-quality or soft 404 by search engine crawlers.",
      recommendedFix: "Add informative content and an explicit SEO meta description.",
    });
  }
  return defects;
}

export function auditArticle(article: {
  shopifyGid: string;
  title: string;
  body: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}): AuditDefect[] {
  const defects: AuditDefect[] = [];
  const words = (article.body || "").replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;

  if (words < 300) {
    defects.push({
      resourceType: "article",
      resourceGid: article.shopifyGid,
      issueType: "short_blog_article",
      severity: "medium",
      title: "Blog Article Too Short (< 300 words)",
      description: `Article has only ${words} words. Long-form informational queries require deeper coverage.`,
      impact: "Search engines favor comprehensive, well-researched guides for informational ranking.",
      recommendedFix: "Expand the article to at least 800+ words with headings, FAQs, and product links.",
    });
  }

  if (!article.seoDescription) {
    defects.push({
      resourceType: "article",
      resourceGid: article.shopifyGid,
      issueType: "missing_article_meta",
      severity: "high",
      title: "Missing Blog SEO Meta Description",
      description: "The article does not have an explicit search snippet meta description.",
      impact: "Lowers social share previews and search result click-through rates.",
      recommendedFix: "Write an enticing 140-character summary that answers searcher intent.",
    });
  }

  return defects;
}

/**
 * Compute storewide SEO health score and breakdown
 */
export async function calculateStoreAudit(shopDomain: string): Promise<StoreAuditSummary> {
  const [products, collections, pages, articles] = await Promise.all([
    prisma.productRecord.findMany({ where: { shopDomain } }),
    prisma.collectionRecord.findMany({ where: { shopDomain } }),
    prisma.pageRecord.findMany({ where: { shopDomain } }),
    prisma.articleRecord.findMany({ where: { shopDomain } }),
  ]);

  const allDefects: AuditDefect[] = [];

  for (const p of products) {
    allDefects.push(...auditProduct(p));
  }
  for (const c of collections) {
    allDefects.push(...auditCollection(c));
  }
  for (const pg of pages) {
    allDefects.push(...auditPage(pg));
  }
  for (const a of articles) {
    allDefects.push(...auditArticle(a));
  }

  // Count severities
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const d of allDefects) {
    if (d.severity === "critical") criticalCount++;
    else if (d.severity === "high") highCount++;
    else if (d.severity === "medium") mediumCount++;
    else lowCount++;
  }

  const totalResources = products.length + collections.length + pages.length + articles.length;
  const optimizedCount = products.filter((p) => p.isOptimized).length;

  // Transparent calculation:
  // Base 100.
  // Critical issues: -8 pts each (max 40)
  // High issues: -4 pts each (max 30)
  // Medium issues: -2 pts each (max 20)
  // Scaled by store catalog size to prevent small stores having negative score
  const scale = totalResources > 0 ? Math.max(1, totalResources / 10) : 1;
  const penalty =
    Math.min(45, (criticalCount / scale) * 10) +
    Math.min(30, (highCount / scale) * 5) +
    Math.min(15, (mediumCount / scale) * 2);

  const rawScore = Math.round(100 - penalty);
  const overallScore = Math.max(15, Math.min(100, totalResources === 0 ? 100 : rawScore));

  // Build category score breakdown
  const categories: CategoryScore[] = [
    {
      category: "Product SEO",
      score: Math.max(20, Math.round(100 - (allDefects.filter((d) => d.resourceType === "product").length * 4))),
      totalChecks: products.length * 4,
      passedChecks: Math.max(0, products.length * 4 - allDefects.filter((d) => d.resourceType === "product").length),
      criticalIssues: allDefects.filter((d) => d.resourceType === "product" && d.severity === "critical").length,
      highIssues: allDefects.filter((d) => d.resourceType === "product" && d.severity === "high").length,
      mediumIssues: allDefects.filter((d) => d.resourceType === "product" && d.severity === "medium").length,
    },
    {
      category: "Metadata & Snippets",
      score: Math.max(20, Math.round(100 - (allDefects.filter((d) => d.issueType.includes("meta")).length * 5))),
      totalChecks: totalResources,
      passedChecks: Math.max(0, totalResources - allDefects.filter((d) => d.issueType.includes("meta")).length),
      criticalIssues: allDefects.filter((d) => d.issueType.includes("meta") && d.severity === "critical").length,
      highIssues: allDefects.filter((d) => d.issueType.includes("meta") && d.severity === "high").length,
      mediumIssues: allDefects.filter((d) => d.issueType.includes("meta") && d.severity === "medium").length,
    },
    {
      category: "Content & Readability",
      score: Math.max(25, Math.round(100 - (allDefects.filter((d) => d.issueType.includes("content") || d.issueType.includes("short")).length * 6))),
      totalChecks: totalResources,
      passedChecks: Math.max(0, totalResources - allDefects.filter((d) => d.issueType.includes("content")).length),
      criticalIssues: 0,
      highIssues: allDefects.filter((d) => d.issueType.includes("thin")).length,
      mediumIssues: allDefects.filter((d) => d.issueType.includes("short")).length,
    },
    {
      category: "Image SEO & Alts",
      score: Math.max(30, Math.round(100 - (allDefects.filter((d) => d.issueType === "missing_image_alt").length * 8))),
      totalChecks: products.length,
      passedChecks: Math.max(0, products.length - allDefects.filter((d) => d.issueType === "missing_image_alt").length),
      criticalIssues: 0,
      highIssues: allDefects.filter((d) => d.issueType === "missing_image_alt").length,
      mediumIssues: 0,
    },
  ];

  return {
    overallScore,
    totalResources,
    optimizedCount,
    criticalCount,
    highCount,
    mediumCount,
    categories,
    defects: allDefects,
  };
}
