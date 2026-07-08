'use client'

import { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { signUpAction } from '@/app/actions/auth'

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signUpAction, undefined)

  // Hard-navigate on success — see the comment on signInAction in
  // src/app/actions/auth.ts for why.
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
          <p className="text-xs text-gray-500">Create an account</p>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            type="text"
            name="name"
            required
            autoComplete="name"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
          />
        </label>

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
            minLength={8}
            autoComplete="new-password"
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
          {isPending ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="text-orange-400 hover:text-orange-300">
            Sign in
          </Link>
        </p>

        <p className="text-[11px] text-gray-600 text-center leading-snug">
          Note: creating an account signs you in as it, replacing any account
          you&apos;re currently signed in as on this browser.
        </p>
      </form>
    </main>
  )
}
