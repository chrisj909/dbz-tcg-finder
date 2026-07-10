// Local Birmingham card-shop source (#10).
// Queries each shop's TCGplayer Pro storefront (/api/inventory/skus) for the
// sealed DBZ/DBSCG product IDs we already track via the tcgplayer source.
// Returns 0 listings when shops have nothing in stock (currently typical for
// sealed boxes on TCGplayer Pro) and fires immediately when one restocks.
//
// Shops covered: Gear Gaming Birmingham, Card Addicts, Iron City Games.
// Pinnacle Cards & Games evaluated (#59) — no scrapeable storefront found (site
// down, location appears closed as of late 2024); not added.
import { chromium } from 'playwright'
import { getSql } from '../lib/db.js'
import { detectSetName, detectProductType } from '../lib/detect.js'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const SHOPS = [
  {
    key: 'gear_gaming_bham',
    label: 'Gear Gaming Birmingham',
    base: 'https://geargamingbirmingham.tcgplayerpro.com',
    city: 'Birmingham, AL',
  },
  {
    key: 'card_addicts',
    label: 'Card Addicts',
    base: 'https://cardaddicts.tcgplayerpro.com',
    city: 'Birmingham, AL',
  },
  {
    key: 'iron_city_games',
    label: 'Iron City Games',
    base: 'https://ironcitygames.tcgplayerpro.com',
    city: 'Birmingham, AL',
  },
]

// KEEP_TYPES mirrors the TCGplayer source — boxes/cases/bundles/booster packs.
const KEEP_TYPES = new Set(['booster_box', 'booster_pack', 'case', 'bundle'])

export async function scrapeLocalShops({ headless = true } = {}) {
  const sql = getSql()

  // Load the sealed product IDs we already know about from TCGplayer.
  // These are TCGplayer product IDs (external_id), so we can cross-reference
  // local shops' inventory using the same numeric IDs.
  const knownProducts = await sql`
    SELECT external_id, title, set_name, product_type
    FROM listings
    WHERE source = 'tcgplayer' AND is_active = true
      AND product_type IN ('booster_box', 'booster_pack', 'case', 'bundle')
  `
  if (!knownProducts.length) {
    console.log('[local-shops] No TCGplayer product IDs in DB — run tcgplayer source scan first.')
    return []
  }

  // Build a lookup map: TCGplayer product ID → { title, set_name, product_type }
  const productMap = new Map(knownProducts.map((p) => [String(p.external_id), p]))
  const productIds = [...productMap.keys()].join(',')
  console.log(`[local-shops] Checking ${productMap.size} sealed product IDs across ${SHOPS.length} shops...`)

  const browser = await chromium.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const listings = []

  try {
    const ctx = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
    })
    await ctx.addInitScript(() =>
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined }),
    )
    const page = await ctx.newPage()

    for (const shop of SHOPS) {
      try {
        // Land on shop homepage to set cookies, then query the inventory API.
        await page.goto(shop.base, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
        await page.waitForTimeout(2000)

        const inventoryUrl = `/api/inventory/skus?productIds=${productIds}`
        const inventory = await page.evaluate(async (url) => {
          const r = await fetch(url).then((res) => (res.ok ? res.json() : null)).catch(() => null)
          return r
        }, inventoryUrl)

        if (!Array.isArray(inventory)) {
          console.log(`[local-shops] ${shop.label}: no inventory response`)
          continue
        }

        const inStock = inventory.filter((item) => item.total > 0 && Array.isArray(item.skus) && item.skus.length)
        console.log(
          `[local-shops] ${shop.label}: ${inventory.length} products checked, ${inStock.length} in stock`,
        )

        for (const item of inStock) {
          const known = productMap.get(String(item.productId))
          if (!known) continue

          // Pick the cheapest available SKU.
          const sku = item.skus
            .filter((s) => s.quantity > 0 && s.price > 0)
            .sort((a, b) => a.price - b.price)[0]
          if (!sku) continue

          const productType = known.product_type || detectProductType(known.title || '')
          if (!KEEP_TYPES.has(productType)) continue

          listings.push({
            source: 'local_shop',
            external_id: `${shop.key}_${item.productId}`,
            title: known.title,
            url: `${shop.base}/product/${item.productId}`,
            price: Number(sku.price),
            currency: 'USD',
            in_stock: true,
            seller: shop.label,
            set_name: known.set_name || detectSetName(known.title || ''),
            product_type: productType,
            condition: sku.conditionName || 'Sealed',
          })
        }

        await page.waitForTimeout(2000) // polite pacing between shops
      } catch (err) {
        console.error(`[local-shops] ${shop.label} error: ${err.message}`)
      }
    }
  } finally {
    await browser.close()
  }

  console.log(`[local-shops] total: ${listings.length} in-stock local listing(s)`)
  return listings
}

if (process.argv[1]?.endsWith('local-shops.js')) {
  const items = await scrapeLocalShops()
  items.forEach((l) => console.log(` - ${l.seller}: ${l.title} $${l.price}`))
}
