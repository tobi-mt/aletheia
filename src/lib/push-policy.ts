export function pushTtlSeconds(kind: unknown) {
  if (kind === "notification_test") return 5 * 60;
  if (typeof kind === "string" && (kind.startsWith("counsel_") || kind === "challenge_circle_nudge")) {
    return 48 * 60 * 60;
  }
  return 12 * 60 * 60;
}

export function isExpiredPush(expiresAt: unknown, now = Date.now()) {
  return typeof expiresAt === "string" && Date.parse(expiresAt) <= now;
}

export function isPermanentNativePushFailure(platform: "ios" | "android", status: number | null, body: string) {
  if (platform === "ios") {
    // BadDeviceToken can mean a sandbox/production mismatch, not token revocation.
    return status === 410 && /"reason"\s*:\s*"Unregistered"/.test(body);
  }
  // A generic 404 can mean the project or API is misconfigured.
  return status === 404 && /"errorCode"\s*:\s*"UNREGISTERED"/.test(body);
}
