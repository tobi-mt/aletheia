import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createNativeAuthHandoff, createSession, getOrCreateOAuthUser, recordUserLogin } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";

function oauthFailureRedirect(appUrl: string, reason: string) {
  const redirectUrl = new URL("/", appUrl);
  redirectUrl.searchParams.set("view", "account");
  redirectUrl.searchParams.set("auth", "oauth_failed");
  redirectUrl.searchParams.set("reason", reason);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || request.url;

  try {
    const session = await auth();
    const email = session?.user?.email?.trim().toLowerCase();

    if (!email) {
      await trackServerEvent({
        eventName: "auth_failure",
        path: "/api/auth/oauth/complete",
        metadata: {
          method: "google",
          flow: "oauth_complete",
          category: "provider_failure",
          reason: "missing_profile",
        },
      });
      return oauthFailureRedirect(appUrl, "missing_profile");
    }

    const { user, isNewUser } = await getOrCreateOAuthUser({
      email,
      name: session?.user?.name ?? null,
      avatarUrl: session?.user?.image ?? null,
      provider: "google",
    });
    if (!isNewUser) {
      await recordUserLogin(user.id);
    }
    const native = request.nextUrl.searchParams.get("native") === "1";
    if (!native) {
      await createSession(user.id);
    }
    await trackServerEvent({
      userId: user.id,
      eventName: "auth_google_success",
      metadata: { method: "google" },
    });

    if (native) {
      const code = await createNativeAuthHandoff(user.id, "google");
      const callback = new URL("com.aletheia.app://auth/callback");
      callback.searchParams.set("code", code);
      callback.searchParams.set("provider", "google");
      callback.searchParams.set("result", isNewUser ? "new" : "returning");
      return NextResponse.redirect(callback);
    }

    const requestedNext = request.nextUrl.searchParams.get("next") || "/";
    const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";
    const redirectUrl = new URL(next, appUrl);
    redirectUrl.searchParams.set("auth", isNewUser ? "google_new" : "google_returning");
    if (!redirectUrl.searchParams.has("challengeInvite") && !redirectUrl.searchParams.has("view")) {
      redirectUrl.searchParams.set("view", "account");
    }
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Google auth completion failed:", error);
    await trackServerEvent({
      eventName: "auth_failure",
      path: "/api/auth/oauth/complete",
      metadata: {
        method: "google",
        flow: "oauth_complete",
        category: "backend_fault",
        reason: "server_error",
      },
    });
    return oauthFailureRedirect(appUrl, "server_error");
  }
}
