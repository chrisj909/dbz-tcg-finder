// Scanner orchestrator.
//
//   node --env-file=../.env.local run.js                 # all sources
//   node --env-file=../.env.local run.js --source=craigslist
//   ... --headed                                         # show the browser
//
// Or from the repo root: node --env-file=.env.local scanner/run.js
import { getSql, startScanRun, finishScanRun, upsertListing } from './lib/db.js'
import { sources } from './sources/index.js'

const sourceArg = process.argv.find((a) => a.startsWith('--source='))
const only = sourceArg ? sourceArg.split('=')[1] : null
const headless = !process.argv.includes('--headed')

if (only && !sources[only]) {
  console.error(`Unknown source "${only}". Available: ${Object.keys(sources).join(', ')}`)
  process.exit(1)
}
const selected = only ? { [only]: sources[only] } : sources

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

console.log(
  `\nDone (#${scanId}). scraped=${totalScraped} new=${newCount} priceChanges=${priceChanges} errors=${errors.length}`,
)
if (errors.length) console.log('errors:\n' + errors.map((e) => '  - ' + e).join('\n'))
