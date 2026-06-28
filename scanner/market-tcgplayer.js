// TCGplayer Market Price → market_values (#44).
// Reads active TCGplayer listings from the DB, visits each product page, and
// extracts the "Market Price" shown in the price-points table. Upserts rows
// into market_values(source='tcgplayer') so the deal-score engine can use
// TCGplayer prices as a benchmark alongside eBay-SOLD medians.
//
//   node --env-file=.env.local scanner/market-tcgplayer.js
import { chromium } from 'playwright'
import { getSql } from './lib/db.js'
import { parsePrice } from './lib/detect.js'
import { matchProduct } from './market/products.js'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// Extract "Market Price" from the price-points table on a TCGplayer product page.
// The page renders a table with <td>Market Price</td><td>$X.XX</td>.
async function scrapeMarketPrice(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  // Wait for the price table to appear (it's server-rendered so usually fast)
  await page.waitForSelector('td', { timeout: 12000 }).catch(() => {})
  await page.waitForTimeout(2000)

  const priceText = await page.evaluate(() => {
    const tds = [...document.querySelectorAll('td')]
    const labelTd = tds.find((td) => td.textContent?.trim() === 'Market Price')
    if (!labelTd) return null
    return labelTd.nextElementSibling?.textContent?.trim() || null
  })

  return parsePrice(priceText) || null
}

async function fetchTcgplayerMarketPrices({ headless = true } = {}) {
  const sql = getSql()

  // Pull active TCGplayer booster-box listings only. Cases are excluded because
  // products.js keys are box-level benchmarks — a case price would silently
  // overwrite the box benchmark in market_values (same product_key, ON CONFLICT).
  // Title filter supplements the product_type check: early DB rows may have been
  // mislabeled 'booster_box' for "Booster Box Case" titles (detect.js order bug,
  // fixed in the same commit).
  const listings = await sql`
    SELECT external_id, title, url
    FROM listings
    WHERE source = 'tcgplayer' AND is_active = true AND product_type = 'booster_box'
      AND title NOT ILIKE '%case%'
    ORDER BY external_id
  `

  if (!listings.length) {
    console.log('[market-tcgplayer] No active TCGplayer listings — run the tcgplayer source scan first.')
    return []
  }
  console.log(`[market-tcgplayer] ${listings.length} TCGplayer listing(s) to price...`)

  // Only process listings that map to a known product key (so deal-score can join them)
  const toFetch = []
  const skipped = []
  for (const l of listings) {
    const p = matchProduct(l.title)
    if (p) {
      toFetch.push({ ...l, productKey: p.key, label: p.label })
    } else {
      skipped.push(l.title)
    }
  }
  if (skipped.length) {
    console.log(`[market-tcgplayer] ${skipped.length} unmatched (no product key):`)
    skipped.forEach((t) => console.log(`  - ${t}`))
  }
  if (!toFetch.length) {
    console.log('[market-tcgplayer] Nothing to fetch after matching.')
    return []
  }

  const browser = await chromium.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const results = []

  try {
    const ctx = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
    })
    await ctx.addInitScript(() =>
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined }),
    )
    const page = await ctx.newPage()

    for (const l of toFetch) {
      const url = l.url || `https://www.tcgplayer.com/product/${l.external_id}/`
      try {
        const price = await scrapeMarketPrice(page, url)
        const status = price != null ? `$${price}` : 'N/A'
        console.log(`  ${l.productKey.padEnd(28)} ${status.padEnd(10)} ${l.title}`)
        if (price != null) {
          results.push({ productKey: l.productKey, label: l.label, price })
        }
      } catch (err) {
        console.error(`  [error] ${l.title}: ${err.message}`)
      }
      await page.waitForTimeout(1500) // polite pacing
    }
  } finally {
    await browser.close()
  }

  return results
}

const headless = !process.argv.includes('--headed')
console.log('Fetching TCGplayer Market Prices...')
const results = await fetchTcgplayerMarketPrices({ headless })

if (results.length) {
  const sql = getSql()
  let upserts = 0
  for (const r of results) {
    // sample_size = 1 signals "single source price" (vs eBay SOLD median of N).
    // deal-score handles this: it uses TCGplayer as a benchmark without the
    // MIN_SAMPLES guard that applies to eBay SOLD.
    await sql`
      INSERT INTO market_values (product_key, label, source, median_price, low_price, high_price, sample_size, currency, as_of)
      VALUES (${r.productKey}, ${r.label}, 'tcgplayer', ${r.price}, ${r.price}, ${r.price}, 1, 'USD', NOW())
      ON CONFLICT (product_key, source) DO UPDATE SET
        label = EXCLUDED.label,
        median_price = EXCLUDED.median_price,
        low_price = EXCLUDED.low_price,
        high_price = EXCLUDED.high_price,
        as_of = NOW()
    `
    upserts++
  }
  console.log(`\nupserted ${upserts} market_values row(s) (source=tcgplayer).`)
} else {
  console.log('\nNo prices captured.')
}
