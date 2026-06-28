import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { apiError } from "@/lib/api-errors";
import { one, run } from "@/lib/db";
import { normalizePreferences, type LanguageCode } from "@/lib/localization";
import { checkRateLimit, getClientIdentity, rateLimitHeaders } from "@/lib/rate-limit";
import { loadTranslationsSync, getTranslation } from "@/lib/translations";

const BLOCKED_EMAIL_DOMAIN_PATTERNS = [
  /\.local$/i,
  /^example\.com$/i,
  /^test\.com$/i,
  /^mailinator\.com$/i,
  /tempmail/i,
  /yopmail/i,
  /guerrillamail/i,
  /fakeinbox/i,
];

function isBlockedEmailDomain(email: string) {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) {
    return true;
  }
  const domain = email.slice(atIndex + 1).toLowerCase();
  return BLOCKED_EMAIL_DOMAIN_PATTERNS.some((pattern) => pattern.test(domain));
}

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(await getClientIdentity(), {
      namespace: "auth-register",
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      await trackServerEvent({
        eventName: "auth_failure",
        path: "/api/auth/register",
        metadata: {
          method: "email",
          flow: "register",
          category: "rate_limit",
          reason: "too_many_attempts",
        },
      });
      return apiError(429, "rate_limited", "Too many account creation attempts. Please try again later.", {
        headers: rateLimitHeaders(rateLimit),
      });
    }

    const body = (await request.json()) as {
      email?: string;
      name?: string;
      password?: string;
      website?: string;
      language?: LanguageCode;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const honeypot = body.website?.trim();
    const language = normalizePreferences({ language: body.language }).language;

    if (honeypot) {
      await trackServerEvent({
        eventName: "auth_failure",
        path: "/api/auth/register",
        metadata: {
          method: "email",
          flow: "register",
          category: "automation",
          reason: "honeypot_triggered",
        },
      });
      return apiError(400, "invalid_input", "Account creation failed. Please try again.");
    }

    if (!email || !email.includes("@") || password.length < 8) {
      await trackServerEvent({
        eventName: "auth_failure",
        path: "/api/auth/register",
        metadata: {
          method: "email",
          flow: "register",
          category: "validation",
          reason: "invalid_input",
        },
      });
      return apiError(400, "invalid_input", "Use a valid email and a password of at least 8 characters.");
    }

    if (isBlockedEmailDomain(email)) {
      await trackServerEvent({
        eventName: "auth_failure",
        path: "/api/auth/register",
        metadata: {
          method: "email",
          flow: "register",
          category: "validation",
          reason: "blocked_email_domain",
        },
      });
      return apiError(400, "invalid_input", "Please use a real email address.");
    }

    const existing = await one("SELECT id FROM users WHERE email = ?", email);
    if (existing) {
      await trackServerEvent({
        eventName: "auth_failure",
        path: "/api/auth/register",
        metadata: {
          method: "email",
          flow: "register",
          category: "validation",
          reason: "account_exists",
        },
      });
      return apiError(409, "account_exists", "An account already exists for this email.");
    }

    const user = {
      id: crypto.randomUUID(),
      email,
      name: body.name?.trim() || null,
    };

    await run(
      "INSERT INTO users (id, email, name, password_hash, last_seen_at, login_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      user.id,
      user.email,
      user.name,
      hashPassword(password),
      new Date().toISOString(),
      1,
      new Date().toISOString()
    );

    await createSession(user.id);
    await trackServerEvent({
      userId: user.id,
      eventName: "auth_email_register_success",
      metadata: { method: "email" },
    });

    const translations = loadTranslationsSync(language);
    const firstName = user.name?.split(" ")[0] || user.email.split("@")[0];

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: null,
        loginCount: 1,
      },
      isNewUser: true,
      welcomeMessage: String(getTranslation(translations, "auth.welcomeToAletheiaReady", "Welcome to Aletheia, {name}. Your account is ready and sync is active."))
        .replace("{name}", firstName),
    }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error("Email registration failed:", error);
    await trackServerEvent({
      eventName: "auth_failure",
      path: "/api/auth/register",
      metadata: {
        method: "email",
        flow: "register",
        category: "backend_fault",
        reason: "server_error",
      },
    });
    return apiError(500, "authentication_failed", "Account creation is temporarily unavailable. Please try again in a moment.");
  }
}
