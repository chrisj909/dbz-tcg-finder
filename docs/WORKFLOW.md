# WORKFLOW — how DBZ TCG Finder builds and maintains itself

Operating manual for the **autonomous, continually-improving** loop. Two scheduled loops drive the project:
a **dev/maintenance Routine** (Claude works the GitHub-issue backlog) and a **scan loop** (local scanner runs the
sources). Both obey the hard rules in `CLAUDE.md` — read those first. The Routine prompt is `automation/dev-loop.md`.

## Runtime split (local + cloud)

- **Dev/maintenance loop** → a Claude Code **Routine** (cloud schedule) *or* a local scheduled `claude` run. A **cloud**
  run can do code/docs/backlog work but **cannot run the Playwright scanners** (no browser / residential IP) — so it
  labels scraper-touching PRs `needs:local-verify` and does **not** merge them.
- **Scan loop** → **local only** (`automation/run-scan.ps1` on Chris's Windows PC). Every marketplace 403s plain HTTP,
  so all sources need a real browser on the residential IP. A local run can also fully verify scraper fixes.
- Both schedules are registered with Windows Task Scheduler (see `automation/README.md`). **Enabling them is a
  human-only step** — installing a standing scheduled task is gated; Chris runs the `schtasks` commands once.

## Roadmap status

The original Phase 0–7 plan is essentially delivered; ongoing work is tracked as GitHub issues (below), not phases.

- [x] **Phase 0 — Running** locally + deployed (Vercel + Neon).
- [x] **Phase 1 — Agentic infra** (CLAUDE.md, `.claude/agents/`, `automation/`, docs, backlog).
- [x] **Phase 2 — eBay** — live via **Playwright search-scrape** (no API key; the Browse-API path is the optional #4).
- [~] **Phase 3 — Local sources** — Craigslist ✅ (relevance-filtered, #20), Facebook Marketplace ✅, TCGplayer ✅ (#28); OfferUp (#7, needs login), Mercari (#27, headless-blocked/parked), local-shops (#10) open.
- [x] **Phase 4 — Data model** — migration `002` (category, era, location, `market_value`, `deal_score`; `market_values`, `price_history` tables).
- [~] **Phase 5 — Dashboard** — Deals view + deal badges + market-value ✅; client-side search/filters/sort ✅ (#12); per-user watchlists open (#14, needs auth) + durable images (#35).
- [ ] **Phase 6 — Neon Auth** + multi-channel alerts (#15/#26).
- [x] **Phase 7 — Deployed** to Vercel, live at `dbz-finder.progrowthtech.com` (canonical URL). Cleanup of the dead cron is #30.

## Backlog model

**The backlog is GitHub issues** — no separate tracker. Labels:

| Label | Values | Meaning |
|-------|--------|---------|
| `priority:` | `high` / `med` / `low` | Work order. `high` first. |
| `type:` | `bug` / `feature` / `source` / `chore` / `docs` | Kind of change. `bug` jumps the queue. |
| `phase:` | `0`–`7` | Roadmap area. |
| `blocked:human` | — | Needs Chris (login/key/payment/toggle) — skipped by the loop. |
| `needs:local-verify` | — | Scraper change a cloud run couldn't verify; finish on a local run. |

**Pick order:** broken build/scan **bug** first → highest `priority:` → lowest issue number. One issue per run.

## The Routine loop (`automation/dev-loop.md`)

1. **Ground** — read `CLAUDE.md`, this file, and **memory** (user/project/feedback facts).
2. **Health first** — if `npm run build`/`lint` is red or the last `scan_run` failed, fix that and file the bug.
3. **Pick** the top open issue (rules above).
4. **Human-only check** — needs a login/key/payment/toggle? Comment, label `blocked:human`, skip.
5. **Branch** `feat/<issue>-<slug>` off `main` (never work on `main`).
6. **Implement** — use the `.claude/agents/` subagents for focused work.
7. **Test** — `npm run build` + `npm run lint`; for a **scanner/source** change also run `node --env-file=.env.local
   scanner/run.js --source=<x>` and confirm rows in Neon. (Cloud run can't → `needs:local-verify`, don't merge.)
8. **Self-merge** — `gh pr create --fill` then `gh pr merge --squash --delete-branch`. **Chris authorized self-merge.**
9. **Update memory + docs** — record durable facts; refresh docs if setup/architecture/workflow changed. Close the issue.
10. **End** — one-line summary (`done:` / `blocked:human:` / `no work:`).

## Scan loop

`automation/run-scan.ps1` → `node --env-file=.env.local scanner/run.js` (all sources), ~5×/day. Each run records a
`scan_runs` row and upserts into `listings` (dedupe on `(source, external_id)`, refreshing metadata/images), then
**scores deals** (`scanner/deal-score.js`) against `market_values`. Market values are refreshed separately by
`node --env-file=.env.local scanner/market.js` (eBay SOLD medians).

| Source | Where | Notes |
|--------|-------|-------|
| eBay, Craigslist, Facebook | **local scanner** | all 403 plain HTTP → Playwright on the residential IP. FB needs a saved session (`scanner/login.js facebook`) + personal profile. |
| ~~Vercel cron~~ | — | **Retired (#30)** — `/api/cron/scan` is a no-op; all scanning is local. |

## Subagents (`.claude/agents/`)

| Agent | Use for |
|-------|---------|
| `source-fixer` | A source returns nothing / errors / markup drift; new source or query work. |
| `dashboard-dev` | `src/` UI + API: filters, search, sort, watchlists, deal badges. |
| `qa-verifier` | Prove a change works: build/lint, run a source, confirm rows + UI. |
| `backlog-groomer` | Relabel/close/split issues; keep `priority:`/`type:`/`phase:` set; file follow-ups. |

## Memory

Claude's cross-session memory dir holds durable **user / project / feedback** facts. The loop reads it at step 1 every
run — keep it current (a phase lands, a source breaks/recovers, Chris gives a correction → write the fact). Transient
per-run state belongs in `automation/logs/` and `scan_run` rows, not memory.

## Guardrails (recap)

1. **Never** auto-buy/bid/offer/send money/message sellers — at most **draft** an inquiry.
2. **Never** commit secrets (`.env*`, `scanner/.env`, `scanner/.auth/`, `*.storageState.json`).
3. **Green-gate** every change (`build` + `lint`) before merge.
4. **Branch + PR + self-merge** once your own tests pass — never push to `main` directly, never force-push.
5. **Respect ToS / rate limits** — polite delays; Facebook Marketplace is low-frequency, personal-use, best-effort.
