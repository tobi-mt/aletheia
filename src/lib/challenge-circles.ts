import { createHash, randomBytes } from "node:crypto";

const APP_SCHEME = "com.tobi.aletheia.app";

export function createChallengeInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function hashChallengeInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function challengeInviteUrl(token: string, requestUrl?: string) {
  const configuredBase = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL;
  const requestOrigin = requestUrl ? new URL(requestUrl).origin : null;
  const requestBase = requestOrigin && requestOrigin !== "null" ? requestOrigin : null;
  const base = (configuredBase || requestBase || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/?challengeInvite=${encodeURIComponent(token)}`;
}

export function challengeInviteAppUrl(token: string) {
  return `${APP_SCHEME}://invite?challengeInvite=${encodeURIComponent(token)}`;
}
