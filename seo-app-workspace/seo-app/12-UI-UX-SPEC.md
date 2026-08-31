# 12 — UI / UX SPEC

**Who this is for:** Antigravity, when building any screen. No screen ships without passing §11.
**Constraint:** Shopify App Store review requires Polaris and App Bridge. We do **not** invent a design language — we use Polaris correctly and win on *information design*, not decoration.
**Reference for what we are beating:** `11-COMPETITOR-PARITY.md` §2.

---

## 1. The problem with every SEO app's UI

They are all built as **feature drawers**: eight nav items, each one a settings page with toggles, each toggle claiming an outcome nobody can see. The merchant's actual question — *"did anything I paid for actually happen to my store?"* — is answered nowhere.

Our UI answers that question on every screen.

---

## 2. Six principles (non-negotiable)

**P1 — Evidence beats score.**
Every number is clickable and every click ends at raw evidence: the HTML we fetched, the URL we fetched it from, the timestamp, and a link to open the live page. If a number cannot be traced to evidence, it does not go on screen.

**P2 — One primary action per screen.**
Each screen has exactly one filled/primary button. Everything else is secondary or plain. If a screen needs two primary actions, it is two screens.

**P3 — Never sell inside the work.**
Zero ads. Zero cross-sell of our own future apps. Zero partner banners. Upgrade prompts appear in exactly two places: the Plan screen, and a single inline row at the point where a limit is actually reached — stated as a fact, not as a pitch.

**P4 — Say the limit out loud.**
When Shopify or the theme makes something impossible, the UI says so in plain language and stops offering it. A greyed-out button with no explanation is a bug.

**P5 — No fabricated data, anywhere.**
No sample rows in the merchant's tables. No placeholder metrics in locked panels. No "coffee beans" in a beauty store. If we have nothing to show, we show an honest empty state.

**P6 — Destructive is always previewable and reversible.**
Nothing writes to the store without a diff the merchant can read, and nothing is applied without an undo path.

---

## 3. Information architecture

**Seven flat nav items. No `View more` collapse.** Each item is a noun the merchant already understands, and each concept has exactly one home.

```
Home            → What happened, what is verified, what needs you
Fix             → Issues found, grouped by severity, with the fix queue
Pages           → Per-page workbench (meta, alt, schema, keyword, evidence)
Keywords        → Research · Rank tracker · Competitors · Search Console · Backlinks
Content         → Planner · Drafts
AI Visibility   → Crawler access · Product data · Citations
Settings        → Account · Automation · Integrations · Usage · Data & uninstall
```

**Why this beats their 8 + collapse:**

| Their IA problem | Our rule |
|---|---|
| Meta tags in *Content Optimization*, schema in *Technical SEO*, redirects in *Technical SEO* but redirect automation as an upsell card inside it | One concept, one home. Anything that writes to a single page is reachable from **Pages**. |
| Speed Optimization as a top-level item | Not built (`11-COMPETITOR-PARITY.md` D-11.2). Seven items instead of eight. |
| `View more / View less` inside a Shopify iframe | Never. Everything is always visible. |
| Backlinks as its own top-level item selling a link scheme | Backlinks is a tab under **Keywords**, because it is off-page keyword work. |

**Navigation rules**
- Use App Bridge navigation menu so items appear in Shopify's own left rail.
- Deep links: `/pages/:resourceGid` must be openable directly from Home, Fix and search results. No "go to tab, then filter" journeys.
- Breadcrumb back to the parent list on every detail view.

---

## 4. Design system

We use Polaris tokens. No custom colour values, no custom spacing scale, no third-party UI kit.

**Status vocabulary — the whole app uses exactly these five words.**

| Status | Polaris tone | Means |
|---|---|---|
| `Verified` | success | We fetched your live page and the value is there |
| `Applied` | info | Written via the Admin API, verification pending |
| `Not detected` | warning | We looked at the live page and it is not there |
| `Failed` | critical | The write itself failed |
| `Not started` | subdued | We have not touched this |

