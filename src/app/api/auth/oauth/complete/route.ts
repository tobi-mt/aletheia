import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSession, getOrCreateOAuthUser, recordUserLogin } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || request.url;

  if (!email) {
    return NextResponse.redirect(new URL("/?auth=oauth_failed", appUrl));
  }

  const { user, isNewUser } = await getOrCreateOAuthUser({
    email,
    name: session?.user?.name ?? null,
    provider: "google",
  });
  if (!isNewUser) {
    await recordUserLogin(user.id);
  }
  await createSession(user.id);
  await trackServerEvent({
    userId: user.id,
    eventName: "auth_google_success",
    metadata: { method: "google" },
  });

  const requestedNext = request.nextUrl.searchParams.get("next") || "/";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";
  const redirectUrl = new URL(next, appUrl);
  redirectUrl.searchParams.set("auth", isNewUser ? "google_new" : "google_returning");
  redirectUrl.searchParams.set("view", "account");
  return NextResponse.redirect(redirectUrl);
}
