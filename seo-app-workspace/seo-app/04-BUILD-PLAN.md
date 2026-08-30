# 04 — BUILD PLAN

Phases are sequential. **Do not start a phase until the previous phase is marked `VERIFIED` by Umang in `05-TRACKER.md`.**

Every phase has a **Definition of Done (DoD)** and a **Proof** requirement. "Proof" always means something Umang can open in his own browser or read as raw output — never an agent's summary.

---

## PHASE 0 — Foundation and compliance
**Goal:** a boring, correct, submittable shell.

Deliverables:
- Shopify CLI app scaffolded (React Router template), embedded, session token auth working
- `shopify.app.toml` with exactly the four required scopes and the optional scopes declared separately
- Prisma schema from `03-ARCHITECTURE.md` §6, migrated on Railway Postgres
- Redis + BullMQ wired, one no-op test queue proving jobs run
- **All three GDPR webhooks** implemented and responding correctly, plus `app/uninstalled`
- Shopify Billing (managed pricing) with the four plans stubbed
- Central GraphQL client with throttle handling
- Deployed to Railway, installs on the dev store

DoD / Proof:
- Umang installs the app on a dev store from a real URL and sees the embedded admin load
- Raw output of the four webhook endpoints responding (HTTP 200 + signature verification)
- `appInstallation` query output pasted, showing exactly the intended granted scopes

⚠️ Compliance is built here, not at submission time. Do not defer webhooks or billing to a later phase.

---

## PHASE 1 — Crawler + Proof Engine + Audit
**Goal:** the app can see the store truthfully.

Deliverables:
- Sitemap-based crawler → `PageRecord` rows for products, collections, pages, articles, home
- HTML parser extracting: title, meta description, canonical, robots meta, H1, image alts, all JSON-LD blocks, word count
- Rule engine producing `Issue` rows (missing/duplicate/too-long titles, missing descriptions, missing alts, thin content, broken internal links)
- **Proof Engine**: `verify` queue, `Verification` rows, all five failure reason codes implemented
- Audit dashboard in Polaris showing issues by severity

DoD / Proof:
- A real crawl of the dev store completes and the page count matches reality
- Umang opens one product page's "Evidence" view and sees the **actual HTML snippet** the app extracted, matching what he sees in browser View Source

---

## PHASE 2 — Meta and alt text (the first real writes)
**Goal:** apply changes and prove they landed.

Deliverables:
- Meta title/description writer via `metafieldsSet` for products, collections, pages, articles
- Bulk templates with variables, with a preview before apply
- Image alt text writer
- **Manual-value protection**: never overwrite a value a human wrote. Only fill empty, duplicate or auto-generated values. This is the default and cannot be silently turned off.
- Every write enqueues a verification job
- Undo: revert last 24h, full change history

DoD / Proof:
- Umang picks 3 products, applies meta via the app, then opens View Source on the live storefront and sees the new title and description
- One deliberately failing case demonstrated: a resource where verification returns `FAIL` with a correct reason, not a false success

⚠️ This phase is where competitors fail. A green dashboard with nothing on the live page is a total failure of this phase, not a minor bug.

---

## PHASE 3 — Theme app extension (JSON-LD)
**Goal:** structured data without touching the theme.

Deliverables:
- Theme app extension with an app embed block, `target: head`
- JSON-LD for Product, BreadcrumbList, Organization, FAQPage, Article, ItemList, LocalBusiness
- **Conflict detector** per `03-ARCHITECTURE.md` §4 — disabled by default when the theme already emits Product schema
- `aggregateRating` only from real review metafields
- Zero runtime JS in the extension

DoD / Proof:
- Umang enables the app embed in the theme editor, opens a live product page, and sees exactly one Product JSON-LD block
- Google Rich Results Test on that live URL passes
- A conflict case demonstrated: on a theme that already emits Product schema, our output stays off and the UI explains why

---

## PHASE 4 — Redirects and broken links
Deliverables:
- Handle-change detection + `urlRedirectCreate`
- Redirect manager (list, create, bulk import, delete)
- 404/broken-link finder from crawl data + one-click 301

DoD / Proof: Umang breaks a handle on the dev store, the app detects it, creates the redirect, and the old URL actually 301s in his browser.

---

## PHASE 5 — Google Search Console + intent engine
Deliverables:
- GSC OAuth, site selection, daily pull
- CTR opportunities (high impressions, low CTR) → rewrite suggestions
- Cannibalisation detection
- Content gaps (queries with impressions, no matching page)
- Internal linking suggestions from query overlap + orphan page detection
- 28-day before/after CTR reporting on applied changes

DoD / Proof: real GSC data from a real connected property rendered in the dashboard, with numbers Umang can cross-check in his own GSC account.

**No keyword density anywhere in the scoring.**

---

## PHASE 6 — AI visibility layer
Split by exemption dependency.

**6A — no exemption needed (build now):**
- AI product-data completeness score (barcode/GTIN, vendor, type, material, size, colour, care, description depth, image count, dimensions) + bulk fill for derivable fields
- Bing Merchant Center + Google Merchant Center setup wizard
- AI Citation Tracker: weekly runs of the merchant's buying queries against LLM APIs, recording citation vs competitors, with a per-shop budget cap

**6B — needs `write_themes` exemption (v1.1):**
- robots.txt AI crawler allow rules (GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended, Bingbot)
- Crawl-waste rules for filter/sort parameters
- `llms.txt` generation, shipped with the honest "not a confirmed ranking factor" disclaimer
- Backup + restore for every theme file touched

DoD / Proof: for 6A, a real citation report from real API calls on a real store's queries. For 6B, the live `yourstore.com/robots.txt` in Umang's browser showing the new rules, and the file correctly restored after a test uninstall.

---

## PHASE 7 — Autopilot and reporting
Deliverables:
- Autopilot rules engine (new product → meta + alt + schema + AI fields, auto-verify, log)
- First 7 days run in **Suggest mode**; merchant approves before full auto is offered
- Weekly Proof Report by email, plus WhatsApp for India mode
- Onboarding flow: Scan → Autopilot → Report

DoD / Proof: Umang adds a new product to the dev store, does nothing, and sees it optimised and **verified on the live page** within the expected window.

---

## PHASE 8 — Submission
Deliverables:
- Listing copy (tagline ≤70 chars, value prop, features, how it works, pricing)
- 4–7 screenshots with real data
- Demo video, privacy policy, support email, test instructions with credentials
- Run Shopify's AI self-review tool and fix everything it flags
- Full pass over `08-APPROVAL-CHECKLIST.md`

DoD / Proof: submission confirmation, then the review outcome recorded in the tracker.

---

## Parallel track (Umang, not Antigravity)

- **Day 1:** submit the Online Store Protected Scope Exemption Request for `write_themes`. Do not wait for it; it only gates Phase 6B.
- **Day 1:** register for the reduced revenue share plan ($19 one-time).
- **Phase 5 onward:** recruit 15–20 beta stores from existing freelance clients — they become the first reviews and the first case studies.
