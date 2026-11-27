-- Formation practices can be started before Day 1 is saved, and circle members
-- can re-share invite links. All changes are additive and safe to apply repeatedly.
CREATE TABLE IF NOT EXISTS challenge_enrollments (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS challenge_circle_invite_links (
  token_hash TEXT PRIMARY KEY,
  circle_id TEXT NOT NULL REFERENCES challenge_circles(id) ON DELETE CASCADE,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS challenge_circle_invite_links_circle_idx
  ON challenge_circle_invite_links (circle_id, created_at DESC);
