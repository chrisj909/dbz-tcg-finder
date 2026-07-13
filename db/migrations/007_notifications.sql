-- Migration 007: notification preferences + last-seen tracking (#26/#71)
-- Two distinct "since when" cursors per user: last_seen_at (in-app pop-up,
-- updated whenever they dismiss it) and last_notified_at (email digest,
-- updated whenever a digest actually sends — independent cadence so a user
-- who never opens the dashboard still gets emailed, and a user who visits
-- constantly doesn't get re-emailed the same items they already saw in-app).
create table if not exists user_notification_prefs (
  user_id          uuid primary key references neon_auth."user"(id) on delete cascade,
  email_enabled    boolean not null default true,
  last_seen_at     timestamptz not null default now(),
  last_notified_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
