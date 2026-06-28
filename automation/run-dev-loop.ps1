# run-dev-loop.ps1 — one autonomous dev-loop pass for dbz-tcg-finder.
# Invoked by Windows Task Scheduler ~3x/day. Reads automation/dev-loop.md and
# hands it to a headless `claude` run, logging everything. Opens PRs only —
# the prompt itself enforces "never push to main".

# Stop on any uncaught error so a broken run fails loudly instead of half-working.
$ErrorActionPreference = 'Stop'

# Repo root (literal path, backslashes for Windows). cd here so all git/npm/gh
# commands resolve against the project.
Set-Location 'C:\Users\chris\Dev\dev-dbz-tcg-finder'

# Start from a clean, up-to-date main. --ff-only refuses to create a merge commit
# if local history has diverged (it shouldn't — the loop only ever works on branches).
git pull --ff-only

# Make sure the log directory exists (-Force is a no-op if it already does).
New-Item -ItemType Directory -Force -Path 'automation\logs' | Out-Null

# Timestamped log file, e.g. automation\logs\dev-loop-20260626-090000.log
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$log   = "automation\logs\dev-loop-$stamp.log"

# Load the prompt as a single raw string.
$prompt = Get-Content 'automation\dev-loop.md' -Raw

# Run claude headless on the prompt and tee output to console + log.
# --permission-mode acceptEdits lets it edit files without prompting; pair it with
# the allowlist in .claude/settings.json (see automation/proposed-claude-settings.json)
# so destructive commands stay blocked.
# NOTE: claude CLI flags change between versions — verify with `claude --help` and
# adjust (e.g. -p vs --prompt, model selection, --dangerously-skip-permissions) if this errors.
claude -p $prompt --permission-mode acceptEdits 2>&1 | Tee-Object -FilePath $log

# Surface claude's exit code to Task Scheduler (Last Run Result).
exit $LASTEXITCODE
