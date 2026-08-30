# 02 — SHOPIFY REALITY

**Read this before designing or building any feature.** Everything here is verified against Shopify's own documentation and changelogs. If a planned feature contradicts this file, the feature is wrong, not the file.

---

## 1. Access scopes

Verified against `shopify.dev/docs/api/usage/access-scopes`.

### v1 required scopes — exactly four

| Scope | Grants access to | Used for |
|---|---|---|
| `write_products` | `Product`, `ProductVariant`, **`Collection`** | SEO metafields on products and collections, product media alt text |
| `write_content` | `Article`, `Blog`, `Page` | SEO metafields on pages/blogs/articles, blog content |
| `write_online_store_navigation` | **`UrlRedirect`** | 301 redirect manager |
| `read_themes` | `OnlineStoreTheme` | Detect app embed activation, read theme files to diagnose metafield/schema support |

**Trap:** `UrlRedirect` is under `write_online_store_navigation`, NOT `write_content`. Older tutorials say `write_content`. They are wrong for current API versions.

**Trap:** Collections are covered by `write_products`. Do not look for a separate collections scope.

### Optional scopes — request dynamically via App Bridge Scopes API, not at install

Declare these in `optional_scopes` in `shopify.app.toml`. Ask for them only when the merchant enables the relevant feature. This keeps the install screen to four scopes.

| Scope | Requested when |
|---|---|
| `write_themes` | Merchant enables robots.txt / llms.txt features. **Also needs a Shopify exemption — see §2.** |
| `write_files` | Only if compressed images are re-uploaded as `GenericFile` |
| `read_locales`, `read_markets` | Only for multi-market stores, hreflang checks |
| `write_translations` | India mode — regional/Hinglish meta descriptions |
| `read_inventory` | Only if schema needs real stock availability |

### Scopes we must NEVER request

`read_customers`, `write_customers`, `read_orders`, `write_orders`, `read_all_orders`, `read_draft_orders` — all protected customer data. Requesting any of them pulls us into Level 1 + Level 2 protected customer data requirements and a separate approval process.

**`read_reports` is also off-limits.** It grants `shopifyqlQuery`, and developers have been blocked in app review because ShopifyQL access requires Level 2 protected customer data approval. We get our search data from the **Google Search Console API** instead — which is where SEO data actually lives anyway.

`write_script_tags` — never. See §3.

### Scope declaration rules

- A `write_` scope includes the matching `read_` scope. Declare only the write scope. Declaring `read_products` **and** `write_products` is wrong.
- Declaring a read scope as optional while its write scope is required **fails to deploy**.
- Every GraphQL mutation lists its required scope in the API reference. Look it up. Do not guess.
- Shopify explicitly restricts scopes for apps without legitimate need, and asks for justification during review.

---

## 2. Theme file writes need a Shopify exemption

- Since Admin API 2023-04, creating/updating/deleting theme files requires the `write_themes` scope **and** a Shopify-granted exemption for App Store apps.
- SEO apps are explicitly listed as an eligible exemption category ("Other platform functionality: your app primarily provides search engine optimization…").
- Apply via the **Online Store Protected Scope Exemption Request** form. This is a separate process from app review and has a long lead time.
- Known friction from developer forums: the form asks for an App Store URL you will not have before launch, and there are reports of production apps being approved while the development app still returns `ACCESS_DENIED` on `themeFilesUpsert` / `themeFilesCopy`.

**Decision (locked):** v1 ships **without** `write_themes`. Everything AI-crawler-related that needs a theme file (robots.txt rules, llms.txt) moves to v1.1, gated on the exemption. Do not block v1 on this.

**Note:** `llms.txt` and `robots.txt` both must live at the domain root. An app proxy cannot serve them — app proxies serve under `/apps/...`. There is no workaround. Theme file write is the only path.

---

## 3. Script tags are dead — never use them

- **1 Oct 2026:** `scriptTagCreate` and `scriptTagUpdate` return a user error; REST ScriptTag rejects POST and PUT.
- **1 Mar 2027:** Shopify stops injecting script tags into storefronts entirely.
- The deprecation applies to **all API versions**. Pinning an old version does not defer it.
- `scriptTags` query and `scriptTagDelete` keep working for cleanup only.

