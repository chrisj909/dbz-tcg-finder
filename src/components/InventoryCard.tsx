import { Listing } from '@/lib/types'

const SOURCE_STYLES: Record<string, string> = {
  tcgplayer: 'bg-blue-700 text-blue-100',
  ebay: 'bg-yellow-600 text-yellow-100',
  trollandtoad: 'bg-green-700 text-green-100',
  craigslist: 'bg-purple-700 text-purple-100',
  offerup: 'bg-teal-700 text-teal-100',
  facebook: 'bg-sky-700 text-sky-100',
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  booster_box: 'Booster Box',
  booster_pack: 'Booster Pack',
  case: 'Case',
  bundle: 'Bundle',
  other: 'Other',
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export default function InventoryCard({ listing }: { listing: Listing }) {
  const sourceBadge = SOURCE_STYLES[listing.source] ?? 'bg-gray-700 text-gray-100'
  const isNew = Date.now() - new Date(listing.first_seen_at).getTime() < ONE_DAY_MS
  // Neon returns numeric columns as strings — coerce before any math/formatting.
  const price = listing.price != null ? Number(listing.price) : null
  const previousPrice = listing.previous_price != null ? Number(listing.previous_price) : null
  const hasPriceDrop = previousPrice != null && price != null && price < previousPrice
  const dealScore = listing.deal_score != null ? Number(listing.deal_score) : null
  const marketValue = listing.market_value != null ? Number(listing.market_value) : null
  const isDeal = dealScore != null && dealScore >= 10

  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex flex-col bg-gray-900 border rounded-xl overflow-hidden transition-colors ${
        isDeal
          ? 'border-emerald-500/60 hover:border-emerald-400'
          : 'border-gray-800 hover:border-orange-500'
      }`}
    >
      {listing.image_url ? (
        <div className="aspect-square bg-gray-800 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.image_url}
            alt={listing.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-square bg-gray-800 flex items-center justify-center text-4xl">
          🐉
        </div>
      )}

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

        {/* Set name */}
        {listing.set_name && (
          <p className="text-xs text-gray-500">{listing.set_name}</p>
        )}

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
  )
}
