CREATE TABLE IF NOT EXISTS native_push_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  device_name TEXT,
  app_version TEXT,
  build_version TEXT,
  push_environment TEXT,
  last_seen_at TIMESTAMPTZ,
  last_registered_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  last_gratitude_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE native_push_devices ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE native_push_devices ADD COLUMN IF NOT EXISTS device_name TEXT;
ALTER TABLE native_push_devices ADD COLUMN IF NOT EXISTS app_version TEXT;
ALTER TABLE native_push_devices ADD COLUMN IF NOT EXISTS build_version TEXT;
ALTER TABLE native_push_devices ADD COLUMN IF NOT EXISTS push_environment TEXT;
ALTER TABLE native_push_devices ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE native_push_devices ADD COLUMN IF NOT EXISTS last_registered_at TIMESTAMPTZ;
ALTER TABLE native_push_devices ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ;
ALTER TABLE native_push_devices ADD COLUMN IF NOT EXISTS last_gratitude_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS native_push_devices_user_idx ON native_push_devices(user_id, platform, updated_at DESC);
CREATE INDEX IF NOT EXISTS native_push_devices_enabled_idx ON native_push_devices(enabled, platform);
CREATE INDEX IF NOT EXISTS native_push_devices_last_seen_idx ON native_push_devices(last_seen_at DESC);
