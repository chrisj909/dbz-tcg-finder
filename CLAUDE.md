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

**Source split:** eBay (Browse API), Craigslist, Troll&Toad = no browser → run anywhere. Facebook Marketplace, OfferUp = need a logged-in browser → **local scanner only**.

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
5. **Branch + PR for code changes** made by the autonomous loop — never force-push, never push to `main` directly. Humans (Chris) merge.

## Autonomous dev loop (see `automation/dev-loop.md`)

Scheduled `claude` runs several times/day:
1. Read this file + `docs/WORKFLOW.md` + open GitHub issues (`gh issue list`).
2. Pick the **highest-priority open issue** (label `priority:high` first, else lowest number).
3. Create a branch, implement, green-gate, open a PR linking the issue.
4. If a scan or build is failing, **fix the bug first** and file an issue describing it.
5. Log a one-line summary; stop. Don't start work you can't finish in the run.

Use the subagents in `.claude/agents/` for focused work (`source-fixer`, `dashboard-dev`, `qa-verifier`, `backlog-groomer`).

## Human-in-the-loop (credentials Claude cannot self-provision)

| Need | For | Where |
|------|-----|-------|
| Neon `DATABASE_URL` | everything | free project at console.neon.tech → `.env.local` |
| eBay Client ID + Secret | eBay source | developer.ebay.com → `scanner/.env` |
| Neon Auth enabled (Stack keys) | login | Neon console → Auth → `.env.local` |
| FB/OfferUp login (one-time, headed) | browser sources | `node scanner/login.js` |

## Status & memory

- Backlog = **GitHub issues**. Roadmap phases 0–7 are in `docs/WORKFLOW.md` and the plan.
- Cross-session memory lives in Claude's memory dir (user/project/feedback facts) — already seeded.
- Current known-broken: eBay Finding API is dead (rebuild on Browse API — Phase 2).
