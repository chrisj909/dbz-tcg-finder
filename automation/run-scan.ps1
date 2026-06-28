# run-scan.ps1 — one scan pass for dbz-tcg-finder.
# Invoked by Windows Task Scheduler ~5x/day. Runs the LOCAL scanner (which owns the
# browser sources — Facebook Marketplace, OfferUp — plus the API/HTTP sources) and
# logs everything. Reads scanner/.env for source keys + uses the saved browser
# session from the one-time `node scanner/login.js`.

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
# `node scanner/run.js` (no flags) runs every source; pass --source=ebay etc. to scope.
node scanner/run.js 2>&1 | Tee-Object -FilePath $log

# Pass the scanner's exit code through to Task Scheduler so a failed scan shows as failed.
exit $LASTEXITCODE
