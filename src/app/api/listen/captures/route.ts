import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { many, run } from "@/lib/db";
import { readJsonBody } from "@/lib/request";
import { normalizeStoredWisdomListenResult, type WisdomListenResult } from "@/lib/wisdom-listen";

type CaptureRow = {
  id: string;
  transcript: string;
  matches: unknown;
  counsel: string;
  application: string;
  mode: string;
  language: string;
  bible_translation: string;
  created_at: string;
};

function rowToCapture(row: CaptureRow): WisdomListenResult {
  return {
    id: row.id,
    transcript: row.transcript,
    matches: Array.isArray(row.matches) ? row.matches as WisdomListenResult["matches"] : [],
    counsel: row.counsel,
    application: row.application,
    mode: row.mode,
    language: row.language,
    bibleTranslation: row.bible_translation,
    createdAt: row.created_at,
    syncState: "synced",
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "sign_in_required", "Sign in to sync listening captures.");
  try {
    const rows = await many<CaptureRow>(
      `SELECT id, transcript, matches, counsel, application, mode, language, bible_translation, created_at
       FROM wisdom_listen_captures WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      user.id
    );
    return NextResponse.json({ captures: rows.map(rowToCapture) });
  } catch {
    return apiError(500, "unavailable", "Listening captures could not be loaded.");
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "sign_in_required", "Sign in to sync listening captures.");
  try {
    const parsed = await readJsonBody<{ capture?: unknown }>(request, { maxBytes: 32_000 });
    if (!parsed.ok) return parsed.response;
    const capture = normalizeStoredWisdomListenResult(parsed.data.capture);
    if (!capture || !capture.transcript || (!capture.matches.length && !capture.counsel)) {
      return apiError(400, "invalid_input", "A valid listening capture is required.");
    }
    const now = new Date().toISOString();
    await run(
      `INSERT INTO wisdom_listen_captures
       (id, user_id, transcript, matches, counsel, application, mode, language, bible_translation, created_at, updated_at)
       VALUES (?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         transcript = EXCLUDED.transcript, matches = EXCLUDED.matches, counsel = EXCLUDED.counsel,
         application = EXCLUDED.application, mode = EXCLUDED.mode, language = EXCLUDED.language,
         bible_translation = EXCLUDED.bible_translation, updated_at = EXCLUDED.updated_at
       WHERE wisdom_listen_captures.user_id = EXCLUDED.user_id`,
      capture.id, user.id, capture.transcript, JSON.stringify(capture.matches), capture.counsel, capture.application,
      capture.mode, capture.language, capture.bibleTranslation, capture.createdAt, now
    );
    return NextResponse.json({ capture: { ...capture, syncState: "synced" } });
  } catch {
    return apiError(500, "save_failed", "This listening capture could not be synced.");
  }
}
