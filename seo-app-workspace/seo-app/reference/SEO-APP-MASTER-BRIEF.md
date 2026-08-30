# SEO APP — MASTER BRIEF
**Working name:** ProofSEO (placeholder — final naam baad me lock karna)
**Positioning in one line:** *The only Shopify SEO app that proves every change on your live page — and gets you found by ChatGPT, Perplexity & Google AI, not just Google 2018.*

Date: 30 Aug 2026
Owner: Umang
Agent: Antigravity (build), Claude (architect/reviewer)

---

## 0. WHY THIS APP EXISTS (the wedge)

Existing SEO apps (Booster, Avada, SearchPie, TinyIMG, Sherpas, Yoast Shopify) are all 4.8–4.9 stars. Un ko frontal attack karke nahi jeetenge. Jeetne ka rasta = unke **1-star reviews** me hai, kyunki wahan har app ka same 4 failure repeat ho raha hai:

### Gap #1 — "Dashboard said 100% optimized, live page pe kuch nahi tha"
Real merchant review (Mar 2026, Booster SEO): 8 mahine paid, dashboard always "100% optimized", but alt text and meta tags **kabhi frontend pe push hi nahi hue**. Refund mila sirf 1 month ka.
→ **Ye sabse bada trust hole hai.** Koi app apna kaam live HTML fetch karke verify nahi karta.

### Gap #2 — Uninstall pe theme tod dete hain
Multiple apps (Booster, SearchPie, Yoast, SEO Booster) ke reviews: uninstall ke baad meta title/description **gayab**, theme.liquid me leftover code, ek case me tab title "Facebook" ho gaya, ek me "American Express". Merchant ko theme rollback karna pada.
→ Kyunki ye apps theme.liquid me code inject karte hain aur uninstall pe clean nahi karte.

### Gap #3 — Do SEO app = duplicate schema = dono ignore
Documented case: Avada + Booster dono ne Product schema inject kiya → GSC me 140 pages "duplicate structured data" error. Ek app hatane pe 2 hafte me fix.
→ Koi app check nahi karta ki theme ya doosra app already schema de raha hai ya nahi.

### Gap #4 — Content SEO 2018 ka hai
Jewelry store merchant ka review (Avada): technical features ache hain, lekin content recommendations **keyword density, exact-match keyword, first-sentence keyword** — yaani Helpful Content update se pehle wali SEO. Usne near-perfect score le liya, ranking pe farak nahi.
→ Aur ye 2026 me aur bura hai, kyunki asli traffic shift AI search me ho raha hai.

### Gap #5 — Billing traps
Bar-bar: "uninstall kiya phir bhi $55/$69 charge hua", "trial me cancel kiya phir bhi charge".

### Gap #6 — App bloat
3 SEO apps = 200–400KB extra JS. Ek documented store: 2.8s → 4.1s load. Consolidate karne pe 2.2s.

**Hamari poori app in 6 gaps ke around design hogi. Feature list nahi — trust product.**

---

## 1. THE 2026 REFRAME (ye timing ka moat hai)

Shopify SEO ab sirf Google ka game nahi raha:

- Shopify ne Dec 2025 – May 2026 ke beech khud ko AI shopping ke around rebuild kiya: **Shopify Catalog** product data ko Shop, ChatGPT, Perplexity, Gemini, Copilot me syndicate karta hai. Agentic Storefronts admin page (May 2026) merchants ko dikhata hai kaunsi AI queries pe unke products aate hain.
- Shopify ki apni reporting: AI search se orders ~11x badhe Jan 2025 → Jan 2026; AI traffic ~7x.
- AI-referred shoppers ~31% higher convert karte hain (Profound/Search Engine Land, Mar 2026).
- **Lekin:** Catalog eligibility automatic hai, **visibility nahi**. Median Shopify store AI agents ke padhne wale product-data fields me se sirf 3 bharta hai. Aur AI crawlers (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended) theme, photos, trust badges kuch nahi dekhte — sirf robots access, JSON-LD, server-rendered HTML.

**Matlab:** ek store Google page 1 pe ho sakta hai aur ChatGPT ke liye poori tarah invisible ho sakta hai.

Purane apps ye layer address nahi karte (SearchPie ne AEO checklist add kiya hai — sirf checklist, tracking nahi). **Hamara AI-visibility layer = differentiator jiske liye merchant naya app install karega.**

