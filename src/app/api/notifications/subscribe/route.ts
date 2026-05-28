import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { run } from "@/lib/db";
import { isPushConfigured } from "@/lib/notifications";

export async function POST(request: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Notifications are not configured yet." }, { status: 503 });
  }

  try {
    const user = await requireUser();
    const body = (await request.json()) as {
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
      deliveryStrategy?: string;
    };

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
    const deliveryStrategy = typeof body.deliveryStrategy === "string" && body.deliveryStrategy.trim()
      ? body.deliveryStrategy.trim().slice(0, 40)
      : "morning";

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
    }

    const headerStore = await headers();
    const userAgent = headerStore.get("user-agent");
    const now = new Date().toISOString();

    await run(
      `INSERT INTO push_subscriptions (
        id, user_id, endpoint, p256dh, auth, user_agent, enabled, preferred_hour,
        preferred_local_hour, preferred_timezone, delivery_strategy, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?, ?, ?)
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
        delivery_strategy = EXCLUDED.delivery_strategy,
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
      deliveryStrategy,
      now,
      now
    );

    await run(
      `INSERT INTO user_preferences (
         user_id, notification_preferred_local_hour, notification_preferred_timezone,
         notification_delivery_strategy, notification_timing_updated_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id)
       DO UPDATE SET
         notification_preferred_local_hour = EXCLUDED.notification_preferred_local_hour,
         notification_preferred_timezone = EXCLUDED.notification_preferred_timezone,
         notification_delivery_strategy = EXCLUDED.notification_delivery_strategy,
         notification_timing_updated_at = EXCLUDED.notification_timing_updated_at,
         updated_at = EXCLUDED.updated_at`,
      user.id,
      preferredLocalHour,
      preferredTimezone,
      deliveryStrategy,
      now,
      now,
      now
    );

    await run(
      `UPDATE push_subscriptions
       SET preferred_hour = ?,
           preferred_local_hour = ?,
           preferred_timezone = ?,
           delivery_strategy = ?,
           updated_at = ?
       WHERE user_id = ? AND enabled = TRUE`,
      preferredHour,
      preferredLocalHour,
      preferredTimezone,
      deliveryStrategy,
      now,
      user.id
    );

    await trackServerEvent({
      userId: user.id,
      eventName: "notification_enabled",
      metadata: { preferredHour, preferredLocalHour, preferredTimezone, deliveryStrategy },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sign in to enable notifications." }, { status: 401 });
  }
}
