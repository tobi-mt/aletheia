BEGIN;

CREATE TABLE IF NOT EXISTS challenge_circle_nudge_deliveries (
  id TEXT PRIMARY KEY,
  nudge_id TEXT NOT NULL REFERENCES challenge_circle_nudges(id) ON DELETE CASCADE,
  circle_id TEXT NOT NULL REFERENCES challenge_circles(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  status_reason TEXT,
  accepted_recipient_count INTEGER NOT NULL DEFAULT 0,
  push_subscription_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  attempted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(nudge_id)
);

CREATE TABLE IF NOT EXISTS notification_delivery_receipts (
  id TEXT PRIMARY KEY,
  notification_kind TEXT NOT NULL,
  notification_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  circle_id TEXT REFERENCES challenge_circles(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES counsel_contacts(id) ON DELETE CASCADE,
  challenge_id TEXT,
  opened_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(notification_kind, notification_id, recipient_user_id)
);

CREATE TABLE IF NOT EXISTS counsel_comment_deliveries (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES counsel_comments(id) ON DELETE CASCADE,
  shared_decision_id TEXT NOT NULL REFERENCES counsel_shared_decisions(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES counsel_contacts(id) ON DELETE CASCADE,
  decision_id TEXT NOT NULL REFERENCES wisdom_decisions(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  status_reason TEXT,
  accepted_recipient_count INTEGER NOT NULL DEFAULT 0,
  push_subscription_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  attempted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE(comment_id)
);

CREATE TABLE IF NOT EXISTS push_delivery_failures (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  failure_kind TEXT NOT NULL,
  status_code INTEGER,
  reason TEXT NOT NULL,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS challenge_circle_nudge_deliveries_circle_idx ON challenge_circle_nudge_deliveries(circle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS challenge_circle_nudge_deliveries_nudge_idx ON challenge_circle_nudge_deliveries(nudge_id);
CREATE INDEX IF NOT EXISTS notification_delivery_receipts_lookup_idx ON notification_delivery_receipts(notification_kind, notification_id, recipient_user_id);
CREATE INDEX IF NOT EXISTS notification_delivery_receipts_sender_idx ON notification_delivery_receipts(sender_user_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS counsel_comment_deliveries_sender_idx ON counsel_comment_deliveries(sender_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS counsel_comment_deliveries_comment_idx ON counsel_comment_deliveries(comment_id);
CREATE INDEX IF NOT EXISTS push_delivery_failures_user_idx ON push_delivery_failures(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS push_delivery_failures_subscription_idx ON push_delivery_failures(subscription_id, created_at DESC);

COMMIT;
