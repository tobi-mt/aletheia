import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { one, run } from "@/lib/db";
import { checkRateLimit, getClientIdentity, rateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(await getClientIdentity(), {
    namespace: "auth-register",
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many account creation attempts. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  const body = (await request.json()) as {
    email?: string;
    name?: string;
    password?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !email.includes("@") || password.length < 8) {
    return NextResponse.json(
      { error: "Use a valid email and a password of at least 8 characters." },
      { status: 400 }
    );
  }

  const existing = await one("SELECT id FROM users WHERE email = ?", email);
  if (existing) {
    return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
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

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      loginCount: 1,
    },
    isNewUser: true,
    welcomeMessage: "Welcome to Aletheia. Your account is ready and sync is active.",
  }, { headers: rateLimitHeaders(rateLimit) });
}
