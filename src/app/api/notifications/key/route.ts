import { NextResponse } from "next/server";
import { getVapidPublicKey, isPushConfigured } from "@/lib/notifications";

export async function GET() {
  return NextResponse.json({
    publicKey: getVapidPublicKey(),
    configured: isPushConfigured(),
  });
}
