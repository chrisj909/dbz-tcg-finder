import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'

// Plain Route Handler, not a Server Action. Signing out clears the session
// cookie mid-request; if that mutation happens inside a Server Action
// invoked from a page that itself re-renders based on session state (like
// `/`), Next tries to revalidate that page's RSC payload as part of the
// action response and sees a now-logged-out session — producing a
// malformed response the client can't parse ("An unexpected response was
// received from the server"). A plain JSON route sidesteps the action
// protocol entirely, so there's no revalidation to race with the sign-out.
export async function POST() {
  await auth.signOut()
  return NextResponse.json({ ok: true })
}
