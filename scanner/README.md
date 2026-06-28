# scanner/

Local scanner for **dbz-tcg-finder**. Runs marketplace sources on Chris's PC and
writes listings to the same Neon DB the web app reads. **Not deployed** (Vercel
runs only the API/HTTP sources via cron; browser sources live here).

## Sources

| Source | Method | Login? | Status |
|--------|--------|--------|--------|
| `craigslist` | Playwright (Birmingham `bham` subdomain) | no | ✅ working |
| `ebay` | Browse API (OAuth app token) | no (API key) | planned (#4) |
| `offerup` | Playwright | saved session | planned (#7) |
| `facebook` | Playwright | saved session | planned (#9) |

> Craigslist blocks plain HTTP (403). A real browser on a residential IP works,
> which is why it runs here and not in the Vercel cron.

## Setup

```bash
cd scanner
npm install
npx playwright install chromium     # one-time browser download
```

The scanner reads `DATABASE_URL` from the repo-root `.env.local` (no separate
secret needed). eBay keys, when added, can go in the same file.

## Run

From the repo root:

```bash
node --env-file=.env.local scanner/run.js                  # all sources
node --env-file=.env.local scanner/run.js --source=craigslist
node --env-file=.env.local scanner/run.js --source=craigslist --headed   # watch it
```

Each run records a `scan_runs` row and upserts into `listings` (dedupe by
`source` + `external_id`, with price-change tracking) — identical to the web
cron in `src/app/api/cron/scan/route.ts`.

Scheduled several times a day via `automation/run-scan.ps1` (Windows Task Scheduler).
