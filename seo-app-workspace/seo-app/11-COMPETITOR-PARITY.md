# 11 — COMPETITOR PARITY & COUNTER-POSITIONING

**Source:** 16 screenshots of **SEOWILL (SEOAnt) — AI SEO by CWILL** running live on the `peri-beauty-2.myshopify.com` dev store, captured 31 Aug 2026, plus the **TinySEO** feature graphic.
**Purpose:** every feature they ship, mapped against ours, with a verdict: **MATCH**, **BEAT**, or **REFUSE (with reason)**.
**Rule:** this file does not override `01-PRODUCT.md` scope discipline or `02-SHOPIFY-REALITY.md` platform limits. Where parity would break those, the verdict is REFUSE and the reason is written down.

---

## 1. Their complete feature map (observed, not guessed)

### Navigation (8 items + a `View more / View less` collapse)

| Nav item | Sub-tabs observed | What it actually does |
|---|---|---|
| **SEO Checker** | — | Site-wide scan. "SEO Health Score" gauge (84 = "Medium"), Pages Scanned 35, Critical Issue 5, Need Improvement 4, Good Result 19. `One-Click Fix` + `Rescan`. Issues grouped by category (Content Optimization, GEO). |
| **Speed Optimization** ⚡ | Site Speed Up, Image Optimization | PageSpeed score gauge (desktop/mobile toggle), three modes on a slider: **Basic (free) → Rocket (Pro) → Turbo (Premium)**, "Instant Page Load", Speed Up Settings. Image tab: Auto Optimization toggle, Manual Optimization, Upload & Optimize, before/after size demo (821KB → 284KB), Optimization History with 30-day restore. |
| **AI Content Creation** | AI Content Planner, AI Blog Generator | Seed keyword → topic clusters (avg KD, total search volume, keyword count) → `Generate blog`. Ships with a `Sample` row ("best walking shoes") pre-loaded. |
| **Content Optimization** | Content Audit & Optimizer, SEO Metadata | 4 stat cards: Pages Audited 34, Pages Needing Fixes 34, Images have Alt Text 0/Total 0, Pages have Meta Tags 30/Total 33. Resource tabs (Products, Blog posts, Collections, Homepage, Other Pages). Per-row: SEO Score gauge (44, 40…), thumbnail, title, `Add keyword`, and GSC columns (Clicks, Impressions, CTR, Avg. position). SEO Metadata → **Auto-Generated Meta Tag** rules with `{{Product title}} - {{Shop name}}` style variables, per-resource-type toggles (Product / Collection / Blog), and an "Overwrite existing meta tags" switch. Plus Optimization History. |
| **Technical SEO** | Broken Link Redirects, Structure Data, Crawling & Indexing, Site Verification | 404 list (Unresolved / Manage Redirects / Ignored), `Create a Redirect`, **Auto fix broken links** (Pro-gated) that blanket-redirects new 404s to a chosen URL. Structure Data: toggle cards for **Product, Article, Organization, Breadcrumb, FAQ Schema (AI), How-To Schema (AI)** with Setting + Example per card, and counters: Optimized Pages, Pages with FAQ, Pages with How-To. |
| **Keyword Research** | Keyword Rank Tracker, Keyword Suggestions, Competitor Analysis, GSC Data Analysis | Rank tracker is **fully locked** on Free with `Upgrade to unlock`. Export button locked. |
| **Link Building** | Exchange Backlink, Backlink Audit | A **3-way link exchange marketplace**: `Your website → Bec*** → Cec*** → Your website`. 12,347 sites in Apply, 130,051 in Teams. Columns: Website (masked), Domain Rating, Backlinks, Correlation, Website category. Free plan = 40 exchange links, Pro 300, Premium 1000. Blocked on `.myshopify.com` domains. |
| **Pricing / Settings** | Account, General, Notifications, Integration, CWILL Solution | Quota meters: Monthly Image Quota 0/50, Add-on Image Quota, Monthly AI Credits 0/30, On-page SEO Audit 0/20, Spending limit for Overcharge. "CWILL Solution" = a cross-sell wall of their own other apps (404 Link Redirect, Sticky Add To Cart, Trust Badges, Page Speed Optimizer). |

