import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { isPushConfigured, sendTestWisdomNotification } from "@/lib/notifications";
import { apiError } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isPushConfigured()) {
    return apiError(503, "not_configured", "Notifications are not configured yet.");
  }

  try {
    const user = await requireUser();
    const result = await sendTestWisdomNotification(user.id);
    return NextResponse.json(result);
  } catch {
    return apiError(401, "sign_in_required", "Sign in to send a test notification.");
  }
}
