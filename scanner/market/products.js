// Curated sealed products + how to recognize each in a listing title.
// Shared by market.js (which scrapes eBay SOLD per product) and deal-score.js
// (which matches live listings to the right benchmark). `must` = lowercase terms
// that must ALL appear (as whole words) in a title; optional `not` = disqualifying terms.
export const PRODUCTS = [
  { key: 'fw-awakened-pulse', label: 'Fusion World — FB01 Awakened Pulse Booster Box', query: 'dragon ball super fusion world fb01 awakened pulse booster box', must: ['fb01'] },
  { key: 'fw-blazing-aura', label: 'Fusion World — Blazing Aura (FB02) Booster Box', query: 'dragon ball super fusion world blazing aura booster box', must: ['blazing'] },
  { key: 'fw-raging-roar', label: 'Fusion World — Raging Roar (FB03) Booster Box', query: 'dragon ball super fusion world raging roar booster box', must: ['raging'] },
  { key: 'fw-ultra-limit', label: 'Fusion World — FB04 Ultra Limit Booster Box', query: 'dragon ball super fusion world fb04 ultra limit booster box', must: ['fb04'] },
  { key: 'fw-new-adventure', label: 'Fusion World — FB05 New Adventure Booster Box', query: 'dragon ball super fusion world fb05 new adventure booster box', must: ['fb05'] },
  { key: 'panini-vengeance', label: 'Panini — Vengeance Booster Box', query: 'dragon ball z panini vengeance booster box', must: ['vengeance'] },
  { key: 'panini-perfection', label: 'Panini — Perfection Booster Box', query: 'dragon ball z panini perfection booster box', must: ['perfection'] },
  { key: 'panini-heroes-villains', label: 'Panini — Heroes & Villains Booster Box', query: 'dragon ball z panini heroes and villains booster box', must: ['heroes'] },
  { key: 'panini-evolution', label: 'Panini — Evolution Booster Box', query: 'dragon ball z panini evolution booster box', must: ['evolution'], not: ['fusion', 'super'] },
  { key: 'score-frieza-saga', label: 'Score — Frieza Saga Booster Box', query: 'dragon ball z score frieza saga booster box', must: ['frieza'] },
  { key: 'score-cell-games', label: 'Score — Cell Games Booster Box', query: 'dragon ball z score cell games booster box', must: ['cell'] },
  { key: 'score-android-saga', label: 'Score — Android Saga Booster Box', query: 'dragon ball z score android saga booster box', must: ['android'] },
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
