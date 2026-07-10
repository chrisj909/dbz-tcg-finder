// TCGplayer source — the major TCG marketplace. Scrapes the Dragon Ball Super
// Fusion World "Sealed Products" category (renders fine headless). Each product
// card: a[href*="/product/"] (id), innerText "Set | rarity | Name | N listings
// from | $lowestPrice | Market Price:$Y". We keep boxes/cases/booster packs
// (drop tournament/promo packs, which aren't real retail product) and record
// the lowest available ("from") price — sanity-checked against the tile's own
// Market Price via pickReliablePrice() (lib/detect.js) so a mismatched-
// language/condition listing pooled into the "from" price doesn't silently
// tank it. Per-product Market Price is also
// captured separately by market-tcgplayer.js -> market_values(source='tcgplayer').
import { chromium } from 'playwright'
import { detectSetName, detectProductType, parsePrice, pickReliablePrice } from '../lib/detect.js'

const BASE =
  'https://www.tcgplayer.com/search/dragon-ball-super-fusion-world/product?productLineName=dragon-ball-super-fusion-world&view=grid&ProductTypeName=Sealed+Products'
const URLS = [`${BASE}&page=1`, `${BASE}&page=2`, `${BASE}&page=3`]

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// Keep sealed boxes/cases/bundles/booster packs; drop tournament/promo packs
// (detectProductType classifies those as 'other', not 'booster_pack', since
// their titles don't say "booster pack").
const KEEP_TYPES = new Set(['booster_box', 'booster_pack', 'case', 'bundle'])

export async function scrapeTcgplayer({ headless = true } = {}) {
  const browser = await chromium.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const listings = []
  const seen = new Set()

  try {
    const ctx = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1366, height: 900 },
      locale: 'en-US',
    })
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })
    const page = await ctx.newPage()

    for (const url of URLS) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
        await page.waitForSelector('a[href*="/product/"]', { timeout: 15000 }).catch(() => {})
        await page.evaluate(() => window.scrollBy(0, 1600))
        await page.waitForTimeout(2500)

        const items = await page.$$eval('a[href*="/product/"]', (anchors) => {
          const out = []
          const local = new Set()
          for (const a of anchors) {
            const m = a.getAttribute('href')?.match(/\/product\/(\d+)/)
            if (!m || local.has(m[1])) continue
            local.add(m[1])
            out.push({ id: m[1], lines: (a.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean), img: a.querySelector('img')?.src || undefined })
          }
          return out
        })

        if (!items.length) break // page beyond results

        for (const it of items) {
          if (seen.has(it.id) || !it.lines.length) continue
          const priceLine = it.lines.find((l) => /^\$[\d,]/.test(l))
          const marketPriceLine = it.lines.find((l) => /^Market Price:/i.test(l))
          const name =
            it.lines.find((l) => /\bbox\b|\bcase\b|\bpack\b|display|bundle/i.test(l)) ||
            it.lines[2] ||
            it.lines[0]
          const productType = detectProductType(name)
          if (!KEEP_TYPES.has(productType)) continue // drop tournament/promo packs
          // Unlike other sources, TCGplayer's card text never mentions "Dragon
          // Ball" at all (just the set name, e.g. "Cross Force") — there's no
          // franchise text here to sanity-check against. Trust the URL's
          // productLineName scoping instead; it's a specific, TCGplayer-
          // internal product-line filter (not a loosely-enforced facet like
          // GameStop's, which is where a real leak was found). We do still
          // avoid MISLABELING: no longer force-prepending "Dragon Ball Super"
          // to a title that doesn't already say so (see git history).

          // See pickReliablePrice() in lib/detect.js — the tile's "N listings
          // from $X" price is pooled across every seller for that product ID,
          // including mislabeled cheap Japanese-import copies TCGplayer lets
          // sellers list under the same (nominally English) product (this is
          // the incident that motivated the shared helper — see its comment).
          const price = pickReliablePrice(parsePrice(priceLine), parsePrice(marketPriceLine))

          seen.add(it.id)
          const title = name
          listings.push({
            source: 'tcgplayer',
            external_id: it.id,
            title,
            url: `https://www.tcgplayer.com/product/${it.id}/`,
            price,
            currency: 'USD',
            in_stock: true,
            image_url: it.img,
            seller: 'TCGplayer',
            set_name: detectSetName(name) || it.lines[0],
            product_type: productType,
          })
        }

        await page.waitForTimeout(1200) // polite pacing
      } catch (err) {
        console.error(`[tcgplayer] ${url} failed: ${err.message}`)
      }
    }
  } finally {
    await browser.close()
  }

  return listings
}
