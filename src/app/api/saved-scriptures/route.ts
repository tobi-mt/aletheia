import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { many, run } from "@/lib/db";
import { readJsonBody } from "@/lib/request";

type Row = { client_entry_id: string; book: string; chapter: number; verse: number; text: string; highlight: string | null; saved_at: string };
type Input = { id?: unknown; book?: unknown; chapter?: unknown; verse?: unknown; text?: unknown; highlight?: unknown; savedAt?: unknown };

const responseEntry = (row: Row) => ({ id: row.client_entry_id, book: row.book, chapter: row.chapter, verse: row.verse, text: row.text, highlight: row.highlight, savedAt: row.saved_at });

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await many<Row>(`SELECT client_entry_id, book, chapter, verse, text, highlight, saved_at FROM saved_scriptures WHERE user_id = ? ORDER BY saved_at DESC`, user.id);
    return NextResponse.json({ scriptures: rows.map(responseEntry) });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to load saved Scriptures.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = await readJsonBody<{ scripture?: Input; scriptures?: Input[] }>(request, { maxBytes: 1_000_000, emptyBody: {} });
    if (!parsed.ok) return parsed.response;
    const candidates = [...(parsed.data.scripture ? [parsed.data.scripture] : []), ...(Array.isArray(parsed.data.scriptures) ? parsed.data.scriptures : [])];
    const entries = candidates.flatMap((entry) => {
      const id = typeof entry.id === "string" ? entry.id.trim() : "";
      const book = typeof entry.book === "string" ? entry.book.trim() : "";
      const chapter = Number(entry.chapter);
      const verse = Number(entry.verse);
      const text = typeof entry.text === "string" ? entry.text.trim().slice(0, 4000) : "";
      if (!id || !book || !text || !Number.isInteger(chapter) || chapter < 1 || !Number.isInteger(verse) || verse < 1) return [];
      const savedAt = typeof entry.savedAt === "string" && Number.isFinite(Date.parse(entry.savedAt)) ? entry.savedAt : new Date().toISOString();
      const highlight = typeof entry.highlight === "string" ? entry.highlight.slice(0, 24) : null;
      return [{ id, book, chapter, verse, text, highlight, savedAt }];
    });
    if (!entries.length) return apiError(400, "invalid_input", "A valid Scripture is required.");
    for (const entry of entries) {
      await run(`INSERT INTO saved_scriptures (id, user_id, client_entry_id, book, chapter, verse, text, highlight, saved_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (user_id, book, chapter, verse) DO UPDATE SET client_entry_id = EXCLUDED.client_entry_id, text = EXCLUDED.text, highlight = EXCLUDED.highlight, saved_at = EXCLUDED.saved_at, updated_at = EXCLUDED.updated_at`, crypto.randomUUID(), user.id, entry.id, entry.book, entry.chapter, entry.verse, entry.text, entry.highlight, entry.savedAt, new Date().toISOString());
    }
    const rows = await many<Row>(`SELECT client_entry_id, book, chapter, verse, text, highlight, saved_at FROM saved_scriptures WHERE user_id = ? ORDER BY saved_at DESC`, user.id);
    return NextResponse.json({ scriptures: rows.map(responseEntry) });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to save Scriptures.");
  }
}
