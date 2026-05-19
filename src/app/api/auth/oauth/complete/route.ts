import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSession, getOrCreateOAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.redirect(new URL("/?auth=oauth_failed", request.url));
  }

  const user = await getOrCreateOAuthUser({
    email,
    name: session?.user?.name ?? null,
    provider: "google",
  });
  await createSession(user.id);

  const requestedNext = request.nextUrl.searchParams.get("next") || "/";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || request.url;
  return NextResponse.redirect(new URL(next, appUrl));
}
