# 10 — KEYWORD ENGINE, RANK TRACKING AND SEO ETHICS

This is the file that separates a real SEO app from a checklist app. Read it fully before building anything in Phase 5.

---

## PART 1 — WHAT SEO ACTUALLY IS (so we build the right thing)

SEO has four parts. An app can own two of them, assist with one, and must never touch the fourth.

| Part | What it is | Our app |
|---|---|---|
| **Technical** | Crawlability, indexation, schema, canonical, redirects, speed, AI crawler access | **Owns it** |
| **On-page** | Title, meta, H1, headings, keyword targeting, internal links, alt text, content structure | **Owns it** |
| **Content** | Buying guides, category copy, blog, comparison pages | **Assists** — briefs and drafts; merchant publishes |
| **Off-page (backlinks)** | Other sites linking to the store | **Never touches** — see Part 2 |

### Why most Shopify SEO apps under-deliver
They do technical + a shallow version of on-page, then score the result with 2018-era keyword-density logic. None of them do real keyword research, none map keywords to pages, and none track whether the change actually moved a ranking.

**That whole middle layer — research → assign → apply → verify → track — is empty in this category. That is what we build.**

---

## PART 2 — BACKLINKS, WHITE HAT, BLACK HAT

### Backlinks
A backlink is another website linking to the store. Google uses them as an authority signal, which is why a five-year-old brand outranks a three-month-old store on the same keyword with the same on-page work.

**An app cannot build backlinks.** Apps that advertise "backlink building" either show a dashboard and do nothing, or buy links — which is link spam under Google's policies and carries a manual action **against the merchant's store**, not against us.

What we WILL do:
- Show which domains link to the top-ranking competitors for an assigned keyword, so the merchant knows where outreach is worth doing.
- Show the merchant's own backlink profile as diagnostic context for why a keyword is or is not winnable.

What we will NEVER do: buy, sell, exchange, generate, or "automate" links.

### White hat / black hat / grey hat

**White hat** — inside Google's guidelines. Real keyword research, accurate metadata, correct schema, fast pages, genuine content, real reviews. Slower, durable.

**Black hat** — deceiving the search engine. In a Shopify context this looks like:
- Hidden text or links (matching text colour to background, `display:none` keyword blocks)
- Keyword stuffing in titles, alt text or descriptions
- **Fake `aggregateRating` / review schema** — structured data spam, one of the fastest ways to lose all rich results
- Doorway pages — hundreds of near-identical "best X in [city]" pages
- Cloaking — serving different content to Googlebot than to users
- Bought links, PBNs, link exchanges
- Scaled thin AI content published without human value

**Grey hat** — works until it doesn't, then it's a manual action.

### The rule that governs this app

> **The penalty for black hat lands on the merchant's store, not on us. One merchant losing their rankings because of our app produces a review that ends the app.**

Also practical: **Shopify rejects listings that promise rankings.** "#1 on Google", "guaranteed rankings" — these fail app review.

**Hard prohibitions for the build (non-negotiable, same weight as `06-RULES.md`):**
1. No hidden text, hidden links, or off-screen keyword blocks — ever.
2. No keyword stuffing. Generated copy reads naturally or it is regenerated. A keyword appears in a title once, not three times.
3. No fabricated schema of any kind — ratings, review counts, stock, availability, prices.
4. No mass generation of near-duplicate pages.
5. No cloaking. What the app writes is what both users and crawlers see.
6. No link buying, selling, exchanging or automated placement.
7. No ranking guarantees anywhere — in the UI, the listing, the emails, or the marketing.

---

## PART 3 — WHAT WE CAN HONESTLY PROMISE

We cannot promise rankings. We can promise something better, because it is true and measurable:

> **Every change is assigned to a real keyword, applied, verified on the live page, and tracked to a real position in Google. You see the before and the after.**

That is a closed loop. No competitor offers it. It is stronger than a guarantee because it survives contact with reality.

The honest framing used in-product: *most Shopify stores are losing rankings to mechanical problems — no keyword targeting, cannibalised pages, missing schema, invisible to AI crawlers. We fix all of that and prove it. Content and authority still do the rest, and we tell you exactly what to write.*

---

## PART 4 — THE KEYWORD ENGINE

### 4.1 Pipeline

```
SEED  →  EXPAND  →  ENRICH  →  QUALIFY  →  ASSIGN  →  APPLY  →  TRACK
```

