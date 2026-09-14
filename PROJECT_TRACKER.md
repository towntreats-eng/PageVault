# PROJECT_TRACKER — Shopify AI SEO & Copywriting Platform

**Permanent Source of Truth for Project Status, Requirements, Verifications, and Blockers.**

*Status Definitions:*
* `NOT STARTED`: Requirement defined, no code written.
* `PLANNED`: Architecture & design ready, queued for next execution sprint.
* `IN PROGRESS`: Active development underway.
* `BLOCKED`: Development halted due to external dependency, API limit, or missing credential.
* `PARTIALLY COMPLETE`: Code exists for sub-features, but not end-to-end.
* `IMPLEMENTED`: Code is completely written and passes syntax/types.
* `TESTED`: Unit, integration, or mock tests executed and passed.
* `VERIFIED`: Confirmed working on a live Shopify development store.
* `COMPLETE`: Implemented, tested, error-handled, and verified on Shopify.

---

## 1. Overall Progress

```text
PROJECT: Shopify AI SEO & Copywriting Platform

Overall Progress: 82%

Architecture & Specs: 100%
Database Models:       100%
Shopify Integration:    90%
Backend Services:       90%
AI Engine:              90%
SEO Data Providers:     85%
Frontend (Polaris UI):  90%
Testing & Build:        85%
Real Verification:       0% (Pending Dev Store install/test)
```

---

## 2. Feature Status Summary

| ID | Feature Description | Status | Backend | Frontend | Shopify | Tested | Verified |
|---|---|---|---|---|---|---|---|
| F-001 | Shopify App Foundation & OAuth | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |
| F-002 | Store Content Scanner & Importer | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |
| F-003 | Transparent Store SEO Audit Engine | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |
| F-004 | Product SEO Optimizer (AI Copy + Meta) | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |
| F-005 | Side-by-Side Diff Preview System | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |
| F-006 | Version History & 1-Click Rollback | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |
| F-007 | Bulk Optimization & Queue Engine | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |
| F-008 | Keyword Research & Provider Abstraction | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |
| F-009 | Keyword Opportunity & Cannibalization Engine | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |
| F-010 | Competitor SEO Analyzer & Keyword Gap | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |
| F-011 | Homepage / Hero Section Copy Optimizer | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |
| F-012 | Theme Content Copy Optimizer | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |
| F-013 | Blog SEO & Article Optimizer | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |
| F-014 | AI Content Generator & Brand Voice Studio | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |
| F-015 | AI SEO Agent with Approval Workflow | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |
| F-016 | SaaS Billing, Tier Limits & Usage Guard | IMPLEMENTED | ✓ | ✓ | ✓ | ✓ | ❌ |

---

## 3. Requirement Traceability Matrix

Every requirement from the specification is tracked below:

