# BLOCKERS

Append-only. Newest at the bottom. After writing an entry, STOP the session.

Template:
```
## [DATE] [TRACKER ID] — <one-line title>
WHAT I TRIED:   attempt 1, attempt 2 (exact commands / code)
EXACT ERROR:    full error text, not paraphrased
WHAT I NEED:    the specific decision or access required
STOPPED AT:     file:line or step
```

---

## [2026-08-30] 6B.* — write_themes exemption not yet granted
WHAT I TRIED:   n/a — known upfront, not an agent blocker
EXACT ERROR:    Asset/themeFilesUpsert requires write_themes + a Shopify-granted exemption for App Store apps
WHAT I NEED:    Umang to submit the Online Store Protected Scope Exemption Request (SEO is a listed eligible category)
STOPPED AT:     Phase 6B is intentionally deferred. v1 ships without it. Do NOT attempt theme file writes until this clears.
