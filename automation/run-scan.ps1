# run-scan.ps1 — one scan pass for dbz-tcg-finder.
# Invoked by Windows Task Scheduler ~5x/day. Runs the LOCAL scanner (which owns the
# browser sources — eBay, Craigslist, Facebook Marketplace, OfferUp, ...) and logs
# everything. Loads DATABASE_URL (+ any source keys) from the repo-root .env.local
# via Node's --env-file, and uses the saved browser session from `node scanner/login.js`.

# Stop on any uncaught error.
$ErrorActionPreference = 'Stop'

# Repo root (literal path, backslashes for Windows).
Set-Location 'C:\Users\chris\Dev\dev-dbz-tcg-finder'

# Ensure the log directory exists.
New-Item -ItemType Directory -Force -Path 'automation\logs' | Out-Null

# Timestamped log file, e.g. automation\logs\scan-20260626-120000.log
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$log   = "automation\logs\scan-$stamp.log"

# Run all scanner sources and tee output to console + log.
# (no --source flag) runs every source; pass --source=ebay etc. to scope.
#
# $ErrorActionPreference is relaxed to 'Continue' just for this call: the scanner
# writes non-fatal diagnostics (e.g. expired-session warnings) to stderr, and
# under 'Stop' PowerShell's `2>&1` redirection wraps each stderr line as a
# terminating NativeCommandError -- aborting the script (and reporting the whole
# scan as failed in Task Scheduler) even when the scan itself completed cleanly.
$ErrorActionPreference = 'Continue'
node --env-file=.env.local scanner/run.js 2>&1 | Tee-Object -FilePath $log
$exitCode = $LASTEXITCODE
$ErrorActionPreference = 'Stop'

# Pass the scanner's exit code through to Task Scheduler so a failed scan shows as failed.
exit $exitCode
