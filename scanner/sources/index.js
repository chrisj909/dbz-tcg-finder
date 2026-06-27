// Source registry. `browser: true` means the source drives Playwright (and for
// FB/OfferUp will need a saved session). Add eBay/OfferUp/Facebook here as built.
import { scrapeCraigslist } from './craigslist.js'

export const sources = {
  craigslist: {
    label: 'Craigslist (Birmingham, AL)',
    browser: true,
    needsLogin: false,
    run: scrapeCraigslist,
  },
}
