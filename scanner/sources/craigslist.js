// Craigslist source — Birmingham, AL (subdomain `bham`, NOT `birmingham` which
// is Birmingham, UK). Craigslist blocks plain HTTP (403), so we drive a real
// Chromium via Playwright; on a residential IP it serves results normally.
//
// Results render as `.cl-search-result[data-pid]` cards (gallery view). We sweep
// several DBZ queries and dedupe by Craigslist posting id (pid).
import { chromium } from 'playwright'
import {
  detectSetName,
  detectProductType,
  parsePrice,
  parseCraigslistMeta,
} from '../lib/detect.js'
import { distanceFromBirmingham } from '../lib/geo.js'

const AREA = 'bham' // Birmingham, Alabama
const QUERIES = [
  'dragon ball z',
  'dragon ball super',
  'dbz booster box', // specific — the bare `dbz` query matched DBZ-brand guitars (#20)
  'dbz cards',
  'dragon ball sealed',
  'dragon ball booster box',
]

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// Relevance (#20). "DBZ" is also a guitar brand (Dean/Diamond), so the bare
// `dbz` query dragged in guitars/amps/basses. Fix: (1) the dbz queries above are
// now specific, and (2) we drop any musical-instrument hit as a safety net.
// We deliberately do NOT gate on a positive title match — Craigslist matches the
// query against the post BODY too, so a real DBZ post can have a generic title.
const INSTRUMENT_RE =
  /\bguitars?\b|\bamps?\b|amplifier|\bbass\b|\bpedals?\b|fender|squier|stratocaster|telecaster|humbucker|fretboard|\bfrets?\b|\bstrings?\b|ukulele|mandolin|\bpickups?\b/i

// Auction houses cross-post generic "we buy/sell everything collectible"
// spam across every Craigslist category — their boilerplate body text can
// match a Dragon Ball query even though the actual post has nothing to do
// with it (found live: "Ending Gold Silver Coins Jewelry Signed Sports Mem
// Fine Art NCauctions.com"). Require 2+ distinct unrelated-collectible
// category mentions in the TITLE before dropping — a real listing that
// happens to mention "coins" once (e.g. "box lot, some rare coins included")
// won't trigger this, only the multi-category auction-teaser pattern will.
const AUCTION_SPAM_RE =
  /\b(coins?|jewelry|sports\s*mem|fine\s*art|estate\s*sale|auction\s*house)\b.*\b(coins?|jewelry|sports\s*mem|fine\s*art|estate\s*sale|auction\s*house)\b/i

export async function scrapeCraigslist({ headless = true } = {}) {
  const browser = await chromium.launch({ headless })
  const listings = []
  const seen = new Set()

  try {
    const ctx = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
    })
    const page = await ctx.newPage()

    for (const q of QUERIES) {
      const url = `https://${AREA}.craigslist.org/search/sss?query=${encodeURIComponent(q)}`
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        // Wait for either results or a no-results marker; don't hang if neither.
        await page
          .waitForSelector('.cl-search-result[data-pid], .no-results, .cl-no-results', {
            timeout: 15000,
          })
          .catch(() => {})

        const items = await page.$$eval('.cl-search-result[data-pid]', (cards) =>
          cards.map((c) => ({
            pid: c.getAttribute('data-pid'),
            url: c.querySelector('a[href]')?.href,
            title:
              c.querySelector('.title')?.textContent?.trim() || c.getAttribute('title') || '',
            price:
              c.querySelector('.priceinfo')?.textContent?.trim() ||
              c.querySelector('[class*="price"]')?.textContent?.trim() ||
              '',
            meta: c.querySelector('.meta')?.textContent?.trim() || '',
            img: c.querySelector('img')?.getAttribute('src') || undefined,
          })),
        )

        for (const it of items) {
          if (!it.pid || seen.has(it.pid)) continue
          const title = it.title || 'Craigslist listing'
          if (INSTRUMENT_RE.test(title)) continue // #20: drop DBZ-guitar/instrument false positives
          if (AUCTION_SPAM_RE.test(title)) continue // drop generic cross-posted auction-house spam
          seen.add(it.pid)
          const { location } = parseCraigslistMeta(it.meta)
          const distanceMi = distanceFromBirmingham(location)
          listings.push({
            source: 'craigslist',
            external_id: it.pid,
            title,
            url: it.url,
            price: parsePrice(it.price),
            currency: 'USD',
            in_stock: true,
            image_url: it.img,
            city: location ?? null,
            distance_mi: distanceMi,
            seller: location ? `Craigslist · ${location}` : 'Craigslist',
            set_name: detectSetName(title),
            product_type: detectProductType(title),
          })
        }

        await page.waitForTimeout(1200) // polite delay between queries
      } catch (err) {
        console.error(`[craigslist] query "${q}" failed: ${err.message}`)
      }
    }
  } finally {
    await browser.close()
  }

  return listings
}
