import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { apiError } from "@/lib/api-errors";
import { many, run } from "@/lib/db";
import { normalizeMode } from "@/lib/wisdom-data";

export async function GET() {
  try {
    const user = await requireUser();
    const entries = await many<{
      id: string;
      title: string;
      body: string;
      mode: string;
      created_at: string;
    }>(
      `SELECT id, title, body, mode, created_at
       FROM journal_entries
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      user.id
    );

    return NextResponse.json({
      entries: entries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        body: entry.body,
        mode: entry.mode,
        createdAt: entry.created_at,
      })),
    });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to use server journal sync.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      title?: string;
      body?: string;
      mode?: unknown;
    };

    const content = body.body?.trim();
    if (!content) {
      return apiError(400, "invalid_input", "Journal body is required.");
    }

    const mode = normalizeMode(body.mode);
    const entry = {
      id: crypto.randomUUID(),
      title: body.title?.trim() || `${mode} reflection`,
      body: content,
      mode,
      createdAt: new Date().toISOString(),
    };

    await run(
      `INSERT INTO journal_entries
       (id, user_id, title, body, mode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      entry.id,
      user.id,
      entry.title,
      entry.body,
      entry.mode,
      entry.createdAt,
      entry.createdAt
    );
    await trackServerEvent({
      userId: user.id,
      eventName: "journal_entry_created",
      metadata: { mode: entry.mode },
    });

    return NextResponse.json({
      entry: {
        id: entry.id,
        title: entry.title,
        body: entry.body,
        mode: entry.mode,
        createdAt: entry.createdAt,
      },
    });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to save reflections.");
  }
}