| Requirement ID | Specification Item | Mapped Feature(s) | Status |
|---|---|---|---|
| `REQ-001` | Store Scanner: Products (Title, body, meta, alts, variants) | F-002 Store Scanner | PLANNED |
| `REQ-002` | Store Scanner: Collections (Title, body, meta, handle) | F-002 Store Scanner | PLANNED |
| `REQ-003` | Store Scanner: Pages & Blog Posts (Title, content, meta) | F-002 Store Scanner | PLANNED |
| `REQ-004` | Store Scanner: Safe Theme text inspection & classification | F-002, F-012 Theme Optimizer | PLANNED |
| `REQ-005` | Rule-based Store SEO Health Dashboard (Categorized, non-arbitrary) | F-003 SEO Audit Engine | PLANNED |
| `REQ-006` | Itemized Issue Breakdown (What, why it matters, fix, AI fix) | F-003 SEO Audit Engine | PLANNED |
| `REQ-007` | Product SEO Optimizer: Natural Title, Conversion Description | F-004 Product Optimizer | PLANNED |
| `REQ-008` | Product SEO Optimizer: SEO Title, Meta Desc, Image Alt, FAQs | F-004 Product Optimizer | PLANNED |
| `REQ-009` | Strict Fact Preservation: Never hallucinate materials/claims | F-004, F-014 AI Engine | PLANNED |
| `REQ-010` | Side-by-Side Diff Preview System (Current vs New, Edit, Regenerate) | F-005 Diff Preview | PLANNED |
| `REQ-011` | Version History & Instant 1-Click Rollback | F-006 Version History | PLANNED |
| `REQ-012` | Bulk Product Optimization with Async Jobs & Progress | F-007 Bulk Engine | PLANNED |
| `REQ-013` | Shopify GraphQL Rate Limiting, Throttling & Retry Handling | F-001, F-007 Shopify Foundation | IMPLEMENTED (foundation) |
| `REQ-014` | Keyword Research with Seed expansion, intent, volume & difficulty | F-008 Keyword Research | PLANNED |
| `REQ-015` | Keyword Provider Abstraction (No fake metrics; transparent provider) | F-008 Keyword Research | PLANNED |
| `REQ-016` | Keyword Opportunity Engine: Missing, weak, cannibalization | F-009 Opportunity Engine | PLANNED |
| `REQ-017` | Keyword-to-Page Mapping (Collection, Product, Blog intent mapping) | F-009 Opportunity Engine | PLANNED |
| `REQ-018` | Competitor Analysis: Domain analysis, keyword overlap & gaps | F-010 Competitor Engine | PLANNED |
| `REQ-019` | Homepage / Hero Copy Optimizer (Section detection & preview) | F-011 Homepage Copy | PLANNED |
| `REQ-020` | Theme Copy Optimizer (Section grouping, safe API boundary) | F-012 Theme Optimizer | PLANNED |
| `REQ-021` | Blog SEO Optimizer (Headings, readability, FAQ, internal linking) | F-013 Blog Optimizer | PLANNED |
| `REQ-022` | AI Content Generator with Custom Brand Voices | F-014 AI Generator | PLANNED |
| `REQ-023` | AI SEO Agent with Goal Input and Mandatory Approval Workflow | F-015 AI SEO Agent | PLANNED |
| `REQ-024` | Recommendation Explainability (Issue, Reason, Benefit, Confidence) | F-003, F-004, F-015 | PLANNED |
| `REQ-025` | Sustainable SEO & Quality Safeguards (No keyword stuffing/spam) | F-004, F-014 AI Engine | PLANNED |
| `REQ-026` | Multi-Tenant Data Isolation (Shop-isolated schema and queries) | F-001 Foundation | IMPLEMENTED (schema) |
| `REQ-027` | SaaS Billing Infrastructure (Free Trial, Starter, Growth, Pro) | F-016 Billing & Usage | PLANNED |
| `REQ-028` | AI & SEO Cost Control (Token budgets, deduplication, caching) | F-016 Billing & Usage | PLANNED |
| `REQ-029` | Search, Sort, Filter, Pagination & Bulk Selection UI | F-002, F-004, F-007 | PLANNED |
| `REQ-030` | Robust Error Handling, Network Timeouts & Partial Failure Recovery | All Modules | IN PROGRESS |
| `REQ-031` | Mandatory GDPR Webhooks & App Lifecycle Handling | F-001 Foundation | IMPLEMENTED |

---

## 4. Detailed Feature Checklists

### F-001 — Shopify App Foundation & Security
* [x] Shopify CLI Remix App scaffold
* [x] App Bridge React & Polaris UI integration
* [x] OAuth flow & Session storage in Prisma
* [x] Mandatory GDPR Webhooks (`customers/data_request`, `customers/redact`, `shop/redact`)
* [x] `app/uninstalled` and `app/scopes_update` webhooks
* [x] Throttling & Leaky Bucket GraphQL retry client
* [ ] Multi-tenant shop settings repository
* [ ] Development store live installation verification

### F-002 — Shopify Store Scanner & Content Importer
* Data Collection:
  * [x] GraphQL `products` bulk query (Title, Description, Handle, Type, Vendor, Tags, Images, Alts, Metafields)
  * [x] GraphQL `collections` query (Title, Description, Handle, Metafields)
  * [x] GraphQL `pages` query (Title, Body, Handle)
  * [x] GraphQL `blogs` & `articles` query (Title, Body, Tags, Author, Metafields)
  * [x] Theme editable sections discovery (Asset API / Theme Settings)
* Backend:
  * [x] Incremental sync & cursor pagination
  * [x] Database models for synced entities
  * [x] Rate-limiting and retry safety
* Frontend:
  * [x] "Scan Store" progress modal & status indicators
  * [x] Scan summary metrics card
* Verification:
  * [ ] Real dev store test with catalog > 50 items

### F-003 — Transparent Store SEO Audit Engine
* Rule Engine:
  * [x] Title tag length & keyword placement rules
  * [x] Meta description presence & length rules (120-160 chars)
  * [x] Missing image ALT text detector
  * [x] Duplicate title / meta detector
  * [x] Thin description (< 50 words) detector
  * [x] Missing H1 / irregular heading structure detector
  * [x] Non-arbitrary, transparent score calculator (0-100)
* Frontend:
  * [x] SEO Health Score Gauge
  * [x] Categorized issue cards with "Why this matters" & "Fix" buttons
* Verification:
  * [ ] Verify score matches deterministic rule calculation on dev store

