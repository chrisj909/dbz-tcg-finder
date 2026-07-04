-- Migration 004: per-user watchlist (Closes #14)
-- Lets signed-in users star listings; keyed to Neon Auth's neon_auth."user" table
-- (the Better-Auth-powered Neon Auth schema — not the old Stack Auth users_sync).
create table if not exists watchlist_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references neon_auth."user"(id) on delete cascade,
  listing_id  uuid not null references listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint watchlist_items_user_listing_key unique (user_id, listing_id)
);
create index if not exists watchlist_items_user_idx on watchlist_items (user_id);
