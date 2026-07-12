// Miniature Market source (#69) — national specialty hobby/TCG shop, US-based
// (custom platform, not Shopify — confirmed no /products.json). Search results
// render as clean server-rendered HTML (no anti-bot challenge encountered),
// unlike CoolStuffInc which returns a genuinely empty page even with the
// stealth plugin — evaluated and skipped, see docs/sources.md.
import { chromium } from 'playwright'
import { detectSetName, detectProductType, isDragonBallTitle, parsePrice, detectPreorder } from '../lib/detect.js'

const QUERIES = [
  'dragon ball super booster box',
  'dragon ball z booster box',
  'dragon ball super booster case',
]

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const KEEP_TYPES = new Set(['booster_box', 'booster_pack', 'case', 'bundle'])

export async function scrapeMiniatureMarket({ headless = true } = {}) {
  const browser = await chromium.launch({ headless })
  const listings = []
  const seen = new Set()

  try {
    const ctx = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1280, height: 1000 },
      locale: 'en-US',
    })
    const page = await ctx.newPage()

    for (const q of QUERIES) {
      const url = `https://www.miniaturemarket.com/search?search=${encodeURIComponent(q)}`
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page.waitForSelector('.product-box', { timeout: 15000 }).catch(() => {})
        await page.waitForTimeout(1000)

        const items = await page.$$eval('.product-box', (cards) =>
          cards.map((c) => ({
            lines: (c.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean),
            href: c.querySelector('a.product-name')?.href || c.querySelector('a')?.href,
            img: c.querySelector('img')?.src,
          })),
        )

        for (const it of items) {
          if (!it.href || seen.has(it.href) || !it.lines.length) continue
          const title = it.lines.find((l) => !/^(preorder|new arrival|sale|our price:?|out of stock|add to cart|product alerts)$/i.test(l) && !/^\$/.test(l))
          if (!title) continue
          if (!isDragonBallTitle(title)) continue
          const productType = detectProductType(title)
          if (!KEEP_TYPES.has(productType)) continue

          const priceLine = it.lines.find((l) => /^\$[\d,]/.test(l))
          const joined = it.lines.join(' ')

          seen.add(it.href)
          listings.push({
            source: 'miniaturemarket',
            external_id: it.href.match(/\/([A-Za-z0-9-]+)$/)?.[1] ?? it.href,
            title,
            url: it.href,
            price: parsePrice(priceLine),
            currency: 'USD',
            in_stock: !/out of stock/i.test(joined),
            image_url: it.img,
            seller: 'Miniature Market',
            set_name: detectSetName(title),
            product_type: productType,
            is_preorder: detectPreorder(title) || /\bpreorder\b/i.test(joined),
          })
        }

        await page.waitForTimeout(1200) // polite pacing
      } catch (err) {
        console.error(`[miniaturemarket] query "${q}" failed: ${err.message}`)
      }
    }

    console.log(`[miniaturemarket] ${listings.length} listing(s) found`)
  } finally {
    await browser.close()
  }

  return listings
}
