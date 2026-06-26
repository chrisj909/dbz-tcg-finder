import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { runAllScrapers } from '@/lib/scrapers'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this automatically; protect manual calls too)
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  // Create a scan_run record to track this job
  const { data: scanRun, error: scanError } = await supabase
    .from('scan_runs')
    .insert({ status: 'running', sources_scanned: [] })
    .select()
    .single()

  if (scanError || !scanRun) {
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
      const { data: existing } = await supabase
        .from('listings')
        .select('id, price')
        .eq('source', listing.source)
        .eq('external_id', listing.external_id)
        .maybeSingle()

      if (!existing) {
        // Brand new listing
        const { error: insertError } = await supabase.from('listings').insert({
          ...listing,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          is_active: true,
        })
        if (insertError) {
          errors.push(`Insert failed for ${listing.external_id}: ${insertError.message}`)
        } else {
          newListingsFound++
        }
      } else {
        // Update existing listing
        const updates: Record<string, unknown> = {
          last_seen_at: new Date().toISOString(),
          in_stock: listing.in_stock,
          quantity_available: listing.quantity_available ?? null,
          updated_at: new Date().toISOString(),
        }

        if (
          listing.price !== undefined &&
          existing.price !== null &&
          existing.price !== listing.price
        ) {
          updates.previous_price = existing.price
          updates.price = listing.price
          updates.last_price_change_at = new Date().toISOString()
          priceChangesFound++
        } else if (listing.price !== undefined) {
          updates.price = listing.price
        }

        const { error: updateError } = await supabase
          .from('listings')
          .update(updates)
          .eq('id', existing.id)
        if (updateError) {
          errors.push(`Update failed for ${existing.id}: ${updateError.message}`)
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
    await supabase
      .from('scan_runs')
      .update({
        completed_at: new Date().toISOString(),
        sources_scanned: sources,
        new_listings_found: newListingsFound,
        price_changes_found: priceChangesFound,
        errors,
        status: 'completed',
      })
      .eq('id', scanRun.id)

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
    await supabase
      .from('scan_runs')
      .update({
        completed_at: new Date().toISOString(),
        errors: [message],
        status: 'failed',
      })
      .eq('id', scanRun.id)
    return NextResponse.json({ error: message, status: 'failed' }, { status: 500 })
  }
}
