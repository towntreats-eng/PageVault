# DECISIONS

Append-only architecture decision log. One entry per decision, with the reason.

Template:
```
## [DATE] <decision title>
DECISION:   what was decided
WHY:        the reason
ALTERNATIVES: what was rejected and why
IMPACT:     what this constrains going forward
```

---

## [2026-08-30] SEO scope only — no reviews, bundles, upsell or cross-sell
DECISION:   This app does SEO and AI visibility only.
WHY:        Reviews would require order/customer data and drag us into protected customer data approval (Level 1 + 2). Upsell/bundles need storefront JS, which destroys the zero-bloat positioning, plus cart transform is one-per-store and partly Plus-gated. App Store listings rank in one category; an everything-app ranks for nothing.
ALTERNATIVES: A single "Store OS" app — rejected. Conversion features become a separate app later.
IMPACT:     Any feature that does not make the store more findable in search or AI is out of scope.

## [2026-08-30] v1 ships without write_themes
DECISION:   Launch with metafields + theme app extension only. robots.txt / llms.txt features move to v1.1.
WHY:        The exemption is a separate Shopify process with a long lead time and known dev-vs-production friction. Blocking launch on it would block everything.
ALTERNATIVES: Waiting for the exemption before submitting — rejected, serialises two independent approvals.
IMPACT:     Phase 6B is deferred. Everything else must work without any theme file write.

## [2026-08-30] Search data comes from Google Search Console, not Shopify analytics
DECISION:   No ShopifyQL / read_reports.
WHY:        read_reports grants shopifyqlQuery, which requires Level 2 protected customer data approval — developers have been blocked in app review over exactly this.
ALTERNATIVES: Shopify analytics — rejected on approval risk. GSC is also where SEO data actually lives.
IMPACT:     GSC OAuth is a required dependency for Phase 5.

## [2026-08-30] Proof Engine is Phase 1, not a later feature
DECISION:   Live-page verification is built before any write feature exists.
WHY:        It is the product's core differentiator and cannot be bolted on afterwards — every write path must enqueue a verification job by construction.
ALTERNATIVES: Ship writes first, add verification later — rejected; that produces exactly the competitor failure we are attacking.
IMPACT:     No write feature is complete without its verification job.

## [2026-08-31] No speed / image-compression module — this stays a pure SEO app
DECISION:   We do not build image compression, CSS/JS minification, asset preloading, app-script control or "Turbo/Rocket" speed modes, even though SEOAnt and TinySEO both ship them.
WHY:        Minification, preloading and script control require theme file writes plus storefront JavaScript. That destroys the "zero theme injection, zero storefront bloat" positioning in 01-PRODUCT.md §4, which is one of only four things we win on.
ALTERNATIVES: Full parity — rejected, costs us the positioning. Image-only compression — rejected by Umang, keeps the quota-anxiety pricing axis we want to delete.
IMPACT:     Seven nav items instead of eight. No image quota in pricing. UI must state plainly that we do not touch storefront speed (12-UI-UX-SPEC.md, 11-COMPETITOR-PARITY.md §6). OPEN: whether to display Core Web Vitals as a read-only diagnostic from the PageSpeed Insights API — not yet decided.

## [2026-08-31] No backlink exchange marketplace in v1
DECISION:   We ship Backlink Audit (profile, toxic flags, competitor gap, unlinked brand mentions, outreach targets) as Phase 6C. We do not clone SEOAnt's 3-way A-B-C link exchange. Revisit in v2 only as a curated, manually-approved partner directory.
WHY:        Reciprocal and three-way link schemes are named in Google's link-spam policy. The manual action lands on the merchant's store, not on us, and it is exactly the kind of feature that gets flagged in Shopify app review.
ALTERNATIVES: Exact clone — rejected on merchant risk. Nothing at all — rejected, we still need a credible off-page story.
IMPACT:     New Phase 6C. "Backlinks" is a tab under Keywords, not a top-level nav item.

## [2026-08-31] AI Content Creation is in v1, wired to the real keyword engine
DECISION:   Content Planner (seed keyword to topic clusters) plus Blog Generator including bulk, as a new Phase 5.5.
WHY:        It is SEOAnt's strongest upgrade hook and it is the natural output of 10-KEYWORD-ENGINE.md — we already have the keyword data their generator lacks.
ALTERNATIVES: Defer to v1.1 — rejected, leaves an obvious hole in the listing.
IMPACT:     New Phase 5.5. Drafts are created as unpublished Shopify articles; auto-publish is off by default and re-confirmed every 90 days. Generation draws on the per-shop AI budget cap in 03-ARCHITECTURE.md §9. Adds a content-refresh queue driven by rank-tracker and GSC position loss.

## [2026-08-31] UI is specified centrally, not per-feature
DECISION:   12-UI-UX-SPEC.md is binding. The Evidence drawer and the diff-preview component are built once in Phase 1/2 and reused by every later screen.
WHY:        The competitor teardown showed the loss is in information design, not feature count — in-app ads, fake data in locked panels, unexplained scores, one-click writes with no preview.
ALTERNATIVES: Let each phase design its own screens — rejected, guarantees inconsistency and re-work.
IMPACT:     No screen is done until it passes the acceptance checklist in 12-UI-UX-SPEC.md §11.

## [2026-08-31] Core Web Vitals shown read-only; no HTML sitemap in v1
DECISION:   CWV field data from the PageSpeed Insights API is displayed in the audit (Phase 5), read-only, with no "fix" button and no separate score. No HTML sitemap page in v1.
WHY:        CWV is a ranking signal and reporting it ships zero code to the storefront, so it does not breach the no-speed-module decision. An HTML sitemap needs a theme template or app proxy and adds little value on top of Shopify's own sitemap.xml.
ALTERNATIVES: Skip CWV entirely — rejected, we would be blind to a real signal. Build the HTML sitemap for parity with TinySEO — rejected, low value, extra surface.
IMPACT:     Phase 5 gains a read-only CWV panel. Item 27 in 11-COMPETITOR-PARITY.md is closed as REFUSE.

## [2026-08-31] BUILT now requires the code path to have been executed
DECISION:   A task may only be marked BUILT if the code path has been run at least once and its output inspected. Existing, compiling or being imported is not BUILT.
WHY:        60 of 60 tasks were marked BUILT while three functions shipped fabricated numbers to the merchant and the rule engine had zero callers. See 13-CODE-AUDIT.md.
ALTERNATIVES: Tighten review instead — rejected, review had already passed these.
IMPACT:     05-TRACKER.md rows corrected; every unaudited BUILT row is to be treated as an unverified claim.
