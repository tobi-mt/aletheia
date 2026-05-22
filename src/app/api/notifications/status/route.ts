import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { many } from "@/lib/db";
import { isPushConfigured } from "@/lib/notifications";

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
  }>(
    `SELECT COUNT(*) as count,
            MAX(preferred_local_hour) as preferred_local_hour,
            MAX(preferred_timezone) as preferred_timezone,
            MAX(delivery_strategy) as delivery_strategy
     FROM push_subscriptions
     WHERE user_id = ? AND enabled = TRUE`,
    user.id
  );

  return NextResponse.json({
    configured: isPushConfigured(),
    enabled: Number(rows[0]?.count ?? 0) > 0,
    subscriptions: Number(rows[0]?.count ?? 0),
    preferredLocalHour: rows[0]?.preferred_local_hour ?? 8,
    preferredTimezone: rows[0]?.preferred_timezone ?? "UTC",
    deliveryStrategy: rows[0]?.delivery_strategy ?? "morning",
  });
}
