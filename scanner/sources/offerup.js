// OfferUp source (#7). Requires a saved login session (Chris's account):
//   node scanner/login.js offerup      ← run this once in YOUR terminal
// That saves scanner/.auth/offerup.json (gitignored). Without it the source
// skips cleanly so a full scan still succeeds.
//
// OfferUp blocks plain HTTP (403). The session sets the user's location to
// the Birmingham area, so search results are naturally local/regional.
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { detectSetName, detectProductType, parsePrice } from '../lib/detect.js'

const SESSION_PATH = fileURLToPath(new URL('../.auth/offerup.json', import.meta.url))

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// Sweep several DBZ queries. OfferUp search is title-only (not body), so
// broader queries are safer here than on Craigslist.
const QUERIES = [
  'dragon ball z sealed',
  'dragon ball super booster box',
  'dragon ball z cards',
  'dragon ball super cards',
  'dragon ball z',
  'dragon ball merch',
]

// Noise filter: drop items that are clearly unrelated.
const NOISE_RE =
  /\bfigure\b.*\bdragon\b(?!.*ball)|minecraft|fortnite|pokemon(?!\s*dbz)|naruto|one\s*piece\b.*\bcards?/i

export async function scrapeOfferUp({ headless = true } = {}) {
  if (!existsSync(SESSION_PATH)) {
    console.log('[offerup] No saved session — run `node scanner/login.js offerup` to enable this source.')
    return []
  }

  const browser = await chromium.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const listings = []
  const seen = new Set()

  try {
    const ctx = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
      storageState: SESSION_PATH, // load saved login
    })
    await ctx.addInitScript(() =>
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined }),
    )
    const page = await ctx.newPage()

    for (const q of QUERIES) {
      const url = `https://offerup.com/search/?q=${encodeURIComponent(q)}`
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        // OfferUp renders items client-side; wait for first card or no-results.
        await page
          .waitForSelector('a[href*="/item/detail/"]', { timeout: 12000 })
          .catch(() => {})

        // Scroll once to trigger any lazy loading
        await page.evaluate(() => window.scrollBy(0, 1200))
        await page.waitForTimeout(1500)

        const items = await page.$$eval('a[href*="/item/detail/"]', (anchors) => {
          const seen = new Set()
          const out = []
          for (const a of anchors) {
            const href = a.href
            if (!href || seen.has(href)) continue
            seen.add(href)
            // aria-label = "Title $Price  in City, State" — most reliable parsing source
            const ariaLabel = a.getAttribute('aria-label') || ''
            const title = a.getAttribute('title') || a.querySelector('img')?.alt || ''
            const img = a.querySelector('img')?.src || undefined
            // Extract price from aria-label: "... $20  in ..."
            const priceMatch = ariaLabel.match(/\$(\d[\d,]*(?:\.\d{1,2})?)/)
            const price = priceMatch ? priceMatch[0] : ''
            // Extract location from aria-label: "... in City, State"
            const locMatch = ariaLabel.match(/\bin\s+(.+)$/)
            const location = locMatch ? locMatch[1].trim() : ''
            out.push({ href, title, price, location, img })
          }
          return out
        })

        for (const it of items) {
          if (!it.href || seen.has(it.href)) continue
          if (!it.title) continue
          if (NOISE_RE.test(it.title)) continue
          seen.add(it.href)

          // Extract UUID from href for a stable external_id
          const uuidMatch = it.href.match(/\/item\/detail\/([a-f0-9-]+)/i)
          const externalId = uuidMatch ? uuidMatch[1] : it.href

          listings.push({
            source: 'offerup',
            external_id: externalId,
            title: it.title,
            url: it.href,
            price: parsePrice(it.price),
            currency: 'USD',
            in_stock: true,
            image_url: it.img,
            seller: it.location ? `OfferUp · ${it.location}` : 'OfferUp',
            set_name: detectSetName(it.title),
            product_type: detectProductType(it.title),
          })
        }

        await page.waitForTimeout(1500) // polite pacing between queries
      } catch (err) {
        console.error(`[offerup] query "${q}" failed: ${err.message}`)
      }
    }
  } finally {
    await browser.close()
  }

  console.log(`[offerup] ${listings.length} listing(s) found (${seen.size} unique items)`)
  return listings
}
