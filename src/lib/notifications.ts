import webpush, { PushSubscription } from "web-push";
import { createECDH, timingSafeEqual } from "node:crypto";
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

type DueDecisionReminderRow = {
  id: string;
  user_id: string;
  title: string;
  waiting_until: string | null;
  revisit_at: string | null;
  waiting_due: boolean;
  revisit_due: boolean;
};

type ReminderKind = "waiting" | "revisit";

type DueDecisionReminder = {
  decisionId: string;
  userId: string;
  title: string;
  kind: ReminderKind;
  dueAt: string;
};

const DAILY_UNAUTHORIZED_METRIC_KEY = "daily_unauthorized_hits";

type MetricRow = {
  metric_value: string | number;
};

type PushFailureSample = {
  id: string;
  userId: string;
  statusCode: number | null;
  reason: string;
  deleted: boolean;
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

function decodeBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function getVapidKeyPairStatus() {
  const publicKey = getVapidPublicKey().trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
  const subject = getVapidSubject();

  if (!publicKey || !privateKey || !subject) {
    return {
      configured: false,
      keyPairValid: false,
      reason: "missing_vapid_env",
    };
  }

  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(decodeBase64Url(privateKey));
    const derivedPublicKey = ecdh.getPublicKey();
    const configuredPublicKey = decodeBase64Url(publicKey);
    const keyPairValid =
      configuredPublicKey.length === derivedPublicKey.length &&
      timingSafeEqual(configuredPublicKey, derivedPublicKey);

    return {
      configured: true,
      keyPairValid,
      reason: keyPairValid ? "ok" : "public_private_mismatch",
    };
  } catch {
    return {
      configured: true,
      keyPairValid: false,
      reason: "invalid_vapid_key_format",
    };
  }
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
  const status = getVapidKeyPairStatus();
  return status.configured && status.keyPairValid;
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
  const index = dailyWisdomIndex(row, wisdomEntries.length, new Date());
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
  const body = buildDailyNotificationBody(
    row.delivery_strategy,
    daily.practice || daily.principle
  );
  return {
    title: `${daily.label}: ${wisdom.theme}`,
    body,
    url: "/?source=notification&focus=today",
    scripture: daily.scripture,
    tag: "aletheia-daily-wisdom",
  };
}

function stableHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function dailyWisdomIndex(row: PushRow, size: number, now: Date) {
  if (size <= 1) {
    return 0;
  }
  const dateSeed = localDateForTimezone(now, row.preferred_timezone);
  const seed = `${row.user_id}:${dateSeed}`;
  return stableHash(seed) % size;
}

