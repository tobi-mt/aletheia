export const BIOMETRIC_BACKGROUND_GRACE_MS = 30_000;

export function shouldLockAfterBackground(
  backgroundedAt: number | null,
  resumedAt: number,
  graceMs = BIOMETRIC_BACKGROUND_GRACE_MS
) {
  return backgroundedAt !== null && resumedAt - backgroundedAt >= graceMs;
}
