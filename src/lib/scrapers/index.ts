import { ScrapedListing } from '@/lib/types'
import { scrapeTCGPlayer } from './tcgplayer'
import { scrapeEbay } from './ebay'
import { scrapeTrollAndToad } from './trollandtoad'

interface ScraperResult {
  source: string
  listings: ScrapedListing[]
}

export async function runAllScrapers(): Promise<{
  listings: ScrapedListing[]
  sourceErrors: string[]
  sources: string[]
}> {
  // Run all scrapers concurrently; one failure does not abort the others
  const results = await Promise.allSettled([
    scrapeTCGPlayer().then((l): ScraperResult => ({ source: 'tcgplayer', listings: l })),
    scrapeEbay().then((l): ScraperResult => ({ source: 'ebay', listings: l })),
    scrapeTrollAndToad().then((l): ScraperResult => ({ source: 'trollandtoad', listings: l })),
  ])

  const listings: ScrapedListing[] = []
  const sourceErrors: string[] = []
  const sources: string[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      listings.push(...result.value.listings)
      sources.push(result.value.source)
      console.log(`[scrapers] ${result.value.source}: ${result.value.listings.length} listings`)
    } else {
      const msg = result.reason instanceof Error ? result.reason.message : String(result.reason)
      sourceErrors.push(msg)
      console.error(`[scrapers] Source failed:`, msg)
    }
  }

  return { listings, sourceErrors, sources }
}
