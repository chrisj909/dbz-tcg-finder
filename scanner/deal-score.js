// Deal-score engine (#25): match active box/case listings to their eBay-SOLD
// market value and flag the ones priced under it. Runs at the end of every scan
// (via run.js) and standalone:  node --env-file=.env.local scanner/deal-score.js
import { getSql } from './lib/db.js'
import { matchProduct } from './market/products.js'

const MIN_SAMPLES = 3 // only trust a benchmark with >=3 sold comps
const DEAL_THRESHOLD = 0.05 // >5% under median => flagged as a deal

export async function scoreDeals(sql) {
  // Load benchmarks from both eBay SOLD (median of N completed sales) and
  // TCGplayer (their own market-price algorithm, stored as sample_size=1).
  // Prefer eBay SOLD when it has ≥MIN_SAMPLES; TCGplayer fills the gap.
  const mvRows = await sql`
    SELECT product_key, median_price, sample_size, source
    FROM market_values WHERE source IN ('ebay_sold', 'tcgplayer')
  `
  const mv = new Map()
  for (const r of mvRows) {
    const key = r.product_key
    const entry = { median: Number(r.median_price), n: Number(r.sample_size || 0), source: r.source }
    const existing = mv.get(key)
    if (!existing) {
      mv.set(key, entry)
    } else if (r.source === 'ebay_sold' && entry.n >= MIN_SAMPLES) {
      mv.set(key, entry) // eBay SOLD with enough samples always wins
    }
    // Otherwise keep whatever is already in the map
  }

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
    if (!m) continue
    // TCGplayer market prices (sample_size=1) bypass the MIN_SAMPLES guard —
    // they're pre-computed by TCGplayer's own algorithm and are trustworthy.
    const trusted = m.source === 'tcgplayer' ? m.median > 0 : m.n >= MIN_SAMPLES && m.median > 0
    if (!trusted) continue

    const price = Number(l.price)
    const discount = (m.median - price) / m.median
    const score = Math.max(0, Math.min(100, Math.round(discount * 100)))
    const isDeal = discount > DEAL_THRESHOLD
    const sourceLabel = m.source === 'tcgplayer' ? 'TCGplayer market price' : 'eBay sold median'
    const reason = isDeal
      ? `${Math.round(discount * 100)}% below ${sourceLabel} ($${m.median.toFixed(0)})`
      : `at/above market (${sourceLabel} $${m.median.toFixed(0)})`
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
