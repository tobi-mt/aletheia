import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { many, one } from "@/lib/db";
import { apiError } from "@/lib/api-errors";
import { getVapidKeyPairStatus, getVapidPublicKey, isPushConfigured } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const NOTIFICATION_SUBSCRIPTION_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

type DiagnosticsRow = {
  id: string;
  endpoint: string;
  preferred_local_hour: number | null;
  preferred_timezone: string | null;
  timezone_mode: string | null;
  delivery_strategy: string | null;
  updated_at: string | null;
  last_sent_at: string | null;
  last_gratitude_sent_at: string | null;
  last_challenge_notified_at: string | null;
  last_verified_at: string | null;
};

type DiagnosticsStatus = "before_window" | "already_sent_today" | "subscription_stale" | null;

type NotificationDiagnosticsRouteDeps = {
  getAdminSecret: () => string | undefined;
  requireUser: typeof requireUser;
  many: typeof many;
  one: typeof one;
  getVapidKeyPairStatus: typeof getVapidKeyPairStatus;
  getVapidPublicKey: typeof getVapidPublicKey;
  isPushConfigured: typeof isPushConfigured;
  now: () => Date;
};

export const notificationDiagnosticsRouteDeps: NotificationDiagnosticsRouteDeps = {
  getAdminSecret: () => process.env.ANALYTICS_ADMIN_SECRET?.trim(),
  requireUser,
  many,
  one,
  getVapidKeyPairStatus,
  getVapidPublicKey,
  isPushConfigured,
  now: () => new Date(),
};

type CronEventRow = {
  created_at: string;
};

function parseTimestamp(value: string | null) {
  if (!value) {
    return null;
  }
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : ts;
}

function daysSince(value: string | null, reference = new Date()) {
  const ts = parseTimestamp(value);
  if (ts === null) {
    return null;
  }
  return Math.floor((reference.getTime() - ts) / 86400000);
}

function minutesSince(value: string | null, reference = new Date()) {
  const ts = parseTimestamp(value);
  if (ts === null) {
    return null;
  }
  return Math.floor((reference.getTime() - ts) / 60000);
}

function minutesUntil(value: string | null, now: Date) {
  const ts = parseTimestamp(value);
  if (ts === null) {
    return null;
  }
  return Math.ceil((ts - now.getTime()) / 60000);
}

function latestActivityAt(row: DiagnosticsRow) {
  const candidates = [
    parseTimestamp(row.last_sent_at),
    parseTimestamp(row.last_gratitude_sent_at),
    parseTimestamp(row.last_challenge_notified_at),
    parseTimestamp(row.updated_at),
  ].filter((value): value is number => value !== null);

  if (candidates.length === 0) {
    return null;
  }

  return new Date(Math.max(...candidates)).toISOString();
}

function latestRefreshAt(row: DiagnosticsRow) {
  return row.last_verified_at ?? null;
}

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

function determineSkipReason(row: DiagnosticsRow, now: Date): DiagnosticsStatus {
  const activityAt = latestActivityAt(row);
  const stale = activityAt ? (daysSince(activityAt, now) ?? 0) > 7 : true;
  if (stale) {
    return "subscription_stale";
  }

  const preferredLocalHour = Number.isInteger(row.preferred_local_hour)
    ? Math.min(23, Math.max(0, Number(row.preferred_local_hour)))
    : 8;
  const localHour = localHourForTimezone(now, row.preferred_timezone);
  if (localHour < preferredLocalHour) {
    return "before_window";
  }

  const alreadySentToday =
    row.last_sent_at &&
    localDateForTimezone(new Date(row.last_sent_at), row.preferred_timezone) ===
      localDateForTimezone(now, row.preferred_timezone);
  if (alreadySentToday) {
    return "already_sent_today";
  }

  return null;
}

function refreshDueAt(row: DiagnosticsRow) {
  const ts = parseTimestamp(latestRefreshAt(row));
  if (ts === null) {
    return null;
  }
  return new Date(ts + NOTIFICATION_SUBSCRIPTION_REFRESH_INTERVAL_MS).toISOString();
}

function refreshDue(row: DiagnosticsRow, now: Date) {
  const lastRefreshAt = latestRefreshAt(row);
  if (!lastRefreshAt) {
    return true;
  }
  const dueAt = refreshDueAt(row);
  return dueAt ? parseTimestamp(dueAt) !== null && now.getTime() >= Date.parse(dueAt) : true;
}

