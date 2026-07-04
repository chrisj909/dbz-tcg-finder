import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { auth } from '@/lib/auth/server'

// DELETE: unstar a listing for the signed-in user.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> },
) {
  const { data: session } = await auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { listingId } = await params
  await sql`
    DELETE FROM watchlist_items
    WHERE user_id = ${session.user.id} AND listing_id = ${listingId}
  `
  return NextResponse.json({ ok: true })
}
