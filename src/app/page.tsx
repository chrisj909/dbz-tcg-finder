import { sql } from '@/lib/db'
import { Listing } from '@/lib/types'
import StatsBar from '@/components/StatsBar'
import DashboardClient from '@/components/DashboardClient'
import { auth } from '@/lib/auth/server'
import { signOutAction } from '@/app/actions/auth'

// Always reflect the latest scan — a live finder shouldn't serve 5-min-stale data.
export const dynamic = 'force-dynamic'

// Fetch all active listings once; the client component (#12) handles search,
// multi-facet filtering, and sort in the browser for instant feedback.
async function getListings(): Promise<Listing[]> {
  try {
    const listings = await sql`
      SELECT * FROM listings
      WHERE is_active = true
      ORDER BY first_seen_at DESC
      LIMIT 500
    `
    return listings as Listing[]
  } catch (error) {
    console.error('Error fetching listings:', error)
    return []
  }
}

async function getWatchlistIds(userId: string | undefined): Promise<string[]> {
  if (!userId) return []
  try {
    const rows = await sql`SELECT listing_id FROM watchlist_items WHERE user_id = ${userId}`
    return rows.map((r) => r.listing_id as string)
  } catch (error) {
    console.error('Error fetching watchlist:', error)
    return []
  }
}

async function getStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  try {
    const [totalResult, newTodayResult, dealsResult] = await Promise.all([
      sql`SELECT COUNT(*) AS count FROM listings WHERE is_active = true AND in_stock = true`,
      sql`SELECT COUNT(*) AS count FROM listings WHERE first_seen_at >= ${todayISO}`,
      sql`SELECT COUNT(*) AS count FROM listings WHERE is_active = true AND deal_score > 5`,
    ])
    return {
      total: Number(totalResult[0].count),
      newToday: Number(newTodayResult[0].count),
      deals: Number(dealsResult[0].count),
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
    return { total: 0, newToday: 0, deals: 0 }
  }
}

export default async function HomePage() {
  const [listings, stats, { data: session }] = await Promise.all([
    getListings(),
    getStats(),
    auth.getSession(),
  ])
  const watchlistIds = await getWatchlistIds(session?.user?.id)

  return (
    <div>
      {session?.user && (
        <div className="flex items-center justify-end gap-3 text-sm text-gray-400 mb-4">
          <span>{session.user.email}</span>
          <form action={signOutAction}>
            <button type="submit" className="text-orange-400 hover:text-orange-300">
              Sign out
            </button>
          </form>
        </div>
      )}
      <StatsBar stats={stats} />

      {listings.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">🐉</p>
          <p className="text-lg font-medium">No listings found yet.</p>
          <p className="text-sm mt-2 text-gray-600">
            Run the local scanner{' '}
            <code className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded text-xs">
              node --env-file=.env.local scanner/run.js
            </code>{' '}
            to populate listings.
          </p>
        </div>
      ) : (
        <DashboardClient
          listings={listings}
          signedIn={Boolean(session?.user)}
          initialWatchlistIds={watchlistIds}
        />
      )}
    </div>
  )
}
