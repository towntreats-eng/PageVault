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

/**
 * Looks at a REAL product page and reports whether the theme or another app is
 * already emitting Product schema.
 *
 * If the page could not be fetched we return checked:false. The previous version
 * was called with a hardcoded /products/sample-product URL, which 404s on every
 * real store, so it always reported "no conflict" and our schema would have been
 * enabled on top of the theme's - producing exactly the duplicate structured data
 * described in 01-PRODUCT.md Gap 3.
 */
export async function detectSchemaConflicts(shopDomain: string, productUrl: string) {
  const parsed = await fetchAndParsePage(productUrl);

  if (!parsed.isReachable) {
    return {
      checked: false,
      hasConflict: false,
      conflictSource: null as string | null,
      existingFields: [] as string[],
      checkedUrl: productUrl,
      reason: `We could not load ${productUrl} (HTTP ${parsed.statusCode}), so we cannot tell whether your theme already outputs Product schema. Ours stays off until we can.`,
    };
  }

  const existing = parsed.jsonLdBlocks.find((b) => {
    const t = (b as any)?.["@type"];
    return Array.isArray(t) ? t.includes("Product") : t === "Product";
  });

  if (existing) {
    return {
      checked: true,
      hasConflict: true,
      conflictSource: "Your theme or another app",
      existingFields: Object.keys(existing),
      checkedUrl: productUrl,
      reason: "Product schema is already on this page. Adding ours would create duplicate structured data, so ours stays off.",
    };
  }

  return {
    checked: true,
    hasConflict: false,
    conflictSource: null as string | null,
    existingFields: [] as string[],
    checkedUrl: productUrl,
    reason: "No Product schema found on this page.",
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
  brand?: string;
  barcode?: string;
  itemCondition?: string;
  priceValidUntil?: string;
  realRatingValue?: number;
  realReviewCount?: number;
  returnPolicy?: {
    country?: string;
    returnDays?: number;
    policyCategory?: string;
  };
  shippingDetails?: {
    rate?: string;
    country?: string;
  };
}) {
  const futureYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const offers: Record<string, any> = {
    "@type": "Offer",
    "url": product.url,
    "priceCurrency": product.currency || "USD",
    "price": product.price,
    "priceValidUntil": product.priceValidUntil || futureYear,
    "itemCondition": product.itemCondition || "https://schema.org/NewCondition",
    "availability": product.inStock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
  };

  // Task 9.8: Return Policy Schema for Google Merchant Listings
  if (product.returnPolicy) {
    offers["hasMerchantReturnPolicy"] = {
      "@type": "MerchantReturnPolicy",
      "applicableCountry": product.returnPolicy.country || "US",
      "returnPolicyCategory": product.returnPolicy.policyCategory || "https://schema.org/MerchantReturnFiniteReturnWindow",
      "merchantReturnDays": product.returnPolicy.returnDays ?? 30,
      "returnMethod": "https://schema.org/ReturnByMail",
      "returnFees": "https://schema.org/FreeReturn",
    };
  }

  // Task 9.8: Shipping Details Schema
  if (product.shippingDetails) {
    offers["shippingDetails"] = {
      "@type": "OfferShippingDetails",
      "shippingRate": {
        "@type": "MonetaryAmount",
        "value": product.shippingDetails.rate ?? "0.00",
        "currency": product.currency || "USD",
      },
      "shippingDestination": {
        "@type": "DefinedRegion",
        "addressCountry": product.shippingDetails.country || "US",
      },
      "deliveryTime": {
        "@type": "ShippingDeliveryTime",
        "handlingTime": {
          "@type": "QuantitativeValue",
          "minValue": 0,
          "maxValue": 1,
          "unitCode": "d",
        },
        "transitTime": {
          "@type": "QuantitativeValue",
          "minValue": 2,
          "maxValue": 5,
          "unitCode": "d",
        },
      },
    };
  }

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "description": product.description,
    "image": product.imageUrl ? [product.imageUrl] : [],
    "sku": product.sku || undefined,
    "offers": offers,
  };

  if (product.brand) {
    schema["brand"] = {
      "@type": "Brand",
      "name": product.brand,
    };
  }

  if (product.barcode) {
    schema["gtin"] = product.barcode;
  }

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
