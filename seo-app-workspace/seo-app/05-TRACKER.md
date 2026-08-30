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
| 0.4 | Redis + BullMQ, one test job | TODO | Job log with real timestamp | |
| 0.5 | 3 GDPR webhooks + `app/uninstalled` | TODO | HTTP 200 + HMAC verification, raw output | |
| 0.6 | Shopify Billing, 4 plans stubbed | TODO | Umang sees the real charge approval screen | |
| 0.7 | Central GraphQL client with throttle handling | TODO | Log showing `throttleStatus` + a backoff event | |
| 0.8 | Deploy to Railway, install on dev store | TODO | Live app URL | |

## Phase 1 — Crawler + Proof Engine

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 1.1 | Sitemap crawler → PageRecord | TODO | Page count matches the real store | |
| 1.2 | HTML parser (title, desc, canonical, robots, H1, alts, JSON-LD) | TODO | Extracted snippet vs browser View Source | |
| 1.3 | Issue rule engine | TODO | Issue list Umang can spot-check | |
| 1.4 | **Proof Engine** — verify queue + Verification rows | TODO | A PASS and a FAIL case, both correct | |
| 1.5 | 5 failure reason codes implemented | TODO | Each reason triggered at least once | |
| 1.6 | Audit dashboard (Polaris) | TODO | Screenshot from Umang's own browser | |

## Phase 2 — Meta + alt writes

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 2.1 | metafieldsSet writer (products/collections/pages/articles) | TODO | View Source on live storefront | |
| 2.2 | Bulk templates + preview | TODO | Preview vs applied values match | |
| 2.3 | Image alt writer | TODO | Live page `alt=` attribute | |
| 2.4 | Manual-value protection (never overwrite human text) | TODO | Test: human value survives a bulk run | |
| 2.5 | Verify job auto-enqueued on every write | TODO | Verification row per Change row | |
| 2.6 | Undo last 24h + change history | TODO | Umang reverts and sees the old value live | |

## Phase 3 — Theme app extension

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 3.1 | Extension scaffold, app embed `target: head` | TODO | Toggle visible in theme editor | |
| 3.2 | JSON-LD generators (7 types) | TODO | Live page source shows the block | |
| 3.3 | Conflict detector | TODO | Demo on a theme that already emits Product schema | |
| 3.4 | aggregateRating from real reviews only | TODO | Absent when no reviews exist | |
| 3.5 | Zero runtime JS confirmed | TODO | Network tab shows no app JS | |
| 3.6 | Google Rich Results Test | TODO | Passing result on a live URL | |

## Phase 4 — Redirects

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 4.1 | Handle change detection + urlRedirectCreate | TODO | Old URL 301s in browser | |
| 4.2 | Redirect manager (CRUD + bulk import) | TODO | Live redirect list matches Shopify admin | |
| 4.3 | 404/broken link finder + one-click fix | TODO | Real broken link found and fixed | |

## Phase 5 — GSC + intent

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 5.1 | GSC OAuth + daily pull | TODO | Numbers match Umang's own GSC account | |
| 5.2 | CTR opportunities | TODO | Ranked list from real data | |
| 5.3 | Cannibalisation detection | TODO | A real detected case | |
| 5.4 | Content gap finder | TODO | Real queries with no matching page | |
| 5.5 | Internal linking + orphan pages | TODO | Real suggestions on the dev store | |
| 5.6 | 28-day before/after CTR reporting | TODO | Real chart from real data | |

## Phase 5B — Keyword engine + rank tracking (global)

Spec: `10-KEYWORD-ENGINE.md`

| ID | Task | Status | Proof required | Proof link |
|---|---|---|---|---|
| 5B.1 | DataForSEO client + AiBudget spend metering | TODO | Real API response + spend row | |
| 5B.2 | Seed extraction per resource (product/collection/GSC) | TODO | Real seed list Umang can sanity-check | |
| 5B.3 | Expand + enrich (volume, CPC, difficulty, intent) per market | TODO | Real keyword rows with location_code set | |
| 5B.4 | Winnability scoring (difficulty vs store authority + SERP composition) | TODO | A keyword correctly rejected as unwinnable | |
| 5B.5 | Assignment engine, one primary per URL per market (DB constraint) | TODO | Constraint blocks a duplicate assignment | |
| 5B.6 | "Why this keyword" explanation UI | TODO | Umang reads it and it makes sense | |
| 5B.7 | Keyword-aware copy generation + **stuffing check** | TODO | A stuffed output caught and regenerated | |
| 5B.8 | Shopify Markets detection → per-market targeting | TODO | Two markets, different keywords, same product | |
| 5B.9 | Rank tracking via SERP API Standard queue + webhooks | TODO | Real position matching a manual Google check | |
| 5B.10 | AI Overview presence tracking | TODO | Real AIO flag on a real keyword | |
| 5B.11 | Before/after loop screen (assign → verify → position D0/7/14/28) | TODO | Real movement on a real keyword | |
| 5B.12 | Content brief generator from SERP data | TODO | A brief Umang judges usable | |
| 5B.13 | Competitor backlink context (read-only, never link building) | TODO | Real competitor domains listed | |

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
