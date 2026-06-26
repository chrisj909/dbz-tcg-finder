# automation/

Self-maintenance + scan loops for **dbz-tcg-finder**, scheduled on Chris's Windows 11 PC via Task Scheduler. The dev loop works the GitHub-issue backlog and opens PRs; the scan loop runs the local scanner (the only place browser sources — Facebook Marketplace, OfferUp — can run).

## Files

| File | What it does |
|------|--------------|
| `dev-loop.md` | The prompt headless `claude` runs: read memory, pick the top open issue, branch, implement, green-gate (`build`+`lint`), open a PR. Never pushes to `main`; never auto-buys/messages sellers. |
| `run-dev-loop.ps1` | Wraps one dev-loop pass: `git pull --ff-only`, then `claude -p (dev-loop.md)` with output teed to a timestamped log. |
| `run-scan.ps1` | Runs `node scanner/run.js` (all sources) with output teed to a timestamped log; passes the exit code through. |
| `proposed-claude-settings.json` | **Reference only.** A proposed permission allowlist — copy its `permissions` block into `.claude/settings.json` to gate the autonomous loop. Not active until you do. |
| `logs/` | Auto-created. `dev-loop-<stamp>.log` and `scan-<stamp>.log` (`yyyyMMdd-HHmmss`). |

## Prerequisites

- **`claude` CLI on PATH** — `claude --help` should work in a fresh terminal. Verify the flags in `run-dev-loop.ps1` still match your version.
- **`gh` CLI authenticated** — `gh auth status` ok (the dev loop creates issues + PRs).
- **`.env.local`** present (Neon `DATABASE_URL`, etc.) and **`scanner/.env`** present (eBay keys, etc.).
- **One-time scanner login done** — `node scanner/login.js` (headed) to save the FB/OfferUp browser session under `scanner/.auth/`. Without it the browser sources are skipped.
- Copy `proposed-claude-settings.json` → `.claude/settings.json` before enabling the loop unattended.

## Register Task Scheduler jobs (`schtasks.exe`)

Run these in an elevated PowerShell/cmd once. Adjust the path if your repo lives elsewhere.

**Dev loop — 3x/day (09:00, 14:00, 20:00):** Task Scheduler doesn't take multiple `/ST` times in one command, so register three tasks (or one + add triggers in the GUI):

```bat
schtasks /Create /TN "dbz\dev-loop-0900" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"C:\Users\chris\Dev\dev-dbz-tcg-finder\automation\run-dev-loop.ps1\"" /SC DAILY /ST 09:00 /RL LIMITED /F
schtasks /Create /TN "dbz\dev-loop-1400" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"C:\Users\chris\Dev\dev-dbz-tcg-finder\automation\run-dev-loop.ps1\"" /SC DAILY /ST 14:00 /RL LIMITED /F
schtasks /Create /TN "dbz\dev-loop-2000" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"C:\Users\chris\Dev\dev-dbz-tcg-finder\automation\run-dev-loop.ps1\"" /SC DAILY /ST 20:00 /RL LIMITED /F
```

**Scans — every 3 hours (~5x/day waking hours):** one task with an hourly-modulo trigger:

```bat
schtasks /Create /TN "dbz\scan" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"C:\Users\chris\Dev\dev-dbz-tcg-finder\automation\run-scan.ps1\"" /SC HOURLY /MO 3 /ST 08:00 /RL LIMITED /F
```

Notes:
- `-NoProfile -ExecutionPolicy Bypass` lets the script run regardless of your machine's PowerShell execution policy.
- The PC must be awake/on at trigger time. Add `/RU "<user>" /RP "<password>"` if you want jobs to run when not logged in.
- Nesting names under `dbz\` keeps them grouped in the Task Scheduler tree.

## Manage jobs

```bat
schtasks /Run    /TN "dbz\scan"            :: run once now (smoke test)
schtasks /Change /TN "dbz\scan" /DISABLE   :: pause
schtasks /Change /TN "dbz\scan" /ENABLE    :: resume
schtasks /Query  /TN "dbz\scan" /V /FO LIST:: status + last run result
schtasks /Delete /TN "dbz\scan" /F         :: remove
```

Smoke-test each script by hand before scheduling:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\chris\Dev\dev-dbz-tcg-finder\automation\run-scan.ps1"
```

## Logs

Everything is teed to `automation/logs/`:
- `dev-loop-<yyyyMMdd-HHmmss>.log` — one per dev-loop run.
- `scan-<yyyyMMdd-HHmmss>.log` — one per scan run.

These accumulate; prune old logs periodically (they're gitignored / shouldn't be committed).

## Safety

The dev loop **only opens PRs** — it branches, green-gates (`npm run build` + `npm run lint`), and files PRs for Chris to merge. It **never pushes to `main`, never force-pushes, never commits secrets, and never auto-buys, bids, or messages sellers** (at most it drafts an inquiry). Those limits live in `dev-loop.md` and are enforced by the allowlist in `proposed-claude-settings.json`.