Replacement: **theme app extension app embed blocks**. Analytics-only scripts would use web pixels, which we do not need.

This is an advantage: incumbents built on script tags must migrate. We are clean from day one.

---

## 4. REST is legacy — GraphQL only

All new public apps must be built exclusively with the **GraphQL Admin API**. REST Admin API is legacy. Do not use REST endpoints anywhere, including the Asset REST resource — use `themeFilesUpsert` / `themeFiles` in GraphQL.

---

## 5. Hard platform limits — features that are impossible

| Thing merchants ask for | Reality |
|---|---|
| Edit `sitemap.xml` | Auto-generated by Shopify, **not editable**. Only control is publish status and robots rules. |
| Change URL structure (`/products/`, `/collections/`) | Fixed. Only the handle can change. |
| Remove/replace Shopify's canonical tag | Emitted automatically. An app embed can only **add** to `<head>`; adding a second canonical makes things worse. Rewriting requires theme edits. |
| Server logs / real 404 hits | Shopify does not expose them. We must crawl the storefront ourselves (from `sitemap.xml`) and read Google Search Console. |
| Checkout page SEO | No access. Not needed. |
| "Fix Core Web Vitals" | We cannot remove the theme's or other apps' JS. We can compress images, keep our own footprint at zero, and give an honest diagnosis. Nothing more. |

---

## 6. What is fully supported

| Job | Mechanism |
|---|---|
| Meta title / description | Metafields `global.title_tag`, `global.description_tag` via `metafieldsSet` — the native path themes already read. **No theme injection.** |
| Image alt text | Product media alt via product mutations; `fileUpdate` for generic files |
| Handle change + 301 | `urlRedirectCreate` |
| JSON-LD | Theme app extension **app embed block with `target: head`** |
| robots.txt rules | `themeFilesUpsert` on `templates/robots.txt.liquid` (exemption required) |
| Large catalogs | `bulkOperationRunQuery` / `bulkOperationRunMutation`. Without these, a 5,000-product store will silently fail on the cost-based leaky-bucket rate limit. |
| Search data | Google Search Console API (merchant OAuth), not Shopify analytics |

**Caveat on metafields:** they only surface if the merchant's theme reads `global.title_tag` / `global.description_tag`. Dawn and standard OS 2.0 themes do. Heavily customised themes may not. The Proof Engine must detect this and tell the merchant honestly rather than reporting success.

---

## 7. App Store review requirements (build these in Phase 0, not at the end)

- Three **mandatory GDPR webhooks**: `customers/data_request`, `customers/redact`, `shop/redact`. Required even though we touch no customer data. Missing or broken privacy webhooks plus broken billing flow account for the majority of first-time rejections.
- Plus `app/uninstalled` for our own cleanup.
- **Session token authentication** via App Bridge. The embedded app must work without third-party cookies or local storage, including Chrome incognito.
- **Shopify Billing API only.** No Stripe, PayPal or external payment form for app charges.
- Polaris design system for all admin UI.
- Performance: keep storefront impact minimal; a significant Lighthouse drop gets flagged.
- Listing: tagline ≤70 chars, concrete not jargon. "Verify every SEO change on your live page" passes. "Revolutionize your SEO with AI" gets rejected.
- Screenshots must show real merchant data, not stock-photo mockups.
- Shopify now provides an **AI self-review tool** — run it before every submission. It catches webhook, scope, API version, Polaris and listing issues that otherwise cost a week per round.

**Timeline reality:** standard review 2–4 weeks; each resubmission adds 1–2 weeks; Built for Shopify adds a further 2–4 weeks. Plan a 6-week calendar between code-complete and launch.

---

## 8. Revenue share

0% on the first $1,000,000 USD of **lifetime** gross app revenue (the annual reset was removed), 15% above that. One-time $19 registration for the reduced-rate plan. Revenue aggregates **at the partner level across all apps** — so this app's revenue and PageVault's revenue count toward the same threshold.
