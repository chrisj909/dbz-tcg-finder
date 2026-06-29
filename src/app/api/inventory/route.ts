import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source')
  const productType = searchParams.get('product_type')
  const inStock = searchParams.get('in_stock')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  try {
    const listings = await sql`
      SELECT
        id, source, external_id, title, url, price, currency, condition,
        in_stock, quantity_available, image_url,
        (image_data IS NOT NULL) AS has_stored_image,
        seller, set_name, product_type, category, era,
        market_value, deal_score, deal_reason, city, distance_mi,
        first_seen_at, last_seen_at, last_price_change_at, previous_price,
        is_active, created_at, updated_at
      FROM listings
      WHERE is_active = true
        AND (${source}::text IS NULL OR source = ${source})
        AND (${productType}::text IS NULL OR product_type = ${productType})
        AND (${inStock === 'true' ? 'true' : null}::boolean IS NULL OR in_stock = true)
      ORDER BY first_seen_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    const [{ count }] = await sql`
      SELECT COUNT(*) AS count FROM listings
      WHERE is_active = true
        AND (${source}::text IS NULL OR source = ${source})
        AND (${productType}::text IS NULL OR product_type = ${productType})
        AND (${inStock === 'true' ? 'true' : null}::boolean IS NULL OR in_stock = true)
    `

    return NextResponse.json({
      listings,
      total: Number(count),
      limit,
      offset,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
