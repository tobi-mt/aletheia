import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { getNotificationHealthSnapshot, getVapidKeyPairStatus } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type HealthScope = "live" | "readiness";

function healthSecret() {
  return (process.env.NOTIFICATION_CRON_SECRET || "").trim();
}

function validSecret(request: Request) {
  const secret = healthSecret();
  if (!secret) {
    return false;
  }

  const bearerSecret = request.headers.get("authorization")?.replace("Bearer ", "").trim();
  const cronHeaderSecret = request.headers.get("x-cron-secret")?.trim();
  const headerSecret = request.headers.get("x-health-secret")?.trim();
  const urlSecret = new URL(request.url).searchParams.get("secret")?.trim();

  return [bearerSecret, cronHeaderSecret, headerSecret, urlSecret].some((candidate) => candidate === secret);
}

function scopeFromRequest(request: Request): HealthScope {
  const scope = new URL(request.url).searchParams.get("scope")?.trim().toLowerCase();
  if (scope === "readiness") {
    return "readiness";
  }
  return "live";
}

export async function GET(request: Request) {
  if (!validSecret(request)) {
    return apiError(401, "permission_denied", "Unauthorized.");
  }

  const scope = scopeFromRequest(request);

  if (scope === "readiness") {
    const vapidStatus = getVapidKeyPairStatus();
    return NextResponse.json({
      ok: true,
      configured: {
        cronSecret: Boolean(process.env.NOTIFICATION_CRON_SECRET?.trim()),
        vapidPublicKey: Boolean((process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "").trim()),
        vapidPrivateKey: Boolean(process.env.VAPID_PRIVATE_KEY?.trim()),
        vapidSubject: Boolean((process.env.VAPID_SUBJECT || process.env.VAPID_CLAIM_EMAIL || "").trim()),
        vapidKeyPairValid: vapidStatus.keyPairValid,
      },
      vapidReason: vapidStatus.reason,
      generatedAt: new Date().toISOString(),
    });
  }

  const snapshot = await getNotificationHealthSnapshot();
  return NextResponse.json({ ok: true, ...snapshot });
}
