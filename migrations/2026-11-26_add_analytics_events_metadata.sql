-- Older production databases can predate the structured analytics payload.
-- All changes are additive and safe to apply repeatedly.
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS anon_id TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS path TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS analytics_events_created_idx
  ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_event_created_idx
  ON analytics_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_anon_created_idx
  ON analytics_events (anon_id, created_at DESC)
  WHERE anon_id IS NOT NULL;
