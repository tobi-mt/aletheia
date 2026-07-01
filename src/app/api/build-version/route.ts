import { NextResponse } from "next/server";
import { BUILD_ID } from "@/lib/build-version";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { buildId: BUILD_ID },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