**1. SEED** — extract candidate terms per resource:
- Product: title, product type, vendor, tags, option values, entities pulled from the description
- Collection: title, rules, the product types it contains
- Existing GSC queries already hitting that URL (highest-signal seeds)

**2. EXPAND** — DataForSEO Keywords Data API "keywords for keywords": up to 20 seeds per request returning up to 20,000 suggestions. Also pull Google Autocomplete and People Also Ask from the SERP API for question-intent terms.

**3. ENRICH** — for each candidate:
- Search volume, CPC, competition (Keywords Data API — Google Ads source)
- Keyword difficulty, search intent, related keywords (Labs API)
- **Per target market** — see §4.4

**4. QUALIFY — this is the step everyone else skips.**

A keyword is only usable if the store can realistically win it. Compute a **Winnability Score** from:
- Keyword difficulty vs the store's demonstrated authority (derived from the difficulty band of keywords the store already ranks top-20 for in GSC)
- SERP composition — if page 1 is Amazon, Myntra, Nykaa and three marketplaces, a new D2C store does not win it; flag it as an aspiration, not a target
- Intent match — transactional intent must land on a PDP or collection, informational on a blog post
- Volume floor — reject zero-volume noise, but keep genuine long-tail (long-tail is where new stores actually win)

Output three buckets per resource: **Winnable now / Winnable in 6 months / Aspirational**. Only "winnable now" gets assigned.

**5. ASSIGN**
- Exactly **one primary keyword per URL**. Enforced at the database level with a unique constraint per market. This makes cannibalisation structurally impossible instead of a report you read later.
- 2–4 secondary keywords per URL.
- Head terms go to collection pages, long-tail to product pages, questions to blog posts. Getting this mapping right is most of e-commerce SEO.
- Every assignment is visible and overridable by the merchant. Never silent.

**6. APPLY** — title, meta description, H1 suggestion, alt text and internal link anchors are generated around the assigned keyword, **naturally**. Rules: keyword once in the title, once in the description, never forced into alt text, never repeated for density. Output that reads like spam is regenerated, not shipped.

**7. TRACK** — see Part 5.

### 4.2 Content briefs (the honest answer to "we can't write your content")

For informational keywords the app produces a brief, not a wall of AI text:
- The target keyword and its intent
- What the current page-1 results actually cover (from SERP data)
- Required subtopics, People Also Ask questions, suggested word count
- Which products to link to internally

