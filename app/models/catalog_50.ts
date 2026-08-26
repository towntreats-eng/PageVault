export interface CatalogItem50 {
  id: string;
  type: "page" | "section";
  name: string;
  slug: string;
  block_handle: string;
  niche_tags: string[];
  style_tags: string[];
  funnel_stage: "top" | "middle" | "bottom";
  india_features: string[];
  theme_compat: ("os2" | "horizon")[];
  min_tier: "free" | "starter" | "growth" | "scale" | "pro";
  demo_url: string;
  description: string;
}

export const CATALOG_50_ITEMS: CatalogItem50[] = [
  // 10 DISTINCT FULL D2C HOME PAGE TEMPLATES (1-10)
  {
    id: "cat_1",
    type: "page",
    name: "Home Page 1: Flagship D2C Conversion Master",
    slug: "home-page-1-flagship-d2c",
    block_handle: "hp_1_flagship_d2c",
    niche_tags: ["Tech D2C", "Homepage", "Flagship"],
    style_tags: ["Dark Mode", "Glassmorphism", "Bento Grid"],
    funnel_stage: "top",
    india_features: ["cod", "pincode", "upi", "whatsapp"],
    theme_compat: ["os2", "horizon"],
    min_tier: "free",
    demo_url: "https://shopforge-demo.myshopify.com/pages/home-1",
    description: "Dark-mode tech & luxury D2C layout with glassmorphism hero, animated viewer counter, bento grid, UGC video reels & sticky ATC.",
  },
  {
    id: "cat_2",
    type: "page",
    name: "Home Page 2: Luxury Fashion Editorial & Lookbook",
    slug: "home-page-2-luxury-fashion",
    block_handle: "hp_2_luxury_fashion",
    niche_tags: ["Apparel", "Fashion", "Luxury"],
    style_tags: ["Editorial", "Split-Screen", "Gold Accents"],
    funnel_stage: "top",
    india_features: ["cod", "whatsapp"],
    theme_compat: ["os2", "horizon"],
    min_tier: "free",
    demo_url: "https://shopforge-demo.myshopify.com/pages/home-2",
    description: "High-end fashion editorial layout featuring warm ivory palette, split-screen lookbook hero, runway trend carousel & size guide bar.",
  },
  {
    id: "cat_3",
    type: "page",
    name: "Home Page 3: Clinical Beauty & Skincare Glow",
    slug: "home-page-3-clinical-beauty",
    block_handle: "hp_3_clinical_beauty",
    niche_tags: ["Beauty & Care", "Skincare"],
    style_tags: ["Clinical Clean", "Soft Rose", "Sage Green"],
    funnel_stage: "top",
    india_features: ["cod", "pincode"],
    theme_compat: ["os2", "horizon"],
    min_tier: "starter",
    demo_url: "https://shopforge-demo.myshopify.com/pages/home-3",
    description: "Clean clinical skincare layout with active ingredient counter, 14-day transformation glow proof & dermatologist approval badges.",
  },
  {
    id: "cat_4",
    type: "page",
    name: "Home Page 4: Health, Fitness & Nutrition Powerhouse",
    slug: "home-page-4-health-fitness",
    block_handle: "hp_4_health_fitness",
    niche_tags: ["Health & Fitness", "Supplements"],
    style_tags: ["Electric Crimson", "High Energy", "Stats Grid"],
    funnel_stage: "top",
    india_features: ["cod", "upi", "gst"],
    theme_compat: ["os2", "horizon"],
    min_tier: "starter",
    demo_url: "https://shopforge-demo.myshopify.com/pages/home-4",
    description: "High-energy supplement & fitness layout featuring flash drop countdown ticker, macro spec stats grid, FSSAI certification & athlete UGC reels.",
  },
  {
    id: "cat_5",
    type: "page",
    name: "Home Page 5: Modern Minimalist Home & Artisanal Lifestyle",
    slug: "home-page-5-minimalist-home",
    block_handle: "hp_5_minimalist_home",
    niche_tags: ["Home & Decor", "Furniture", "Artisanal"],
    style_tags: ["Warm Terracotta", "Natural Cream", "Minimalist"],
    funnel_stage: "top",
    india_features: ["pincode", "gst"],
    theme_compat: ["os2", "horizon"],
    min_tier: "growth",
    demo_url: "https://shopforge-demo.myshopify.com/pages/home-5",
    description: "Warm terracotta & natural cream home decor layout featuring heavy-item delivery pincode checker, artisan story timeline & interactive room hotspot grid.",
  },
  {
    id: "cat_6",
    type: "page",
    name: "Home Page 6: Gourmet Food, Organic Spices & Culinary Delights",
    slug: "home-page-6-gourmet-spices",
    block_handle: "hp_6_gourmet_spices",
    niche_tags: ["Food & Beverage", "Organic Spices"],
    style_tags: ["Warm Saffron", "Stone Ground", "Natural"],
    funnel_stage: "top",
    india_features: ["cod", "pincode"],
    theme_compat: ["os2", "horizon"],
    min_tier: "free",
    demo_url: "https://shopforge-demo.myshopify.com/pages/home-6",
    description: "Farm-direct organic spices layout with stone-ground purity seals, cold-pressed oil callouts & Kerala/Kashmir origin stories.",
  },
  {
    id: "cat_7",
    type: "page",
    name: "Home Page 7: Electronics, Smart Gadgets & Audio Pro",
    slug: "home-page-7-gadgets-audio",
    block_handle: "hp_7_gadgets_audio",
    niche_tags: ["Electronics", "Gadgets", "Audio"],
    style_tags: ["Neon Cyan", "Dark Mode", "Cyber Grid"],
    funnel_stage: "top",
    india_features: ["gst", "upi"],
    theme_compat: ["os2", "horizon"],
    min_tier: "starter",
    demo_url: "https://shopforge-demo.myshopify.com/pages/home-7",
    description: "Neon cyan gadget layout with 40dB ANC specs, 35ms ultra-low latency gaming audio matrix & 1-year GST warranty registration.",
  },
  {
    id: "cat_8",
    type: "page",
    name: "Home Page 8: Kids, Toys & Baby Care Wonderland",
    slug: "home-page-8-kids-babycare",
    block_handle: "hp_8_kids_babycare",
    niche_tags: ["Kids", "Baby Care", "Toys"],
    style_tags: ["Pastel Yellow", "Mint", "Playful"],
    funnel_stage: "top",
    india_features: ["cod"],
    theme_compat: ["os2", "horizon"],
    min_tier: "free",
    demo_url: "https://shopforge-demo.myshopify.com/pages/home-8",
    description: "Pediatrician-approved baby care layout with 100% BPA-free non-toxic toy badges, sensitive skin certifications & parent testimonials.",
  },
  {
    id: "cat_9",
    type: "page",
    name: "Home Page 9: Outdoor, Adventure & Tactical Gear",
    slug: "home-page-9-outdoor-tactical",
    block_handle: "hp_9_outdoor_tactical",
    niche_tags: ["Outdoor", "Adventure", "Tactical"],
    style_tags: ["Forest Green", "Rugged Charcoal", "Military"],
    funnel_stage: "top",
    india_features: ["cod", "gst"],
    theme_compat: ["os2", "horizon"],
    min_tier: "starter",
    demo_url: "https://shopforge-demo.myshopify.com/pages/home-9",
    description: "Mil-spec waterproof adventure layout with 1000D Cordura fabric callouts, extreme climate testing seals & 5-year expedition warranty.",
  },
  {
    id: "cat_10",
    type: "page",
    name: "Home Page 10: Festive Drop, Flash Sale & Limited Edition Event",
    slug: "home-page-10-festive-drop",
    block_handle: "hp_10_festive_drop",
    niche_tags: ["Festive Drop", "Flash Sale", "Limited Drop"],
    style_tags: ["Crimson Red", "Deep Purple", "High Urgency"],
    funnel_stage: "top",
    india_features: ["cod", "upi"],
    theme_compat: ["os2", "horizon"],
    min_tier: "growth",
    demo_url: "https://shopforge-demo.myshopify.com/pages/home-10",
    description: "High-urgency festive drop layout featuring live 60% OFF flash sale countdown, limited stock progress bars & instant discount claim buttons.",
  },

  // 11-50: Essential Core Conversion Pages & PDPs
  ...Array.from({ length: 40 }, (_, i) => {
    const idx = i + 11;

    const isPage = idx % 2 === 1;
    const categories = [
      "Shoppable Social Proof Grid",
      "Flash Sale Deal Ticker",
      "Press & Media Endorsement Bar",
      "Interactive Product Quiz Banner",
      "Comparison Specs Table",
      "VIP Club Newsletter Signup",
    ];
    const category = categories[i % categories.length];
    const tiers: ("free" | "starter" | "growth" | "scale")[] = ["free", "starter", "growth", "scale"];
    const tier = tiers[i % tiers.length];

    return {
      id: `cat_${idx}`,
      type: isPage ? ("page" as const) : ("section" as const),
      name: `${category} (CRO Design ${idx})`,
      slug: `cro-design-${idx}`,
      block_handle: isPage ? "pdp_high_conversion" : "sec_bento_grid_features",
      niche_tags: ["CRO Optimized", "D2C Essential"],
      style_tags: ["Modern", "Token-Driven", "Mobile-First"],
      funnel_stage: (i % 3 === 0 ? "top" : i % 3 === 1 ? "middle" : "bottom") as any,
      india_features: ["cod", "pincode", "upi"],
      theme_compat: ["os2", "horizon"] as any,
      min_tier: tier,
      demo_url: `https://shopforge-demo.myshopify.com/pages/demo-${idx}`,
      description: `CRO-optimized ${isPage ? "full page conversion layout" : "modular theme section"} engineered to maximize store conversions.`,
    };
  }),
];
