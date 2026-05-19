import webpush, { PushSubscription } from "web-push";
import { many, run } from "@/lib/db";
import { getWisdomEntries } from "@/lib/wisdom";

type PushRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  preferred_hour: number;
};

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
}

export function isPushConfigured() {
  return Boolean(
    getVapidPublicKey() &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

export function configureWebPush() {
  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Web Push is not configured. Add VAPID keys to the environment.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function dailyNotificationPayload() {
  return getWisdomEntries().then((entries) => {
    const index = new Date().getDate() % entries.length;
    const wisdom = entries[index];
    return {
      title: `Today: ${wisdom.theme}`,
      body: wisdom.principle,
      url: "/",
      scripture: wisdom.scripture,
    };
  });
}

export async function sendDailyWisdomNotifications() {
  configureWebPush();

  const now = new Date();
  const currentHour = now.getUTCHours();
  const rows = await many<PushRow>(
    `SELECT id, endpoint, p256dh, auth, preferred_hour
     FROM push_subscriptions
     WHERE enabled = TRUE
       AND preferred_hour = ?
       AND (last_sent_at IS NULL OR last_sent_at < NOW() - INTERVAL '20 hours')`,
    currentHour
  );
  const payload = JSON.stringify(await dailyNotificationPayload());
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
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
