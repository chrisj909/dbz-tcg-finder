import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// Serve a listing's stored image data. FB CDN URLs expire, so we download
// images at scan time and serve them permanently from the DB (migration 003).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const rows = await sql`SELECT image_data FROM listings WHERE id = ${id} LIMIT 1`
  const imageData: string | null = rows[0]?.image_data ?? null

  if (!imageData) {
    return new NextResponse(null, { status: 404 })
  }

  // image_data is a data URL: "data:<mime>;base64,<bytes>"
  const commaIdx = imageData.indexOf(',')
  if (commaIdx === -1) return new NextResponse(null, { status: 500 })

  const header = imageData.slice(0, commaIdx)
  const base64 = imageData.slice(commaIdx + 1)
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'

  return new NextResponse(Buffer.from(base64, 'base64'), {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=2592000, immutable', // 30 days
    },
  })
}
