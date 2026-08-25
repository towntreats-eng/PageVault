import { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Badge,
  BlockStack,
  InlineStack,
  Grid,
  Select,
  Button,
  Box,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Retrieve active subscription or shop plan
  const shopRecord = await db.shop.findUnique({ where: { domain: shopDomain } });
  const activeSubscription = await db.subscription.findFirst({
    where: { shop_domain: shopDomain, status: "active" },
  });

  const activeTier = activeSubscription?.tier || shopRecord?.plan || "free";

  // Catalog item dataset (10 static items for Phase 1)
  const items = [
    {
      id: "cat_1",
      type: "page",
      name: "High-Converting Product Page (PDP)",
      slug: "pdp-high-conversion",
      block_handle: "pdp_high_conversion",
      niche_tags: ["D2C", "Electronics", "Fashion"],
      style_tags: ["Modern", "High-Converting"],
      min_tier: "free",
      description: "High-converting PDP layout featuring sticky product gallery, specs checklist, risk-free guarantee badge, and integrated courier pincode checker.",
      demo_url: "https://shopforge-demo.myshopify.com/pages/pdp-demo",
    },
    {
      id: "cat_2",
      type: "page",
      name: "Multi-Product Sales Landing Page",
      slug: "landing-multi-product",
      block_handle: "landing_multi_product",
      niche_tags: ["Festive Drop", "Multi-Product"],
      style_tags: ["Bold", "Vibrant"],
      min_tier: "free",
      description: "Full-page campaign landing layout featuring a hero offer banner, category grid, flagship product cards, and instant COD checkout buttons.",
      demo_url: "https://shopforge-demo.myshopify.com/pages/landing-demo",
    },
    {
      id: "cat_3",
      type: "page",
      name: "Brand Story & Founder About Page",
      slug: "brand-story-about",
      block_handle: "brand_story_about",
      niche_tags: ["Brand Story", "D2C General"],
      style_tags: ["Clean", "Minimalist"],
      min_tier: "free",
      description: "Founder note, brand timeline, mission philosophy, and press trust badges.",
      demo_url: "https://shopforge-demo.myshopify.com/pages/about-demo",
    },
    {
      id: "cat_4",
      type: "page",
      name: "Flash Sale & Drop Event Page",
      slug: "flash-sale-event",
      block_handle: "flash_sale_event",
      niche_tags: ["Flash Sale", "Urgency"],
      style_tags: ["High-Urgency"],
      min_tier: "free",
      description: "Countdown timer drop page with instant flash discount tags and deal claim buttons.",
      demo_url: "https://shopforge-demo.myshopify.com/pages/flash-demo",
    },
    {
      id: "cat_5",
      type: "page",
      name: "Product Comparison & Spec Matrix Page",
      slug: "product-comparison",
      block_handle: "product_comparison",
      niche_tags: ["Comparison", "Tech"],
      style_tags: ["Structured Matrix"],
      min_tier: "free",
      description: "Side-by-side spec comparison table highlighting recommended picks and feature differences.",
      demo_url: "https://shopforge-demo.myshopify.com/pages/compare-demo",
    },
    {
      id: "cat_6",
      type: "page",
      name: "FAQ & Trust Center Page",
      slug: "faq-trust-center",
      block_handle: "faq_trust_center",
      niche_tags: ["Support", "Trust"],
      style_tags: ["Accordion List"],
      min_tier: "free",
      description: "Collapsible accordion Q&A covering shipping timelines, COD rules, 7-day returns, and warranty policies.",
      demo_url: "https://shopforge-demo.myshopify.com/pages/faq-demo",
    },
    {
      id: "cat_7",
      type: "section",
      name: "India COD & Courier Pincode Checker Bar",
      slug: "sec-india-pincode-cod",
      block_handle: "sec_india_pincode_cod",
      niche_tags: ["India Essential", "Logistics"],
      style_tags: ["Interactive Input"],
      min_tier: "free",
      description: "Courier serviceability lookup input, COD badge, estimated delivery days, and UPI trustmarks.",
      demo_url: "https://shopforge-demo.myshopify.com/pages/pincode-demo",
    },
    {
      id: "cat_8",
      type: "section",
      name: "Photo Review Grid & Star Rating Summary",
      slug: "sec-photo-review-grid",
      block_handle: "sec_photo_review_grid",
      niche_tags: ["Social Proof", "Reviews"],
      style_tags: ["Photo Grid"],
      min_tier: "free",
      description: "Star rating summary header with customer review cards, verified buyer tags, and photo modal preview.",
      demo_url: "https://shopforge-demo.myshopify.com/pages/reviews-demo",
    },
    {
      id: "cat_9",
      type: "section",
      name: "Sticky Add-To-Cart Bar with Real Urgency",
      slug: "sec-sticky-urgency-atc",
      block_handle: "sec_sticky-urgency-atc",
      niche_tags: ["Conversion", "Urgency"],
      style_tags: ["Floating Bar"],
      min_tier: "free",
      description: "Scroll-triggered floating sticky ATC bar showing product image, price, inventory status, and instant add button.",
      demo_url: "https://shopforge-demo.myshopify.com/pages/sticky-demo",
    },
    {
      id: "cat_10",
      type: "section",
      name: "Product Bundle & Frequently Bought Together",
      slug: "sec-product-bundle-upsell",
      block_handle: "sec_product_bundle_upsell",
      niche_tags: ["Upsell", "Bundles"],
      style_tags: ["Dashed Bundle Card"],
      min_tier: "free",
      description: "Frequently bought together product card with total discount calculation and one-click add bundle.",
      demo_url: "https://shopforge-demo.myshopify.com/pages/bundle-demo",
    },
  ];

  return {
    shopDomain,
    activeTier,
    items,
  };
};

