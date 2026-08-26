export interface TemplatePreviewData {
  id: string;
  name: string;
  htmlPreview: string;
  liquidCode: string;
  jsonSchema: string;
}

export const TEMPLATE_PREVIEWS: Record<string, TemplatePreviewData> = {
  cat_1: {
    id: "cat_1",
    name: "High-Converting D2C Flagship Home Page (18+ CRO Sections)",
    htmlPreview: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Flagship Home Page Preview (18+ Sections)</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin:0; padding:0; color:#111827; background:#f9fafb; scroll-behavior:smooth; }
          .ticker { background:#111827; color:#fff; text-align:center; padding:8px; font-size:13px; font-weight:600; }
          .header { background:#fff; padding:16px 24px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e5e7eb; position:sticky; top:0; z-index:100; }
          .logo { font-size:20px; font-weight:800; color:#2563eb; }
          .nav { display:flex; gap:20px; font-size:14px; font-weight:500; color:#4b5563; }
          .hero { background:linear-gradient(135deg, #0f172a, #1e3a8a); color:#fff; padding:60px 24px; text-align:center; position:relative; }
          .hero h1 { font-size:36px; margin:0 0 16px 0; font-weight:800; }
          .hero p { font-size:18px; max-width:600px; margin:0 auto 24px auto; opacity:0.9; }
          .btn { background:#10b981; color:#fff; padding:14px 28px; border-radius:30px; font-weight:700; text-decoration:none; display:inline-block; border:none; cursor:pointer; }
          .trust-bar { background:#ffffff; padding:20px; display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; text-align:center; border-bottom:1px solid #e5e7eb; }
          .trust-item { font-size:14px; font-weight:700; color:#1e293b; }
          .section-title { text-align:center; margin:40px 0 20px 0; }
          .section-title h2 { font-size:26px; font-weight:800; margin:0; }
          .grid-4 { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:20px; padding:0 24px 40px 24px; max-width:1100px; margin:0 auto; }
          .card { background:#fff; border-radius:16px; padding:20px; box-shadow:0 4px 15px rgba(0,0,0,0.05); text-align:center; border:1px solid #f3f4f6; }
          .bento-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:20px; padding:0 24px 40px 24px; max-width:1100px; margin:0 auto; }
          .bento-card { background:#fff; border-radius:20px; padding:28px; box-shadow:0 4px 20px rgba(0,0,0,0.04); border:1px solid #e5e7eb; }
          .badge { background:#dbeafe; color:#1e40af; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; }
          .wa-btn { position:fixed; bottom:20px; right:20px; background:#25d366; color:#fff; padding:12px 20px; border-radius:30px; font-weight:700; box-shadow:0 6px 20px rgba(37,211,102,0.4); text-decoration:none; display:flex; align-items:center; gap:8px; z-index:999; }
          .sticky-atc { position:fixed; bottom:0; left:0; width:100%; background:#fff; padding:12px 24px; box-shadow:0 -4px 20px rgba(0,0,0,0.1); display:flex; justify-content:space-between; align-items:center; box-sizing:border-box; z-index:998; }
        </style>
      </head>
      <body>
        <!-- 1. Sticky Header & Announcement Ticker -->
        <div class="ticker">⚡ FREE Express Delivery Across India | Extra 5% OFF via UPI Code: UPI5</div>
        <div class="header">
          <div class="logo">SHOP FORGE D2C</div>
          <div class="nav"><span>Home</span><span>Best-Sellers</span><span>Brand Story</span><span>Support</span></div>
          <div style="font-size:18px;">🛒 (1)</div>
        </div>

        <!-- 2. High-Impact Hero Banner -->
        <div class="hero">
          <span class="badge" style="background:#ecfdf5; color:#065f46;">🔥 148 PEOPLE VIEWING NOW</span>
          <h1>Engineered for Maximum D2C Conversions</h1>
          <p>Experience the next generation of modular storefront design built for rapid growth, high trust, and 1-click checkout.</p>
          <a href="#" class="btn">SHOP BEST-SELLERS →</a>
        </div>

        <!-- 3. Trust & Guarantee Badges Bar -->
        <div class="trust-bar">
          <div class="trust-item">🚚 Free Express Delivery</div>
          <div class="trust-item">💵 Cash On Delivery</div>
          <div class="trust-item">🔄 7-Day Easy Returns</div>
          <div class="trust-item">🔒 100% Encrypted Checkout</div>
        </div>

        <!-- 4. Bento Grid Features -->
        <div class="section-title"><h2>✨ Why Thousands Choose Us</h2></div>
        <div class="bento-grid">
          <div class="bento-card"><h3>🚀 Instant Courier Serviceability</h3><p>Lookup courier delivery timelines and COD availability in &lt;10ms.</p></div>
          <div class="bento-card"><h3>🛡️ Aerospace-Grade Durability</h3><p>Built with premium materials backed by a 1-year replacement warranty.</p></div>
          <div class="bento-card"><h3>⚡ 1-Click Fast Checkout</h3><p>Instant UPI discount incentive at checkout for 5% extra savings.</p></div>
        </div>

        <!-- 5. Trending Products Carousel -->
        <div class="section-title"><h2>🔥 Most Loved Best-Sellers</h2></div>
        <div class="grid-4">
          <div class="card"><div style="font-size:40px;">🛍️</div><h3>Product Item 1</h3><div style="color:#f59e0b;">★★★★★ (94)</div><div style="font-weight:800; font-size:18px; margin:8px 0;">₹1,499</div><button class="btn" style="padding:10px; width:100%;">+ Quick Add</button></div>
          <div class="card"><div style="font-size:40px;">🛍️</div><h3>Product Item 2</h3><div style="color:#f59e0b;">★★★★★ (128)</div><div style="font-weight:800; font-size:18px; margin:8px 0;">₹1,899</div><button class="btn" style="padding:10px; width:100%;">+ Quick Add</button></div>
          <div class="card"><div style="font-size:40px;">🛍️</div><h3>Product Item 3</h3><div style="color:#f59e0b;">★★★★★ (62)</div><div style="font-weight:800; font-size:18px; margin:8px 0;">₹2,499</div><button class="btn" style="padding:10px; width:100%;">+ Quick Add</button></div>
          <div class="card"><div style="font-size:40px;">🛍️</div><h3>Product Item 4</h3><div style="color:#f59e0b;">★★★★★ (210)</div><div style="font-weight:800; font-size:18px; margin:8px 0;">₹999</div><button class="btn" style="padding:10px; width:100%;">+ Quick Add</button></div>
        </div>

        <!-- 6. Customer Video Reels -->
        <div class="section-title"><h2>🎥 Real Unboxing Video Reels</h2></div>
        <div class="grid-4">
          <div class="card" style="background:#1e293b; color:#fff;">📱 <span>Verified Video Reel #1</span></div>
          <div class="card" style="background:#1e293b; color:#fff;">📱 <span>Verified Video Reel #2</span></div>
          <div class="card" style="background:#1e293b; color:#fff;">📱 <span>Verified Video Reel #3</span></div>
          <div class="card" style="background:#1e293b; color:#fff;">📱 <span>Verified Video Reel #4</span></div>
        </div>

        <!-- 7. Before / After Visual Transformation -->
        <div class="section-title"><h2>✨ Proven Transformation Results</h2></div>
        <div class="grid-4" style="grid-template-columns:repeat(3, 1fr);">
          <div class="card"><h3 style="color:#2563eb; font-size:28px; margin:0;">94%</h3><p>Reported Visible Improvement</p></div>
          <div class="card"><h3 style="color:#2563eb; font-size:28px; margin:0;">98%</h3><p>Would Recommend To Friends</p></div>
          <div class="card"><h3 style="color:#2563eb; font-size:28px; margin:0;">4.9★</h3><p>Overall Customer Satisfaction</p></div>
        </div>

        <!-- 8. As-Seen-On Press Media -->
        <div class="section-title"><h2>📰 As Seen On</h2></div>
        <div class="trust-bar" style="background:#f3f4f6;">
          <div class="trust-item" style="font-size:20px; font-weight:900;">VOGUE</div>
          <div class="trust-item" style="font-size:20px; font-weight:900;">GQ</div>
          <div class="trust-item" style="font-size:20px; font-weight:900;">FORBES</div>
        </div>

        <!-- 9. VIP Newsletter Signup -->
        <div style="background:#eff6ff; padding:40px 24px; text-align:center; margin:40px 0;">
          <h2 style="margin:0 0 8px 0; color:#1e3a8a;">Unlock 10% OFF Your First Order</h2>
          <p style="color:#3b82f6; margin:0 0 16px 0;">Join 50,000+ insiders to receive VIP discounts & early drop access.</p>
          <button class="btn">CLAIM 10% OFF NOW →</button>
        </div>

        <!-- Sticky Floating Elements -->
        <a href="#" class="wa-btn">💬 Chat on WhatsApp</a>
        <div class="sticky-atc">
          <div><strong>Flagship D2C Best-Seller</strong> — ₹1,499</div>
          <button class="btn">ADD TO CART</button>
        </div>
      </body>
      </html>
    `,
    liquidCode: `{% comment %}
  Shop Forge — High-Converting D2C Flagship Home Page (18+ CRO Liquid Sections)
{% endcomment %}

<div class="sf-home-flagship-wrapper">
  {% section 'sec_header_announcement' %}
  {% section 'sec_hero_flagship_banner' %}
  {% section 'sec_trust_badges_guarantee' %}
  {% section 'sec_bento_grid_features' %}
  {% section 'sec_trending_products_carousel' %}
  {% section 'sec_customer_video_reels' %}
  {% section 'sec_before_after_slider' %}
  {% section 'sec_product_bundle_upsell' %}
  {% section 'sec_press_media_endorsements' %}
  {% section 'sec_photo_review_grid' %}
  {% section 'sec_india_pincode_cod' %}
  {% section 'flash_sale_event' %}
  {% section 'product_comparison' %}
  {% section 'brand_story_about' %}
  {% section 'faq_trust_center' %}
  {% section 'sec_newsletter_vip_signup' %}
  {% section 'sec_sticky_urgency_atc' %}
  {% section 'sec_whatsapp_floating_chat' %}
  {% section 'sec_cart_drawer' %}
</div>`,
    jsonSchema: `{
  "name": "High-Converting D2C Flagship Home Page (18+ Sections)",
  "sections": {
    "section_1_header": { "type": "sec_header_announcement" },
    "section_2_hero": { "type": "sec_hero_flagship_banner" },
    "section_3_trust": { "type": "sec_trust_badges_guarantee" },
    "section_4_bento": { "type": "sec_bento_grid_features" },
    "section_5_trending": { "type": "sec_trending_products_carousel" },
    "section_6_reels": { "type": "sec_customer_video_reels" },
    "section_7_before_after": { "type": "sec_before_after_slider" },
    "section_8_bundle": { "type": "sec_product_bundle_upsell" },
    "section_9_press": { "type": "sec_press_media_endorsements" },
    "section_10_reviews": { "type": "sec_photo_review_grid" },
    "section_11_pincode": { "type": "sec_india_pincode_cod" },
    "section_12_flash_sale": { "type": "flash_sale_event" },
    "section_13_comparison": { "type": "product_comparison" },
    "section_14_story": { "type": "brand_story_about" },
    "section_15_faq": { "type": "faq_trust_center" },
    "section_16_newsletter": { "type": "sec_newsletter_vip_signup" },
    "section_17_sticky_atc": { "type": "sec_sticky_urgency_atc" },
    "section_18_whatsapp": { "type": "sec_whatsapp_floating_chat" },
    "section_19_cart": { "type": "sec_cart_drawer" }
  },
  "order": [
    "section_1_header",
    "section_2_hero",
    "section_3_trust",
    "section_4_bento",
    "section_5_trending",
    "section_6_reels",
    "section_7_before_after",
    "section_8_bundle",
    "section_9_press",
    "section_10_reviews",
    "section_11_pincode",
    "section_12_flash_sale",
    "section_13_comparison",
    "section_14_story",
    "section_15_faq",
    "section_16_newsletter",
    "section_17_sticky_atc",
    "section_18_whatsapp",
    "section_19_cart"
  ]
}`
  }
};
