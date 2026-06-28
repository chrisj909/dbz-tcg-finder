# ENVIRONMENT.md — Setup & Local Dev (Windows 11)

How Chris stands up **dbz-tcg-finder** on his Windows 11 PC. Two runnable pieces: the **web app** (`src/`, Vercel-bound) and the **local scanner** (`scanner/`, never deployed). They share one Neon database but read **separate env files**.

> Secrets live in `.env.local` (web) and `scanner/.env` (scanner) — both gitignored. Never commit either. See [Security](#security).

## Prerequisites

Already installed on Chris's machine; verify in PowerShell:

| Tool | Min version | Check |
|------|-------------|-------|
| Node | 22.x | `node -v` |
| npm | 10.x | `npm -v` |
| git | 2.x | `git --version` |
| gh (GitHub CLI) | 2.x | `gh --version` |

The scanner's browser sources also need a Playwright Chromium, installed once in Phase 3 (`npx playwright install chromium` from `scanner/`). Not needed for Phase 0.

## Step 1 — Clone & install (web app)

```bash
gh repo clone chrisj909/dbz-tcg-finder
cd dbz-tcg-finder
npm install
```

## Step 2 — Create a free Neon project & get DATABASE_URL

1. Sign in at **[console.neon.tech](https://console.neon.tech)** (free tier is enough).
2. **Create project** → pick a name (e.g. `dbz-tcg-finder`) and the **`us-east`** region (closest to AL).
3. On the project dashboard, open **Connection string** and copy the **Pooled connection** URL. It looks like:
   `postgresql://<user>:<password>@<host>-pooler.<region>.aws.neon.tech/neondb?sslmode=require`
4. This whole string is your `DATABASE_URL`. The same value goes in **both** env files and (later, Phase 7) Vercel.

> Use the **pooled** (`-pooler`) host — `@neondatabase/serverless` (see `src/lib/db.ts`) expects it for serverless connections.

## Step 3 — Create `.env.local` (web app)

Copy the template and fill it in:

```bash
cp .env.example .env.local
```

`.env.local` keys (values shown as placeholders — never paste real secrets into git-tracked files):

```dotenv
# Neon — pooled connection string from console.neon.tech
DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require

# Cron security — random string; must match what Vercel sends in the Authorization header
CRON_SECRET=

# Optional — Slack/Discord webhook for new-listing / price-drop alerts
ALERT_WEBHOOK_URL=

# Neon Auth (Stack Auth) — from Neon console → Auth (Phase 6)
NEXT_PUBLIC_STACK_PROJECT_ID=
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=
STACK_SECRET_SERVER_KEY=
```

Generate a `CRON_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> eBay keys do **not** belong in `.env.local`. The eBay source runs in the scanner, so its keys live in `scanner/.env` (Step 6 / Phase 2). The web cron route only runs no-key HTTP sources.

## Step 4 — Run migration 001

The schema (`listings` + `scan_runs`) is in **`supabase/migrations/001_initial.sql`** (it moves to `db/migrations/` in Phase 1 — adjust the path once that lands). The SQL is plain PostgreSQL and runs unmodified on Neon.

Easiest path — the Neon **SQL Editor**:

1. Neon console → your project → **SQL Editor**.
2. Paste the full contents of `001_initial.sql` and **Run**.
3. Confirm: `select count(*) from listings;` returns `0` (table exists, empty).

Alternatively, pipe it via `psql` if installed:

```bash
psql "$DATABASE_URL" -f supabase/migrations/001_initial.sql
```

## Step 5 — Run the web app

```bash
npm run dev        # http://localhost:3000
```

Verify against the real Neon DB:

| Check | Expect |
|-------|--------|
| `http://localhost:3000` | Dashboard loads, empty-state (no listings yet) |
| `http://localhost:3000/api/health` | `{ ok: true }`-style JSON, DB reachable |
| `http://localhost:3000/api/inventory` | Empty paginated result, no error |

Green-gate before any commit (hard rule):

```bash
npm run build
npm run lint
```

## Step 6 — Set up & run the scanner

The scanner is its **own Node package** under `scanner/` (built out in Phases 2–3; not deployed). It writes to the **same** Neon DB.

```bash
cd scanner
npm install
cp .env.example .env      # if present; otherwise create scanner/.env
```

`scanner/.env` keys:

```dotenv
# Same Neon pooled connection as the web app
DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require

# eBay Browse API (OAuth client-credentials) — Finding API is DEAD (decommissioned 2025-02-05)
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=

# Optional — same webhook target as the web app
ALERT_WEBHOOK_URL=
```

Run scans:

```bash
node scanner/run.js                 # all sources
node scanner/run.js --source=ebay   # one source
```

> The legacy `EBAY_APP_ID` / Finding API in the old README and `.env.example` is **defunct**. The eBay source must use the **Browse API** (`/buy/browse/v1/item_summary/search`) with an OAuth app token minted from `EBAY_CLIENT_ID` + `EBAY_CLIENT_SECRET`. See `docs/sources.md` and Phase 2.

## Step 7 — One-time browser login (FB Marketplace / OfferUp)

Facebook Marketplace and OfferUp need a **logged-in browser** and run **local only**. A one-time headed login saves a reusable session:

```bash
cd scanner
node scanner/login.js
```

- A real Chromium window opens. Log into Facebook and OfferUp **manually** (your own accounts).
- The session (`storageState`) is written to **`scanner/.auth/`**, which is **gitignored**.
- After this, `node scanner/run.js` reuses the saved session headlessly. Re-run `login.js` only when a session expires.

> Personal-use only, conservative pacing — FB Marketplace is the most likely source to break (CLAUDE.md hard rule 3). Never auto-message sellers; the scanner only drafts inquiries for Chris to send.

## Environment variables — full reference

| Variable | Required | Lives in | Purpose |
|----------|----------|----------|---------|
| `DATABASE_URL` | Yes | `.env.local` **and** `scanner/.env` | Neon pooled connection string |
| `CRON_SECRET` | Yes (web) | `.env.local` (+ Vercel, Phase 7) | Bearer token guarding `/api/cron/scan` |
| `ALERT_WEBHOOK_URL` | Optional | `.env.local` and/or `scanner/.env` | Slack/Discord alert webhook |
| `EBAY_CLIENT_ID` | For eBay | `scanner/.env` | eBay **Browse API** OAuth client id |
| `EBAY_CLIENT_SECRET` | For eBay | `scanner/.env` | eBay **Browse API** OAuth client secret |
| `NEXT_PUBLIC_STACK_PROJECT_ID` | For auth | `.env.local` (+ Vercel) | Neon Auth (Stack) project id — public |
| `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` | For auth | `.env.local` (+ Vercel) | Neon Auth publishable client key — public |
| `STACK_SECRET_SERVER_KEY` | For auth | `.env.local` (+ Vercel) | Neon Auth server secret — **never expose** |

`NEXT_PUBLIC_*` keys are intentionally shipped to the browser (safe to expose). `STACK_SECRET_SERVER_KEY`, `DATABASE_URL`, `CRON_SECRET`, and the eBay secret are server-only — keep them out of client code and git.

> Legacy/removed: `EBAY_APP_ID`, `TCGPLAYER_PUBLIC_KEY`, `TCGPLAYER_PRIVATE_KEY`. eBay moved to Browse API; TCGPlayer is not a current source. Strip these from `.env.example` during Phase 7 cleanup.

## Human-in-the-loop credentials

Things Claude **cannot** self-provision — Chris fetches these once and pastes them in:

| Credential | Needed for | Where to get it | Goes in |
|------------|------------|-----------------|---------|
| Neon `DATABASE_URL` | Everything (Phase 0) | [console.neon.tech](https://console.neon.tech) → project → Connection string (pooled) | `.env.local` + `scanner/.env` |
| `EBAY_CLIENT_ID` + `EBAY_CLIENT_SECRET` | eBay source (Phase 2) | [developer.ebay.com](https://developer.ebay.com) → create a **Production** app → key set | `scanner/.env` |
| Neon Auth Stack keys | Login (Phase 6) | Neon console → **Auth** → enable → copy 3 Stack keys | `.env.local` + Vercel |
| FB / OfferUp login | Browser sources (Phase 3) | `node scanner/login.js`, log in manually | `scanner/.auth/` (auto-saved) |
| Vercel env vars | Deploy (Phase 7) | Vercel dashboard → Settings → Environment Variables | Vercel (mirror `.env.local`) |

## Security

- **Never commit** `.env`, `.env.local`, `scanner/.env`, or `scanner/.auth/`. All are already in `.gitignore` (`.env*.local`, `.env`, `/scanner/.env`, `/scanner/.auth/`, `*.storageState.json`) — keep it that way.
- Never paste a connection string or key into code, docs, commit messages, or PR descriptions.
- `NEXT_PUBLIC_*` is the **only** prefix safe for the browser. Everything else is server-only.
- **Known leak — flag for Phase 7:** `README.md` (line ~27) hard-codes a real Neon host (`ep-little-dew-ahaozzyc-pooler...`). Scrub it to a placeholder during Phase 7 secrets hygiene and rotate the Neon password if that project is real.
- After any suspected exposure: rotate the Neon DB password (Neon console → Roles), regenerate `CRON_SECRET`, and roll the Stack server key.
