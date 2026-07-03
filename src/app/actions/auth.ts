'use server'

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/server'

export async function signInAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await auth.signIn.email({ email, password })
  if (error) return { error: error.message }

  redirect('/')
}

export async function signOutAction() {
  await auth.signOut()
  redirect('/auth/sign-in')
}
