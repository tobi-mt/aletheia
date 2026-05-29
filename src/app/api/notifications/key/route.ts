import { NextResponse } from "next/server";
import { getVapidKeyPairStatus, getVapidPublicKey, isPushConfigured } from "@/lib/notifications";

export async function GET() {
  const status = getVapidKeyPairStatus();
  return NextResponse.json({
    publicKey: getVapidPublicKey(),
    configured: isPushConfigured(),
    keyPairValid: status.keyPairValid,
    reason: status.reason,
  });
}
