// Minimal migration runner for Neon.
//
//   node --env-file=.env.local scripts/migrate.mjs
//
// Reads db/migrations/*.sql in filename order and applies each statement via the
// Neon HTTP driver. Idempotent: skips "already exists" errors so re-runs are safe.
// Splits on ';' while respecting $$-quoted bodies (functions/triggers).
import { neon } from '@neondatabase/serverless'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL not set. Run: node --env-file=.env.local scripts/migrate.mjs')
  process.exit(1)
}
const sql = neon(url)

// Split SQL into statements, treating text between $$ ... $$ as opaque.
function splitStatements(text) {
  const out = []
  let buf = ''
  let inDollar = false
  for (let i = 0; i < text.length; i++) {
    if (text.startsWith('$$', i)) {
      inDollar = !inDollar
      buf += '$$'
      i++
      continue
    }
    const ch = text[i]
    if (ch === ';' && !inDollar) {
      out.push(buf)
      buf = ''
    } else {
      buf += ch
    }
  }
  if (buf.trim()) out.push(buf)
  return out
}

// A statement is meaningful if it has SQL after stripping line comments.
const isMeaningful = (s) => s.replace(/--.*$/gm, '').trim().length > 0
const isAlreadyExists = (e) => {
  const m = `${e?.message ?? e}`.toLowerCase()
  return m.includes('already exists') || ['42p07', '42710', '42p06', '42723'].includes(e?.code)
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations')

const existing = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
console.log('Existing public tables:', existing.map((r) => r.table_name).join(', ') || '(none)')

if (!existsSync(dir)) {
  console.log(`\nNo migrations directory at ${dir} — schema check only, nothing to apply.`)
  process.exit(0)
}

const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
let applied = 0
let skipped = 0
for (const file of files) {
  const statements = splitStatements(readFileSync(join(dir, file), 'utf8')).filter(isMeaningful)
  console.log(`\n== ${file}: ${statements.length} statements ==`)
  for (const stmt of statements) {
    const label = stmt.replace(/--.*$/gm, '').trim().replace(/\s+/g, ' ').slice(0, 60)
    try {
      await sql.query(stmt)
      console.log(`  ok    ${label}`)
      applied++
    } catch (e) {
      if (isAlreadyExists(e)) {
        console.log(`  skip  ${label} (already exists)`)
        skipped++
      } else {
        console.error(`  FAIL  ${label}\n        ${e?.message ?? e}`)
        process.exit(1)
      }
    }
  }
}

const after = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
console.log(`\nDone. applied=${applied} skipped=${skipped}. Public tables now: ${after.map((r) => r.table_name).join(', ')}`)
