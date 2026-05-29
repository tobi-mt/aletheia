import { headers } from "next/headers";
import { many, run } from "@/lib/db";

const ALLOWED_EVENTS = new Set([
  "app_opened",
  "app_update_overlay_shown",
  "app_update_refresh_landed",
  "app_view_changed",
  "answer_feedback",
  "app_shared",
  "auth_failure",
  "auth_email_login_success",
  "auth_email_register_success",
  "auth_google_success",
  "auth_logout",
  "chat_question_sent",
  "counsel_contact_added_local",
  "counsel_contact_created",
  "counsel_decision_shared",
  "counsel_decisions_bulk_shared",
  "decision_created_local",
  "decision_created",
  "decision_updated",
  "journal_entry_created_local",
  "journal_entry_created",
  "notification_disabled",
  "notification_enabled",
  "notification_timing_updated",
  "rule_created",
  "rule_created_local",
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
  const [
    overviewRows,
    eventRows,
    modeRows,
    dailyRows,
    featureRows,
    funnelRows,
    feedbackRows,
    viewRows,
    sourceRows,
    pathRows,
    hourlyRows,
    retentionRows,
    authFailureRows,
  ] = await Promise.all([
    many<{ metric: string; value: number }>(
      `SELECT 'registered_users' AS metric, COUNT(*)::int AS value FROM users
       UNION ALL
       SELECT 'active_sessions', COUNT(DISTINCT user_id)::int FROM sessions WHERE expires_at > now()
        UNION ALL
        SELECT 'new_users_30d', COUNT(*)::int FROM users WHERE created_at >= now() - interval '30 days'
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
    many<{ feature: string; event_name: string; actions: number; unique_people: number }>(
      `WITH recent_events AS (
         SELECT event_name,
                COALESCE(user_id, anon_id, session_id) AS person_id
         FROM analytics_events
         WHERE created_at >= now() - interval '30 days'
       ),
       feature_map(feature, event_name) AS (
         VALUES
           ('chat_questions', 'chat_question_sent'),
           ('mode_switches', 'wisdom_mode_selected'),
           ('decisions_started', 'decision_created'),
           ('reflections_saved', 'journal_entry_created'),
           ('counsel_contacts', 'counsel_contact_created'),
           ('rules_created', 'rule_created'),
           ('notifications_enabled', 'notification_enabled'),
           ('app_shares', 'app_shared')
       )
       SELECT feature_map.feature,
              feature_map.event_name,
              COUNT(*)::int AS actions,
              COUNT(DISTINCT recent_events.person_id)::int AS unique_people
       FROM recent_events
       JOIN feature_map ON feature_map.event_name = recent_events.event_name
       GROUP BY feature_map.feature, feature_map.event_name
       ORDER BY unique_people DESC, actions DESC`
    ),
    many<{ stage: string; stage_order: number; unique_people: number }>(
      `WITH recent_events AS (
         SELECT event_name,
                COALESCE(user_id, anon_id, session_id) AS person_id
         FROM analytics_events
         WHERE created_at >= now() - interval '30 days'
       ),
       funnel(stage, event_name, stage_order) AS (
         VALUES
           ('opened_app', 'app_opened', 1),
           ('authenticated', 'auth_email_login_success', 2),
           ('authenticated', 'auth_email_register_success', 2),
           ('authenticated', 'auth_google_success', 2),
           ('asked_question', 'chat_question_sent', 3),
           ('started_decision', 'decision_created', 4),
           ('enabled_notifications', 'notification_enabled', 5)
       )
       SELECT funnel.stage,
              MIN(funnel.stage_order)::int AS stage_order,
              COUNT(DISTINCT recent_events.person_id)::int AS unique_people
       FROM recent_events
       JOIN funnel ON funnel.event_name = recent_events.event_name
       GROUP BY funnel.stage
       ORDER BY stage_order ASC`
    ),
    many<{ value: string; count: number }>(
      `SELECT metadata->>'value' AS value,
              COUNT(*)::int AS count
       FROM analytics_events
       WHERE event_name = 'answer_feedback'
         AND created_at >= now() - interval '30 days'
         AND metadata->>'value' IS NOT NULL
       GROUP BY metadata->>'value'
       ORDER BY count DESC`
    ),
    many<{ view: string; count: number; unique_people: number }>(
      `SELECT metadata->>'to_view' AS view,
              COUNT(*)::int AS count,
              COUNT(DISTINCT COALESCE(user_id, anon_id, session_id))::int AS unique_people
       FROM analytics_events
       WHERE event_name = 'app_view_changed'
         AND created_at >= now() - interval '30 days'
         AND metadata->>'to_view' IS NOT NULL
       GROUP BY metadata->>'to_view'
       ORDER BY count DESC`
    ),
    many<{ source: string; count: number; unique_people: number }>(
      `SELECT source,
              COUNT(*)::int AS count,
              COUNT(DISTINCT COALESCE(user_id, anon_id, session_id))::int AS unique_people
       FROM analytics_events
       WHERE source IS NOT NULL
         AND created_at >= now() - interval '30 days'
       GROUP BY source
       ORDER BY count DESC`
    ),
    many<{ path: string; count: number; unique_people: number }>(
      `SELECT path,
              COUNT(*)::int AS count,
              COUNT(DISTINCT COALESCE(user_id, anon_id, session_id))::int AS unique_people
       FROM analytics_events
       WHERE path IS NOT NULL
         AND created_at >= now() - interval '30 days'
       GROUP BY path
       ORDER BY count DESC
       LIMIT 15`
    ),
    many<{ hour_of_day_utc: number; events: number; unique_people: number }>(
      `SELECT EXTRACT(HOUR FROM created_at)::int AS hour_of_day_utc,
              COUNT(*)::int AS events,
              COUNT(DISTINCT COALESCE(user_id, anon_id, session_id))::int AS unique_people
       FROM analytics_events
       WHERE created_at >= now() - interval '30 days'
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour_of_day_utc ASC`
    ),
    many<{ cohort_week: string; signups: number; retained_7d: number; retention_7d_pct: number }>(
      `WITH signup_cohorts AS (
         SELECT date_trunc('week', created_at)::date AS cohort_week,
                id AS user_id,
                created_at AS signup_at
         FROM users
         WHERE created_at >= now() - interval '8 weeks'
       ),
       retention AS (
         SELECT signup_cohorts.cohort_week,
                signup_cohorts.user_id,
                EXISTS (
                  SELECT 1
                  FROM analytics_events
                  WHERE analytics_events.user_id = signup_cohorts.user_id
                    AND analytics_events.created_at > signup_cohorts.signup_at
                    AND analytics_events.created_at <= signup_cohorts.signup_at + interval '7 days'
                ) AS retained_7d
         FROM signup_cohorts
       )
       SELECT retention.cohort_week::text AS cohort_week,
              COUNT(*)::int AS signups,
              COUNT(*) FILTER (WHERE retention.retained_7d)::int AS retained_7d,
              ROUND((100.0 * COUNT(*) FILTER (WHERE retention.retained_7d) / NULLIF(COUNT(*), 0))::numeric, 1)::double precision AS retention_7d_pct
       FROM retention
       GROUP BY retention.cohort_week
       ORDER BY retention.cohort_week ASC`
    ),
    many<{ method: string; flow: string; category: string; reason: string; count: number; unique_people: number }>(
      `SELECT COALESCE(metadata->>'method', 'unknown') AS method,
              COALESCE(metadata->>'flow', 'unknown') AS flow,
              COALESCE(metadata->>'category', 'unknown') AS category,
              COALESCE(metadata->>'reason', 'unknown') AS reason,
              COUNT(*)::int AS count,
              COUNT(DISTINCT COALESCE(user_id, anon_id, session_id))::int AS unique_people
       FROM analytics_events
       WHERE event_name = 'auth_failure'
         AND created_at >= now() - interval '30 days'
       GROUP BY metadata->>'method', metadata->>'flow', metadata->>'category', metadata->>'reason'
       ORDER BY count DESC, unique_people DESC, method ASC, flow ASC, category ASC, reason ASC`
    ),
  ]);

  const funnelSorted = [...funnelRows].sort((a, b) => a.stage_order - b.stage_order);
  const firstStage = funnelSorted[0]?.unique_people ?? 0;

  return {
    overview: Object.fromEntries(overviewRows.map((row) => [row.metric, row.value])),
    events30d: eventRows,
    modes30d: modeRows.filter((row) => row.mode),
    daily14d: dailyRows,
    features30d: featureRows,
    funnel30d: funnelSorted.map((stage, index) => {
      const previous = index > 0 ? funnelSorted[index - 1]?.unique_people ?? 0 : stage.unique_people;
      const fromPrevious = previous > 0 ? Number(((stage.unique_people / previous) * 100).toFixed(1)) : 0;
      const fromFirst = firstStage > 0 ? Number(((stage.unique_people / firstStage) * 100).toFixed(1)) : 0;
      return {
        ...stage,
        conversion_from_previous_pct: fromPrevious,
        conversion_from_first_pct: fromFirst,
      };
    }),
    feedback30d: feedbackRows,
    views30d: viewRows,
    acquisitionSources30d: sourceRows,
    paths30d: pathRows,
    hourlyUsage30d: hourlyRows,
    retentionWeekly: retentionRows,
    authFailures30d: authFailureRows,
  };
}

type UpdateRolloutOverviewRow = {
  shown_count: number;
  landed_count: number;
  shown_unique_cycles: number;
  landed_unique_cycles: number;
  landed_matched_cycles: number;
};

type UpdateRolloutLatencyRow = {
  samples: number;
  avg_elapsed_ms: number;
  p50_elapsed_ms: number;
  p95_elapsed_ms: number;
};

type UpdateRolloutHourlyRow = {
  hour_utc: number;
  shown: number;
  landed: number;
};

export async function updateRolloutSummary(windowHours = 24) {
  const boundedWindowHours = Math.min(24 * 14, Math.max(1, Math.floor(windowHours)));

  const [overview, latency, hourly] = await Promise.all([
    many<UpdateRolloutOverviewRow>(
      `WITH scoped AS (
         SELECT event_name, metadata
         FROM analytics_events
         WHERE created_at >= now() - (? * interval '1 hour')
           AND event_name IN ('app_update_overlay_shown', 'app_update_refresh_landed')
       ),
       shown AS (
         SELECT metadata->>'cycle_id' AS cycle_id
         FROM scoped
         WHERE event_name = 'app_update_overlay_shown'
       ),
       landed AS (
         SELECT metadata->>'cycle_id' AS cycle_id
         FROM scoped
         WHERE event_name = 'app_update_refresh_landed'
       )
       SELECT
         (SELECT COUNT(*)::int FROM shown) AS shown_count,
         (SELECT COUNT(*)::int FROM landed) AS landed_count,
         (SELECT COUNT(DISTINCT cycle_id)::int FROM shown WHERE cycle_id IS NOT NULL AND cycle_id <> '') AS shown_unique_cycles,
         (SELECT COUNT(DISTINCT cycle_id)::int FROM landed WHERE cycle_id IS NOT NULL AND cycle_id <> '') AS landed_unique_cycles,
         (SELECT COUNT(DISTINCT landed.cycle_id)::int
            FROM landed
            JOIN shown ON shown.cycle_id = landed.cycle_id
           WHERE landed.cycle_id IS NOT NULL AND landed.cycle_id <> '') AS landed_matched_cycles`,
      boundedWindowHours
    ),
    many<UpdateRolloutLatencyRow>(
      `SELECT
         COUNT(*)::int AS samples,
         COALESCE(ROUND(AVG((metadata->>'elapsed_ms')::numeric), 2), 0)::double precision AS avg_elapsed_ms,
         COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (metadata->>'elapsed_ms')::numeric), 0)::double precision AS p50_elapsed_ms,
         COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (metadata->>'elapsed_ms')::numeric), 0)::double precision AS p95_elapsed_ms
       FROM analytics_events
       WHERE event_name = 'app_update_refresh_landed'
         AND created_at >= now() - (? * interval '1 hour')
         AND metadata->>'elapsed_ms' ~ '^[0-9]+(\\.[0-9]+)?$'`,
      boundedWindowHours
    ),
    many<UpdateRolloutHourlyRow>(
      `SELECT
         EXTRACT(HOUR FROM created_at)::int AS hour_utc,
         COUNT(*) FILTER (WHERE event_name = 'app_update_overlay_shown')::int AS shown,
         COUNT(*) FILTER (WHERE event_name = 'app_update_refresh_landed')::int AS landed
       FROM analytics_events
       WHERE event_name IN ('app_update_overlay_shown', 'app_update_refresh_landed')
         AND created_at >= now() - (? * interval '1 hour')
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour_utc ASC`,
      boundedWindowHours
    ),
  ]);

  const overviewRow = overview[0] ?? {
    shown_count: 0,
    landed_count: 0,
    shown_unique_cycles: 0,
    landed_unique_cycles: 0,
    landed_matched_cycles: 0,
  };
  const latencyRow = latency[0] ?? {
    samples: 0,
    avg_elapsed_ms: 0,
    p50_elapsed_ms: 0,
    p95_elapsed_ms: 0,
  };

  const landedPerShown = overviewRow.shown_count > 0
    ? Number((overviewRow.landed_count / overviewRow.shown_count).toFixed(4))
    : 0;
  const cycleMatchRate = overviewRow.shown_unique_cycles > 0
    ? Number((overviewRow.landed_matched_cycles / overviewRow.shown_unique_cycles).toFixed(4))
    : 0;

  return {
    windowHours: boundedWindowHours,
    generatedAt: new Date().toISOString(),
    events: {
      shown: overviewRow.shown_count,
      landed: overviewRow.landed_count,
      landedPerShown,
    },
    cycles: {
      shownUnique: overviewRow.shown_unique_cycles,
      landedUnique: overviewRow.landed_unique_cycles,
      matched: overviewRow.landed_matched_cycles,
      matchRate: cycleMatchRate,
    },
    latencyMs: {
      samples: latencyRow.samples,
      average: latencyRow.avg_elapsed_ms,
      p50: latencyRow.p50_elapsed_ms,
      p95: latencyRow.p95_elapsed_ms,
    },
    hourly,
  };
}
