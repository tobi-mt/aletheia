import { NextResponse } from "next/server";
import { trackEvent } from "@/lib/analytics";
import {
  recordDailyNotificationUnauthorizedHit,
  sendChallengeReminders,
  sendDailyWisdomNotifications,
  sendPendingDecisionNotifications,
} from "@/lib/notifications";
import { apiError } from "@/lib/api-errors";

// Allow longer execution time for notification processing
export const maxDuration = 60; // seconds
export const dynamic = 'force-dynamic';

function hasValidSecret(request: Request) {
  const secret = process.env.NOTIFICATION_CRON_SECRET;
  const bearerSecret = request.headers.get("authorization")?.replace("Bearer ", "").trim();
  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  const urlSecret = new URL(request.url).searchParams.get("secret")?.trim();

  if (!secret) {
    return false;
  }

  return [bearerSecret, headerSecret, urlSecret].some((candidate) => candidate === secret);
}

export type DailyNotificationRouteDeps = {
  recordDailyNotificationUnauthorizedHit: typeof recordDailyNotificationUnauthorizedHit;
  sendPendingDecisionNotifications: typeof sendPendingDecisionNotifications;
  sendDailyWisdomNotifications: typeof sendDailyWisdomNotifications;
  sendChallengeReminders: typeof sendChallengeReminders;
  trackEvent: typeof trackEvent;
  now: () => Date;
};

export const dailyNotificationRouteDeps: DailyNotificationRouteDeps = {
  recordDailyNotificationUnauthorizedHit,
  sendPendingDecisionNotifications,
  sendDailyWisdomNotifications,
  sendChallengeReminders,
  trackEvent,
  now: () => new Date(),
};

export async function runDailyNotifications(request: Request, deps: DailyNotificationRouteDeps = dailyNotificationRouteDeps) {
  const secret = process.env.NOTIFICATION_CRON_SECRET;

  if (!secret || !hasValidSecret(request)) {
    await deps.recordDailyNotificationUnauthorizedHit().catch(() => undefined);
    return apiError(401, "permission_denied", "Unauthorized.");
  }

  const now = deps.now();
  const decisionResult = await deps.sendPendingDecisionNotifications(now).catch(() => ({
    attempted: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    processed: 0,
    failureSamples: [],
  }));
  const result = await deps.sendDailyWisdomNotifications(now);
  const challengeResult = await deps.sendChallengeReminders(now).catch(() => ({ attempted: 0, sent: 0, failed: 0, suggested: 0 }));
  await deps.trackEvent({
    eventName: "notification_daily_checked",
    source: "cron",
    metadata: {
      decisionAttempted: decisionResult.attempted,
      decisionSent: decisionResult.sent,
      decisionFailed: decisionResult.failed,
      decisionPending: decisionResult.pending,
      decisionProcessed: decisionResult.processed,
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
    },
  }).catch(() => undefined);
  return NextResponse.json({ ...result, decisionResult, challengeResult });
}

export async function POST(request: Request) {
  return runDailyNotifications(request);
}

export async function GET(request: Request) {
  return runDailyNotifications(request);
}
