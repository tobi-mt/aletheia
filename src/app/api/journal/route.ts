import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { many, run } from "@/lib/db";
import type { Mode } from "@/lib/wisdom-data";

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
    return NextResponse.json({ error: "Sign in to use server journal sync." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      title?: string;
      body?: string;
      mode?: Mode;
    };

    const content = body.body?.trim();
    if (!content) {
      return NextResponse.json({ error: "Journal body is required." }, { status: 400 });
    }

    const entry = {
      id: crypto.randomUUID(),
      title: body.title?.trim() || `${body.mode ?? "Money"} reflection`,
      body: content,
      mode: body.mode ?? "Money",
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
    return NextResponse.json({ error: "Sign in to save reflections." }, { status: 401 });
  }
}
