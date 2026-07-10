// eBay source — sealed DBZ product via the public search results (Playwright).
//
// We do NOT use the eBay API here (Browse API keys not yet provisioned). eBay
// 403s plain HTTP, but a real browser on a residential IP serves the normal
// search page. Results render as `.su-card-container` cards.
//
// This source is SEALED-focused (the project's core mission): queries target
// booster boxes / cases / display boxes, and a keyword filter drops singles,
// empties, merch, and the "Shop on eBay" placeholder cards.
import { chromium } from 'playwright'
import { detectSetName, detectProductType, parsePrice } from '../lib/detect.js'

const QUERIES = [
  'dragon ball super booster box sealed',
  'dragon ball super booster case sealed',
  'dragon ball super fusion world booster box',
  'dragon ball super zenkai booster box sealed',
  'dragon ball z score sealed booster box',
  'dragon ball z panini sealed booster box',
]

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// Keep only things that read as sealed boxes/cases...
const SEALED_RE = /sealed|booster box|booster case|display box|booster display|\bcase\b/i
// ...and drop singles, empties, repacks, and merch.
const EXCLUDE_RE =
  /\bsingles?\b|playmat|sleeves?|\bproxy\b|deck box|binder|empty box|empty display|no cards|repack|\bfigure\b|plush|funko|poster|sticker|\bcard lot\b/i

const cleanTitle = (t = '') => t.replace(/Opens in a new window or tab.*$/i, '').trim()
const itemId = (href = '') => href.match(/\/itm\/(\d+)/)?.[1]

export async function scrapeEbay({ headless = true } = {}) {
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
      const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
        q,
      )}&_sop=10&LH_BIN=1&_ipg=60`
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 })
        await page
          .waitForSelector('.su-card-container, li.s-item', { timeout: 15000 })
          .catch(() => {})
        // eBay lazy-loads card images; scroll through so the real image URLs
        // (i.ebayimg.com — stable, non-expiring) replace the 1x1 placeholder.
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 800) {
            window.scrollTo(0, y)
            await new Promise((r) => setTimeout(r, 120))
          }
          window.scrollTo(0, 0)
        })
        await page.waitForTimeout(700)

        const items = await page.$$eval('.su-card-container', (cards) =>
          cards.map((c) => {
            const im = c.querySelector('img')
            const src = im?.currentSrc || im?.src || im?.getAttribute('src') || ''
            return {
              title: c.querySelector('[class*="title"]')?.textContent?.trim() || '',
              price: c.querySelector('[class*="price"]')?.textContent?.trim() || '',
              href: c.querySelector('a[href*="/itm/"]')?.href || '',
              img: src && !src.includes('ir.ebaystatic') ? src : undefined,
            }
          }),
        )

        for (const it of items) {
          const title = cleanTitle(it.title)
          const id = itemId(it.href)
          if (!id || seen.has(id)) continue
          if (!title || /^shop on ebay$/i.test(title)) continue
          const lower = title.toLowerCase()
          if (
            !lower.includes('dragon ball') &&
            !lower.includes('dragonball') &&
            !lower.includes('dbs') &&
            !lower.includes('dbz')
          )
            continue
          if (!SEALED_RE.test(title) || EXCLUDE_RE.test(title)) continue

          seen.add(id)
          listings.push({
            source: 'ebay',
            external_id: id,
            title,
            url: `https://www.ebay.com/itm/${id}`,
            price: parsePrice(it.price),
            currency: 'USD',
            condition: 'new',
            in_stock: true,
            image_url: it.img,
            seller: 'eBay',
            set_name: detectSetName(title),
            product_type: detectProductType(title),
          })
        }

        await page.waitForTimeout(1000) // polite delay between queries
      } catch (err) {
        console.error(`[ebay] query "${q}" failed: ${err.message}`)
      }
    }
  } finally {
    await browser.close()
  }

  return listings
}
