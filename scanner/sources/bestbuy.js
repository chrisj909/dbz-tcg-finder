// Best Buy source — official public Products API (developer.bestbuy.com), not
// a scrape. Free, self-serve API key required: sign up at
// https://developer.bestbuy.com/, then add BESTBUY_API_KEY to .env.local.
// Skips cleanly (no error) if the key isn't set, so a full scan still succeeds
// without it.
import { detectSetName, detectProductType, isDragonBallTitle } from '../lib/detect.js'

const BASE = 'https://api.bestbuy.com/v1/products'

// Best Buy's `(search=a&search=b)` syntax ANDs multi-word terms together.
const QUERIES = [
  '(search=Dragon Ball Super&search=trading card)',
  '(search=Dragon Ball Z&search=trading card)',
]

// Best Buy's API returns several distinct image fields (not an array) in the
// same response — angleImage/backViewImage/etc are free extras beyond the
// primary `image`, unlike every scraped source here whose search-result grid
// only ever exposes one thumbnail per item (see #68 — getting more from those
// requires a per-item detail-page visit, deliberately not done here).
const EXTRA_IMAGE_FIELDS = ['angleImage', 'alternateViewsImage', 'backViewImage', 'leftViewImage', 'rightViewImage', 'topViewImage']
const SHOW_FIELDS = `sku,name,salePrice,image,${EXTRA_IMAGE_FIELDS.join(',')},url,onlineAvailability,inStoreAvailability`

// Keep sealed boxes/cases/bundles; drop singles, figures, and other non-TCG
// "Dragon Ball" merch the keyword search inevitably pulls in.
const KEEP_TYPES = new Set(['booster_box', 'booster_pack', 'case', 'bundle'])

export async function scrapeBestBuy() {
  const apiKey = process.env.BESTBUY_API_KEY
  if (!apiKey) {
    console.log('[bestbuy] No BESTBUY_API_KEY set — sign up free at https://developer.bestbuy.com/ to enable this source. Skipping.')
    return []
  }

  const listings = []
  const seen = new Set()

  for (const query of QUERIES) {
    const url = `${BASE}${encodeURIComponent(query)}?format=json&show=${SHOW_FIELDS}&pageSize=100&apiKey=${apiKey}`
    try {
      const res = await fetch(url)
      if (!res.ok) {
        console.error(`[bestbuy] query failed: ${res.status} ${res.statusText}`)
        continue
      }
      const data = await res.json()
      for (const prod of data.products ?? []) {
        if (seen.has(String(prod.sku))) continue
        const title = prod.name || ''
        // Best Buy's search ANDs "Dragon Ball" with "trading card", but
        // don't rely on that alone — verify the returned title actually
        // mentions Dragon Ball before keeping it.
        if (!isDragonBallTitle(title)) continue
        const productType = detectProductType(title)
        if (!KEEP_TYPES.has(productType)) continue
        seen.add(String(prod.sku))

        const extraImages = EXTRA_IMAGE_FIELDS.map((f) => prod[f]).filter(Boolean)

        listings.push({
          source: 'bestbuy',
          external_id: String(prod.sku),
          title,
          url: prod.url,
          price: prod.salePrice ?? null,
          currency: 'USD',
          in_stock: Boolean(prod.onlineAvailability || prod.inStoreAvailability),
          image_url: prod.image,
          image_urls: extraImages.length ? extraImages : undefined,
          seller: 'Best Buy',
          set_name: detectSetName(title),
          product_type: productType,
        })
      }
    } catch (err) {
      console.error(`[bestbuy] query "${query}" failed: ${err.message}`)
    }
  }

  console.log(`[bestbuy] ${listings.length} listing(s) found`)
  return listings
}
