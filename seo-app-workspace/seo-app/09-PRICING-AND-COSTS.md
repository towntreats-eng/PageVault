# 09 — AI USAGE, API COSTS AND PRICING

All rates verified Aug 2026. Re-verify before launch — LLM and SEO-data pricing both move.
**This app is global-first.** Pricing is USD-primary, with local currency support where Shopify offers it.

---

## 1. Where AI is actually used

| # | Feature | AI role | Cost class |
|---|---|---|---|
| 1 | Meta title + description generation | Text generation per resource | One-time per resource, then only on change |
| 2 | Image alt text | **Template first, AI only for leftovers** | Near zero |
| 3 | GSC intent clustering + cannibalisation | Batch analysis over query lists | Negligible |
| 4 | Content briefs from SERP data | Occasional generation | Negligible |
| 5 | Multi-locale metadata (per market) | Text generation | Same as #1 |
| 6 | **AI Citation Tracker (ChatGPT, Perplexity)** | Search-grounded queries to live engines | **The real recurring COGS** |

AI is **not** used for: verification, crawling, schema generation, keyword metrics, or rank position. Those are deterministic. An LLM guessing whether a tag is on the page would defeat the entire Proof Engine.

---

## 2. Cost model — generation (features 1–5)

Model: **Claude Haiku 4.5 — $1.00 / M input, $5.00 / M output.**

Two mandatory levers:
- **Batch API: −50%.** Bulk generation is not real-time, so it must be batched.
- **Prompt caching: cache reads at 10% of input rate.** Our instruction prompt is identical across every product in a run.

Per product: ~400 input + ~100 output = **$0.0009**, or **~$0.00045 batched**.

| Catalog | Full run, batched |
|---|---|
| 500 products | $0.23 |
| 2,500 products | $1.13 |
| 10,000 products | $4.50 |

**Never use vision models for alt text** (~$0.002–0.004 per image). Generate from title + variant + options + position, template-driven, at zero cost; send only leftovers to Haiku as text.

---

## 3. Cost model — SEO data (DataForSEO)

Full detail in `10-KEYWORD-ENGINE.md` Part 6. Summary:

| Item | Rate |
|---|---|
| Keyword volume/CPC (Keywords Data API) | ~$0.075 per 1,000 keywords |
| Difficulty, intent, related (Labs API) | ~$0.025 per 1,000 |
| **Rank tracking — SERP API, Standard queue** | **$0.0006 per SERP** |
| Google AI Overview presence | +$0.0006 per keyword |

Per store:
- Keyword research, one-time: **$1.80** (500 products) to **$13.50** (10,000 products)
- Rank tracking: **$0.24/mo** (100 keywords, 1 market) to **$14.40/mo** (2,000 keywords, 3 markets)

Rank tracking always uses the **Standard queue**. Live mode is 3.3x the price for a job nobody is watching.

---

## 4. Cost model — AI Citation Tracker

Search-grounded queries against live engines:

| Provider shape | Per grounded query |
|---|---|
| Perplexity Sonar (tokens + $5–14 per 1,000 requests) | ~$0.006 – $0.015 |
| OpenAI-style web search tool (~$20–25 per 1,000 calls) | ~$0.02 – $0.025 |
| Claude with web search ($10 per 1,000 calls) | ~$0.011 – $0.015 |

Plan on **~$0.015 blended per query per engine**.

| Config | Queries/month | Cost/month |
|---|---|---|
| 25 queries × 2 engines, weekly | 200 | $3.00 |
| 25 queries × 3 engines, weekly | 300 | $4.50 |
| 100 queries × 3 engines, weekly | 1,200 | $18.00 |

**Important optimisation:** Google AI Overview presence is tracked far more cheaply through the SERP API (+$0.0006/keyword) than through LLM calls. Reserve expensive LLM queries for **ChatGPT and Perplexity only**.

Rules: weekly not daily; engine count is a tier lever; hard per-shop budget with an honest stop; never expose as a credits balance.

---

## 5. Total COGS per store per month

| Plan | Generation | SEO data | Citation | Hosting | **Total** |
|---|---|---|---|---|---|
| Free | $0.05 | $0.10 | $0 | $0.30 | **~$0.45** |
| Starter | $0.15 | $0.60 | $0 | $0.40 | **~$1.15** |
| Growth | $0.30 | $4.00 | $4.50 | $0.60 | **~$9.40** |
| Pro | $0.60 | $16.00 | $18.00 | $1.20 | **~$35.80** |

**Free tier drag:** 1,000 free installs × $0.45 = **$450/month**. That is the cost of the acquisition engine. Budget for it. Free tier gets zero live-engine citation queries and minimal rank tracking.

---

## 6. Billing mechanics on Shopify