**Banned from the entire UI:** "Optimized", "100%", "Perfect", "Boost", "Supercharge", "Skyrocket", any gauge whose calculation we cannot show, and any percentage without a denominator on screen.

**Stat cards**
- A card does not render when its denominator is zero. (Their "Images have Alt Text 0 / Total: 0" is the anti-pattern.)
- Every stat card is a link to the filtered list behind it.
- Maximum four cards per screen. Above four, it is a table.

**Score**
- We do keep a health number, because merchants expect one — but it is **never the headline**, it always shows its own maths on hover/tap ("84 = 100 − (5 critical × 2) − (4 warnings × 1.5)"), and it sits *beside* the number that matters: **verified changes on your live storefront**.

**Density**
- Tables over card grids for anything with more than 6 rows.
- Default page width `Page fullWidth` only on Pages and Keywords; everything else is standard width.

---

## 5. Core patterns (build these once, reuse everywhere)

### 5.1 Evidence drawer — the signature component
Opens from any `Verified` / `Not detected` badge in the app.

Contains, in order:
1. The live URL, as a clickable external link.
2. Fetched-at timestamp (relative + absolute).
3. The **raw HTML snippet** we extracted, monospace, in a scrollable code block, with the matched value highlighted.
4. Expected value vs observed value, side by side.
5. If failed: the reason code, translated (§5.5), plus the one action that resolves it.
6. `Re-verify now` (secondary).

This component is the product. It gets built in Phase 1 and every later screen reuses it.

### 5.2 Diff preview — before any write
Every apply flow, single or bulk, routes through this:

- Table: Resource · Current value · New value · What changed (badge: `Empty → filled`, `Rewritten`, `Human value — skipped`).
- Header line: "34 changes will be applied. 6 skipped because a human wrote them."
- Primary action `Apply 34 changes`. Secondary `Download preview (CSV)`.
- After apply: a persistent banner with `Undo all` for 24 hours, and per-row undo forever from history.

**Manual-value protection is visible in this table.** The merchant must be able to see, before applying, exactly which of their own words we refuse to touch.

### 5.3 Status pill + count row
Anywhere we summarise, the format is fixed:
`12 Verified · 3 Applied · 1 Not detected · 0 Failed` — each segment filters the list below.

### 5.4 Locked feature (paid tier)
Never fake data. Two permitted patterns only:
- **Partial real**: run the feature on the merchant's own store, show the first 3 real rows, blur nothing, and state "Showing 3 of 128 — your plan tracks 3 keywords."
- **Labelled illustration**: a static image, visibly an illustration, captioned "Example — not your store."

Copy is factual: "Rank tracking is on the Growth plan. Your store has 128 keywords worth tracking." No urgency, no countdowns, no discount timers.

### 5.5 Failure reason → human sentence (build as one lookup table)

| Code | What the merchant sees | Action offered |
|---|---|---|
| `THEME_DOES_NOT_READ_METAFIELD` | "Your theme doesn't display this field, so the value we saved never reaches your page. This is a theme limitation, not a Shopify one." | `See how to fix in your theme` (guide) + `Contact us` |
| `OVERWRITTEN_BY_OTHER_APP` | "Another app is writing a different title on this page. We found: `<observed>`." | `Which app?` (detection detail) |
| `CACHE_PENDING` | "Applied. Shopify's CDN hasn't refreshed this page yet — we'll check again in 10 minutes." | auto-retry, no action needed |
| `APP_EMBED_DISABLED` | "Our app embed is turned off in your theme, so structured data isn't being added." | `Enable in theme editor` (deep link) |
| `PAGE_UNREACHABLE` | "We couldn't load this page (404 / password-protected store)." | `Retry` + password-store note |

