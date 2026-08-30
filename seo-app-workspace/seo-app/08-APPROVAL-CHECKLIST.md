# 08 — APP STORE APPROVAL CHECKLIST

Run this before every submission and resubmission. Also run **Shopify's AI self-review tool** — it catches webhook, scope, API version, Polaris and listing issues that otherwise cost a week per round.

## Technical

- [ ] `customers/data_request` webhook implemented, returns 200, HMAC verified
- [ ] `customers/redact` webhook implemented, returns 200, HMAC verified
- [ ] `shop/redact` webhook implemented, returns 200, HMAC verified
- [ ] `app/uninstalled` webhook implemented — theme backups restored, metafields left intact
- [ ] Session token auth (App Bridge); app works in Chrome incognito with third-party cookies blocked
- [ ] App is embedded and loads without errors on a fresh dev store
- [ ] OAuth install flow is clean, no manual steps, no dead ends
- [ ] HTTPS everywhere, valid SSL
- [ ] GraphQL Admin API only — zero REST calls in the codebase
- [ ] Latest stable API version pinned
- [ ] Exactly four required scopes; optional scopes declared separately and requested at feature-enable time
- [ ] No customer/order/`read_reports` scopes anywhere
- [ ] No script tags created anywhere
- [ ] Rate limiting handled centrally; a 5,000-product store completes without failures
- [ ] Storefront performance impact minimal — app embed emits JSON-LD only, no JS, no CSS

## Billing

- [ ] Shopify Billing API (managed pricing) only — no external payment forms
- [ ] Plans and prices shown before the charge screen
- [ ] No charge before merchant approval
- [ ] No silent upgrades to a higher tier
- [ ] Uninstall correctly ends the subscription
- [ ] Free tier is genuinely usable without a card

## UX and design

- [ ] All admin UI uses Polaris
- [ ] Every screen has a designed empty state
- [ ] Every screen has a designed error state
- [ ] Onboarding gets a new merchant to first value without documentation
- [ ] Works on mobile admin width
- [ ] No broken links, no placeholder text, no lorem ipsum, no TODOs visible

## Listing

- [ ] Tagline ≤70 characters, concrete. Good: "Verify every SEO change on your live page". Rejected: jargon like "Revolutionize your SEO with AI"
- [ ] Value proposition ≤500 characters with specific outcomes
- [ ] Feature list matches what the app actually does
- [ ] 4–7 screenshots showing **real merchant data**, not stock mockups
- [ ] Demo video
- [ ] Pricing on the listing matches the billing implementation exactly
- [ ] No ranking guarantees, no "#1 on Google" claims — these get rejected

## Legal and support

- [ ] Privacy policy live, covering: we fetch the merchant's public storefront HTML server-side, we call third-party LLM APIs for the citation tracker, and what we store
- [ ] Support email that a human monitors
- [ ] Test instructions with working credentials for the reviewer
- [ ] Data handling documented for the app review questionnaire

## Honesty audit (our own bar, not Shopify's)

- [ ] Every limitation from `01-PRODUCT.md` §7 is stated in the UI where relevant
- [ ] The dashboard never displays "Optimized" — only `Applied`, `Verified`, `Not detected`
- [ ] `llms.txt` ships with its "not a confirmed ranking factor" disclaimer
- [ ] No fabricated ratings, counts or stock data anywhere in output

## Timeline expectation

Standard review: 2–4 weeks. Each resubmission: +1–2 weeks. Built for Shopify: +2–4 weeks. Plan a 6-week calendar from code-complete to launch.
