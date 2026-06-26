# dbz-tcg-finder

Dragon Ball Z TCG sealed product inventory tracker and alert system.

## Overview

A Next.js 14 web app that monitors online marketplaces for Dragon Ball Z TCG sealed products (booster boxes, booster packs, cases, and bundles). Runs scheduled scans every 30 minutes and alerts when new inventory appears, prices drop, or products restock.

## Features

- 🔍 **Multi-source scraping** — TCGPlayer, eBay, Troll and Toad
- 📊 **Inventory dashboard** — filterable grid with live stock status
- ⏱️ **30-minute cron jobs** — powered by Vercel Cron
- 🔔 **Webhook alerts** — new listings and price drops
- 🗄️ **Supabase backend** — PostgreSQL with full listing history

## Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/chrisj909/dbz-tcg-finder.git
cd dbz-tcg-finder
npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/migrations/001_initial.sql` in your Supabase SQL editor
3. Copy your project URL and anon key

### 3. Environment Variables

```bash
cp .env.example .env.local
# Fill in your values
```

### 4. Run Locally

```bash
npm run dev
```

### 5. Deploy to Vercel

1. Push to GitHub
2. Import the repo in Vercel
3. Add environment variables in the Vercel dashboard
4. Vercel Cron will automatically run `/api/cron/scan` every 30 minutes

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/inventory` | GET | Paginated listing query |
| `/api/cron/scan` | GET | Trigger scrape run (cron) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Your Supabase anon key |
| `CRON_SECRET` | ✅ | Random secret to secure cron endpoint |
| `ALERT_WEBHOOK_URL` | Optional | Slack/Discord webhook for alerts |
| `EBAY_APP_ID` | Optional | eBay Finding API App ID |

## Sources

See [docs/sources.md](docs/sources.md) for details on each data source, API registration, and compliance notes.
