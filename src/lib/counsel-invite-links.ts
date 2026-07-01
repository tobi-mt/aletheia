const APP_SCHEME = "com.aletheia.app";

export function counselInviteUrl(token: string, requestUrl?: string) {
  const configuredBase = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL;
  const requestOrigin = requestUrl ? new URL(requestUrl).origin : null;
  const requestBase = requestOrigin && requestOrigin !== "null" ? requestOrigin : null;
  const base = (configuredBase || requestBase || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/?counselInvite=${encodeURIComponent(token)}`;
}

export function counselInviteAppUrl(token: string) {
  return `${APP_SCHEME}://invite?counselInvite=${encodeURIComponent(token)}`;
}
