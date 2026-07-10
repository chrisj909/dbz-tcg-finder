// Troll & Toad source (#18). The old HTML scraper broke because T&T relaunched
// on Shopify (old category URLs 404 — there is NO Cloudflare wall anymore). We
// read the structured Shopify `products.json` for the Dragon Ball Super "Sealed
// Product" collection: clean JSON, low-maintenance, no DOM scraping.
//
// Note: at the time of writing T&T is "soft-reopening" and everything is
// out-of-stock — we still record the catalog + prices (in_stock reflects
// availability), so boxes auto-surface the moment they restock.
import { chromium } from 'playwright'
import { detectSetName, detectProductType, isDragonBallTitle } from '../lib/detect.js'

const COLLECTION = 'dragon-ball-super-sealed-product'
const COLLECTION_URL = `https://www.trollandtoad.com/collections/${COLLECTION}`

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// Keep sealed boxes/cases/bundles/booster packs; drop singles and non-sealed items.
const KEEP_TYPES = new Set(['booster_box', 'booster_pack', 'case', 'bundle'])

export async function scrapeTrollAndToad({ headless = true } = {}) {
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

    // Land on the collection page first (sets cookies), then read products.json
    // from the same origin via the browser's fetch (most reliable past any edge).
    await page.goto(COLLECTION_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})

    const products = await page.evaluate(async (handle) => {
      const out = []
      for (let p = 1; p <= 5; p++) {
        const j = await fetch(`/collections/${handle}/products.json?limit=250&page=${p}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
        if (!j || !j.products || !j.products.length) break
        out.push(...j.products)
        if (j.products.length < 250) break
      }
      return out
    }, COLLECTION)

    for (const prod of products) {
      const title = prod.title || ''
      // The collection is franchise-scoped by URL, but don't trust that
      // alone — a mis-tagged item could still land in it.
      if (!isDragonBallTitle(title)) continue
      const productType = detectProductType(title)
      if (!KEEP_TYPES.has(productType)) continue

      const variants = Array.isArray(prod.variants) ? prod.variants : []
      const priceStr = variants[0]?.price
      listings.push({
        source: 'trollandtoad',
        external_id: String(prod.id),
        title,
        url: `https://www.trollandtoad.com/products/${prod.handle}`,
        price: priceStr != null ? Number(priceStr) : null,
        currency: 'USD',
        in_stock: variants.some((v) => v.available),
        image_url: prod.images?.[0]?.src,
        seller: 'Troll & Toad',
        set_name: detectSetName(title),
        product_type: productType,
      })
    }

    console.log(`[trollandtoad] ${products.length} catalog item(s) → ${listings.length} box(es)`) // eslint-disable-line no-console
  } finally {
    await browser.close()
  }

  return listings
}
