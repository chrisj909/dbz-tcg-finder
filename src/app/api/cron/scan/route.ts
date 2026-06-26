import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { runAllScrapers } from '@/lib/scrapers'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this automatically; protect manual calls too)
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Create a scan_run record to track this job
  let scanRunId: number
  try {
    const [scanRun] = await sql`
      INSERT INTO scan_runs (status, sources_scanned)
      VALUES ('running', ARRAY[]::text[])
      RETURNING id
    `
    scanRunId = scanRun.id
  } catch {
    return NextResponse.json({ error: 'Failed to create scan run' }, { status: 500 })
  }

  const errors: string[] = []
  let newListingsFound = 0
  let priceChangesFound = 0

  try {
    const { listings, sourceErrors, sources } = await runAllScrapers()
    errors.push(...sourceErrors)

    for (const listing of listings) {
      // Check if this listing already exists
      const existing = await sql`
        SELECT id, price FROM listings
        WHERE source = ${listing.source} AND external_id = ${listing.external_id}
        LIMIT 1
      `

      if (existing.length === 0) {
        // Brand new listing
        try {
          await sql`
            INSERT INTO listings (
              source, external_id, title, url, price, in_stock,
              quantity_available, product_type, image_url,
              first_seen_at, last_seen_at, is_active
            ) VALUES (
              ${listing.source},
              ${listing.external_id},
              ${listing.title ?? null},
              ${listing.url ?? null},
              ${listing.price ?? null},
              ${listing.in_stock},
              ${listing.quantity_available ?? null},
              ${listing.product_type ?? null},
              ${listing.image_url ?? null},
              NOW(), NOW(), true
            )
          `
          newListingsFound++
        } catch (e) {
          errors.push(`Insert failed for ${listing.external_id}: ${e instanceof Error ? e.message : String(e)}`)
        }
      } else {
        const row = existing[0]
        const priceChanged =
          listing.price !== undefined &&
          row.price !== null &&
          row.price !== listing.price

        if (priceChanged) {
          priceChangesFound++
          try {
            await sql`
              UPDATE listings SET
                last_seen_at = NOW(),
                in_stock = ${listing.in_stock},
                quantity_available = ${listing.quantity_available ?? null},
                updated_at = NOW(),
                previous_price = ${row.price},
                price = ${listing.price},
                last_price_change_at = NOW()
              WHERE id = ${row.id}
            `
          } catch (e) {
            errors.push(`Update failed for ${row.id}: ${e instanceof Error ? e.message : String(e)}`)
          }
        } else if (listing.price !== undefined) {
          try {
            await sql`
              UPDATE listings SET
                last_seen_at = NOW(),
                in_stock = ${listing.in_stock},
                quantity_available = ${listing.quantity_available ?? null},
                updated_at = NOW(),
                price = ${listing.price}
              WHERE id = ${row.id}
            `
          } catch (e) {
            errors.push(`Update failed for ${row.id}: ${e instanceof Error ? e.message : String(e)}`)
          }
        } else {
          try {
            await sql`
              UPDATE listings SET
                last_seen_at = NOW(),
                in_stock = ${listing.in_stock},
                quantity_available = ${listing.quantity_available ?? null},
                updated_at = NOW()
              WHERE id = ${row.id}
            `
          } catch (e) {
            errors.push(`Update failed for ${row.id}: ${e instanceof Error ? e.message : String(e)}`)
          }
        }
      }
    }

    // Send webhook alert if configured and there's something interesting
    if (
      process.env.ALERT_WEBHOOK_URL &&
      (newListingsFound > 0 || priceChangesFound > 0)
    ) {
      await fetch(process.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🐉 DBZ TCG Scan: ${newListingsFound} new listings, ${priceChangesFound} price changes across ${sources.length} source(s).`,
          new_listings: newListingsFound,
          price_changes: priceChangesFound,
          sources,
          errors: errors.length > 0 ? errors : undefined,
        }),
      }).catch((e: Error) => errors.push(`Webhook error: ${e.message}`))
    }

    // Mark scan run complete
    await sql`
      UPDATE scan_runs SET
        completed_at = NOW(),
        sources_scanned = ${sources}::text[],
        new_listings_found = ${newListingsFound},
        price_changes_found = ${priceChangesFound},
        errors = ${errors}::text[],
        status = 'completed'
      WHERE id = ${scanRunId}
    `

    return NextResponse.json({
      status: 'completed',
      new_listings: newListingsFound,
      price_changes: priceChangesFound,
      sources_scanned: sources,
      total_scraped: listings.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await sql`
      UPDATE scan_runs SET
        completed_at = NOW(),
        errors = ${[message]}::text[],
        status = 'failed'
      WHERE id = ${scanRunId}
    `
    return NextResponse.json({ error: message, status: 'failed' }, { status: 500 })
  }
}
