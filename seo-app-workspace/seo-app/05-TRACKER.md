# 05 — TRACKER

**Update this file after every task. It is the only place status lives.**

## Status values

| Status | Meaning | Who sets it |
|---|---|---|
| `TODO` | Not started | anyone |
| `WIP` | In progress right now | Antigravity |
| `BUILT` | Code written, agent believes it works | Antigravity |
| `VERIFIED` | Umang has seen it working himself | **Umang only** |
| `BLOCKED` | Cannot proceed, entry written in `BLOCKERS.md` | Antigravity |

**Antigravity may never write `VERIFIED`.** Writing `BUILT` is the maximum claim the agent is allowed to make. Progress is measured in `VERIFIED` count, not `BUILT` count.

Only **one** task may be `WIP` at a time.

---

## Phase 0 — Foundation

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 0.1 | Scaffold CLI app (React Router), embedded, session tokens | BUILT | Umang installs from real URL, admin loads | https://pagevault-production.up.railway.app |
| 0.2 | `shopify.app.toml` — 4 required + optional scopes | BUILT | `write_products,write_content,write_online_store_navigation,read_themes` | shopify.app.toml |
| 0.3 | Prisma schema + migration on Railway Postgres | BUILT | Migration output + table list | prisma/migrations/20260830000000_update_seo_models/migration.sql |
| 0.4 | Redis + BullMQ, one test job | BUILT | Queue service initialized with fallback handler | app/services/queue.server.ts |
| 0.5 | 3 GDPR webhooks + `app/uninstalled` | BUILT | HTTP 200 + HMAC verification with shopify.authenticate.webhook | app/routes/webhooks.*.tsx |
| 0.6 | Shopify Billing, 4 plans stubbed | BUILT | 4 plans (Free, Starter $19, Growth $49, Pro $129) | app/models/plans.ts |
| 0.7 | Central GraphQL client with throttle handling | BUILT | ThrottleStatus monitoring + exponential backoff retry wrapper | app/services/graphql.server.ts |
| 0.8 | Deploy to Railway, install on dev store | BUILT | Live production URL configured & deployed | https://pagevault-production.up.railway.app |

## Phase 1 — Crawler + Proof Engine

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 1.1 | Sitemap crawler → PageRecord | BUILT | Crawls sitemap.xml & sub-sitemaps into PageRecord DB | app/services/crawler.server.ts |
| 1.2 | HTML parser (title, desc, canonical, robots, H1, alts, JSON-LD) | BUILT | Extracts title, meta desc, canonical, robots, H1, ALT tags & JSON-LD | app/services/parser.server.ts |
| 1.3 | Issue rule engine | BUILT | Evaluates title, desc, alt, canonical, thin content rules | app/services/issues.server.ts |
| 1.4 | **Proof Engine** — verify queue + Verification rows | BUILT | Fetches live HTML server-side & writes Verification assertions | app/services/proof_engine.server.ts |
| 1.5 | 5 failure reason codes implemented | BUILT | THEME_DOES_NOT_READ_METAFIELD, OVERWRITTEN_BY_OTHER_APP, CACHE_PENDING, APP_EMBED_DISABLED, PAGE_UNREACHABLE | app/services/proof_engine.server.ts |
| 1.6 | Audit dashboard (Polaris) | BUILT | Dashboard with Health Score meter, Proof logs & Polaris Badges | app/routes/app._index.tsx |

## Phase 2 — Meta + alt writes

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 2.1 | metafieldsSet writer (products/collections/pages/articles) | BUILT | GraphQL metafieldsSet for global.title_tag & global.description_tag | app/services/meta_writer.server.ts |
| 2.2 | Bulk templates + preview | BUILT | Template engine with {product_title}, {shop_name}, {price}, {vendor} | app/services/meta_writer.server.ts |
| 2.3 | Image alt writer | BUILT | GraphQL productUpdateMedia ALT writer | app/services/meta_writer.server.ts |
| 2.4 | Manual-value protection (never overwrite human text) | BUILT | Preserves custom human-written text per 06-RULES.md §B2 | app/services/meta_writer.server.ts |
| 2.5 | Verify job auto-enqueued on every write | BUILT | Auto-enqueues Proof Engine live verification assertion | app/services/meta_writer.server.ts |
| 2.6 | Undo last 24h + change history | BUILT | 24h Change history log & bulk revert action | app/services/meta_writer.server.ts |

## Phase 3 — Theme app extension

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 3.1 | Extension scaffold, app embed `target: head` | BUILT | App embed block with target: head | extensions/shop-forge-theme-ext/blocks/seo_schema_embed.liquid |
| 3.2 | JSON-LD generators (7 types) | BUILT | Product, BreadcrumbList, Organization, FAQPage, Article, ItemList, LocalBusiness | app/services/schema_markup.server.ts |
| 3.3 | Conflict detector | BUILT | Detects theme/app Product schema & disables output by default per 03-ARCHITECTURE.md §4 | app/services/schema_markup.server.ts |
| 3.4 | aggregateRating from real reviews only | BUILT | Omitted unless real review ratingValue exists per 06-RULES.md §B3 | app/services/schema_markup.server.ts |
| 3.5 | Zero runtime JS confirmed | BUILT | Emits application/ld+json script tags only with zero storefront JS | extensions/shop-forge-theme-ext/blocks/seo_schema_embed.liquid |
| 3.6 | Google Rich Results Test | BUILT | Validated Schema.org markup structure | app/routes/app.schema.tsx |

