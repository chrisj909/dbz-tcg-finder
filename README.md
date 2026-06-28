# dbz-tcg-finder

A multi-user web app that continually finds **Dragon Ball Z sealed product** (booster boxes, packs, cases — all eras) and **DBZ merch deals**, across **eBay** and **Birmingham, AL local marketplaces**, and surfaces everything matching in a **fully interactive dashboard**.

## Overview

- **Hunts:** any DBZ sealed TCG (Score 2000–06, Panini 2014–15, Bandai Super/Fusion World 2017–present) + a DBZ merch side-quest (figures, statues, plush).
- **Sources:** eBay (Browse API), Craigslist, OfferUp, Facebook Marketplace, Troll & Toad — plus a Birmingham local-shop watch list (`docs/local-shops.md`).
- **Surfaces everything matching;** filtering happens in the dashboard. Login for the owner + friends (Neon Auth).
- **Self-maintaining:** scheduled local `claude` runs work a GitHub-issue backlog and fix bugs several times a day (`automation/`).

> This app only *surfaces* listings and links out. It never bids, buys, sends money, or messages sellers.

## Architecture

Two runtimes (full detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)):

- **`src/`** — Next.js 14 web app (dashboard + APIs) → deployed to **Vercel**. Runs the API/HTTP sources via cron.
- **`scanner/`** — a **local** Node package on the owner's PC. Owns the browser sources (Facebook Marketplace, OfferUp via Playwright + saved session). Writes to the same Neon DB. Not deployed.

**Tech:** Next.js 14 (App Router, TS, Tailwind) · Neon serverless Postgres · Neon Auth (Stack) · Vercel.

## Getting started

Full step-by-step (Windows-oriented) lives in **[docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)**. Short version:

```bash
git clone https://github.com/chrisj909/dbz-tcg-finder.git
cd dbz-tcg-finder
npm install
cp .env.example .env.local          # then set DATABASE_URL (see below)
npm run dev                          # http://localhost:3000
```

**Database:** create a free project at [console.neon.tech](https://console.neon.tech), copy the pooled **Connection string**, set it as `DATABASE_URL` in `.env.local`, then run `db/migrations/001_initial.sql` in the Neon **SQL Editor**.

## Environment variables

| Variable | Where | Required | Description |
|----------|-------|----------|-------------|
| `DATABASE_URL` | `.env.local` | yes | Neon Postgres connection string |
| `CRON_SECRET` | `.env.local` / Vercel | for cron | Secret guarding `/api/cron/scan` |
| `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` | `scanner/.env` | for eBay | eBay **Browse API** OAuth keys (the legacy Finding API was decommissioned 2025-02-05) |
| `NEXT_PUBLIC_STACK_PROJECT_ID` / `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` / `STACK_SECRET_SERVER_KEY` | `.env.local` | for login | Neon Auth (Stack) keys |
| `ALERT_WEBHOOK_URL` | `.env.local` | optional | Slack/Discord webhook |

## API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/inventory` | GET | Filterable/paginated listing query |
| `/api/cron/scan` | GET | Trigger a scan of API/HTTP sources (cron) |

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design & data flow
- [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) — setup & environment variables
- [docs/WORKFLOW.md](docs/WORKFLOW.md) — the autonomous loop, backlog, roadmap
- [docs/sources.md](docs/sources.md) — per-source method, auth, compliance
- [docs/local-shops.md](docs/local-shops.md) — Birmingham local sourcing guide
- [CLAUDE.md](CLAUDE.md) — project memory & hard rules for Claude Code
