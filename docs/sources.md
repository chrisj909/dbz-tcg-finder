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
| **OfferUp** | ⏳ planned | Playwright + login (#7) |
| **Mercari / TCGPlayer / Troll&Toad / local shops** | ⏳ planned | #27 / #28 / #18 / #10 |

The legacy `src/lib/scrapers/*` (TCGPlayer stub, dead eBay Finding API, 404 Troll&Toad) are superseded by the scanner; the Vercel cron that still runs them is dead weight (#30).

---

## TCGPlayer

| Field | Value |
|-------|-------|
| **Status** | Stub — returns empty until API key or headless browser is added |
| **Search URL** | https://www.tcgplayer.com/search/dragon-ball-super-card-game/product?productLineName=dragon-ball-super-card-game&q=sealed&view=grid&inStock=true |
| **Method** | Official API (recommended) or headless browser |
| **API registration** | https://developer.tcgplayer.com |
| **Auth** | Client credentials — `TCGPLAYER_PUBLIC_KEY` + `TCGPLAYER_PRIVATE_KEY` |
| **robots.txt** | https://www.tcgplayer.com/robots.txt |

**Notes:** TCGPlayer renders product listings via React/JavaScript, so basic HTML fetching returns a mostly-empty shell. Two options:

1. **Official API** (recommended): Register at developer.tcgplayer.com, obtain API keys, use `POST /v1.39.0/catalog/products/search` with `categoryId: 68` (Dragon Ball Super). Add `TCGPLAYER_PUBLIC_KEY` and `TCGPLAYER_PRIVATE_KEY` to env vars.
2. **Headless browser**: Deploy a Puppeteer/Playwright function on a service that allows long-running processes (e.g. a separate Render or Railway service) and call it from the cron job.

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
| **Status** | Functional — HTML scrape |
| **Method** | HTML scraping (no public API) |
| **Search URL** | https://www.trollandtoad.com/dragon-ball-super/all-sealed-product/ |
| **robots.txt** | https://www.trollandtoad.com/robots.txt |
| **ToS** | https://www.trollandtoad.com/info/terms-of-use |

**Notes:**
- No official API. The scraper parses product cards from their HTML.
- Check `robots.txt` before production use — respect any `Crawl-delay` directives.
- The parser targets `.product-col` class containers; may break if Troll and Toad updates their HTML structure.
- Consider adding a polite delay (`await new Promise(r => setTimeout(r, 1000))`) between pages if scraping pagination.

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
