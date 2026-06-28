'use client'

// Interactive dashboard (#12). The server fetches all active listings once;
// everything below — search, multi-facet filters, sort — runs client-side for
// instant feedback (no page reloads). Filters are combinable; chips reflect the
// facets actually present in the data.
import { useMemo, useState } from 'react'
import { Listing } from '@/lib/types'
import InventoryCard from './InventoryCard'

const SORTS: { key: string; label: string }[] = [
  { key: 'new', label: 'Newest' },
  { key: 'price_desc', label: 'Price: High → Low' },
  { key: 'price_asc', label: 'Price: Low → High' },
  { key: 'deal', label: 'Best deal' },
  { key: 'value', label: 'Market value' },
]

const SOURCE_LABELS: Record<string, string> = {
  ebay: 'eBay',
  tcgplayer: 'TCGplayer',
  facebook: 'Facebook',
  craigslist: 'Craigslist',
  offerup: 'OfferUp',
  mercari: 'Mercari',
  trollandtoad: 'Troll & Toad',
}
const TYPE_LABELS: Record<string, string> = {
  booster_box: 'Booster Box',
  case: 'Case',
  bundle: 'Bundle',
  booster_pack: 'Booster Pack',
  other: 'Other',
}

// Neon returns numeric columns as strings — coerce before any math/compare.
const num = (v: unknown): number | null => (v == null ? null : Number(v))

export default function DashboardClient({ listings }: { listings: Listing[] }) {
  const [query, setQuery] = useState('')
  const [sources, setSources] = useState<Set<string>>(new Set())
  const [types, setTypes] = useState<Set<string>>(new Set())
  const [dealsOnly, setDealsOnly] = useState(false)
  const [sort, setSort] = useState('new')

  // Facets present in the data, so chips only show what actually exists.
  const sourceOpts = useMemo(
    () => Array.from(new Set(listings.map((l) => l.source))).sort(),
    [listings],
  )
  const typeOpts = useMemo(() => {
    const s = new Set<string>()
    for (const l of listings) if (l.product_type) s.add(l.product_type)
    return Array.from(s).sort()
  }, [listings])

  const toggle = (set: Set<string>, val: string) => {
    const next = new Set(set)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    return next
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = listings.filter((l) => {
      if (q && !`${l.title} ${l.set_name ?? ''}`.toLowerCase().includes(q)) return false
      if (sources.size && !sources.has(l.source)) return false
      if (types.size && !(l.product_type && types.has(l.product_type))) return false
      if (dealsOnly) {
        const ds = num(l.deal_score)
        if (ds == null || ds <= 5) return false
      }
      return true
    })
    return [...rows].sort((a, b) => {
      switch (sort) {
        case 'price_asc':
          return (num(a.price) ?? Infinity) - (num(b.price) ?? Infinity)
        case 'price_desc':
          return (num(b.price) ?? -Infinity) - (num(a.price) ?? -Infinity)
        case 'deal':
          return (num(b.deal_score) ?? -Infinity) - (num(a.deal_score) ?? -Infinity)
        case 'value':
          return (num(b.market_value) ?? -Infinity) - (num(a.market_value) ?? -Infinity)
        default:
          return new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime()
      }
    })
  }, [listings, query, sources, types, dealsOnly, sort])

  const hasFilters = Boolean(query) || sources.size > 0 || types.size > 0 || dealsOnly || sort !== 'new'
  const reset = () => {
    setQuery('')
    setSources(new Set())
    setTypes(new Set())
    setDealsOnly(false)
    setSort('new')
  }

  const chip = (active: boolean, accent: 'orange' | 'blue') =>
    `px-3 py-1 rounded-full text-sm border transition-colors ${
      active
        ? accent === 'orange'
          ? 'bg-orange-600 border-orange-500 text-white'
          : 'bg-blue-600 border-blue-500 text-white'
        : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
    }`

  return (
    <div>
      <div className="mt-6 mb-6 space-y-3">
        {/* Search + sort */}
        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or set…"
            className="flex-1 min-w-[200px] bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-orange-500 focus:outline-none"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-orange-500 focus:outline-none"
            aria-label="Sort listings"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Facet chips */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setDealsOnly((v) => !v)}
            className={`px-3 py-1 rounded-full text-sm border font-medium transition-colors ${
              dealsOnly
                ? 'bg-emerald-500 border-emerald-400 text-black'
                : 'border-emerald-700 text-emerald-400 hover:border-emerald-500'
            }`}
          >
            🔥 Deals
          </button>
          {sourceOpts.map((src) => (
            <button key={src} onClick={() => setSources((s) => toggle(s, src))} className={chip(sources.has(src), 'orange')}>
              {SOURCE_LABELS[src] ?? src}
            </button>
          ))}
          {typeOpts.map((pt) => (
            <button key={pt} onClick={() => setTypes((s) => toggle(s, pt))} className={chip(types.has(pt), 'blue')}>
              {TYPE_LABELS[pt] ?? pt}
            </button>
          ))}
          {hasFilters && (
            <button
              onClick={reset}
              className="px-3 py-1 rounded-full text-sm border border-gray-700 text-gray-500 hover:border-gray-500 transition-colors"
            >
              clear
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500">
          {filtered.length} of {listings.length} listings
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">🐉</p>
          <p className="text-lg font-medium">No listings match your filters.</p>
          {hasFilters && (
            <button onClick={reset} className="text-sm mt-3 text-orange-400 hover:text-orange-300">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((l) => (
            <InventoryCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  )
}
