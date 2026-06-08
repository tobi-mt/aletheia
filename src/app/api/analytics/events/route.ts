import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deriveTrafficLabel, trackEvent } from "@/lib/analytics";
import { checkRateLimit, getClientIdentity, rateLimitHeaders } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";

const GEO_ENRICHMENT_ENABLED = process.env.ANALYTICS_GEO_ENRICHMENT_ENABLED === "true";

function readCoarseGeo(headerStore: Awaited<ReturnType<typeof headers>>) {
  const country =
    headerStore.get("x-vercel-ip-country") ??
    headerStore.get("cf-ipcountry") ??
    headerStore.get("x-country-code");

  const region =
    headerStore.get("x-vercel-ip-country-region") ??
    headerStore.get("x-region-code");

  const normalizedCountry = country?.trim().toUpperCase();
  const normalizedRegion = region?.trim().toUpperCase();

  return {
    country: normalizedCountry && /^[A-Z]{2}$/.test(normalizedCountry) ? normalizedCountry : null,
    region: normalizedRegion && /^[A-Z0-9-]{1,12}$/.test(normalizedRegion) ? normalizedRegion : null,
  };
}

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
  const userAgent = headerStore.get("user-agent");
  const traffic = deriveTrafficLabel({
    source: body.source,
    userAgent,
    host: headerStore.get("host"),
  });

  if (traffic.source === "automation") {
    return NextResponse.json({ ok: true, skipped: "automation" }, { headers: rateLimitHeaders(rateLimit) });
  }

  const coarseGeo = GEO_ENRICHMENT_ENABLED ? readCoarseGeo(headerStore) : { country: null, region: null };

  await trackEvent({
    userId: user?.id ?? null,
    anonId: body.anonId,
    sessionId: body.sessionId,
    eventName: body.eventName ?? "",
    path: body.path,
    referrer: body.referrer,
    source: body.source,
    metadata: {
      ...(body.metadata ?? {}),
      traffic_source: traffic.source,
      traffic_environment: traffic.environment,
      geo_country: coarseGeo.country,
      geo_region: coarseGeo.region,
    },
    userAgent,
  });

  return NextResponse.json({ ok: true }, { headers: rateLimitHeaders(rateLimit) });
}
