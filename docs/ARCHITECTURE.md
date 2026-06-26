# Architecture — DBZ TCG Finder

System reference for the multi-user web app that hunts **DBZ sealed product (all eras)** and **DBZ merch deals** across **eBay + Birmingham-AL local marketplaces**, surfacing **everything matching** in an interactive dashboard. Read `CLAUDE.md` for project memory and hard rules; this doc explains *how the pieces fit*.

## Overview

Two runtimes share **one Neon Postgres database**:

1. **Cloud web app** (Vercel) — the dashboard, the read APIs, and a Vercel cron that runs the *API/HTTP* sources. Always-on, public (auth-gated), no browser.
2. **Local scanner** (Chris's Windows 11 PC, Windows Task Scheduler) — a separate Node package that owns the *browser* sources (Facebook Marketplace, OfferUp via Playwright + saved login) and can also run every API/HTTP source. Never deployed; reaches the same Neon DB directly.

A third leg, the **automation loop**, isn't part of the running product — it's scheduled headless `claude` runs that work the GitHub-issue backlog and keep the system healthy (branch + PR, never push to `main`).

Both runtimes write listings into the same `listings` table via the **same upsert contract** (dedupe on `(source, external_id)`); the dashboard reads that one table. The cron route at `src/app/api/cron/scan/route.ts` is the canonical upsert template the scanner mirrors.

```
                              ┌──────────────────────────────────────────────┐
                              │                   SOURCES                      │
                              │  eBay Browse API · Craigslist · Troll&Toad     │  ← API/HTTP (run anywhere)
                              │  Facebook Marketplace · OfferUp                │  ← browser (local only)
                              └───────────────┬───────────────┬──────────────┘
                                              │               │
                  API/HTTP sources           │               │   browser sources
                  (no browser needed)        │               │   (need logged-in browser)
                                              │               │
        ┌─────────────────────────────────┐  │               │  ┌─────────────────────────────────┐
        │  VERCEL (cloud)                  │  │               │  │  LOCAL SCANNER (Chris's PC)       │
        │  Next.js 14 App Router (TS)      │  │               │  │  scanner/  (own package, Node)    │
        │                                  │  │               │  │  Playwright + saved session       │
        │  ┌────────────────────────────┐ │  │               │  │  Windows Task Scheduler (~5×/day) │
        │  │ Dashboard  src/app/page.tsx│ │  │               │  │                                   │
        │  │  (RSC, reads listings)     │ │  │               │  │  run.ts: scrape → upsert →        │
        │  ├────────────────────────────┤ │  │               │  │          record scan_run          │
        │  │ Read APIs  /api/inventory  │ │  │               │  └──────────────┬────────────────────┘
        │  │            /api/health     │ │  │               │                 │
        │  ├────────────────────────────┤ │  │  upsert       │  upsert         │
        │  │ Cron  /api/cron/scan       │─┼──┘  (API/HTTP)    └────────────────┤
        │  │  (Vercel Cron, API sources)│ │                                    │
        │  └────────────────────────────┘ │                                    │
        └───────────────┬─────────────────┘                                    │
                        │ reads + writes                       writes (direct)  │
                        │            @neondatabase/serverless                   │
                        ▼                                                       ▼
                  ┌───────────────────────────────────────────────────────────────┐
                  │  NEON serverless Postgres (free)                               │
                  │   listings · scan_runs   (+ Phase 4 columns, watchlists)       │
                  │   neon_auth.users_sync   (Neon Auth / Stack Auth)              │
                  └───────────────────────────────────────────────────────────────┘
                        ▲
                        │  branch + PR (never main); files issues for bugs
        ┌───────────────┴─────────────────┐
        │  AUTOMATION LOOP                 │
        │  automation/ + .claude/          │   Scheduled headless `claude` runs (Task Scheduler).
        │  scheduled `claude` on backlog   │   Works GitHub issues → green-gate → PR.
        └──────────────────────────────────┘
```

## Repo layout

| Path | Purpose |
|------|---------|
| `src/` | Next.js 14 app (App Router, TS, Tailwind) — deployed to Vercel. Dashboard, read APIs, and cron for API/HTTP sources. |
| `src/app/page.tsx` | Server-rendered dashboard (reads `listings`; will become the fully interactive client dashboard in Phase 5). |
| `src/app/api/inventory/route.ts` | Paginated, filterable read API over `listings`. |
| `src/app/api/health/route.ts` | Health check (DB reachable). |
| `src/app/api/cron/scan/route.ts` | Vercel cron entrypoint — runs API/HTTP scrapers and upserts. **Canonical upsert + scan_run logic.** |
| `src/lib/db.ts` | Neon serverless client (`sql` tag) — single DB entrypoint for the web app. |
| `src/lib/types.ts` | Shared TS types (`Listing`, `ScrapedListing`, `ScanRun`, `Source`, `ProductType`). |
| `src/lib/scrapers/` | Web-app-side scraper stubs invoked by the cron (`index.ts` fans out via `Promise.allSettled`). |
| `src/components/` | Dashboard UI (`InventoryCard`, `StatsBar`). |
| `scanner/` | **Local** Node package (own `package.json`, never deployed). Owns browser sources; can run all sources. |
| `scanner/sources/` | One module per source (`ebay`, `craigslist`, `offerup`, `facebook`, `trollandtoad`). |
| `scanner/login.ts` | One-time **headed** login → saves Playwright `storageState` for FB/OfferUp. |
| `scanner/run.ts` | Orchestrator: scrape → upsert to Neon → record `scan_run`. |
| `scanner/lib/db.ts` | Direct Neon connection (reuses the same schema/upsert contract). |
| `db/migrations/*.sql` | SQL migrations for Neon Postgres (initial schema lives at `supabase/migrations/001_initial.sql` pending the Phase 7 move out of `supabase/`). |
| `automation/` | Self-maintenance loop: `dev-loop.md` (the prompt), `run-dev-loop.ps1`, `run-scan.ps1`. |
| `docs/` | `ARCHITECTURE.md` (this), `ENVIRONMENT.md`, `WORKFLOW.md`, `sources.md`. |
| `.claude/` | Project memory + autonomy config: `agents/` (subagents), `settings.json` (permission allowlist). |
| `CLAUDE.md` | Claude Code project memory — read first on every run. |

## Data flow: source → dashboard

A listing's journey from a marketplace to a card on the dashboard:

1. **Source** — a marketplace (eBay, Craigslist, FB Marketplace, etc.) holds matching listings.
2. **Scraper** — a per-source module fetches and normalizes results into `ScrapedListing` objects (`src/lib/types.ts`): `source`, `external_id`, `title`, `url`, `price`, `in_stock`, `product_type`, etc. API/HTTP sources are plain `fetch`; browser sources drive Playwright with a saved session. The orchestrator (`src/lib/scrapers/index.ts` web-side, `scanner/run.ts` local) runs sources concurrently with `Promise.allSettled` so one failure never aborts the rest.
3. **scan_run open** — before scraping, a `scan_runs` row is inserted with `status='running'` to track the job.
4. **Upsert** — for each scraped listing, dedupe on `(source, external_id)` (see `src/app/api/cron/scan/route.ts`):
   - **New** (`SELECT` returns nothing) → `INSERT` with `first_seen_at = last_seen_at = NOW()`, `is_active = true`; increment `new_listings_found`.
   - **Existing, price changed** → `UPDATE` setting `previous_price = old`, `price = new`, `last_price_change_at = NOW()`, refresh `last_seen_at`; increment `price_changes_found`.
   - **Existing, no price change** → `UPDATE` refreshing `last_seen_at` / stock fields only.
   - A DB-level `unique (source, external_id)` constraint backs the dedupe; the `updated_at` trigger stamps every row.
5. **scan_run close** — the row is finalized with `status='completed'` (or `'failed'`), `sources_scanned`, the `new_listings_found` / `price_changes_found` counts, and any `errors[]`. An optional `ALERT_WEBHOOK_URL` fires when there's something new.
6. **Dashboard read** — `src/app/page.tsx` (and `/api/inventory`) query `listings WHERE is_active = true`, newest first, and render cards + stats. The web app's `revalidate = 300` (RSC) plus the inventory API surface near-live data without a separate cache layer.

The scanner performs steps 2–5 against the same tables with the same contract — the only difference is *which sources run* and *where the code runs*.

## Source split — where each source runs, and why

| Source | Category | Method | Vercel cron | Local scanner | Why |
|--------|----------|--------|:-----------:|:-------------:|-----|
| eBay | national | Browse API (OAuth client-credentials app token) | ✅ | ✅ | Pure HTTPS; legacy Finding API was decommissioned Feb 5 2025, so the source must use the RESTful Browse API. |
| Craigslist (Birmingham) | local | HTTP (server-rendered HTML) | ✅ | ✅ | Plain HTML fetch; no JS render or login needed. |
| Troll&Toad | national | HTTP (HTML scrape) | ✅ | ✅ | Static product cards; no auth. |
| Facebook Marketplace | local | Playwright + **saved logged-in session** | ❌ | ✅ | Requires a real authenticated browser and per-location browsing; highest detection risk → personal-use, low frequency, **best-effort**. |
| OfferUp | local | Playwright (location = Birmingham) | ❌ | ✅ | JS-heavy, geo-scoped, needs a browser; impractical and risky on serverless. |

**The rule:** if a source needs nothing but HTTPS, it can run in either runtime (Vercel cron *and* the local scanner). If it needs a logged-in browser (Playwright + saved `storageState`), it is **local-only** — Vercel's serverless functions are short-lived, stateless, and can't safely hold Chris's marketplace login. Keeping browser sources on Chris's PC also keeps the saved session and any ToS-sensitive crawling off shared infrastructure.

## Data model

Current schema (`supabase/migrations/001_initial.sql`):

**`listings`** — one row per (source, listing); the unit the dashboard renders.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `source` | text | `tcgplayer` \| `ebay` \| `trollandtoad` (extended in Phase 4) |
| `external_id` | text | source's own listing ID |
| `title`, `url` | text | `url` not null |
| `set_name`, `product_type` | text | `product_type`: `booster_box` \| `booster_pack` \| `case` \| `bundle` \| `other` |
| `price`, `previous_price` | numeric(10,2) | `previous_price` set on a price change |
| `currency` | text | default `USD` |
| `condition`, `seller`, `image_url`, `quantity_available` | — | optional metadata |
| `in_stock` | boolean | default true |
| `first_seen_at`, `last_seen_at`, `last_price_change_at` | timestamptz | freshness + "new since" |
| `is_active` | boolean | dashboard filters on this |
| `created_at`, `updated_at` | timestamptz | `updated_at` via trigger |
| — | constraint | **`unique (source, external_id)`** backs upsert dedupe |

Indexes on `source`, `product_type`, `in_stock`, `first_seen_at desc`, `is_active`, partial `price`.

**`scan_runs`** — one row per scan job (cron or scanner), for health/observability.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `started_at`, `completed_at` | timestamptz | |
| `sources_scanned` | text[] | which sources ran |
| `new_listings_found`, `price_changes_found` | integer | outcome counts |
| `errors` | text[] | per-source / per-row failures |
| `status` | text | `running` \| `completed` \| `failed` |

### Planned additions (per the plan)

- **Phase 4 — `listings` columns:** extend `source` to include `facebook` \| `craigslist` \| `offerup`; add `category` (`tcg_sealed` \| `merch`), `era`/`game` (era/game taxonomy), location fields (`city`, `distance_mi`, `is_local`), `market_value` (rolling reference price), and `deal_score` (price vs. rolling median → deal badges). Delivered as new migrations under `db/migrations/`.
- **Phase 6 — auth + per-user data:** Neon Auth (Stack Auth) syncs users to `neon_auth.users_sync`; per-user **watchlists / saved searches** key off that table to gate the `(app)` dashboard and personalize "new since last visit."

## Key design decisions & trade-offs

- **Neon serverless driver (`@neondatabase/serverless`).** HTTP-based Postgres over a single `sql` tagged-template client (`src/lib/db.ts`) — works inside Vercel's short-lived functions with no connection-pool warm-up or socket lifecycle to manage. *Trade-off:* per-statement HTTP round-trips, so the upsert does a `SELECT`-then-`INSERT/UPDATE` per listing rather than one bulk statement — fine at current volumes, a candidate for batching later.
- **Scanner writes direct to Neon (no API hop).** The local scanner connects to the same DB with the same upsert contract instead of POSTing through a Vercel endpoint. Fewer moving parts, no auth surface to expose, and the cron route stays the single source of truth for upsert logic that the scanner mirrors. *Trade-off:* the contract lives in two places — keep them in lockstep (the cron route is canonical).
- **Playwright session reuse (saved `storageState`).** A one-time **headed** `scanner/login.ts` captures Chris's FB/OfferUp session; subsequent runs are headless and reuse it. Avoids automating login (fragile, high-risk) on every run. *Trade-off:* sessions expire and must be re-logged-in periodically; the saved state is a secret (`scanner/.auth/`, `*.storageState.json` are gitignored — never commit).
- **Browser sources local-only.** Keeps a real logged-in browser, Chris's credentials, and the riskiest crawling off Vercel and out of shared infra. *Trade-off:* local-only sources don't update when Chris's PC is off — acceptable for the best-effort, personal-use local marketplaces.
- **Surface everything matching (not just "deals").** The dashboard shows every matching listing, with deal scoring layered on as badges (Phase 4/5) rather than as a hard filter. Aligns with the north star — *never miss a sealed box* — and degrades gracefully before `market_value`/`deal_score` exist. *Trade-off:* more rows to scan, store, and render; mitigated by `is_active` filtering, indexes, and pagination.
- **Cron + scanner split over one runtime.** API/HTTP sources run on Vercel cron *and* locally so coverage continues even when the PC is off; browser sources stay local. *Trade-off:* a source that runs in both places can double-scan — harmless because the upsert is idempotent on `(source, external_id)`.
