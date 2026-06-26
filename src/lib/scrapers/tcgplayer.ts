import { ScrapedListing, Source } from '@/lib/types'

/**
 * TCGPlayer scraper
 *
 * STATUS: Stub — TCGPlayer renders via React/JS so full product data
 * requires either:
 *   (a) Official API — register at https://developer.tcgplayer.com
 *       Endpoint: POST https://api.tcgplayer.com/v1.39.0/catalog/products/search
 *       Auth: Bearer token from client credentials flow
 *   (b) Headless browser (Puppeteer / Playwright) for HTML scraping
 *
 * The function below attempts the public search URL and logs the response
 * size. It returns an empty array until an API key is wired in.
 */

const SEARCH_URL =
  'https://www.tcgplayer.com/search/dragon-ball-super-card-game/product' +
  '?productLineName=dragon-ball-super-card-game&q=sealed&view=grid&inStock=true'

// Search terms for when the official API is integrated
export const DBZ_SEARCH_TERMS = [
  'Dragon Ball Super Fusion World sealed booster box',
  'Dragon Ball Super Zenkai sealed booster box',
  'Dragon Ball Super Ultimate Deck',
  'Dragon Ball Z Score Entertainment sealed',
  'Dragon Ball Z Panini sealed booster box',
]

export async function scrapeTCGPlayer(): Promise<ScrapedListing[]> {
  if (process.env.TCGPLAYER_PUBLIC_KEY && process.env.TCGPLAYER_PRIVATE_KEY) {
    // TODO: Implement official API flow
    // 1. POST https://api.tcgplayer.com/token to get bearer token
    // 2. POST https://api.tcgplayer.com/v1.39.0/catalog/products/search
    //    with { "categoryId": 68, "productTypes": ["Sealed Product"] }
    // 3. Map response to ScrapedListing[]
    console.log('[tcgplayer] API keys present but integration not yet implemented.')
    return []
  }

  // Fallback: attempt public search page (will likely return empty without headless browser)
  try {
    const res = await fetch(SEARCH_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DBZ-TCG-Finder/1.0)',
        Accept: 'text/html',
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      throw new Error(`TCGPlayer responded with HTTP ${res.status}`)
    }

    const html = await res.text()
    console.log(`[tcgplayer] HTML scrape: ${html.length} bytes — requires headless browser for full parse`)

    // Look for any JSON-LD structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
    if (jsonLdMatch) {
      try {
        const data = JSON.parse(jsonLdMatch[1])
        console.log('[tcgplayer] JSON-LD found, keys:', Object.keys(data))
      } catch {
        // Not parseable
      }
    }
  } catch (err) {
    throw new Error(
      `TCGPlayer scraper failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  return []
}

// Helper used by the eBay + TnT scrapers too
export function detectSetName(title: string): string | undefined {
  const lower = title.toLowerCase()
  const sets: [string, string][] = [
    ['fusion world', 'Fusion World'],
    ['zenkai', 'Zenkai Series'],
    ['ultimate deck', 'Ultimate Deck'],
    ['cross spirits', 'Cross Spirits'],
    ['vicious rejuvenation', 'Vicious Rejuvenation'],
    ['realm of the gods', 'Realm of the Gods'],
    ['critical blow', 'Critical Blow'],
    ['fighter ambition', 'Fighter Ambition'],
    ['score entertainment', 'Score Entertainment (Vintage)'],
    ['panini', 'Panini America (2014-2015)'],
  ]
  for (const [key, val] of sets) {
    if (lower.includes(key)) return val
  }
  return undefined
}

export function detectProductType(title: string): ScrapedListing['product_type'] {
  const lower = title.toLowerCase()
  if (lower.includes('booster box') || lower.includes('display box')) return 'booster_box'
  if (lower.includes('booster pack')) return 'booster_pack'
  if (lower.includes(' case') || lower.includes('case of')) return 'case'
  if (lower.includes('bundle') || lower.includes('lot')) return 'bundle'
  return 'other'
}

// Silence unused import warning until API is implemented
export type { Source }