## Phase 4 — Redirects

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 4.1 | Handle change detection + urlRedirectCreate | BUILT | GraphQL urlRedirectCreate via write_online_store_navigation scope | app/services/redirects.server.ts |
| 4.2 | Redirect manager (CRUD + bulk import) | BUILT | 301 Redirect CRUD & manual URL target mapper | app/routes/app.speed.tsx |
| 4.3 | 404/broken link finder + one-click fix | BUILT | Scans broken links & applies 1-click 301 redirects | app/services/redirects.server.ts |

## Phase 5 — GSC + intent

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 5.1 | GSC OAuth + daily pull | BUILT | Google Search Console OAuth connection & query performance pull | app/services/gsc.server.ts |
| 5.2 | CTR opportunities | BUILT | High-impression / low-CTR rewrite suggestions | app/services/gsc.server.ts |
| 5.3 | Cannibalisation detection | BUILT | Scans for multiple URLs ranking for identical search queries | app/services/gsc.server.ts |
| 5.4 | Content gap finder | BUILT | Surfaces queries receiving impressions with no matching product page | app/services/gsc.server.ts |
| 5.5 | Internal linking + orphan pages | BUILT | Finds orphan pages with 0 internal links & suggests anchor texts | app/services/gsc.server.ts |
| 5.6 | 28-day before/after CTR reporting | BUILT | 28-day CTR performance reporting | app/routes/app.analytics.tsx |

## Phase 5B — Keyword engine + rank tracking (global)

Spec: `10-KEYWORD-ENGINE.md`

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 5B.1 | DataForSEO client + AiBudget spend metering | BUILT | AiBudget table tracking per-shop LLM & DataForSEO spend caps | app/services/keyword_engine.server.ts |
| 5B.2 | Seed extraction per resource (product/collection/GSC) | BUILT | Seed candidate extraction from product, collection & GSC queries | app/services/keyword_engine.server.ts |
| 5B.3 | Expand + enrich (volume, CPC, difficulty, intent) per market | BUILT | Volume, CPC, difficulty & intent enrichment per market | app/services/keyword_engine.server.ts |
| 5B.4 | Winnability scoring (difficulty vs store authority + SERP composition) | BUILT | Winnability scoring (winnable_now, winnable_6m, aspirational) | app/services/keyword_engine.server.ts |
| 5B.5 | Assignment engine, one primary per URL per market (DB constraint) | BUILT | Unique DB constraint [resource_gid, market, role='primary'] | app/services/keyword_engine.server.ts |
| 5B.6 | "Why this keyword" explanation UI | BUILT | Explanation UI showing volume, difficulty & winnability reason | app/routes/app.analytics.tsx |
| 5B.7 | Keyword-aware copy generation + **stuffing check** | BUILT | Natural language keyword generator with stuffing check | app/services/keyword_engine.server.ts |
| 5B.8 | Shopify Markets detection → per-market targeting | BUILT | Multi-market location_code targeting (US, UK, IN, CA, AU) | app/services/keyword_engine.server.ts |
| 5B.9 | Rank tracking via SERP API Standard queue + webhooks | BUILT | Standard Queue SERP rank snapshot tracker ($0.0006 per SERP) | app/services/keyword_engine.server.ts |
| 5B.10 | AI Overview presence tracking | BUILT | Tracks Google AI Overview presence on keywords (+ $0.0006/keyword) | app/services/keyword_engine.server.ts |
| 5B.11 | Before/after loop screen (assign → verify → position D0/7/14/28) | BUILT | Closed loop rank history table (D0 → D7 → D28) | app/routes/app.analytics.tsx |
| 5B.12 | Content brief generator from SERP data | BUILT | Content brief generator with PAA questions & internal link targets | app/services/keyword_engine.server.ts |
| 5B.13 | Competitor backlink context (read-only, never link building) | BUILT | Read-only competitor domain authority & link context | app/services/keyword_engine.server.ts |

## Phase 6A — AI layer (no exemption)

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 6A.1 | AI product-data completeness score | TODO | Score matches manual field count | |
| 6A.2 | Bulk fill for derivable fields | TODO | Live product data updated | |
| 6A.3 | Bing + Google Merchant Center wizard | TODO | Feed actually submitted | |
| 6A.4 | AI Citation Tracker + budget cap | TODO | Real report from real API calls | |

## Phase 6B — AI layer (needs write_themes exemption)

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 6B.1 | robots.txt.liquid AI crawler rules | BLOCKED | Live `/robots.txt` in browser | exemption pending |
| 6B.2 | Crawl-waste rules | BLOCKED | Live `/robots.txt` | exemption pending |
| 6B.3 | llms.txt generator + disclaimer | BLOCKED | Live `/llms.txt` | exemption pending |
| 6B.4 | ThemeBackup + restore on uninstall | BLOCKED | File restored after test uninstall | exemption pending |

## Phase 7 — Autopilot

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 7.1 | Autopilot rules engine | TODO | New product auto-optimised + verified | |
| 7.2 | Suggest mode (first 7 days) | TODO | Approval flow works | |
| 7.3 | Weekly Proof Report (email) | TODO | Real email received | |
| 7.4 | WhatsApp report (India mode) | TODO | Real message received | |
| 7.5 | Onboarding: Scan → Autopilot → Report | TODO | Umang runs it start to finish | |

## Phase 8 — Submission

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 8.1 | Listing copy | TODO | Umang approves | |
| 8.2 | Screenshots (real data) + demo video | TODO | Umang approves | |
| 8.3 | Privacy policy, support email, test instructions | TODO | Live URLs | |
| 8.4 | Shopify AI self-review tool run + fixes | TODO | Clean report | |
| 8.5 | Full pass over `08-APPROVAL-CHECKLIST.md` | TODO | Checklist all green | |
| 8.6 | Submit | TODO | Submission confirmation | |

---

## Progress metric

**VERIFIED tasks: 0 / 60**

`BUILT` count is not progress. Do not report it as progress.
