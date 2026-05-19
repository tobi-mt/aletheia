import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSession, getOrCreateOAuthUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || request.url;

  if (!email) {
    return NextResponse.redirect(new URL("/?auth=oauth_failed", appUrl));
  }

  const user = await getOrCreateOAuthUser({
    email,
    name: session?.user?.name ?? null,
    provider: "google",
  });
  await createSession(user.id);
  await trackServerEvent({
    userId: user.id,
    eventName: "auth_google_success",
    metadata: { method: "google" },
  });

  const requestedNext = request.nextUrl.searchParams.get("next") || "/";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";
  return NextResponse.redirect(new URL(next, appUrl));
}
