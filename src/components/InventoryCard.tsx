import { useState } from 'react'
import { Listing } from '@/lib/types'

const SOURCE_STYLES: Record<string, string> = {
  tcgplayer: 'bg-blue-700 text-blue-100',
  ebay: 'bg-yellow-600 text-yellow-100',
  trollandtoad: 'bg-green-700 text-green-100',
  craigslist: 'bg-purple-700 text-purple-100',
  offerup: 'bg-teal-700 text-teal-100',
  facebook: 'bg-sky-700 text-sky-100',
  bestbuy: 'bg-indigo-700 text-indigo-100',
  walmart: 'bg-blue-900 text-blue-100',
  gamestop: 'bg-red-800 text-red-100',
  topcutcomics: 'bg-rose-700 text-rose-100',
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  booster_box: 'Booster Box',
  booster_pack: 'Booster Pack',
  case: 'Case',
  bundle: 'Bundle',
  other: 'Other',
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export default function InventoryCard({
  listing,
  isWatchlisted,
  onToggleWatchlist,
}: {
  listing: Listing
  isWatchlisted?: boolean
  onToggleWatchlist?: (listingId: string) => void
}) {
  const sourceBadge = SOURCE_STYLES[listing.source] ?? 'bg-gray-700 text-gray-100'
  // Date.now() is impure, so capture "now" once via a lazy initializer (runs only
  // on first render, not on every re-render) rather than reading it during render.
  const [now] = useState(() => Date.now())
  const isNew = now - new Date(listing.first_seen_at).getTime() < ONE_DAY_MS
  // Neon returns numeric columns as strings — coerce before any math/formatting.
  const price = listing.price != null ? Number(listing.price) : null
  const previousPrice = listing.previous_price != null ? Number(listing.previous_price) : null
  const hasPriceDrop = previousPrice != null && price != null && price < previousPrice
  const dealScore = listing.deal_score != null ? Number(listing.deal_score) : null
  const marketValue = listing.market_value != null ? Number(listing.market_value) : null
  const isDeal = dealScore != null && dealScore >= 10

  // Primary image first, then any extras a source captured (currently just
  // Best Buy — see #68; most sources only ever have the one). image_data
  // (stored blob) takes priority over image_url as the primary when present.
  const primaryImage = listing.has_stored_image ? `/api/images/${listing.id}` : listing.image_url
  const images = [primaryImage, ...(listing.image_urls ?? [])].filter((src): src is string => Boolean(src))
  const [imgIndex, setImgIndex] = useState(0)
  const showImage = images[imgIndex] ?? images[0]
  const cycle = (e: React.MouseEvent, dir: 1 | -1) => {
    e.preventDefault()
    e.stopPropagation()
    setImgIndex((i) => (i + dir + images.length) % images.length)
  }

  return (
    <div
      className={`group relative flex flex-col bg-gray-900 border rounded-xl overflow-hidden transition-colors ${
        isDeal
          ? 'border-emerald-500/60 hover:border-emerald-400'
          : 'border-gray-800 hover:border-orange-500'
      }`}
    >
      {onToggleWatchlist && (
        <button
          type="button"
          onClick={() => onToggleWatchlist(listing.id)}
          aria-label={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
          aria-pressed={isWatchlisted}
          className={`absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-full text-sm transition-colors ${
            isWatchlisted
              ? 'bg-yellow-500 text-black'
              : 'bg-black/50 text-gray-300 hover:text-yellow-400'
          }`}
        >
          {isWatchlisted ? '★' : '☆'}
        </button>
      )}
      <div className="relative aspect-square bg-gray-800 overflow-hidden">
        <a href={listing.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={showImage}
              alt={listing.title}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🐉</div>
          )}
        </a>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => cycle(e, -1)}
              aria-label="Previous image"
              className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => cycle(e, 1)}
              aria-label="Next image"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ›
            </button>
            <div className="absolute bottom-1.5 inset-x-0 flex justify-center gap-1">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${i === imgIndex ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <a href={listing.url} target="_blank" rel="noopener noreferrer" className="flex flex-col flex-1">
      <div className="flex flex-col flex-1 p-3 gap-2">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceBadge}`}>
            {listing.source}
          </span>
          {listing.product_type && listing.product_type !== 'other' && (
            <span className="text-xs text-gray-500">
              {PRODUCT_TYPE_LABELS[listing.product_type]}
            </span>
          )}
          <div className="ml-auto flex gap-1">
            {isNew && (
              <span className="text-xs bg-orange-600 text-white px-1.5 py-0.5 rounded font-medium">
                NEW
              </span>
            )}
            {listing.is_preorder && (
              <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">
                PRE-ORDER
              </span>
            )}
            {hasPriceDrop && (
              <span className="text-xs bg-green-700 text-green-100 px-1.5 py-0.5 rounded font-medium">
                PRICE DROP
              </span>
            )}
            {isDeal && (
              <span className="text-xs bg-emerald-500 text-black px-1.5 py-0.5 rounded font-bold">
                DEAL −{dealScore}%
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium leading-snug line-clamp-2 flex-1">{listing.title}</h3>

        {/* Set name + distance */}
        <div className="flex items-center justify-between gap-1">
          {listing.set_name && (
            <p className="text-xs text-gray-500 truncate">{listing.set_name}</p>
          )}
          {listing.distance_mi != null && (
            <p className="text-xs text-gray-500 whitespace-nowrap ml-auto">
              {Number(listing.distance_mi)} mi
            </p>
          )}
        </div>

        {/* Price + stock */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-green-400">
              {price != null ? `$${price.toFixed(2)}` : 'N/A'}
            </span>
            {hasPriceDrop && previousPrice != null && (
              <span className="text-xs text-gray-500 line-through">
                ${previousPrice.toFixed(2)}
              </span>
            )}
            {marketValue != null && (
              <span className="text-xs text-gray-500">vs ${marketValue.toFixed(0)} sold</span>
            )}
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              listing.in_stock
                ? 'bg-green-900 text-green-300'
                : 'bg-red-900 text-red-400'
            }`}
          >
            {listing.in_stock ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
      </div>
      </a>
    </div>
  )
}
