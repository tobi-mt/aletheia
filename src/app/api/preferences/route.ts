import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { one, run } from "@/lib/db";
import { defaultPreferences, normalizePreferences, type UserPreferences } from "@/lib/localization";
import { readJsonBody } from "@/lib/request";

type PreferenceRow = {
  language: string;
  region: string;
  bible_translation: string;
  voice_enabled: boolean;
};

function mapRow(row: PreferenceRow | undefined): UserPreferences {
  if (!row) {
    return defaultPreferences;
  }

  return normalizePreferences({
    language: row.language as UserPreferences["language"],
    region: row.region as UserPreferences["region"],
    bibleTranslation: row.bible_translation as UserPreferences["bibleTranslation"],
    voiceEnabled: row.voice_enabled,
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ preferences: defaultPreferences, persisted: false });
  }

  const row = await one<PreferenceRow>(
    `SELECT language, region, bible_translation, voice_enabled
     FROM user_preferences
     WHERE user_id = ?`,
    user.id
  );

  return NextResponse.json({ preferences: mapRow(row), persisted: Boolean(row) });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  const parsedBody = await readJsonBody<Partial<UserPreferences>>(request, { maxBytes: 4_000, emptyBody: {} });
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;
  const preferences = normalizePreferences(body);

  if (!user) {
    return NextResponse.json({ preferences, persisted: false });
  }

  const now = new Date().toISOString();
  await run(
    `INSERT INTO user_preferences (
      user_id, language, region, bible_translation, voice_enabled, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (user_id)
    DO UPDATE SET
      language = EXCLUDED.language,
      region = EXCLUDED.region,
      bible_translation = EXCLUDED.bible_translation,
      voice_enabled = EXCLUDED.voice_enabled,
      updated_at = EXCLUDED.updated_at`,
    user.id,
    preferences.language,
    preferences.region,
    preferences.bibleTranslation,
    preferences.voiceEnabled,
    now,
    now
  );

  return NextResponse.json({ preferences, persisted: true });
}
