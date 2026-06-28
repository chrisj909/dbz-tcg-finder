// Source registry. `browser: true` means the source drives Playwright (and for
// FB/OfferUp will need a saved session). Add OfferUp/Facebook here as built.
import { scrapeCraigslist } from './craigslist.js'
import { scrapeEbay } from './ebay.js'

export const sources = {
  // eBay first — the core sealed-product source (national inventory).
  ebay: {
    label: 'eBay (sealed DBZ — search scrape)',
    browser: true,
    needsLogin: false,
    run: scrapeEbay,
  },
  craigslist: {
    label: 'Craigslist (Birmingham, AL)',
    browser: true,
    needsLogin: false,
    run: scrapeCraigslist,
  },
}
