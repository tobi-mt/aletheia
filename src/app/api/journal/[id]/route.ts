import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { apiError } from "@/lib/api-errors";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    await run("DELETE FROM journal_entries WHERE id = ? AND user_id = ?", id, user.id);

    return NextResponse.json({ ok: true });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to manage reflections.");
  }
}
