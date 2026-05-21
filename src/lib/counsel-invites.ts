import { createHash, randomBytes } from "node:crypto";

export function createCounselInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function hashCounselInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function counselInviteUrl(token: string, requestUrl?: string) {
  const configuredBase = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL;
  const requestBase = requestUrl ? new URL(requestUrl).origin : null;
  const base = (configuredBase || requestBase || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/?counselInvite=${encodeURIComponent(token)}`;
}
