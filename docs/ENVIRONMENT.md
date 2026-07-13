# ENVIRONMENT — Setup & Local Dev (Windows 11)

Standing up **dbz-tcg-finder**. Two runnable pieces share one Neon DB: the **web app** (`src/`, Vercel-bound) and the
**local scanner** (`scanner/`, never deployed). For the full dependency inventory see **`docs/DEPENDENCIES.md`**.

> One secret file: **`.env.local`** at the repo root (gitignored). The scanner reads it too via `node --env-file`.
> There is **no `scanner/.env`** and **no eBay key** — eBay is scraped.

## Prerequisites

Node 22 · npm · git · gh (all installed). The scanner also needs Playwright Chromium (one-time, below).

## 1 — Clone & install

```bash
gh repo clone chrisj909/dbz-tcg-finder && cd dbz-tcg-finder
npm install                       # web app
cd scanner && npm install && npx playwright install chromium && cd ..   # scanner + browser
```

## 2 — Neon DATABASE_URL → `.env.local`

1. At **[console.neon.tech](https://console.neon.tech)** open the **`dbz-tcg-finder`** project → **Connection string** →
   copy the **Pooled** URL (`...-pooler...`; `@neondatabase/serverless` expects the pooled host).
2. Create `.env.local` at the repo root:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require
CRON_SECRET=<random>                       # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ALERT_WEBHOOK_URL=                          # optional (alerts, #26)
# Neon Auth (Stack) — fill when enabling login (#15)
NEXT_PUBLIC_STACK_PROJECT_ID=
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=
STACK_SECRET_SERVER_KEY=
```

## 3 — Apply migrations

```bash
node --env-file=.env.local scripts/migrate.mjs     # idempotent; applies db/migrations/*.sql
```

Creates/refreshes `listings`, `scan_runs`, `market_values`, `price_history`.

## 4 — Run the web app

```bash
npm run dev        # http://localhost:3000   (build/lint green-gate: npm run build && npm run lint)
```

`/api/health` → ok; `/api/inventory` → JSON; the dashboard renders (empty-state until a scan runs).

## 5 — Run the scanner

```bash
node --env-file=.env.local scanner/run.js                  # all sources -> listings -> deal-score
node --env-file=.env.local scanner/run.js --source=ebay    # one source
node --env-file=.env.local scanner/market.js               # eBay SOLD -> market_values
```

## 6 — One-time FB / OfferUp login (browser sources)

Facebook Marketplace needs a saved **personal-profile** session (Pages can't use Marketplace). Run this **in your own
terminal** — the headed window doesn't surface from an agent shell:

```bash
node scanner/login.js facebook        # log in manually; session saved to scanner/.auth/ (gitignored)
```

Re-run only when the session expires. FB may occasionally send a login-approval prompt to your phone (its bot detection);
approving once is usually trusted for a while.

## Environment variables — reference

| Variable | Required | Lives in | Purpose |
|----------|----------|----------|---------|
| `DATABASE_URL` | yes | `.env.local` (+ Vercel) | Neon pooled connection — used by web app **and** scanner (via `--env-file`) |
| `CRON_SECRET` | for cron | `.env.local` (+ Vercel) | guards `/api/cron/scan` |
| `ALERT_WEBHOOK_URL` | optional | `.env.local` | Slack/Discord alert webhook (#26) |
| `NEXT_PUBLIC_STACK_*` / `STACK_SECRET_SERVER_KEY` | for login | `.env.local` (+ Vercel) | Neon Auth (Stack) — #15 |
| `ZEPTOMAIL_SMTP_HOST` / `_PORT` / `_USER` / `_PASS`, `MAIL_FROM` | for notifications | `.env.local` (+ Vercel) | Zoho ZeptoMail SMTP — #26/#71 notification digest. `scanner/lib/email.js` skips cleanly if unset. Chosen over a generic provider since Chris already owns `progrowthtech.com` via Zoho; regular Zoho Mail (business inbox) is explicitly not meant for automated/app-triggered sending — Zoho's own docs point to ZeptoMail for that. |

`NEXT_PUBLIC_*` is browser-safe; everything else is server-only. **No eBay or TCGPlayer keys** (those sources scrape).

## Human-in-the-loop (Chris-only)

| Need | For | How |
|------|-----|-----|
| Neon `DATABASE_URL` | everything | console.neon.tech → Connection string → `.env.local` (done) |
| FB / OfferUp login | browser sources | `node scanner/login.js facebook` in your terminal |
| Neon Auth Stack keys | login (#15) | Neon console → Auth → enable → 3 keys |
| Vercel env vars | prod | Vercel → Settings → Env (mirror `.env.local`) — done |
| Enable scan/dev schedules | unattended runs | `schtasks` from `automation/README.md` (installing a standing task is gated to you) |

## Security

- Never commit `.env.local`, `scanner/.env`, or `scanner/.auth/` — all gitignored (`.env*.local`, `.env`,
  `/scanner/.env`, `/scanner/.auth/`, `*.storageState.json`, `/automation/logs/`).
- No connection strings/keys in code, docs, commits, or PRs. `STACK_SECRET_SERVER_KEY`, `DATABASE_URL`, `CRON_SECRET`
  are server-only.
- The old README Neon-host leak was scrubbed. After any suspected exposure: rotate the Neon password, regenerate
  `CRON_SECRET`, roll the Stack server key.
