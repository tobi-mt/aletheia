import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { modeFitCalibrationSummary } from "@/lib/analytics";

export async function GET(request: Request) {
  const secret = process.env.ANALYTICS_ADMIN_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || token !== secret) return apiError(401, "permission_denied", "Unauthorized");

  const requestedHours = Number(new URL(request.url).searchParams.get("hours") ?? String(24 * 14));
  const hours = Number.isFinite(requestedHours) ? requestedHours : 24 * 14;
  return NextResponse.json(await modeFitCalibrationSummary(hours), {
    headers: { "Cache-Control": "no-store" },
  });
}
