import { cookies } from "next/headers";
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { one, run } from "@/lib/db";

const SESSION_DAYS = 30;
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "aletheia_session";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 210_000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  if (stored.startsWith("oauth:")) {
    return false;
  }

  const [salt, hash] = stored.split(":");
  if (!salt || !hash) {
    return false;
  }

  const candidate = pbkdf2Sync(password, salt, 210_000, 32, "sha256");
  const expected = Buffer.from(hash, "hex");
  return expected.length === candidate.length && timingSafeEqual(candidate, expected);
}

export async function getOrCreateOAuthUser({
  email,
  name,
  provider,
}: {
  email: string;
  name: string | null;
  provider: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await one<{
    id: string;
    email: string;
    name: string | null;
  }>("SELECT id, email, name FROM users WHERE email = ?", normalizedEmail);

  if (existing) {
    if (!existing.name && name) {
      await run("UPDATE users SET name = ? WHERE id = ?", name, existing.id);
      return { ...existing, name };
    }
    return existing;
  }

  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name,
  };

  await run(
    "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
    user.id,
    user.email,
    user.name,
    `oauth:${provider}`,
    new Date().toISOString()
  );

  return user;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await run(
    "INSERT INTO sessions (id, token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    crypto.randomUUID(),
    hashToken(token),
    userId,
    expiresAt.toISOString(),
    new Date().toISOString()
  );

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await run("DELETE FROM sessions WHERE token_hash = ?", hashToken(token));
  }

  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const session = await one<{
    id: string;
    user_id: string;
    expires_at: string;
    email: string;
    name: string | null;
  }>(
    `SELECT sessions.id, sessions.user_id, sessions.expires_at, users.email, users.name
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ?`,
    hashToken(token)
  );

  if (!session || new Date(session.expires_at) < new Date()) {
    if (session) {
      await run("DELETE FROM sessions WHERE id = ?", session.id);
    }
    return null;
  }

  return {
    id: session.user_id,
    email: session.email,
    name: session.name,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
