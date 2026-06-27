import { sql } from '@/lib/db'
import { Listing } from '@/lib/types'
import InventoryCard from '@/components/InventoryCard'
import StatsBar from '@/components/StatsBar'

// Always reflect the latest scan — a live finder shouldn't serve 5-min-stale data.
export const dynamic = 'force-dynamic'

async function getListings(source?: string, productType?: string): Promise<Listing[]> {
  try {
    const listings = await sql`
      SELECT * FROM listings
      WHERE is_active = true
        AND (${source ?? null}::text IS NULL OR source = ${source ?? null})
        AND (${productType ?? null}::text IS NULL OR product_type = ${productType ?? null})
      ORDER BY first_seen_at DESC
      LIMIT 50
    `
    return listings as Listing[]
  } catch (error) {
    console.error('Error fetching listings:', error)
    return []
  }
}

async function getStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  try {
    const [totalResult, newTodayResult, priceDropsResult] = await Promise.all([
      sql`SELECT COUNT(*) AS count FROM listings WHERE is_active = true AND in_stock = true`,
      sql`SELECT COUNT(*) AS count FROM listings WHERE first_seen_at >= ${todayISO}`,
      sql`SELECT COUNT(*) AS count FROM listings WHERE last_price_change_at >= ${todayISO} AND last_price_change_at IS NOT NULL`,
    ])
    return {
      total: Number(totalResult[0].count),
      newToday: Number(newTodayResult[0].count),
      priceDrops: Number(priceDropsResult[0].count),
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
    return { total: 0, newToday: 0, priceDrops: 0 }
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { source?: string; product_type?: string }
}) {
  const [listings, stats] = await Promise.all([
    getListings(searchParams.source, searchParams.product_type),
    getStats(),
  ])

  const sources = ['tcgplayer', 'ebay', 'trollandtoad']
  const productTypes = ['booster_box', 'booster_pack', 'case', 'bundle']

  return (
    <div>
      <StatsBar stats={stats} />

      {/* Filters */}
      <div className="flex gap-2 mt-6 mb-6 flex-wrap">
        {sources.map((src) => (
          <a
            key={src}
            href={`?source=${src}`}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              searchParams.source === src
                ? 'bg-orange-600 border-orange-500 text-white'
                : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
          >
            {src}
          </a>
        ))}
        {productTypes.map((pt) => (
          <a
            key={pt}
            href={`?product_type=${pt}`}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              searchParams.product_type === pt
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
          >
            {pt.replace('_', ' ')}
          </a>
        ))}
        <a
          href="/"
          className="px-3 py-1 rounded-full text-sm border border-gray-700 text-gray-500 hover:border-gray-500 transition-colors"
        >
          clear
        </a>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">🐉</p>
          <p className="text-lg font-medium">No listings found yet.</p>
          <p className="text-sm mt-2 text-gray-600">
            Run{' '}
            <code className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded text-xs">
              GET /api/cron/scan
            </code>{' '}
            to kick off the first scrape.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <InventoryCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}