### Their pricing (observed)

| | Free | Pro | Premium |
|---|---|---|---|
| Price | $0 | **$17.99**/mo (annual, 40% off $29.99) | **$30.00**/mo (annual, 50% off $59.99) |
| Image compressions | 50 one-time | 2,000/mo | 6,000/mo |
| Content Optimization credits | 30 one-time | 200/mo | 500/mo |
| On-page SEO Audit | 20 pages | 1,000 pages | Unlimited |
| Backlink Exchange | 40 links | 300 links | 1,000 links |
| Gated behind Pro | — | Rocket speed, auto/bulk meta tags, JSON-LD, auto-redirect broken links, llms.txt | + Turbo speed, AI internal linking, competitor analysis, rank tracker, backlink audit |

**Read this carefully:** their whole paid ladder is **quota-metered**, not outcome-metered. A merchant pays $30/mo and still watches four fuel gauges. That is the opening.

### TinySEO (second reference)

Increase site speed: image optimisation, app script control, image resizing, asset preloading, CSS/JS minification.
Improve SEO: site audit, add metadata, generate alt texts, fix broken links, IndexNow, HTML sitemaps, **Fix JSON-LD (add return policy & shipping details)**, AI metadata generation, use Search Console.

Two of these are genuinely worth stealing (legitimately): **IndexNow** and **merchant-listing JSON-LD fields** (`hasMerchantReturnPolicy`, `shippingDetails`) — see §4.

---

## 2. Their UX failures — this is where we actually win

Every one of these is visible in the screenshots. This is not theory.

1. **They sell ads inside a paid product.** In six of the screenshots there is a third-party or first-party promo banner *inside the working UI*: Judge.me on the Structured Data page, a returns app on the Auto-Generated Meta Tag page, an order-tracking app on the Speed page, a partner-program banner on Content Optimization, a popup app on the SEO Checker, and a whole "CWILL Solution" cross-sell page in Settings. A merchant paying $30/month is still being advertised to, on the screen where they are trying to work.
   → **We ship zero ads, zero cross-sell, ever. It goes in the App Store listing as a promise.**

2. **Locked features are filled with fake data.** The Keyword Rank Tracker on Free shows "Keywords 105.7k ↑20%, Traffic 105.7k, coffee beans, Position ▲15" — numbers that belong to nobody, styled to look real, sitting under an `Upgrade to unlock` button. A beauty store is shown coffee-bean rankings.
   → **We never render fake numbers. A locked feature shows the merchant's own partial real result, or a clearly labelled static illustration.**

3. **The score is unexplained and unprovable.** 84/100 rendered on a red-to-orange gauge labelled "Medium", from 9 issues, on 35 pages. No weighting shown, no proof that anything shown as fixed is actually on the live page.
   → **Our Home screen leads with `Verified on your live storefront: N changes`, and every number opens the evidence.**

4. **`One-Click Fix` with no preview, no diff, no undo shown.** The single most dangerous button in the app has the least explanation.
   → **Ours is `Review 34 fixes` → diff table → `Apply` → verification → per-item undo. Never a naked one-click write.**

5. **Dead-end errors.** "Insufficient conditions to participate in exchange backlinks — your domain name is still myshopify.com" is shown on a page whose entire content is then useless, with the stat cards all reading 0.
   → **Every blocked state names the exact next action and hides the machinery that cannot work yet.**

6. **Meaningless stats.** "Images have Alt Text **0** / Total: **0**" is a zero-over-zero card taking prime dashboard real estate. "Pages Audited 34 / Pages Needing Fixes 34" says every page failed while the headline score says 84.
   → **No stat card renders when its denominator is zero. Numbers on one screen must not contradict numbers on another.**

7. **Overlapping IA.** Meta tags live in *Content Optimization → SEO Metadata*. Structured data lives in *Technical SEO → Structure Data*. Broken links live in *Technical SEO* but 404 redirect automation is a *Pro* upsell card inside it. Eight nav items plus a `View more/View less` toggle, inside a Shopify iframe.
   → **Seven flat items, no collapse, one home for each concept. Spec in `12-UI-UX-SPEC.md` §3.**

