import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { isPushConfigured, sendTestWisdomNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Notifications are not configured yet." }, { status: 503 });
  }

  try {
    const user = await requireUser();
    const result = await sendTestWisdomNotification(user.id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Sign in to send a test notification." }, { status: 401 });
  }
}
