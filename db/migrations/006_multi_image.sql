-- Migration 006: multi-photo support (#68)
-- Most sources' search-result grids only expose one thumbnail per item —
-- getting more requires a per-item detail-page visit, which is a real cost/
-- risk increase for high-volume Playwright sources (deferred, see #68).
-- Best Buy's official Products API genuinely returns several image fields
-- for free in the same response already being fetched — this column lets
-- any source (now or later) attach extras without disturbing the existing
-- single image_url/image_data "primary image" fields other code relies on.
alter table listings add column if not exists image_urls jsonb;
