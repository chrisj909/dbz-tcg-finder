import { ScrapedListing, Source } from '@/lib/types'
import { detectSetName, detectProductType } from './tcgplayer'

/**
 * Troll and Toad scraper — public HTML scrape (no API)
 *
 * STATUS: Functional — parses product cards from their sealed product page.
 * May break if Troll and Toad updates their HTML structure.
 *
 * Before deploying to production, review:
 *   - robots.txt: https://www.trollandtoad.com/robots.txt
 *   - Terms of Service: https://www.trollandtoad.com/info/terms-of-use
 * Add a reasonable delay between requests and respect crawl-delay directives.
 */

const BASE_URL = 'https://www.trollandtoad.com'
const SEARCH_URLS = [
  `${BASE_URL}/dragon-ball-super/all-sealed-product/`,
  `${BASE_URL}/dragon-ball-z/all-sealed-product/`,
]

export async function scrapeTrollAndToad(): Promise<ScrapedListing[]> {
  const allListings: ScrapedListing[] = []

  for (const url of SEARCH_URLS) {
    try {
      const listings = await scrapeUrl(url)
      allListings.push(...listings)
    } catch (err) {
      console.error(`[trollandtoad] Error scraping ${url}:`, err)
    }
  }

  // Deduplicate
  const seen = new Set<string>()
  return allListings.filter((l) => {
    if (seen.has(l.external_id)) return false
    seen.add(l.external_id)
    return true
  })
}

async function scrapeUrl(url: string): Promise<ScrapedListing[]> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DBZ-TCG-Finder/1.0; +https://github.com/chrisj909/dbz-tcg-finder)',
      Accept: 'text/html,application/xhtml+xml',
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`Troll and Toad returned HTTP ${res.status} for ${url}`)
  }

  const html = await res.text()
  return parseProductListings(html)
}

function parseProductListings(html: string): ScrapedListing[] {
  const listings: ScrapedListing[] = []

  // Troll and Toad product cards — pattern targets the product-col containers
  // Each card has: product name, price, stock status, image, and link
  const cardPattern = /class="[^"]*product-col[^"]*"[\s\S]*?(?=class="[^"]*product-col[^"]*"|$)/g
  const cards = html.match(cardPattern) ?? []

  for (const card of cards) {
    try {
      const listing = parseProductCard(card)
      if (listing) listings.push(listing)
    } catch {
      // Skip malformed cards
    }
  }

  // Fallback: try JSON-LD structured data
  if (listings.length === 0) {
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1])
        if (data['@type'] === 'Product' || Array.isArray(data['@graph'])) {
          console.log('[trollandtoad] Found JSON-LD structured data — extend parser here')
        }
      } catch {
        // Not parseable
      }
    }
  }

  console.log(`[trollandtoad] Parsed ${listings.length} listings from HTML`)
  return listings
}

function parseProductCard(card: string): ScrapedListing | null {
  // Extract product name
  const nameMatch =
    card.match(/class="[^"]*product-name[^"]*"[^>]*>([^<]+)</) ??
    card.match(/title="([^"]+)"/)
  if (!nameMatch) return null
  const title = nameMatch[1].trim()
  if (!title) return null

  // Extract URL and ID
  const linkMatch = card.match(/href="(\/[^"]+)"/)
  if (!linkMatch) return null
  const url = `${BASE_URL}${linkMatch[1]}`
  const idMatch = linkMatch[1].match(/\/(\d+)\/?/)
  const externalId = idMatch?.[1] ?? linkMatch[1]

  // Extract price
  const priceMatch = card.match(/\$ *([\d,]+\.?\d*)/)
  const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : undefined

  // Extract image
  const imgMatch = card.match(/<img[^>]+src="([^"]+)"/)
  const imageUrl = imgMatch?.[1]

  // Check stock status
  const outOfStock =
    card.toLowerCase().includes('out of stock') ||
    card.toLowerCase().includes('sold out') ||
    card.includes('outofstock')

  return {
    source: 'trollandtoad' as Source,
    external_id: externalId,
    title,
    set_name: detectSetName(title),
    product_type: detectProductType(title),
    price,
    currency: 'USD',
    condition: 'new',
    in_stock: !outOfStock,
    url,
    image_url: imageUrl,
    seller: 'Troll and Toad',
  }
}
