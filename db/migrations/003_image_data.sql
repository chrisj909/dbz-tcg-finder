-- Migration 003: store images as base64 data URLs at scrape time (Closes #35)
-- FB CDN URLs expire; this column holds the image content so it never breaks.
alter table listings add column if not exists image_data text;