export default function ShopForgeCatalog() {
  const { shopDomain, activeTier, items } = useLoaderData<typeof loader>();
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredItems = items.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    return true;
  });

  return (
    <Page title="Shop Forge — Page & Section Library">
      <TitleBar title="Catalog | Shop Forge" />
      <BlockStack gap="500">
        <Banner title="Phase 1 Library Active — 10 Free Static Designs Included" tone="info">
          <p>
            All 10 designs are 100% token-driven and automatically inherit your active store theme colors and typography.
          </p>
        </Banner>

        {/* Filters */}
        <Card>
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="400">
              <Select
                label="Component Type"
                options={[
                  { label: "All Items (10)", value: "all" },
                  { label: "Full Pages (6)", value: "page" },
                  { label: "Theme Sections (4)", value: "section" },
                ]}
                value={typeFilter}
                onChange={(val) => setTypeFilter(val)}
              />
            </InlineStack>
            <Text as="span" variant="bodySm" tone="subdued">
              Showing {filteredItems.length} of {items.length} items
            </Text>
          </InlineStack>
        </Card>

        {/* Items Grid */}
        <Grid>
          {filteredItems.map((item) => (
            <Grid.Cell key={item.id} columnSpan={{ xs: 12, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Badge tone={item.type === "page" ? "attention" : "info"}>
                      {item.type.toUpperCase()}
                    </Badge>
                    <Badge tone="success">FREE TIER</Badge>
                  </InlineStack>

                  <Text as="h3" variant="headingSm">
                    {item.name}
                  </Text>

                  <Text as="p" variant="bodySm" tone="subdued">
                    {item.description}
                  </Text>

                  <InlineStack gap="200">
                    {item.niche_tags.map((tag) => (
                      <Badge key={tag} tone="subdued">
                        {tag}
                      </Badge>
                    ))}
                  </InlineStack>

                  <Box paddingWithBorder="200" borderRadius="200" background="bg-surface-secondary">
                    <InlineStack align="space-between" blockAlign="center">
                      <Button
                        url={item.demo_url}
                        target="_blank"
                        variant="tertiary"
                      >
                        Live Demo
                      </Button>

                      <Button
                        variant="primary"
                        url={`https://${shopDomain}/admin/themes/current/editor?context=apps`}
                        target="_blank"
                      >
                        Add to Store Theme
                      </Button>
                    </InlineStack>
                  </Box>
                </BlockStack>
              </Card>
            </Grid.Cell>
          ))}
        </Grid>
      </BlockStack>
    </Page>
  );
}