8. **Sample rows pollute real data.** The Content Plan list ships with a `Sample` badge row ("best walking shoes") mixed into what should be the merchant's own list.
   → **Demo content lives in an explicitly separate "See an example" panel, never in the merchant's data table.**

9. **Quota anxiety on work screens.** `Image quota: 0/50` sits in the header of the Speed page; four fuel gauges dominate the Account page.
   → **Usage lives in Settings → Usage. Work screens show work.**

---

## 3. Parity matrix

Legend — **MATCH**: we ship an equivalent. **BEAT**: we ship it and it is materially better. **REFUSE**: deliberately not built, reason stated.

| # | Their feature | Our answer | Where it lives | Verdict |
|---|---|---|---|---|
| 1 | SEO Checker — site health score + issue list | Audit + rule engine + severity, plus **Evidence view** showing the raw HTML we extracted | Phase 1 | **BEAT** |
| 2 | One-Click Fix | `Review fixes` → diff preview → apply → **verify on live page** → per-item undo | Phase 2 | **BEAT** |
| 3 | Rescan | Manual rescan + scheduled weekly re-crawl **and weekly re-verification** of everything already applied | Phase 1 + `reverify` queue | **BEAT** |
| 4 | Auto-Generated Meta Tag rules (`{{Product title}} - {{Shop name}}`) | Same variable templates per resource type, **plus** manual-value protection that cannot be silently disabled, plus preview-before-apply on a real sample of 10 | Phase 2 | **BEAT** |
| 5 | "Overwrite existing meta tags" toggle | Kept, but off by default and gated behind an explicit confirm listing how many human-written values would be destroyed | Phase 2 | **BEAT** |
| 6 | Bulk meta editing | Bulk with preview + bulk undo (24h) + full change history export | Phase 2 | **MATCH+** |
| 7 | Image alt text generation | Same, from product context (title, type, vendor, variant), never keyword-stuffed | Phase 2 | **MATCH** |
| 8 | Structured data: Product | Product JSON-LD via theme app extension **+ conflict detector** (off by default when theme already emits it) | Phase 3 | **BEAT** |
| 9 | Structured data: Article, Organization, Breadcrumb, FAQ, How-To | All five, plus ItemList and LocalBusiness | Phase 3 | **MATCH+** |
| 10 | `aggregateRating` in schema | Only from real review-app metafields. Never fabricated. | Phase 3 | **BEAT (honesty)** |
| 11 | Broken link 404 list + manual redirect | Same, from real crawl data | Phase 4 | **MATCH** |
| 12 | "Auto fix broken links" → blanket redirect to homepage | **Smart 301 suggestion** (closest-matching live URL by handle + title similarity), homepage only as an explicit last-resort choice | Phase 4 | **BEAT** |
| 13 | Handle-change detection | Same, automatic `urlRedirectCreate` | Phase 4 | **MATCH** |
| 14 | Crawling & Indexing controls | What Shopify actually permits, with the limits printed on screen (see `02-SHOPIFY-REALITY.md`) | Phase 4/6B | **MATCH (honest)** |
| 15 | Site Verification (GSC/Bing meta tag) | Same, plus **IndexNow** submission (TinySEO has it, SEOAnt does not) | Phase 5 | **BEAT** |
| 16 | GSC Data Analysis | Full GSC intent engine: CTR opportunities, cannibalisation, content gaps, 28-day before/after on every applied change | Phase 5 | **BEAT** |
| 17 | Keyword Suggestions | Real volume/KD/SERP data, **multi-market** (per country + language from Shopify Markets) | `10-KEYWORD-ENGINE.md` | **BEAT** |
| 18 | Keyword Rank Tracker | Weekly real positions per market. **Not locked behind fake sample data.** | `10-KEYWORD-ENGINE.md` | **BEAT** |
| 19 | Competitor Analysis | Keyword gap + SERP-competitor identification per market | `10-KEYWORD-ENGINE.md` | **MATCH** |
| 20 | AI Content Planner (seed keyword → topic clusters) | Same, but clusters built from our real keyword data, each cluster showing the exact keywords + intent it targets | New — Phase 5.5 | **BEAT** |
| 21 | AI Blog Generator | Draft generation incl. bulk, saved as **unpublished Shopify blog drafts** by default, with source keywords attached; auto-publish is opt-in and off | New — Phase 5.5 | **BEAT** |
| 22 | AI internal linking (their Premium) | Internal-link suggestions from real query overlap + orphan-page detection | Phase 5 | **MATCH** |
| 23 | llms.txt generator | Same, shipped with the honest "not a confirmed ranking factor" line | Phase 6B | **MATCH (honest)** |
| 24 | Backlink Audit | Backlink profile, toxic-link flags, competitor gap, unlinked brand mentions, outreach target list | New — Phase 6C | **MATCH+** |
| 25 | **Exchange Backlink marketplace (3-way swap)** | **Not in v1.** Link exchange schemes are named in Google's link-spam policy; shipping one puts the *merchant's* store at risk, not ours. Revisit in v2 only as a curated, manually-approved partner directory. | Deferred — v2 | **REFUSE (v1)** |
| 26 | **Speed: image compression, minify, preload, app-script control, Turbo/Rocket** | **Not built.** Locked decision: this stays a pure SEO app with zero storefront bloat. Minify/preload/script-control needs theme writes + storefront JS, which destroys our core positioning. | — | **REFUSE** |
| 27 | HTML sitemap page (TinySEO) | Under review — needs a theme template or a proxy route; decide in Phase 4 | Phase 4 | **OPEN** |
| 28 | Fix JSON-LD: return policy + shipping (TinySEO) | **Yes — build it.** `hasMerchantReturnPolicy` + `shippingDetails` are real Google merchant-listing fields and a genuine rich-result unlock. Pulled from the store's real policies, never invented. | Phase 3 | **MATCH+** |
| 29 | Quota-metered plans (images / credits / audit pages / links) | Outcome-based plans. No fuel gauges on work screens. | `09-PRICING-AND-COSTS.md` | **BEAT** |
| 30 | In-app ads & own-app cross-sell | Zero. Written into the listing as a promise. | `12-UI-UX-SPEC.md` §2 | **BEAT** |
| 31 | — (they have nothing here) | **Proof Engine** — live storefront HTML verification of every change | Phase 1–2 | **UNCONTESTED** |
| 32 | — | **AI visibility layer** — crawler access, AI product-data score, citation tracker | Phase 6A | **UNCONTESTED** |
| 33 | — | **Clean uninstall with theme backup/restore and metafields left intact** | Phase 0 + `03-ARCHITECTURE.md` §5 | **UNCONTESTED** |

