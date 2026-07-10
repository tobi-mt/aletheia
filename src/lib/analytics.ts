import { headers } from "next/headers";
import { many, run } from "@/lib/db";
import { getNotificationHealthSnapshot, getVapidKeyPairStatus } from "@/lib/notifications";

const ALLOWED_EVENTS = new Set([
  "app_opened",
  "app_installed",
  "app_update_overlay_shown",
  "app_update_refresh_landed",
  "app_view_changed",
  "answer_feedback",
  "answer_followup_asked",
  "answer_saved_or_acted",
  "answer_abandoned_after_generation",
  "app_shared",
  "avatar_updated",
  "auth_signin_started",
  "auth_prompt_shown",
  "auth_prompt_dismissed",
  "auth_prompt_cta_clicked",
  "auth_failure",
  "auth_email_login_success",
  "auth_email_register_success",
  "auth_google_success",
  "auth_apple_success",
  "auth_logout",
  "bible_translation_changed",
  "chat_question_sent",
  "question_asked",
  "counsel_contact_added_local",
  "counsel_contact_created",
  "counsel_summary_created",
  "counsel_decision_shared",
  "counsel_decisions_bulk_shared",
  "challenge_circle_created",
  "challenge_circle_joined",
  "challenge_circle_nudged",
  "challenge_day_marked_complete",
  "decision_created_local",
  "decision_created",
  "decision_revisited",
  "decision_updated",
  "disclosure_section_toggled",
  "error_seen",
  "gratitude_entry_created",
  "gratitude_entry_deleted",
  "gratitude_postcard_shared",
  "gratitude_reflection_prompt_used",
  "account_delete_completed",
  "account_delete_requested",
  "data_export_requested",
  "issue_reported",
  "journal_entry_created_local",
  "journal_entry_created",
  "language_changed",
  "milestone_celebration_shown",
  "milestone_celebration_triggered",
  "notification_disabled",
  "notification_daily_checked",
  "notification_enabled",
  "notification_enable_failed",
  "notification_self_healed",
  "notification_self_heal_failed",
  "notification_clicked",
  "notification_timing_updated",
  "gate_hit_notifications",
  "onboarding_completed",
  "pwa_install_prompt_available",
  "read_aloud_started",
  "rule_created",
  "rule_created_local",
  "scripture_opened",
  "share_started",
  "theme_changed",
  "today_card_carried",
  "wisdom_mode_selected",
]);

type AnalyticsMetadata = Record<string, string | number | boolean | null>;

type NotificationHealthSummary = {
  enabledSubscriptions: number;
  dueNow: number;
  scanned: number;
  unauthorizedHits: number;
  hourUtc: number;
  generatedAt: string;
  cronSecretConfigured: boolean;
  cronHealthy: boolean;
  cronStatus: "missing_secret" | "stale" | "healthy";
  lastDailyCheckedAt: string | null;
  lastDailyCheckedMinutesAgo: number | null;
  vapidConfigured: boolean;
  vapidKeyPairValid: boolean;
  vapidSubjectConfigured: boolean;
  vapidPublicKeyConfigured: boolean;
  vapidReason: string;
  recommendedAction: "fix_vapid" | "check_cron" | "subscribe" | "resubscribe_or_send_test" | "none";
};

type AnalyticsPeriod = "daily" | "weekly" | "monthly" | "yearly";

type TimeSeriesRow = {
  bucket_start: string;
  bucket_label: string;
  events: number;
  unique_people: number;
  new_users: number;
};

type FeatureTrendRow = {
  bucket_start: string;
  bucket_label: string;
  feature: string;
  event_name: string;
  actions: number;
  unique_people: number;
};

type NotificationSyncFailureCauseRow = {
  cause: string;
  count: number;
  unique_people: number;
};

type NotificationSyncFailureTrendRow = {
  day: string;
  cause: string;
  count: number;
  total_count: number;
};

type CohortBreakdownRow = {
  cohort: string;
  signups: number;
  retained: number;
  retention_pct: number;
};

type AnalyticsDateRange = {
  startDate: string;
  endDate: string;
};

const AUTOMATION_USER_AGENT_PATTERN =
  "headlesschrome|lighthouse|bot|spider|crawler|curl|wget|python-requests|uptime|monitor|playwright|puppeteer|selenium";
const TEST_SOURCE_PATTERN = "test|qa|e2e|automation|playwright|cypress|loadtest|stress";

const TIME_SERIES_CONFIG: Record<AnalyticsPeriod, { unit: "day" | "week" | "month" | "year"; points: number }> = {
  daily: { unit: "day", points: 30 },
  weekly: { unit: "week", points: 12 },
  monthly: { unit: "month", points: 12 },
  yearly: { unit: "year", points: 5 },
};

const CORE_FEATURE_MAP = [
  { feature: "questions_asked", event_name: "question_asked" },
  { feature: "mode_switches", event_name: "wisdom_mode_selected" },
  { feature: "decisions_started", event_name: "decision_created" },
  { feature: "reflections_saved", event_name: "journal_entry_created" },
  { feature: "counsel_contacts", event_name: "counsel_contact_created" },
  { feature: "notifications_enabled", event_name: "notification_enabled" },
  { feature: "app_shares", event_name: "app_shared" },
] as const;

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

function hasRegexMatch(value: string | null | undefined, regex: RegExp) {
  return typeof value === "string" && regex.test(value);
}

function utcDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isValidDateString(value: string | undefined | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function normalizeAnalyticsDateRange(options: { startDate?: string; endDate?: string } = {}): AnalyticsDateRange {
  const today = utcDateString(new Date());
  const defaultStart = utcDateString(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  const candidateStart = isValidDateString(options.startDate) ? options.startDate : defaultStart;
  const candidateEnd = isValidDateString(options.endDate) ? options.endDate : today;

  return candidateStart <= candidateEnd
    ? { startDate: candidateStart, endDate: candidateEnd }
    : { startDate: candidateEnd, endDate: candidateStart };
}

function sqlDateLiteral(value: string) {
  return `'${value}'`;
}

function buildTimeSeriesBounds(unit: "day" | "week" | "month" | "year", range: AnalyticsDateRange) {
  return {
    start: `date_trunc('${unit}', ${sqlDateLiteral(range.startDate)}::date)`,
    end: `date_trunc('${unit}', ${sqlDateLiteral(range.endDate)}::date)`,
    step: `interval '1 ${unit}'`,
  };
}

function buildUsageTrendQuery(
  period: AnalyticsPeriod,
  range: AnalyticsDateRange,
  trafficFilter: string
) {
  const { unit } = TIME_SERIES_CONFIG[period];
  const { start, end, step } = buildTimeSeriesBounds(unit, range);

  return `
    WITH buckets AS (
      SELECT generate_series(${start}::date, ${end}::date, ${step}) AS bucket_start
    ),
    activity AS (
      SELECT date_trunc('${unit}', created_at) AS bucket_start,
             COUNT(*)::int AS events,
             COUNT(DISTINCT COALESCE(user_id, anon_id, session_id))::int AS unique_people
      FROM analytics_events
      WHERE created_at::date >= ${sqlDateLiteral(range.startDate)}::date
        AND created_at::date <= ${sqlDateLiteral(range.endDate)}::date
        AND ${trafficFilter}
      GROUP BY 1
    ),
    signups AS (
      SELECT date_trunc('${unit}', created_at) AS bucket_start,
             COUNT(*)::int AS new_users
      FROM users
      WHERE created_at::date >= ${sqlDateLiteral(range.startDate)}::date
        AND created_at::date <= ${sqlDateLiteral(range.endDate)}::date
      GROUP BY 1
    )
    SELECT buckets.bucket_start::date::text AS bucket_start,
           TO_CHAR(buckets.bucket_start, 'YYYY-MM-DD') AS bucket_label,
           COALESCE(activity.events, 0)::int AS events,
           COALESCE(activity.unique_people, 0)::int AS unique_people,
           COALESCE(signups.new_users, 0)::int AS new_users
    FROM buckets
    LEFT JOIN activity ON activity.bucket_start = buckets.bucket_start
    LEFT JOIN signups ON signups.bucket_start = buckets.bucket_start
    ORDER BY buckets.bucket_start ASC`;
}

function buildFeatureTrendQuery(
  period: AnalyticsPeriod,
  range: AnalyticsDateRange,
  trafficFilter: string
) {
  const { unit } = TIME_SERIES_CONFIG[period];
  const { start, end, step } = buildTimeSeriesBounds(unit, range);
  const featureValues = CORE_FEATURE_MAP.map(({ feature, event_name }) => `('${feature}', '${event_name}')`).join(",\n           ");

  return `
    WITH buckets AS (
      SELECT generate_series(${start}::date, ${end}::date, ${step}) AS bucket_start
    ),
    feature_map(feature, event_name) AS (
      VALUES
           ${featureValues}
    ),
    activity AS (
      SELECT date_trunc('${unit}', analytics_events.created_at) AS bucket_start,
             feature_map.feature AS feature,
             feature_map.event_name AS event_name,
             COUNT(*)::int AS actions,
             COUNT(DISTINCT COALESCE(analytics_events.user_id, analytics_events.anon_id, analytics_events.session_id))::int AS unique_people
      FROM analytics_events
      JOIN feature_map ON feature_map.event_name = analytics_events.event_name
      WHERE analytics_events.created_at::date >= ${sqlDateLiteral(range.startDate)}::date
        AND analytics_events.created_at::date <= ${sqlDateLiteral(range.endDate)}::date
        AND ${trafficFilter}
      GROUP BY 1, 2, 3
    )
    SELECT buckets.bucket_start::date::text AS bucket_start,
           TO_CHAR(buckets.bucket_start, 'YYYY-MM-DD') AS bucket_label,
           feature_map.feature,
           feature_map.event_name,
           COALESCE(activity.actions, 0)::int AS actions,
           COALESCE(activity.unique_people, 0)::int AS unique_people
    FROM buckets
    CROSS JOIN feature_map
    LEFT JOIN activity
      ON activity.bucket_start = buckets.bucket_start
     AND activity.feature = feature_map.feature
    ORDER BY buckets.bucket_start ASC, feature_map.feature ASC`;
}

export function deriveTrafficLabel(input: {
  source?: string | null;
  userAgent?: string | null;
  host?: string | null;
}) {
  const source = input.source ?? "";
  const userAgent = input.userAgent ?? "";
  const host = input.host ?? "";

  const isAutomation = hasRegexMatch(userAgent, new RegExp(AUTOMATION_USER_AGENT_PATTERN, "i"));
  const isTestSource = hasRegexMatch(source, new RegExp(TEST_SOURCE_PATTERN, "i"));
  const isProductionHost = /(^|\.)aletheia\.mirrortalkpodcast\.com(?::\d+)?$/i.test(host);

  return {
    source: isAutomation ? "automation" : isTestSource ? "test" : "human",
    environment: process.env.NODE_ENV === "production" && isProductionHost ? "production" : "test",
  } as const;
}

function trafficFilterWhere(includeAutomation: boolean, alias = "analytics_events") {
  if (includeAutomation) {
    return "TRUE";
  }

  return `
    COALESCE(${alias}.metadata->>'traffic_source', '') NOT IN ('automation', 'test')
    AND COALESCE(${alias}.metadata->>'traffic_environment', 'production') = 'production'
    AND COALESCE(${alias}.user_agent, '') !~* '${AUTOMATION_USER_AGENT_PATTERN}'
    AND COALESCE(${alias}.source, '') !~* '${TEST_SOURCE_PATTERN}'
  `;
}

export async function trackEvent(input: AnalyticsEventInput) {
  if (!ALLOWED_EVENTS.has(input.eventName)) {
    return;
  }

  try {
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
  } catch {
    // Analytics must never crash requests
  }
}

export async function trackServerEvent(input: Omit<AnalyticsEventInput, "userAgent">) {
  const headerStore = await headers();
  await trackEvent({
    ...input,
    userAgent: headerStore.get("user-agent"),
  });
}

export async function analyticsSummary(
  options: { includeAutomation?: boolean; startDate?: string; endDate?: string } = {}
) {
  const includeAutomation = options.includeAutomation ?? false;
  const dateRange = normalizeAnalyticsDateRange({ startDate: options.startDate, endDate: options.endDate });
  const startDateSql = sqlDateLiteral(dateRange.startDate);
  const endDateSql = sqlDateLiteral(dateRange.endDate);
  const selectedDateFilter = `created_at::date >= ${startDateSql}::date AND created_at::date <= ${endDateSql}::date`;
  const trafficFilter = trafficFilterWhere(includeAutomation, "analytics_events");
  const usageTrendPromises = (Object.keys(TIME_SERIES_CONFIG) as AnalyticsPeriod[]).map((period) =>
    many<TimeSeriesRow>(buildUsageTrendQuery(period, dateRange, trafficFilter))
  );
  const featureTrendPromises = (Object.keys(TIME_SERIES_CONFIG) as AnalyticsPeriod[]).map((period) =>
    many<FeatureTrendRow>(buildFeatureTrendQuery(period, dateRange, trafficFilter))
  );

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
    topicRows,
    emotionRows,
    feedbackByModeRows,
    journeyRateRows,
    languageRows,
    themeRows,
    frictionRows,
    notificationSelfHealRows,
    notificationSyncFailureCauseRows,
    notificationSyncFailureTrendRows,
    authPromptOverviewRows,
    authPromptReasonRows,
    authPromptCloseRows,
    authPromptDailyRows,
    retentionMonthlyRows,
    usageTrendRows,
    featureTrendRows,
    notificationHealthRows,
  ] = await Promise.all([
    many<{ metric: string; value: number }>(
      `SELECT 'registered_users' AS metric, COUNT(*)::int AS value FROM users
       UNION ALL
       SELECT 'active_sessions', COUNT(DISTINCT user_id)::int FROM sessions WHERE expires_at > now()
        UNION ALL
       SELECT 'new_users_30d', COUNT(*)::int FROM users WHERE created_at::date >= ${startDateSql}::date AND created_at::date <= ${endDateSql}::date
       UNION ALL
       SELECT 'anonymous_devices_30d', COUNT(DISTINCT anon_id)::int FROM analytics_events
          WHERE anon_id IS NOT NULL AND ${selectedDateFilter} AND ${trafficFilter}
       UNION ALL
       SELECT 'identified_active_users_30d', COUNT(DISTINCT user_id)::int FROM analytics_events
          WHERE user_id IS NOT NULL AND ${selectedDateFilter} AND ${trafficFilter}
       UNION ALL
               SELECT 'events_24h', COUNT(*)::int FROM analytics_events WHERE ${selectedDateFilter} AND ${trafficFilter}
       UNION ALL
               SELECT 'events_30d', COUNT(*)::int FROM analytics_events WHERE ${selectedDateFilter} AND ${trafficFilter}`
    ),
    many<{ event_name: string; count: number; unique_people: number }>(
      `SELECT event_name,
              COUNT(*)::int AS count,
              COUNT(DISTINCT COALESCE(user_id, anon_id))::int AS unique_people
       FROM analytics_events
       WHERE ${selectedDateFilter}
         AND ${trafficFilter}
       GROUP BY event_name
       ORDER BY count DESC`
    ),
    many<{ mode: string; count: number }>(
      `SELECT metadata->>'mode' AS mode, COUNT(*)::int AS count
       FROM analytics_events
       WHERE metadata->>'mode' IS NOT NULL
         AND ${selectedDateFilter}
         AND ${trafficFilter}
       GROUP BY metadata->>'mode'
       ORDER BY count DESC`
    ),
    many<{ day: string; signups: number; active_people: number; events: number }>(
      `WITH days AS (
         SELECT generate_series(${startDateSql}::date, ${endDateSql}::date, interval '1 day')::date AS day
       ),
       signup_counts AS (
         SELECT created_at::date AS day, COUNT(DISTINCT id)::int AS signups
         FROM users
         WHERE ${selectedDateFilter}
         GROUP BY created_at::date
       ),
       event_counts AS (
         SELECT created_at::date AS day,
                COUNT(DISTINCT COALESCE(user_id, anon_id))::int AS active_people,
                COUNT(*)::int AS events
         FROM analytics_events
         WHERE ${selectedDateFilter}
           AND ${trafficFilter}
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
         WHERE ${selectedDateFilter}
           AND ${trafficFilter}
       ),
       feature_map(feature, event_name) AS (
         VALUES
           ('questions_asked', 'question_asked'),
           ('mode_switches', 'wisdom_mode_selected'),
           ('decisions_started', 'decision_created'),
           ('decision_revisits', 'decision_revisited'),
           ('reflections_saved', 'journal_entry_created'),
           ('counsel_contacts', 'counsel_contact_created'),
           ('counsel_summaries', 'counsel_summary_created'),
           ('rules_created', 'rule_created'),
           ('notifications_enabled', 'notification_enabled'),
           ('read_aloud', 'read_aloud_started'),
           ('scripture_opened', 'scripture_opened'),
           ('today_card_carried', 'today_card_carried'),
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
         WHERE ${selectedDateFilter}
           AND ${trafficFilter}
       ),
       funnel(stage, event_name, stage_order) AS (
         VALUES
           ('opened_app', 'app_opened', 1),
           ('authenticated', 'auth_email_login_success', 2),
           ('authenticated', 'auth_email_register_success', 2),
           ('authenticated', 'auth_google_success', 2),
           ('completed_onboarding', 'onboarding_completed', 3),
           ('asked_question', 'question_asked', 4),
           ('saved_reflection', 'journal_entry_created', 5),
           ('started_decision', 'decision_created', 6),
           ('enabled_notifications', 'notification_enabled', 7),
           ('shared_or_invited', 'app_shared', 8)
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
         AND ${selectedDateFilter}
         AND ${trafficFilter}
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
         AND ${selectedDateFilter}
         AND ${trafficFilter}
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
         AND ${selectedDateFilter}
         AND ${trafficFilter}
       GROUP BY source
       ORDER BY count DESC`
    ),
    many<{ path: string; count: number; unique_people: number }>(
      `SELECT path,
              COUNT(*)::int AS count,
              COUNT(DISTINCT COALESCE(user_id, anon_id, session_id))::int AS unique_people
       FROM analytics_events
       WHERE path IS NOT NULL
         AND ${selectedDateFilter}
         AND ${trafficFilter}
       GROUP BY path
       ORDER BY count DESC
       LIMIT 15`
    ),
    many<{ hour_of_day_utc: number; events: number; unique_people: number }>(
      `SELECT EXTRACT(HOUR FROM created_at)::int AS hour_of_day_utc,
              COUNT(*)::int AS events,
              COUNT(DISTINCT COALESCE(user_id, anon_id, session_id))::int AS unique_people
       FROM analytics_events
       WHERE ${selectedDateFilter}
         AND ${trafficFilter}
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour_of_day_utc ASC`
    ),
    many<{ cohort_week: string; signups: number; retained_7d: number; retention_7d_pct: number }>(
      `WITH signup_cohorts AS (
         SELECT date_trunc('week', created_at)::date AS cohort_week,
                id AS user_id,
                created_at AS signup_at
         FROM users
         WHERE ${selectedDateFilter}
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
                    AND ${trafficFilter}
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
         AND ${selectedDateFilter}
         AND ${trafficFilter}
       GROUP BY metadata->>'method', metadata->>'flow', metadata->>'category', metadata->>'reason'
       ORDER BY count DESC, unique_people DESC, method ASC, flow ASC, category ASC, reason ASC`
    ),
    many<{ topic: string; count: number; unique_people: number; helpful_rate: number }>(
      `WITH questions AS (
         SELECT COALESCE(metadata->>'topic', 'unknown') AS topic,
                COALESCE(user_id, anon_id, session_id) AS person_id
       FROM analytics_events
       WHERE event_name IN ('question_asked', 'chat_question_sent')
           AND ${selectedDateFilter}
           AND ${trafficFilter}
       ),
       feedback AS (
         SELECT COALESCE(metadata->>'topic', 'unknown') AS topic,
                COUNT(*) FILTER (WHERE metadata->>'value' IN ('helpful', 'mildly_helpful'))::int AS positive,
                COUNT(*)::int AS total
        FROM analytics_events
        WHERE event_name = 'answer_feedback'
           AND ${selectedDateFilter}
           AND ${trafficFilter}
         GROUP BY COALESCE(metadata->>'topic', 'unknown')
       )
       SELECT questions.topic,
              COUNT(*)::int AS count,
              COUNT(DISTINCT questions.person_id)::int AS unique_people,
              COALESCE(ROUND((100.0 * feedback.positive / NULLIF(feedback.total, 0))::numeric, 1), 0)::double precision AS helpful_rate
       FROM questions
       LEFT JOIN feedback ON feedback.topic = questions.topic
       GROUP BY questions.topic, feedback.positive, feedback.total
       ORDER BY count DESC`
    ),
    many<{ emotional_tone: string; count: number; decision_like_count: number }>(
      `SELECT COALESCE(metadata->>'emotional_tone', 'unknown') AS emotional_tone,
              COUNT(*)::int AS count,
              COUNT(*) FILTER (WHERE metadata->>'decision_like' = 'true')::int AS decision_like_count
       FROM analytics_events
       WHERE event_name IN ('question_asked', 'chat_question_sent')
         AND ${selectedDateFilter}
         AND ${trafficFilter}
       GROUP BY COALESCE(metadata->>'emotional_tone', 'unknown')
       ORDER BY count DESC`
    ),
    many<{ mode: string; value: string; count: number }>(
      `SELECT COALESCE(metadata->>'mode', 'unknown') AS mode,
              COALESCE(metadata->>'value', 'unknown') AS value,
              COUNT(*)::int AS count
       FROM analytics_events
       WHERE event_name = 'answer_feedback'
         AND ${selectedDateFilter}
         AND ${trafficFilter}
       GROUP BY COALESCE(metadata->>'mode', 'unknown'), COALESCE(metadata->>'value', 'unknown')
       ORDER BY mode ASC, count DESC`
    ),
    many<{ metric: string; numerator: number; denominator: number; rate: number }>(
      `WITH people AS (
         SELECT COALESCE(user_id, anon_id, session_id) AS person_id,
                BOOL_OR(event_name = 'app_opened') AS opened,
                BOOL_OR(event_name = 'onboarding_completed') AS onboarded,
                BOOL_OR(event_name IN ('question_asked', 'chat_question_sent')) AS asked,
                BOOL_OR(event_name IN ('journal_entry_created', 'journal_entry_created_local')) AS reflected,
                BOOL_OR(event_name IN ('decision_created', 'decision_created_local')) AS decided,
                BOOL_OR(event_name = 'notification_enabled') AS notified,
                BOOL_OR(event_name IN ('app_shared', 'share_started')) AS shared
         FROM analytics_events
         WHERE ${selectedDateFilter}
           AND ${trafficFilter}
           AND COALESCE(user_id, anon_id, session_id) IS NOT NULL
         GROUP BY COALESCE(user_id, anon_id, session_id)
       ),
       metrics(metric, numerator, denominator) AS (
         VALUES
           ('onboarding_completion', (SELECT COUNT(*)::int FROM people WHERE onboarded), (SELECT COUNT(*)::int FROM people WHERE opened)),
           ('first_question_conversion', (SELECT COUNT(*)::int FROM people WHERE asked), (SELECT COUNT(*)::int FROM people WHERE opened)),
           ('reflection_save_rate', (SELECT COUNT(*)::int FROM people WHERE reflected), (SELECT COUNT(*)::int FROM people WHERE opened)),
           ('decision_start_rate', (SELECT COUNT(*)::int FROM people WHERE decided), (SELECT COUNT(*)::int FROM people WHERE opened)),
           ('notification_opt_in_rate', (SELECT COUNT(*)::int FROM people WHERE notified), (SELECT COUNT(*)::int FROM people WHERE opened)),
           ('share_invite_rate', (SELECT COUNT(*)::int FROM people WHERE shared), (SELECT COUNT(*)::int FROM people WHERE opened))
       )
       SELECT metric,
              numerator,
              denominator,
              COALESCE(ROUND((100.0 * numerator / NULLIF(denominator, 0))::numeric, 1), 0)::double precision AS rate
       FROM metrics`
    ),
    many<{ language: string; count: number; unique_people: number }>(
      `SELECT COALESCE(metadata->>'language', 'unknown') AS language,
              COUNT(*)::int AS count,
              COUNT(DISTINCT COALESCE(user_id, anon_id, session_id))::int AS unique_people
       FROM analytics_events
       WHERE event_name IN ('language_changed', 'question_asked', 'chat_question_sent')
         AND ${selectedDateFilter}
         AND ${trafficFilter}
       GROUP BY COALESCE(metadata->>'language', 'unknown')
       ORDER BY unique_people DESC, count DESC`
    ),
    many<{ theme: string; count: number; unique_people: number }>(
      `SELECT COALESCE(metadata->>'theme', 'unknown') AS theme,
              COUNT(*)::int AS count,
              COUNT(DISTINCT COALESCE(user_id, anon_id, session_id))::int AS unique_people
       FROM analytics_events
       WHERE event_name = 'theme_changed'
         AND ${selectedDateFilter}
         AND ${trafficFilter}
       GROUP BY COALESCE(metadata->>'theme', 'unknown')
       ORDER BY unique_people DESC, count DESC`
    ),
    many<{ area: string; count: number; unique_people: number }>(
      `SELECT CASE
                WHEN event_name IN ('auth_failure', 'notification_enable_failed', 'notification_self_heal_failed', 'error_seen') THEN 'failures'
                WHEN event_name = 'notification_daily_checked' AND metadata->>'failed' <> '0' THEN 'notification_delivery_failed'
                WHEN event_name = 'disclosure_section_toggled' THEN 'section_expansion'
                WHEN event_name = 'app_view_changed' AND metadata->>'to_view' = 'account' THEN 'account_reopens'
                WHEN event_name = 'pwa_install_prompt_available' THEN 'install_prompt_seen'
                WHEN event_name = 'app_update_refresh_landed' THEN 'pwa_update_applied'
                ELSE event_name
              END AS area,
              COUNT(*)::int AS count,
              COUNT(DISTINCT COALESCE(user_id, anon_id, session_id))::int AS unique_people
       FROM analytics_events
       WHERE ${selectedDateFilter}
         AND ${trafficFilter}
         AND event_name IN ('auth_failure', 'notification_enable_failed', 'notification_self_heal_failed', 'error_seen', 'notification_daily_checked', 'disclosure_section_toggled', 'app_view_changed', 'pwa_install_prompt_available', 'app_update_refresh_landed')
       GROUP BY area
       ORDER BY count DESC`
    ),
    many<{ day: string; healed: number; failed: number; attempts: number; success_rate: number }>(
      `WITH days AS (
         SELECT generate_series(${startDateSql}::date, ${endDateSql}::date, interval '1 day')::date AS day
       ),
       grouped AS (
         SELECT
           created_at::date AS day,
           COUNT(*) FILTER (WHERE event_name = 'notification_self_healed')::int AS healed,
           COUNT(*) FILTER (WHERE event_name = 'notification_self_heal_failed')::int AS failed
         FROM analytics_events
         WHERE ${selectedDateFilter}
           AND ${trafficFilter}
           AND event_name IN ('notification_self_healed', 'notification_self_heal_failed')
         GROUP BY created_at::date
       )
       SELECT
         days.day::text AS day,
         COALESCE(grouped.healed, 0)::int AS healed,
         COALESCE(grouped.failed, 0)::int AS failed,
         (COALESCE(grouped.healed, 0) + COALESCE(grouped.failed, 0))::int AS attempts,
         COALESCE(
           ROUND(
             (100.0 * COALESCE(grouped.healed, 0) / NULLIF((COALESCE(grouped.healed, 0) + COALESCE(grouped.failed, 0)), 0))::numeric,
             1
           ),
           0
         )::double precision AS success_rate
       FROM days
       LEFT JOIN grouped ON grouped.day = days.day
       ORDER BY days.day ASC`
    ),
    many<NotificationSyncFailureCauseRow>(
      `SELECT COALESCE(NULLIF(metadata->>'server_error_code', ''), 'unknown') AS cause,
              COUNT(*)::int AS count,
              COUNT(DISTINCT COALESCE(user_id, anon_id, session_id))::int AS unique_people
       FROM analytics_events
       WHERE event_name IN ('notification_enable_failed', 'notification_self_heal_failed')
         AND ${selectedDateFilter}
         AND ${trafficFilter}
       GROUP BY COALESCE(NULLIF(metadata->>'server_error_code', ''), 'unknown')
       ORDER BY count DESC, unique_people DESC, cause ASC`
    ),
    many<NotificationSyncFailureTrendRow>(
      `WITH days AS (
         SELECT generate_series(${startDateSql}::date, ${endDateSql}::date, interval '1 day')::date AS day
       ),
       cause_counts AS (
         SELECT created_at::date AS day,
                COALESCE(NULLIF(metadata->>'server_error_code', ''), 'unknown') AS cause,
                COUNT(*)::int AS count
         FROM analytics_events
         WHERE event_name IN ('notification_enable_failed', 'notification_self_heal_failed')
           AND ${selectedDateFilter}
           AND ${trafficFilter}
         GROUP BY created_at::date, COALESCE(NULLIF(metadata->>'server_error_code', ''), 'unknown')
       ),
       cause_totals AS (
         SELECT cause,
                SUM(count)::int AS total_count
         FROM cause_counts
         GROUP BY cause
       ),
       day_totals AS (
         SELECT day,
                SUM(count)::int AS total_count
         FROM cause_counts
         GROUP BY day
       )
       SELECT days.day::text AS day,
              cause_totals.cause AS cause,
              COALESCE(cause_counts.count, 0)::int AS count,
              COALESCE(day_totals.total_count, 0)::int AS total_count
       FROM days
       CROSS JOIN cause_totals
       LEFT JOIN cause_counts ON cause_counts.day = days.day AND cause_counts.cause = cause_totals.cause
       LEFT JOIN day_totals ON day_totals.day = days.day
       ORDER BY days.day ASC, cause_totals.total_count DESC, cause_totals.cause ASC`
    ),
    many<{
      shown_count: number;
      dismissed_count: number;
      cta_count: number;
      gate_hits: number;
      unique_shown_people: number;
      unique_cta_people: number;
      dismiss_rate_pct: number;
      cta_rate_pct: number;
      cta_per_shown_person_pct: number;
    }>(
        `WITH events AS (
          SELECT event_name,
            COALESCE(user_id, anon_id, session_id) AS person_id
          FROM analytics_events
          WHERE ${selectedDateFilter}
            AND ${trafficFilter}
            AND event_name IN ('auth_prompt_shown', 'auth_prompt_dismissed', 'auth_prompt_cta_clicked', 'gate_hit_notifications')
        ),
        people AS (
         SELECT COALESCE(user_id, anon_id, session_id) AS person_id,
                BOOL_OR(event_name = 'auth_prompt_shown') AS shown,
                BOOL_OR(event_name = 'auth_prompt_dismissed') AS dismissed,
                BOOL_OR(event_name = 'auth_prompt_cta_clicked') AS clicked
         FROM analytics_events
         WHERE ${selectedDateFilter}
           AND ${trafficFilter}
           AND event_name IN ('auth_prompt_shown', 'auth_prompt_dismissed', 'auth_prompt_cta_clicked')
           AND COALESCE(user_id, anon_id, session_id) IS NOT NULL
         GROUP BY COALESCE(user_id, anon_id, session_id)
       )
       SELECT
         (SELECT COUNT(*)::int FROM events WHERE event_name = 'auth_prompt_shown') AS shown_count,
         (SELECT COUNT(*)::int FROM events WHERE event_name = 'auth_prompt_dismissed') AS dismissed_count,
         (SELECT COUNT(*)::int FROM events WHERE event_name = 'auth_prompt_cta_clicked') AS cta_count,
         (SELECT COUNT(*)::int FROM events WHERE event_name = 'gate_hit_notifications') AS gate_hits,
         (SELECT COUNT(*)::int FROM people WHERE shown) AS unique_shown_people,
         (SELECT COUNT(*)::int FROM people WHERE clicked) AS unique_cta_people,
         COALESCE(ROUND((100.0 * (SELECT COUNT(*) FROM events WHERE event_name = 'auth_prompt_dismissed') / NULLIF((SELECT COUNT(*) FROM events WHERE event_name = 'auth_prompt_shown'), 0))::numeric, 1), 0)::double precision AS dismiss_rate_pct,
         COALESCE(ROUND((100.0 * (SELECT COUNT(*) FROM events WHERE event_name = 'auth_prompt_cta_clicked') / NULLIF((SELECT COUNT(*) FROM events WHERE event_name = 'auth_prompt_shown'), 0))::numeric, 1), 0)::double precision AS cta_rate_pct,
         COALESCE(ROUND((100.0 * (SELECT COUNT(*) FROM people WHERE clicked) / NULLIF((SELECT COUNT(*) FROM people WHERE shown), 0))::numeric, 1), 0)::double precision AS cta_per_shown_person_pct`
    ),
    many<{ prompt_reason: string; shown_count: number; unique_people: number }>(
      `SELECT COALESCE(metadata->>'prompt_reason', 'unknown') AS prompt_reason,
              COUNT(*)::int AS shown_count,
              COUNT(DISTINCT COALESCE(user_id, anon_id, session_id))::int AS unique_people
       FROM analytics_events
       WHERE event_name = 'auth_prompt_shown'
         AND ${selectedDateFilter}
         AND ${trafficFilter}
       GROUP BY COALESCE(metadata->>'prompt_reason', 'unknown')
       ORDER BY shown_count DESC, unique_people DESC, prompt_reason ASC`
    ),
    many<{ close_reason: string; dismissed_count: number; unique_people: number }>(
      `SELECT COALESCE(metadata->>'close_reason', 'unknown') AS close_reason,
              COUNT(*)::int AS dismissed_count,
              COUNT(DISTINCT COALESCE(user_id, anon_id, session_id))::int AS unique_people
       FROM analytics_events
       WHERE event_name = 'auth_prompt_dismissed'
         AND ${selectedDateFilter}
         AND ${trafficFilter}
       GROUP BY COALESCE(metadata->>'close_reason', 'unknown')
       ORDER BY dismissed_count DESC, unique_people DESC, close_reason ASC`
    ),
    many<{ day: string; shown_count: number; cta_count: number; cta_rate_pct: number }>(
      `WITH days AS (
         SELECT generate_series(${startDateSql}::date, ${endDateSql}::date, interval '1 day')::date AS day
       ),
       grouped AS (
         SELECT
           created_at::date AS day,
           COUNT(*) FILTER (WHERE event_name = 'auth_prompt_shown')::int AS shown_count,
           COUNT(*) FILTER (WHERE event_name = 'auth_prompt_cta_clicked')::int AS cta_count
         FROM analytics_events
         WHERE ${selectedDateFilter}
           AND ${trafficFilter}
           AND event_name IN ('auth_prompt_shown', 'auth_prompt_cta_clicked')
         GROUP BY created_at::date
       )
       SELECT
         days.day::text AS day,
         COALESCE(grouped.shown_count, 0)::int AS shown_count,
         COALESCE(grouped.cta_count, 0)::int AS cta_count,
         COALESCE(
           ROUND(
             (100.0 * COALESCE(grouped.cta_count, 0) / NULLIF(COALESCE(grouped.shown_count, 0), 0))::numeric,
             1
           ),
           0
         )::double precision AS cta_rate_pct
       FROM days
       LEFT JOIN grouped ON grouped.day = days.day
       ORDER BY days.day ASC`
    ),
    many<CohortBreakdownRow>(
      `WITH signup_cohorts AS (
         SELECT date_trunc('month', created_at)::date AS cohort,
                id AS user_id,
                created_at AS signup_at
         FROM users
         WHERE ${selectedDateFilter}
       ),
       retention AS (
         SELECT signup_cohorts.cohort,
                signup_cohorts.user_id,
                EXISTS (
                  SELECT 1
                  FROM analytics_events
                  WHERE analytics_events.user_id = signup_cohorts.user_id
                    AND analytics_events.created_at > signup_cohorts.signup_at
                    AND analytics_events.created_at <= signup_cohorts.signup_at + interval '30 days'
                    AND ${trafficFilter}
                ) AS retained
         FROM signup_cohorts
       )
       SELECT retention.cohort::text AS cohort,
              COUNT(*)::int AS signups,
              COUNT(*) FILTER (WHERE retention.retained)::int AS retained,
              COALESCE(ROUND((100.0 * COUNT(*) FILTER (WHERE retention.retained) / NULLIF(COUNT(*), 0))::numeric, 1), 0)::double precision AS retention_pct
       FROM retention
       GROUP BY retention.cohort
       ORDER BY retention.cohort ASC`
    ),
    Promise.all(usageTrendPromises),
    Promise.all(featureTrendPromises),
    (async () => {
      const [snapshot, vapidStatus, lastDailyCheckedRows] = await Promise.all([
        getNotificationHealthSnapshot(),
        Promise.resolve(getVapidKeyPairStatus()),
        many<{ created_at: string }>(
          `SELECT created_at
           FROM analytics_events
           WHERE event_name = 'notification_daily_checked'
             AND source = 'cron'
           ORDER BY created_at DESC
           LIMIT 1`
        ),
      ]);

      const lastDailyCheckedAt = lastDailyCheckedRows[0]?.created_at ?? null;
      const lastDailyCheckedMinutesAgo = lastDailyCheckedAt
        ? Math.floor((Date.now() - Date.parse(lastDailyCheckedAt)) / 60000)
        : null;
      const cronSecretConfigured = Boolean(process.env.NOTIFICATION_CRON_SECRET?.trim());
      const cronHealthy =
        cronSecretConfigured &&
        lastDailyCheckedMinutesAgo !== null &&
        lastDailyCheckedMinutesAgo <= 36 * 60;
      const cronStatus: "missing_secret" | "stale" | "healthy" = !cronSecretConfigured
        ? "missing_secret"
        : cronHealthy
          ? "healthy"
          : "stale";
      const recommendedAction =
        !vapidStatus.configured || !vapidStatus.keyPairValid
          ? "fix_vapid"
          : cronStatus !== "healthy"
            ? "check_cron"
            : snapshot.enabledSubscriptions === 0
              ? "subscribe"
              : snapshot.dueNow === 0
                ? "resubscribe_or_send_test"
                : "none";

      return {
        ...snapshot,
        cronSecretConfigured,
        cronHealthy,
        cronStatus,
        lastDailyCheckedAt,
        lastDailyCheckedMinutesAgo,
        vapidConfigured: vapidStatus.configured,
        vapidKeyPairValid: vapidStatus.keyPairValid,
        vapidSubjectConfigured: Boolean((process.env.VAPID_SUBJECT || process.env.VAPID_CLAIM_EMAIL || "").trim()),
        vapidPublicKeyConfigured: Boolean((process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "").trim()),
        vapidReason: vapidStatus.reason,
        recommendedAction,
      } satisfies NotificationHealthSummary;
    })(),
  ]);

  const [usageDailyRows, usageWeeklyRows, usageMonthlyRows, usageYearlyRows] = usageTrendRows;
  const [featureDailyRows, featureWeeklyRows, featureMonthlyRows, featureYearlyRows] = featureTrendRows;

  const funnelSorted = [...funnelRows].sort((a, b) => a.stage_order - b.stage_order);
  const firstStage = funnelSorted[0]?.unique_people ?? 0;

  return {
    overview: Object.fromEntries(overviewRows.map((row) => [row.metric, row.value])),
    events30d: eventRows,
    modes30d: modeRows.filter((row) => row.mode),
    daily14d: dailyRows,
    features30d: featureRows,
    featureUsageTrends: {
      daily: featureDailyRows,
      weekly: featureWeeklyRows,
      monthly: featureMonthlyRows,
      yearly: featureYearlyRows,
    },
    usageTrends: {
      daily: usageDailyRows,
      weekly: usageWeeklyRows,
      monthly: usageMonthlyRows,
      yearly: usageYearlyRows,
    },
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
    topScreens30d: viewRows,
    acquisitionSources30d: sourceRows,
    paths30d: pathRows,
    hourlyUsage30d: hourlyRows,
    retentionWeekly: retentionRows,
    retentionMonthly: retentionMonthlyRows,
    cohortBreakdowns: {
      weekly: retentionRows.map((row) => ({
        cohort: row.cohort_week,
        signups: row.signups,
        retained: row.retained_7d,
        retention_pct: row.retention_7d_pct,
      })),
      monthly: retentionMonthlyRows,
    },
    selectedRange: dateRange,
    authFailures30d: authFailureRows,
    topics30d: topicRows,
    emotionalTones30d: emotionRows,
    feedbackByMode30d: feedbackByModeRows,
    journeyRates30d: journeyRateRows,
    languageDistribution30d: languageRows,
    themeDistribution30d: themeRows,
    frictionSignals30d: frictionRows,
    notificationSelfHeal14d: notificationSelfHealRows,
    notificationSyncFailuresByCause: notificationSyncFailureCauseRows,
    notificationSyncFailureTrend: notificationSyncFailureTrendRows,
    notificationHealth: notificationHealthRows,
    authPrompts30d: {
      overview: authPromptOverviewRows[0] ?? {
        shown_count: 0,
        dismissed_count: 0,
        cta_count: 0,
        gate_hits: 0,
        unique_shown_people: 0,
        unique_cta_people: 0,
        dismiss_rate_pct: 0,
        cta_rate_pct: 0,
        cta_per_shown_person_pct: 0,
      },
      reasons: authPromptReasonRows,
      closes: authPromptCloseRows,
      daily14d: authPromptDailyRows,
    },
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
