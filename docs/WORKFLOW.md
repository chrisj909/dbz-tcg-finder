# WORKFLOW — how DBZ TCG Finder builds and maintains itself

This is the operating manual for the **autonomous, continually-improving** loop. Two scheduled
loops drive the project: a **dev loop** (Claude works a GitHub-issue backlog 2–3×/day) and a
**scan loop** (sources run ~5×/day, locally and on Vercel). Both are kept honest by the hard
rules in `CLAUDE.md` — read those first.

## Roadmap (Phases 0–7)

Each phase is a set of GitHub issues the dev loop works down. Status reflects current reality.

- [ ] **Phase 0 — Get it running locally** *(human-in-loop: Chris creates the free Neon project)*
  Create Neon project + paste `DATABASE_URL`; run migration `001` (`listings`/`scan_runs`). Set
  `.env.local`; `npm run dev` → verify dashboard empty-state, `/api/health`, `/api/inventory`
  against the real DB.
- [~] **Phase 1 — Agentic infrastructure** *(in progress)*
  `CLAUDE.md`, `.claude/agents/` (`source-fixer`, `dashboard-dev`, `qa-verifier`,
  `backlog-groomer`), `.claude/settings.json` permission allowlist; `docs/{ARCHITECTURE,ENVIRONMENT,WORKFLOW,sources}.md`;
  `automation/` scripts + `dev-loop.md`; seed the GitHub issue backlog; register Windows Task
  Scheduler jobs (scans ~5×/day, dev loop ~2–3×/day).
- [ ] **Phase 2 — eBay rebuild (Browse API)** *(human-in-loop: eBay developer keys)*
  `scanner/sources/ebay.ts`: OAuth client-credentials token (cached) → `item_summary/search`;
  queries for all DBZ eras + merch; map to `listings`. (Legacy Finding API is dead — Browse only.)
- [ ] **Phase 3 — Birmingham local sources**
  `craigslist.ts` (HTTP, easiest), `offerup.ts` (Playwright, location=Birmingham),
  `facebook.ts` (Playwright + saved session, conservative pacing — fragile/best-effort), plus a
  researched local card/game shop watch + call list.
- [ ] **Phase 4 — Data model upgrades** (new migrations)
  Extend `Source` (`facebook|craigslist|offerup`), add `category` (`tcg_sealed|merch`),
  `era`/`game`, location (`city`,`distance_mi`,`is_local`), `market_value`, `deal_score`.
- [ ] **Phase 5 — Fully interactive dashboard**
  Client-side search + multi-facet filters (source, era, type, category, local/national, price) +
  sort + per-user watchlist/saved searches + detail view + "new since last visit" + deal badges
  (price vs rolling median).
- [ ] **Phase 6 — Auth (Neon Auth)** *(human-in-loop: enable in Neon console)*
  Enable Neon Auth → Stack keys; gate `(app)`; per-user watchlists keyed to `neon_auth.users_sync`.
- [ ] **Phase 7 — Deploy to Vercel** + secrets hygiene
  Scrub the Neon host leaked in `README.md`; confirm `.env*` gitignored; Vercel cron for API/HTTP
  sources.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done. Update these as phases land.

## Backlog model

**The backlog is GitHub issues** — there is no separate tracker. Each roadmap item above is broken
into issues; the dev loop works them down one at a time.

### Labels

| Label | Values | Meaning |
|-------|--------|---------|
| `priority:` | `high` / `med` / `low` | Work order. `high` is always picked first. |
| `type:` | `bug` / `feature` / `source` | What kind of change. `bug` (broken scan/build) jumps the queue. |
| `phase:` | `0`–`7` | Which roadmap phase it belongs to. |

### How the dev loop picks work

1. `bug` issues that block a scan or the build come **first** — fix before feature work.
2. Otherwise pick the highest `priority:` (`high` → `med` → `low`).
3. Tie-break by **lowest issue number** (oldest first), preferring the **current/earliest open phase**.
4. One issue per run. Don't start work that can't finish (green build + PR) inside the run.

## Dev loop protocol

Runs via `automation/run-dev-loop.ps1` (Windows Task Scheduler, ~2–3×/day). Prompt lives in
`automation/dev-loop.md`. This mirrors and expands the **Autonomous dev loop** in `CLAUDE.md`.

1. **Read context.** `CLAUDE.md`, this file, Claude's cross-session memory, and the open issues
   (`gh issue list --state open`).
