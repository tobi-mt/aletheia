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

    await run(
      `DELETE FROM gratitude_entries
       WHERE user_id = ?
       AND (id = ? OR client_entry_id = ?)`,
      user.id,
      id,
      id
    );

    return NextResponse.json({ ok: true });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to manage gratitude entries.");
  }
}
