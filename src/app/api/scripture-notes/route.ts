import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { many, run } from "@/lib/db";
import { readJsonBody } from "@/lib/request";
import { MAX_SCRIPTURE_NOTE_LENGTH, type ScriptureNote } from "@/lib/saved-scripture";

type Row = { client_entry_id: string; book: string; chapter: number; verse: number; end_verse: number; passage: string; note: string; updated_at: string | Date };
type Input = Partial<Record<keyof ScriptureNote, unknown>>;

const MAX_NOTES_PER_REQUEST = 500;

const responseNote = (row: Row): ScriptureNote => ({
  id: row.client_entry_id,
  book: row.book,
  chapter: row.chapter,
  verse: row.verse,
  endVerse: row.end_verse,
  passage: row.passage,
  note: row.note,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
});

const notesDeps = { getCurrentUser, many, run };

async function listNotes(userId: string, deps: typeof notesDeps) {
  const rows = await deps.many<Row>(
    `SELECT client_entry_id, book, chapter, verse, end_verse, passage, note, updated_at FROM scripture_notes WHERE user_id = ? ORDER BY updated_at DESC`,
    userId
  );
  return rows.map(responseNote);
}

export function normalizeScriptureNoteInput(entry: Input): ScriptureNote | null {
  const id = typeof entry.id === "string" ? entry.id.trim().slice(0, 120) : "";
  const book = typeof entry.book === "string" ? entry.book.trim().slice(0, 60) : "";
  const chapter = Number(entry.chapter);
  const verse = Number(entry.verse);
  const endVerse = entry.endVerse === undefined ? verse : Number(entry.endVerse);
  const note = typeof entry.note === "string" ? entry.note.trim().slice(0, MAX_SCRIPTURE_NOTE_LENGTH) : "";
  const passage = typeof entry.passage === "string" ? entry.passage.trim().slice(0, 8000) : "";
  if (!id || !book || !note) return null;
  if (!Number.isInteger(chapter) || chapter < 1 || !Number.isInteger(verse) || verse < 1) return null;
  if (!Number.isInteger(endVerse) || endVerse < verse || endVerse - verse > 200) return null;
  const parsedTime = typeof entry.updatedAt === "string" ? Date.parse(entry.updatedAt) : Number.NaN;
  // Never accept edit times from the future; they would block every later change.
  const updatedAt = new Date(Number.isFinite(parsedTime) ? Math.min(parsedTime, Date.now()) : Date.now()).toISOString();
  return { id, book, chapter, verse, endVerse, passage, note, updatedAt };
}

export async function getScriptureNotes(deps = notesDeps) {
  const user = await deps.getCurrentUser();
  if (!user) return apiError(401, "sign_in_required", "Sign in to load your Scripture notes.");
  return NextResponse.json({ notes: await listNotes(user.id, deps) });
}

export async function postScriptureNotes(request: Request, deps = notesDeps) {
  const user = await deps.getCurrentUser();
  if (!user) return apiError(401, "sign_in_required", "Sign in to save Scripture notes.");

  const parsed = await readJsonBody<{ note?: Input; notes?: Input[] }>(request, { maxBytes: 2_000_000, emptyBody: {} });
  if (!parsed.ok) return parsed.response;
  const candidates = [
    ...(parsed.data.note ? [parsed.data.note] : []),
    ...(Array.isArray(parsed.data.notes) ? parsed.data.notes.slice(0, MAX_NOTES_PER_REQUEST) : []),
  ];
  const entries = candidates.flatMap((candidate) => {
    const normalized = candidate && typeof candidate === "object" ? normalizeScriptureNoteInput(candidate) : null;
    return normalized ? [normalized] : [];
  });
  if (!entries.length) return apiError(400, "invalid_input", "A note with a valid Scripture reference is required.");

  const now = new Date().toISOString();
  for (const entry of entries) {
    // Older edits never overwrite a newer note that another device already synced.
    await deps.run(
      `INSERT INTO scripture_notes (id, user_id, client_entry_id, book, chapter, verse, end_verse, passage, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, book, chapter, verse) DO UPDATE SET
         client_entry_id = EXCLUDED.client_entry_id,
         end_verse = EXCLUDED.end_verse,
         passage = EXCLUDED.passage,
         note = EXCLUDED.note,
         updated_at = EXCLUDED.updated_at
       WHERE scripture_notes.updated_at <= EXCLUDED.updated_at`,
      crypto.randomUUID(), user.id, entry.id, entry.book, entry.chapter, entry.verse, entry.endVerse, entry.passage, entry.note, now, entry.updatedAt
    );
  }
  return NextResponse.json({ notes: await listNotes(user.id, deps) });
}

export async function GET() {
  return getScriptureNotes();
}

export async function POST(request: Request) {
  return postScriptureNotes(request);
}
