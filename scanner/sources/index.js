// Source registry. `browser: true` means the source drives Playwright (and for
// FB/OfferUp will need a saved session). Add OfferUp/Facebook here as built.
import { scrapeCraigslist } from './craigslist.js'
import { scrapeEbay } from './ebay.js'
import { scrapeFacebook } from './facebook.js'
import { scrapeLocalShops } from './local-shops.js'
import { scrapeTcgplayer } from './tcgplayer.js'
import { scrapeTrollAndToad } from './trollandtoad.js'

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
  facebook: {
    label: 'Facebook Marketplace (Birmingham)',
    browser: true,
    needsLogin: true, // run `node scanner/login.js facebook` once
    run: scrapeFacebook,
  },
  tcgplayer: {
    label: 'TCGplayer (sealed DBS — Fusion World)',
    browser: true,
    needsLogin: false,
    run: scrapeTcgplayer,
  },
  trollandtoad: {
    label: 'Troll & Toad (sealed DBS — Shopify)',
    browser: true,
    needsLogin: false,
    run: scrapeTrollAndToad,
  },
  local_shops: {
    label: 'Birmingham local shops (Gear Gaming, Card Addicts, Iron City Games)',
    browser: true,
    needsLogin: false,
    run: scrapeLocalShops,
  },
}
