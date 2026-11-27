-- Bible reader study data: per-verse notes and account-synced highlights.
-- All changes are additive and safe to apply repeatedly.
CREATE TABLE IF NOT EXISTS scripture_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_entry_id TEXT NOT NULL,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  end_verse INTEGER NOT NULL,
  passage TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, client_entry_id),
  UNIQUE(user_id, book, chapter, verse)
);

CREATE INDEX IF NOT EXISTS scripture_notes_user_updated_idx
  ON scripture_notes (user_id, updated_at DESC);

-- A NULL color records a cleared highlight so the removal reaches every device.
CREATE TABLE IF NOT EXISTS scripture_highlights (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  color TEXT,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, book, chapter, verse)
);

CREATE INDEX IF NOT EXISTS scripture_highlights_user_updated_idx
  ON scripture_highlights (user_id, updated_at DESC);