function compactNotificationCopy(copy: string, max = 140) {
  const cleaned = copy.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function buildDailyNotificationBody(strategy: string | null, reflection: string) {
  const prompt =
    strategy === "evening"
      ? "Close your day with this wisdom."
      : strategy === "midday"
        ? "Pause and reset your focus."
        : "Begin with a grounded step.";
  const content = compactNotificationCopy(reflection, 118);
  return `${prompt} ${content}`;
}

function selectReminderForUser(reminders: DueDecisionReminder[]) {
  const sorted = [...reminders].sort((a, b) => {
    const aTime = Date.parse(a.dueAt);
    const bTime = Date.parse(b.dueAt);
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    if (a.kind === b.kind) {
      return 0;
    }
    return a.kind === "waiting" ? -1 : 1;
  });

  return sorted[0] || null;
}

function followupNotificationPayload(reminder: DueDecisionReminder) {
  const trimmedTitle = reminder.title.replace(/\s+/g, " ").trim();
  const title =
    reminder.kind === "waiting"
      ? "Waiting period complete"
      : "Time to revisit your decision";
  const body =
    reminder.kind === "waiting"
      ? `Your waiting period has ended for \"${trimmedTitle}\". Revisit with calm clarity.`
      : `Your revisit time arrived for \"${trimmedTitle}\". Return and choose your next faithful step.`;

  return {
    title,
    body: compactNotificationCopy(body, 140),
    url: "/?source=notification&focus=today",
    tag: `aletheia-decision-${reminder.kind}-${reminder.decisionId}`,
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

function summarizePushFailure(error: unknown, row: PushRow, deleted: boolean): PushFailureSample {
  const statusCode =
    typeof error === "object" && error && "statusCode" in error
      ? Number((error as { statusCode?: unknown }).statusCode) || null
      : null;
  const body =
    typeof error === "object" && error && "body" in error
      ? String((error as { body?: unknown }).body ?? "")
      : "";
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "Unknown push error");
  const reason = `${statusCode ? `${statusCode}: ` : ""}${body || message}`
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

  return {
    id: row.id,
    userId: row.user_id,
    statusCode,
    reason: reason || "Unknown push error",
    deleted,
  };
}

async function sendPushRows(
  rows: PushRow[],
  payloadForRow: (row: PushRow) => string,
  { updateLastSent = true }: { updateLastSent?: boolean } = {}
) {
  let sent = 0;
  let failed = 0;
  const failureSamples: PushFailureSample[] = [];
  const now = new Date();

  const BATCH_SIZE = 10;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (row) => {
        const subscription: PushSubscription = {
          endpoint: row.endpoint,
          keys: {
            p256dh: row.p256dh,
            auth: row.auth,
          },
        };

        try {
          const sendPromise = webpush.sendNotification(subscription, payloadForRow(row));
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Push notification timeout")), 10000)
          );

          await Promise.race([sendPromise, timeoutPromise]);

          if (updateLastSent) {
            await run(
              "UPDATE push_subscriptions SET last_sent_at = ?, updated_at = ? WHERE id = ?",
              now.toISOString(),
              now.toISOString(),
              row.id
            );
          }
          sent += 1;
        } catch (error) {
          failed += 1;
          const deleted = shouldDeleteBrokenSubscription(error);
          const failure = summarizePushFailure(error, row, deleted);
          failureSamples.push(failure);
          console.warn(
            `Push notification failed: subscription=${failure.id} user=${failure.userId} status=${failure.statusCode ?? "n/a"} deleted=${failure.deleted} reason=${failure.reason}`
          );
          if (deleted) {
            await run("DELETE FROM push_subscriptions WHERE id = ?", row.id);
          }
        }
      })
    );
  }

  return { sent, failed, failureSamples };
}

async function findDueDecisionReminders() {
  const rows = await many<DueDecisionReminderRow>(
    `SELECT
       id,
       user_id,
       title,
       waiting_until,
       revisit_at,
       (waiting_until IS NOT NULL AND waiting_until <= NOW() AND (waiting_notified_at IS NULL OR waiting_notified_at < waiting_until)) AS waiting_due,
       (revisit_at IS NOT NULL AND revisit_at <= NOW() AND (revisit_notified_at IS NULL OR revisit_notified_at < revisit_at)) AS revisit_due
     FROM wisdom_decisions
     WHERE status <> 'closed'
       AND (
         (waiting_until IS NOT NULL AND waiting_until <= NOW() AND (waiting_notified_at IS NULL OR waiting_notified_at < waiting_until))
         OR
         (revisit_at IS NOT NULL AND revisit_at <= NOW() AND (revisit_notified_at IS NULL OR revisit_notified_at < revisit_at))
       )`
  );

  const reminders: DueDecisionReminder[] = [];
  for (const row of rows) {
    if (row.waiting_due && row.waiting_until) {
      reminders.push({
        decisionId: row.id,
        userId: row.user_id,
        title: row.title,
        kind: "waiting",
        dueAt: row.waiting_until,
      });
    }
    if (row.revisit_due && row.revisit_at) {
      reminders.push({
        decisionId: row.id,
        userId: row.user_id,
        title: row.title,
        kind: "revisit",
        dueAt: row.revisit_at,
      });
    }
  }

  return reminders;
}

