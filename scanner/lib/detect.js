// Detection + parsing helpers shared by all sources.
// Maps free-text titles to the structured fields in the `listings` table.

const SETS = [
  ['fusion world', 'Fusion World'],
  ['zenkai', 'Zenkai Series'],
  ['ultimate deck', 'Ultimate Deck'],
  ['cross spirits', 'Cross Spirits'],
  ['vicious rejuvenation', 'Vicious Rejuvenation'],
  ['realm of the gods', 'Realm of the Gods'],
  ['critical blow', 'Critical Blow'],
  ['fighter ambition', 'Fighter Ambition'],
  ['score', 'Score (Vintage)'],
  ['panini', 'Panini (2014-2015)'],
]

export function detectSetName(title = '') {
  const t = title.toLowerCase()
  for (const [key, val] of SETS) if (t.includes(key)) return val
  return undefined
}

// Coarse era bucket (used by Phase 4 once the column exists).
export function detectEra(title = '') {
  const t = title.toLowerCase()
  if (/fusion world|zenkai|super card game|dbscg|bandai/.test(t)) return 'bandai_super'
  if (t.includes('panini')) return 'panini'
  if (t.includes('score')) return 'score'
  return undefined
}

// Sanity check: does this title actually mention Dragon Ball? Sources that
// rely on a marketplace's own category/franchise filter or search scoping
// (e.g. GameStop's "franchise=Dragon Ball" facet, TCGplayer's product-line
// URL) have been observed leaking unrelated product (Pokemon showed up in
// GameStop's "Dragon Ball" category) — never trust that filtering alone.
// Call this on every scraped title before keeping the listing.
export function isDragonBallTitle(title = '') {
  const t = title.toLowerCase()
  return (
    t.includes('dragon ball') ||
    t.includes('dragonball') ||
    /\bdbz\b/.test(t) ||
    /\bdbs\b/.test(t)
  )
}

export function detectProductType(title = '') {
  const t = title.toLowerCase()
  // Check case before booster_box: "Booster Box Case" is a case (of boxes), not a box.
  if (/\bcase\b|case of/.test(t)) return 'case'
  if (/(booster|display)\s*box|booster display/.test(t)) return 'booster_box'
  if (/booster pack/.test(t)) return 'booster_pack'
  if (/\bbundle\b|\blot\b/.test(t)) return 'bundle'
  return 'other'
}

const SEALED_HINTS = [
  'sealed', 'booster box', 'booster pack', 'display', 'case',
  'starter deck', 'factory sealed', 'unopened',
]
// tcg_sealed vs merch — best-effort (the `category` column lands in Phase 4).
export function detectCategory(title = '') {
  const t = title.toLowerCase()
  return SEALED_HINTS.some((h) => t.includes(h)) ? 'tcg_sealed' : 'merch'
}

export function parsePrice(text) {
  if (text == null) return undefined
  const m = String(text).replace(/,/g, '').match(/(\d+(?:\.\d{1,2})?)/)
  if (!m) return undefined
  const n = parseFloat(m[1])
  return Number.isFinite(n) ? n : undefined
}

// Craigslist meta strings look like "5/14Calera" or "6/23Florence".
export function parseCraigslistMeta(meta = '') {
  const m = meta.match(/^(\d{1,2}\/\d{1,2})\s*(.*)$/)
  if (m) return { date: m[1], location: m[2].trim() || undefined }
  return { date: undefined, location: meta.trim() || undefined }
}
