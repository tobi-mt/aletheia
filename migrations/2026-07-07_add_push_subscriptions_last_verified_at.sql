BEGIN;

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

UPDATE push_subscriptions
SET last_verified_at = COALESCE(last_verified_at, updated_at, created_at)
WHERE last_verified_at IS NULL;

COMMIT;
