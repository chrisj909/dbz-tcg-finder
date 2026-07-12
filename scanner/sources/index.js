// Source registry. `browser: true` means the source drives Playwright (and for
// FB/OfferUp will need a saved session). Add OfferUp/Facebook here as built.
import { scrapeBestBuy } from './bestbuy.js'
import { scrapeCraigslist } from './craigslist.js'
import { scrapeDaveAndAdams } from './daveandadams.js'
import { scrapeEbay } from './ebay.js'
import { scrapeFacebook } from './facebook.js'
import { scrapeGamestop } from './gamestop.js'
import { scrapeLocalShops } from './local-shops.js'
import { scrapeMercari } from './mercari.js'
import { scrapeMiniatureMarket } from './miniaturemarket.js'
import { scrapeOfferUp } from './offerup.js'
import { scrapeTcgplayer } from './tcgplayer.js'
import { scrapeTopCutComics } from './topcutcomics.js'
import { scrapeTrollAndToad } from './trollandtoad.js'
import { scrapeWalmart } from './walmart.js'
import { scrape401Games } from './401games.js'

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
  mercari: {
    label: 'Mercari (sealed DBZ — national)',
    browser: true,
    needsLogin: false,
    run: scrapeMercari,
  },
  offerup: {
    label: 'OfferUp (Birmingham area)',
    browser: true,
    needsLogin: true, // run `node scanner/login.js offerup` once
    run: scrapeOfferUp,
  },
  local_shops: {
    label: 'Birmingham local shops (Gear Gaming, Card Addicts, Iron City Games)',
    browser: true,
    needsLogin: false,
    run: scrapeLocalShops,
  },
  bestbuy: {
    label: 'Best Buy (official Products API — needs BESTBUY_API_KEY)',
    browser: false,
    needsLogin: false,
    run: scrapeBestBuy,
  },
  gamestop: {
    label: 'GameStop (national — best-effort, Imperva bot protection)',
    browser: true,
    needsLogin: false,
    run: scrapeGamestop,
  },
  walmart: {
    label: 'Walmart (national — best-effort, Akamai + PerimeterX bot protection)',
    browser: true,
    needsLogin: false,
    run: scrapeWalmart,
  },
  topcutcomics: {
    label: 'Top Cut Comics (Shopify)',
    browser: true,
    needsLogin: false,
    run: scrapeTopCutComics,
  },
  miniaturemarket: {
    label: 'Miniature Market (national specialty shop)',
    browser: true,
    needsLogin: false,
    run: scrapeMiniatureMarket,
  },
  daveandadams: {
    label: "Dave & Adam's Card World (national specialty shop)",
    browser: true,
    needsLogin: false,
    run: scrapeDaveAndAdams,
  },
  '401games': {
    label: '401 Games (Canadian, ships to US — Shopify)',
    browser: true,
    needsLogin: false,
    run: scrape401Games,
  },
}
