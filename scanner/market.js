// Market-value engine (#24): scrape eBay SOLD/completed listings for key sealed
// DBZ products, compute the resale benchmark (median/low/high), and upsert into
// market_values (source = 'ebay_sold'). The deal-score engine (#25) joins live
// listings to these benchmarks to flag under-market boxes.
//
//   node --env-file=.env.local scanner/market.js
import { chromium } from 'playwright'
import { getSql } from './lib/db.js'
import { parsePrice } from './lib/detect.js'
import { PRODUCTS } from './market/products.js'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const SEALED_RE = /sealed|booster box|booster case|display box|booster display|\bcase\b/i
const EXCLUDE_RE =
  /\bsingles?\b|playmat|sleeves?|\bproxy\b|\bfigure\b|plush|funko|poster|\bempty\b|repack|\blot of\b|card lot|\bpromo\b/i

// PRODUCTS + the matcher live in ./market/products.js (shared with the
// deal-score engine). Add new sealed sets there.

const median = (a) => {
  if (!a.length) return null
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const round2 = (n) => (n == null ? null : Math.round(n * 100) / 100)

async function fetchSoldStats({ headless = true } = {}) {
  const browser = await chromium.launch({ headless })
  const out = []
  try {
    const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 1000 }, locale: 'en-US' })
    const page = await ctx.newPage()
    for (const p of PRODUCTS) {
      const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(p.query)}&LH_Sold=1&LH_Complete=1&_sop=13&_ipg=60`
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 })
        await page.waitForSelector('.su-card-container, li.s-item', { timeout: 15000 }).catch(() => {})
        const cards = await page.$$eval('.su-card-container', (cs) =>
          cs.map((c) => ({
            title: c.querySelector('[class*="title"]')?.textContent?.trim() || '',
            price: c.querySelector('[class*="price"]')?.textContent?.trim() || '',
          })),
        )
        const prices = []
        for (const c of cards) {
          const lower = c.title.toLowerCase()
          if (/^shop on ebay$/i.test(c.title)) continue
          if (!p.must.every((m) => lower.includes(m))) continue
          if (p.not && p.not.some((n) => lower.includes(n))) continue
          if (!SEALED_RE.test(c.title) || EXCLUDE_RE.test(c.title)) continue
          const pr = parsePrice(c.price)
          if (pr && pr > 5) prices.push(pr) // drop absurd lows (singles slipping through)
        }
        out.push({
          product_key: p.key,
          label: p.label,
          median: round2(median(prices)),
          low: prices.length ? Math.min(...prices) : null,
          high: prices.length ? Math.max(...prices) : null,
          sample: prices.length,
        })
        console.log(`  ${p.key.padEnd(24)} n=${prices.length} median=${prices.length ? '$' + round2(median(prices)) : '—'}`)
        await page.waitForTimeout(1500) // polite pacing
      } catch (err) {
        console.error(`[market] "${p.query}" failed: ${err.message}`)
        out.push({ product_key: p.key, label: p.label, median: null, low: null, high: null, sample: 0 })
      }
    }
  } finally {
    await browser.close()
  }
  return out
}

const headless = !process.argv.includes('--headed')
console.log(`Computing eBay SOLD market values for ${PRODUCTS.length} products...`)
const stats = await fetchSoldStats({ headless })

const sql = getSql()
let upserts = 0
for (const s of stats) {
  await sql`
    INSERT INTO market_values (product_key, label, source, median_price, low_price, high_price, sample_size, currency, as_of)
    VALUES (${s.product_key}, ${s.label}, 'ebay_sold', ${s.median}, ${s.low}, ${s.high}, ${s.sample}, 'USD', NOW())
    ON CONFLICT (product_key, source) DO UPDATE SET
      label = EXCLUDED.label, median_price = EXCLUDED.median_price, low_price = EXCLUDED.low_price,
      high_price = EXCLUDED.high_price, sample_size = EXCLUDED.sample_size, as_of = NOW()
  `
  upserts++
}

console.log(`\nupserted ${upserts} market_values rows (source=ebay_sold).`)
const low = stats.filter((s) => s.sample < 3).map((s) => s.product_key)
if (low.length) console.log('low-confidence (sample<3):', low.join(', '))
