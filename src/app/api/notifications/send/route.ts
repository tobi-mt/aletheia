import { apiError } from "@/lib/api-errors";
import { recordDailyNotificationUnauthorizedHit } from "@/lib/notifications";
import { executeDailyNotificationPipeline } from "@/app/api/notifications/daily/route";

/**
 * Legacy compatibility endpoint. Both scheduler URLs share the same database
 * execution claim, so old and new jobs cannot deliver the same hourly batch.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function hasValidSecret(request: Request) {
  const allowedSecrets = [
    process.env.NOTIFICATION_CRON_SECRET?.trim(),
    process.env.CRON_SECRET?.trim(),
  ].filter((value): value is string => Boolean(value));
  const bearerSecret = request.headers.get("authorization")?.replace("Bearer ", "").trim();
  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  const urlSecret = new URL(request.url).searchParams.get("secret")?.trim();

  return allowedSecrets.length > 0 &&
    [bearerSecret, headerSecret, urlSecret].some((candidate) => allowedSecrets.includes(candidate ?? ""));
}

async function runLegacyDailyNotifications(request: Request) {
  if (!hasValidSecret(request)) {
    await recordDailyNotificationUnauthorizedHit().catch(() => undefined);
    return apiError(401, "permission_denied", "Unauthorized.");
  }

  return executeDailyNotificationPipeline(new Date(), undefined, {
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
