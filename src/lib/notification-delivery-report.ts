import { many } from "@/lib/db";
import { getVapidKeyPairStatus } from "@/lib/notifications";

type ReportRow = {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  active_subscription_count: string | number;
  latest_subscription_id: string | null;
  preferred_local_hour: number | null;
  preferred_timezone: string | null;
  timezone_mode: string | null;
  delivery_strategy: string | null;
  last_sent_at: string | null;
  last_gratitude_sent_at: string | null;
  last_challenge_notified_at: string | null;
  updated_at: string | null;
  failure_count: string | number;
  comment_no_recipient_row_count: string | number;
  nudge_no_recipient_row_count: string | number;
  endpoint_rejected_count: string | number;
  vapid_failure_count: string | number;
  latest_failure_kind: string | null;
  latest_failure_reason: string | null;
  latest_failure_at: string | null;
};

export type NotificationDeliveryReason =
  | "before window"
  | "already sent today"
  | "no active subscription"
  | "VAPID failure"
  | "no recipient row"
  | "push endpoint rejected"
  | null;

export type NotificationDeliveryReportRow = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  activeSubscriptionCount: number;
  latestSubscriptionId: string | null;
  preferredLocalHour: number | null;
  preferredTimezone: string | null;
  timezoneMode: string | null;
  deliveryStrategy: string | null;
  lastSentAt: string | null;
  lastGratitudeSentAt: string | null;
  lastChallengeNotifiedAt: string | null;
  lastRefreshedAt: string | null;
  refreshDueAt: string | null;
  refreshDue: boolean;
  dailyWisdomReason: NotificationDeliveryReason;
  gratitudeReason: NotificationDeliveryReason;
  challengeReminderReason: NotificationDeliveryReason;
  commentReason: NotificationDeliveryReason;
  nudgeReason: NotificationDeliveryReason;
  recentPushFailureReason: string | null;
  recentPushFailureAt: string | null;
  recentPushFailureCount: number;
  recentEndpointRejectedCount: number;
  recentVapidFailureCount: number;
  recentNoRecipientRowCount: number;
  issueCount: number;
};

export type NotificationDeliveryReport = {
  generatedAt: string;
  lookbackDays: number;
  vapid: {
    configured: boolean;
    keyPairValid: boolean;
    reason: string;
  };
  summary: {
    totalUsers: number;
    usersWithActiveSubscriptions: number;
    usersWithoutActiveSubscriptions: number;
    usersBeforeWindow: number;
    usersAlreadySentToday: number;
    usersWithNoRecipientRow: number;
    usersWithPushEndpointRejected: number;
    usersWithVapidFailure: number;
    usersWithRefreshDue: number;
    usersWithIssues: number;
  };
  rows: NotificationDeliveryReportRow[];
};

function localHourForTimezone(date: Date, timezone: string | null | undefined) {
  const safeTimezone = timezone || "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTimezone,
      hour: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? date.getUTCHours());
    return hour === 24 ? 0 : hour;
  } catch {
    return date.getUTCHours();
  }
}

