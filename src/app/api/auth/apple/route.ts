import { NextRequest, NextResponse } from "next/server";
import { verifyAppleIdentityToken } from "@/lib/apple-identity";
import { createSession, getOrCreateOAuthUser, recordUserLogin } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { exchangeAppleAuthorizationCode, saveAppleCredential } from "@/lib/apple-oauth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { identityToken?: unknown; authorizationCode?: unknown; nonce?: unknown; name?: unknown };
    if (typeof body.identityToken !== "string" || typeof body.authorizationCode !== "string" || typeof body.nonce !== "string") {
      return NextResponse.json({ error: "Apple credential is incomplete." }, { status: 400 });
    }
    const identity = await verifyAppleIdentityToken(body.identityToken, body.nonce);
    const refreshToken = await exchangeAppleAuthorizationCode(body.authorizationCode);
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) || null : null;
    const { user, isNewUser } = await getOrCreateOAuthUser({ email: identity.email, name, provider: "apple" });
    if (!isNewUser) await recordUserLogin(user.id);
    await saveAppleCredential(user.id, identity.subject, refreshToken);
    await createSession(user.id);
    await trackServerEvent({ userId: user.id, eventName: "auth_apple_success", metadata: { method: "apple" } });
    return NextResponse.json({ user, isNewUser });
  } catch (error) {
    console.error("Apple sign-in failed:", error);
    await trackServerEvent({ eventName: "auth_failure", path: "/api/auth/apple", metadata: { method: "apple", reason: "invalid_credential" } });
    return NextResponse.json({ error: "Apple sign-in could not be verified." }, { status: 401 });
  }
}
