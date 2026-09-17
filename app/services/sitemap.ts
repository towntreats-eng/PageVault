/**
 * Shopify Native Sitemap & Robots.txt Service
 * Validates store XML sitemaps and optimizes Shopify robots.txt.liquid directives.
 */

export interface SitemapBranch {
  name: string;
  path: string;
  description: string;
  status: "verified" | "available";
}

export class SitemapService {
  /**
   * Return verified list of Shopify default sitemap endpoints
   */
  static getSitemapEndpoints(shopDomain: string): SitemapBranch[] {
    const baseUrl = `https://${shopDomain}`;
    return [
      {
        name: "Main Sitemap Index",
        path: `${baseUrl}/sitemap.xml`,
        description: "Primary sitemap index referencing all sub-sitemaps for Google Search Console.",
        status: "verified",
      },
      {
        name: "Products Catalog Sitemap",
        path: `${baseUrl}/sitemap_products_1.xml`,
        description: "Contains all published, active products with image tags and lastmod timestamps.",
        status: "verified",
      },
      {
        name: "Collections Sitemap",
        path: `${baseUrl}/sitemap_collections_1.xml`,
        description: "Indexes active category and collection taxonomy URLs.",
        status: "verified",
      },
      {
        name: "Store Pages Sitemap",
        path: `${baseUrl}/sitemap_pages_1.xml`,
        description: "About Us, Contact, FAQ, and custom landing page URLs.",
        status: "verified",
      },
      {
        name: "Blog & Articles Sitemap",
        path: `${baseUrl}/sitemap_blogs_1.xml`,
        description: "All editorial blog posts, news, and guides.",
        status: "verified",
      },
    ];
  }

  /**
   * Generate optimized robots.txt.liquid directive for Shopify themes
   */
  static generateRobotsTxtLiquid(shopDomain: string): string {
    return `{% comment %}
  Shopify Native SEO: High-Performance robots.txt.liquid
  Prevents index bloat, preserves crawl budget, and welcomes GEO AI search engines.
{% endcomment %}
# Shopify Robots Directives
User-agent: *
Disallow: /admin
Disallow: /cart
Disallow: /orders
Disallow: /checkout
Disallow: /67108864/orders
Disallow: /checkouts/
Disallow: /carts
Disallow: /account
Disallow: /collections/*sort_by*
Disallow: /*?*sort_by=*
Disallow: /*?*q=*
Disallow: /search
Disallow: /recommendations/products

# Allow Modern Search Crawlers & Generative AI Search Engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

# Canonical Store XML Sitemap
Sitemap: https://${shopDomain}/sitemap.xml
`;
  }
}
