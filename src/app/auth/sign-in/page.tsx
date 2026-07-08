'use client'

import { useActionState, useEffect } from 'react'
import { signInAction } from '@/app/actions/auth'

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(signInAction, undefined)

  // Hard-navigate on success (not router.push/redirect) so the dashboard gets
  // a fresh full page load rather than a client-side RSC transition across
  // the auth boundary — see the comment on signInAction for why.
  useEffect(() => {
    if (state && !state.error) {
      window.location.href = '/'
    }
  }, [state])

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100 px-4">
      <form
        action={formAction}
        className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-4"
      >
        <div className="text-center mb-2">
          <span className="text-3xl">🐉</span>
          <h1 className="text-lg font-semibold mt-1">DBZ TCG Finder</h1>
          <p className="text-xs text-gray-500">Sign in to view the dashboard</p>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
          />
        </label>

        {state?.error && (
          <p className="text-sm text-red-400">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
        >
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
