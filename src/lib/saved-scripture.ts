export type ScriptureHighlightColor = "gold" | "rose" | "sky" | "mint";

export type SavedScripture = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  highlight: ScriptureHighlightColor | null;
  savedAt: string;
};

export type ScriptureHighlights = Record<string, ScriptureHighlightColor>;

export type ScriptureNote = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  endVerse: number;
  passage: string;
  note: string;
  updatedAt: string;
};

export const MAX_SCRIPTURE_NOTE_LENGTH = 4000;

export function scriptureHighlightKey(book: string, chapter: number, verse: number) {
  return `${book}:${chapter}:${verse}`;
}

export function isScriptureNote(value: unknown): value is ScriptureNote {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === "string"
    && typeof entry.book === "string"
    && Number.isInteger(entry.chapter)
    && Number.isInteger(entry.verse)
    && Number.isInteger(entry.endVerse)
    && typeof entry.note === "string"
    && typeof entry.updatedAt === "string";
}

// Local and account notes merge per passage start; the most recently edited copy wins.
export function mergeScriptureNotes(localNotes: ScriptureNote[], accountNotes: ScriptureNote[]) {
  const merged = new Map<string, ScriptureNote>();
  for (const note of [...accountNotes, ...localNotes]) {
    const key = scriptureHighlightKey(note.book, note.chapter, note.verse);
    const existing = merged.get(key);
    if (!existing || Date.parse(note.updatedAt) >= Date.parse(existing.updatedAt)) merged.set(key, note);
  }
  return [...merged.values()].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export const BIBLE_READER_SETTINGS_STORAGE_KEY = "aletheia_bible_reader_settings";
export const BIBLE_LAST_POSITION_STORAGE_KEY = "aletheia_bible_last_position";
export const BIBLE_SELECTION_HINT_STORAGE_KEY = "aletheia_bible_selection_hint_seen";

export const SCRIPTURE_HIGHLIGHT_COLORS: readonly ScriptureHighlightColor[] = ["gold", "rose", "sky", "mint"];

// A null color is a "cleared" marker so removing a highlight on one device also removes it elsewhere.
export type ScriptureHighlightEntry = {
  book: string;
  chapter: number;
  verse: number;
  color: ScriptureHighlightColor | null;
  updatedAt: string;
};

// Highlights made before account sync carry no edit time; any real edit elsewhere wins over them.
export const LEGACY_HIGHLIGHT_TIMESTAMP = "1970-01-01T00:00:00.000Z";

export function isScriptureHighlightColor(value: unknown): value is ScriptureHighlightColor {
  return typeof value === "string" && (SCRIPTURE_HIGHLIGHT_COLORS as readonly string[]).includes(value);
}

export function isScriptureHighlightEntry(value: unknown): value is ScriptureHighlightEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.book === "string"
    && Number.isInteger(entry.chapter)
    && Number.isInteger(entry.verse)
    && (entry.color === null || isScriptureHighlightColor(entry.color))
    && typeof entry.updatedAt === "string"
    && Number.isFinite(Date.parse(entry.updatedAt));
}

export function mergeScriptureHighlightEntries(localEntries: ScriptureHighlightEntry[], accountEntries: ScriptureHighlightEntry[]) {
  const merged = new Map<string, ScriptureHighlightEntry>();
  for (const entry of [...accountEntries, ...localEntries]) {
    const key = scriptureHighlightKey(entry.book, entry.chapter, entry.verse);
    const existing = merged.get(key);
    if (!existing || Date.parse(entry.updatedAt) > Date.parse(existing.updatedAt)) merged.set(key, entry);
  }
  return [...merged.values()];
}

export function highlightsFromEntries(entries: ScriptureHighlightEntry[]): ScriptureHighlights {
  const highlights: ScriptureHighlights = {};
  for (const entry of entries) {
    if (entry.color) highlights[scriptureHighlightKey(entry.book, entry.chapter, entry.verse)] = entry.color;
  }
  return highlights;
}

export function entriesFromLegacyHighlights(highlights: ScriptureHighlights): ScriptureHighlightEntry[] {
  return Object.entries(highlights).flatMap(([key, color]) => {
    const match = /^(.+):(\d+):(\d+)$/.exec(key);
    if (!match || !isScriptureHighlightColor(color)) return [];
    return [{ book: match[1], chapter: Number(match[2]), verse: Number(match[3]), color, updatedAt: LEGACY_HIGHLIGHT_TIMESTAMP }];
  });
}
