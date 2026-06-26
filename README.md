# dbz-tcg-finder

Dragon Ball Z TCG sealed product inventory tracker and alert system.

## Overview

A Next.js 14 web app that monitors online marketplaces for Dragon Ball Z TCG sealed products (booster boxes, booster packs, cases, and bundles). Runs scheduled scans every 30 minutes and alerts when new inventory appears, prices drop, or products restock.

## Features

- ð **Multi-source scraping** â TCGPlayer, eBay, Troll and Toad
- ð **Inventory dashboard** â filterable grid with live stock status
- â±ï¸ **30-minute cron jobs** â powered by Vercel Cron
- ð **Webhook alerts** â new listings and price drops
- ðï¸ **Neon database** â serverless PostgreSQL with full listing history

## Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Neon (serverless PostgreSQL)
- **Deployment**: Vercel

## Getting Started

```
DATABASE_URL=postgresql://[user]:[password]@ep-little-dew-ahaozzyc-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 1. Clone & Install

```bash
git clone https://github.com/chrisj909/dbz-tcg-finder.git
cd dbz-tcg-finder
npm install
```

### 2. Set Up Neon

1. Go to [console.neon.tech](https://console.neon.tech) and open your project
2. Click **Connection string** on the dashboard and copy the pooler URL
3. Run `supabase/migrations/001_initial.sql` in the Neon **SQL Editor** (the SQL is standard PostgreSQL and works without modification)

### 3. Environment Variables

```bash
cp .env.example .env.local
# Set DATABASE_URL to your Neon connection string
```

### 4. Run Locally

```bash
npm run dev
```

### 5. Deploy to Vercel

1. Push to GitHub
2. Import the repo in Vercel
3. Add `DATABASE_URL` and `CRON_SECRET` in the Vercel dashboard â Settings â Environment Variables
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
| `DATABASE_URL` | â | Neon PostgreSQL connection string |
| `CRON_SECRET` | â | Random secret to secure cron endpoint |
| `ALERT_WEBHOOK_URL` | Optional | Slack/Discord webhook for alerts |
| `EBAY_APP_ID` | Optional | eBay Finding API App ID |
| `TCGPLAYER_PUBLIC_KEY` | Optional | TCGPlayer API public key |
| `TCGPLAYER_PRIVATE_KEY` | Optional | TCGPlayer API private key |

## Sources

See [docs/sources.md](docs/sources.md) for details on each data source, API registration, and compliance notes.
