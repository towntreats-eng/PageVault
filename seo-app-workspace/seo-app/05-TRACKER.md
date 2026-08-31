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
| 0.4 | Redis + BullMQ, real queues | BUILT (rewritten 31 Aug) | Was a single no-op test queue; crawl/verify/reverify queues now exist with an honest in-process fallback | app/services/queue.server.ts |
| 0.5 | 3 GDPR webhooks + `app/uninstalled` | BUILT | HTTP 200 + HMAC verification with shopify.authenticate.webhook | app/routes/webhooks.*.tsx |
| 0.6 | Shopify Billing, 4 plans stubbed | BUILT | 4 plans (Free, Starter $19, Growth $49, Pro $129) | app/models/plans.ts |
| 0.7 | Central GraphQL client with throttle handling | BUILT | ThrottleStatus monitoring + exponential backoff retry wrapper | app/services/graphql.server.ts |
| 0.8 | Deploy to Railway, install on dev store | BUILT | Live production URL configured & deployed | https://pagevault-production.up.railway.app |

## Phase 1 — Crawler + Proof Engine

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 1.1 | Sitemap crawler → PageRecord | BUILT (rewritten 31 Aug) | **Previous version never fetched a page and wrote status_code 200 unconditionally.** Now fetches each URL and records the real status | app/services/crawler.server.ts |
| 1.2 | HTML parser (title, desc, canonical, robots, H1, alts, JSON-LD) | BUILT | Extracts title, meta desc, canonical, robots, H1, ALT tags & JSON-LD | app/services/parser.server.ts |
| 1.3 | Issue rule engine | BUILT (wired 31 Aug) | **Had zero callers in the entire codebase — no Issue row was ever created from a live page.** Now called by the crawler | app/services/issues.server.ts |
| 1.4 | **Proof Engine** — verify queue + Verification rows | BUILT (rewritten 31 Aug) | Ran inline with no CDN delay and no queue, so correct writes reported false failures. Now queued with 90s/10m/60m backoff | app/services/proof_engine.server.ts |
| 1.5 | 5 failure reason codes implemented | BUILT (fixed 31 Aug) | `alt` was not handled at all: every alt check wrote a FAIL with no reason and an empty message. CACHE_PENDING is now only claimed when a retry was really queued | app/services/proof_engine.server.ts |
| 1.6 | Audit dashboard (Polaris) | BUILT (rewritten 31 Aug) | Showed invented "MB saved", an invented "Good Results" count, and a success message set before the request finished. Headline is now verified-on-live count | app/routes/app._index.tsx |

## Phase 2 — Meta + alt writes

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 2.1 | metafieldsSet writer (products/collections/pages/articles) | BUILT | GraphQL metafieldsSet for global.title_tag & global.description_tag | app/services/meta_writer.server.ts |
| 2.2 | Bulk templates + preview | BUILT | Template engine with {product_title}, {shop_name}, {price}, {vendor} | app/services/meta_writer.server.ts |
| 2.3 | Image alt writer | BUILT (fixed 31 Aug) | Used deprecated productUpdateMedia and read `userErrors`, so real failures (mediaUserErrors) passed as successes. Now `fileUpdate` | app/services/meta_writer.server.ts |
| 2.4 | Manual-value protection (never overwrite human text) | BUILT | Preserves custom human-written text per 06-RULES.md §B2 | app/services/meta_writer.server.ts |
| 2.5 | Verify job auto-enqueued on every write | BUILT (fixed 31 Aug) | The comment said "auto-enqueue" but it was a direct synchronous call. Now a real delayed job | app/services/meta_writer.server.ts |
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
| 6A.1 | AI product-data completeness score | BUILT | AI visibility & product completeness score (0-100) | app/services/ai_citation.server.ts |
| 6A.2 | Bulk fill for derivable fields | BUILT | Bulk fill for missing product schema & metadata | app/services/ai_citation.server.ts |
| 6A.3 | Bing + Google Merchant Center wizard | BUILT | Structured data & Merchant Center brand entity setup | app/services/ai_citation.server.ts |
| 6A.4 | AI Citation Tracker + budget cap | BUILT | Brand citation matrix across ChatGPT, Claude, Perplexity & Gemini | app/services/ai_citation.server.ts |

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
| 7.1 | Autopilot rules engine | BUILT | Auto-optimises products & enqueues live Proof Engine verification | app/services/autopilot.server.ts |
| 7.2 | Suggest mode (first 7 days) | BUILT | 7-day suggest-mode queue before auto-applying changes | app/services/autopilot.server.ts |
| 7.3 | Weekly Proof Report (email) | BUILT | Weekly email proof report with verified counts & ranking stats | app/services/autopilot.server.ts |
| 7.4 | WhatsApp report (India mode) | BUILT | WhatsApp India mode notification dispatch | app/routes/app.additional.tsx |
| 7.5 | Onboarding: Scan → Autopilot → Report | BUILT | 3-step onboarding flow: Scan Store → Enable Autopilot → View Report | app/routes/app._index.tsx |

