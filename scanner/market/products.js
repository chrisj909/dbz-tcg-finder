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
  // Fixed: real titles say "Fighter's Ambition" / "Fighters Ambition" (apostrophe
  // or plural), never the exact phrase "fighter ambition" — match both words
  // independently instead of a fixed phrase. A same-named Zenkai-era (B19) set
  // also exists; most real listings for it don't self-identify as "zenkai" or
  // "b19" reliably enough to safely route separately, so rather than risk
  // matching a Zenkai box to this Fusion World price, we exclude anything that
  // DOES mention zenkai/b19 and accept those going unmatched (no price) over a
  // wrong one.
  { key: 'fw-fighter-ambition', label: 'Fusion World — FB06 Fighter Ambition Booster Box', query: 'dragon ball super fusion world fighter ambition booster box', must: ['fighter', 'ambition'], not: ['zenkai', 'b19'] },
  { key: 'fw-critical-blow',    label: 'Fusion World — FB07 Critical Blow Booster Box',    query: 'dragon ball super fusion world critical blow booster box',    must: ['critical blow'] },
  { key: 'fw-realm-of-gods',    label: 'Fusion World — FB08 Realm of the Gods Booster Box', query: 'dragon ball super fusion world realm of the gods booster box', must: ['realm of the gods'] },
  { key: 'fw-vicious-rejuvenation', label: 'Fusion World — FB09 Vicious Rejuvenation Booster Box', query: 'dragon ball super fusion world vicious rejuvenation booster box', must: ['vicious rejuvenation'] },
  { key: 'fw-cross-force',      label: 'Fusion World — FB10 Cross Force Booster Box',      query: 'dragon ball super fusion world cross force booster box',      must: ['cross force'], not: ['air'] },
  // Two entries, same key: real titles use either "Manga Booster 01" or "SB01"
  // phrasing — kept as separate must-sets rather than one, since `must` is
  // AND-only and can't express "either phrasing" in a single entry.
  { key: 'fw-manga-01',         label: 'Fusion World — SB01 Manga Booster 01 Box',         query: 'dragon ball super fusion world manga booster 01 booster box',   must: ['manga booster 01'] },
  { key: 'fw-manga-01',         label: 'Fusion World — SB01 Manga Booster 01 Box',         query: 'dragon ball super fusion world manga booster SB01 booster box', must: ['manga', 'sb01'] },
  { key: 'dbs-dual-evolution',     label: 'Dragon Ball Super — Dual Evolution Booster Box',     query: 'dragon ball super dual evolution booster box sealed',            must: ['dual evolution'] },
  { key: 'dbs-rivals-clash',       label: 'Dragon Ball Super — Rivals Clash Booster Box',       query: 'dragon ball super rivals clash booster box sealed',              must: ['rivals clash'] },
  { key: 'dbs-wish-shenron',       label: 'Dragon Ball Super — Wish For Shenron Booster Box',   query: 'dragon ball super wish for shenron booster box sealed',          must: ['shenron'], not: ['tag'] },
  // Two entries, same key: real titles use either "Manga Booster 02" or "SB02"
  // phrasing (see the fw-manga-01 comment above for why this is two entries).
  { key: 'dbs-manga-02',           label: 'Dragon Ball Super — Manga Booster 02 Booster Box',   query: 'dragon ball super manga booster 02 booster box sealed',          must: ['manga booster 02'] },
  { key: 'dbs-manga-02',           label: 'Dragon Ball Super — Manga Booster 02 Booster Box',   query: 'dragon ball super manga booster SB02 booster box sealed',        must: ['manga', 'sb02'] },
  { key: 'dbs-saiyans-pride',      label: "Dragon Ball Super — Saiyan's Pride Booster Box",     query: "dragon ball super saiyan's pride booster box sealed",            must: ['pride'], not: ['panini', 'legends'] },
  { key: 'dbs-story-booster-01',   label: 'Dragon Ball Super — Story Booster 01 Booster Box',   query: 'dragon ball super story booster 01 booster box sealed',          must: ['story booster'] },
  // --- Zenkai / Masters series (Bandai, 2017-2023, pre-Fusion-World "B##"/"BT##" numbering) ---
  { key: 'zenkai-union-force',      label: 'Zenkai — Union Force Booster Box (B02)',              query: 'dragon ball super union force booster box sealed',              must: ['union force'] },
  { key: 'zenkai-colossal-warfare', label: 'Zenkai — Colossal Warfare Booster Box (B04)',          query: 'dragon ball super colossal warfare booster box sealed',         must: ['colossal warfare'] },
  { key: 'zenkai-cross-spirits',    label: 'Zenkai — Cross Spirits Booster Box (B14)',             query: 'dragon ball super cross spirits booster box sealed',            must: ['cross spirits'] },
  { key: 'zenkai-saiyan-showdown',  label: 'Zenkai — Saiyan Showdown Booster Box (B15)',           query: 'dragon ball super saiyan showdown booster box sealed',          must: ['saiyan showdown'] },
  { key: 'zenkai-ultimate-squad',   label: 'Zenkai — Ultimate Squad Booster Box (B17)',            query: 'dragon ball super ultimate squad booster box sealed',           must: ['ultimate squad'] },
  { key: 'zenkai-dawn-z-legends',   label: 'Zenkai — Dawn of the Z-Legends Booster Box (B18)',     query: 'dragon ball super dawn of the z-legends booster box sealed',    must: ['z-legends'] },
  // Same name as the Fusion World FB06 set above (different era). Requiring
  // "zenkai" here — and excluding zenkai/b19 on the FW entry — keeps the two
  // from ever cross-matching; titles that say neither marker go unmatched by
  // both rather than risk a wrong price.
  { key: 'zenkai-fighter-ambition', label: 'Zenkai — Fighter Ambition Booster Box (B19)',         query: 'dragon ball super zenkai fighter ambition booster box sealed',  must: ['fighter', 'ambition', 'zenkai'] },
  { key: 'zenkai-power-absorbed',   label: 'Zenkai — Power Absorbed Booster Box (B20)',            query: 'dragon ball super power absorbed booster box sealed',           must: ['power absorbed'] },
  { key: 'zenkai-wild-resurgence',  label: 'Zenkai — Wild Resurgence Booster Box (Zenkai 04)',     query: 'dragon ball super zenkai wild resurgence booster box sealed',   must: ['wild resurgence'] },
  { key: 'zenkai-legend-dragon-balls', label: 'Zenkai — Legend of the Dragon Balls Booster Box (B25)', query: 'dragon ball super legend of the dragon balls booster box sealed', must: ['legend of the dragon balls'] },
  { key: 'zenkai-ultimate-advent',  label: 'Zenkai — Ultimate Advent Booster Box (B26)',           query: 'dragon ball super ultimate advent booster box sealed',          must: ['ultimate advent'] },
  { key: 'zenkai-history-of-z',     label: 'Zenkai — History of Z Booster Box (B27)',              query: 'dragon ball super history of z booster box sealed',             must: ['history of z'] },
  { key: 'zenkai-prismatic-clash',  label: 'Zenkai — Prismatic Clash Booster Box (B28)',           query: 'dragon ball super prismatic clash booster box sealed',          must: ['prismatic clash'] },
  { key: 'zenkai-fearsome-rivals',  label: 'Zenkai — Fearsome Rivals Booster Box (B29)',           query: 'dragon ball super fearsome rivals booster box sealed',          must: ['fearsome rivals'] },
  { key: 'zenkai-glorious-fighters', label: 'Zenkai — Three Glorious Fighters Booster Box (B30)',  query: 'dragon ball super three glorious fighters booster box sealed',  must: ['glorious fighters'] },
  { key: 'zenkai-beyond-dimensions', label: 'Zenkai — Impact Beyond Dimensions Booster Box (B31)', query: 'dragon ball super impact beyond dimensions booster box sealed', must: ['beyond dimensions'] },
  { key: 'zenkai-mythic-booster',   label: 'Zenkai — Mythic Booster Box (MB-01)',                  query: 'dragon ball super mythic booster box sealed',                   must: ['mythic booster'] },
  { key: 'zenkai-miraculous-revival', label: 'Zenkai — Miraculous Revival Booster Box (Series 5)', query: 'dragon ball super miraculous revival booster box sealed',       must: ['miraculous revival'] },
  { key: 'zenkai-supreme-rivalry',  label: 'Zenkai — Supreme Rivalry Booster Box (Series 13)',     query: 'dragon ball super supreme rivalry booster box sealed',          must: ['supreme rivalry'] },
  { key: 'zenkai-cross-worlds',     label: 'Zenkai — Cross Worlds Booster Box (Series 3)',         query: 'dragon ball super cross worlds booster box sealed',             must: ['cross worlds'] },
  { key: 'zenkai-malicious-machinations', label: 'Zenkai — Malicious Machinations Booster Box',    query: 'dragon ball super malicious machinations booster box sealed',   must: ['malicious machinations'] },
  { key: 'zenkai-assault-saiyans',  label: 'Zenkai — Assault of the Saiyans Booster Box',          query: 'dragon ball super assault of the saiyans booster box sealed',   must: ['assault of the saiyans'] },
  { key: 'zenkai-tournament-power', label: 'Zenkai — Tournament of Power Booster Box (TB01)',      query: 'dragon ball super tournament of power booster box sealed',      must: ['tournament of power'] },
  { key: 'zenkai-perfect-combination', label: 'Zenkai — Perfect Combination Booster Box',          query: 'dragon ball super perfect combination booster box sealed',      must: ['perfect combination'] },
  // Same name as the Panini "Galactic Battle" product below (unrelated,
  // different publisher/era) — exclude "panini" so they never cross-match.
  { key: 'zenkai-galactic-battle',  label: 'Zenkai — Galactic Battle Booster Box (B01)',           query: 'dragon ball super galactic battle booster box sealed',          must: ['galactic battle'], not: ['panini'] },
  // --- Panini (2014-2015) ---
  { key: 'panini-vengeance',       label: 'Panini — Vengeance Booster Box',       query: 'dragon ball z panini vengeance booster box',       must: ['vengeance'],  not: ['super'] },
  { key: 'panini-perfection',      label: 'Panini — Perfection Booster Box',      query: 'dragon ball z panini perfection booster box',      must: ['perfection'], not: ['super'] },
  { key: 'panini-heroes-villains', label: 'Panini — Heroes & Villains Booster Box', query: 'dragon ball z panini heroes and villains booster box', must: ['heroes', 'villains'] },
  { key: 'panini-evolution',       label: 'Panini — Evolution Booster Box',       query: 'dragon ball z panini evolution booster box',       must: ['evolution'],  not: ['fusion', 'super', 'dual'] },
  { key: 'panini-galactic-battle', label: 'Panini — Galactic Battle Booster Box', query: 'dragon ball z panini galactic battle booster box', must: ['galactic battle', 'panini'] },
  { key: 'panini-movie-collection', label: 'Panini — Movie Collection Booster Box', query: 'dragon ball z panini movie collection booster box', must: ['movie collection'] },
  { key: 'panini-awakening',       label: 'Panini — Awakening Booster Box',        query: 'dragon ball z panini awakening booster box',       must: ['awakening'], not: ['pulse'] },
  { key: 'panini-premier-base',    label: 'Panini — Premier Base Set Booster Box', query: 'dragon ball z panini premier base set booster box', must: ['base set'] },
  // --- Score / Score Entertainment (2000-2006) ---
  { key: 'score-frieza-saga',   label: 'Score — Frieza Saga Booster Box',   query: 'dragon ball z score frieza saga booster box',   must: ['frieza saga'] },
  { key: 'score-cell-games',    label: 'Score — Cell Games Booster Box',    query: 'dragon ball z score cell games booster box',    must: ['cell games'] },
  // Fixed: real titles often say "Androids Saga" (plural) — match both words
  // independently instead of the fixed singular phrase.
  { key: 'score-android-saga',  label: 'Score — Android Saga Booster Box',  query: 'dragon ball z score android saga booster box',  must: ['android', 'saga'] },
  { key: 'score-trunks-saga',   label: 'Score — Trunks Saga Booster Box',   query: 'dragon ball z score trunks saga booster box',   must: ['trunks saga'] },
  { key: 'score-saiyan-saga',   label: 'Score — Saiyan Saga Booster Box',   query: 'dragon ball z score saiyan saga booster box',   must: ['saiyan saga'] },
  { key: 'score-world-games-saga', label: 'Score — World Games Saga Booster Box', query: 'dragon ball z score world games saga booster box', must: ['world games saga'] },
  { key: 'score-buu-saga',      label: 'Score — Buu Saga Booster Box',      query: 'dragon ball z score buu saga booster box',      must: ['buu saga'] },
  { key: 'score-baby-saga',     label: 'Score — Baby Saga Booster Box',     query: 'dragon ball z score baby saga booster box',     must: ['baby saga'] },
  { key: 'score-senzu-blast',   label: 'Score — Senzu Blast Booster Box',   query: 'dragon ball z score senzu blast booster box',   must: ['senzu blast'] },
]

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Match a listing title to a product (all `must` terms present as whole words).
// Only the LEFT edge is word-bounded (\bterm, not \bterm\b) so plurals and
// possessives after a term still match — "fighter" matches inside "Fighters"
// and "Fighter's" — while "excellent" still correctly rejects the 'cell' term
// (no boundary before the 'c' in "excellent" either way).
export function matchProduct(title = '') {
  const t = title.toLowerCase()
  for (const p of PRODUCTS) {
    if (p.not && p.not.some((n) => new RegExp(`\\b${escape(n)}`).test(t))) continue
    if (p.must.every((m) => new RegExp(`\\b${escape(m)}`).test(t))) return p
  }
  return null
}
