import { NextResponse } from "next/server";
import { analyticsSummary } from "@/lib/analytics";
import { apiError } from "@/lib/api-errors";

export async function GET(request: Request) {
  const secret = process.env.ANALYTICS_ADMIN_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const includeAutomation = ["1", "true", "yes"].includes(
    new URL(request.url).searchParams.get("includeAutomation")?.toLowerCase() ?? ""
  );
  const geoEnrichmentEnabled = process.env.ANALYTICS_GEO_ENRICHMENT_ENABLED === "true";

  if (!secret || token !== secret) {
    return apiError(401, "permission_denied", "Unauthorized");
  }

  const summary = await analyticsSummary({ includeAutomation });
  return NextResponse.json({
    ...summary,
    config: {
      geo_enrichment_enabled: geoEnrichmentEnabled,
    },
  });
}
