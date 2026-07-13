import { auth } from '@/lib/auth/server'

// Gates the dashboard + its data APIs behind Neon Auth login (#15).
// Left public: the auth flow itself, the sign-in + sign-up pages, health
// check, and the (no-op) cron endpoint — none of those expose listing data
// or need a session.
//
// Also left out: api/watchlist, api/sign-out, and api/notifications. Their route handlers
// already independently call auth.getSession()/auth.signOut() and return a
// clean 401 when unauthenticated, so the proxy's protection is redundant
// for them — and for non-GET requests it's actively broken. Confirmed via
// live testing: @neondatabase/auth's middleware (0.4.2-beta) forwards the
// ORIGINAL request's HTTP method when it internally re-checks the session
// with the upstream Neon Auth server. A GET to a protected route resolves
// the session fine; a POST/DELETE causes that internal session check to
// also fire as POST/DELETE against what's effectively a GET-only endpoint,
// so it silently fails and the middleware treats a genuinely valid session
// as unauthenticated — redirecting the request to /auth/sign-in instead of
// reaching the route at all. This broke the watchlist star button (POST
// silently failed and reverted) even for a properly signed-in user.
export default auth.middleware({ loginUrl: '/auth/sign-in' })

export const config = {
  matcher: [
    '/((?!api/auth|api/health|api/cron|api/watchlist|api/sign-out|api/notifications|auth/sign-in|auth/sign-up|_next/static|_next/image|favicon.ico).*)',
  ],
}
