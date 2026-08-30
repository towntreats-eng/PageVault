import prisma from "../db.server";
import { fetchAndParsePage } from "./parser.server";

export interface SchemaConfig {
  productSchema: boolean;
  organizationSchema: boolean;
  websiteSchema: boolean;
  breadcrumbsSchema: boolean;
  faqSchema: boolean;
  articleSchema: boolean;
  itemListSchema: boolean;
  localBusinessSchema: boolean;
}

export async function detectSchemaConflicts(shopDomain: string, productUrl: string) {
  const parsed = await fetchAndParsePage(productUrl);
  const existingProductSchema = parsed.jsonLdBlocks.find((b) => b["@type"] === "Product");

  if (existingProductSchema) {
    console.log(`[Schema Conflict Detector] Product schema already emitted by theme/app for ${productUrl}. ProofSEO Product schema will stay DISABLED by default to prevent duplicate schema penalties.`);
    return {
      hasConflict: true,
      conflictSource: "Theme / Existing App",
      existingFields: Object.keys(existingProductSchema),
    };
  }

  return {
    hasConflict: false,
    conflictSource: null,
    existingFields: [],
  };
}

export function generateProductJsonLd(product: {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  price: string;
  currency?: string;
  sku?: string;
  inStock: boolean;
  realRatingValue?: number;
  realReviewCount?: number;
}) {
  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "description": product.description,
    "image": product.imageUrl ? [product.imageUrl] : [],
    "sku": product.sku || undefined,
    "offers": {
      "@type": "Offer",
      "url": product.url,
      "priceCurrency": product.currency || "USD",
      "price": product.price,
      "availability": product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  // Task 3.4 & 06-RULES.md §B3: aggregateRating is emitted ONLY when real review data exists
  if (product.realRatingValue && product.realReviewCount && product.realReviewCount > 0) {
    schema["aggregateRating"] = {
      "@type": "AggregateRating",
      "ratingValue": product.realRatingValue.toString(),
      "reviewCount": product.realReviewCount.toString(),
    };
  }

  return schema;
}

export function generateBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url,
    })),
  };
}

export function generateOrganizationJsonLd(shopName: string, shopDomain: string, logoUrl?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": shopName,
    "url": `https://${shopDomain}`,
    "logo": logoUrl || `https://${shopDomain}/logo.png`,
  };
}

export function generateFaqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };
}

export function generateArticleJsonLd(article: {
  title: string;
  description: string;
  url: string;
  author: string;
  datePublished: string;
  imageUrl?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.description,
    "image": article.imageUrl ? [article.imageUrl] : [],
    "datePublished": article.datePublished,
    "author": {
      "@type": "Person",
      "name": article.author,
    },
  };
}

export function generateItemListJsonLd(collectionName: string, items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": collectionName,
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "url": item.url,
    })),
  };
}

export function generateLocalBusinessJsonLd(shopName: string, address?: string, phone?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": shopName,
    "telephone": phone || undefined,
    "address": address || undefined,
  };
}
