// Facebook Marketplace source — sealed DBZ near the account's location (set to
// Birmingham, AL by the logged-in personal profile). Uses the saved session from
// `node scanner/login.js facebook`.
//
// CAVEAT: FB has aggressive bot detection and its ToS restricts automated access.
// This is BEST-EFFORT, conservative-paced, personal-use only — and the most likely
// source to break. It fails soft (never aborts the other sources).
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { detectSetName, detectProductType, parsePrice } from '../lib/detect.js'

const AUTH = fileURLToPath(new URL('../.auth/facebook.json', import.meta.url))

const QUERIES = [
  'dragon ball booster box',
  'dragon ball sealed',
  'dragon ball booster case',
  'dragonball booster box',
  'dbz sealed',
]

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// Local listings are terse — keep DBZ items that read like a box/case/lot...
const SEALED_RE = /sealed|booster box|booster case|display box|booster display|\bcase\b|\bbox\b|\blot\b|\btcg\b|\bccg\b/i
// ...and drop singles/merch.
const EXCLUDE_RE =
  /\bsingles?\b|playmat|sleeves?|\bproxy\b|\bfigure\b|plush|funko|poster|sticker|shirt|hoodie|wall scroll|\bdvd\b|blu-?ray|keychain|backpack|\bbulk\b/i

const isLocationLine = (l) => /^[A-Za-z .'-]+,\s*[A-Z]{2}$/.test(l)
// FB injects badge lines ("Partner listing", "Sponsored") into card text — ignore them.
const isBadgeLine = (l) =>
  /^(partner listing|sponsored|just listed|free shipping|new listing)$/i.test(l)

export async function scrapeFacebook({ headless = true } = {}) {
  if (!existsSync(AUTH)) {
    console.log('[facebook] no saved session — run `node scanner/login.js facebook` — skipping')
    return []
  }

  const browser = await chromium.launch({ headless })
  const listings = []
  const seen = new Set()

  try {
    const ctx = await browser.newContext({
      storageState: AUTH,
      userAgent: UA,
      viewport: { width: 1280, height: 1000 },
      locale: 'en-US',
    })
    const page = await ctx.newPage()

    for (const q of QUERIES) {
      const url = `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(q)}`
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
        await page
          .waitForSelector('a[href*="/marketplace/item/"]', { timeout: 15000 })
          .catch(() => {})
        await page.evaluate(() => window.scrollBy(0, 1800))
        await page.waitForTimeout(2000)

        const items = await page.$$eval('a[href*="/marketplace/item/"]', (anchors) => {
          const out = []
          const local = new Set()
          for (const a of anchors) {
            const m = a.getAttribute('href')?.match(/\/marketplace\/item\/(\d+)/)
            if (!m || local.has(m[1])) continue
            local.add(m[1])
            out.push({
              id: m[1],
              text: a.innerText || '',
              img: a.querySelector('img')?.getAttribute('src') || undefined,
            })
          }
          return out
        })

        for (const it of items) {
          if (seen.has(it.id)) continue
          const lines = it.text
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
            .filter((l) => !isBadgeLine(l))
          if (!lines.length) continue
          // FB card text is ordered price -> title -> location; take the line after price.
          const priceIdx = lines.findIndex((l) => /^\$[\d,]|\bfree\b/i.test(l))
          const priceLine = priceIdx >= 0 ? lines[priceIdx] : undefined
          const title =
            (priceIdx >= 0
              ? lines.slice(priceIdx + 1).find((l) => !isLocationLine(l) && l.length > 3)
              : undefined) ||
            lines.find((l) => !/^\$/.test(l) && !isLocationLine(l) && l.length > 4) ||
            lines[0]
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
          const location = lines.find(isLocationLine)
          listings.push({
            source: 'facebook',
            external_id: it.id,
            title,
            url: `https://www.facebook.com/marketplace/item/${it.id}`,
            price: parsePrice(priceLine),
            currency: 'USD',
            in_stock: true,
            image_url: it.img,
            seller: location ? `FB Marketplace · ${location}` : 'FB Marketplace',
            set_name: detectSetName(title),
            product_type: detectProductType(title),
          })
        }

        await page.waitForTimeout(2500) // conservative pacing between queries
      } catch (err) {
        console.error(`[facebook] query "${q}" failed: ${err.message}`)
      }
    }
  } finally {
    await browser.close()
  }

  return listings
}
