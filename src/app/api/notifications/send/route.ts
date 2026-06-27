"use server";

import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import {
  recordDailyNotificationUnauthorizedHit,
  sendChallengeReminders,
  sendDailyWisdomNotifications,
} from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics";

/**
 * Legacy compatibility endpoint for scheduled notification delivery.
 * Keep this aligned with /api/notifications/daily so older scheduler wiring
 * still reaches the real push sender.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function hasValidSecret(request: Request) {
  const primarySecret = process.env.NOTIFICATION_CRON_SECRET?.trim();
  const legacySecret = process.env.CRON_SECRET?.trim();
  const bearerSecret = request.headers.get("authorization")?.replace("Bearer ", "").trim();
  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  const urlSecret = new URL(request.url).searchParams.get("secret")?.trim();

  const allowedSecrets = [primarySecret, legacySecret].filter((value): value is string => Boolean(value));
  if (allowedSecrets.length === 0) {
    return false;
  }

  return [bearerSecret, headerSecret, urlSecret].some((candidate) => allowedSecrets.includes(candidate ?? ""));
}

async function runLegacyDailyNotifications(request: Request) {
  const secret = process.env.NOTIFICATION_CRON_SECRET || process.env.CRON_SECRET;

  if (!secret || !hasValidSecret(request)) {
    await recordDailyNotificationUnauthorizedHit().catch(() => undefined);
    return apiError(401, "permission_denied", "Unauthorized.");
  }

  const result = await sendDailyWisdomNotifications();
  const challengeResult = await sendChallengeReminders().catch(() => ({ attempted: 0, sent: 0, failed: 0, suggested: 0 }));

  await trackEvent({
    eventName: "notification_daily_checked",
    source: "cron",
    metadata: {
      attempted: result.attempted,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      scanned: result.scanned,
      hour: result.hour,
      followupAttempted: result.followupAttempted,
      followupSent: result.followupSent,
      followupFailed: result.followupFailed,
      followupDecisionsNotified: result.followupDecisionsNotified,
      gratitudeAttempted: result.gratitudeAttempted,
      gratitudeSent: result.gratitudeSent,
      gratitudeFailed: result.gratitudeFailed,
      challengeAttempted: challengeResult.attempted,
      challengeSent: challengeResult.sent,
      challengeFailed: challengeResult.failed,
      challengeSuggested: challengeResult.suggested,
      legacyRoute: true,
    },
  }).catch(() => undefined);

  return NextResponse.json({
    ...result,
    challengeResult,
    legacyRoute: true,
    deprecationNotice: "Deprecated alias. Use /api/notifications/daily with NOTIFICATION_CRON_SECRET.",
  });
}

export async function GET(request: Request) {
  return runLegacyDailyNotifications(request);
}

export async function POST(request: Request) {
  return runLegacyDailyNotifications(request);
}
