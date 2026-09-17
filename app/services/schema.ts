/**
 * Schema.org & Rich Snippets Utilities
 * Isomorphic: Can be used in both server loaders and client preview components.
 */

export interface SchemaScoreBreakdown {
  totalScore: number;
  contentAlignment: number; // Max 25
  richResultEligibility: number; // Max 25
  dataCompleteness: number; // Max 20
  technicalCorrectness: number; // Max 15
  maintenanceScore: number; // Max 10
  spamSafety: number; // Max 5
  recommendations: string[];
}

export class SchemaService {
  /**
   * Build complete Product JSON-LD schema
   */
  static buildProductJsonLd(
    product: {
      title: string;
      description?: string | null;
      vendor?: string | null;
      handle: string;
      imagesJson?: string | null;
    },
    shopDomain: string,
    currency = "USD",
    price = "49.99"
  ) {
    let images: string[] = [];
    if (product.imagesJson) {
      try {
        const parsed = JSON.parse(product.imagesJson);
        images = parsed.map((img: any) => img.url || img.originalSrc).filter(Boolean);
      } catch (e) {
        images = [];
      }
    }

    const cleanDescription = (product.description || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: product.title,
      image: images.length > 0 ? images : undefined,
      description: cleanDescription || `${product.title} from ${product.vendor || shopDomain}`,
      brand: {
        "@type": "Brand",
        name: product.vendor || shopDomain.replace(".myshopify.com", ""),
      },
      offers: {
        "@type": "Offer",
        url: `https://${shopDomain}/products/${product.handle}`,
        priceCurrency: currency,
        price: price,
        itemCondition: "https://schema.org/NewCondition",
        availability: "https://schema.org/InStock",
        seller: {
          "@type": "Organization",
          name: shopDomain.replace(".myshopify.com", ""),
        },
      },
    };
  }

  /**
   * Build FAQPage JSON-LD schema (Crucial for AEO / GEO citations)
   */
  static buildFaqJsonLd(faqs: Array<{ question: string; answer: string }>) {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    };
  }

  /**
   * Build Organization & WebSite JSON-LD schema
   */
  static buildStoreJsonLd(shopDomain: string, shopName?: string | null) {
    const name = shopName || shopDomain.replace(".myshopify.com", "");
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `https://${shopDomain}/#organization`,
          name: name,
          url: `https://${shopDomain}`,
        },
        {
          "@type": "WebSite",
          "@id": `https://${shopDomain}/#website`,
          url: `https://${shopDomain}`,
          name: name,
          publisher: {
            "@id": `https://${shopDomain}/#organization`,
          },
          potentialAction: {
            "@type": "SearchAction",
            target: `https://${shopDomain}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
      ],
    };
  }

  /**
   * Build BreadcrumbList JSON-LD schema
   */
  static buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  /**
   * Calculate Schema Eligibility & Impact Index (0-100) per schema-markup skill
   */
  static calculateSchemaIndex(
    product: {
      title: string;
      description?: string | null;
      vendor?: string | null;
      imagesJson?: string | null;
    }
  ): SchemaScoreBreakdown {
    let contentAlignment = 25;
    let richResultEligibility = 25;
    let dataCompleteness = 20;
    let technicalCorrectness = 15;
    const maintenanceScore = 10;
    const spamSafety = 5;
    const recommendations: string[] = [];

    // Check images
    let hasImages = false;
    if (product.imagesJson) {
      try {
        const imgs = JSON.parse(product.imagesJson);
        hasImages = Array.isArray(imgs) && imgs.length > 0;
      } catch (e) {
        hasImages = false;
      }
    }

    if (!hasImages) {
      dataCompleteness -= 5;
      richResultEligibility -= 5;
      recommendations.push("Add high-resolution product imagery to unlock visual Google Shopping rich snippets.");
    }

    // Check description completeness
    const descLength = (product.description || "").length;
    if (descLength < 60) {
      dataCompleteness -= 6;
      recommendations.push("Expand product description to at least 100 characters for rich snippet extraction.");
    }

    // Check vendor / brand
    if (!product.vendor) {
      dataCompleteness -= 4;
      recommendations.push("Assign an explicit brand or vendor to guarantee structured Brand entity linking.");
    }

    const totalScore = Math.max(
      30,
      contentAlignment +
        richResultEligibility +
        dataCompleteness +
        technicalCorrectness +
        maintenanceScore +
        spamSafety
    );

    return {
      totalScore,
      contentAlignment,
      richResultEligibility,
      dataCompleteness,
      technicalCorrectness,
      maintenanceScore,
      spamSafety,
      recommendations,
    };
  }

  /**
   * Generate ready-to-paste Liquid template snippet
   */
  static generateLiquidSnippet(shopDomain: string) {
    return `{% comment %}
  Generated by Shopify AI SEO Platform
  Structured Data for Google Rich Snippets & AI Engines
{% endcomment %}
{% if template contains 'product' %}
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": {{ product.title | json }},
  "url": "{{ shop.url }}{{ product.url }}",
  {% if product.featured_image %}
  "image": [
    "https:{{ product.featured_image.src | image_url: width: 1024 }}"
  ],
  {% endif %}
  "description": {{ product.description | strip_html | truncatewords: 60 | json }},
  "brand": {
    "@type": "Brand",
    "name": {{ product.vendor | json }}
  },
  "offers": {
    "@type": "Offer",
    "priceCurrency": {{ cart.currency.iso_code | json }},
    "price": "{{ product.price | money_without_currency | remove: ',' }}",
    "availability": "https://schema.org/{% if product.available %}InStock{% else %}OutOfStock{% endif %}",
    "itemCondition": "https://schema.org/NewCondition",
    "seller": {
      "@type": "Organization",
      "name": {{ shop.name | json }}
    }
  }
}
</script>
{% endif %}`;
  }
}