The merchant (or Umang's service) writes it. This is defensible — a brief is a tool, mass-generated thin content is scaled content abuse.

### 4.3 Cannibalisation and internal links
- One-primary-per-URL makes new cannibalisation impossible; a detector still scans existing pages for legacy overlap.
- Internal linking suggestions use the assigned keyword as anchor text, from relevant blog and collection pages to the target URL.
- Orphan pages (no internal links pointing in) are surfaced as a priority issue.

### 4.4 Global and multi-market — the differentiator

This app is **global-first**. Keyword volume, difficulty and SERP composition differ per country, and no Shopify SEO app handles this properly today.

- Read the store's **Shopify Markets** configuration and locales to determine target countries and languages.
- Run keyword research **per market**: `location_code` + `language_code` on every DataForSEO call.
- A product can hold a different primary keyword per market. "Trainers" in the UK is "sneakers" in the US, and volume differs by an order of magnitude.
- Rank tracking is per market and per device (mobile and desktop SERPs differ).
- Hreflang correctness becomes a real feature rather than a checkbox, because we can show which market page ranks where.
- India, when the merchant targets it, is simply one market among many — same engine, `location_code` 2356, English and Hindi. Regional-language metadata via `write_translations`.

Plan tiers control **how many markets** are tracked. This is the cleanest upsell lever in the product.

---

## PART 5 — RANK TRACKING (the proof loop)

Two sources, used for different things:

| Source | Cost | Good for | Weak at |
|---|---|---|---|
| **Google Search Console API** | Free | Real clicks, impressions, CTR, average position, queries you already appear for | Averaged, ~2-day delay, shows nothing for keywords you do not yet rank for |
| **DataForSEO SERP API** | $0.0006 per SERP (Standard queue) | Exact position, who is above you, SERP features, any keyword whether you rank or not, per country and device | Costs money, is a snapshot |

**Use both.** GSC for truth about traffic; SERP API for exact position and competitive context.

### What we track weekly per assigned keyword
- Exact organic position, per market, per device
- The domains occupying positions 1–10
- SERP features present (shopping pack, PAA, video, local pack)
- **Google AI Overview presence** — the SERP Advanced endpoint supports AI Overview data via `load_async_ai_overview`, at roughly $0.0006 per keyword on top of the base rate

That last point matters a lot: **Google AI Overview visibility becomes cheap to track through the SERP API**, so the expensive LLM-based citation tracking is only needed for ChatGPT and Perplexity. This materially lowers the cost of our AI visibility positioning.

### The closed loop shown to the merchant

```
Keyword assigned  →  meta applied  →  VERIFIED on live page  →  position day 0
                                                              →  position day 7 / 14 / 28
                                                              →  clicks and CTR from GSC
```

No promises. Just the actual number, before and after. This single screen is the app's best marketing asset.

---

## PART 6 — DATA COST MODEL

Verified Aug 2026. Note: DataForSEO raised rates ~20% across eight APIs on 1 July 2026 — verify current rates at signup and re-check quarterly.

| Endpoint | Rate |
|---|---|
| Keywords Data API (volume, CPC, competition — Google Ads source) | ~$0.075 per 1,000 keywords (pre-increase) |
| Labs API (difficulty, intent, related, SERP competitors) | ~$0.025 per 1,000 |
| SERP API — Standard queue (~5 min turnaround) | **$0.0006 per SERP** ($0.60 / 1,000) |
| SERP API — Priority (~1 min) | $0.0012 |
| SERP API — Live (~6 sec) | $0.002 |
| AI Overview data on SERP Advanced | +$0.0006 per keyword |
| Minimum deposit | $50, with $1 trial credit |

**Rule: rank tracking always uses the Standard queue.** Live mode is 3.3x the price for a job nobody is watching in real time. Use Live only for a single on-demand check the merchant explicitly clicks.

**Note:** one SERP billing unit is 10 results. Tracking beyond position 10 multiplies the cost via the depth parameter — track top 20 only where it matters, not top 100.

### Per-store cost

**Keyword research (one-time per store, then incremental):**

| Catalog | Keywords enriched | Cost |
|---|---|---|
| 500 products | ~20,000 | **~$1.80** |
| 2,500 products | ~60,000 | ~$5.40 |
| 10,000 products | ~150,000 | ~$13.50 |

Monthly refresh of assigned keywords only: ~$0.20–0.60.

**Rank tracking (recurring, Standard queue, weekly):**

| Tracked keywords | Markets | SERPs/month | Cost/month |
|---|---|---|---|
| 100 | 1 | 400 | **$0.24** |
| 500 | 1 | 2,000 | **$1.20** |
| 500 | 3 | 6,000 | **$3.60** |
| 2,000 | 3 | 24,000 | **$14.40** |

Add roughly the same again if AI Overview tracking is enabled on every keyword.

**Conclusion: real keyword research and real rank tracking cost single-digit dollars per store per month.** There is no financial reason for this category to lack them. Competitors do not have them because it is engineering work, not because it is expensive.

---

## PART 7 — BUILD REQUIREMENTS

- [ ] `Keyword` table: term, market (`location_code`), language, volume, cpc, difficulty, intent, winnability, source, fetchedAt
- [ ] `KeywordAssignment` table: keywordId, resourceGid, url, market, role (primary|secondary) — **unique constraint on (resourceGid, market, role='primary')**
- [ ] `RankSnapshot` table: assignmentId, market, device, position, aiOverviewPresent, top10Domains (json), checkedAt
- [ ] All DataForSEO calls carry explicit `location_code` and `language_code`. Never rely on defaults.
- [ ] Rank tracking runs on the Standard queue via a scheduled job with webhook callbacks, never blocking a request
- [ ] Keyword data cached per market with a TTL; volume does not change daily and re-fetching is wasted money
- [ ] Per-shop data budget in the same `AiBudget` mechanism as LLM spend, with a hard stop
- [ ] Generated copy passes a **stuffing check** before it is ever applied: keyword count per field capped, natural-language check, regenerate on failure
- [ ] Merchant can override any keyword assignment; overrides are never silently changed by autopilot
- [ ] A "why this keyword" explanation is shown for every assignment — volume, difficulty, winnability, who currently ranks
