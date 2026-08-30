import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { run } from "@/lib/db";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "sign_in_required", "Sign in to remove synced captures.");
  try {
    const { id } = await context.params;
    if (!id || id.length > 100) return apiError(400, "invalid_input", "Invalid capture.");
    await run("DELETE FROM wisdom_listen_captures WHERE id = ? AND user_id = ?", id, user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return apiError(500, "save_failed", "This listening capture could not be removed.");
  }
}
