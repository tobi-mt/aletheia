import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { one, run } from "@/lib/db";
import { apiError } from "@/lib/api-errors";
import { checkRateLimit, getClientIdentity, rateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(await getClientIdentity(), {
    namespace: "auth-password-reset",
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return apiError(429, "rate_limited", "Too many attempts. Please request a new reset link later.", { headers: rateLimitHeaders(rateLimit) });
  }

  try {
    const body = (await request.json()) as { token?: string; password?: string };
    const token = body.token?.trim() ?? "";
    const password = body.password ?? "";
    if (!token || password.length < 8) {
      return apiError(400, "invalid_input", "Choose a password of at least 8 characters.", { headers: rateLimitHeaders(rateLimit) });
    }
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const reset = await one<{ user_id: string }>(
      "DELETE FROM password_reset_tokens WHERE token_hash = ? AND expires_at > ? RETURNING user_id",
      tokenHash,
      new Date().toISOString()
    );
    if (!reset) {
      return apiError(400, "invalid_reset_token", "This reset link is invalid or has expired. Request a new one.", { headers: rateLimitHeaders(rateLimit) });
    }
    await run("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", hashPassword(password), new Date().toISOString(), reset.user_id);
    await run("DELETE FROM sessions WHERE user_id = ?", reset.user_id);
    await run("DELETE FROM password_reset_tokens WHERE user_id = ?", reset.user_id);
    await trackServerEvent({ userId: reset.user_id, eventName: "auth_password_reset_completed", metadata: {} });
    return NextResponse.json({ message: "Your password has been reset. You can now sign in." }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error("Password reset failed:", error);
    return apiError(500, "password_reset_failed", "Password reset is temporarily unavailable. Please try again.", { headers: rateLimitHeaders(rateLimit) });
  }
}
