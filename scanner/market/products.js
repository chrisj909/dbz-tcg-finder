// Curated sealed products + how to recognize each in a listing title.
// Shared by market.js (eBay SOLD benchmarks), market-tcgplayer.js (TCGplayer
// market prices), and deal-score.js (matches live listings to benchmarks).
//
// `must`  = lowercase terms that must ALL appear as whole words in a title.
//           Multi-word phrases work: \bblazing aura\b matches "Blazing Aura".
// `not`   = disqualifying terms (any match = skip).
// `query` = eBay SOLD search string (used by market.js only).
export const PRODUCTS = [
  // --- Fusion World (Bandai, 2023-present) ---
  { key: 'fw-awakened-pulse',   label: 'Fusion World — FB01 Awakened Pulse Booster Box',   query: 'dragon ball super fusion world awakened pulse booster box',   must: ['awakened pulse'] },
  { key: 'fw-blazing-aura',     label: 'Fusion World — FB02 Blazing Aura Booster Box',     query: 'dragon ball super fusion world blazing aura booster box',     must: ['blazing aura'] },
  { key: 'fw-raging-roar',      label: 'Fusion World — FB03 Raging Roar Booster Box',      query: 'dragon ball super fusion world raging roar booster box',      must: ['raging roar'] },
  { key: 'fw-ultra-limit',      label: 'Fusion World — FB04 Ultra Limit Booster Box',      query: 'dragon ball super fusion world ultra limit booster box',      must: ['ultra limit'] },
  { key: 'fw-new-adventure',    label: 'Fusion World — FB05 New Adventure Booster Box',    query: 'dragon ball super fusion world new adventure booster box',    must: ['new adventure'] },
  { key: 'fw-fighter-ambition', label: 'Fusion World — FB06 Fighter Ambition Booster Box', query: 'dragon ball super fusion world fighter ambition booster box', must: ['fighter ambition'] },
  { key: 'fw-critical-blow',    label: 'Fusion World — FB07 Critical Blow Booster Box',    query: 'dragon ball super fusion world critical blow booster box',    must: ['critical blow'] },
  { key: 'fw-realm-of-gods',    label: 'Fusion World — FB08 Realm of the Gods Booster Box', query: 'dragon ball super fusion world realm of the gods booster box', must: ['realm of the gods'] },
  { key: 'fw-vicious-rejuvenation', label: 'Fusion World — FB09 Vicious Rejuvenation Booster Box', query: 'dragon ball super fusion world vicious rejuvenation booster box', must: ['vicious rejuvenation'] },
  { key: 'fw-cross-force',      label: 'Fusion World — FB10 Cross Force Booster Box',      query: 'dragon ball super fusion world cross force booster box',      must: ['cross force'], not: ['air'] },
  { key: 'dbs-dual-evolution',     label: 'Dragon Ball Super — Dual Evolution Booster Box',     query: 'dragon ball super dual evolution booster box sealed',            must: ['dual evolution'] },
  { key: 'dbs-rivals-clash',       label: 'Dragon Ball Super — Rivals Clash Booster Box',       query: 'dragon ball super rivals clash booster box sealed',              must: ['rivals clash'] },
  { key: 'dbs-wish-shenron',       label: 'Dragon Ball Super — Wish For Shenron Booster Box',   query: 'dragon ball super wish for shenron booster box sealed',          must: ['shenron'], not: ['tag'] },
  { key: 'dbs-manga-02',           label: 'Dragon Ball Super — Manga Booster 02 Booster Box',   query: 'dragon ball super manga booster 02 booster box sealed',          must: ['manga booster 02'] },
  { key: 'dbs-saiyans-pride',      label: "Dragon Ball Super — Saiyan's Pride Booster Box",     query: "dragon ball super saiyan's pride booster box sealed",            must: ['pride'], not: ['panini', 'legends'] },
  { key: 'dbs-story-booster-01',   label: 'Dragon Ball Super — Story Booster 01 Booster Box',   query: 'dragon ball super story booster 01 booster box sealed',          must: ['story booster'] },
  // --- Panini (2014-2015) ---
  { key: 'panini-vengeance',       label: 'Panini — Vengeance Booster Box',       query: 'dragon ball z panini vengeance booster box',       must: ['vengeance'],  not: ['super'] },
  { key: 'panini-perfection',      label: 'Panini — Perfection Booster Box',      query: 'dragon ball z panini perfection booster box',      must: ['perfection'], not: ['super'] },
  { key: 'panini-heroes-villains', label: 'Panini — Heroes & Villains Booster Box', query: 'dragon ball z panini heroes and villains booster box', must: ['heroes', 'villains'] },
  { key: 'panini-evolution',       label: 'Panini — Evolution Booster Box',       query: 'dragon ball z panini evolution booster box',       must: ['evolution'],  not: ['fusion', 'super', 'dual'] },
  { key: 'panini-galactic-battle', label: 'Panini — Galactic Battle Booster Box', query: 'dragon ball z panini galactic battle booster box', must: ['galactic battle'] },
  // --- Score / Score Entertainment (2000-2006) ---
  { key: 'score-frieza-saga',   label: 'Score — Frieza Saga Booster Box',   query: 'dragon ball z score frieza saga booster box',   must: ['frieza saga'] },
  { key: 'score-cell-games',    label: 'Score — Cell Games Booster Box',    query: 'dragon ball z score cell games booster box',    must: ['cell games'] },
  { key: 'score-android-saga',  label: 'Score — Android Saga Booster Box',  query: 'dragon ball z score android saga booster box',  must: ['android saga'] },
  { key: 'score-trunks-saga',   label: 'Score — Trunks Saga Booster Box',   query: 'dragon ball z score trunks saga booster box',   must: ['trunks saga'] },
  { key: 'score-saiyan-saga',   label: 'Score — Saiyan Saga Booster Box',   query: 'dragon ball z score saiyan saga booster box',   must: ['saiyan saga'] },
]

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Match a listing title to a product (all `must` terms present as whole words).
// Whole-word matching avoids e.g. "excellent" matching the 'cell' term.
export function matchProduct(title = '') {
  const t = title.toLowerCase()
  for (const p of PRODUCTS) {
    if (p.not && p.not.some((n) => new RegExp(`\\b${escape(n)}\\b`).test(t))) continue
    if (p.must.every((m) => new RegExp(`\\b${escape(m)}\\b`).test(t))) return p
  }
  return null
}
