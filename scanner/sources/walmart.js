// Walmart source — genuinely carries sealed DBZ/DBS TCG product, but Walmart
// runs Akamai Bot Manager + PerimeterX (HUMAN Security) in series, one of the
// hardest anti-bot stacks of any source here. Confirmed empirically: the
// first request in a fresh session returns real results, but a handful of
// requests in quick succession trips a silent "Robot or human?" press-and-hold
// challenge (200 OK, not a clean 403) that a headless browser cannot solve.
//
// Mitigations, in order of importance:
//  1. ONE search query per run (not several like other sources) — every extra
//     request raises the odds of tripping the challenge before we get data.
//  2. Detect the challenge page and skip cleanly (never throw) rather than
//     return garbage or crash the rest of the scan.
//  3. Best-effort framing throughout: expect this to return 0 often. Treat
//     any real data it does capture as a bonus, not a guarantee.
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { detectSetName, detectProductType, parsePrice } from '../lib/detect.js'

chromium.use(StealthPlugin())

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const SEARCH_URL =
  'https://www.walmart.com/search?q=' + encodeURIComponent('dragon ball tcg booster box')

const SEALED_RE = /sealed|booster box|booster case|display box|unopened|\bcase\b/i
const EXCLUDE_RE =
  /\bopened\b|\bbulk\b|\bsingles?\b|card lot|\bloose\b|\bplayed\b|playmat|sleeves?|\bproxy\b|\bfigure\b|plush|funko|\bempty\b|sticker|keychain/i

export async function scrapeWalmart({ headless = true } = {}) {
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

    await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    const title = await page.title()
    if (/robot or human/i.test(title)) {
      console.log('[walmart] hit the bot-detection challenge page — skipping this run (best-effort source)')
      return []
    }

    await page.evaluate(() => window.scrollBy(0, 1200))
    await page.waitForTimeout(1000)

    const items = await page.$$eval('a[href*="/ip/"]', (anchors) => {
      const local = new Set()
      const out = []
      for (const a of anchors) {
        const href = a.href
        if (!href || local.has(href)) continue
        local.add(href)
        // Price + image often live in a sibling/ancestor tile, not inside the
        // link itself — read the whole tile's text, not just the anchor's.
        // [itemid] checked first: it's Walmart's own per-product boundary
        // marker (confirmed present on the anchor's immediate parent) and the
        // tightest guarantee this tile can't bleed a neighboring product's
        // price/text in. The looser selectors after it are a fallback only —
        // if Walmart's DOM ever wraps tiles in a shared <li>/<article> above
        // the [itemid] div, .closest() would climb past the correct boundary
        // into a container spanning multiple products (see the TCGplayer
        // cross-listing price bug this pattern is modeled after — same class
        // of "aggregate a container that isn't actually one product" risk).
        const tile =
          a.closest('[itemid], [data-item-id], li, div[role="group"], article') || a.parentElement
        const lines = (tile?.innerText || a.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean)
        const img = tile?.querySelector('img') || a.querySelector('img')
        out.push({ href, lines, img: img?.currentSrc || img?.src })
      }
      return out
    })

    for (const it of items) {
      if (seen.has(it.href) || !it.lines.length) continue
      // Walmart tile text mixes title, price ("current price $X.XX", plus a
      // raw sr-only "$16914"-style line), and noise (Add button, ratings,
      // shipping). Search the whole joined text for a clean $XX.XX price
      // rather than relying on one specific line matching.
      const joined = it.lines.join(' ')
      const priceMatch = joined.match(/current price \$?([\d,]+\.\d{2})/i) ?? joined.match(/\$([\d,]+\.\d{2})/)
      const title = (
        it.lines.find((l) => !/^\$/.test(l) && !/^current price/i.test(l) && !/^add$/i.test(l) && l.length > 8) ||
        it.lines[0]
      )
        ?.replace(/\s*\$[\d,]+\.\d{2}\s*$/, '')
        .trim()
      if (!title) continue
      const lower = title.toLowerCase()
      if (
        !lower.includes('dragon ball') &&
        !lower.includes('dragonball') &&
        !lower.includes('dbz') &&
        !lower.includes('dbs')
      )
        continue
      if (!SEALED_RE.test(title) || EXCLUDE_RE.test(title)) continue

      seen.add(it.href)
      listings.push({
        source: 'walmart',
        external_id: it.href.match(/\/ip\/[^/]+\/(\d+)/)?.[1] ?? it.href,
        title,
        url: it.href,
        price: priceMatch ? parsePrice(priceMatch[1]) : undefined,
        currency: 'USD',
        in_stock: true,
        image_url: it.img,
        seller: 'Walmart',
        set_name: detectSetName(title),
        product_type: detectProductType(title),
      })
    }

    console.log(`[walmart] ${listings.length} listing(s) found`)
  } catch (err) {
    console.error(`[walmart] failed: ${err.message}`)
  } finally {
    await browser.close()
  }

  return listings
}
