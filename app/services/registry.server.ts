export type ShopifyTemplateType = "index" | "page" | "product";

export interface RegistryEntry {
  id: string;
  targetTemplate: ShopifyTemplateType;
  blocks: string[];
}

export const TEMPLATE_REGISTRY: Record<string, RegistryEntry> = {
  // HP 1: Flagship D2C
  cat_1: {
    id: "cat_1",
    targetTemplate: "index", // Homepages target index.json
    blocks: [
      "hp1_sec_02_announcement",
      "hp1_sec_01_hero",
      "hp1_sec_03_trust_badges",
      "hp1_sec_04_bento_grid",
      "hp1_sec_05_trending_carousel",
      "hp1_sec_06_video_reels",
      "hp1_sec_07_interactive_quiz",
      "hp1_sec_08_comparison_table",
      "hp1_sec_09_customer_reviews",
      "hp1_sec_10_press_bar",
      "hp1_sec_11_faq_accordion",
      "hp1_sec_12_sticky_atc"
    ]
  },
  // HP 2: Luxury Fashion
  cat_2: {
    id: "cat_2",
    targetTemplate: "index",
    blocks: [
      "hp2_sec_01_hero_lookbook",
      "hp2_sec_04_collection_grid",
      "hp2_sec_02_shop_the_look",
      "hp2_sec_03_lead_capture"
    ]
  },
  // PDP 1: High Conversion PDP
  cat_11: {
    id: "cat_11",
    targetTemplate: "product", // High conversion product page
    blocks: [
      "pdp_high_conversion", // Placeholder block handle for now
      "sec_photo_review_grid",
      "sec_product_bundle_upsell"
    ]
  },
  // Default fallback for single sections
  default_section: {
    id: "default_section",
    targetTemplate: "page",
    blocks: []
  }
};

/**
 * Gets the registry entry for a specific catalog item.
 * If not found in the hardcoded registry, it attempts to derive it dynamically
 * from the item's `type` field (page vs section).
 */
export function getRegistryEntry(itemId: string, itemType: "page" | "section", itemBlockHandle: string): RegistryEntry {
  if (TEMPLATE_REGISTRY[itemId]) {
    return TEMPLATE_REGISTRY[itemId];
  }
  
  // Dynamic fallback for items not strictly mapped
  // We infer the target based on the funnel stage, niche, or just default to 'page'
  let target: ShopifyTemplateType = "page";
  if (itemType === "page" && itemId.includes("home")) {
    target = "index";
  } else if (itemType === "page" && itemId.includes("pdp")) {
    target = "product";
  }

  return {
    id: itemId,
    targetTemplate: target,
    blocks: [itemBlockHandle] // Use the catalog's single block handle as fallback
  };
}
