import { headers } from "next/headers";
import { one, run } from "@/lib/db";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  namespace: string;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
};

function hashIdentity(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function getClientIdentity() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const railwayIp = headerStore.get("x-real-ip")?.trim();
  return forwardedFor || railwayIp || "local";
}

export async function checkRateLimit(
  identity: string,
  { limit, windowMs, namespace }: RateLimitOptions
): Promise<RateLimitResult> {
  const now = new Date();
  const key = `${namespace}:${hashIdentity(identity)}`;
  const existing = await one<{
    count: number;
    reset_at: string;
  }>("SELECT count, reset_at FROM rate_limits WHERE key = ?", key);

  if (!existing || new Date(existing.reset_at) <= now) {
    const resetAt = new Date(now.getTime() + windowMs).toISOString();
    await run(
      `INSERT INTO rate_limits (key, count, reset_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (key)
       DO UPDATE SET count = EXCLUDED.count, reset_at = EXCLUDED.reset_at, updated_at = EXCLUDED.updated_at`,
      key,
      1,
      resetAt,
      now.toISOString()
    );
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetAt,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: existing.reset_at,
    };
  }

  const nextCount = existing.count + 1;
  await run(
    "UPDATE rate_limits SET count = ?, updated_at = ? WHERE key = ?",
    nextCount,
    now.toISOString(),
    key
  );

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - nextCount),
    resetAt: existing.reset_at,
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": result.resetAt,
  };
}
