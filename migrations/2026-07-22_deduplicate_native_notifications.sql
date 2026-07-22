BEGIN;

ALTER TABLE native_push_devices
  ADD COLUMN IF NOT EXISTS last_gratitude_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS notification_cron_runs (
  window_key TEXT PRIMARY KEY,
  claimed_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

COMMIT;
