import { NextResponse } from "next/server";
import { createSession, recordUserLogin, verifyPassword } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { apiError } from "@/lib/api-errors";
import { one } from "@/lib/db";
import { normalizePreferences, type LanguageCode } from "@/lib/localization";
import { checkRateLimit, getClientIdentity, rateLimitHeaders } from "@/lib/rate-limit";
import { loadTranslationsSync, getTranslation } from "@/lib/translations";

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(await getClientIdentity(), {
      namespace: "auth-login",
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      await trackServerEvent({
        eventName: "auth_failure",
        path: "/api/auth/login",
        metadata: {
          method: "email",
          flow: "login",
          category: "rate_limit",
          reason: "too_many_attempts",
        },
      });
      return apiError(429, "rate_limited", "Too many sign-in attempts. Please wait a few minutes.", {
        headers: rateLimitHeaders(rateLimit),
      });
    }

    const body = (await request.json()) as {
      email?: string;
      password?: string;
      language?: LanguageCode;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const language = normalizePreferences({ language: body.language }).language;

    if (!email || !password) {
      await trackServerEvent({
        eventName: "auth_failure",
        path: "/api/auth/login",
        metadata: {
          method: "email",
          flow: "login",
          category: "validation",
          reason: "missing_credentials",
        },
      });
      return apiError(400, "invalid_input", "Email and password are required.");
    }

    const user = await one<{
      id: string;
      email: string;
      name: string | null;
      avatar_url: string | null;
      password_hash: string;
      login_count: number;
    }>("SELECT id, email, name, avatar_url, password_hash, login_count FROM users WHERE email = ?", email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      await trackServerEvent({
        eventName: "auth_failure",
        path: "/api/auth/login",
        metadata: {
          method: "email",
          flow: "login",
          category: "bad_credentials",
          reason: "invalid_credentials",
        },
      });
      return apiError(401, "invalid_credentials", "Invalid email or password.");
    }

    await recordUserLogin(user.id);
    await createSession(user.id);
    await trackServerEvent({
      userId: user.id,
      eventName: "auth_email_login_success",
      metadata: { method: "email" },
    });

    const translations = loadTranslationsSync(language);
    const firstName = user.name?.split(" ")[0] || user.email.split("@")[0];

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        loginCount: (user.login_count ?? 0) + 1,
      },
      isNewUser: false,
      welcomeMessage: String(getTranslation(translations, "auth.welcomeBackMemoryReady", "Welcome back, {name}. Your Aletheia memory is ready."))
        .replace("{name}", firstName),
    }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error("Email sign-in failed:", error);
    await trackServerEvent({
      eventName: "auth_failure",
      path: "/api/auth/login",
      metadata: {
        method: "email",
        flow: "login",
        category: "backend_fault",
        reason: "server_error",
      },
    });
    return apiError(500, "authentication_failed", "Sign-in is temporarily unavailable. Please try again in a moment.");
  }
}
