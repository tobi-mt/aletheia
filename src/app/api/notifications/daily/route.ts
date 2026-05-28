import { NextResponse } from "next/server";
import { recordDailyNotificationUnauthorizedHit, sendDailyWisdomNotifications } from "@/lib/notifications";

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

async function runDailyNotifications(request: Request) {
  const secret = process.env.NOTIFICATION_CRON_SECRET;

  if (!secret || !hasValidSecret(request)) {
    await recordDailyNotificationUnauthorizedHit().catch(() => undefined);
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await sendDailyWisdomNotifications();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return runDailyNotifications(request);
}

export async function GET(request: Request) {
  return runDailyNotifications(request);
}
