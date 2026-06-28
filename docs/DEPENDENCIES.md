# Dependencies

Everything the project needs to build, run, scan, and deploy. Two npm packages
(`/` for the web app, `/scanner` for the local scanner) plus external accounts.

## Tooling (developer machine)

| Tool | Version | For |
|------|---------|-----|
| **Node.js** | 22.x | app + scanner (uses `node --env-file`) |
| **npm** | 11.x | package management |
| **git** + **gh** CLI | recent | repo + the self-merging dev loop |
| **claude** CLI | recent | the scheduled dev-loop Routine |
| Playwright **Chromium** | via `npx playwright install chromium` | browser sources (one-time download) |

> No Docker. No eBay API key (eBay is scraped). No paid services — all free tiers.

## Web app — `package.json` (deployed to Vercel)

- **Runtime:** `next@14.2.5`, `react`/`react-dom@18`, `@neondatabase/serverless` (Neon HTTP driver).
- **Dev:** `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `eslint`, `eslint-config-next`, `@types/*`.
- Config that must exist: `next.config.mjs` (NOT `.ts` on Next 14), `postcss.config.mjs`, `.eslintrc.json`, `tsconfig.json` with `"target": "ES2017"`.

## Scanner — `scanner/package.json` (local only, NOT deployed)

- `playwright` (drives headless Chromium for eBay / Craigslist / Facebook / OfferUp), `@neondatabase/serverless`.
- Install: `cd scanner && npm install && npx playwright install chromium`.

## External services & accounts (human-provisioned)

| Service | What | Where it's configured |
|---------|------|-----------------------|
| **Neon** (Postgres) | `DATABASE_URL` | `.env.local` (local) + Vercel env vars (prod). Project `dev-dbz-tcg-finder`. |
| **Vercel** | hosting + cron | team `pro-growth-tech`, project `dbz-tcg-finder` |
| **Neon Auth (Stack)** | multi-user login (pending #6) | Neon console → Auth → Stack keys in env |
| **Facebook / OfferUp** | logged-in session for those sources | one-time `node scanner/login.js <site>` in your **own terminal** (personal FB profile) → `scanner/.auth/` (gitignored) |
| **Discord/Slack webhook** | alert channel (future #26) | app settings |

## Database

Neon serverless Postgres. Migrations in `db/migrations/` applied via
`node --env-file=.env.local scripts/migrate.mjs` (idempotent). Current: `001_initial`
(`listings`, `scan_runs`), `002_reseller` (`market_values`, `price_history` + deal columns).

## Key constraints (why these choices)

- Marketplaces **403 plain HTTP** → all sources run in the **local scanner** (Playwright, residential IP); the Vercel cron is for future API/HTTP sources only.
- Neon returns `numeric` as **strings** → coerce with `Number()`.
- A headed Playwright window **doesn't surface from the agent's shell** → `login.js` is run by the human.
