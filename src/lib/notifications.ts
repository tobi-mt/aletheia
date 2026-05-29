import webpush, { PushSubscription } from "web-push";
import { many, one, run } from "@/lib/db";
import { localizedDailyWisdom, normalizePreferences, type BibleTranslation, type LanguageCode, type RegionCode } from "@/lib/localization";
import { getWisdomEntries } from "@/lib/wisdom";
import type { Mode } from "@/lib/wisdom-data";

type PushRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  preferred_hour: number;
  preferred_local_hour: number | null;
  preferred_timezone: string | null;
  delivery_strategy: string | null;
  last_sent_at: string | null;
  language: string | null;
  region: string | null;
  bible_translation: string | null;
  voice_enabled: boolean | null;
};

const DAILY_UNAUTHORIZED_METRIC_KEY = "daily_unauthorized_hits";

type MetricRow = {
  metric_value: string | number;
};

export type NotificationHealthSnapshot = {
  enabledSubscriptions: number;
  dueNow: number;
  scanned: number;
  unauthorizedHits: number;
  hourUtc: number;
  generatedAt: string;
};

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
}

export function getVapidSubject() {
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (subject) {
    return subject;
  }
  const claimEmail = process.env.VAPID_CLAIM_EMAIL?.trim();
  if (!claimEmail) {
    return "";
  }
  return claimEmail.startsWith("mailto:") ? claimEmail : `mailto:${claimEmail}`;
}

export function isPushConfigured() {
  return Boolean(
    getVapidPublicKey() &&
      process.env.VAPID_PRIVATE_KEY &&
      getVapidSubject()
  );
}

