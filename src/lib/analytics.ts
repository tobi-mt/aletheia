import { headers } from "next/headers";
import { many, run } from "@/lib/db";

const ALLOWED_EVENTS = new Set([
  "app_opened",
  "answer_feedback",
  "app_shared",
  "auth_email_login_success",
  "auth_email_register_success",
  "auth_google_success",
  "chat_question_sent",
  "counsel_contact_created",
  "decision_created",
  "decision_updated",
  "journal_entry_created",
  "notification_enabled",
  "rule_created",
  "wisdom_mode_selected",
]);

type AnalyticsMetadata = Record<string, string | number | boolean | null>;

export type AnalyticsEventInput = {
  userId?: string | null;
  anonId?: string | null;
  sessionId?: string | null;
  eventName: string;
  path?: string | null;
  referrer?: string | null;
  source?: string | null;
  metadata?: AnalyticsMetadata;
  userAgent?: string | null;
};

function trimField(value: string | null | undefined, limit: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, limit) : null;
}

function sanitizeMetadata(metadata: AnalyticsMetadata = {}) {
  return Object.fromEntries(
    Object.entries(metadata)
      .slice(0, 20)
      .filter(([, value]) => value === null || ["string", "number", "boolean"].includes(typeof value))
      .map(([key, value]) => [
        key.replace(/[^a-zA-Z0-9_:-]/g, "").slice(0, 48),
        typeof value === "string" ? value.slice(0, 120) : value,
      ])
      .filter(([key]) => key)
  );
}

export async function trackEvent(input: AnalyticsEventInput) {
  if (!ALLOWED_EVENTS.has(input.eventName)) {
    return;
  }

  await run(
    `INSERT INTO analytics_events (
      id, user_id, anon_id, session_id, event_name, path, referrer, source, metadata, user_agent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    crypto.randomUUID(),
    input.userId ?? null,
    trimField(input.anonId, 120),
    trimField(input.sessionId, 120),
    input.eventName,
    trimField(input.path, 300),
    trimField(input.referrer, 300),
    trimField(input.source, 120),
    JSON.stringify(sanitizeMetadata(input.metadata)),
    trimField(input.userAgent, 300),
    new Date().toISOString()
  );
}

export async function trackServerEvent(input: Omit<AnalyticsEventInput, "userAgent">) {
  const headerStore = await headers();
  await trackEvent({
    ...input,
    userAgent: headerStore.get("user-agent"),
  });
}

export async function analyticsSummary() {
  const [overviewRows, eventRows, modeRows, dailyRows] = await Promise.all([
    many<{ metric: string; value: number }>(
      `SELECT 'registered_users' AS metric, COUNT(*)::int AS value FROM users
       UNION ALL
       SELECT 'active_sessions', COUNT(DISTINCT user_id)::int FROM sessions WHERE expires_at > now()
       UNION ALL
       SELECT 'anonymous_devices_30d', COUNT(DISTINCT anon_id)::int FROM analytics_events
        WHERE anon_id IS NOT NULL AND created_at >= now() - interval '30 days'
       UNION ALL
       SELECT 'identified_active_users_30d', COUNT(DISTINCT user_id)::int FROM analytics_events
        WHERE user_id IS NOT NULL AND created_at >= now() - interval '30 days'
       UNION ALL
       SELECT 'events_24h', COUNT(*)::int FROM analytics_events WHERE created_at >= now() - interval '24 hours'
       UNION ALL
       SELECT 'events_30d', COUNT(*)::int FROM analytics_events WHERE created_at >= now() - interval '30 days'`
    ),
    many<{ event_name: string; count: number; unique_people: number }>(
      `SELECT event_name,
              COUNT(*)::int AS count,
              COUNT(DISTINCT COALESCE(user_id, anon_id))::int AS unique_people
       FROM analytics_events
       WHERE created_at >= now() - interval '30 days'
       GROUP BY event_name
       ORDER BY count DESC`
    ),
    many<{ mode: string; count: number }>(
      `SELECT metadata->>'mode' AS mode, COUNT(*)::int AS count
       FROM analytics_events
       WHERE metadata->>'mode' IS NOT NULL
         AND created_at >= now() - interval '30 days'
       GROUP BY metadata->>'mode'
       ORDER BY count DESC`
    ),
    many<{ day: string; signups: number; active_people: number; events: number }>(
      `WITH days AS (
         SELECT generate_series(current_date - interval '13 days', current_date, interval '1 day')::date AS day
       ),
       signup_counts AS (
         SELECT created_at::date AS day, COUNT(DISTINCT id)::int AS signups
         FROM users
         WHERE created_at::date >= current_date - interval '13 days'
         GROUP BY created_at::date
       ),
       event_counts AS (
         SELECT created_at::date AS day,
                COUNT(DISTINCT COALESCE(user_id, anon_id))::int AS active_people,
                COUNT(*)::int AS events
         FROM analytics_events
         WHERE created_at::date >= current_date - interval '13 days'
         GROUP BY created_at::date
       )
       SELECT days.day::text AS day,
              COALESCE(signup_counts.signups, 0)::int AS signups,
              COALESCE(event_counts.active_people, 0)::int AS active_people,
              COALESCE(event_counts.events, 0)::int AS events
       FROM days
       LEFT JOIN signup_counts ON signup_counts.day = days.day
       LEFT JOIN event_counts ON event_counts.day = days.day
       ORDER BY days.day ASC`
    ),
  ]);

  return {
    overview: Object.fromEntries(overviewRows.map((row) => [row.metric, row.value])),
    events30d: eventRows,
    modes30d: modeRows.filter((row) => row.mode),
    daily14d: dailyRows,
  };
}
