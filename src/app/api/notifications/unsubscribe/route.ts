import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { readJsonBody } from "@/lib/request";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsedBody = await readJsonBody<{
      endpoint?: string;
    }>(request, { maxBytes: 4_000, emptyBody: {} });
    if (!parsedBody.ok) {
      return parsedBody.response;
    }
    const body = parsedBody.data;

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
