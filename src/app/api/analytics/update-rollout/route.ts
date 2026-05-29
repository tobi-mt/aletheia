import { NextResponse } from "next/server";
import { updateRolloutSummary } from "@/lib/analytics";

export async function GET(request: Request) {
  const secret = process.env.ANALYTICS_ADMIN_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedHours = Number(searchParams.get("hours") ?? "24");
  const hours = Number.isFinite(requestedHours) ? requestedHours : 24;

  return NextResponse.json(await updateRolloutSummary(hours));
}
