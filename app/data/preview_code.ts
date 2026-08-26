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
    name: "High-Converting D2C Flagship Home Page",
    htmlPreview: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Home Page Preview</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin:0; padding:0; color:#111827; background:#f9fafb; }
          .ticker { background:#111827; color:#fff; text-align:center; padding:8px; font-size:13px; font-weight:600; }
          .header { background:#fff; padding:16px 24px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e5e7eb; }
          .logo { font-size:20px; font-weight:800; letter-spacing:-0.5px; color:#2563eb; }
          .nav { display:flex; gap:20px; font-size:14px; font-weight:500; color:#4b5563; }
          .hero { background:linear-gradient(135deg, #1e3a8a, #2563eb); color:#fff; padding:60px 24px; text-align:center; }
          .hero h1 { font-size:36px; margin:0 0 16px 0; }
          .hero p { font-size:18px; max-width:600px; margin:0 auto 24px auto; opacity:0.9; }
          .btn { background:#10b981; color:#fff; padding:14px 28px; border-radius:30px; font-weight:700; text-decoration:none; display:inline-block; border:none; cursor:pointer; }
          .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px; padding:40px 24px; max-width:1100px; margin:0 auto; }
          .card { background:#fff; border-radius:12px; padding:24px; box-shadow:0 4px 15px rgba(0,0,0,0.05); text-align:center; }
          .card h3 { margin:12px 0 8px 0; font-size:18px; }
          .badge { background:#dbeafe; color:#1e40af; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; }
        </style>
      </head>
      <body>
        <div class="ticker">⚡ FREE Shipping Across India | Extra 5% OFF via UPI Code: UPI5</div>
        <div class="header">
          <div class="logo">SHOP FORGE D2C</div>
          <div class="nav"><span>Home</span><span>Shop All</span><span>Brand Story</span><span>Track Order</span></div>
        </div>
        <div class="hero">
          <span class="badge">🔥 FESTIVE DROP IS LIVE</span>
          <h1>Engineered for Maximum D2C Conversions</h1>
          <p>Experience the next generation of high-converting storefronts built for speed, trust, and profit.</p>
          <a href="#" class="btn">SHOP THE COLLECTION →</a>
        </div>
        <div class="grid">
          <div class="card">
            <span style="font-size:32px;">🚀</span>
            <h3>Instant Pincode Lookup</h3>
            <p>Verify courier serviceability and COD availability in &lt;10ms.</p>
          </div>
          <div class="card">
            <span style="font-size:32px;">⭐</span>
            <h3>Verified Photo Reviews</h3>
            <p>Display real customer photos with star rating breakdowns.</p>
          </div>
          <div class="card">
            <span style="font-size:32px;">⚡</span>
            <h3>Sticky Urgency ATC</h3>
            <p>Floating checkout bar with real-time stock inventory counter.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    liquidCode: `{% comment %} Shop Forge — High-Converting D2C Flagship Home Page {% endcomment %}
<div class="sf-home-wrapper">
  {% section 'sec_header_announcement' %}
  {% section 'sec_bento_grid_features' %}
  {% section 'sec_customer_video_reels' %}
  {% section 'sec_trust_badges_guarantee' %}
  {% section 'sec_whatsapp_floating_chat' %}
</div>`,
    jsonSchema: `{
  "name": "Flagship D2C Home Page",
  "sections": {
    "header": { "type": "sec_header_announcement" },
    "features": { "type": "sec_bento_grid_features" },
    "reels": { "type": "sec_customer_video_reels" },
    "trust": { "type": "sec_trust_badges_guarantee" },
    "whatsapp": { "type": "sec_whatsapp_floating_chat" }
  },
  "order": ["header", "features", "reels", "trust", "whatsapp"]
}`
  },

  cat_2: {
    id: "cat_2",
    name: "High-Conversion Product Page (PDP) with Sticky ATC",
    htmlPreview: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>PDP Preview</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin:0; padding:20px; color:#111827; background:#fff; }
          .pdp-container { display:grid; grid-template-columns:1fr 1fr; gap:32px; max-width:1000px; margin:0 auto; }
          @media(max-width:768px){ .pdp-container{ grid-template-columns:1fr; } }
          .img-box { background:#f3f4f6; border-radius:16px; height:400px; display:flex; align-items:center; justify-content:center; font-size:64px; }
          .badge-red { background:#fee2e2; color:#dc2626; padding:4px 10px; border-radius:12px; font-weight:700; font-size:12px; }
          .price { font-size:28px; font-weight:800; color:#111827; margin:12px 0; }
          .pincode-box { background:#f9fafb; border:1px solid #e5e7eb; padding:16px; border-radius:10px; margin:16px 0; }
          .pincode-input { width:60%; padding:10px; border:1px solid #d1d5db; border-radius:6px; }
          .btn-atc { background:#10b981; color:#fff; width:100%; padding:16px; border-radius:30px; font-size:16px; font-weight:700; border:none; cursor:pointer; }
          .sticky-bar { position:fixed; bottom:0; left:0; width:100%; background:#fff; padding:12px 24px; box-shadow:0 -4px 20px rgba(0,0,0,0.1); display:flex; justify-content:space-between; align-items:center; box-sizing:border-box; }
        </style>
      </head>
      <body>
        <div class="pdp-container">
          <div class="img-box">🛍️</div>
          <div>
            <span class="badge-red">🔥 ONLY 4 LEFT IN STOCK</span>
            <h1 style="margin:8px 0;">Ultra-Comfort D2C Product</h1>
            <div style="color:#f59e0b;">★★★★★ 4.9 (128 verified reviews)</div>
            <div class="price">₹1,499 <span style="text-decoration:line-through; font-size:18px; color:#9ca3af;">₹2,999</span> <span style="color:#10b981; font-size:16px;">(50% OFF)</span></div>
            
            <div class="pincode-box">
              <strong>🚚 Check Courier & COD Availability:</strong>
              <div style="margin-top:8px; display:flex; gap:8px;">
                <input class="pincode-input" value="110001" placeholder="Enter Pincode">
                <button class="btn" style="padding:10px 16px;">Check</button>
              </div>
              <p style="font-size:12px; color:#059669; margin:6px 0 0 0;">✔ Express Delivery by Tomorrow | Cash On Delivery Available</p>
            </div>

            <button class="btn-atc">ADD TO CART — ₹1,499</button>
          </div>
        </div>
        <div class="sticky-bar">
          <div><strong>Ultra-Comfort D2C Product</strong> — ₹1,499</div>
          <button class="btn-atc" style="width:auto; padding:10px 24px;">ADD TO CART</button>
        </div>
      </body>
      </html>
    `,
    liquidCode: `{% section 'pdp_high_conversion' %}
{% section 'sec_india_pincode_cod' %}
{% section 'sec_photo_review_grid' %}
{% section 'sec_sticky_urgency_atc' %}`,
    jsonSchema: `{
  "name": "High-Conversion PDP",
  "sections": {
    "pdp": { "type": "pdp_high_conversion" },
    "pincode": { "type": "sec_india_pincode_cod" },
    "reviews": { "type": "sec_photo_review_grid" },
    "sticky_atc": { "type": "sec_sticky_urgency_atc" }
  }
}`
  },

  cat_4: {
    id: "cat_4",
    name: "CRO Slide-Out Cart Drawer with Free Shipping & Upsells",
    htmlPreview: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Cart Drawer Preview</title>
        <style>
          body { font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin:0; background:rgba(0,0,0,0.5); display:flex; justify-content:flex-end; height:100vh; }
          .drawer { background:#fff; width:100%; max-width:400px; height:100%; display:flex; flex-direction:column; padding:20px; box-sizing:border-box; }
          .header { border-bottom:1px solid #e5e7eb; padding-bottom:12px; }
          .shipping-bar { background:#eff6ff; padding:10px; border-radius:8px; margin-top:10px; font-size:13px; color:#1d4ed8; }
          .progress { height:6px; background:#bfdbfe; border-radius:4px; margin-top:6px; }
          .fill { height:100%; width:75%; background:#2563eb; border-radius:4px; }
          .item { display:flex; gap:12px; padding:14px 0; border-bottom:1px solid #f3f4f6; }
          .img { width:60px; height:60px; background:#f3f4f6; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:24px; }
          .footer { margin-top:auto; border-top:1px solid #e5e7eb; padding-top:16px; }
          .btn-checkout { background:#10b981; color:#fff; width:100%; padding:14px; border-radius:30px; font-weight:700; border:none; cursor:pointer; font-size:16px; }
        </style>
      </head>
      <body>
        <div class="drawer">
          <div class="header">
            <h3 style="margin:0;">Your Cart (1 Item)</h3>
            <div class="shipping-bar">
              🎁 Add <strong>₹150</strong> more for <strong>FREE Shipping!</strong>
              <div class="progress"><div class="fill"></div></div>
            </div>
          </div>
          <div class="item">
            <div class="img">🛍️</div>
            <div>
              <strong>D2C Premium Product</strong>
              <div style="font-size:13px; color:#6b7280;">Black / Default</div>
              <div style="font-weight:700; margin-top:4px;">₹1,499</div>
            </div>
          </div>
          <div class="footer">
            <div style="display:flex; justify-content:space-between; font-size:18px; font-weight:700; margin-bottom:12px;">
              <span>Subtotal</span>
              <span>₹1,499</span>
            </div>
            <button class="btn-checkout">🔒 PROCEED TO CHECKOUT</button>
          </div>
        </div>
      </body>
      </html>
    `,
    liquidCode: `{% section 'sec_cart_drawer' %}`,
    jsonSchema: `{
  "name": "CRO Slide-Out Cart Drawer",
  "sections": {
    "drawer": { "type": "sec_cart_drawer" }
  }
}`
  }
};
