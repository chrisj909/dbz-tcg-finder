-- Migration 005: pre-order detection (#70)
-- Pre-orders were being treated identically to in-stock listings — add a
-- flag so the dashboard can badge/filter them distinctly.
alter table listings add column if not exists is_preorder boolean not null default false;
create index if not exists listings_is_preorder_idx on listings (is_preorder) where is_preorder = true;
