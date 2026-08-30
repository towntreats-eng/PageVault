import prisma from "../db.server";

export interface SchemaConfig {
  productSchema: boolean;
  organizationSchema: boolean;
  websiteSchema: boolean;
  breadcrumbsSchema: boolean;
  faqSchema: boolean;
}

export async function getSchemaConfig(shopDomain: string): Promise<SchemaConfig> {
  const setting = await prisma.seoSetting.findUnique({
    where: { shop_domain: shopDomain },
  });

  return {
    productSchema: setting?.auto_jsonld_schema ?? true,
    organizationSchema: true,
    websiteSchema: true,
    breadcrumbsSchema: true,
    faqSchema: true,
  };
}

export function generateOrganizationSchema(shopName: string, shopDomain: string, logoUrl?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": shopName,
    "url": `https://${shopDomain}`,
    "logo": logoUrl || `https://${shopDomain}/logo.png`,
    "sameAs": [
      `https://facebook.com/${shopName}`,
      `https://instagram.com/${shopName}`,
    ],
  };
}

export function generateWebsiteSearchSchema(shopName: string, shopDomain: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": shopName,
    "url": `https://${shopDomain}`,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `https://${shopDomain}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function generateProductJsonLd(product: {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  price: string;
  currency: string;
  sku?: string;
  inStock: boolean;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "description": product.description,
    "image": [product.imageUrl],
    "sku": product.sku || "N/A",
    "offers": {
      "@type": "Offer",
      "url": product.url,
      "priceCurrency": product.currency || "USD",
      "price": product.price,
      "availability": product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "128",
    },
  };
}
