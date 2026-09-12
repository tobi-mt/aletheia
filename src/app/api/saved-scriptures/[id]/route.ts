import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { run } from "@/lib/db";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await run(`DELETE FROM saved_scriptures WHERE user_id = ? AND client_entry_id = ?`, user.id, id);
    return NextResponse.json({ ok: true });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to manage saved Scriptures.");
  }
}
