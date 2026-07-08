'use server'

import { auth } from '@/lib/auth/server'

// Deliberately does NOT redirect() here. A server-action redirect() does a
// client-side RSC transition, which can leave stale state behind when it
// crosses an auth boundary into a completely different page tree (sign-in
// <-> dashboard). The caller does a full `window.location` navigation on
// success instead, which guarantees a clean reload with fresh CSS/JS and no
// leftover client state.
//
// Sign-out is NOT a Server Action for a related but distinct reason — see
// src/app/api/sign-out/route.ts.
export async function signInAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await auth.signIn.email({ email, password })
  if (error) return { error: error.message }

  return { error: undefined }
}
