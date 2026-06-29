// One-time login to capture a saved browser session for sources that need it
// (Facebook Marketplace, OfferUp). Opens a REAL browser window — YOU log in with
// YOUR OWN credentials (this script never sees, types, or stores them) — then it
// saves the resulting session to scanner/.auth/<site>.json (gitignored) so the
// scanner can reuse it headlessly.
//
//   node scanner/login.js            # facebook (default)
//   node scanner/login.js offerup
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const SITES = {
  facebook: {
    loginUrl: 'https://www.facebook.com/login',
    cookie: 'c_user', // FB sets this to your user id once you're logged in
    note: 'Log in with your PERSONAL profile — Marketplace is NOT available to Pages.',
  },
  offerup: {
    loginUrl: 'https://offerup.com/login',
    note: 'Log in to OfferUp (set your location to Birmingham, AL).',
    // Detect success by URL: a successful login redirects away from /login
    detectUrl: (url) => url.includes('offerup.com') && !url.includes('/login'),
  },
}

const site = process.argv[2] || 'facebook'
const cfg = SITES[site]
if (!cfg) {
  console.error(`Unknown site "${site}". Options: ${Object.keys(SITES).join(', ')}`)
  process.exit(1)
}

const authPath = fileURLToPath(new URL(`./.auth/${site}.json`, import.meta.url))

const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] })
const ctx = await browser.newContext({ viewport: null })
const page = await ctx.newPage()
await page.goto(cfg.loginUrl)

console.log(`\n=== ${site.toUpperCase()} LOGIN ===`)
console.log(cfg.note)
console.log('Waiting up to 8 minutes for you to finish logging in...\n')

const deadline = Date.now() + 8 * 60 * 1000
let ok = false
while (Date.now() < deadline) {
  if (cfg.detectUrl) {
    // URL-based detection: login succeeded when the page navigates away from /login
    if (cfg.detectUrl(page.url())) { ok = true; break }
  } else if (cfg.cookie) {
    const cookies = await ctx.cookies()
    const match = cookies.find((c) => c.name === cfg.cookie && c.value)
    if (match) {
      const valid = cfg.validate ? cfg.validate(match.value) : true
      if (valid) { ok = true; break }
    }
  }
  await page.waitForTimeout(3000)
}

if (!ok) {
  console.error('Timed out waiting for login. Re-run when ready.')
  await browser.close()
  process.exit(1)
}

// brief settle so the session is fully established
await page.waitForTimeout(2000)
mkdirSync(dirname(authPath), { recursive: true })
await ctx.storageState({ path: authPath })
console.log(`\nSaved ${site} session -> scanner/.auth/${site}.json`)
await browser.close()