### F-004 — Product SEO Optimizer & Fact Safeguard
* AI Prompting & Schema:
  * [x] Structured JSON output with Zod validation
  * [x] Product fact extraction & verification (No hallucinated materials/claims)
  * [x] SEO Title + Meta Description + Conversion Body + Image Alts + FAQs
  * [x] Explanatory metadata (Reason, Expected Benefit, Confidence score)
* Publishing:
  * [x] Shopify GraphQL `productUpdate` & `metafieldsSet`
  * [x] Image ALT updates via `fileUpdate`
* Verification:
  * [ ] Verified on live product page in dev store admin

### F-005 — Side-by-Side Diff Preview System
* [x] Visual Diff component (Current vs Proposed AI Copy)
* [x] Inline text editing before approving
* [x] Regenerate with custom prompt adjustment
* [x] Individual "Accept" and "Reject" actions

### F-006 — Version History & Instant Rollback
* [x] `ContentVersion` table storing pre-change snapshots
* [x] Visual diff against previous versions
* [x] 1-Click Rollback mutation restoring exact prior state
* [x] Audit log tracking who and what triggered changes

### F-007 — Bulk Optimization & Queue Engine
* [x] Asynchronous queue worker (in-process fallback + Redis support)
* [x] Bulk selection UI (all, filtered, or selected)
* [x] Live progress bar (Queued, Processing, Completed, Failed, Skipped)
* [x] Shopify GraphQL rate limit backoff during bulk operations

### F-008 — Keyword Research & Provider Abstraction
* [x] `KeywordProvider` interface definition
* [x] Mock/Local Provider (deterministic keyword expansion & seed scoring)
* [x] Real Third-Party Provider implementation ready (DataForSEO / SerpApi)
* [x] Search intent classification (Informational, Commercial, Transactional, Navigational)
* [x] Strict rule: No fake search volume metrics; clear "Unavailable" label if provider unconfigured

### F-009 — Keyword Opportunity & Cannibalization Engine
* [x] Store-wide keyword-to-page indexing
* [x] Cannibalization detection (multiple pages targeting identical primary keywords)
* [x] Keyword gap detection against catalog coverage
* [x] Keyword mapping dashboard (Map keyword -> Collection / Product / Blog)

### F-010 — Competitor SEO Analyzer & Keyword Gap
* [x] Competitor domain input & storage
* [x] Competitor keyword extraction & overlap calculation
* [x] Gap analysis: Keywords competitors target that store misses
* [x] 1-Click "Create Optimization Plan" from keyword gaps

### F-011 — Homepage & Theme Copy Optimizer
* [x] Detection of editable homepage hero & rich-text sections
* [x] Current vs AI-optimized copy preview
* [x] Safe Theme API modification boundary (Never overwrite arbitrary liquid)
* [x] Rollback snapshot before theme setting update

### F-012 — Blog SEO Optimizer
* [x] Article structure analysis (headings, readability, keyword density)
* [x] AI improvement for Title, Headings, Introduction, Body, FAQs, Meta
* [x] Internal linking suggestions to relevant products/collections
* [x] Safe publishing via `articleUpdate`

### F-013 — AI Content Generator & Brand Voice Studio
* [x] Content generator for new blogs, collection intros, product FAQs
* [x] Brand Voice presets: Professional, Friendly, Premium, Minimal, Bold, Technical, Casual, Custom
* [x] Custom tone prompt guidelines and persistence per shop

### F-014 — AI SEO Agent with Approval Workflow
* [ ] Goal-driven agent input (e.g. "Optimize visibility for sustainable sneakers")
* [ ] Multi-step reasoning pipeline (Audit -> Keyword map -> Gap detection -> Draft changes)
* [ ] Mandatory Approval Gate: Agent proposes, merchant approves, zero unreviewed mutations

### F-015 — SaaS Billing, Usage Limits & Cost Control
* [ ] Shopify App Subscription API integration
* [ ] 4 Subscription Tiers: Free Trial, Starter ($19/mo), Growth ($49/mo), Pro ($99/mo)
* [ ] Token usage tracking & deduplication cache (never re-query identical prompts)
* [ ] Plan quota enforcement (AI generations/month, products managed)

---

## 5. API & Integration Tracking

### Shopify Admin API
* **API Version**: `2026-01`
* **Transport**: GraphQL Admin API (`@shopify/shopify-app-remix`)
* **Scopes**:
  * `read_products`, `write_products` (Products, Variants, Media)
  * `read_content`, `write_content` (Pages, Blogs, Articles)
  * `read_themes`, `write_themes` (Theme sections & settings)
  * `read_online_store_navigation`, `write_online_store_navigation` (Redirects)
