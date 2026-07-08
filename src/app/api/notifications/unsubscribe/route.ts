import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { readJsonBody } from "@/lib/request";
import { apiError } from "@/lib/api-errors";

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

    await run(
      "DELETE FROM native_push_devices WHERE user_id = ?",
      user.id
    );

    return NextResponse.json({ ok: true });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to manage notifications.");
  }
}
