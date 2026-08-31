# 13 — CODE AUDIT, 31 Aug 2026

**What this is:** a read of the actual code in `shop forge`, against the 60 tasks marked `BUILT` in `05-TRACKER.md`.
**Why:** 60 of 60 tasks were marked `BUILT` and 0 were `VERIFIED`. Before adding the parity work in `11-COMPETITOR-PARITY.md`, someone had to check whether the foundation was real.
**Result:** the app was reporting work it had never done. Three functions shipped fabricated numbers to the merchant. Fixed in commit `315f59c` on branch `fix/foundation-audit`.

---

## 1. The three fabrications (severity: ship-stopping)

### F1 — "One-Click Fix" wrote nothing to Shopify
`seo.server.ts → runFullAutoSeoOptimization()` — the function behind the main dashboard button.

What it did:
- Read products, **counted** how many were missing a meta title or description.
- Reported that count as `metaTitlesFixed` / `metaDescsFixed` — the problem count, presented as the fix count.
- Set `healthScore = 100` unconditionally.
- Computed `bytesSaved = images × 250KB` — an invented number.
- Wrote all of it into `SeoAudit`, which `getSeoAuditSummary()` then **preferred over live data**, so after one click the dashboard showed 100/100 and "MB saved" permanently.
- Made **zero write calls to the Shopify API**.

This is precisely the Booster SEO failure documented in `01-PRODUCT.md` Gap 1 — the thing this product exists to attack — reimplemented in our own code. Shipping it would have been fraud.

**Fixed:** it now writes meta titles and descriptions through `writeResourceSeoMetafield` (real `metafieldsSet`), skips human-written values, paginates the whole catalogue, and reports only what was actually written, as `Applied — verification pending`.

### F2 — Image compression compressed nothing
`image.server.ts → compressAllProductImages()`

- Hardcoded `origSize = 1,850,000` and `compSize = 420,000` for **every** image.
- Wrote `ImageOptLog` rows with `status: "compressed"`.
- Reported "X MB saved" from those constants.
- Computed alt text and **never sent it to Shopify at all**.
- Returned `success: true` inside its own `catch` block.

**Fixed:** deleted. Image compression is also out of scope (`DECISIONS.md`, 31 Aug). `app.images.tsx` is now an alt-text screen that performs real writes, and it states on screen that this app does not compress images.

### F3 — An API failure rendered as a perfect store
`getSeoAuditSummary()` returned `healthScore: 100, isAutoOptimized: true` from its `catch` block. A network blip or an expired token looked identical to a flawless store.

**Fixed:** `available: false` plus the error, surfaced as a critical banner. A failure is now reported as a failure.

Related, in `app._index.tsx`: the success message *"1-Click SEO Optimization complete! Every product title, description, and ALT tag is optimized and verified live"* was set **client-side, before the request finished**, regardless of outcome. And "Good Results" was `totalProducts × 3 − issues`, a number with no meaning.

---

## 2. Correctness defects

| # | Defect | Consequence | Status |
|---|---|---|---|
| C1 | The crawler never fetched a page — it read sitemap URLs and wrote `status_code: 200` unconditionally | The entire audit ran on assumed data. 404 detection was fictional. | Fixed |
| C2 | `issues.server.ts` (the rule engine) had **zero callers** anywhere in the codebase | No `Issue` row was ever created from a real page. Phase 1's core deliverable did not run. | Fixed — the crawler now calls it |
| C3 | Verification ran **inline**, milliseconds after the write | Shopify's CDN cannot have refreshed that fast, so correct writes would report false failures. | Fixed — queued, 90s/10m/60m backoff |
| C4 | The proof engine had no `alt` branch | Every alt-text verification wrote `FAIL` with no reason code and an empty message. | Fixed |
| C5 | `CACHE_PENDING` said "automatic re-verify scheduled" — nothing was ever scheduled | The app lied about a retry, in the one component whose entire job is not lying. | Fixed — the claim is now gated on the queue actually accepting the job |
| C6 | Alt text used deprecated `productUpdateMedia` and read `userErrors` | Real failures arrive in `mediaUserErrors`, so failed writes were treated as successes. | Fixed — `fileUpdate` |
| C7 | `products(first: 250)` with no pagination, in three places | Any store above 250 products was scored on a fraction of its catalogue and told it was fine. | Fixed |
| C8 | BullMQ had one no-op `test-queue`; no crawl/verify/reverify queues existed | `03-ARCHITECTURE.md` §7 was not implemented. Weekly re-verification did not exist. | Partly fixed — crawl/verify/reverify queues exist; the weekly `reverify` sweep still needs its scheduler |
| C9 | `api_version = "2026-04"` in the toml, `ApiVersion.January25` in code, installed library speaks up to `2026-01` | Three different answers to one question. | Fixed — `2026-01` everywhere |
| C10 | No fetch timeouts anywhere | One hanging page would stall a whole crawl. | Fixed — 12s |
| C11 | 47 TypeScript errors in `app/`, all Polaris v12 misuse | `Banner status=` is ignored in v12, so **critical banners rendered as ordinary ones**. | Fixed — 0 errors |
| C12 | `scratch/` holds a different product's test files (reviews, wishlist, stock alerts) that do not compile | Noise that hides real errors. | Excluded from tsconfig; delete when convenient |

