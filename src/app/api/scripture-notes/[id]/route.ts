import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { run } from "@/lib/db";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "sign_in_required", "Sign in to manage Scripture notes.");
  const { id } = await context.params;
  await run(`DELETE FROM scripture_notes WHERE user_id = ? AND client_entry_id = ?`, user.id, id);
  return NextResponse.json({ ok: true });
}
