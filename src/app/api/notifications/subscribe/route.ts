import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { run } from "@/lib/db";
import { isPushConfigured } from "@/lib/notifications";
import { readJsonBody } from "@/lib/request";

type NotificationSubscriptionBody = {
  subscription?: {
    endpoint?: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
  preferredHour?: number;
  preferredLocalHour?: number;
  preferredTimezone?: string;
  timezoneMode?: string;
  deliveryStrategy?: string;
};

type NotificationSubscribeRouteDeps = {
  isPushConfigured: typeof isPushConfigured;
  requireUser: typeof requireUser;
  readJsonBody: typeof readJsonBody;
  headers: typeof headers;
  run: typeof run;
  consoleError: (message: string, details?: unknown) => void;
};

export const notificationSubscribeRouteDeps: NotificationSubscribeRouteDeps = {
  isPushConfigured,
  requireUser,
  readJsonBody,
  headers,
  run,
  consoleError: (message, details) => console.error(message, details),
};

function signInRequiredResponse(message: string) {
  return apiError(401, "sign_in_required", message);
}

async function parseSubscriptionBody(request: Request, deps: NotificationSubscribeRouteDeps) {
  return deps.readJsonBody<NotificationSubscriptionBody>(request, { maxBytes: 4_000 });
}

export async function postNotificationSubscription(
  request: Request,
  deps: NotificationSubscribeRouteDeps = notificationSubscribeRouteDeps
) {
  if (!deps.isPushConfigured()) {
    return apiError(503, "not_configured", "Notifications are not configured yet.");
  }

  let user;
  try {
    user = await deps.requireUser();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return signInRequiredResponse("Sign in to enable notifications.");
    }
    deps.consoleError("notification subscription auth failed", error);
    return apiError(500, "save_failed", "Notification subscription could not be saved.");
  }

  const parsedBody = await parseSubscriptionBody(request, deps);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const body = parsedBody.data;
  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;
  const preferredHour = Number.isInteger(body.preferredHour)
    ? Math.min(23, Math.max(0, body.preferredHour ?? 8))
    : 8;
  const preferredLocalHour = Number.isInteger(body.preferredLocalHour)
    ? Math.min(23, Math.max(0, body.preferredLocalHour ?? 8))
    : 8;
  const preferredTimezone = typeof body.preferredTimezone === "string" && body.preferredTimezone.trim()
    ? body.preferredTimezone.trim().slice(0, 80)
    : "UTC";
  const timezoneMode = body.timezoneMode === "manual" ? "manual" : "auto";
  const deliveryStrategy = typeof body.deliveryStrategy === "string" && body.deliveryStrategy.trim()
    ? body.deliveryStrategy.trim().slice(0, 40)
    : "morning";

  if (!endpoint || !p256dh || !auth) {
    return apiError(400, "invalid_subscription", "Invalid push subscription.");
  }

  try {
    const headerStore = await deps.headers();
    const userAgent = headerStore.get("user-agent");
    const now = new Date().toISOString();

    await deps.run(
      `INSERT INTO push_subscriptions (
        id, user_id, endpoint, p256dh, auth, user_agent, enabled, preferred_hour,
        preferred_local_hour, preferred_timezone, timezone_mode, delivery_strategy, last_verified_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (endpoint)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        enabled = TRUE,
        preferred_hour = EXCLUDED.preferred_hour,
        preferred_local_hour = EXCLUDED.preferred_local_hour,
        preferred_timezone = EXCLUDED.preferred_timezone,
        timezone_mode = EXCLUDED.timezone_mode,
        delivery_strategy = EXCLUDED.delivery_strategy,
        last_verified_at = EXCLUDED.last_verified_at,
        updated_at = EXCLUDED.updated_at`,
      crypto.randomUUID(),
      user.id,
      endpoint,
      p256dh,
      auth,
      userAgent,
      preferredHour,
      preferredLocalHour,
      preferredTimezone,
      timezoneMode,
      deliveryStrategy,
      now,
      now,
      now
    );

    await deps.run(
      `INSERT INTO user_preferences (
         user_id, notification_preferred_local_hour, notification_preferred_timezone,
         notification_timezone_mode, notification_delivery_strategy, notification_timing_updated_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id)
       DO UPDATE SET
         notification_preferred_local_hour = EXCLUDED.notification_preferred_local_hour,
         notification_preferred_timezone = EXCLUDED.notification_preferred_timezone,
         notification_timezone_mode = EXCLUDED.notification_timezone_mode,
         notification_delivery_strategy = EXCLUDED.notification_delivery_strategy,
         notification_timing_updated_at = EXCLUDED.notification_timing_updated_at,
         updated_at = EXCLUDED.updated_at`,
      user.id,
      preferredLocalHour,
      preferredTimezone,
      timezoneMode,
      deliveryStrategy,
      now,
      now,
      now
    );

    await deps.run(
      `UPDATE push_subscriptions
       SET preferred_hour = ?,
           preferred_local_hour = ?,
           preferred_timezone = ?,
           timezone_mode = ?,
           delivery_strategy = ?,
           updated_at = ?
       WHERE user_id = ? AND enabled = TRUE`,
      preferredHour,
      preferredLocalHour,
      preferredTimezone,
      timezoneMode,
      deliveryStrategy,
      now,
      user.id
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    deps.consoleError("notification subscription save failed", { userId: user.id, error });
    return apiError(500, "save_failed", "Notification subscription could not be saved.");
  }
}

export async function POST(request: Request) {
  return postNotificationSubscription(request);
}
