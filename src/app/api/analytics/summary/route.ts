import { NextResponse } from "next/server";
import { analyticsSummary } from "@/lib/analytics";
import { apiError } from "@/lib/api-errors";

export type AnalyticsSummaryRouteDeps = {
  analyticsSummary: typeof analyticsSummary;
};

export const analyticsSummaryRouteDeps: AnalyticsSummaryRouteDeps = {
  analyticsSummary,
};

export async function getAnalyticsSummaryRoute(
  request: Request,
  deps: AnalyticsSummaryRouteDeps = analyticsSummaryRouteDeps
) {
  const secret = process.env.ANALYTICS_ADMIN_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = new URL(request.url);
  const includeAutomation = ["1", "true", "yes"].includes(
    url.searchParams.get("includeAutomation")?.toLowerCase() ?? ""
  );
  const startDate = url.searchParams.get("startDate") ?? undefined;
  const endDate = url.searchParams.get("endDate") ?? undefined;
  const geoEnrichmentEnabled = process.env.ANALYTICS_GEO_ENRICHMENT_ENABLED === "true";

  if (!secret || token !== secret) {
    return apiError(401, "permission_denied", "Unauthorized");
  }

  const summary = await deps.analyticsSummary({ includeAutomation, startDate, endDate });
  return NextResponse.json({
    ...summary,
    generatedAt: new Date().toISOString(),
    config: {
      geo_enrichment_enabled: geoEnrichmentEnabled,
    },
  });
}

export async function GET(request: Request) {
  return getAnalyticsSummaryRoute(request);
}
