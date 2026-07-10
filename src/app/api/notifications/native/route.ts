import { NextResponse } from "next/server";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { many } from "@/lib/db";
import { readJsonBody } from "@/lib/request";
import { isNativePushConfigured, registerNativePushDevice, unregisterNativePushDevice } from "@/lib/native-push";

type NativePushPlatform = "ios" | "android";

type NativePushRegistrationBody = {
  token?: string;
  platform?: NativePushPlatform;
  deviceName?: string;
  appVersion?: string;
  buildVersion?: string;
  pushEnvironment?: string;
};

type NativePushDeviceRow = {
  id: string;
  platform: string;
  token: string;
  device_name: string | null;
  app_version: string | null;
  build_version: string | null;
  push_environment: string | null;
  enabled: boolean;
  last_seen_at: string | null;
  last_registered_at: string | null;
  last_sent_at: string | null;
  updated_at: string | null;
};

function normalizePlatform(value: unknown): NativePushPlatform | null {
  if (value === "ios" || value === "android") {
    return value;
  }
  return null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({
      configured: isNativePushConfigured(),
      devices: 0,
      platforms: [],
    });
  }

  const devices = await many<NativePushDeviceRow>(
    `SELECT id, platform, token, device_name, app_version, build_version, push_environment, enabled,
            last_seen_at, last_registered_at, last_sent_at, updated_at
     FROM native_push_devices
     WHERE user_id = ?
     ORDER BY updated_at DESC`,
    user.id
  );

  return NextResponse.json({
    configured: isNativePushConfigured(),
    devices: devices.length,
    platforms: [...new Set(devices.map((device) => device.platform))],
    latestDevice: devices[0]
      ? {
          id: devices[0].id,
          platform: devices[0].platform,
          deviceName: devices[0].device_name,
          appVersion: devices[0].app_version,
          buildVersion: devices[0].build_version,
          pushEnvironment: devices[0].push_environment,
          enabled: devices[0].enabled,
          lastSeenAt: devices[0].last_seen_at,
          lastRegisteredAt: devices[0].last_registered_at,
          lastSentAt: devices[0].last_sent_at,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to enable notifications.");
  }
  if (!isNativePushConfigured()) {
    return apiError(
      503,
      "not_configured",
      "Native push transport is not configured on the server."
    );
  }
  const parsedBody = await readJsonBody<NativePushRegistrationBody>(request, {
    maxBytes: 4_000,
  });
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const token = parsedBody.data.token?.trim();
  const platform = normalizePlatform(parsedBody.data.platform);
  if (!token || !platform) {
    return apiError(400, "invalid_subscription", "A native push token and platform are required.");
  }

  try {
    const registration = await registerNativePushDevice(user.id, {
      token,
      platform,
      deviceName: parsedBody.data.deviceName ?? null,
      appVersion: parsedBody.data.appVersion ?? null,
      buildVersion: parsedBody.data.buildVersion ?? null,
      pushEnvironment: parsedBody.data.pushEnvironment ?? null,
    });
    return NextResponse.json(registration);
  } catch (error) {
    console.error("Native push device registration failed", {
      userId: user.id,
      platform,
      error: error instanceof Error ? error.message : String(error),
    });
    return apiError(500, "save_failed", "The device could not be saved for notifications.");
  }
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const parsedBody = await readJsonBody<Pick<NativePushRegistrationBody, "token">>(request, {
    maxBytes: 2_000,
    emptyBody: {},
  });
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const token = parsedBody.data.token?.trim() || undefined;
  const result = await unregisterNativePushDevice(user.id, token);
  return NextResponse.json(result);
}
