-- DBZ TCG Finder — Migration 002: reseller deal/pricing model
-- Additive + idempotent. Safe to apply to the live DB (new columns are nullable,
-- so the running app's SELECT * just sees extra NULLs).

-- ── listings: deal + classification + location fields ────────────────────────
alter table listings add column if not exists category      text;          -- 'tcg_sealed' | 'merch'
alter table listings add column if not exists era           text;          -- 'score' | 'panini' | 'bandai_super'
alter table listings add column if not exists market_value  numeric(10,2); -- est. resale value (e.g. eBay SOLD median)
alter table listings add column if not exists deal_score    integer;       -- 0-100 composite
alter table listings add column if not exists deal_reason   text;          -- why it's flagged (human-readable)
alter table listings add column if not exists city          text;          -- listing location (local sources)
alter table listings add column if not exists distance_mi   numeric(6,1);  -- miles from Birmingham

create index if not exists listings_deal_score_idx on listings (deal_score desc) where deal_score is not null;
create index if not exists listings_category_idx   on listings (category);

-- ── market_values: resale benchmarks per product key ─────────────────────────
-- One row per (normalized product, source). eBay SOLD median is the primary input.
create table if not exists market_values (
  id            uuid primary key default gen_random_uuid(),
  product_key   text not null,                 -- normalized product signature (set + type)
  label         text,                          -- human label for the product
  source        text not null,                 -- 'ebay_sold' | 'tcgplayer' | ...
  median_price  numeric(10,2),
  low_price     numeric(10,2),
  high_price    numeric(10,2),
  sample_size   integer not null default 0,
  currency      text not null default 'USD',
  as_of         timestamptz not null default now(),
  constraint market_values_key_source_key unique (product_key, source)
);
create index if not exists market_values_key_idx on market_values (product_key);

-- ── price_history: every observed price point (for price-drop velocity) ──────
create table if not exists price_history (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id) on delete cascade,
  price       numeric(10,2) not null,
  seen_at     timestamptz not null default now()
);
create index if not exists price_history_listing_idx on price_history (listing_id, seen_at desc);
