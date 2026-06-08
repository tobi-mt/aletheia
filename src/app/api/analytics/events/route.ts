import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { checkRateLimit, getClientIdentity, rateLimitHeaders } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";

export async function POST(request: Request) {
  const identity = await getClientIdentity();
  const rateLimit = await checkRateLimit(identity, {
    namespace: "analytics-events",
    limit: 120,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false }, { status: 429, headers: rateLimitHeaders(rateLimit) });
  }

  const user = await getCurrentUser();
  const parsedBody = await readJsonBody<{
    eventName?: string;
    anonId?: string;
    sessionId?: string;
    path?: string;
    referrer?: string;
    source?: string;
    metadata?: Record<string, string | number | boolean | null>;
  }>(request, { maxBytes: 6_000, emptyBody: {} });
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;

  const headerStore = await headers();
  await trackEvent({
    userId: user?.id ?? null,
    anonId: body.anonId,
    sessionId: body.sessionId,
    eventName: body.eventName ?? "",
    path: body.path,
    referrer: body.referrer,
    source: body.source,
    metadata: body.metadata,
    userAgent: headerStore.get("user-agent"),
  });

  return NextResponse.json({ ok: true }, { headers: rateLimitHeaders(rateLimit) });
}
