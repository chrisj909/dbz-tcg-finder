import { ScrapedListing, Source } from '@/lib/types'
import { detectSetName, detectProductType } from './tcgplayer'

/**
 * eBay scraper — uses the eBay Finding API (free tier)
 *
 * STATUS: Functional once EBAY_APP_ID is set.
 *
 * Setup:
 *   1. Register at https://developer.ebay.com
 *   2. Create a production app to get an App ID (Client ID)
 *   3. Add EBAY_APP_ID to your environment variables
 *
 * The Finding API is free, requires no OAuth for read operations,
 * and returns up to 100 results per request.
 */

const EBAY_FINDING_API =
  'https://svcs.ebay.com/services/search/FindingService/v1'

const SEARCH_TERMS = [
  'Dragon Ball Super sealed booster box',
  'Dragon Ball Super Fusion World sealed',
  'Dragon Ball Super Zenkai Series sealed',
  'Dragon Ball Z sealed booster box vintage Score',
  'Dragon Ball Z Panini TCG sealed',
]

export async function scrapeEbay(): Promise<ScrapedListing[]> {
  const appId = process.env.EBAY_APP_ID
  if (!appId) {
    console.log('[ebay] EBAY_APP_ID not set — skipping. Register at https://developer.ebay.com')
    return []
  }

  const listings: ScrapedListing[] = []

  for (const term of SEARCH_TERMS) {
    try {
      const url = new URL(EBAY_FINDING_API)
      url.searchParams.set('OPERATION-NAME', 'findItemsByKeywords')
      url.searchParams.set('SERVICE-VERSION', '1.0.0')
      url.searchParams.set('SECURITY-APPNAME', appId)
      url.searchParams.set('RESPONSE-DATA-FORMAT', 'JSON')
      url.searchParams.set('keywords', term)
      url.searchParams.set('itemFilter(0).name', 'ListingType')
      url.searchParams.set('itemFilter(0).value', 'FixedPrice')
      url.searchParams.set('itemFilter(1).name', 'Condition')
      url.searchParams.set('itemFilter(1).value', '1000') // New
      url.searchParams.set('sortOrder', 'StartTimeNewest')
      url.searchParams.set('paginationInput.entriesPerPage', '50')

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'DBZ-TCG-Finder/1.0' },
        next: { revalidate: 0 },
      })

      if (!res.ok) throw new Error(`eBay API returned HTTP ${res.status}`)

      const json = await res.json()
      const items: EbayItem[] =
        json?.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item ?? []

      for (const item of items) {
        const parsed = parseEbayItem(item)
        if (parsed) listings.push(parsed)
      }
    } catch (err) {
      console.error(`[ebay] Error searching "${term}":`, err)
    }
  }

  // Deduplicate by itemId
  const seen = new Set<string>()
  return listings.filter((l) => {
    if (seen.has(l.external_id)) return false
    seen.add(l.external_id)
    return true
  })
}

type EbayItem = Record<string, unknown[]>

function parseEbayItem(item: EbayItem): ScrapedListing | null {
  try {
    const get = <T>(key: string): T | undefined =>
      (item[key] as T[] | undefined)?.[0]

    const title = String(get<string>('title') ?? '')
    const externalId = String(get<string>('itemId') ?? '')
    const url = String(get<string>('viewItemURL') ?? '')

    if (!externalId || !url) return null

    const sellingStatus = get<EbayItem>('sellingStatus')
    const currentPriceObj = sellingStatus?.['currentPrice']?.[0] as
      | Record<string, unknown>
      | undefined
    const price = currentPriceObj
      ? parseFloat(String(currentPriceObj['__value__'] ?? '0'))
      : undefined

    const galleryURL = String(get<string>('galleryURL') ?? '')
    const sellerInfo = get<EbayItem>('sellerInfo')
    const seller = String(sellerInfo?.['sellerUserName']?.[0] ?? '')

    return {
      source: 'ebay' as Source,
      external_id: externalId,
      title,
      set_name: detectSetName(title),
      product_type: detectProductType(title),
      price: price && !isNaN(price) ? price : undefined,
      currency: 'USD',
      condition: 'new',
      in_stock: true,
      url,
      image_url: galleryURL || undefined,
      seller: seller || undefined,
    }
  } catch {
    return null
  }
}
