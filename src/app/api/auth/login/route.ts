import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { one } from "@/lib/db";
import { checkRateLimit, getClientIdentity, rateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(await getClientIdentity(), {
    namespace: "auth-login",
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please wait a few minutes." },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await one<{
    id: string;
    email: string;
    name: string | null;
    password_hash: string;
  }>("SELECT id, email, name, password_hash FROM users WHERE email = ?", email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  }, { headers: rateLimitHeaders(rateLimit) });
}
