import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { auth } from '@/lib/auth/server'

// Matches InventoryCard's DEAL badge threshold (dealScore >= 10), not the
// dashboard's looser "🔥 Deals" chip filter (>5) — notifications should be
// higher-signal than browsing, to avoid emailing/popping-up over a
// marginal 6-9%-off item.
const DEAL_THRESHOLD = 10

// GET: new deals/pre-orders since the signed-in user's last visit. Creates
// their prefs row (defaulting last_seen_at to now) on first access, so a
// brand-new user doesn't get the entire existing backlog dumped on them.
export async function GET() {
  const { data: session } = await auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const [prefs] = await sql`
    INSERT INTO user_notification_prefs (user_id)
    VALUES (${session.user.id})
    ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING email_enabled, last_seen_at
  `

  const items = await sql`
    SELECT id, title, price, currency, is_preorder, deal_score
    FROM listings
    WHERE is_active = true AND first_seen_at > ${prefs.last_seen_at}
      AND (deal_score >= ${DEAL_THRESHOLD} OR is_preorder = true)
    ORDER BY first_seen_at DESC
    LIMIT 50
  `

  return NextResponse.json({
    emailEnabled: prefs.email_enabled,
    deals: items.filter((i) => !i.is_preorder),
    preorders: items.filter((i) => i.is_preorder),
  })
}

// POST: mark the pop-up as seen (advance last_seen_at to now).
export async function POST() {
  const { data: session } = await auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  await sql`
    INSERT INTO user_notification_prefs (user_id, last_seen_at)
    VALUES (${session.user.id}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET last_seen_at = NOW(), updated_at = NOW()
  `
  return NextResponse.json({ ok: true })
}

// PATCH { emailEnabled }: toggle the digest email preference.
export async function PATCH(request: NextRequest) {
  const { data: session } = await auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { emailEnabled } = await request.json()
  if (typeof emailEnabled !== 'boolean') {
    return NextResponse.json({ error: 'emailEnabled must be a boolean' }, { status: 400 })
  }

  await sql`
    INSERT INTO user_notification_prefs (user_id, email_enabled)
    VALUES (${session.user.id}, ${emailEnabled})
    ON CONFLICT (user_id) DO UPDATE SET email_enabled = ${emailEnabled}, updated_at = NOW()
  `
  return NextResponse.json({ ok: true })
}
