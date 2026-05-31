import { cookies } from "next/headers";
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { normalizeAvatarUrl } from "@/lib/avatars";
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
  avatarUrl,
  provider,
}: {
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  provider: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedAvatarUrl = normalizeAvatarUrl(avatarUrl ?? null);
  const existing = await one<{
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
  }>("SELECT id, email, name, avatar_url FROM users WHERE email = ?", normalizedEmail);

  if (existing) {
    const shouldUpdateName = !existing.name && name;
    const shouldUpdateAvatar = !existing.avatar_url && normalizedAvatarUrl;

    if (shouldUpdateName || shouldUpdateAvatar) {
      await run(
        "UPDATE users SET name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url) WHERE id = ?",
        shouldUpdateName ? name : null,
        shouldUpdateAvatar ? normalizedAvatarUrl : null,
        existing.id
      );

      return {
        user: {
          id: existing.id,
          email: existing.email,
          name: shouldUpdateName ? name : existing.name,
          avatarUrl: shouldUpdateAvatar ? normalizedAvatarUrl : existing.avatar_url,
        },
        isNewUser: false,
      };
    }
    return {
      user: {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        avatarUrl: existing.avatar_url,
      },
      isNewUser: false,
    };
  }

  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name,
    avatarUrl: normalizedAvatarUrl,
  };

  await run(
    "INSERT INTO users (id, email, name, avatar_url, password_hash, last_seen_at, login_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    user.id,
    user.email,
    user.name,
    user.avatarUrl,
    `oauth:${provider}`,
    new Date().toISOString(),
    1,
    new Date().toISOString()
  );

  return { user, isNewUser: true };
}

export async function recordUserLogin(userId: string) {
  await run(
    "UPDATE users SET last_seen_at = ?, login_count = COALESCE(login_count, 0) + 1 WHERE id = ?",
    new Date().toISOString(),
    userId
  );
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
    avatar_url: string | null;
    login_count: number;
    last_seen_at: string | null;
    created_at: string;
  }>(
    `SELECT sessions.id, sessions.user_id, sessions.expires_at, users.email, users.name,
            users.avatar_url, users.login_count, users.last_seen_at, users.created_at
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
    avatarUrl: session.avatar_url,
    loginCount: session.login_count ?? 0,
    lastSeenAt: session.last_seen_at,
    createdAt: session.created_at,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