---

## 4. What this teardown ADDS to our scope

These were not in `04-BUILD-PLAN.md` and are now in scope. Antigravity does not start any of them until the phase they belong to is reached.

**Phase 3 additions**
- Merchant-listing JSON-LD fields on Product: `hasMerchantReturnPolicy`, `shippingDetails`, `priceValidUntil`, `itemCondition` — sourced from the store's real policy and shipping settings via Admin API. If the data does not exist, the field is omitted; it is never invented.
- Schema counters on the Structured Data screen must be **verified counts** (schema seen on the live page), not "enabled" counts.

**Phase 4 additions**
- Smart 301 target suggestion for 404s (handle + title similarity against live URLs), replacing blanket homepage redirects.
- Decision needed on an HTML sitemap page (item 27 above).

**Phase 5 additions**
- **Site Verification** screen: Google Search Console + Bing Webmaster verification meta tags.
- **IndexNow**: key file + submission on every create/update/delete of a URL, with a submission log. Real, supported by Bing/Yandex, cheap, and SEOAnt does not have it.

**NEW Phase 5.5 — Content Engine** (from the AI Content decision, §5)
- **Content Planner**: seed keyword → real keyword pull → topic clusters, each showing avg KD, total volume, keyword count, and the intent split. Clusters ranked by winnability against the store's actual authority, not by volume alone.
- **Blog Generator**: single and bulk generation. Every draft carries its source cluster + target keyword + intent. Output goes to Shopify as an **unpublished draft article**; publishing is always a human action unless the merchant explicitly turns on auto-publish (off by default, and re-confirmed every 90 days).
- **Content refresh**: existing articles that lost position (from rank tracker + GSC) get a refresh suggestion instead of a new post — this is what actually moves rankings and no competitor does it.
- Cost control: content generation draws on the per-shop AI budget from `03-ARCHITECTURE.md` §9. Hard stop at the cap, never a surprise bill.