- Use **Shopify App Pricing**, not the legacy manual Billing API.
- Supports free, monthly, annual, monthly-with-yearly, and usage-based plans.
- **Local currency supported** — query `shopBillingPreferences` for the merchant's billing currency and pass it as input. Since we are global-first, this is a quiet quality signal in every market, not an India-only feature.
- A **$0 private test plan** exists for testing billing before publishing plans. Use it in Phase 0.
- After 28 Apr 2026 Shopify App Pricing no longer appends `charge_id` to the redirect URL — use the Partner API and `plan_handle` redirect parameters. Older tutorials are wrong about this.
- Revenue share: 0% on the first $1,000,000 lifetime, 15% above, aggregated at partner level across all apps. One-time $19 registration for the reduced rate.

---

## 7. Pricing structure

### Design principle

**Gate by scale and by markets. Never gate the basics, and never gate the trust.**

Merchants accept "your plan covers 500 products". They uninstall over "upgrade to add a meta description". So metadata, alt text, schema, redirects and **the Proof Engine** are in every plan, including free.

### The positioning argument for our price point

A merchant serious about SEO today buys **three** things:
- an SEO app (Avada ~$35, SearchPie ~$39, TinyIMG $49–499, Booster ~$55–69)
- a keyword tool (Semrush ~$140, Ahrefs ~$130)
- a rank tracker (a further $20–50)

We replace all three, plus add AI visibility tracking that none of them offer. That is what justifies pricing above the SEO-app-only anchors rather than below them.

### Recommended plans

| Plan | Price | Products | Tracked keywords | Markets | AI citation |
|---|---|---|---|---|---|
| **Free** | $0 | 50 | 10 | 1 | — |
| **Starter** | $19/mo | 500 | 100 | 1 | — |
| **Growth** ⭐ | $49/mo | 2,500 | 500 | 3 | 25 queries × 3 engines |
| **Pro / Agency** | $129/mo | Unlimited | 2,000 | Unlimited | 100 queries × 3 engines |

Margins: Starter ~94%, Growth ~81%, Pro ~72%. Healthy at every tier with the data costs fully loaded.

**Annual: two months free (~17% off).** SEO apps churn 5–8% per month; annual plans are the single best defence.

### The trade-off, stated honestly

$49 for Growth is above the SEO-app anchors and below the SEO-app + keyword-tool + rank-tracker bundle it replaces. The risk is lower free-to-paid conversion than a $29 price would produce. The upside is that at a ~$45 blended ARPU, the target needs **~75 paying merchants** instead of ~155 — roughly half the customer acquisition for the same revenue.

The bet: with real keyword research, real rank tracking and AI visibility in one app, we are not competing on price at all. If conversion data after 90 days says otherwise, drop Growth to $39. Do not launch cheap and try to raise later — that is much harder.

---

## 8. What makes the pricing convenient (the anti-trap list)

Every item maps to a documented 1-star complaint about a competitor.

1. **No credits, ever.** Flat monthly. Hit a cap and we tell you; we do not auto-charge overage.
2. **The Proof Engine is free.** The feature that proves whether your SEO is actually live is never paywalled. Free users can see the problem — which is what makes them upgrade.
3. **Uninstall = cancelled.** Stated on the listing and in the app.
4. **No feature-stripping on lower tiers.** Basics are basics on every plan.
5. **Free downgrade, no lock-in, CSV export always available.** Metafields stay in the merchant's Shopify even after uninstall.
6. **Local currency wherever Shopify supports it.**
7. **14-day trial on paid plans.** No card games, no auto-upgrade.
8. **One price covers the whole job.** No schema add-on, no keyword credit packs.

---

## 9. Implementation requirements

- [ ] All bulk generation through the **Batch API**; real-time only for single-item edits
- [ ] **Prompt caching** on the shared instruction prompt in every bulk run
- [ ] Alt text **template-first**; vision models never used
- [ ] `AiBudget` table covering both LLM spend and DataForSEO spend, per shop, per month, hard stop on exceed with an honest notification
- [ ] Rank tracking on the **Standard queue** only; Live mode reserved for explicit on-demand checks
- [ ] Keyword data cached per market with a TTL — re-fetching stable volume data is wasted money
- [ ] Google AI Overview tracked via SERP API, not via LLM calls
- [ ] Free tier: zero live-engine citation queries
- [ ] Plan limits (products, keywords, markets) enforced server-side, not in the UI
- [ ] `shopBillingPreferences` queried at install to set currency
- [ ] Internal admin view of per-shop COGS; alert when a single store exceeds 40% of its plan price

---

## 10. Sanity check against the revenue goal

At ~$45 blended ARPU, **$3,400 MRR ≈ 75 paying merchants**.

At the COGS above, 75 merchants cost roughly **$700–900/month**, plus ~$450 of free-tier drag at 1,000 free installs.

Net: roughly **70–75% of gross reaches the bank**. Plan the target as **$4,500 MRR gross** if $3,400 net is the goal.
