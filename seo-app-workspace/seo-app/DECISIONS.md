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
