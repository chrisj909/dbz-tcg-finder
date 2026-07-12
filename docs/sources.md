# Data Sources

Documentation for each data source: URL, scraping method, API registration, and compliance notes.

## Current status (2026-06-27)

All marketplaces 403 plain HTTP, so every source runs in the **local scanner** (`scanner/sources/*.js`) via headless Chromium on the residential IP. Run: `node --env-file=.env.local scanner/run.js [--source=<name>]`.

| Source | Status | Notes |
|--------|--------|-------|
| **eBay** (search) | ✅ live | `scanner/sources/ebay.js` — sealed-filtered, ~230 listings; images via scroll + currentSrc |
| **eBay SOLD** (market value) | ✅ live | `scanner/market.js` → `market_values` resale benchmarks |
| **Craigslist** | ✅ live | `bham`.craigslist.org (NOT `birmingham.*` = UK) |
| **Facebook Marketplace** | ✅ live | Birmingham; needs PERSONAL FB profile + saved session (`scanner/login.js facebook`); FB image URLs expire (#35) |
| **TCGplayer** | ✅ live | `scanner/sources/tcgplayer.js` — DBS Fusion World "Sealed Products" category; lowest "from" price per box (renders headless). Market-price→`market_values` is a follow-up (#44). |
| **Troll & Toad** | ⚠️ site closed (temp) | `scanner/sources/trollandtoad.js` — relaunched on Shopify; reads `products.json` for the DBS "Sealed Product" collection (now also captures the full `images[]` array for #68's multi-photo carousel — free, same response, no extra request). **2026-07-10: T&T's whole storefront is down** — homepage reads "we'll be back soon... moving to a new location," `products.json` now 401s site-wide. Not a scraper bug — nothing to fix, code is correct and will resume working once they reopen. Check back periodically. |
| **OfferUp** | ✅ live | `scanner/sources/offerup.js` — Playwright + saved session (PR #53); 6 search queries; set location to Birmingham AL on login. Renew session: `node scanner/login.js offerup` |
| **Mercari** | ✅ live | `scanner/sources/mercari.js` — `playwright-extra` + stealth plugin bypasses Mercari's anti-bot gate (PR #54); 40–47 sealed DBZ listings per run; no login required |
| **Local card shops** | ✅ live | `scanner/sources/local-shops.js` — Gear Gaming Bham, Card Addicts, Iron City Games; queries each shop's TCGplayer Pro inventory API for our known sealed product IDs. Currently all 0 in-stock for sealed boxes (shops sell singles, not sealed on TCGplayer Pro). Fires when any shop restocks. Pinnacle Cards & Games evaluated (#59) — no scrapeable storefront (location appears closed); not added. |
| **Best Buy** | ✅ live | `scanner/sources/bestbuy.js` — official free Products API (developer.bestbuy.com), not a scrape. Needs `BESTBUY_API_KEY` in `.env.local` (self-serve signup); skips cleanly without it. Lowest risk of any source here. |
| **GameStop** | ✅ live | `scanner/sources/gamestop.js` — `playwright-extra` + stealth past Imperva bot protection; reads structured `data-gtmdata` JSON off each product tile (no text parsing). Best-effort — GameStop's catalog here skews toward packs/starter decks over booster boxes. |
| **Walmart** | ⚠️ live, fragile | `scanner/sources/walmart.js` — `playwright-extra` + stealth past Akamai Bot Manager + PerimeterX (HUMAN Security). One search query per run only; detects and skips cleanly on the "Robot or human?" press-and-hold challenge, which reliably triggers after a handful of requests in one session (confirmed empirically). Expect frequent 0-result runs. |
| **Target** | ❌ not built | Deliberately skipped per Chris's call — carries real DBZ/DBS TCG inventory, but Target's ToS explicitly and prominently prohibits automated access, more so than the other chains evaluated alongside it. Revisit only if that changes. |
| **Top Cut Comics** | ✅ live | `scanner/sources/topcutcomics.js` — Shopify, but no dedicated Dragon Ball collection exists on the site, so we use `/search/suggest.json` (Shopify's predictive-search endpoint) instead of a collection's `products.json`. Currently carries only booster packs/starter decks, no full boxes — source works correctly, just nothing to surface yet. |
| **Miniature Market** | ✅ live | `scanner/sources/miniaturemarket.js` (#69) — national specialty hobby/TCG shop, US-based, custom platform (not Shopify). Real active DBS inventory incl. pre-orders, confirmed live; server-rendered search results, no anti-bot challenge encountered. |
| **Dave & Adam's Card World** | ✅ live | `scanner/sources/daveandadams.js` (#69) — national specialty sports/TCG shop, US-based (Amherst, NY), custom platform. Real DBS inventory confirmed; clean server-rendered search results. |
| **401 Games** | ✅ live | `scanner/sources/401games.js` (#69) — Canadian specialty shop (store.401games.ca), Shopify predictive-search (like Top Cut Comics). **Prices are CAD, not USD** (confirmed live via `window.Shopify.currency.active`) — stored with `currency: 'CAD'`; `deal-score.js` only scores `currency='USD'` listings so a CAD price is never compared against a USD market value as if it were an apples-to-apples discount. Confirmed ships to the continental US (flat $17.95 CAD + duties, min $20 order). |

**Franchise sanity check (2026-07-09):** every source now validates the scraped title actually mentions Dragon Ball (`isDragonBallTitle()` in `scanner/lib/detect.js`) before keeping a listing — never trust a marketplace's own category/search scoping alone. Found via a real leak: GameStop's "franchise=Dragon Ball" facet surfaced two pure-Pokemon listings with zero Dragon Ball mention. Also fixed a worse bug in `tcgplayer.js`: it was *relabeling* non-matching titles by force-prepending "Dragon Ball Super" rather than dropping them, which would have silently disguised any leak as legitimate data.

**National specialty shops evaluated for #69 (2026-07-10)**, alongside the three added above:
- **CoolStuffInc** — real DBZ/DBS inventory exists, but the search page returns a genuinely empty `<html><body></body></html>` (200 status) even with `playwright-extra` + the stealth plugin — stronger/different bot protection than anything else in this codebase gets past. Not added; revisit only with a different technique (e.g. their own API if one exists).
- **StrikeZone Online** — real inventory (also sells on TCGplayer/eBay), but `shop.strikezoneonline.com` has a broken SSL certificate (`ERR_CERT_COMMON_NAME_INVALID`) — a site-side misconfiguration, not fixable on our end without disabling cert verification (a real security compromise, not worth it for one source). Not added.
- **BAM Cards** (bamcards.com) — Shopify, confirmed working predictive-search, but only 2 DBZ products in their entire catalog, both out of stock. Too thin to be worth building. **BAM Collectibles LLC** (bamcollectiblesllc.com) also has a broken SSL cert like StrikeZone.
- **ChannelFireball** — the whole site now redirects into tcgplayer.com's own content pages (they were absorbed into TCGplayer's operations) — would be entirely redundant with the existing `tcgplayer.js` source. Not added.
- **Face to Face Games** — Shopify, working predictive-search, but zero Dragon Ball results (confirmed via live search) — branded/focused on MTG ("Canada's Largest MTG Retailer"), doesn't carry the game. Not added.
- **CardKingdom** — MTG-only storefront (nav literally only lists "Magic: The Gathering"); a "dragon ball" search returns unrelated MTG singles, not the TCG. Not added.

**Price/content integrity checklist (2026-07-10):** any source that reads a "tile" of text/DOM for one product — instead of structured, per-product JSON — can bleed content from a *different* product into the one you think you're scraping. Two distinct failure classes, both confirmed as real bugs here, not hypothetical:

1. **Wrong DOM boundary** (Walmart): price/title live outside the anchor `<a>` itself, so the scraper walks up to an ancestor container (`.closest(...)`) to read the whole tile's text. If that selector isn't tight enough, it can climb past the actual product boundary into a container that spans multiple tiles (e.g. a shared `<li>`/`<article>` wrapping a whole row), silently mixing in a neighboring product's price. **Mitigation:** always prefer the anchor's own `innerText` first (most sources here do — eBay, Craigslist, Facebook, Mercari, OfferUp all wrap the *entire* card in the link, so there's no ancestor walk needed at all). Only walk up to an ancestor when the marketplace's own markup genuinely puts price outside the link, and when you do, target the *most specific available per-product marker* first (e.g. Walmart tiles carry an `itemid` attribute on the anchor's immediate parent — check `[itemid]` before any looser `li`/`article`/`role="group"` fallback).
2. **Aggregate/pooled price, correct tile** (TCGplayer — the incident that motivated this section): the scraper reads the *right* product's tile, but the price the marketplace itself displays on that tile is a "from $X" or "as low as $X" figure pooled across every seller attached to that product ID — including sellers whose listing doesn't actually match what the product nominally is (TCGplayer lets sellers list cheap Japanese-import copies under the same product ID as the English box; the tile's "13 listings from $72.50" pools those in, understating the real English box by 3-5x). **Mitigation:** `pickReliablePrice(fromPrice, referencePrice, {maxDiscountRatio})` in `scanner/lib/detect.js` — if a second, more-trustworthy per-product reference price is available in the same scrape (a marketplace's own "Market Price", a structured API's condition-specific price, etc.) and the aggregate "from" price is implausibly far below it (default: under 30%), trust the reference instead. Apply this wherever a source scrapes an aggregate/pooled price *and* a same-scrape reference price is available; document why when one isn't available (e.g. `walmart.js` has no such reference — its price is source-of-truth, not aggregated across sellers on the tile).

**When adding or touching a source, ask:** (a) does price/title come from the anchor's own text, or from an ancestor lookup? If an ancestor lookup, is the selector as tight as the marketplace's actual markup allows? (b) does the marketplace show one seller's specific price, or an aggregate/pooled one? If aggregate, is there a same-scrape reference price to sanity-check against?

The legacy `src/lib/scrapers/*` were removed in #30 (the Vercel cron is now a no-op); all scraping lives in `scanner/`. The per-source reference sections below predate the scanner — treat the table above as the source of truth.

---

## TCGPlayer

| Field | Value |
|-------|-------|
| **Status** | ✅ live — `scanner/sources/tcgplayer.js` (headless Playwright, no API key) |
| **Search URL** | https://www.tcgplayer.com/search/dragon-ball-super-fusion-world/product?productLineName=dragon-ball-super-fusion-world&view=grid&ProductTypeName=Sealed+Products |
| **Method** | Headless Chromium — the category page renders product cards client-side but does so fine headless (unlike Mercari) |
| **robots.txt** | https://www.tcgplayer.com/robots.txt |

**How it works:** each product card is an `a[href*="/product/"]` whose `innerText` is `Set | rarity | Name | N listings from | $lowestPrice`. We pull the product id from the href, parse the name + lowest "from" price, keep boxes/cases (`detectProductType` ∈ {booster_box, case, bundle} — drops single/tournament packs), and upsert as `source='tcgplayer'`. Paginates `&page=1..3`; stops when a page returns no cards.

**Follow-ups:** (1) capture each product's **Market Price** into `market_values(source='tcgplayer')` so the deal engine can cross-reference TCGplayer alongside eBay-SOLD; (2) add the vintage DBZ product lines (Panini/Score) once their TCGplayer category URLs are confirmed. The official API (developer.tcgplayer.com, `categoryId: 68`) remains an option if the scrape ever breaks, but isn't needed today.

---

## eBay

| Field | Value |
|-------|-------|
| **Status** | Functional once `EBAY_APP_ID` is set |
| **Method** | eBay Finding API (free) |
| **API registration** | https://developer.ebay.com |
| **Auth** | App ID (Client ID) only — no OAuth needed for Finding API reads |
| **Docs** | https://developer.ebay.com/devzone/finding/Concepts/FindingAPIGuide.html |

**Setup steps:**
1. Create an account at developer.ebay.com
2. Create a new application (Production environment)
3. Copy the **App ID (Client ID)** from your application's key set
4. Add it as `EBAY_APP_ID` in your environment variables

**Notes:**
- The Finding API is free with generous rate limits (5,000 calls/day on free tier)
- ToS allows product data retrieval for shopping/comparison applications — review at https://developer.ebay.com/support/legal
- The Browse API (`/buy/browse/v1`) provides richer data (seller ratings, item specifics) but requires a more complex OAuth flow

---

## Troll and Toad

| Field | Value |
|-------|-------|
| **Status** | ✅ live — `scanner/sources/trollandtoad.js` (Shopify JSON, no API key) |
| **Method** | Shopify `products.json` (T&T relaunched on Shopify; the old `.product-col` HTML scrape is dead) |
| **Collection** | https://www.trollandtoad.com/collections/dragon-ball-super-sealed-product |
| **JSON** | `/collections/dragon-ball-super-sealed-product/products.json?limit=250&page=N` |
| **robots.txt** | https://www.trollandtoad.com/robots.txt |
| **ToS** | https://www.trollandtoad.com/info/terms-of-use |

**How it works:** Playwright lands on the collection page (sets cookies — no Cloudflare wall as of the relaunch), then reads the same-origin Shopify `products.json`. Each product gives `title`, `variants[].price`/`available`, `images[]`, and a `handle` → `/products/<handle>`. We keep boxes/cases (`detectProductType`) and map `available`→`in_stock`.

**Notes:**
- T&T is mid soft-reopen → catalog is listed but **all out-of-stock**; we still record it (prices + restock-readiness). `deal-score` only flags `in_stock` items, so out-of-stock boxes never show as "deals".
- Shopify caps `products.json` at 250/page; paginate with `&page=`.
- Follow-up: add vintage DBZ (Score/Panini) + other DBS sealed collections (e.g. `dragon-ball-super-expansion-sets`) once prioritized.
- Be polite — one collection fetch per run is plenty.

---

## Potential Additional Sources

| Source | URL | Method | Notes |
|--------|-----|--------|-------|
| **CardMarket** | cardmarket.com/en/DragonBall | API (registration required) | European-focused, strong vintage DBZ |
| **StrikeZone Online** | strikezoneonline.com | HTML scrape | Carries DBZ sealed |
| **Dave & Adam's** | dacardworld.com | HTML scrape | Large sealed product selection |
| **COMC** | comc.com | API | Consignment marketplace, good for vintage |
| **Amazon** | amazon.com | Product Advertising API | Requires Associates account |
| **Miniaturemarket** | miniaturemarket.com | HTML scrape | Often has DBZ sealed |

---

## DBZ TCG Sets to Target

### Dragon Ball Super Card Game (Bandai, 2017–present)
- **Fusion World** (FB01, FB02, FB03, ...)
- **Zenkai Series** (BT09–BT18+)
- **Ultimate Deck** / **Starter Decks**
- Cross Spirits (BT14), Vicious Rejuvenation (BT12), Realm of the Gods (BT16)
- **Search terms:** `Dragon Ball Super sealed booster box`, `DBSCG sealed`

### Dragon Ball Z (Panini America, 2014–2015)
- Heroes & Villains, Evolution, Perfection, Vengeance, Galactic Battle
- **Search terms:** `Dragon Ball Z Panini sealed`, `DBZ Panini booster box`

### Dragon Ball Z (Score Entertainment, 2000–2006)
- Saiyan Saga, Frieza Saga, Trunks Saga, Android Saga, Cell Games, World Games
- **Search terms:** `Dragon Ball Z Score Entertainment sealed`, `DBZ Score booster box`
- **Note:** Vintage sets are rare; treat any sealed listings as high-value alerts

---

## Compliance Checklist

Before increasing scrape frequency or adding new sources:

- [ ] Read and comply with each site's `robots.txt`
- [ ] Review ToS for data use restrictions
- [ ] Implement polite crawl delays (1–2 seconds between page requests)
- [ ] Set a descriptive `User-Agent` with your repo URL for transparency
- [ ] Do not scrape pricing data to republish commercially without permission
- [ ] Use official APIs wherever available (TCGPlayer, eBay) in preference to HTML scraping
