import { createNeonAuth } from '@neondatabase/auth/next/server'

// Neon Auth (powered by Better Auth) — gates the dashboard behind login (#15).
// Requires NEON_AUTH_BASE_URL (from Neon console: Project -> Branch -> Auth ->
// Configuration) and NEON_AUTH_COOKIE_SECRET (generate locally: openssl rand -base64 32).
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
})