async function markDecisionReminderNotified(reminder: DueDecisionReminder, deliveredAtIso: string) {
  if (reminder.kind === "waiting") {
    await run(
      `UPDATE wisdom_decisions
       SET waiting_notified_at = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
      deliveredAtIso,
      deliveredAtIso,
      reminder.decisionId,
      reminder.userId
    );
    return;
  }

  await run(
    `UPDATE wisdom_decisions
     SET revisit_notified_at = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    deliveredAtIso,
    deliveredAtIso,
    reminder.decisionId,
    reminder.userId
  );
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

  const reminders = await findDueDecisionReminders();
  const remindersByUser = new Map<string, DueDecisionReminder[]>();
  for (const reminder of reminders) {
    const bucket = remindersByUser.get(reminder.userId);
    if (bucket) {
      bucket.push(reminder);
    } else {
      remindersByUser.set(reminder.userId, [reminder]);
    }
  }

  const selectedReminders = new Map<string, DueDecisionReminder>();
  for (const [userId, userReminders] of remindersByUser.entries()) {
    const selected = selectReminderForUser(userReminders);
    if (selected) {
      selectedReminders.set(userId, selected);
    }
  }

  let followupAttempted = 0;
  let followupSent = 0;
  let followupFailed = 0;
  const followupFailureSamples: PushFailureSample[] = [];
  let followupDecisionsNotified = 0;
  const followupUsers = new Set(selectedReminders.keys());

  for (const [userId, reminder] of selectedReminders.entries()) {
    const userRows = rows.filter((row) => row.user_id === userId);
    if (!userRows.length) {
      continue;
    }

    followupAttempted += userRows.length;
    const result = await sendPushRows(
      userRows,
      () => JSON.stringify(followupNotificationPayload(reminder))
    );
    followupSent += result.sent;
    followupFailed += result.failed;
    followupFailureSamples.push(...result.failureSamples);

    if (result.sent > 0) {
      await markDecisionReminderNotified(reminder, now.toISOString());
      followupDecisionsNotified += 1;
    }
  }

  const dueRows = rows.filter((row) => !followupUsers.has(row.user_id) && shouldSendAtLocalHour(row, now));
  const { sent, failed, failureSamples } = await sendPushRows(dueRows, (row) =>
    JSON.stringify(dailyNotificationPayload(row, wisdomEntries))
  );

  return {
    attempted: dueRows.length + followupAttempted,
    sent: sent + followupSent,
    failed: failed + followupFailed,
    scanned: rows.length,
    skipped: Math.max(0, rows.length - dueRows.length - followupAttempted),
    catchupAttempted: 0,
    hour: currentHour,
    followupAttempted,
    followupDecisionsNotified,
    failureSamples: [...followupFailureSamples, ...failureSamples].slice(0, 5),
  };
}

export async function sendTestWisdomNotification(userId: string) {
  configureWebPush();

  const rows = await many<PushRow>(
    `SELECT push_subscriptions.id, push_subscriptions.user_id, endpoint, p256dh, auth, preferred_hour, last_sent_at,
            preferred_local_hour, preferred_timezone, delivery_strategy,
            user_preferences.language, user_preferences.region, user_preferences.bible_translation, user_preferences.voice_enabled
     FROM push_subscriptions
     LEFT JOIN user_preferences ON user_preferences.user_id = push_subscriptions.user_id
     WHERE enabled = TRUE AND push_subscriptions.user_id = ?`,
    userId
  );

  const { sent, failed, failureSamples } = await sendPushRows(
    rows,
    () =>
      JSON.stringify({
        title: "Aletheia test",
        body: "Your daily wisdom notifications can reach this device.",
        url: "/",
        scripture: "Proverbs 3:5-6",
        test: true,
      }),
    { updateLastSent: false }
  );

  return {
    attempted: rows.length,
    sent,
    failed,
    scanned: rows.length,
    skipped: 0,
    failureSamples: failureSamples.slice(0, 5),
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
