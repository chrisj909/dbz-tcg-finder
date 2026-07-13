'use client'

import { useEffect, useState } from 'react'

// Lets a signed-in user opt out of the periodic deal/pre-order digest email
// (the scanner's sendNotificationDigests() checks this per-user before
// sending). Separate small fetch from NotificationBanner's — both read the
// same /api/notifications GET, an acceptable duplicate request for a
// small friends-only app rather than adding a shared context for it.
export default function EmailPrefToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => setEnabled(d?.emailEnabled ?? true))
      .catch(() => {})
  }, [])

  const toggle = () => {
    if (enabled === null) return
    const next = !enabled
    setEnabled(next)
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailEnabled: next }),
    }).catch(() => setEnabled(!next))
  }

  if (enabled === null) return null

  return (
    <button
      type="button"
      onClick={toggle}
      className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
    >
      🔔 Email alerts: {enabled ? 'On' : 'Off'}
    </button>
  )
}
