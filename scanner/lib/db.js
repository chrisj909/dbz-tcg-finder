// Neon access + upsert logic for the scanner.
// Mirrors the upsert in src/app/api/cron/scan/route.ts so the web cron and the
// local scanner produce identical rows.
import { neon } from '@neondatabase/serverless'
import { detectPreorder } from './detect.js'

// A source can pass an explicit l.is_preorder (e.g. gamestop.js reads a real
// structured availability.preorder field) — that takes precedence. Otherwise
// fall back to the shared title-regex heuristic so every source benefits
// without each one needing its own detection logic.
const resolvePreorder = (l) => l.is_preorder ?? detectPreorder(l.title ?? '')

export function getSql() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL not set. Run from the repo root: node --env-file=.env.local scanner/run.js',
    )
  }
  return neon(url)
}

export async function startScanRun(sql) {
  const [row] = await sql`
    INSERT INTO scan_runs (status, sources_scanned)
    VALUES ('running', ARRAY[]::text[])
    RETURNING id
  `
  return row.id
}

export async function finishScanRun(sql, id, { sources, newListings, priceChanges, errors, status }) {
  await sql`
    UPDATE scan_runs SET
      completed_at = NOW(),
      sources_scanned = ${sources}::text[],
      new_listings_found = ${newListings},
      price_changes_found = ${priceChanges},
      errors = ${errors}::text[],
      status = ${status}
    WHERE id = ${id}
  `
}

// Insert or update one scraped listing. Returns 'new' | 'price_change' | 'seen'.
export async function upsertListing(sql, l) {
  const existing = await sql`
    SELECT id, price FROM listings
    WHERE source = ${l.source} AND external_id = ${l.external_id}
    LIMIT 1
  `

  if (existing.length === 0) {
    await sql`
      INSERT INTO listings (
        source, external_id, title, url, price, currency, in_stock,
        quantity_available, product_type, set_name, condition, image_url, image_data, seller,
        city, distance_mi, is_preorder,
        first_seen_at, last_seen_at, is_active
      ) VALUES (
        ${l.source}, ${l.external_id}, ${l.title ?? null}, ${l.url ?? null},
        ${l.price ?? null}, ${l.currency ?? 'USD'}, ${l.in_stock ?? true},
        ${l.quantity_available ?? null}, ${l.product_type ?? null}, ${l.set_name ?? null},
        ${l.condition ?? null}, ${l.image_url ?? null}, ${l.image_data ?? null}, ${l.seller ?? null},
        ${l.city ?? null}, ${l.distance_mi ?? null}, ${resolvePreorder(l)},
        NOW(), NOW(), true
      )
    `
    return 'new'
  }

  const row = existing[0]
  const priceChanged =
    l.price != null && row.price != null && Number(row.price) !== Number(l.price)

  // Refresh listing metadata (incl. image_url) on every sighting via COALESCE,
  // so re-scans backfill images/titles without clobbering good data with nulls.
  if (priceChanged) {
    await sql`
      UPDATE listings SET
        last_seen_at = NOW(), updated_at = NOW(), is_active = true,
        in_stock = ${l.in_stock ?? true},
        previous_price = ${row.price}, price = ${l.price}, last_price_change_at = NOW(),
        image_url = COALESCE(${l.image_url ?? null}, image_url),
        image_data = COALESCE(${l.image_data ?? null}, image_data),
        title = COALESCE(${l.title ?? null}, title),
        set_name = COALESCE(${l.set_name ?? null}, set_name),
        product_type = COALESCE(${l.product_type ?? null}, product_type),
        seller = COALESCE(${l.seller ?? null}, seller),
        city = COALESCE(${l.city ?? null}, city),
        distance_mi = COALESCE(${l.distance_mi ?? null}, distance_mi),
        is_preorder = ${resolvePreorder(l)}
      WHERE id = ${row.id}
    `
    return 'price_change'
  }

  await sql`
    UPDATE listings SET
      last_seen_at = NOW(), updated_at = NOW(), is_active = true,
      in_stock = ${l.in_stock ?? true},
      price = COALESCE(${l.price ?? null}, price),
      image_url = COALESCE(${l.image_url ?? null}, image_url),
      image_data = COALESCE(${l.image_data ?? null}, image_data),
      title = COALESCE(${l.title ?? null}, title),
      set_name = COALESCE(${l.set_name ?? null}, set_name),
      product_type = COALESCE(${l.product_type ?? null}, product_type),
      seller = COALESCE(${l.seller ?? null}, seller),
      city = COALESCE(${l.city ?? null}, city),
      distance_mi = COALESCE(${l.distance_mi ?? null}, distance_mi),
      is_preorder = ${resolvePreorder(l)}
    WHERE id = ${row.id}
  `
  return 'seen'
}

// Nothing above ever sets is_active back to false — a listing a source stops
// surfacing (sold, delisted, or just didn't rank on a fragile single-query
// source like Walmart) lingers forever with its last-known (possibly stale/
// wrong) price. Sweep for staleness instead of diffing each run's results
// against the previous active set — safer for sources like Walmart that only
// run one query and can legitimately miss a still-live item on any given run.
export async function deactivateStaleListings(sql, days = 7) {
  const rows = await sql`
    UPDATE listings SET is_active = false, updated_at = NOW()
    WHERE is_active = true AND last_seen_at < NOW() - (${days} || ' days')::interval
    RETURNING id
  `
  return rows.length
}
