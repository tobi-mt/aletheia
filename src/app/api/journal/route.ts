import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { apiError } from "@/lib/api-errors";
import { many, run } from "@/lib/db";
import { normalizeMode } from "@/lib/wisdom-data";

type JournalMessage = {
  id: string;
  role: "prompt" | "counsel" | "reflection";
  body: string;
  createdAt: string;
};

function normalizeMessages(value: unknown): JournalMessage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<JournalMessage>;
    const body = typeof candidate.body === "string" ? candidate.body.trim() : "";
    const role = candidate.role;
    if (!body || !role || !["prompt", "counsel", "reflection"].includes(role)) return [];
    return [{
      id: typeof candidate.id === "string" && candidate.id ? candidate.id : crypto.randomUUID(),
      role,
      body,
      createdAt: typeof candidate.createdAt === "string" && !Number.isNaN(Date.parse(candidate.createdAt))
        ? candidate.createdAt
        : new Date().toISOString(),
    }];
  }).slice(0, 100);
}

export async function GET() {
  try {
    const user = await requireUser();
    const entries = await many<{
      id: string;
      title: string;
      body: string;
      messages: unknown;
      mode: string;
      created_at: string;
    }>(
      `SELECT id, title, body, messages, mode, created_at
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
        messages: normalizeMessages(entry.messages),
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
      messages?: unknown;
    };

    const content = body.body?.trim();
    if (!content) {
      return apiError(400, "invalid_input", "Journal body is required.");
    }

    const mode = normalizeMode(body.mode);
    const createdAt = new Date().toISOString();
    const messages = normalizeMessages(body.messages);
    const entry = {
      id: crypto.randomUUID(),
      title: body.title?.trim() || `${mode} reflection`,
      body: content,
      mode,
      messages: messages.length ? messages : [{ id: crypto.randomUUID(), role: "reflection" as const, body: content, createdAt }],
      createdAt,
    };

    await run(
      `INSERT INTO journal_entries
       (id, user_id, title, body, messages, mode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?::jsonb, ?, ?, ?)`,
      entry.id,
      user.id,
      entry.title,
      entry.body,
      JSON.stringify(entry.messages),
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
        messages: entry.messages,
        mode: entry.mode,
        createdAt: entry.createdAt,
      },
    });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to save reflections.");
  }
}
