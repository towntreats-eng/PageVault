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

---

# SECOND PASS — Phases 3 to 8, 31 Aug 2026

The first pass covered Phases 0–2 and the shared services. This pass read everything else. The pattern held: the write paths that touch Shopify are real, and **almost every read path that produces a number was invented.**

## 7. Fabrications found in this pass

### F4 — The AI Citation Tracker never called an AI
`ai_citation.server.ts` returned the same hardcoded array to every store on earth: "best luxury silk evening dresses", "handcrafted men's leather oxford shoes", "affordable waterproof gold watch", with named competitors (nordstrom.com, revolve.com, mvmt.com) and an engine breakdown of Perplexity 100 / ChatGPT 66 / Claude 33 / Gemini 33. It made zero API calls. A beauty store would have been shown citations for evening dresses.

This is the headline differentiator in `01-PRODUCT.md` §4.4.

**Fixed:** real calls to OpenAI, Anthropic and Perplexity behind env keys; questions built from the store's own product types; results stored in `AiCitation`; the per-shop budget cap enforced before every call. With no key configured, the screen says no provider is configured and shows nothing.

### F5 — The keyword engine invented every number
`keyword_engine.server.ts`:
- wrote `volume: 1800, cpc: 1.45, difficulty: 28` into the database for **every** keyword, whatever the term;
- returned two fictional keywords ("silk evening dress", "leather oxford shoes") with fake rank movement 18 → 12 → 4 whenever a store had none;
- for real assignments returned hardcoded `volume: 2400, difficulty: 30, positionD0: 14, positionD7: 9, positionD28: 5` — and displayed `a.keyword_id`, a UUID, as the keyword term;
- wrote a `RankSnapshot` with `position: 14` and invented top-10 domains `["amazon.com","nordstrom.com","macys.com"]` on assignment;
- charged the shop's AI budget $0.0012 for a SERP API call that was never made.

**Fixed:** positions now come from real Search Console data (`refreshRanksFromGsc`). Volume and difficulty stay 0 until a paid provider is wired, and the UI shows "Not measured" rather than a number.

### F6 — Google Search Console was never contacted
`gsc.server.ts` stored a refresh token and then returned invented CTR opportunities, cannibalisation groups, content gaps and internal-link suggestions for fictional URLs on the merchant's domain. There was no token exchange and no API call.

**Fixed:** real OAuth refresh against `oauth2.googleapis.com`, real `searchanalytics.query` calls, and the four analyses derived from the merchant's own rows, with the date range attached to every result. Not connected reports as not connected.

### F7 — The weekly report emailed invented growth
`autopilot.server.generateWeeklyProofReport()` — the content of the merchant's email and WhatsApp message:
- `totalOptimizationsApplied: changeCount || 42` and `totalVerifiedByProofEngine: verifiedCount || 40`, so a store where nothing happened was emailed "40 verified optimizations";
- `verificationRate: "95.2%"` hardcoded;
- `trafficGrowthPercentage: "+18.4%"` — a traffic claim that was never measured;
- two invented keyword rankings;
- labelled "Last 7 Days" while counting all time.

**Fixed:** counts the last 7 days only, reports applied / verified / not detected / pending, and says plainly when nothing happened.

### F8 — The compliance screen certified itself
`app.submission.tsx` hardcoded `status: "PASS"` on every row under the banner *"100% Technical & Billing Compliance Verified — all 60 tasks across Phase 0 through Phase 8 are fully built, tested, and compiled cleanly with zero errors."* Nothing was checked at runtime, and the file itself contained 47 type errors' worth of siblings.

**Fixed:** the checks now run — granted scopes read from `currentAppInstallation`, registered webhook subscriptions, billing plans defined, whether the proof engine has ever confirmed a change on this store, queue durability — and anything that cannot be checked from inside the app is labelled "Cannot check" rather than passed.

### F9 — Smaller ones
- `app.meta.tsx` rendered three invented products ("Luxury Silk Evening Dress", …) and put a green **VERIFIED LIVE** badge on any product without a human-written title — a verified badge on work never done.
- Saving a meta *template* showed "Proof Engine auto-verification enqueued". Saving a template enqueues nothing and changes nothing on the store.
- The "send WhatsApp report" action returned `success: true` and sent nothing.
- `redirects.server.ts` returned two invented broken links when a store had none, and defaulted every redirect target to `/collections/all`.
- `pincode.server.ts` (India COD serviceability, answering "serviceable, COD available" for any 6-digit number) and `models/catalog_50.ts` are leftovers from a different product, with no callers.

## 8. The one that would have caused real damage

**Schema conflict detection was checking a URL that does not exist.** `app.schema.tsx` called `detectSchemaConflicts` with `https://{shop}/products/sample-product`. That 404s on every real store, so `parsed.jsonLdBlocks` was always empty and the answer was always "no conflict" — which would have switched our Product schema **on** for stores whose theme already emits it, producing exactly the duplicate structured data that `01-PRODUCT.md` Gap 3 describes as a competitor failure we attack.

Fixed: it fetches the store's most recently updated product page, and returns `checked: false` when it cannot load one. Ours stays off unless we have actually looked.

## 9. Revised state of the build

| Phase | Reality |
|---|---|
| 0 Foundation | Mostly real. Queues rebuilt. Session-storage type skew papered over with a cast — align the package majors. |
| 1 Crawler + Proof Engine | Real now. Was not before. |
| 2 Meta + alt writes | Real. This was always the strongest part. |
| 3 Schema | Generators are real; the conflict detector was broken and is fixed. Rich Results Test never run. |
| 4 Redirects | `urlRedirectCreate` real; the 404 finder was invented and is fixed. |
| 5 GSC | Was entirely invented. Now implemented — but **unproven**, because it needs Google OAuth credentials and a connected property. |
| 5B Keywords | Was entirely invented. Now GSC-backed. Volume/difficulty need a paid provider that does not exist yet. |
| 6A AI visibility | Citation tracker now real, needs a provider key. Product-data completeness score and Merchant Center wizard **do not exist at all** — those rows were simply false. |
| 6B Theme writes | Correctly blocked on the exemption. |
| 7 Autopilot | Rules engine is real; the report was invented and is fixed. |
| 8 Submission | Nothing was submitted. The screen certified itself. |

## 10. What Umang has to do before any of this can be called working

1. Delete `.git/*.lock` files, then run the app on Windows — `npm run build`, then `shopify app dev`. Nothing here has been executed; `tsc` passing is not the same as working.
2. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, connect a real Search Console property. Until then every keyword and GSC screen correctly shows "not connected".
3. Set at least one of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY` for AI citation tracking, and confirm the $15/month per-shop budget cap is what you want.
4. Provide `REDIS_URL`, or accept that scheduled re-verification is in-memory and dies on restart — the app now says so on screen rather than pretending.
5. Decide on a keyword data provider (DataForSEO or similar) or accept GSC-only metrics for v1. GSC-only is defensible and free: real positions beat estimated volumes.