⚠️ Honest line jo product me bhi rakhni hai: `llms.txt` ko abhi tak kisi major AI provider ne answer-time ranking factor confirm nahi kiya. Hum use "low-cost future-proofing" bolenge, "magic" nahi. Jo apps isko magic bolenge unke reviews 6 mahine me phategi.

---

## 2. SHOPIFY LIMITS — kya possible hai, kya nahi (build se pehle padho)

Ye section ke bina Antigravity aisi feature bana dega jo platform allow hi nahi karta.

### 2.1 Theme files (robots.txt.liquid, theme.liquid)
- Admin API 2023-04 se Asset resource ka PUT/DELETE `write_themes` scope ke peeche hai, aur **App Store app ko Shopify se exemption chahiye**.
- **Good news:** Shopify ki eligible exemption categories me literally likha hai — *"Other platform functionality: Your app primarily provides search engine optimization…"* → SEO app eligible hai.
- **Action:** Day 1 se "Online Store Protected Scope Exemption Request" form bhar do. Approval me time lagta hai, aur dev app vs production app ke liye alag issue aata hai (forums me reports hain ki prod approve hua par dev app pe `ACCESS_DENIED` aaya).
- **Plan B agar exemption late/deny ho:** sab kuch metafields + theme app extension se karo, aur robots.txt/canonical ke liye copy-paste snippet + guided instructions do. App phir bhi 90% value deliver karti hai.

### 2.2 Script tags — MAR GAYE (aur ye hamara advantage hai)
- **1 Oct 2026 se** `scriptTagCreate` / `scriptTagUpdate` user error return karenge; REST ScriptTag POST/PUT reject.
- **1 Mar 2027 se** Shopify script tags inject karna hi band kar dega.
- Deprecation sab API versions pe lagu hai — version pin karke bacha nahi sakte.
- → Sab kuch **theme app extension (app embed block)** se. Purane apps ko migrate karna padega; hum din 1 se clean hain. **1 Oct 2026 ke aas-paas launch = perfect timing.**

### 2.3 Jo bilkul possible NAHI hai (aur isliye hum promise nahi karenge)
| Cheez | Reality |
|---|---|
| `sitemap.xml` edit karna | Shopify auto-generate karta hai, **edit nahi ho sakta**. Sirf publish status + robots se control. Competitors "sitemap optimization" bechte hain — mostly theatre. |
| URL structure badalna (`/products/`, `/collections/`) | Fixed. Sirf handle badal sakte ho. |
| Shopify ka auto canonical tag hatana | Auto emit hota hai. App embed sirf **add** kar sakta hai — dusra canonical add karoge to aur bura. Rewrite ke liye theme edit (= exemption) chahiye. |
| 404 / broken link server logs | Shopify logs nahi deta. Solution = apna crawler (sitemap se URLs) + Google Search Console API. |
| Checkout page SEO | Access nahi, aur zarurat bhi nahi. |
| Core Web Vitals "fix" karna | App theme ka JS nahi hata sakta. Sirf image optimization + apna zero-bloat footprint + honest diagnosis. |

### 2.4 Kya bilkul possible hai (native, clean)
| Kaam | API |
|---|---|
| Meta title / description | Metafields `global.title_tag`, `global.description_tag` via `metafieldsSet` — **native path, koi theme injection nahi**. (Check: theme ye metafields padhta hai ya nahi — Dawn/OS 2.0 padhte hain; custom theme me warn karo.) |
| Image alt text | `fileUpdate` / product media alt |
| Handle change + 301 | `urlRedirectCreate` (bulk redirect manager) |
| JSON-LD schema | Theme app extension app embed, `target: head` |
| robots.txt AI-crawler rules | `themeFilesUpsert` on `robots.txt.liquid` (exemption chahiye) |
| Bade catalogs (5k+ SKU) | `bulkOperationRunQuery` / `bulkOperationRunMutation` — warna GraphQL cost-based leaky bucket rate limit maar dega |
| GSC data | Google Search Console API (merchant OAuth) |

### 2.5 Approval-friendly decisions
- **Protected customer data scopes mat maango** (`read_customers`, `read_orders` nahi). SEO app ko zarurat nahi → review fast, privacy questionnaire halka.
- Built for Shopify target: latest API version, app embed only, Polaris admin UI, embedded app, performance impact minimal, mandatory webhooks (incl. `app/uninstalled`, GDPR webhooks).

---

## 3. PRODUCT ARCHITECTURE

### Layer A — PROOF ENGINE (ye hi asli product hai, feature nahi)
Har action ke baad app server-side merchant ki **live storefront URL fetch karta hai**, rendered HTML parse karta hai, aur confirm karta hai ki tag actually wahan hai.

