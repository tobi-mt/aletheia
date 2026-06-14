import { NextResponse } from "next/server";
import { clearSession, getCurrentUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { trackServerEvent } from "@/lib/analytics";
import { readJsonBody } from "@/lib/request";
import { apiError } from "@/lib/api-errors";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to delete your Aletheia account.");
  }

  const parsedBody = await readJsonBody<{ confirmation?: string }>(request, { maxBytes: 1_000, emptyBody: {} });
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;
  if (body.confirmation?.trim().toUpperCase() !== "DELETE") {
    await trackServerEvent({
      userId: user.id,
      eventName: "account_delete_requested",
      metadata: { confirmed: false },
    });
    return apiError(400, "confirm_delete", "Type DELETE to confirm account deletion.");
  }

  await trackServerEvent({
    userId: user.id,
    eventName: "account_delete_requested",
    metadata: { confirmed: true },
  });

  await run("DELETE FROM users WHERE id = ?", user.id);
  await clearSession().catch(() => undefined);

  await trackServerEvent({
    userId: null,
    eventName: "account_delete_completed",
    metadata: { completed: true },
  });

  return NextResponse.json({ ok: true });
}
