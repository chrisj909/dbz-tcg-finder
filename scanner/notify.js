// Notification digest (#26/#71) — runs after every scan (via run.js), once
// deal-score.js has finished so deal_score reflects the latest data. Emails
// each opted-in user a summary of new deals/pre-orders since their last
// digest, using their own last_notified_at cursor (independent of the
// in-app pop-up's last_seen_at — a user who never opens the dashboard
// should still get emailed).
import { getSql } from './lib/db.js'
import { sendMail } from './lib/email.js'

// Matches the in-app notification threshold (src/app/api/notifications) —
// higher-signal than the dashboard's looser "🔥 Deals" chip filter (>5).
const DEAL_THRESHOLD = 10
// A user with no last_notified_at yet (never received a digest) gets
// everything from the last 24h, not the entire historical backlog.
const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000

function escapeHtml(s = '') {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function buildDigestEmail(deals, preorders) {
  const row = (l) =>
    `<li><a href="${l.url}">${escapeHtml(l.title)}</a> — $${Number(l.price).toFixed(2)}${l.currency !== 'USD' ? ` ${l.currency}` : ''}</li>`
  const sections = []
  if (deals.length) sections.push(`<h3>🔥 New deals (${deals.length})</h3><ul>${deals.map(row).join('')}</ul>`)
  if (preorders.length) sections.push(`<h3>📦 New pre-orders (${preorders.length})</h3><ul>${preorders.map(row).join('')}</ul>`)
  const html = `<div>${sections.join('')}<p style="color:#888;font-size:12px">You're receiving this because email alerts are on for DBZ TCG Finder. Toggle them off anytime from the dashboard.</p></div>`
  const text = [...deals, ...preorders].map((l) => `${l.title} — $${Number(l.price).toFixed(2)} — ${l.url}`).join('\n')
  return { html, text }
}

export async function sendNotificationDigests(sql) {
  // LEFT JOIN: a user who has never visited the dashboard has no prefs row
  // yet — default them to opted-in rather than silently skipping forever.
  const users = await sql`
    SELECT u.id, u.email, COALESCE(p.email_enabled, true) AS email_enabled, p.last_notified_at
    FROM neon_auth."user" u
    LEFT JOIN user_notification_prefs p ON p.user_id = u.id
    WHERE COALESCE(p.email_enabled, true) = true
  `

  let sent = 0
  for (const user of users) {
    const since = user.last_notified_at ?? new Date(Date.now() - DEFAULT_LOOKBACK_MS).toISOString()
    const items = await sql`
      SELECT title, price, currency, url, is_preorder
      FROM listings
      WHERE is_active = true AND first_seen_at > ${since}
        AND (deal_score >= ${DEAL_THRESHOLD} OR is_preorder = true)
      ORDER BY first_seen_at DESC
      LIMIT 25
    `
    if (!items.length) continue

    const deals = items.filter((i) => !i.is_preorder)
    const preorders = items.filter((i) => i.is_preorder)
    const { html, text } = buildDigestEmail(deals, preorders)

    try {
      const result = await sendMail({
        to: user.email,
        subject: `DBZ TCG Finder — ${items.length} new ${items.length === 1 ? 'item' : 'items'}`,
        html,
        text,
      })
      if (result.skipped) continue // ZEPTOMAIL_SMTP_* not configured — don't advance the cursor
      await sql`
        INSERT INTO user_notification_prefs (user_id, last_notified_at)
        VALUES (${user.id}, NOW())
        ON CONFLICT (user_id) DO UPDATE SET last_notified_at = NOW(), updated_at = NOW()
      `
      sent++
    } catch (err) {
      console.error(`[notify] failed to email ${user.email}: ${err.message}`)
    }
  }

  return sent
}

if (process.argv[1]?.endsWith('notify.js')) {
  const sent = await sendNotificationDigests(getSql())
  console.log(`[notify] sent ${sent} digest(s)`)
}