- Har product/collection/page ke liye: `Before → Applied → Verified on live page at HH:MM` (green tick) ya `Not detected on live page — reason: X` (red).
- Reasons honestly batao: theme metafield nahi padh raha / dusra app overwrite kar raha hai / CDN cache / theme app extension embed off hai.
- Weekly auto re-verify — kyunki merchant theme change karta hai aur sab silently toot jaata hai (yehi Gap #1 ki asli wajah hai).
- Dashboard pe **"Verified" count dikhao, "Optimized" nahi.** Ye ek shabd hi poori positioning hai.

**Marketing line:** *"Har doosri SEO app aapko score dikhati hai. Hum aapko aapka live page ka source code dikhate hain."*

### Layer B — CLEAN INSTALL / CLEAN EXIT
- Zero theme.liquid injection by default. Sab metafield + app embed.
- Agar exemption mila aur `robots.txt.liquid` edit karna pada: pehle **full backup** store karo file ka.
- `app/uninstalled` webhook pe: theme file restore, app embed ka data neutral, metafields **as-is chhodo** (wo merchant ka data hai, delete karna hi asli crime hai jo baaki apps karte hain).
- Uninstall ke waqt ek "Clean Exit Report" email: kya-kya revert hua, kya aapke store me raha (aapke meta tags, jo aapke hain).
- Settings me hamesha "Export all my SEO data (CSV)" button.

### Layer C — SCHEMA (conflict-aware)
- Pehle live page scan → existing JSON-LD detect (theme ka ya dusre app ka).
- Agar Product schema already hai → hum apna **disable rakhte hain by default** aur merchant ko batate hain: "Aapke theme se already Product schema aa raha hai. Hum duplicate nahi banayenge. Iske missing fields ye hain: …"
- Schema types: Product (offers, availability, GTIN/barcode, shipping+return details), BreadcrumbList, Organization, FAQPage, Article (blog), LocalBusiness (India ke local stores ke liye), ItemList (collections).
- **`aggregateRating` sirf tab jab REAL reviews ho** (Judge.me / Loox / Shopify Product Reviews metafield se pull). Fake rating = Google manual action + hamara app doob jaayega. Ye non-negotiable rule hai — wahi "real-data-only" rule jo Shop Forge me hai.

### Layer D — AI VISIBILITY (differentiator)
1. **AI Crawler Access Check** — robots.txt fetch karke check karo: GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended, Bingbot. Ek click me allow rules add karo (exemption path) ya copy-paste snippet do.
2. **AI Product Data Score** — har product ke wo fields check karo jo AI agents padhte hain: barcode/GTIN, vendor, product type, material, size/colour options, care, description depth, image count, weight/dimensions. Median store 3 bharta hai — hum "18/25 fields" dikhate hain aur ek click me bulk-fill karte hain jo derivable hai.
3. **AI Citation Tracker** — hafte me ek baar merchant ki 10–25 buying queries ("best ayurvedic face wash under 500") ChatGPT/Perplexity/Gemini pe chalao, record karo ki store cite hua ya nahi, aur kaun hua (competitor). **Ye report koi $20 app nahi de raha. Yahi retention hook hai.**
4. **Bing Merchant Center + Google Merchant Center feed check** — ChatGPT Shopping Bing feed se pull karta hai; zyadatar Indian merchants Bing pe hai hi nahi. Ye ek setup wizard = instant value.
5. **llms.txt generator** — with the honest disclaimer likha hua.

### Layer E — INTENT SEO (Gap #4 ka jawab — keyword density nahi)
Merchant Google Search Console connect karta hai, phir:
- **CTR opportunities:** high impressions + low CTR pages → title/description rewrite (AI se), phir Proof Engine se verify, phir 28 din baad **real before/after CTR** dikhao. Ye "SEO score" se 10x zyada convincing hai.
- **Cannibalization:** ek hi query pe 2+ pages compete kar rahe hain → merge/canonical suggestion.
- **Content gap:** queries jinpe impressions hain but koi matching page nahi → collection ya blog suggest karo.
- **Internal linking engine:** GSC query overlap ke basis pe blog→product, collection→product links suggest karo (orphan pages find karo sitemap crawl se).
- Scoring me **keyword density kahin nahi hogi.** Intent match, entity coverage, PDP data completeness.

### Layer F — HYGIENE (table stakes, but clean)
Bulk meta templates (variables ke saath), bulk alt text, image compression + WebP, broken link/404 finder (crawler + GSC) + one-click 301, redirect manager, noindex control for thin/filtered pages, hreflang check for Shopify Markets stores, GSC/Bing verification wizard.

### Layer G — INDIA MODE (Umang ka natural edge)
- ₹ pricing, INR billing.
- Hinglish/regional meta description generation (Hindi, Gujarati, Marathi) — koi app ye nahi karta.
- LocalBusiness schema + city-page helper (Indian D2C "Mumbai me best X" queries).
- WhatsApp pe weekly SEO report (Indian merchants email nahi kholte).
- Onboarding + support Hinglish me.

---

## 4. AUTOMATION MODEL ("sab automatic")

Merchant ka mental model 3 buttons ka hona chahiye:

1. **Scan** (2 min) — poora store crawl, live-verified audit, "Aapke 412 products me se 38 AI-invisible hain".
2. **Autopilot ON** — app rules ke hisaab se apne aap fix karta rehta hai: naya product add hua → meta + alt + schema + AI fields auto, verify, log.
3. **Weekly Proof Report** — email/WhatsApp: kya change hua, live verify hua ya nahi, GSC CTR ka asar, AI citation status.

**Autopilot safety rails (Gap: "autopilot ne mere ache titles bekar kar diye"):**
- Autopilot **manually likhe hue meta ko kabhi overwrite nahi karega** — sirf khaali ya duplicate/auto-generated wale bharega. Ye default hai.
- Har autopilot action reversible, 90-day history, "Undo last 24h" ek button.
- Pehle 7 din "Suggest mode" — merchant approve kare, phir full auto ka option.

---

## 5. PRICING & PATH TO ₹3,00,000 / MONTH

### Revenue share reality
Lifetime first **$1,000,000** pe 0% rev share, uske upar 15%. (Annual reset khatam ho chuka hai — ab lifetime hai.) Reduced-rate plan ke liye one-time $19 register karna hota hai. Matlab ₹3L/mo pe Shopify ka cut ~₹0. Poora tumhara.

### Plans (₹ India / $ global — dono, PageVault jaisa)
| Plan | Price | Kya milta hai |
|---|---|---|
| **Free** | ₹0 | Full audit + AI crawler check + AI data score + 25 products optimize. *Ye paid plan nahi, ye distribution engine hai — installs + reviews + App Store ranking.* |
| **Starter** | $9.99 / ₹799 | Unlimited meta + alt automation, schema (conflict-aware), Proof Engine, redirects, 404 finder |
| **Growth** ⭐ | $29 / ₹2,399 | + GSC intent engine, AI Citation Tracker (25 queries), internal linking, Bing/GMC wizard, WhatsApp report |
| **Pro / Agency** | $79 / ₹6,499 | + multi-store, 100 queries, white-label PDF audits, priority support, API |

### Math to ₹3L/month (~$3,400 MRR @ ₹88/$)
Blended ARPU ka realistic target **$22** (kyunki Growth pe zyada log aayenge).

- $3,400 ÷ $22 = **~155 paying merchants.**
- Free→paid conversion 4% (achhe SEO app ka realistic range 3–6%) → **~3,900 active free installs** chahiye.
- Churn: SEO apps me 5–8%/month. 155 subs @ 6% churn = **har mahine ~10 naye sirf standstill ke liye**. Isliye free tier ko grow karna hi asli kaam hai.

### 12-month ladder (realistic, hype nahi)
| Mahina | Milestone | MRR |
|---|---|---|
| 0–3 | Build MVP + exemption request + 20 beta stores (tumhare freelance clients) | ₹0 |
| 3–4 | App Store approval, launch, first 50 reviews (beta stores se) | ~₹15k |
| 5–7 | App Store SEO ranking ("shopify AI SEO", "AEO", "ChatGPT visibility" — ye keywords abhi khaali hain), ~600 installs | ~₹60k |
| 8–10 | 1,800 installs, AI Citation Tracker viral hook, content marketing | ~₹1.4L |
| 11–14 | 3,500–4,000 installs, 155+ paid | **₹3L** |

### Fast-track (Umang-specific — 12 mahine mat wait karo)
Tumhare paas already freelance + Shopify clients hain. Do **"AI Visibility Setup" service** ₹8,000–₹15,000 one-time (audit + fix + Bing/GMC feed + 30-day AI citation report), app subscription bundled.
- 12 clients × ₹12k = ₹1.44L **pehle 2 mahine me**, app store base grow karte hue.
- Bonus: har client ek case study aur ek 5-star review = App Store ranking fuel.
- **Ye hi realistic ₹3L ka rasta hai** — app-store-only route se 12+ mahine lagenge, service+app hybrid se 5–7.

### App Store ranking lever (mat bhoolo)
App Store listing bhi SEO hai. Title/tagline me wo keywords daalo jo abhi kisi ke paas nahi: *"AI SEO — ChatGPT, Perplexity & Google visibility"*. Booster/Avada purane keywords pe baithe hain; naya category tum define kar sakte ho.

---

## 6. BUILD PHASES

**Phase 0 (Week 0):**
- Partner app create, `write_themes` exemption form submit (ye sabse lamba lead time hai — sabse pehle).
- Stack lock: Remix + Prisma + Postgres + Railway + BullMQ (PageVault jaisa hi — reuse karo, naya kuch mat seekho).
- Scopes: `read_products, write_products, read_content, write_content, read_themes, write_themes(exempt), read_online_store_pages`. **Customer/order scopes bilkul nahi.**

**Phase 1 (Week 1–3) — Proof Engine + hygiene**
Crawler, live-HTML verifier, metafield meta writer, bulk alt, redirect manager, audit dashboard. Isi phase me Proof Engine banao — baad me bolt-on nahi ho sakta.

**Phase 2 (Week 4–5) — Theme app extension**
App embed (`target: head`) for JSON-LD, conflict detector, schema builder. Clean uninstall webhook + backup/restore.

**Phase 3 (Week 6–7) — AI layer**
Crawler access check, AI product data score, robots.txt writer, llms.txt, Bing/GMC wizard, AI Citation Tracker v1.

**Phase 4 (Week 8–9) — Intent layer**
GSC OAuth, CTR opportunities, cannibalization, internal linking, before/after reporting.

**Phase 5 (Week 10) — Polish + submit**
Polaris UI, billing (Shopify Managed Pricing), onboarding, Hinglish support docs, 20 beta stores pe real testing, submit.

---

## 7. NON-NEGOTIABLE RULES (Antigravity ke liye)

1. **Koi bhi claim tab tak "done" nahi jab tak live storefront HTML fetch karke prove na ho.** Dashboard status ≠ reality. (Yehi Gap #1 hai, aur yehi tumhara Shop Forge wala "Umang's own eyes" rule hai — app me automate ho raha hai.)
2. **Theme.liquid me kuch inject nahi hoga** app embed ke bahar. Agar exemption se `robots.txt.liquid` chhu rahe ho to backup pehle, restore on uninstall.
3. **Fake data kabhi nahi** — aggregateRating sirf real reviews se, stock/urgency schema sirf real inventory se. Manual meta kabhi overwrite nahi.
4. **Zero storefront bloat** — app embed me sirf JSON-LD (`<script type="application/ld+json">`), koi runtime JS nahi. Ye Gap #6 ke against hamara marketing point hai; tod diya to positioning gayi.
5. **Script tags bilkul use nahi** (Oct 2026 se error, Mar 2027 se dead).
6. **Bade catalogs pe Bulk Operations API**, warna rate limit pe app 5,000-product store pe silently fail karega.
7. **Har feature ke saath honest limitation copy** UI me — sitemap edit nahi ho sakta, llms.txt unproven hai, Shopify ka canonical hata nahi sakte. Merchant jhooth se churn karta hai, limitation se nahi.

---

## 8. OPEN DECISIONS (Umang decide kare)

1. App ka final naam + App Store listing keywords.
2. Launch geography: India-first (₹, Hinglish, WhatsApp) ya global-first (English, $)? — Recommendation: **global listing + India mode as a feature**, kyunki App Store traffic mostly US/EU hai lekin India differentiator ban jaata hai.
3. Free tier limit: 25 products ya 50? (25 = zyada conversion, 50 = zyada reviews)
4. AI Citation Tracker ka cost model — kaunse models query karenge, per-merchant monthly API budget kya (ye tumhara asli COGS hai, isko pricing me model karo).
5. Service fast-track chalu karna hai ya sirf app? (Recommendation: haan, ₹3L 5–7 mahine me isi se aayega)
6. Ye app PageVault repo se alag rahega ya same Partner org me? (Rev share lifetime ab **partner level pe aggregate** hota hai — dono apps ka revenue milta hai $1M threshold ke liye. Planning me dhyan rakhna.)
