'use client'

import { useTransition } from 'react'

// Uses a plain fetch to a Route Handler (src/app/api/sign-out), not a Server
// Action — see the comment in that route for why: a Server Action that
// clears the session cookie, invoked from a page that re-renders based on
// session state, races Next's action-response revalidation and can produce
// "An unexpected response was received from the server."
export default function SignOutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await fetch('/api/sign-out', { method: 'POST' })
          window.location.href = '/auth/sign-in'
        })
      }
      className="text-orange-400 hover:text-orange-300 disabled:opacity-50"
    >
      {isPending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
