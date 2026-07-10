import { NextRequest, NextResponse } from "next/server";
import { consumeNativeAuthHandoff, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ error: "Invalid authentication handoff." }, { status: 400 });
  }

  const handoff = await consumeNativeAuthHandoff(code);
  if (!handoff) {
    return NextResponse.json({ error: "Authentication handoff expired or was already used." }, { status: 401 });
  }

  await createSession(handoff.user_id);
  return NextResponse.json({ ok: true, provider: handoff.provider });
}
