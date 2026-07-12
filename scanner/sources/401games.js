// 401 Games source (#69) — national specialty TCG shop, Shopify (like Troll &
// Toad / Top Cut Comics). Canadian-based but confirmed ships to the US (flat
// $17.95 CAD to continental states + duties, min $20 order — see their TCG
// purchase/shipping policy page). No dedicated Dragon Ball collection page
// found, so we use Shopify's predictive-search endpoint like topcutcomics.js.
import { chromium } from 'playwright'
import { detectSetName, detectProductType, isDragonBallTitle, parsePrice, detectPreorder } from '../lib/detect.js'

const SITE = 'https://store.401games.ca'
const SEARCH_URL = `${SITE}/search/suggest.json?q=dragon+ball&resources[type]=product&resources[limit]=50`

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// Keep sealed boxes/cases/bundles/booster packs; drop singles and non-sealed items.
const KEEP_TYPES = new Set(['booster_box', 'booster_pack', 'case', 'bundle'])

export async function scrape401Games({ headless = true } = {}) {
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

    await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})

    const products = await page.evaluate(async (url) => {
      const j = await fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
      return j?.resources?.results?.products ?? []
    }, SEARCH_URL)

    for (const prod of products) {
      const title = prod.title || ''
      // The predictive-search endpoint pulls from the whole catalog (all
      // games), so unlike a franchise-scoped collection URL, this genuinely
      // needs the franchise check, not just a belt-and-suspenders one.
      if (!isDragonBallTitle(title)) continue
      const productType = detectProductType(title)
      if (!KEEP_TYPES.has(productType)) continue

      listings.push({
        source: '401games',
        external_id: String(prod.id),
        title,
        url: prod.url ? new URL(prod.url, SITE).toString() : `${SITE}/products/${prod.handle}`,
        // price_min/price_max are Shopify's per-variant range; price is the
        // single-variant field — prefer it, fall back to price_min.
        price: parsePrice(prod.price) ?? parsePrice(prod.price_min),
        // 401 Games is a Canadian store (store.401games.ca) — confirmed live
        // (window.Shopify.currency.active === 'CAD') that prices are shown
        // in CAD by default, not USD, even to a US-geolocated visitor. Store
        // the real currency; deal-score.js only scores currency='USD'
        // listings so a CAD price never gets compared against a USD market
        // value as if it were an apples-to-apples discount.
        currency: 'CAD',
        in_stock: Boolean(prod.available),
        image_url: prod.image || prod.featured_image?.url,
        seller: '401 Games',
        set_name: detectSetName(title),
        product_type: productType,
        is_preorder: detectPreorder(title) || /pre-?order/i.test((prod.tags || []).join(' ')),
      })
    }

    console.log(`[401games] ${products.length} search result(s) → ${listings.length} box(es)`)
  } catch (err) {
    console.error(`[401games] failed: ${err.message}`)
  } finally {
    await browser.close()
  }

  return listings
}
