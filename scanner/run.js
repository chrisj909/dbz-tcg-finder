// Scanner orchestrator.
//
//   node --env-file=../.env.local run.js                 # all sources
//   node --env-file=../.env.local run.js --source=craigslist
//   ... --headed                                         # show the browser
//
// Or from the repo root: node --env-file=.env.local scanner/run.js
import { getSql, startScanRun, finishScanRun, upsertListing, deactivateStaleListings } from './lib/db.js'
import { sources } from './sources/index.js'
import { scoreDeals } from './deal-score.js'
import { sendNotificationDigests } from './notify.js'
import { checkSessions, printSessionWarnings } from './lib/session-health.js'

const sourceArg = process.argv.find((a) => a.startsWith('--source='))
const only = sourceArg ? sourceArg.split('=')[1] : null
const headless = !process.argv.includes('--headed')

if (only && !sources[only]) {
  console.error(`Unknown source "${only}". Available: ${Object.keys(sources).join(', ')}`)
  process.exit(1)
}
const selected = only ? { [only]: sources[only] } : sources

// Warn about expired/missing login sessions before scanning.
printSessionWarnings(checkSessions())

const sql = getSql()
const scanId = await startScanRun(sql)
console.log(`scan_run #${scanId} started (${headless ? 'headless' : 'headed'})`)

const ranSources = []
const errors = []
let newCount = 0
let priceChanges = 0
let totalScraped = 0

for (const [name, src] of Object.entries(selected)) {
  console.log(`\n[${name}] ${src.label} — scraping...`)
  try {
    const listings = await src.run({ headless })
    totalScraped += listings.length
    ranSources.push(name)
    console.log(`[${name}] scraped ${listings.length} listing(s)`)
    for (const l of listings) {
      try {
        const result = await upsertListing(sql, l)
        if (result === 'new') newCount++
        else if (result === 'price_change') priceChanges++
      } catch (err) {
        errors.push(`${name} upsert ${l.external_id}: ${err.message}`)
      }
    }
  } catch (err) {
    errors.push(`${name}: ${err.message}`)
    console.error(`[${name}] FAILED: ${err.message}`)
  }
}

const status = ranSources.length === 0 && errors.length > 0 ? 'failed' : 'completed'
await finishScanRun(sql, scanId, {
  sources: ranSources,
  newListings: newCount,
  priceChanges,
  errors,
  status,
})

// Retire listings no source has confirmed in a while — otherwise a delisted/
// sold item just sits there forever showing its last (possibly stale, wildly
// off) price and "in stock" status.
try {
  const retired = await deactivateStaleListings(sql)
  if (retired) console.log(`[stale] deactivated ${retired} listing(s) not seen in 7+ days`)
} catch (err) {
  console.error('[stale] deactivation failed:', err.message)
}

// Re-score deals against the latest market values after every scan.
try {
  await scoreDeals(sql)
} catch (err) {
  console.error('[deal-score] failed:', err.message)
}

// Email digest — only on a full scan (no --source filter), never on a
// manual single-source debugging run, so testing/fixing one source doesn't
// spam real users with notification emails.
if (!only) {
  try {
    const sent = await sendNotificationDigests(sql)
    if (sent) console.log(`[notify] sent ${sent} digest(s)`)
  } catch (err) {
    console.error('[notify] digest failed:', err.message)
  }
}

console.log(
  `\nDone (#${scanId}). scraped=${totalScraped} new=${newCount} priceChanges=${priceChanges} errors=${errors.length}`,
)
if (errors.length) console.log('errors:\n' + errors.map((e) => '  - ' + e).join('\n'))
