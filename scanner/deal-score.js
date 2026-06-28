// Deal-score engine (#25): match active box/case listings to their eBay-SOLD
// market value and flag the ones priced under it. Runs at the end of every scan
// (via run.js) and standalone:  node --env-file=.env.local scanner/deal-score.js
import { getSql } from './lib/db.js'
import { matchProduct } from './market/products.js'

const MIN_SAMPLES = 3 // only trust a benchmark with >=3 sold comps
const DEAL_THRESHOLD = 0.05 // >5% under median => flagged as a deal

export async function scoreDeals(sql) {
  const mvRows = await sql`
    SELECT product_key, median_price, sample_size FROM market_values WHERE source = 'ebay_sold'
  `
  const mv = new Map(
    mvRows.map((r) => [r.product_key, { median: Number(r.median_price), n: r.sample_size }]),
  )

  // Reset previously-computed deal fields so stale/false matches clear on re-run.
  await sql`UPDATE listings SET deal_score = NULL, market_value = NULL, deal_reason = NULL WHERE is_active = true AND deal_score IS NOT NULL`

  // Only score box/case listings — the market_values benchmarks are per-box, so
  // comparing a single/pack to a box median would be meaningless.
  const listings = await sql`
    SELECT id, title, price FROM listings
    WHERE is_active = true AND in_stock = true AND price IS NOT NULL
      AND product_type IN ('booster_box', 'case')
  `

  let scored = 0
  let deals = 0
  for (const l of listings) {
    const p = matchProduct(l.title)
    const m = p ? mv.get(p.key) : undefined
    if (!m || m.n < MIN_SAMPLES || !(m.median > 0)) continue

    const price = Number(l.price)
    const discount = (m.median - price) / m.median
    const score = Math.max(0, Math.min(100, Math.round(discount * 100)))
    const isDeal = discount > DEAL_THRESHOLD
    const reason = isDeal
      ? `${Math.round(discount * 100)}% below eBay sold median ($${m.median.toFixed(0)})`
      : `at/above market (sold median $${m.median.toFixed(0)})`
    if (isDeal) deals++
    scored++
    await sql`
      UPDATE listings SET market_value = ${m.median}, deal_score = ${score}, deal_reason = ${reason}
      WHERE id = ${l.id}
    `
  }

  console.log(
    `[deal-score] scored ${scored} matched box listings; ${deals} flagged as deals (>${DEAL_THRESHOLD * 100}% under market).`,
  )
  return { scored, deals }
}

if (process.argv[1]?.endsWith('deal-score.js')) {
  await scoreDeals(getSql())
}