### 5.6 Blocked state
When a feature genuinely cannot run (their myshopify.com example): show one short explanation, one action, and **hide the rest of the screen's machinery**. Never render a full dashboard of zeros behind an error banner.

### 5.7 Empty states
Every empty state has: one sentence of what this screen will show, one primary action to make it show something, and no illustration bigger than the text. Never "No data found" alone.

### 5.8 Loading
Skeletons matching final layout. Long jobs (crawl, bulk apply, verification sweep) run in the background with a persistent progress row on Home — the merchant can navigate away and the job survives. Never a blocking spinner on a full page.

---

## 6. Screen specs

### 6.1 Onboarding — target: first verified change in under 5 minutes
Three steps, no more. No "what would you like to do?" preference quiz (theirs asks a question it never uses).

1. **Scan** — starts immediately on install, streams progress ("Reading your sitemap… 34 pages found… checking page 12 of 34"). No form to fill first.
2. **Result** — "We found 5 issues that are costing you traffic." Top 3 listed with the actual page names. One button: `Fix these 3 now`.
3. **Proof** — after the writes land and verification passes: "Applied and verified on your live storefront" with the Evidence drawer already open on the first one, and a `View live page` link.

Only after that do we ask about automation, plans or Search Console.

### 6.2 Home
Order, top to bottom:
1. One line: **"N changes verified on your live storefront this week."**
2. `Needs you` — up to 3 items requiring a human decision, each with an inline action.
3. Active jobs (crawl / bulk apply / verification sweep) with progress.
4. Four stat cards max, each a link: Pages audited · Issues open · Verified changes · AI readiness.
5. Recent activity: last 10 changes with status pills and timestamps.

Not on Home: quotas, plan upsells, scores as headline, anything promotional.

### 6.3 Fix
- Issues grouped by severity (Critical / Warning / Opportunity), each group collapsible, counts on the header.
- Each issue row: what it is, how many pages, estimated impact in plain words, `Review fixes`.
- `Review fixes` → §5.2 diff preview → apply → verification.
- Bulk selection across groups is allowed; the diff preview merges them.
- Never a naked one-click apply.

### 6.4 Pages (the workbench)
Table of all crawled resources. Columns: Title · Type · Meta status · Schema status · Alt coverage · Primary keyword · Position · Last verified.
- Filters: resource type, status, "has human-written values", market.
- Row click → **page detail**, the single place where everything about one URL lives:
  - Live preview of the SERP snippet (title + description + URL, with pixel-width warnings, not character counts).
  - Meta title / description editors with the template applied and the human-value badge if applicable.
  - Images + alt text list.
  - Schema block for this page with conflict status.
  - Primary keyword per market + current position.
  - **Evidence drawer** for every one of the above.
  - Change history for this page.

### 6.5 Keywords
Tabs: `Research · Rank tracker · Competitors · Search Console · Backlinks`.
- Market selector is global and sticky (from Shopify Markets) — every number on the tab is scoped to it and the scope is always visible in the header.
- Research: seed → suggestions with volume, difficulty, intent, and a **winnability** column computed against the store's own authority (this is the column nobody else has).
- Rank tracker: position over time per market, with the applied change that preceded each movement marked on the chart.
- Backlinks: profile, toxic flags, competitor gap, unlinked mentions. A permanent note explaining why we do not offer link exchanges (`11-COMPETITOR-PARITY.md` §6).

### 6.6 Content
Tabs: `Planner · Drafts`.
- Planner: seed keyword → clusters. Each cluster card shows keyword count, total volume, average difficulty, intent split, and the winnability score. `Generate draft` per cluster.
- Drafts: every generated article with its source cluster and target keyword attached, status `Draft in Shopify` / `Published`, and an editor.
- Publishing is a human action. Auto-publish is off by default, lives in Settings → Automation, and re-confirms every 90 days.
- Refresh queue: articles that lost position get a `Refresh` suggestion with the specific queries they slipped on.

