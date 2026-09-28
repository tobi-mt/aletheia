BEGIN;

ALTER TABLE native_push_devices
  ADD COLUMN IF NOT EXISTS last_challenge_notified_at TIMESTAMPTZ;

COMMIT;
