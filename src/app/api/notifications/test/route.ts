import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPushConfigured, sendTestWisdomNotification } from "@/lib/notifications";
import { isNativePushConfigured } from "@/lib/native-push";
import { apiError } from "@/lib/api-errors";
import { readJsonBody } from "@/lib/request";

export const dynamic = "force-dynamic";

const testPushDeps = { isPushConfigured, isNativePushConfigured, getCurrentUser, sendTestWisdomNotification };

export async function postTestNotification(request: Request, deps = testPushDeps) {
  if (!deps.isPushConfigured() && !deps.isNativePushConfigured()) {
    return apiError(503, "not_configured", "Notifications are not configured yet.");
  }

  const user = await deps.getCurrentUser();
  if (!user) return apiError(401, "sign_in_required", "Sign in to send a test notification.");
  const body = await readJsonBody<{ nativeDeviceId?: string; webEndpoint?: string }>(request, { maxBytes: 4_000, emptyBody: {} });
  if (!body.ok) return body.response;
  const { nativeDeviceId, webEndpoint } = body.data;
  if (
    (nativeDeviceId !== undefined && (typeof nativeDeviceId !== "string" || !nativeDeviceId.trim())) ||
    (webEndpoint !== undefined && (typeof webEndpoint !== "string" || !webEndpoint.trim())) ||
    (nativeDeviceId && webEndpoint)
  ) {
    return apiError(400, "invalid_subscription", "Select one device for the test notification.");
  }
  try {
    const target = nativeDeviceId ? { nativeDeviceId } : webEndpoint ? { webEndpoint } : undefined;
    const result = await deps.sendTestWisdomNotification(user.id, target);
    if (result.attempted === 0) return apiError(409, "invalid_subscription", "No active push registration was found.");
    if (result.sent === 0) return apiError(502, "push_delivery_failed", "The push provider did not accept the test notification.");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Test push notification failed", error);
    return apiError(500, "push_delivery_failed", "The test notification could not be sent.");
  }
}

export async function POST(request: Request) {
  return postTestNotification(request);
}
