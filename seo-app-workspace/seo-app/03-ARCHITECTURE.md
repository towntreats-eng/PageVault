# 03 — ARCHITECTURE

## 1. Stack (locked — reuse, do not experiment)

| Layer | Choice | Why |
|---|---|---|
| App framework | Shopify CLI app template (**React Router** — the current Shopify app package, successor to the Remix template) | Official, session tokens and billing wired in |
| Admin UI | Polaris | Review requirement |
| Storefront | Theme app extension, app embed block, `target: head` | Only supported injection path |
| DB | PostgreSQL + Prisma | Same as PageVault |
| Queue | BullMQ + Redis | Long crawls and bulk jobs must not run in a request |
| Hosting | Railway | Same as PageVault |
| API | GraphQL Admin API only | REST is legacy |

Do not introduce a new framework, ORM or queue. If something seems to need one, write it in `BLOCKERS.md` and stop.

## 2. The five layers

```
  A. INGEST      sitemap.xml crawl + Admin API read  →  full store map
  B. ANALYSE     rule engine  →  issues, scores, AI-readiness
  C. APPLY       metafieldsSet / urlRedirectCreate / media alt / (themeFilesUpsert v1.1)
  D. VERIFY      fetch live storefront HTML  →  did the change actually land?
  E. REPORT      dashboard + weekly proof report
```

**Layer D is not optional and cannot be added later.** Every write in Layer C must enqueue a Layer D verification job. A write without a verification job is an incomplete implementation.

## 3. The Proof Engine (the core mechanism)

For every applied change:

1. Record `before` — the tag as it currently exists on the live page.
2. Apply the change via Admin API.
3. Enqueue a verify job with a short delay (CDN propagation).
4. Fetch the live public URL server-side. Never trust the Admin API response as proof.
5. Parse the rendered HTML. Confirm the expected tag/value is present.
6. Write a `Verification` row: `PASS` or `FAIL` + a machine reason + a human sentence.
7. Re-verify every applied change **weekly**, because merchants change themes and silently break everything.

### Failure reasons the UI must be able to state
- `THEME_DOES_NOT_READ_METAFIELD` — the theme never renders `global.title_tag`
- `OVERWRITTEN_BY_OTHER_APP` — a different value is on the page
- `CACHE_PENDING` — not yet visible, retry scheduled
- `APP_EMBED_DISABLED` — the app embed block is off in the theme editor
- `PAGE_UNREACHABLE` — 404/401/password-protected store

Never show "Optimized" as a status. The statuses are `Applied`, `Verified`, `Not detected`.

## 4. Schema conflict detection

Before enabling any JSON-LD output:
1. Fetch a real product page, a real collection page and the homepage.
2. Parse all existing `application/ld+json` blocks.
3. If `Product` schema already exists (from the theme or another app), **keep ours disabled by default** and show the merchant which fields the existing schema is missing.
4. Only emit types that are absent.

`aggregateRating` is emitted **only** when real review data exists (read from the review app's metafields). Never fabricate ratings, counts, stock urgency or availability. This is a hard rule — fake structured data risks a Google manual action and would kill the app.

## 5. Clean install / clean exit

- Default state: **zero theme file modifications**.
- If `write_themes` is later granted and a theme file is touched, store a full `ThemeBackup` row of the original content first.
- On `app/uninstalled`: restore every theme file we modified from backup, and **leave metafields untouched** — the merchant's meta titles are the merchant's data. Deleting them is exactly the failure that generates 1-star reviews for competitors.
- Provide "Export all my SEO data (CSV)" in settings at all times.

## 6. Data model (Prisma — starting shape)

```
Shop             id, domain, accessToken, plan, installedAt, uninstalledAt, settings
Session          (Shopify template default)

CrawlRun         id, shopId, startedAt, finishedAt, pagesFound, status
PageRecord       id, shopId, url, resourceType(product|collection|page|article|home),
                 resourceGid, statusCode, lastCrawledAt

Issue            id, shopId, pageRecordId, code, severity, detail, resolvedAt

Change           id, shopId, resourceGid, field(title_tag|description_tag|alt|handle|schema),
                 beforeValue, afterValue, source(manual|autopilot|bulk),
                 appliedAt, revertedAt

Verification     id, changeId, attemptedAt, result(PASS|FAIL|PENDING),
                 reasonCode, observedValue, fetchedUrl

RedirectRecord   id, shopId, fromPath, toPath, shopifyRedirectGid, createdAt

SchemaConfig     id, shopId, type, enabled, conflictDetected, conflictSource

ThemeBackup      id, shopId, themeGid, filePath, originalContent, takenAt, restoredAt

AiCheck          id, shopId, checkType(crawler_access|product_data|citation),
                 payload(json), runAt

GscConnection    id, shopId, refreshToken, siteUrl, connectedAt
AutopilotRule    id, shopId, ruleType, config(json), enabled
```

Extend as needed, but record any model change in `DECISIONS.md`.

## 7. Job pipeline (BullMQ queues)

| Queue | Job |
|---|---|
| `crawl` | sitemap fetch → page fetch → parse → PageRecord + Issue rows |
| `apply` | metafield/alt/redirect writes, batched, respecting rate limits |
| `verify` | live HTML fetch + assertion (delayed, with retry/backoff) |
| `reverify` | weekly sweep over all PASS changes |
| `ai` | crawler access check, product data score, citation tracker |
| `gsc` | Search Console pulls |
| `report` | weekly proof report generation + send |

Rules:
- Every queue is idempotent. A re-run must not duplicate rows or re-apply an identical value.
- Crawls are polite: concurrency cap, delay between requests, respect the store's own robots rules.
- Catalogs above ~1,000 resources go through **bulk operations**, not paginated queries.

## 8. Rate limiting

GraphQL Admin API uses a cost-based leaky bucket. Implement:
- a central client that reads `throttleStatus` from every response,
- exponential backoff on `THROTTLED`,
- bulk operations for anything touching the whole catalog.

Do not write per-feature ad-hoc API calls that bypass this client.

## 9. Multi-tenancy and cost

The AI Citation Tracker calls third-party LLM APIs. This is the app's real COGS. Enforce a per-shop monthly query budget by plan tier, tracked in the DB, and hard-stop when exceeded. Never let it run unbounded.
