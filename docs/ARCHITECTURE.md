# Architecture — DBZ TCG Finder

How the pieces fit. A reseller tool that hunts **DBZ sealed product (all eras)** across eBay + Birmingham-local
marketplaces, values it against **eBay-SOLD** medians, and surfaces **underpriced boxes** in a dashboard. Read
`CLAUDE.md` for hard rules; this explains the system.

## Overview

One **Neon Postgres** DB, written by the scanner and read by the web app:

1. **Cloud web app** (Vercel) — the dashboard + read APIs. Live at `dbz-tcg-finder.vercel.app`. No browser, always-on.
   (The old Vercel cron was **retired** (#30): `/api/cron/scan` is now a no-op and the legacy `src/lib/scrapers` were
   deleted — the local scanner is the only ingester.)
2. **Local scanner** (`scanner/`, Chris's Windows PC) — a Node package that runs **every** marketplace source via
   **Playwright** (they all 403 plain HTTP, so each needs a real browser on a residential IP). Writes to Neon directly.
   Never deployed.
3. **Automation loop** (`automation/` + `.claude/`) — scheduled `claude` runs that work the GitHub backlog and keep the
   system healthy (branch → green-gate → **self-merge**). Not part of the running product.

```
            SOURCES (all 403 plain HTTP → real browser, residential IP)
            eBay · Craigslist(bham) · Facebook Marketplace · [OfferUp/Mercari/TCGPlayer planned]
                                   │
                                   ▼
        ┌───────────────────────────────────────────────┐        ┌──────────────────────────┐
        │  LOCAL SCANNER (Chris's PC, Task Scheduler)     │        │  VERCEL (cloud)          │
        │  scanner/ (Node, Playwright)                    │        │  Next.js 14 (TS)         │
        │  run.js : scrape → upsert → scan_run            │        │  page.tsx  Deals/listings │
        │           → deal-score.js (vs market_values)    │        │  /api/inventory, /health │
        │  market.js : eBay SOLD → market_values          │        │  /api/cron/scan (retired) │
        └───────────────────────┬─────────────────────────┘        └─────────────┬────────────┘
                writes (direct)  │   @neondatabase/serverless         reads        │
                                 ▼                                                 ▼
                  ┌───────────────────────────────────────────────────────────────┐
                  │  NEON serverless Postgres (free)                               │
                  │   listings · scan_runs · market_values · price_history         │
                  │   (neon_auth.users_sync once Neon Auth is enabled — #15)       │
                  └───────────────────────────────────────────────────────────────┘
                                 ▲  branch + PR + self-merge; files issues for bugs
                  ┌──────────────┴───────────────┐
                  │  AUTOMATION LOOP (automation/ + .claude/)  scheduled claude on the backlog │
                  └──────────────────────────────┘
```

## Repo layout

| Path | Purpose |
|------|---------|
| `src/` | Next.js 14 (App Router, TS, Tailwind) → Vercel. Dashboard + read APIs. |
| `src/app/page.tsx` | Dashboard (RSC, `force-dynamic`). Listings grid + **Deals view** (`?view=deals`) + stats. |
| `src/app/api/{inventory,health,cron/scan}/route.ts` | Read API · health · cron route (retired no-op, #30). |
| `src/lib/db.ts` | Lazy Neon client (`sql` tag) — never throws at import (build-safe without `DATABASE_URL`). |
| `src/lib/types.ts` | Shared types (`Listing` incl. deal fields, `Source`, `Category`, `Era`, …). |
| `src/components/` | `InventoryCard` (deal badge + "vs $N sold"), `StatsBar`. |
| `scanner/` | **Local** Node package (own `package.json`, ESM `.js`, Playwright). Not deployed. |
| `scanner/run.js` | Orchestrator: scrape every source → upsert → `scan_run` → **score deals**. |
| `scanner/sources/{ebay,craigslist,facebook}.js` | One module per source (sealed-filtered). |
| `scanner/market.js` + `scanner/market/products.js` | eBay-**SOLD** market-value engine + the curated product list/matcher. |
| `scanner/deal-score.js` | Match box listings → `market_values`, compute `deal_score`/`market_value`/`deal_reason`. |
| `scanner/login.js` | One-time **headed** login → saves Playwright session to `scanner/.auth/` (run in Chris's terminal). |
| `scanner/lib/{db,detect}.js` | Neon upsert (refreshes metadata/images each sighting) + title→field detection. |
| `scripts/migrate.mjs` | Idempotent migration runner (`node --env-file=.env.local scripts/migrate.mjs`). |
| `db/migrations/*.sql` | `001_initial` (listings, scan_runs) · `002_reseller` (deal columns + market_values + price_history). |
| `automation/` | The self-maintenance loop: `dev-loop.md` (prompt), `run-dev-loop.ps1`, `run-scan.ps1`, `README.md`. |
| `.claude/agents/` | Subagents (`source-fixer`, `dashboard-dev`, `qa-verifier`, `backlog-groomer`). |
| `CLAUDE.md` · `docs/` | Project memory + reference docs. |

## Data flow: source → deal on the dashboard

1. **Scrape** — a per-source module (`scanner/sources/*.js`) drives Playwright, sealed-filters titles, returns
   `ScrapedListing`s. Sources run sequentially; one failure never aborts the rest.
2. **scan_run open** — a `scan_runs` row (`status='running'`) tracks the job.
3. **Upsert** — dedupe on `(source, external_id)` (`scanner/lib/db.js`): new → `INSERT`; existing → `UPDATE` (price-change
   tracking + **refresh `image_url`/title/etc. via COALESCE** so re-scans backfill metadata).
4. **Score deals** — `deal-score.js` matches box/case listings to their `market_values` benchmark and writes
   `deal_score` (% under sold median), `market_value`, `deal_reason`. Stale scores reset each run.
5. **scan_run close** — counts + errors + `status`.
6. **Read** — `page.tsx` / `/api/inventory` query `listings WHERE is_active`; `?view=deals` sorts by `deal_score`.
   `force-dynamic` means every request reflects the latest scan.

`market.js` runs the parallel **valuation** pipeline: for each curated product, scrape eBay **sold/completed** listings,
compute median/low/high, upsert into `market_values` (`source='ebay_sold'`).

## Source split — everything is local

Every marketplace returns **403 to plain HTTP** (datacenter IPs blocked), so all sources run in the **local scanner**
via Playwright on Chris's residential IP. Facebook Marketplace additionally needs a saved **personal-profile** session
(Pages can't use Marketplace) and is the most fragile (bot detection, ToS) → low-frequency, best-effort. The Vercel cron
is reserved for any *future* pure-API source.

## Data model

`db/migrations/001_initial.sql` + `002_reseller.sql`:

- **`listings`** — one row per `(source, listing)`. Core: `source, external_id, title, url, price, previous_price,
  set_name, product_type, image_url, seller, in_stock, first/last_seen_at, last_price_change_at, is_active`. Migration 002
  adds: `category` (`tcg_sealed|merch`), `era` (`score|panini|bandai_super`), `market_value`, `deal_score`, `deal_reason`,
  `city`, `distance_mi`. Unique `(source, external_id)` backs the upsert.
- **`scan_runs`** — one row per scan job (sources, counts, errors, status) for observability.
- **`market_values`** — resale benchmarks: `product_key`, `label`, `source` (`ebay_sold`), `median/low/high_price`,
  `sample_size`, `as_of`; unique `(product_key, source)`.
- **`price_history`** — every observed price point per listing (for price-drop velocity; not yet populated).
- **(planned #15)** `neon_auth.users_sync` — Neon Auth user table for login + per-user watchlists/alert prefs.

## Key design decisions

- **Lazy Neon client** (`src/lib/db.ts`) — a Proxy that defers connection to first query, so `next build` is green with no
  `DATABASE_URL`. Per-statement HTTP round-trips (no pooling to manage); upsert is `SELECT`-then-`INSERT/UPDATE` per row.
- **Scanner writes direct to Neon** (no API hop). The upsert contract is shared JS in `scanner/lib/db.js`.
- **Everything scrapes via a real browser** because all sources 403 plain HTTP → local-only, residential IP.
- **Saved session reuse** for FB (`scanner/.auth/`, gitignored); re-login on expiry. The headed login runs in Chris's
  terminal (a headed window doesn't surface from the agent's shell).
- **Deal = price vs eBay-SOLD median** (the reseller gold standard), layered as a `deal_score` + Deals view rather than a
  hard filter — surface everything, rank the deals. Other facets (cross-source low, TCGPlayer, velocity) are follow-ups.
- **Image durability** — eBay/Craigslist image URLs are stable; **FB CDN URLs expire** → re-hosting tracked as #35.
