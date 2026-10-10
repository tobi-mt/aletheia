import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { one, run } from "@/lib/db";
import { apiError } from "@/lib/api-errors";

type JournalMessage = {
  id: string;
  role: "prompt" | "counsel" | "reflection";
  body: string;
  createdAt: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const payload = (await request.json()) as { body?: string };
    const body = payload.body?.trim();
    if (!body) {
      return apiError(400, "invalid_input", "Reflection text is required.");
    }

    const existing = await one<{ messages: unknown; body: string }>(
      "SELECT messages, body FROM journal_entries WHERE id = ? AND user_id = ?",
      id,
      user.id
    );
    if (!existing) {
      return apiError(404, "not_found", "Reflection not found.");
    }

    const messages = Array.isArray(existing.messages)
      ? existing.messages.filter((message): message is JournalMessage => Boolean(
          message && typeof message === "object" && typeof (message as JournalMessage).body === "string"
        ))
      : [];
    const createdAt = new Date().toISOString();
    const message: JournalMessage = { id: crypto.randomUUID(), role: "reflection", body, createdAt };
    const nextMessages = [...messages, message].slice(-100);
    const nextBody = `${existing.body.trim()}\n\n${body}`.trim();

    await run(
      "UPDATE journal_entries SET body = ?, messages = ?::jsonb, updated_at = ? WHERE id = ? AND user_id = ?",
      nextBody,
      JSON.stringify(nextMessages),
      createdAt,
      id,
      user.id
    );

    return NextResponse.json({ message, body: nextBody });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to add to reflections.");
  }
}

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
