import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { run } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json().catch(() => ({}))) as {
      endpoint?: string;
    };

    if (body.endpoint) {
      await run(
        "UPDATE push_subscriptions SET enabled = FALSE, updated_at = ? WHERE user_id = ? AND endpoint = ?",
        new Date().toISOString(),
        user.id,
        body.endpoint
      );
    } else {
      await run(
        "UPDATE push_subscriptions SET enabled = FALSE, updated_at = ? WHERE user_id = ?",
        new Date().toISOString(),
        user.id
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sign in to manage notifications." }, { status: 401 });
  }
}
