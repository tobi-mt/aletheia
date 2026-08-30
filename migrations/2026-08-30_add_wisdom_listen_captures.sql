CREATE TABLE IF NOT EXISTS wisdom_listen_captures (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  matches JSONB NOT NULL DEFAULT '[]'::jsonb,
  counsel TEXT NOT NULL DEFAULT '',
  application TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL,
  language TEXT NOT NULL,
  bible_translation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS wisdom_listen_captures_user_created_idx
  ON wisdom_listen_captures(user_id, created_at DESC);
