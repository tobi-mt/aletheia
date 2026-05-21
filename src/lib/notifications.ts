import webpush, { PushSubscription } from "web-push";
import { many, run } from "@/lib/db";
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
  language: string | null;
  region: string | null;
  bible_translation: string | null;
  voice_enabled: boolean | null;
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

function dailyNotificationPayload(row: PushRow) {
  return getWisdomEntries().then((entries) => {
    const index = new Date().getDate() % entries.length;
    const wisdom = entries[index];
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
  });
}

export async function sendDailyWisdomNotifications() {
  configureWebPush();

  const now = new Date();
  const currentHour = now.getUTCHours();
  const rows = await many<PushRow>(
    `SELECT push_subscriptions.id, push_subscriptions.user_id, endpoint, p256dh, auth, preferred_hour,
            user_preferences.language, user_preferences.region, user_preferences.bible_translation, user_preferences.voice_enabled
     FROM push_subscriptions
     LEFT JOIN user_preferences ON user_preferences.user_id = push_subscriptions.user_id
     WHERE enabled = TRUE
       AND preferred_hour = ?
       AND (last_sent_at IS NULL OR last_sent_at < NOW() - INTERVAL '20 hours')`,
    currentHour
  );
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const payload = JSON.stringify(await dailyNotificationPayload(row));
    const subscription: PushSubscription = {
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh,
        auth: row.auth,
      },
    };

    try {
      await webpush.sendNotification(subscription, payload);
      await run(
        "UPDATE push_subscriptions SET last_sent_at = ?, updated_at = ? WHERE id = ?",
        now.toISOString(),
        now.toISOString(),
        row.id
      );
      sent += 1;
    } catch (error) {
      failed += 1;
      const statusCode =
        typeof error === "object" && error && "statusCode" in error
          ? Number(error.statusCode)
          : 0;
      if (statusCode === 404 || statusCode === 410) {
        await run("DELETE FROM push_subscriptions WHERE id = ?", row.id);
      }
    }
  }

  return {
    attempted: rows.length,
    sent,
    failed,
    hour: currentHour,
  };
}
