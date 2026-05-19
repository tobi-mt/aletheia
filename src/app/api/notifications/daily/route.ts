import { NextResponse } from "next/server";
import { sendDailyWisdomNotifications } from "@/lib/notifications";

export async function POST(request: Request) {
  const secret = process.env.NOTIFICATION_CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await sendDailyWisdomNotifications();
  return NextResponse.json(result);
}
