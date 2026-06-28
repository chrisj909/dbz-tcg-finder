import { NextResponse } from 'next/server'

// Retired (#30). Every marketplace source 403s plain HTTP and needs a real
// browser on a residential IP, so scanning runs only in the LOCAL scanner
// (`node --env-file=.env.local scanner/run.js`). The Vercel cron was removed;
// this endpoint stays as a harmless no-op for any leftover caller.
export function GET() {
  return NextResponse.json({
    status: 'disabled',
    message: 'Cloud cron retired — scanning runs in the local scanner (scanner/run.js).',
  })
}
