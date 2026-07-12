// Dave & Adam's Card World source (#69) — national specialty sports/TCG shop,
// US-based (Amherst, NY; custom platform, not Shopify). Search results render
// as clean, simple server-side HTML — no anti-bot challenge encountered.
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

export async function scrapeDaveAndAdams({ headless = true } = {}) {
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
      const url = `https://www.dacardworld.com/search?Search=${encodeURIComponent(q)}`
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page.waitForSelector('.instant-search-products-product', { timeout: 15000 }).catch(() => {})
        await page.waitForTimeout(1500)

        const items = await page.$$eval('.instant-search-products-product', (cards) =>
          cards.map((c) => ({
            lines: (c.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean),
            href: c.querySelector('a')?.href,
            img: c.querySelector('img')?.src,
          })),
        )

        for (const it of items) {
          if (!it.href || seen.has(it.href) || !it.lines.length) continue
          const title = it.lines.find((l) => !/^\$/.test(l) && !/^(add to cart|out of stock|notify me|sold out)$/i.test(l))
          if (!title) continue
          if (!isDragonBallTitle(title)) continue
          const productType = detectProductType(title)
          if (!KEEP_TYPES.has(productType)) continue

          const priceLine = it.lines.find((l) => /^\$[\d,]/.test(l))
          const joined = it.lines.join(' ')

          seen.add(it.href)
          listings.push({
            source: 'daveandadams',
            // No numeric product ID exposed in the DOM — the URL slug is
            // stable and unique, use it as external_id.
            external_id: it.href.replace(/^https?:\/\/[^/]+/, ''),
            title,
            url: it.href,
            price: parsePrice(priceLine),
            currency: 'USD',
            in_stock: !/out of stock|sold out/i.test(joined),
            image_url: it.img,
            seller: "Dave & Adam's",
            set_name: detectSetName(title),
            product_type: productType,
            is_preorder: detectPreorder(title) || /\bpreorder\b/i.test(joined),
          })
        }

        await page.waitForTimeout(1200) // polite pacing
      } catch (err) {
        console.error(`[daveandadams] query "${q}" failed: ${err.message}`)
      }
    }

    console.log(`[daveandadams] ${listings.length} listing(s) found`)
  } finally {
    await browser.close()
  }

  return listings
}