function localDateForTimezone(date: Date, timezone: string | null | undefined) {
  const safeTimezone = timezone || "UTC";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: safeTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function latestReasonFromFailure(row: ReportRow) {
  if (!row.latest_failure_reason) {
    return null;
  }

  const normalized = row.latest_failure_reason.toLowerCase();
  if (row.latest_failure_kind === "endpoint_rejected" || normalized.includes("404") || normalized.includes("410")) {
    return "push endpoint rejected";
  }
  if (row.latest_failure_kind === "vapid_failure" || normalized.includes("vapid")) {
    return "VAPID failure";
  }
  return row.latest_failure_reason;
}

function countIf(value: boolean) {
  return value ? 1 : 0;
}

function addHours(value: string | null, hours: number) {
  if (!value) {
    return null;
  }

  const ts = Date.parse(value);
  if (Number.isNaN(ts)) {
    return null;
  }

  return new Date(ts + hours * 60 * 60 * 1000).toISOString();
}

function classifyCurrentReason(params: {
  hasActiveSubscription: boolean;
  vapidConfigured: boolean;
  vapidKeyPairValid: boolean;
  preferredLocalHour: number | null;
  timezone: string | null | undefined;
  lastSentAt: string | null;
  currentDate: Date;
}) {
  const { hasActiveSubscription, vapidConfigured, vapidKeyPairValid, preferredLocalHour, timezone, lastSentAt, currentDate } = params;
  if (!hasActiveSubscription) {
    return "no active subscription" as const;
  }
  if (!vapidConfigured || !vapidKeyPairValid) {
    return "VAPID failure" as const;
  }

  const localHour = localHourForTimezone(currentDate, timezone);
  const effectiveHour = Number.isInteger(preferredLocalHour) ? Math.min(23, Math.max(0, Number(preferredLocalHour))) : 8;
  if (localHour < effectiveHour) {
    return "before window" as const;
  }

  if (lastSentAt) {
    const sentDate = localDateForTimezone(new Date(lastSentAt), timezone);
    const currentDateLabel = localDateForTimezone(currentDate, timezone);
    if (sentDate === currentDateLabel) {
      return "already sent today" as const;
    }
  }

  return null;
}

export async function getNotificationDeliveryReport(lookbackDays = 30): Promise<NotificationDeliveryReport> {
  const vapidStatus = getVapidKeyPairStatus();
  const days = Number.isFinite(lookbackDays) && lookbackDays > 0 ? Math.min(90, Math.floor(lookbackDays)) : 30;
  const windowSql = `${days} days`;

  const rows = await many<ReportRow>(
    `WITH latest_subscription AS (
      SELECT DISTINCT ON (user_id)
              id AS latest_subscription_id,
              user_id,
              preferred_local_hour,
              preferred_timezone,
              timezone_mode,
              delivery_strategy,
              last_sent_at,
              last_gratitude_sent_at,
              last_challenge_notified_at,
              updated_at
       FROM push_subscriptions
       WHERE enabled = TRUE
       ORDER BY user_id, updated_at DESC, created_at DESC
     ),
     subscription_counts AS (
       SELECT user_id, COUNT(*)::int AS active_subscription_count
       FROM push_subscriptions
       WHERE enabled = TRUE
       GROUP BY user_id
     ),
     comment_blockers AS (
       SELECT sender_user_id AS user_id,
              COUNT(*) FILTER (WHERE COALESCE(accepted_recipient_count, 0) = 0)::int AS comment_no_recipient_row_count
       FROM counsel_comment_deliveries
       WHERE created_at >= NOW() - INTERVAL '${windowSql}'
       GROUP BY sender_user_id
     ),
     nudge_blockers AS (
       SELECT sender_user_id AS user_id,
              COUNT(*) FILTER (WHERE COALESCE(accepted_recipient_count, 0) = 0)::int AS nudge_no_recipient_row_count
       FROM challenge_circle_nudge_deliveries
       WHERE created_at >= NOW() - INTERVAL '${windowSql}'
       GROUP BY sender_user_id
     ),
     failure_rows AS (
       SELECT user_id,
              COUNT(*)::int AS failure_count,
              COUNT(*) FILTER (WHERE failure_kind = 'endpoint_rejected')::int AS endpoint_rejected_count,
              COUNT(*) FILTER (WHERE failure_kind = 'vapid_failure')::int AS vapid_failure_count,
              MAX(created_at) AS latest_failure_at,
              (ARRAY_AGG(failure_kind ORDER BY created_at DESC))[1] AS latest_failure_kind,
              (ARRAY_AGG(reason ORDER BY created_at DESC))[1] AS latest_failure_reason
       FROM push_delivery_failures
       WHERE created_at >= NOW() - INTERVAL '${windowSql}'
       GROUP BY user_id
     )
     SELECT u.id AS user_id,
            u.name,
            u.avatar_url,
            COALESCE(subscription_counts.active_subscription_count, 0) AS active_subscription_count,
            latest_subscription.latest_subscription_id,
            latest_subscription.preferred_local_hour,
            latest_subscription.preferred_timezone,
            latest_subscription.timezone_mode,
            latest_subscription.delivery_strategy,
            latest_subscription.last_sent_at,
            latest_subscription.last_gratitude_sent_at,
            latest_subscription.last_challenge_notified_at,
            COALESCE(comment_blockers.comment_no_recipient_row_count, 0) AS comment_no_recipient_row_count,
            COALESCE(nudge_blockers.nudge_no_recipient_row_count, 0) AS nudge_no_recipient_row_count,
            COALESCE(failure_rows.failure_count, 0) AS failure_count,
            COALESCE(failure_rows.endpoint_rejected_count, 0) AS endpoint_rejected_count,
            COALESCE(failure_rows.vapid_failure_count, 0) AS vapid_failure_count,
            failure_rows.latest_failure_kind,
            failure_rows.latest_failure_reason,
            failure_rows.latest_failure_at
      FROM users u
      LEFT JOIN subscription_counts ON subscription_counts.user_id = u.id
      LEFT JOIN latest_subscription ON latest_subscription.user_id = u.id
      LEFT JOIN comment_blockers ON comment_blockers.user_id = u.id
      LEFT JOIN nudge_blockers ON nudge_blockers.user_id = u.id
      LEFT JOIN failure_rows ON failure_rows.user_id = u.id
      ORDER BY
        (COALESCE(subscription_counts.active_subscription_count, 0) = 0) DESC,
        (COALESCE(comment_blockers.comment_no_recipient_row_count, 0)
         + COALESCE(nudge_blockers.nudge_no_recipient_row_count, 0)
         + COALESCE(failure_rows.endpoint_rejected_count, 0)
         + COALESCE(failure_rows.vapid_failure_count, 0)) DESC,
        u.name ASC NULLS LAST,
        u.created_at DESC`
  );

  const currentDate = new Date();
  const mappedRows = rows.map((row) => {
    const activeSubscriptionCount = Number(row.active_subscription_count ?? 0);
    const hasActiveSubscription = activeSubscriptionCount > 0;
    const currentVapidFailure = !vapidStatus.configured || !vapidStatus.keyPairValid;

    const dailyWisdomReason = classifyCurrentReason({
      hasActiveSubscription,
      vapidConfigured: vapidStatus.configured,
      vapidKeyPairValid: vapidStatus.keyPairValid,
      preferredLocalHour: row.preferred_local_hour,
      timezone: row.preferred_timezone,
      lastSentAt: row.last_sent_at,
      currentDate,
    });
    const gratitudeReason = classifyCurrentReason({
      hasActiveSubscription,
      vapidConfigured: vapidStatus.configured,
      vapidKeyPairValid: vapidStatus.keyPairValid,
      preferredLocalHour: row.preferred_local_hour,
      timezone: row.preferred_timezone,
      lastSentAt: row.last_gratitude_sent_at,
      currentDate,
    });
    const challengeReminderReason = classifyCurrentReason({
      hasActiveSubscription,
      vapidConfigured: vapidStatus.configured,
      vapidKeyPairValid: vapidStatus.keyPairValid,
      preferredLocalHour: row.preferred_local_hour,
      timezone: row.preferred_timezone,
      lastSentAt: row.last_challenge_notified_at,
      currentDate,
    });
    const lastRefreshedAt = row.updated_at ?? null;
    const refreshDueAt = lastRefreshedAt ? addHours(lastRefreshedAt, 24) : null;
    const refreshDue = hasActiveSubscription && (!lastRefreshedAt || (refreshDueAt ? currentDate.getTime() >= Date.parse(refreshDueAt) : true));

    const noRecipientRow = Number(row.comment_no_recipient_row_count ?? 0) > 0 || Number(row.nudge_no_recipient_row_count ?? 0) > 0;
    const pushEndpointRejected = Number(row.endpoint_rejected_count ?? 0) > 0;
    const recentPushFailureReason = latestReasonFromFailure(row);

    const commentReason = !hasActiveSubscription
      ? ("no active subscription" as const)
      : currentVapidFailure
        ? ("VAPID failure" as const)
        : noRecipientRow
          ? ("no recipient row" as const)
          : pushEndpointRejected
            ? ("push endpoint rejected" as const)
            : null;

    const nudgeReason = !hasActiveSubscription
      ? ("no active subscription" as const)
      : currentVapidFailure
        ? ("VAPID failure" as const)
        : noRecipientRow
          ? ("no recipient row" as const)
          : pushEndpointRejected
            ? ("push endpoint rejected" as const)
            : null;

    const issueSet = new Set<string>();
    for (const reason of [dailyWisdomReason, gratitudeReason, challengeReminderReason, commentReason, nudgeReason]) {
      if (reason) {
        issueSet.add(reason);
      }
    }
    if (recentPushFailureReason) {
      issueSet.add(recentPushFailureReason);
    }

    return {
      userId: row.user_id,
      name: row.name,
      avatarUrl: row.avatar_url,
      activeSubscriptionCount,
      latestSubscriptionId: row.latest_subscription_id,
      preferredLocalHour: row.preferred_local_hour ?? null,
      preferredTimezone: row.preferred_timezone ?? null,
      timezoneMode: row.timezone_mode ?? null,
      deliveryStrategy: row.delivery_strategy ?? null,
      lastSentAt: row.last_sent_at,
      lastGratitudeSentAt: row.last_gratitude_sent_at,
      lastChallengeNotifiedAt: row.last_challenge_notified_at,
      lastRefreshedAt,
      refreshDueAt,
      refreshDue,
      dailyWisdomReason,
      gratitudeReason,
      challengeReminderReason,
      commentReason,
      nudgeReason,
      recentPushFailureReason,
      recentPushFailureAt: row.latest_failure_at,
      recentPushFailureCount: Number(row.failure_count ?? 0),
      recentEndpointRejectedCount: Number(row.endpoint_rejected_count ?? 0),
      recentVapidFailureCount: Number(row.vapid_failure_count ?? 0),
      recentNoRecipientRowCount:
        Number(row.comment_no_recipient_row_count ?? 0) + Number(row.nudge_no_recipient_row_count ?? 0),
      issueCount: issueSet.size,
    } satisfies NotificationDeliveryReportRow;
  });

  const summary = mappedRows.reduce(
    (acc, row) => {
      acc.totalUsers += 1;
      acc.usersWithActiveSubscriptions += row.activeSubscriptionCount > 0 ? 1 : 0;
      acc.usersWithoutActiveSubscriptions += row.activeSubscriptionCount === 0 ? 1 : 0;
      acc.usersBeforeWindow += countIf(row.dailyWisdomReason === "before window" || row.gratitudeReason === "before window" || row.challengeReminderReason === "before window");
      acc.usersAlreadySentToday += countIf(row.dailyWisdomReason === "already sent today" || row.gratitudeReason === "already sent today" || row.challengeReminderReason === "already sent today");
      acc.usersWithNoRecipientRow += countIf(row.commentReason === "no recipient row" || row.nudgeReason === "no recipient row");
      acc.usersWithPushEndpointRejected += countIf(row.commentReason === "push endpoint rejected" || row.nudgeReason === "push endpoint rejected" || row.recentPushFailureReason === "push endpoint rejected");
      acc.usersWithVapidFailure += countIf(
        row.dailyWisdomReason === "VAPID failure" ||
          row.gratitudeReason === "VAPID failure" ||
          row.challengeReminderReason === "VAPID failure" ||
          row.commentReason === "VAPID failure" ||
          row.nudgeReason === "VAPID failure" ||
          row.recentPushFailureReason === "VAPID failure"
      );
      acc.usersWithRefreshDue += countIf(row.refreshDue);
      acc.usersWithIssues += countIf(row.issueCount > 0);
      return acc;
    },
    {
      totalUsers: 0,
      usersWithActiveSubscriptions: 0,
      usersWithoutActiveSubscriptions: 0,
      usersBeforeWindow: 0,
      usersAlreadySentToday: 0,
      usersWithNoRecipientRow: 0,
      usersWithPushEndpointRejected: 0,
      usersWithVapidFailure: 0,
      usersWithRefreshDue: 0,
      usersWithIssues: 0,
    }
  );

  return {
    generatedAt: currentDate.toISOString(),
    lookbackDays: days,
    vapid: {
      configured: vapidStatus.configured,
      keyPairValid: vapidStatus.keyPairValid,
      reason: vapidStatus.reason,
    },
    summary,
    rows: mappedRows.sort((a, b) => {
      if (b.issueCount !== a.issueCount) {
        return b.issueCount - a.issueCount;
      }
      return (a.name ?? a.userId).localeCompare(b.name ?? b.userId);
    }),
  };
}