export async function getNotificationDiagnosticsRoute(
  request: Request,
  deps: NotificationDiagnosticsRouteDeps = notificationDiagnosticsRouteDeps
) {
  try {
    const adminSecret = deps.getAdminSecret();
    const bearerToken = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    const isAdminRequest = Boolean(adminSecret && bearerToken === adminSecret);
    const user = isAdminRequest ? null : await deps.requireUser();
    const vapidStatus = deps.getVapidKeyPairStatus();
    const now = deps.now();

    const [subscriptionRows, cronRows] = await Promise.all([
      isAdminRequest
        ? deps.many<DiagnosticsRow>(
            `SELECT id, endpoint, preferred_local_hour, preferred_timezone, timezone_mode, delivery_strategy,
                    updated_at, last_sent_at, last_gratitude_sent_at, last_challenge_notified_at, last_verified_at
             FROM push_subscriptions
             WHERE enabled = TRUE
             ORDER BY updated_at DESC`
          )
        : deps.many<DiagnosticsRow>(
            `SELECT id, endpoint, preferred_local_hour, preferred_timezone, timezone_mode, delivery_strategy,
                    updated_at, last_sent_at, last_gratitude_sent_at, last_challenge_notified_at, last_verified_at
             FROM push_subscriptions
             WHERE user_id = ? AND enabled = TRUE
             ORDER BY updated_at DESC`,
            user!.id
          ),
      deps.one<CronEventRow>(
        `SELECT created_at
         FROM analytics_events
         WHERE event_name = 'notification_daily_checked'
           AND source = 'cron'
         ORDER BY created_at DESC
         LIMIT 1`
      ),
    ]);

    const diagnostics = subscriptionRows.map((row) => {
      const activityAt = latestActivityAt(row);
      const stale = activityAt ? (daysSince(activityAt, now) ?? 0) > 7 : true;
      const skipReason = determineSkipReason(row, now);
      const lastRefreshedAt = latestRefreshAt(row);
      const dueAt = refreshDueAt(row);
      return {
        id: row.id,
        endpointHost: (() => {
          try {
            return new URL(row.endpoint).host;
          } catch {
            return "unknown";
          }
        })(),
        preferredLocalHour: row.preferred_local_hour ?? 8,
        preferredTimezone: row.preferred_timezone ?? "UTC",
        timezoneMode: row.timezone_mode === "manual" ? "manual" : "auto",
        deliveryStrategy: row.delivery_strategy ?? "morning",
        updatedAt: row.updated_at,
        lastSentAt: row.last_sent_at,
        lastGratitudeSentAt: row.last_gratitude_sent_at,
        lastChallengeNotifiedAt: row.last_challenge_notified_at,
        lastRefreshedAt,
        refreshDueAt: dueAt,
        refreshDue: refreshDue(row, now),
        refreshDueMinutes: dueAt ? minutesUntil(dueAt, now) : null,
        latestActivityAt: activityAt,
        daysSinceLastActivity: activityAt ? daysSince(activityAt, now) : null,
        stale,
        skipReason,
      };
    });

    const lastDailyCheckedAt = cronRows?.created_at ?? null;
    const lastDailyCheckedMinutesAgo = minutesSince(lastDailyCheckedAt, now);
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
          : diagnostics.length === 0
            ? "subscribe"
            : diagnostics.some((row) => row.refreshDue || row.stale)
              ? "resubscribe_or_send_test"
              : "none";

    return NextResponse.json({
      configured: deps.isPushConfigured(),
      server: {
        cronSecretConfigured,
        cronHealthy,
        cronStatus,
        lastDailyCheckedAt,
        lastDailyCheckedMinutesAgo,
        vapidConfigured: vapidStatus.configured,
        vapidKeyPairValid: vapidStatus.keyPairValid,
        vapidSubjectConfigured: Boolean((process.env.VAPID_SUBJECT || process.env.VAPID_CLAIM_EMAIL || "").trim()),
        vapidPublicKeyConfigured: Boolean(getVapidPublicKey().trim()),
        vapidReason: vapidStatus.reason,
      },
      account: {
        subscriptions: diagnostics.length,
        staleSubscriptions: diagnostics.filter((row) => row.stale).length,
        refreshDueSubscriptions: diagnostics.filter((row) => row.refreshDue).length,
        recommendedAction,
        diagnostics,
      },
      generatedAt: new Date().toISOString(),
      scope: isAdminRequest ? "admin" : "account",
    });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to view notification diagnostics.");
  }
}

export async function GET(request: Request) {
  return getNotificationDiagnosticsRoute(request);
}
