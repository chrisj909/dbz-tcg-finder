# CLAUDE.md — DBZ TCG Finder

Project memory for Claude Code. Read this first on every run.

## What this is

A multi-user web app that continually hunts **Dragon Ball Z sealed product (all eras)** and **DBZ merch deals**, across **eBay + Birmingham-AL local marketplaces**, and surfaces **everything matching** in a **fully interactive dashboard**. Owner: Chris (Birmingham, AL). Login for Chris + friends.

**North star:** never miss a sealed DBZ box or a good merch deal in reach of Birmingham — and keep the system healthy on its own.

## Architecture (see `docs/ARCHITECTURE.md`)

- **`src/`** — Next.js 14 (App Router, TS, Tailwind) → deployed to **Vercel**. The dashboard + APIs + cron for *API/HTTP* sources.
- **`scanner/`** — a **local Node package** that runs on Chris's Windows PC on a schedule. Owns the **browser sources** (Facebook Marketplace, OfferUp via Playwright + saved session) and can also run the API/HTTP sources. Writes to the same Neon DB. **Never deployed.**
- **`db/migrations/`** — SQL migrations (Neon Postgres).
- **`automation/`** — the self-maintenance loop (scheduled `claude` runs) + scan scheduler.
- **Database:** Neon serverless Postgres (free). **Auth:** Neon Auth (Stack Auth) → `neon_auth.users_sync`.

**Source split:** all marketplaces (eBay, Craigslist, Mercari, …) currently **scrape via a real browser** (they 403 plain HTTP), so they run in the **local scanner** on a residential IP. FB Marketplace + OfferUp additionally need a saved login. The Vercel cron is for any *future* API/HTTP source only (today it runs dead legacy scrapers — see #30).

## Commands

```bash
npm run dev            # web app at http://localhost:3000
npm run build          # production build (CI/green-gate)
npm run lint           # eslint
node scanner/run.js --source=ebay     # run one source (after scanner build)
node scanner/run.js                    # run all sources
```

## Hard rules (NEVER violate)

1. **Never auto-purchase, place bids/offers, send money, or message sellers.** At most *draft* an inquiry and leave it for Chris to send.
2. **Never commit secrets.** `.env*`, `scanner/.env`, and saved browser sessions (`scanner/.auth/`, `*.storageState.json`) are gitignored — keep it that way. Don't paste connection strings or keys into code, docs, or commit messages.
3. **Respect source ToS & rate limits.** Polite crawl delays; conservative frequency on Facebook Marketplace (highest detection risk — treat as best-effort).
4. **Green-gate every change.** `npm run build` + `npm run lint` must pass before committing.
5. **Branch + PR + self-merge.** The loop works on a branch, green-gates, opens a PR, and — once *its own* tests pass — merges via `gh pr merge --squash` (Chris authorized self-merge). Never force-push; never push to `main` directly.
6. **Flag human-only work plainly.** If a task needs a login, paid key, payment, or account toggle, comment + label `blocked:human`, skip it, move on. Never enter credentials or pay.

## Autonomous dev loop (see `automation/dev-loop.md`)

Scheduled `claude` runs several times/day execute `automation/dev-loop.md`:
ground (incl. memory) → health-check → pick top issue → human-only check → branch →
implement (using `.claude/agents/`) → **test/green-gate** → **self-merge** → **update memory + docs** → end.

**Runtime split:** a **cloud Routine** runs the dev/backlog loop; a **local Windows cron** (`automation/run-scan.ps1`) runs the scanners. A cloud run can't drive the local browser, so it can't verify scrapers — it labels such PRs `needs:local-verify` and leaves them for a local run rather than merging.

Subagents: `source-fixer`, `dashboard-dev`, `qa-verifier`, `backlog-groomer`.

## Human-in-the-loop (credentials Claude cannot self-provision)

| Need | For | Where |
|------|-----|-------|
| Neon `DATABASE_URL` | everything | free project at console.neon.tech → `.env.local` |
| Discord/Slack webhook URL | alert channel | paste into app settings (when alerts ship) |
| Neon Auth enabled (Stack keys) | login | Neon console → Auth → `.env.local` |
| FB/OfferUp login (one-time, headed) | browser sources | `node scanner/login.js` |

## Status & memory

- Backlog = **GitHub issues**. Roadmap phases 0–7 are in `docs/WORKFLOW.md` and the plan.
- Cross-session memory lives in Claude's memory dir (user/project/feedback facts) — already seeded.
- Current state: **live** at `dbz-tcg-finder.vercel.app`. eBay + Craigslist sources work (sealed-focused), populating Neon via the local scanner. Building toward a **reseller deal-finder**: eBay-SOLD market value (#24) → deal-score engine (#25) → multi-channel alerts (#26).
