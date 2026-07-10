export type ProductType = 'booster_box' | 'booster_pack' | 'case' | 'bundle' | 'other'
export type Source =
  | 'ebay'
  | 'craigslist'
  | 'facebook'
  | 'offerup'
  | 'mercari'
  | 'local_shop'
  | 'tcgplayer'
  | 'trollandtoad'
  | 'bestbuy'
  | 'walmart'
  | 'gamestop'
  | 'topcutcomics'
export type Category = 'tcg_sealed' | 'merch'
export type Era = 'score' | 'panini' | 'bandai_super'

export interface Listing {
  id: string
  source: Source
  external_id: string
  title: string
  set_name?: string
  product_type?: ProductType
  price?: number
  currency: string
  condition?: string
  in_stock: boolean
  quantity_available?: number
  url: string
  image_url?: string
  has_stored_image?: boolean
  seller?: string
  first_seen_at: string
  last_seen_at: string
  last_price_change_at?: string
  previous_price?: number
  // reseller deal fields (migration 002)
  category?: Category
  era?: Era
  market_value?: number
  deal_score?: number
  deal_reason?: string
  city?: string
  distance_mi?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ScrapedListing extends Omit<Listing, 'id' | 'first_seen_at' | 'last_seen_at' | 'is_active' | 'created_at' | 'updated_at'> {}

export interface ScanRun {
  id: string
  started_at: string
  completed_at?: string
  sources_scanned: string[]
  new_listings_found: number
  price_changes_found: number
  errors: string[]
  status: 'running' | 'completed' | 'failed'
}
