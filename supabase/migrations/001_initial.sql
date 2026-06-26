-- DBZ TCG Finder — Initial Schema
-- Run this in your Supabase SQL editor or via the Supabase CLI:
--   supabase db push

-- ── listings ────────────────────────────────────────────────────────────────
create table if not exists listings (
  id                    uuid primary key default gen_random_uuid(),
  source                text not null,           -- 'tcgplayer' | 'ebay' | 'trollandtoad'
  external_id           text not null,           -- source's unique ID for this listing
  title                 text not null,
  set_name              text,                    -- e.g. 'Zenkai Series', 'Fusion World'
  product_type          text,                    -- 'booster_box' | 'booster_pack' | 'case' | 'bundle' | 'other'
  price                 numeric(10,2),
  currency              text not null default 'USD',
  condition             text,                    -- 'new' | 'used' | 'sealed'
  in_stock              boolean not null default true,
  quantity_available    integer,
  url                   text not null,
  image_url             text,
  seller                text,
  first_seen_at         timestamptz not null default now(),
  last_seen_at          timestamptz not null default now(),
  last_price_change_at  timestamptz,
  previous_price        numeric(10,2),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint listings_source_external_id_key unique (source, external_id)
);

-- ── scan_runs ────────────────────────────────────────────────────────────────
create table if not exists scan_runs (
  id                    uuid primary key default gen_random_uuid(),
  started_at            timestamptz not null default now(),
  completed_at          timestamptz,
  sources_scanned       text[] not null default '{}',
  new_listings_found    integer not null default 0,
  price_changes_found   integer not null default 0,
  errors                text[] not null default '{}',
  status                text not null default 'running'  -- 'running' | 'completed' | 'failed'
);

-- ── indexes ──────────────────────────────────────────────────────────────────
create index if not exists listings_source_idx         on listings (source);
create index if not exists listings_product_type_idx   on listings (product_type);
create index if not exists listings_in_stock_idx        on listings (in_stock);
create index if not exists listings_first_seen_idx      on listings (first_seen_at desc);
create index if not exists listings_is_active_idx       on listings (is_active);
create index if not exists listings_price_idx           on listings (price) where price is not null;
create index if not exists scan_runs_started_idx        on scan_runs (started_at desc);

-- ── updated_at trigger ───────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger listings_updated_at
  before update on listings
  for each row execute function set_updated_at();

-- ── Row-Level Security (optional — enable if using anon key from browser) ────
-- alter table listings enable row level security;
-- alter table scan_runs enable row level security;
-- create policy "Public read" on listings for select using (true);
-- create policy "Service write" on listings for insert with check (true);
-- create policy "Service update" on listings for update using (true);
