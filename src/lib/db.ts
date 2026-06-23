import "server-only";
import { Pool } from "pg";
import { wisdomEntries } from "@/lib/wisdom-data";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required. Set it to your Neon Postgres connection string.");
}

const globalForDb = globalThis as unknown as {
  aletheiaPool?: Pool;
  aletheiaDbReady?: Promise<void>;
};

function poolConfig(url: string) {
  const parsed = new URL(url);
  const sslMode = parsed.searchParams.get("sslmode");
  const needsSsl =
    Boolean(sslMode && sslMode !== "disable") || parsed.hostname.includes("neon.tech");

  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");

  return {
    connectionString: parsed.toString(),
    ssl: needsSsl ? true : undefined,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
}

export const pool =
  globalForDb.aletheiaPool ??
  new Pool(poolConfig(connectionString));

if (process.env.NODE_ENV !== "production") {
  globalForDb.aletheiaPool = pool;
}

function postgresParams(sql: string) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      avatar_url TEXT,
      password_hash TEXT NOT NULL,
      last_seen_at TIMESTAMPTZ,
      login_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS consecutive_use_days INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_use_date DATE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_achievements JSONB NOT NULL DEFAULT '{}'::jsonb;

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wisdom_entries (
      id TEXT PRIMARY KEY,
      theme TEXT NOT NULL,
      scripture TEXT NOT NULL UNIQUE,
      principle TEXT NOT NULL,
      context TEXT NOT NULL,
      application TEXT NOT NULL,
      keywords JSONB NOT NULL,
      emotions JSONB NOT NULL,
      questions JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      mode TEXT NOT NULL,
      content TEXT NOT NULL,
      sources JSONB,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      mode TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gratitude_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_entry_id TEXT NOT NULL,
      image_data_url TEXT NOT NULL,
      note TEXT NOT NULL,
      place TEXT NOT NULL DEFAULT '',
      formation TEXT,
      visual JSONB NOT NULL DEFAULT '{}'::jsonb,
      postcard_created_at TIMESTAMPTZ,
      reflected_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      UNIQUE(user_id, client_entry_id)
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      preferred_hour INTEGER NOT NULL DEFAULT 8,
      preferred_local_hour INTEGER NOT NULL DEFAULT 8,
      preferred_timezone TEXT NOT NULL DEFAULT 'UTC',
      timezone_mode TEXT NOT NULL DEFAULT 'auto',
      delivery_strategy TEXT NOT NULL DEFAULT 'morning',
      last_sent_at TIMESTAMPTZ,
      last_gratitude_sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS preferred_local_hour INTEGER NOT NULL DEFAULT 8;
    ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS preferred_timezone TEXT NOT NULL DEFAULT 'UTC';
    ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS timezone_mode TEXT NOT NULL DEFAULT 'auto';
    ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS delivery_strategy TEXT NOT NULL DEFAULT 'morning';
    ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS last_gratitude_sent_at TIMESTAMPTZ;
    ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS last_challenge_notified_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS counsel_contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar_url TEXT,
      contact TEXT,
      notes TEXT,
      invite_token_hash TEXT UNIQUE,
      invite_status TEXT NOT NULL DEFAULT 'pending',
      can_view_summaries BOOLEAN NOT NULL DEFAULT TRUE,
      can_comment_on_decisions BOOLEAN NOT NULL DEFAULT FALSE,
      can_receive_checkins BOOLEAN NOT NULL DEFAULT FALSE,
      accepted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    ALTER TABLE counsel_contacts ADD COLUMN IF NOT EXISTS contact TEXT;
    ALTER TABLE counsel_contacts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE counsel_contacts ADD COLUMN IF NOT EXISTS invite_token_hash TEXT UNIQUE;
    ALTER TABLE counsel_contacts ADD COLUMN IF NOT EXISTS invite_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE counsel_contacts ADD COLUMN IF NOT EXISTS can_view_summaries BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE counsel_contacts ADD COLUMN IF NOT EXISTS can_comment_on_decisions BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE counsel_contacts ADD COLUMN IF NOT EXISTS can_receive_checkins BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE counsel_contacts ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS wisdom_decisions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      mode TEXT NOT NULL,
      pressure TEXT NOT NULL,
      initial_emotion TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'discerning',
      readiness INTEGER NOT NULL DEFAULT 45,
      counsel_sought BOOLEAN NOT NULL DEFAULT FALSE,
      cost_counted BOOLEAN NOT NULL DEFAULT FALSE,
      alignment_clear BOOLEAN NOT NULL DEFAULT FALSE,
      reversible_step BOOLEAN NOT NULL DEFAULT FALSE,
      peace_over_urgency BOOLEAN NOT NULL DEFAULT FALSE,
      waiting_until TIMESTAMPTZ,
      revisit_at TIMESTAMPTZ,
      waiting_notified_at TIMESTAMPTZ,
      revisit_notified_at TIMESTAMPTZ,
      outcome_review_at TIMESTAMPTZ,
      summary TEXT,
      final_decision TEXT,
      learning TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    ALTER TABLE wisdom_decisions ADD COLUMN IF NOT EXISTS revisit_at TIMESTAMPTZ;
    ALTER TABLE wisdom_decisions ADD COLUMN IF NOT EXISTS waiting_notified_at TIMESTAMPTZ;
    ALTER TABLE wisdom_decisions ADD COLUMN IF NOT EXISTS revisit_notified_at TIMESTAMPTZ;
    ALTER TABLE wisdom_decisions ADD COLUMN IF NOT EXISTS outcome_review_at TIMESTAMPTZ;
    ALTER TABLE wisdom_decisions ADD COLUMN IF NOT EXISTS timeline_checkpoints JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE wisdom_decisions ADD COLUMN IF NOT EXISTS notification_sequence_sent JSONB NOT NULL DEFAULT '{}'::jsonb;

    CREATE TABLE IF NOT EXISTS decision_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      decision_id TEXT REFERENCES wisdom_decisions(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      body TEXT NOT NULL,
      mode TEXT,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_schedules (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      decision_id TEXT NOT NULL REFERENCES wisdom_decisions(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day INT NOT NULL,
      scheduled_for TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      sent_at TIMESTAMPTZ,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(decision_id, day)
    );

    CREATE TABLE IF NOT EXISTS counsel_shared_decisions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contact_id TEXT NOT NULL REFERENCES counsel_contacts(id) ON DELETE CASCADE,
      decision_id TEXT NOT NULL REFERENCES wisdom_decisions(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL,
      UNIQUE(contact_id, decision_id)
    );

    CREATE TABLE IF NOT EXISTS counsel_comments (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL REFERENCES counsel_contacts(id) ON DELETE CASCADE,
      decision_id TEXT NOT NULL REFERENCES wisdom_decisions(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS challenge_circles (
      id TEXT PRIMARY KEY,
      challenge_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invite_token_hash TEXT NOT NULL UNIQUE,
      invite_status TEXT NOT NULL DEFAULT 'pending',
      note TEXT,
      invite_details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      accepted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    ALTER TABLE challenge_circles ADD COLUMN IF NOT EXISTS invite_details_json JSONB NOT NULL DEFAULT '{}'::jsonb;

    CREATE TABLE IF NOT EXISTS challenge_circle_members (
      id TEXT PRIMARY KEY,
      circle_id TEXT NOT NULL REFERENCES challenge_circles(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'host',
      joined_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      UNIQUE(circle_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS challenge_circle_nudges (
      id TEXT PRIMARY KEY,
      circle_id TEXT NOT NULL REFERENCES challenge_circles(id) ON DELETE CASCADE,
      sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS challenge_circle_invite_responses (
      id TEXT PRIMARY KEY,
      circle_id TEXT NOT NULL REFERENCES challenge_circles(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      response_status TEXT NOT NULL,
      responded_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      UNIQUE(circle_id, user_id)
    );

    ALTER TABLE challenge_circle_invite_responses ADD COLUMN IF NOT EXISTS response_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE challenge_circle_invite_responses ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
    ALTER TABLE challenge_circle_invite_responses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS rule_of_life_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mode TEXT NOT NULL,
      principle TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      language TEXT NOT NULL DEFAULT 'en',
      region TEXT NOT NULL DEFAULT 'global',
      bible_translation TEXT NOT NULL DEFAULT 'WEB',
      voice_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      notification_preferred_local_hour INTEGER NOT NULL DEFAULT 8,
      notification_preferred_timezone TEXT NOT NULL DEFAULT 'UTC',
      notification_timezone_mode TEXT NOT NULL DEFAULT 'auto',
      notification_delivery_strategy TEXT NOT NULL DEFAULT 'morning',
      notification_timing_updated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    ALTER TABLE user_preferences ALTER COLUMN voice_enabled SET DEFAULT TRUE;
    ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notification_preferred_local_hour INTEGER NOT NULL DEFAULT 8;
    ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notification_preferred_timezone TEXT NOT NULL DEFAULT 'UTC';
    ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notification_timezone_mode TEXT NOT NULL DEFAULT 'auto';
    ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notification_delivery_strategy TEXT NOT NULL DEFAULT 'morning';
    ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notification_timing_updated_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS user_manual_context (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      health_context TEXT NOT NULL DEFAULT '',
      finance_context TEXT NOT NULL DEFAULT '',
      work_context TEXT NOT NULL DEFAULT '',
      obligations TEXT NOT NULL DEFAULT '',
      goals TEXT NOT NULL DEFAULT '',
      boundaries TEXT NOT NULL DEFAULT '',
      context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      use_in_answers BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    ALTER TABLE user_manual_context ADD COLUMN IF NOT EXISTS context_json JSONB NOT NULL DEFAULT '{}'::jsonb;

    CREATE TABLE IF NOT EXISTS user_memory_summaries (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      summary TEXT NOT NULL DEFAULT '',
      answer_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS answer_feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      value TEXT NOT NULL,
      mode TEXT,
      placement TEXT,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      anon_id TEXT,
      session_id TEXT,
      event_name TEXT NOT NULL,
      path TEXT,
      referrer TEXT,
      source TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_metrics (
      metric_key TEXT PRIMARY KEY,
      metric_value BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS chat_messages_user_created_idx ON chat_messages(user_id, created_at);
    CREATE INDEX IF NOT EXISTS journal_entries_user_created_idx ON journal_entries(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS gratitude_entries_user_created_idx ON gratitude_entries(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS rate_limits_reset_idx ON rate_limits(reset_at);
    CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS push_subscriptions_enabled_idx ON push_subscriptions(enabled, preferred_hour);
    CREATE INDEX IF NOT EXISTS counsel_contacts_user_idx ON counsel_contacts(user_id);
    CREATE INDEX IF NOT EXISTS counsel_contacts_invite_hash_idx ON counsel_contacts(invite_token_hash);
    CREATE INDEX IF NOT EXISTS counsel_shared_decisions_user_idx ON counsel_shared_decisions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS counsel_shared_decisions_contact_idx ON counsel_shared_decisions(contact_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS counsel_comments_contact_decision_idx ON counsel_comments(contact_id, decision_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS challenge_circles_owner_idx ON challenge_circles(owner_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS challenge_circles_invite_hash_idx ON challenge_circles(invite_token_hash);
    CREATE INDEX IF NOT EXISTS challenge_circle_members_circle_idx ON challenge_circle_members(circle_id, joined_at DESC);
    CREATE INDEX IF NOT EXISTS challenge_circle_members_user_idx ON challenge_circle_members(user_id, joined_at DESC);
    CREATE INDEX IF NOT EXISTS challenge_circle_nudges_circle_idx ON challenge_circle_nudges(circle_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS challenge_circle_invite_responses_circle_idx ON challenge_circle_invite_responses(circle_id, responded_at DESC);
    CREATE INDEX IF NOT EXISTS challenge_circle_invite_responses_user_idx ON challenge_circle_invite_responses(user_id, responded_at DESC);
    CREATE INDEX IF NOT EXISTS wisdom_decisions_user_updated_idx ON wisdom_decisions(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS decision_events_user_created_idx ON decision_events(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS notification_schedules_user_pending_idx ON notification_schedules(user_id, status, scheduled_for);
    CREATE INDEX IF NOT EXISTS notification_schedules_scheduled_idx ON notification_schedules(scheduled_for, status);
    CREATE INDEX IF NOT EXISTS rule_of_life_entries_user_idx ON rule_of_life_entries(user_id);
    CREATE INDEX IF NOT EXISTS user_preferences_language_idx ON user_preferences(language, region);
    CREATE INDEX IF NOT EXISTS user_manual_context_updated_idx ON user_manual_context(updated_at DESC);
    CREATE INDEX IF NOT EXISTS user_memory_summaries_updated_idx ON user_memory_summaries(updated_at DESC);
    CREATE INDEX IF NOT EXISTS answer_feedback_user_created_idx ON answer_feedback(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS wisdom_decisions_revisit_idx ON wisdom_decisions(user_id, revisit_at);
    CREATE INDEX IF NOT EXISTS wisdom_decisions_waiting_due_idx ON wisdom_decisions(user_id, waiting_until, waiting_notified_at);
    CREATE INDEX IF NOT EXISTS wisdom_decisions_revisit_due_idx ON wisdom_decisions(user_id, revisit_at, revisit_notified_at);
    CREATE INDEX IF NOT EXISTS wisdom_decisions_outcome_review_idx ON wisdom_decisions(user_id, outcome_review_at);
    CREATE INDEX IF NOT EXISTS analytics_events_created_idx ON analytics_events(created_at DESC);
    CREATE INDEX IF NOT EXISTS analytics_events_name_created_idx ON analytics_events(event_name, created_at DESC);
    CREATE INDEX IF NOT EXISTS analytics_events_user_created_idx ON analytics_events(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS analytics_events_anon_created_idx ON analytics_events(anon_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS challenge_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_id TEXT NOT NULL,
      day INTEGER NOT NULL,
      reflection TEXT NOT NULL DEFAULT '',
      completed_at TIMESTAMPTZ NOT NULL,
      UNIQUE(user_id, challenge_id, day)
    );

    CREATE INDEX IF NOT EXISTS challenge_progress_user_challenge_idx ON challenge_progress(user_id, challenge_id, day);
    CREATE INDEX IF NOT EXISTS challenge_progress_user_completed_idx ON challenge_progress(user_id, completed_at DESC);
  `);

  const { rows } = await pool.query<{ count: string }>(
    "SELECT COUNT(*) as count FROM wisdom_entries"
  );

  if (Number(rows[0]?.count ?? 0) > 0) {
    return;
  }

  const now = new Date().toISOString();
  for (const entry of wisdomEntries) {
    await pool.query(
      `INSERT INTO wisdom_entries (
        id, theme, scripture, principle, context, application, keywords, emotions, questions, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11)
      ON CONFLICT (scripture) DO NOTHING`,
      [
        crypto.randomUUID(),
        entry.theme,
        entry.scripture,
        entry.principle,
        entry.context,
        entry.application,
        JSON.stringify(entry.keywords),
        JSON.stringify(entry.emotions),
        JSON.stringify(entry.questions),
        now,
        now,
      ]
    );
  }
}

export async function ensureDbReady() {
  globalForDb.aletheiaDbReady ??= initializeDatabase();
  return globalForDb.aletheiaDbReady;
}

export async function one<T extends Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
) {
  await ensureDbReady();
  const result = await pool.query(postgresParams(sql), params);
  return result.rows[0] as T | undefined;
}

export async function many<T extends Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
) {
  await ensureDbReady();
  const result = await pool.query(postgresParams(sql), params);
  return result.rows as T[];
}

export async function run(sql: string, ...params: unknown[]) {
  await ensureDbReady();
  return pool.query(postgresParams(sql), params);
}