**NEW Phase 6C — Off-page (Backlink Audit)**
- Backlink profile ingest, referring domains, DR-equivalent metric, anchor-text distribution.
- Toxic/spam link flags with an exportable disavow-ready list (we never submit a disavow on the merchant's behalf).
- Competitor backlink gap per market.
- Unlinked brand-mention finder → outreach target list with contact hints.
- **No exchange, no marketplace, no automated link placement in v1.**

---

## 5. Decisions locked with Umang — 31 Aug 2026

| # | Question | Decision |
|---|---|---|
| D-11.1 | Clone the 3-way backlink exchange? | **No for v1.** Ship Backlink **Audit** + gap + unlinked mentions (Phase 6C). Revisit exchange in **v2** only as a curated, manually-approved partner directory — never an automated swap network. |
| D-11.2 | Build the speed/image-compression module for parity? | **No. Pure SEO app.** No image compression, no minification, no preloading, no app-script control, no Turbo/Rocket modes. Zero storefront bloat stays the positioning. |
| D-11.3 | AI Content Creation in v1? | **Yes, fully** — planner + generator + bulk, wired to the real keyword engine, drafts unpublished by default. New Phase 5.5. |

**Open item for Umang (not decided):** should the audit *report* Core Web Vitals as a read-only diagnostic (field data pulled from the PageSpeed Insights API, zero code shipped to the storefront, no "fix" button)? It is genuinely an SEO signal and costs us nothing to display, and it does not violate D-11.2 because we ship nothing to the storefront. Say yes or no and it goes in `DECISIONS.md`.

---

## 6. What we refuse, and the exact words we use in the UI

Merchants churn from lies, not from limits. These sentences ship inside the product:

- **Speed:** "This app does not touch your storefront's speed. We ship zero JavaScript to your store. If you need image compression, use a dedicated app — we would rather be honest than sell you a feature we would have to bloat your theme to deliver."
- **Backlink exchange:** "We do not offer link exchanges. Google's link-spam policy treats reciprocal and three-way link schemes as manipulation, and the penalty lands on your store, not on us. Here is what we do instead: find who already links to you, who links to your competitors and not you, and who mentions your brand without linking."
- **Sitemap:** "`sitemap.xml` cannot be edited on Shopify. Any app selling 'sitemap optimization' is selling theatre." *(already in `01-PRODUCT.md` §7)*
- **Score:** we never display a single vanity score as the headline. The headline is **Verified changes on your live storefront**.

---

## 7. Pricing counter-position

Their ladder is metered fuel: images, credits, audit pages, exchange links. Ours must be metered on **outcome and scale**, and it must never make a paying merchant watch a gauge while they work.

Principles for `09-PRICING-AND-COSTS.md` (update it, do not duplicate it here):
1. **No image quota** — we do not compress images (D-11.2), so that entire anxiety axis disappears.
2. **Audit pages are never metered.** Auditing a store is cheap for us and is the thing that proves value on day one. Metering it, as they do at 20 pages on Free, is the single most self-defeating limit in their model.
3. Meter the two things that genuinely cost us money: **keyword/rank data volume** (per market, per tracked keyword) and **AI generation** (content drafts + citation tracker runs).
4. Price against $17.99 / $30 with a plan that is obviously better value on the axis they cannot follow us on: verification, AI visibility and multi-market rank tracking.
5. Cancellation must be one click and the app must never bill after uninstall — Gap 5 in `01-PRODUCT.md` is a recurring 1-star complaint against every one of them.

---

## 8. The one-line summary for the App Store listing

> They show you a score and sell you ads. We show you your live page's source code, and we prove every change we made.
