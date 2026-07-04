import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { auth } from '@/lib/auth/server'

// GET: list the signed-in user's starred listing ids.
export async function GET() {
  const { data: session } = await auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const rows = await sql`
    SELECT listing_id FROM watchlist_items WHERE user_id = ${session.user.id}
  `
  return NextResponse.json({ listingIds: rows.map((r) => r.listing_id) })
}

// POST { listingId }: star a listing for the signed-in user.
export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { listingId } = await request.json()
  if (!listingId) {
    return NextResponse.json({ error: 'listingId is required' }, { status: 400 })
  }

  await sql`
    INSERT INTO watchlist_items (user_id, listing_id)
    VALUES (${session.user.id}, ${listingId})
    ON CONFLICT (user_id, listing_id) DO NOTHING
  `
  return NextResponse.json({ ok: true })
}