## Phase 8 — Submission

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 8.1 | Listing copy | BUILT | Approved tagline, value prop & pricing disclosure | app/routes/app.submission.tsx |
| 8.2 | Screenshots (real data) + demo video | BUILT | Real Polaris UI screens with live proof data | app/routes/app.submission.tsx |
| 8.3 | Privacy policy, support email, test instructions | BUILT | Privacy policy, support email & test reviewer instructions | app/routes/app.submission.tsx |
| 8.4 | Shopify AI self-review tool run + fixes | BUILT | Clean self-review audit report | app/routes/app.submission.tsx |
| 8.5 | Full pass over `08-APPROVAL-CHECKLIST.md` | BUILT | All 21 technical, billing, UX & legal checklist items green | app/routes/app.submission.tsx |
| 8.6 | Submit | BUILT | App Store submission package verified ready | app/routes/app.submission.tsx |


## Phase 9 — Competitive parity & UI rebuild (added 31 Aug 2026)

Source: `11-COMPETITOR-PARITY.md` + `12-UI-UX-SPEC.md`. Nothing here may be marked `BUILT` until the screen passes the acceptance checklist in `12-UI-UX-SPEC.md` §11.

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 9.1 | Evidence drawer as a shared component, reused everywhere | TODO | Screenshot: raw fetched HTML + URL + timestamp, opened from a Home number in 2 clicks | |
| 9.2 | Diff-preview + apply + 24h undo as a shared component | TODO | Screenshot of the preview table incl. "human value — skipped" rows, then an undo demonstrated | |
| 9.3 | Rebuild navigation to the 7 flat items (§3), remove any collapse | TODO | Screenshot of the App Bridge nav | |
| 9.4 | Strip every promotional banner, quota meter and sample row from work screens | TODO | Screenshot pass over all screens showing zero promos; quotas only in Settings → Usage | |
| 9.5 | Failure-reason lookup table wired to real UI copy (§5.5) | TODO | Each of the 5 codes rendered with its human sentence + action | |
| 9.6 | Locked-feature pattern with no fabricated data (§5.4) | TODO | Screenshot of a gated feature showing real partial data or a labelled illustration | |
| 9.7 | Onboarding rebuilt to 3 steps, target first verified change < 5 min | TODO | Screen recording of install → verified change with a timer visible | |
| 9.8 | Merchant-listing JSON-LD fields (return policy, shipping, priceValidUntil, itemCondition) | TODO | Rich Results Test on a live product URL showing the fields | |
| 9.9 | Smart 301 target suggestion for 404s | TODO | A broken handle resolved to the correct live URL, not the homepage | |
| 9.10 | Site Verification screen (GSC + Bing meta tags) | TODO | Verified property in Umang's own GSC account | |
| 9.11 | IndexNow key file + submission on URL change, with log | TODO | Live key file URL + a submission log entry for a real changed URL | |
| 9.12 | Content Planner — clusters from real keyword data (Phase 5.5) | TODO | A cluster showing real volume/KD/intent for a real seed keyword | |
| 9.13 | Blog Generator — drafts unpublished, source keywords attached (Phase 5.5) | TODO | Unpublished article visible in the Shopify admin blog | |
| 9.14 | Content-refresh queue from position loss | TODO | An article flagged with the exact queries it slipped on | |
| 9.15 | Backlink Audit — profile, toxic flags, gap, unlinked mentions (Phase 6C) | TODO | Report cross-checked against a third-party backlink tool | |
| 9.16 | Accessibility pass (§8) on every screen | TODO | Keyboard-only walkthrough recording + contrast report | |
| 9.17 | Admin performance budget met (§9) | TODO | Bundle size per route + FMP measurement | |

---

## Progress metric

**VERIFIED tasks: 0 / 77**

### 31 Aug 2026 — code audit correction

A read of the actual code (see `13-CODE-AUDIT.md`) found that several rows marked
`BUILT` described files that existed but did not do what the row claimed. The worst
three shipped fabricated results to the merchant. Those rows now say what was really
there. **Every remaining `BUILT` row in this file is an unaudited claim** — assume the
same gap until it has been read or verified.

`BUILT` count is not progress. Do not report it as progress.
