// Top Cut Comics source — Shopify (like Troll & Toad). No dedicated Dragon Ball
// collection exists on the site, so we use Shopify's predictive-search JSON
// endpoint (/search/suggest.json) instead of a collection's products.json.
import { chromium } from 'playwright'
import { detectSetName, detectProductType, isDragonBallTitle } from '../lib/detect.js'

const SITE = 'https://topcutcomics.com'
const SEARCH_URL = `${SITE}/search/suggest.json?q=dragon+ball&resources[type]=product&resources[limit]=50`

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// Keep sealed boxes/cases/bundles; drop singles, graphic novels, figures, etc.
const KEEP_TYPES = new Set(['booster_box', 'booster_pack', 'case', 'bundle'])

export async function scrapeTopCutComics({ headless = true } = {}) {
  const browser = await chromium.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const listings = []

  try {
    const ctx = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1366, height: 900 },
      locale: 'en-US',
    })
    const page = await ctx.newPage()

    // Land on the site first (sets cookies), then read the search JSON from
    // the same origin — same pattern as trollandtoad.js.
    await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})

    const products = await page.evaluate(async (url) => {
      const j = await fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
      return j?.resources?.results?.products ?? []
    }, SEARCH_URL)

    for (const prod of products) {
      const title = prod.title || ''
      // The catalog carries many franchises (Pokemon, MTG, Yu-Gi-Oh, manga) —
      // never trust a keyword search alone to have scoped correctly.
      if (!isDragonBallTitle(title)) continue
      const productType = detectProductType(title)
      if (!KEEP_TYPES.has(productType)) continue

      listings.push({
        source: 'topcutcomics',
        external_id: String(prod.id),
        title,
        url: prod.url ? new URL(prod.url, SITE).toString() : `${SITE}/products/${prod.handle}`,
        price: prod.price != null ? Number(prod.price) : null,
        currency: 'USD',
        in_stock: Boolean(prod.available),
        image_url: prod.image || prod.featured_image?.url,
        seller: 'Top Cut Comics',
        set_name: detectSetName(title),
        product_type: productType,
      })
    }

    console.log(`[topcutcomics] ${products.length} search result(s) → ${listings.length} box(es)`)
  } catch (err) {
    console.error(`[topcutcomics] failed: ${err.message}`)
  } finally {
    await browser.close()
  }

  return listings
}
