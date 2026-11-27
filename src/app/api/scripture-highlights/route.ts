import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { many, run } from "@/lib/db";
import { readJsonBody } from "@/lib/request";
import { isScriptureHighlightColor, type ScriptureHighlightEntry } from "@/lib/saved-scripture";

type Row = { book: string; chapter: number; verse: number; color: string | null; updated_at: string | Date };
type Input = Partial<Record<keyof ScriptureHighlightEntry, unknown>>;

const MAX_HIGHLIGHTS_PER_REQUEST = 2000;
const UPSERT_CHUNK_SIZE = 250;

const highlightsDeps = { getCurrentUser, many, run };

const responseEntry = (row: Row): ScriptureHighlightEntry => ({
  book: row.book,
  chapter: row.chapter,
  verse: row.verse,
  color: isScriptureHighlightColor(row.color) ? row.color : null,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString(),
});

async function listHighlights(userId: string, deps: typeof highlightsDeps) {
  const rows = await deps.many<Row>(
    `SELECT book, chapter, verse, color, updated_at FROM scripture_highlights WHERE user_id = ? ORDER BY updated_at DESC`,
    userId
  );
  return rows.map(responseEntry);
}

export function normalizeScriptureHighlightInput(entry: Input): ScriptureHighlightEntry | null {
  const book = typeof entry.book === "string" ? entry.book.trim().slice(0, 60) : "";
  const chapter = Number(entry.chapter);
  const verse = Number(entry.verse);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > 200 || !Number.isInteger(verse) || verse < 1 || verse > 200) return null;
  const color = entry.color === null ? null : isScriptureHighlightColor(entry.color) ? entry.color : undefined;
  if (color === undefined) return null;
  const parsedTime = typeof entry.updatedAt === "string" ? Date.parse(entry.updatedAt) : Number.NaN;
  // Never accept edit times from the future; they would block every later change.
  const updatedAt = new Date(Number.isFinite(parsedTime) ? Math.min(parsedTime, Date.now()) : Date.now()).toISOString();
  return { book, chapter, verse, color, updatedAt };
}

export async function getScriptureHighlights(deps = highlightsDeps) {
  const user = await deps.getCurrentUser();
  if (!user) return apiError(401, "sign_in_required", "Sign in to load your highlights.");
  return NextResponse.json({ highlights: await listHighlights(user.id, deps) });
}

export async function postScriptureHighlights(request: Request, deps = highlightsDeps) {
  const user = await deps.getCurrentUser();
  if (!user) return apiError(401, "sign_in_required", "Sign in to sync highlights.");

  const parsed = await readJsonBody<{ highlights?: Input[] }>(request, { maxBytes: 1_000_000, emptyBody: {} });
  if (!parsed.ok) return parsed.response;
  const candidates = Array.isArray(parsed.data.highlights) ? parsed.data.highlights.slice(0, MAX_HIGHLIGHTS_PER_REQUEST) : [];
  const byVerse = new Map<string, ScriptureHighlightEntry>();
  for (const candidate of candidates) {
    const entry = candidate && typeof candidate === "object" ? normalizeScriptureHighlightInput(candidate) : null;
    if (!entry) continue;
    const key = `${entry.book}:${entry.chapter}:${entry.verse}`;
    const existing = byVerse.get(key);
    if (!existing || Date.parse(entry.updatedAt) >= Date.parse(existing.updatedAt)) byVerse.set(key, entry);
  }
  const entries = [...byVerse.values()];
  if (!entries.length) return apiError(400, "invalid_input", "At least one highlight with a valid verse is required.");

  for (let start = 0; start < entries.length; start += UPSERT_CHUNK_SIZE) {
    const chunk = entries.slice(start, start + UPSERT_CHUNK_SIZE);
    // Older edits never overwrite a newer highlight that another device already synced.
    await deps.run(
      `INSERT INTO scripture_highlights (user_id, book, chapter, verse, color, updated_at)
       VALUES ${chunk.map(() => "(?, ?, ?, ?, ?, ?)").join(", ")}
       ON CONFLICT (user_id, book, chapter, verse) DO UPDATE SET
         color = EXCLUDED.color,
         updated_at = EXCLUDED.updated_at
       WHERE scripture_highlights.updated_at <= EXCLUDED.updated_at`,
      ...chunk.flatMap((entry) => [user.id, entry.book, entry.chapter, entry.verse, entry.color, entry.updatedAt])
    );
  }
  return NextResponse.json({ ok: true, synced: entries.length });
}

export async function GET() {
  return getScriptureHighlights();
}

export async function POST(request: Request) {
  return postScriptureHighlights(request);
}
