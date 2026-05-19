import { NextResponse } from "next/server";
import { analyticsSummary } from "@/lib/analytics";

export async function GET(request: Request) {
  const secret = process.env.ANALYTICS_ADMIN_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await analyticsSummary());
}
