import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source')
  const productType = searchParams.get('product_type')
  const inStock = searchParams.get('in_stock')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const supabase = createServerClient()
  let query = supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('first_seen_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (source) query = query.eq('source', source)
  if (productType) query = query.eq('product_type', productType)
  if (inStock === 'true') query = query.eq('in_stock', true)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    listings: data,
    total: count,
    limit,
    offset,
  })
}