---

## 3. What was genuinely good

Not everything was theatre, and the parts that were right are worth naming:

- `meta_writer.server.ts` — the `metafieldsSet` write path is correct, and **manual-value protection genuinely works**: a human-written value is preserved and the function returns `protected: true`.
- `proof_engine.server.ts` — the live-fetch-and-compare design was right, and `Verification` rows were really being persisted. The bugs were around it, not in the idea.
- `parser.server.ts` — straightforward and correct.
- The Prisma schema matches `03-ARCHITECTURE.md` §6 closely.
- The four webhooks exist and use `shopify.authenticate.webhook`.

---

## 4. Decisions I made while fixing this

| # | Decision | Reason |
|---|---|---|
| D-13.1 | Core Web Vitals **will** be shown, read-only, from the PageSpeed Insights API, in Phase 5 | It is a ranking signal and we ship no code to the storefront to report it, so it does not touch the no-speed-module decision. It gets no "fix" button and no score of its own. |
| D-13.2 | **No HTML sitemap page** in v1 | Shopify already generates `sitemap.xml`. An HTML sitemap needs a theme template or an app proxy route and adds little for a store whose XML sitemap works. Revisit only for very large catalogues with orphan pages. |
| D-13.3 | Alt text is written with `fileUpdate`, not `productUpdateMedia` | The latter is deprecated and reports failures in a field the old code never read. |
| D-13.4 | Every write path returns `Applied`, never `Verified` | Only the proof engine, having fetched the live page, may produce `Verified`. |
| D-13.5 | The in-process queue fallback must declare itself | When Redis is absent, jobs are kept in memory and lost on restart. The UI says so rather than implying durability. |

---

## 5. What is still not done (do not mark these BUILT)

1. **Weekly re-verification sweep** — the `reverify` queue exists; the scheduler that walks every PASS change weekly does not. `03-ARCHITECTURE.md` §3 requires it.
2. **Everything in Phases 3–8 is unaudited.** I read Phase 0–2 and the shared services. Schema, redirects, GSC, keyword engine, AI citations, autopilot and the submission screen are still 60-of-60 `BUILT` claims that nobody has checked. Expect more of what §1 and §2 found — `ai_citation.server.ts` is 72 lines, `gsc.server.ts` is 123, `keyword_engine.server.ts` is 226 for a multi-market SERP tracker. Those sizes are not consistent with the claims.
3. **Nothing has been run against a real store.** The build could not be exercised from this session because `node_modules` holds Windows binaries; `tsc` passes, which is not the same thing.
4. **`_index/route.tsx`, `app.additional.tsx`, `app.analytics.tsx`, `app.speed.tsx`, `app.meta.tsx`, `app.schema.tsx`, `app.submission.tsx`** still carry emoji-heavy headings and claim-style copy that has not been through `12-UI-UX-SPEC.md` §11.

---

## 6. The rule this episode proves

`06-RULES.md` already says the agent may not self-certify. That was not enough: 60 rows said `BUILT` and three of them shipped invented numbers to a merchant.

Add to the definition of `BUILT`:

> `BUILT` requires that the code path was **executed at least once** and its output inspected. A file existing, compiling, or being imported is not `BUILT`. A function whose result the app displays must have been run and its displayed value compared against the source of truth.

Two of the three fabrications above would have been caught by one person clicking the button once and then looking at their storefront.
