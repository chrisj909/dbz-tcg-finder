import { auth } from '@/lib/auth/server'

// Gates the dashboard + its data APIs behind Neon Auth login (#15).
// Left public: the auth flow itself, the sign-in page, health check, and the
// (no-op) cron endpoint — none of those expose listing data or need a session.
export default auth.middleware({ loginUrl: '/auth/sign-in' })

export const config = {
  matcher: [
    '/((?!api/auth|api/health|api/cron|auth/sign-in|_next/static|_next/image|favicon.ico).*)',
  ],
}
