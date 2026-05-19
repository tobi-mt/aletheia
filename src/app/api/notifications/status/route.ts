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

  const rows = await many<{ count: string }>(
    "SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = ? AND enabled = TRUE",
    user.id
  );

  return NextResponse.json({
    configured: isPushConfigured(),
    enabled: Number(rows[0]?.count ?? 0) > 0,
    subscriptions: Number(rows[0]?.count ?? 0),
  });
}
