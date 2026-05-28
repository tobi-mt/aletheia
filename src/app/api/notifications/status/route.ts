import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { many, run } from "@/lib/db";
import { isPushConfigured } from "@/lib/notifications";

function normalizeTiming(body: {
  preferredLocalHour?: unknown;
  preferredTimezone?: unknown;
  deliveryStrategy?: unknown;
}) {
  const deliveryStrategy =
    typeof body.deliveryStrategy === "string" &&
    ["morning", "midday", "evening", "custom"].includes(body.deliveryStrategy)
      ? body.deliveryStrategy
      : "custom";
  const preferredLocalHour = Number.isInteger(body.preferredLocalHour)
    ? Math.min(23, Math.max(0, Number(body.preferredLocalHour)))
    : 8;
  const preferredTimezone =
    typeof body.preferredTimezone === "string" && body.preferredTimezone.trim()
      ? body.preferredTimezone.trim().slice(0, 80)
      : "UTC";

  return { preferredLocalHour, preferredTimezone, deliveryStrategy };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({
      configured: isPushConfigured(),
      enabled: false,
      subscriptions: 0,
    });
  }

  const rows = await many<{
    count: string;
    preferred_local_hour: number | null;
    preferred_timezone: string | null;
    delivery_strategy: string | null;
    notification_preferred_local_hour: number | null;
    notification_preferred_timezone: string | null;
    notification_delivery_strategy: string | null;
    notification_timing_updated_at: string | null;
  }>(
    `WITH latest_subscription AS (
       SELECT preferred_local_hour, preferred_timezone, delivery_strategy
       FROM push_subscriptions
       WHERE user_id = ? AND enabled = TRUE
       ORDER BY updated_at DESC
       LIMIT 1
     ),
     subscription_count AS (
       SELECT COUNT(*) as count
       FROM push_subscriptions
       WHERE user_id = ? AND enabled = TRUE
     )
     SELECT subscription_count.count,
            latest_subscription.preferred_local_hour,
            latest_subscription.preferred_timezone,
            latest_subscription.delivery_strategy,
            user_preferences.notification_preferred_local_hour,
            user_preferences.notification_preferred_timezone,
            user_preferences.notification_delivery_strategy,
            user_preferences.notification_timing_updated_at
     FROM subscription_count
     LEFT JOIN latest_subscription ON TRUE
     LEFT JOIN user_preferences ON user_preferences.user_id = ?`,
    user.id,
    user.id,
    user.id
  );
  const row = rows[0];
  const hasAccountTiming = Boolean(row?.notification_timing_updated_at);
  const preferredLocalHour = hasAccountTiming
    ? row?.notification_preferred_local_hour
    : row?.preferred_local_hour;
  const preferredTimezone = hasAccountTiming
    ? row?.notification_preferred_timezone
    : row?.preferred_timezone;
  const deliveryStrategy = hasAccountTiming
    ? row?.notification_delivery_strategy
    : row?.delivery_strategy;

  return NextResponse.json({
    configured: isPushConfigured(),
    enabled: Number(row?.count ?? 0) > 0,
    subscriptions: Number(row?.count ?? 0),
    timingConfigured: hasAccountTiming || Number(row?.count ?? 0) > 0,
    preferredLocalHour: preferredLocalHour ?? 8,
    preferredTimezone: preferredTimezone ?? "UTC",
    deliveryStrategy: deliveryStrategy ?? "morning",
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to save notification timing." }, { status: 401 });
  }

  const timing = normalizeTiming(await request.json());
  const preferredHour = timing.preferredLocalHour;
  const now = new Date().toISOString();

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
    timing.preferredLocalHour,
    timing.preferredTimezone,
    timing.deliveryStrategy,
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
    timing.preferredLocalHour,
    timing.preferredTimezone,
    timing.deliveryStrategy,
    now,
    user.id
  );

  return NextResponse.json({ ok: true, ...timing });
}