### 6.7 AI Visibility
- Crawler access: a plain table of GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended, Bingbot → Allowed / Blocked, with what to change.
- Product data completeness: which fields AI shopping engines read, how many of your products have each, and bulk-fill for the derivable ones.
- Citations: weekly runs of the merchant's real buying queries, showing whether the store was cited and who was cited instead. Every result links to the actual query and the actual answer text we received.

### 6.8 Settings
Tabs: `Account · Automation · Integrations · Usage · Data`.
- **Usage** is where quotas live. Nowhere else in the app.
- **Data**: `Export everything (CSV)` always available, and a plain description of exactly what happens on uninstall — theme files restored, metafields left alone, data deletable on request.
- Automation: each rule stated as a sentence ("When you add a product, write its meta title and alt text, then verify it"), with a `Suggest first` / `Apply automatically` choice. First 7 days are always Suggest.

---

## 7. UX writing rules

- Second person, present tense, active voice. "We couldn't load this page", not "Page load failure encountered".
- Numbers before adjectives. "12 pages are missing meta descriptions", not "Several pages need attention".
- Every error names the cause and the next action.
- Never use a metric name the merchant hasn't been taught on the same screen.
- Buttons are verb + object: `Apply 34 changes`, `Re-verify now`, `Export everything`. Never `OK`, `Submit`, `Go`.
- Banned words list from §4 applies to microcopy, tooltips, emails and the App Store listing.

---

## 8. Accessibility (WCAG 2.1 AA — a review requirement, not a nice-to-have)

- Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI boundaries. Polaris tokens satisfy this; custom colours do not exist.
- Status is never colour-only — every pill carries its word.
- Full keyboard operation, visible focus rings, logical tab order, focus trapped and restored on the Evidence drawer and every modal.
- All charts and gauges have a text equivalent adjacent (the rank chart has the table beneath it).
- Touch targets ≥ 44×44 px. Shopify admin is used on mobile.
- `prefers-reduced-motion` respected on every transition.

---

## 9. Performance budget (the admin UI itself)

We criticise competitors for bloat; our own admin must be fast.

- First meaningful paint of any route ≤ 1.5s on a mid-tier laptop.
- No route ships more than 250KB of JS gzipped.
- Tables virtualise above 100 rows.
- Every list is server-paginated; never fetch a whole catalogue into the browser.
- Optimistic UI on toggles and edits, with a visible rollback if the server rejects.
- Zero third-party analytics/marketing scripts in the admin UI.

---

## 10. Success metrics for the UI

| Metric | Target |
|---|---|
| Install → first **verified** change | < 5 minutes |
| Install → first crawl complete | < 3 minutes for a 500-page store |
| Clicks from Home to raw evidence for any number | ≤ 2 |
| Screens containing a promotional banner | 0 |
| Screens containing fabricated data | 0 |

---

## 11. Screen acceptance checklist — every screen, before it is called done

1. Exactly one primary action.
2. Every number on the screen is traceable to evidence in ≤ 2 clicks.
3. Empty state written, loading skeleton built, error state mapped to §5.5.
4. No stat card with a zero denominator.
5. No fabricated, sample or placeholder data anywhere in the merchant's own data areas.
6. No promotional content of any kind.
7. Any write is preview-then-apply, with undo.
8. Keyboard-only walkthrough completed.
9. Copy passes §7 (including the banned-words list).
10. Numbers on this screen reconcile with the same numbers everywhere else in the app.
11. Screenshot at 1280px and at 375px attached to the tracker entry.

---

## 12. Things Antigravity must never do in the UI

- Show "Optimized" or any success state that is not backed by a live-page fetch.
- Ship a one-click write without a diff preview.
- Put a quota meter, upgrade banner, or any promotion on a work screen.
- Fill a locked panel with invented numbers.
- Add a nav item without deleting one, or add a `View more` collapse.
- Introduce a UI library, icon set or colour outside Polaris.
- Mark a screen done without §11.