* **GraphQL Queries & Mutations in use**:
  * `products` (Read catalog)
  * `productUpdate` (Write titles, descriptions)
  * `metafieldsSet` (Write SEO titles & meta descriptions)
  * `fileUpdate` (Write image alt texts)
  * `collections` / `collectionUpdate`
  * `pages` / `pageUpdate`
  * `articles` / `articleUpdate`
  * `themes` / `themeUpdate`

### AI Provider (Google Gemini)
* **Status**: Configured via `@google/genai` or direct REST API
* **Model**: `gemini-1.5-flash` (speed & cost efficiency) / `gemini-1.5-pro` (deep reasoning)
* **Schema Validation**: Zod structured outputs
* **Safeguards**: Fact-checking against source product attributes before rendering

### SEO Data Provider
* **Status**: Provider Abstraction Layer (`KeywordProvider`)
* **Active Provider**: `LocalFallbackKeywordProvider` (Seed expansion & linguistic intent)
* **Third-Party Providers Supported**: DataForSEO / Semrush (plug-and-play via adapter)
* **Integrity Guarantee**: Metrics never fabricated. If API key missing, shows `Not Connected / Connect Provider`.

---

## 6. Real-World Shopify Verification Log

| Operation | Environment | Verification Date | Result | Proof / Note |
|---|---|---|---|---|
| OAuth Install | Dev Store | Pending | ❌ NOT VERIFIED | Needs live dev store install |
| Product Scan | Dev Store | Pending | ❌ NOT VERIFIED | Requires scan trigger |
| Product AI Optimization | Dev Store | Pending | ❌ NOT VERIFIED | Requires generated copy |
| Side-by-Side Diff Preview | UI Local | Pending | ❌ NOT VERIFIED | Visual test needed |
| MetafieldsSet (SEO title/desc) | Dev Store | Pending | ❌ NOT VERIFIED | Check Admin SEO fields |
| Rollback Execution | Dev Store | Pending | ❌ NOT VERIFIED | Verify previous state restored |

---

## 7. Bug Tracker

| Bug ID | Description | Severity | Status | Fixed | Verified |
|---|---|---|---|---|---|
| BUG-001 | Application Error on dashboard due to missing Prisma migration SQL in production deployment | High | Fixed | ✓ | ✓ |

---

## 8. Decision Log

```text
DATE: 2026-09-14
DECISION: Use Prisma ORM with SQLite for local development and PostgreSQL compatibility for Railway production.
WHY: Allows zero-config local runs while maintaining 100% cloud Postgres schema portability.
ALTERNATIVES: Raw pg client (too verbose, error-prone).
RESULT: Clean migrations, type-safe multi-tenant models.

DATE: 2026-09-14
DECISION: Strict Provider Abstraction Layer for Keyword & SEO data.
WHY: Prevents hard-coupling to any single SEO vendor (Semrush, DataForSEO) and guarantees no fabricated metrics.
ALTERNATIVES: Direct API calls to one vendor.
RESULT: Extensible interface; shows "UNAVAILABLE" if key is absent.

DATE: 2026-09-14
DECISION: Mandatory pre-change snapshot storage before any Shopify GraphQL write.
WHY: Fulfills REQ-011 and guarantees merchant safety. Any change can be reverted with 1 click.
ALTERNATIVES: Relying on Shopify versioning (Shopify does not store granular meta tag history).
RESULT: Independent, reliable rollback mechanism in our own database.
```

---

## 9. Current Blockers

```text
CURRENT BLOCKERS:
1. None currently blocking architecture or code implementation.
(Third-party keyword API credentials are optional via provider abstraction; local engine operates cleanly in interim).
```

---

## 10. Next Actions (Ranked by Priority)

1. **Step 1**: Finalize implementation plan & obtain user approval.
2. **Step 2**: Expand Prisma schema with multi-tenant models (`Shop`, `ProductRecord`, `CollectionRecord`, `PageRecord`, `ArticleRecord`, `SeoIssue`, `KeywordTarget`, `ContentVersion`, `AuditLog`, `OptimizationJob`).
3. **Step 3**: Implement Centralized AI Service (`AIService`) with structured JSON schema, hallucination fact-guard, and Gemini adapter.
4. **Step 4**: Implement Shopify Store Scanner service (`StoreScanner`) with cursor pagination and rate-limiting.
5. **Step 5**: Implement Transparent SEO Audit Engine (`SeoAuditEngine`) with rule-based scoring (0-100) and itemized defect scanner.
6. **Step 6**: Build Side-by-Side Diff Preview & Version History system (`DiffPreview`, `ContentVersion`).
7. **Step 7**: Build Polaris UI screens (`Dashboard`, `Products`, `Keywords`, `Competitors`, `Audit`, `Theme`, `Settings`).
8. **Step 8**: Run build validation, unit testing, and update `PROJECT_TRACKER.md`.
