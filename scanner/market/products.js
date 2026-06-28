// Curated sealed products + how to recognize each in a listing title.
// Shared by market.js (which scrapes eBay SOLD per product) and deal-score.js
// (which matches live listings to the right benchmark). `must` = lowercase terms
// that must ALL appear (as whole words) in a title for it to be this product.
export const PRODUCTS = [
  { key: 'fw-awakened-pulse', label: 'Fusion World — Awakened Pulse (FB01) Booster Box', query: 'dragon ball super fusion world awakened pulse booster box', must: ['awakened'] },
  { key: 'fw-blazing-aura', label: 'Fusion World — Blazing Aura (FB02) Booster Box', query: 'dragon ball super fusion world blazing aura booster box', must: ['blazing'] },
  { key: 'fw-raging-roar', label: 'Fusion World — Raging Roar (FB03) Booster Box', query: 'dragon ball super fusion world raging roar booster box', must: ['raging'] },
  { key: 'fw-fighters-ambition', label: "Fusion World — Fighter's Ambition Booster Box", query: "dragon ball super fusion world fighter's ambition booster box", must: ['ambition'] },
  { key: 'panini-vengeance', label: 'Panini — Vengeance Booster Box', query: 'dragon ball z panini vengeance booster box', must: ['vengeance'] },
  { key: 'panini-perfection', label: 'Panini — Perfection Booster Box', query: 'dragon ball z panini perfection booster box', must: ['perfection'] },
  { key: 'panini-heroes-villains', label: 'Panini — Heroes & Villains Booster Box', query: 'dragon ball z panini heroes and villains booster box', must: ['heroes'] },
  { key: 'panini-evolution', label: 'Panini — Evolution Booster Box', query: 'dragon ball z panini evolution booster box', must: ['panini', 'evolution'] },
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
    if (p.must.every((m) => new RegExp(`\\b${escape(m)}\\b`).test(t))) return p
  }
  return null
}