export function configureWebPush() {
  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = getVapidSubject();

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Web Push is not configured. Add VAPID keys to the environment.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function dailyNotificationPayload(row: PushRow, wisdomEntries: Awaited<ReturnType<typeof getWisdomEntries>>) {
  const index = new Date().getDate() % wisdomEntries.length;
  const wisdom = wisdomEntries[index];
  const preferences = normalizePreferences({
    language: row.language as LanguageCode,
    region: row.region as RegionCode,
    bibleTranslation: row.bible_translation as BibleTranslation,
    voiceEnabled: Boolean(row.voice_enabled),
  });
  const dailyMode: Mode = ["Money", "Work", "Purpose", "Generosity"].includes(wisdom.theme)
    ? (wisdom.theme as Mode)
    : "Money";
  const daily = localizedDailyWisdom(wisdom, dailyMode, preferences);
  return {
    title: `${daily.label}: ${wisdom.theme}`,
    body: daily.practice || daily.principle,
    url: "/",
    scripture: daily.scripture,
  };
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

function shouldSendAtLocalHour(row: PushRow, now: Date) {
  const preferredLocalHour = Number.isInteger(row.preferred_local_hour)
    ? Math.min(23, Math.max(0, Number(row.preferred_local_hour)))
    : Math.min(23, Math.max(0, Number(row.preferred_hour ?? 8)));
  const localHour = localHourForTimezone(now, row.preferred_timezone);
  const alreadySentToday =
    row.last_sent_at &&
    localDateForTimezone(new Date(row.last_sent_at), row.preferred_timezone) ===
      localDateForTimezone(now, row.preferred_timezone);
  if (alreadySentToday) {
    return false;
  }

  return localHour === preferredLocalHour;
}

function shouldDeleteBrokenSubscription(error: unknown) {
  if (typeof error !== "object" || !error) {
    return false;
  }

  const statusCode = "statusCode" in error ? Number((error as { statusCode?: unknown }).statusCode) : 0;
  if (statusCode === 404 || statusCode === 410) {
    return true;
  }

  const body = "body" in error ? String((error as { body?: unknown }).body ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  const details = `${body} ${message}`.toLowerCase();

  // Subscriptions created with a different VAPID key pair can never recover.
  if (details.includes("vapidpkhashmismatch")) {
    return true;
  }
  if (details.includes("vapid credentials") && details.includes("do not correspond")) {
    return true;
  }

  return false;
}

export async function sendDailyWisdomNotifications() {
  configureWebPush();

  const now = new Date();
  const currentHour = now.getUTCHours();
  
  // Fetch wisdom entries once for all notifications
  const wisdomEntries = await getWisdomEntries();
  
  const rows = await many<PushRow>(
    `SELECT push_subscriptions.id, push_subscriptions.user_id, endpoint, p256dh, auth, preferred_hour, last_sent_at,
            preferred_local_hour, preferred_timezone, delivery_strategy,
            user_preferences.language, user_preferences.region, user_preferences.bible_translation, user_preferences.voice_enabled
     FROM push_subscriptions
     LEFT JOIN user_preferences ON user_preferences.user_id = push_subscriptions.user_id
     WHERE enabled = TRUE`,
  );
  const dueRows = rows.filter((row) => shouldSendAtLocalHour(row, now));
  let sent = 0;
  let failed = 0;

  // Process notifications in parallel with concurrency limit
  const BATCH_SIZE = 10;
  for (let i = 0; i < dueRows.length; i += BATCH_SIZE) {
    const batch = dueRows.slice(i, i + BATCH_SIZE);
    
    await Promise.allSettled(
      batch.map(async (row) => {
        const payload = JSON.stringify(dailyNotificationPayload(row, wisdomEntries));
        const subscription: PushSubscription = {
          endpoint: row.endpoint,
          keys: {
            p256dh: row.p256dh,
            auth: row.auth,
          },
        };

        try {
          // Add timeout to individual push notifications
          const sendPromise = webpush.sendNotification(subscription, payload);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Push notification timeout")), 10000)
          );
          
          await Promise.race([sendPromise, timeoutPromise]);
          
          await run(
            "UPDATE push_subscriptions SET last_sent_at = ?, updated_at = ? WHERE id = ?",
            now.toISOString(),
            now.toISOString(),
            row.id
          );
          sent += 1;
        } catch (error) {
          failed += 1;
          if (shouldDeleteBrokenSubscription(error)) {
            await run("DELETE FROM push_subscriptions WHERE id = ?", row.id);
          }
        }
      })
    );
  }

  return {
    attempted: dueRows.length,
    sent,
    failed,
    scanned: rows.length,
    skipped: rows.length - dueRows.length,
    catchupAttempted: 0,
    hour: currentHour,
  };
}

async function incrementNotificationMetric(metricKey: string, delta = 1) {
  await run(
    `CREATE TABLE IF NOT EXISTS notification_metrics (
       metric_key TEXT PRIMARY KEY,
       metric_value BIGINT NOT NULL DEFAULT 0,
       updated_at TIMESTAMPTZ NOT NULL
     )`
  );
  const now = new Date().toISOString();
  await run(
    `INSERT INTO notification_metrics (metric_key, metric_value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT (metric_key)
     DO UPDATE SET
       metric_value = notification_metrics.metric_value + EXCLUDED.metric_value,
       updated_at = EXCLUDED.updated_at`,
    metricKey,
    delta,
    now
  );
}

async function notificationMetricValue(metricKey: string) {
  await run(
    `CREATE TABLE IF NOT EXISTS notification_metrics (
       metric_key TEXT PRIMARY KEY,
       metric_value BIGINT NOT NULL DEFAULT 0,
       updated_at TIMESTAMPTZ NOT NULL
     )`
  );
  const row = await one<MetricRow>(
    `SELECT metric_value
     FROM notification_metrics
     WHERE metric_key = ?`,
    metricKey
  );
  return Number(row?.metric_value ?? 0);
}

export async function recordDailyNotificationUnauthorizedHit() {
  await incrementNotificationMetric(DAILY_UNAUTHORIZED_METRIC_KEY, 1);
}

export async function getNotificationHealthSnapshot(): Promise<NotificationHealthSnapshot> {
  const now = new Date();
  const rows = await many<PushRow>(
    `SELECT push_subscriptions.id, push_subscriptions.user_id, endpoint, p256dh, auth, preferred_hour, last_sent_at,
            preferred_local_hour, preferred_timezone, delivery_strategy,
            user_preferences.language, user_preferences.region, user_preferences.bible_translation, user_preferences.voice_enabled
     FROM push_subscriptions
     LEFT JOIN user_preferences ON user_preferences.user_id = push_subscriptions.user_id
     WHERE enabled = TRUE`,
  );

  const dueNow = rows.filter((row) => shouldSendAtLocalHour(row, now)).length;
  const unauthorizedHits = await notificationMetricValue(DAILY_UNAUTHORIZED_METRIC_KEY);

  return {
    enabledSubscriptions: rows.length,
    dueNow,
    scanned: rows.length,
    unauthorizedHits,
    hourUtc: now.getUTCHours(),
    generatedAt: now.toISOString(),
  };
}
