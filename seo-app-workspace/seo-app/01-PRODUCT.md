# 01 — PRODUCT

## 1. The market position

The Shopify SEO category is crowded and every incumbent sits at 4.8–4.9 stars: Booster, Avada, SearchPie, TinyIMG, Sherpas, Plug In SEO, Yoast for Shopify.

**We do not win on feature count.** We win on the four things that appear over and over in their 1-star reviews, plus one thing none of them do well yet.

## 2. The six documented gaps we attack

### Gap 1 — The app claims work it never actually did (THE core gap)
A merchant review (Mar 2026, Booster SEO): paid for 8 months, dashboard permanently showed "100% optimized", but the image alt text and meta tags **were never actually applied to the storefront**. They only discovered it by inspecting the site themselves. Refund: one month.

No SEO app on the store verifies its own work against the live rendered page. This is our wedge.

### Gap 2 — Uninstall breaks the store
Repeated across Booster, SearchPie, Yoast, SEO Booster: after uninstall, meta titles and descriptions disappeared, leftover snippets stayed in `theme.liquid`, in one case the browser tab title became "Facebook", in another "American Express". Merchants had to roll back their theme.

Cause: these apps inject code into theme files and do not clean up.

### Gap 3 — Two SEO apps = duplicate schema = both ignored
Documented case: a store ran Avada + Booster together, Google Search Console flagged 140 pages with duplicate structured data. Removing one app fixed it in two weeks. No app checks whether the theme or another app already emits Product schema.

### Gap 4 — Content scoring is from 2018
A merchant review (Avada): the technical features are good, but the content recommendations still reward keyword density, exact-match keywords and first-sentence keyword placement. They hit near-perfect scores and rankings did not move.

### Gap 5 — Billing traps
Recurring: "uninstalled and still charged $55/$69", "cancelled in trial and still charged".

### Gap 6 — App bloat
Three SEO apps can add 200–400KB of JS. One documented store went 2.8s → 4.1s load, and back to 2.2s after consolidating to one app.

## 3. The 2026 shift (our timing advantage)

Between Dec 2025 and May 2026 Shopify rebuilt itself around AI shopping:

- **Shopify Catalog** syndicates product data to Shop, ChatGPT, Perplexity, Gemini and Copilot.
- Shopify shipped an **Agentic Storefronts** admin page (May 2026) showing which AI queries a store's products appear for.
- Shopify's own reporting: orders from AI search up ~11x Jan 2025 → Jan 2026; AI traffic up ~7x.
- AI-referred shoppers convert meaningfully higher than non-branded organic.

**But eligibility is automatic and visibility is not.** AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended) never see the theme, the photography or the trust badges. They read crawler access, JSON-LD, server-rendered HTML and product data completeness. The median Shopify store fills only about three of the product-data fields AI agents read.

**Result:** a store can rank on Google page 1 and be completely invisible in ChatGPT. Nobody is selling a good fix for this yet.

## 4. What "game changer" means for this app

Not more features. Four specific things no incumbent does:

1. **Proof Engine** — after every change, the app fetches the merchant's live storefront HTML server-side and confirms the tag is actually there. The dashboard counts **Verified**, never "Optimized". If verification fails, we say so and say why.
2. **Clean by construction** — zero theme injection by default, zero storefront JS beyond a JSON-LD block, full backup and restore of any theme file we touch, and metafields left intact on uninstall because they are the merchant's data.
3. **Real keyword research and rank tracking** — every page gets one winnable primary keyword per market, chosen against the store's actual authority, applied naturally, and tracked to a real Google position week over week. See `10-KEYWORD-ENGINE.md`.
4. **AI visibility as a first-class product** — crawler access, AI product-data completeness score, Bing/Google Merchant feed setup, and a weekly AI Citation Tracker that reports whether ChatGPT/Perplexity/Gemini actually recommended this store.

## 4b. Market: global-first

This app is built for the **global** Shopify market, not India-first. Everything is USD-primary with local currency where Shopify supports it, and the keyword engine is multi-market by design (`10-KEYWORD-ENGINE.md` §4.4): keyword volume, difficulty, SERP composition and rank tracking all run per country and per language, driven by the store's Shopify Markets configuration.

India is one market among many, served by the same engine — not a separate product mode.

Multi-market keyword targeting is itself a differentiator: no Shopify SEO app currently handles the fact that "trainers" in the UK and "sneakers" in the US are different keywords with different volumes and different competitors.

## 5. Positioning line

> Every other SEO app shows you a score. We show you your live page's source code.

## 6. Scope discipline — SEO ONLY

This app does SEO and AI visibility. It does **not** do reviews, bundles, upsell, cross-sell, popups, wishlists or any conversion feature. Those are separate apps later.

Reasons this is a product decision, not a preference:
- Requesting order/customer data for reviews would drag us into Shopify's protected customer data approval (Level 1 + Level 2), which we currently avoid entirely.
- Upsell/bundle features need storefront JS, which destroys our zero-bloat positioning, and cart transform functions (one per store, Plus-gated for parts).
- App Store listings rank on one category. An "everything app" ranks for nothing.

**If a feature request does not make the store more findable in search or AI, it does not go in this app.**

## 7. Honest limits we will state inside the product

Merchants churn from lies, not from limitations. The UI will say plainly:
- `sitemap.xml` cannot be edited on Shopify. Anyone selling "sitemap optimization" is mostly selling theatre.
- Shopify's canonical tag is emitted automatically and cannot be removed without theme edits.
- URL structure (`/products/`, `/collections/`) cannot be changed.
- `llms.txt` is not a confirmed ranking factor for any major AI provider. We offer it as cheap future-proofing, not magic.
- Structure enables rankings. Content, reviews and authority still do the heavy lifting.
