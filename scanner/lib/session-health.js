// Session health checker for sources that need a saved login (FB, OfferUp).
// Validates each saved session file is present and the auth cookie it contains
// is still valid (not expired / logged-out). Called at the start of run.js so
// a dead session produces a clear warning instead of silent 0-result scans.
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SESSION_CONFIGS = {
  facebook: {
    path: fileURLToPath(new URL('../.auth/facebook.json', import.meta.url)),
    // FB sets c_user to your numeric user id; still present in storageState cookies
    validate: (state) => state.cookies?.some((c) => c.name === 'c_user' && c.value),
    renewCmd: 'node scanner/login.js facebook',
  },
  offerup: {
    path: fileURLToPath(new URL('../.auth/offerup.json', import.meta.url)),
    // OU.USER_CONTEXT_COOKIE contains user_id when logged in
    validate: (state) => {
      const c = state.cookies?.find((c) => c.name === 'OU.USER_CONTEXT_COOKIE')
      if (!c?.value) return false
      try { return !!JSON.parse(decodeURIComponent(c.value)).user_id } catch { return false }
    },
    renewCmd: 'node scanner/login.js offerup',
  },
}

export function checkSessions() {
  const warnings = []

  for (const [name, cfg] of Object.entries(SESSION_CONFIGS)) {
    if (!existsSync(cfg.path)) {
      warnings.push({ name, issue: 'missing', renewCmd: cfg.renewCmd })
      continue
    }

    let state
    try {
      state = JSON.parse(readFileSync(cfg.path, 'utf8'))
    } catch {
      warnings.push({ name, issue: 'unreadable', renewCmd: cfg.renewCmd })
      continue
    }

    // Check for expired cookies (Playwright storageState includes expires timestamps)
    const now = Date.now() / 1000
    const expired = state.cookies?.filter((c) => c.expires > 0 && c.expires < now) ?? []
    if (expired.length > 3) {
      // More than a few expired cookies = session has likely timed out
      warnings.push({ name, issue: 'expired', renewCmd: cfg.renewCmd })
      continue
    }

    if (!cfg.validate(state)) {
      warnings.push({ name, issue: 'invalid (not logged in)', renewCmd: cfg.renewCmd })
    }
  }

  return warnings
}

export function printSessionWarnings(warnings) {
  if (!warnings.length) return
  console.warn('\n⚠️  SESSION WARNINGS — these sources will return 0 results until renewed:')
  for (const w of warnings) {
    console.warn(`  [${w.name}] ${w.issue} → renew with:  ${w.renewCmd}`)
  }
  console.warn('')
}
