import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { trackServerEvent } from "@/lib/analytics";
import { one, run } from "@/lib/db";
import { emailConfigured, isEmailAddress, sendEmail } from "@/lib/email";
import { checkRateLimit, getClientIdentity, rateLimitHeaders } from "@/lib/rate-limit";

const REQUESTED_MESSAGE = "If that email has a password account, we sent a reset link.";

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(await getClientIdentity(), {
    namespace: "auth-password-reset-request",
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ message: REQUESTED_MESSAGE }, { headers: rateLimitHeaders(rateLimit) });
  }

  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    if (!isEmailAddress(email)) {
      return NextResponse.json({ message: REQUESTED_MESSAGE }, { headers: rateLimitHeaders(rateLimit) });
    }

    const user = await one<{ id: string; email: string; password_hash: string }>(
      "SELECT id, email, password_hash FROM users WHERE email = ?",
      email
    );
    if (!user || user.password_hash.startsWith("oauth:")) {
      return NextResponse.json({ message: REQUESTED_MESSAGE }, { headers: rateLimitHeaders(rateLimit) });
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    await run("DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at <= ?", user.id, now.toISOString());
    await run(
      "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
      tokenHash,
      user.id,
      expiresAt.toISOString(),
      now.toISOString()
    );

    const configuredBase = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || new URL(request.url).origin;
    const resetUrl = `${configuredBase.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
    const emailResult = await sendEmail({
      to: user.email,
      subject: "Reset your Aletheia password",
      text: `Someone requested a password reset for your Aletheia account.\n\nReset your password within one hour:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    });
    if (!emailResult.sent) {
      console.error("Password reset email was not sent:", emailResult.error || "email unavailable");
      await run("DELETE FROM password_reset_tokens WHERE token_hash = ?", tokenHash);
    }
    await trackServerEvent({ userId: user.id, eventName: "auth_password_reset_requested", metadata: { emailConfigured: emailConfigured() } });
  } catch (error) {
    console.error("Password reset request failed:", error);
  }

  return NextResponse.json({ message: REQUESTED_MESSAGE }, { headers: rateLimitHeaders(rateLimit) });
}
