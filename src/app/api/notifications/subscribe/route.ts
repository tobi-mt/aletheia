import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { isPushConfigured } from "@/lib/notifications";

export async function POST(request: Request) {
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Notifications are not configured yet." }, { status: 503 });
  }

  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      subscription?: {
        endpoint?: string;
        keys?: {
          p256dh?: string;
          auth?: string;
        };
      };
      preferredHour?: number;
    };

    const endpoint = body.subscription?.endpoint;
    const p256dh = body.subscription?.keys?.p256dh;
    const auth = body.subscription?.keys?.auth;
    const preferredHour = Number.isInteger(body.preferredHour)
      ? Math.min(23, Math.max(0, body.preferredHour ?? 8))
      : 8;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
    }

    const headerStore = await headers();
    const userAgent = headerStore.get("user-agent");
    const now = new Date().toISOString();

    await run(
      `INSERT INTO push_subscriptions (
        id, user_id, endpoint, p256dh, auth, user_agent, enabled, preferred_hour, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?)
      ON CONFLICT (endpoint)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        enabled = TRUE,
        preferred_hour = EXCLUDED.preferred_hour,
        updated_at = EXCLUDED.updated_at`,
      crypto.randomUUID(),
      user.id,
      endpoint,
      p256dh,
      auth,
      userAgent,
      preferredHour,
      now,
      now
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sign in to enable notifications." }, { status: 401 });
  }
}
