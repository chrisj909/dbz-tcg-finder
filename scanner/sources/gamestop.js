// GameStop source — carries a real Dragon Ball trading-card-game section.
// GameStop uses Imperva bot protection; playwright-extra + stealth (same
// approach as Mercari) gets past it in practice. Best-effort: expect this to
// be more fragile than the API-backed sources and to occasionally return 0.
//
// Product tiles carry a `data-gtmdata` JSON attribute with clean structured
// data (id, name, price, availability, image) — no need to parse rendered text.
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { detectSetName, detectProductType, isDragonBallTitle } from '../lib/detect.js'

chromium.use(StealthPlugin())

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// GameStop's own franchise facet — one page covers the whole Dragon Ball TCG catalog.
const CATEGORY_URL =
  'https://www.gamestop.com/toys-games/trading-cards/trading-card-games?prefn1=franchise&prefv1=Dragon+Ball'

// Keep sealed boxes/cases/bundles/booster packs; drop starter decks and singles.
const KEEP_TYPES = new Set(['booster_box', 'booster_pack', 'case', 'bundle'])

export async function scrapeGamestop({ headless = true } = {}) {
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

    await page.goto(CATEGORY_URL, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForSelector('a[data-gtmdata]', { timeout: 15000 }).catch(() => {})
    await page.evaluate(() => window.scrollBy(0, 1500))
    await page.waitForTimeout(1500)

    const products = await page.$$eval('a[data-gtmdata]', (anchors) => {
      const out = []
      const local = new Set()
      for (const a of anchors) {
        const raw = a.getAttribute('data-gtmdata')
        if (!raw) continue
        let data
        try {
          data = JSON.parse(raw)
        } catch {
          continue
        }
        if (!data.id || local.has(data.id)) continue
        local.add(data.id)
        out.push(data)
      }
      return out
    })

    for (const prod of products) {
      if (seen.has(String(prod.id))) continue
      const title = prod.name || ''
      // GameStop's "franchise=Dragon Ball" facet isn't fully reliable — real
      // Pokemon products have shown up on this exact category page. Never
      // trust the source's own scoping alone.
      if (!isDragonBallTitle(title)) continue
      const productType = detectProductType(title)
      if (!KEEP_TYPES.has(productType)) continue
      seen.add(String(prod.id))

      const price = prod.price?.sale ?? prod.price?.base ?? null
      listings.push({
        source: 'gamestop',
        external_id: String(prod.id),
        title,
        url: prod.url ? new URL(prod.url, 'https://www.gamestop.com').toString() : CATEGORY_URL,
        price: price != null ? Number(price) : null,
        currency: 'USD',
        in_stock: Boolean(prod.availability?.available),
        image_url: prod.image?.base,
        seller: 'GameStop',
        set_name: detectSetName(title),
        product_type: productType,
        // GameStop exposes a real structured pre-order field (confirmed live:
        // availability.preorder is boolean/null, alongside a releaseDate for
        // genuine pre-orders) — trust it over the title-regex fallback other
        // sources rely on.
        is_preorder: Boolean(prod.availability?.preorder),
      })
    }

    console.log(`[gamestop] ${products.length} catalog item(s) → ${listings.length} box(es)`)
  } catch (err) {
    console.error(`[gamestop] failed: ${err.message}`)
  } finally {
    await browser.close()
  }

  return listings
}