2. **Pick the top issue** per the selection rules above. Comment on it to claim it.
3. **Branch.** `git checkout -b <type>/<issue#>-<slug>` off `main`. Never work on `main`.
4. **Implement.** Use the focused subagent for the area (see below). Keep the change scoped to the
   one issue.
5. **Green-gate.** `npm run build` **and** `npm run lint` must pass. If they don't, fix until green
   — never commit red.
6. **Commit + PR.** Commit to the branch, push, open a PR with `gh pr create` linking the issue
   (`Closes #N`). Chris merges; the loop never merges or force-pushes.
7. **File bugs.** Anything broken-but-out-of-scope found along the way → new GitHub issue with the
   right `type:bug` + `priority:` + `phase:` labels. Don't silently fix unrelated things.
8. **Summarize.** Log a one-line summary to `automation/logs/`, then stop.

If a scan or the build is failing at the start of a run, **fix that first** (file the bug, branch,
PR) before any feature issue.

## Scan loop

Runs the sources that find listings and upsert them into Neon `listings`, recording a `scan_run`
each time. Source split is by whether a logged-in browser is needed.

| Where | Runs | Sources | Trigger |
|-------|------|---------|---------|
| **Local** (Chris's Windows PC) | `automation/run-scan.ps1` → `node scanner/run.ts` | **All** sources, incl. browser-only **Facebook Marketplace** + **OfferUp** (Playwright + saved session) | Windows Task Scheduler, ~5×/day |
| **Vercel cron** | `/api/cron/scan` | **API/HTTP only**: eBay (Browse API), Craigslist, Troll&Toad | Vercel Cron (`vercel.json`) |

- Browser sources are **local-only** (saved session never leaves the PC; highest detection risk).
  API/HTTP sources run in **both** places — duplicates are absorbed by the upsert (`source` +
  `external_id`).
- **Cadence:** scans ~5×/day. Facebook Marketplace is deliberately the **least** frequent / most
  conservative — treat it as best-effort.
- **Logs** for both loops go to `automation/logs/` (one line per run, plus errors). Per-run results
  are also persisted as `scan_run` rows (sources scanned, new listings, price changes, errors).

## Subagents (`.claude/agents/`)

Focused agents the dev loop delegates to. Pick by the area the top issue touches.

| Agent | Use for |
|-------|---------|
| `source-fixer` | A source returns nothing / errors / changed its HTML or API. eBay Browse work, Craigslist/Troll&Toad parser breaks, Playwright selector drift on FB/OfferUp. |
| `dashboard-dev` | `src/` UI + API work: filters, search, sort, watchlists, detail view, deal badges (Phase 5). |
| `qa-verifier` | Verify a change actually works before/after a PR: run build/lint, hit `/api/health` & `/api/inventory`, run a source and confirm rows land, check the dashboard in-browser. |
| `backlog-groomer` | Keep the backlog sane: relabel/close stale issues, split oversized ones, ensure `priority:`/`type:`/`phase:` are set, file follow-ups. |

## Memory

Claude's **cross-session memory dir** holds durable facts in three buckets:

- **User facts** — Chris, Birmingham AL, owner; wants everything matching, never auto-buy.
- **Project facts** — stack, topology, source split, known-broken state (e.g. legacy eBay API dead).
- **Feedback facts** — corrections and preferences learned from past runs.

Keep it current: when a phase lands, a source breaks/recovers, or Chris gives a correction, **write
the durable fact to memory** (not just the PR). The dev loop reads memory at step 1 every run — stale
memory = repeated mistakes. Transient, per-run state belongs in `automation/logs/` and `scan_run`
rows, not memory.

## Guardrails (recap)

1. **Never auto-buy, bid, make offers, send money, or message sellers.** At most **draft** an inquiry
   for Chris to send.
2. **Never commit secrets.** `.env*`, `scanner/.env`, saved sessions (`scanner/.auth/`,
   `*.storageState.json`) stay gitignored. No connection strings/keys in code, docs, or commits.
3. **Green-gate every change** — `npm run build` + `npm run lint` pass before commit.
4. **Branch + PR for all autonomous changes** — never push to `main`, never force-push. Chris merges.
5. **Respect ToS & rate limits** — polite crawl delays; Facebook Marketplace is low-frequency,
   personal-use, best-effort.
