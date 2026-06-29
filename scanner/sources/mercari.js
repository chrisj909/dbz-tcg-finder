// Mercari source — online resale marketplace, lots of sealed DBZ. No login needed.
// Mercari blocks plain headless Chromium (consent gate + anti-bot), so we use
// playwright-extra with the stealth plugin to blend in.
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { detectSetName, detectProductType, parsePrice } from '../lib/detect.js'

chromium.use(StealthPlugin())

const QUERIES = [
  'dragon ball booster box sealed',
  'dragon ball super fusion world booster box',
  'dragon ball z panini booster box',
  'dragon ball z score booster box',
  'dragon ball booster case sealed',
]

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const SEALED_RE = /sealed|booster box|booster case|display box|unopened|\bcase\b/i
const EXCLUDE_RE =
  /\bopened\b|\bbulk\b|\bsingles?\b|card lot|\bloose\b|\bplayed\b|playmat|sleeves?|\bproxy\b|\bfigure\b|plush|funko|\bempty\b|sticker|keychain/i

export async function scrapeMercari({ headless = true } = {}) {
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
      const url = `https://www.mercari.com/search/?keyword=${encodeURIComponent(q)}`
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 })
        await page.waitForSelector('a[href*="/item/"]', { timeout: 15000 }).catch(() => {})
        await page.evaluate(() => window.scrollBy(0, 1500))
        await page.waitForTimeout(1500)

        const items = await page.$$eval('a[href*="/item/"]', (anchors) => {
          const out = []
          const local = new Set()
          for (const a of anchors) {
            const m = a.getAttribute('href')?.match(/\/item\/(m\d+)/i)
            if (!m || local.has(m[1])) continue
            local.add(m[1])
            out.push({ id: m[1], lines: (a.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean), img: a.querySelector('img')?.src || undefined })
          }
          return out
        })

        for (const it of items) {
          if (seen.has(it.id) || !it.lines.length) continue
          const priceLine = it.lines.find((l) => /^\$[\d,]/.test(l))
          const title = it.lines.find((l) => !/^\$/.test(l) && l.length > 3) || it.lines[0]
          const lower = title.toLowerCase()
          if (
            !lower.includes('dragon ball') &&
            !lower.includes('dragonball') &&
            !lower.includes('dbz') &&
            !lower.includes('dbs')
          )
            continue
          if (!SEALED_RE.test(title) || EXCLUDE_RE.test(title)) continue

          seen.add(it.id)
          listings.push({
            source: 'mercari',
            external_id: it.id,
            title,
            url: `https://www.mercari.com/item/${it.id}/`,
            price: parsePrice(priceLine),
            currency: 'USD',
            in_stock: true,
            image_url: it.img,
            seller: 'Mercari',
            set_name: detectSetName(title),
            product_type: detectProductType(title),
          })
        }

        await page.waitForTimeout(1500) // polite pacing
      } catch (err) {
        console.error(`[mercari] query "${q}" failed: ${err.message}`)
      }
    }
  } finally {
    await browser.close()
  }

  return listings
}
