'use client'

import { useEffect, useState } from 'react'

interface NotificationData {
  deals: { id: string }[]
  preorders: { id: string }[]
}

// Fetches new deals/pre-orders since the user's last visit and shows a
// dismissible summary banner. Dismissing advances last_seen_at server-side
// (POST /api/notifications) so the same items don't reappear next visit.
export default function NotificationBanner() {
  const [data, setData] = useState<NotificationData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
  }, [])

  const dismiss = () => {
    setDismissed(true)
    fetch('/api/notifications', { method: 'POST' }).catch(() => {})
  }

  if (!data || dismissed) return null
  const dealCount = data.deals.length
  const preorderCount = data.preorders.length
  if (dealCount + preorderCount === 0) return null

  const parts: string[] = []
  if (dealCount) parts.push(`${dealCount} new deal${dealCount === 1 ? '' : 's'}`)
  if (preorderCount) parts.push(`${preorderCount} new pre-order${preorderCount === 1 ? '' : 's'}`)

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-700 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-200">
      <span>🎉 {parts.join(' and ')} since your last visit!</span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-emerald-400 hover:text-emerald-200 transition-colors"
      >
        ✕
      </button>
    </div>
  )
}
