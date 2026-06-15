import type { BibleTranslation, ScriptureRead, LanguageCode } from "@/lib/localization";
import { fullScriptureChunkManifest } from "@/lib/full-scripture-manifest";

// ---- Translation metadata (minimal inline copy to avoid circular import with localization.ts) ----
// Keys mirror bibleTranslations in localization.ts; update both if translations change.
const TRANSLATION_META: Partial<Record<BibleTranslation, { label: string; language: LanguageCode }>> = {
  WEB: { label: "World English Bible", language: "en" },
  KJV: { label: "King James Version", language: "en" },
  ASV: { label: "American Standard Version", language: "en" },
  RV1909: { label: "Reina-Valera 1909", language: "es" },
  RV1960: { label: "Reina-Valera 1960", language: "es" },
  LSG1910: { label: "Louis Segond 1910", language: "fr" },
  MARTIN: { label: "Bible Martin 1744", language: "fr" },
  AA: { label: "Almeida Atualizada", language: "pt" },
  ARC: { label: "Almeida Revisada Corrigida", language: "pt" },
  LUTH1912: { label: "Luther 1912", language: "de" },
  SCHLACH: { label: "Schlachter 1951", language: "de" },
  YOR1900: { label: "Yoruba Bible 1900", language: "yo" },
  IGB1913: { label: "Igbo Bible 1913", language: "ig" },
  HAU1932: { label: "Hausa Bible 1932", language: "ha" },
};



/** Pre-assembled reads (curated or loaded from chunks). Keyed by canonical reference. */
export const fullScriptureReadsByTranslation: Partial<Record<BibleTranslation, Record<string, ScriptureRead>>> = {};

/**
 * Verse-level cache populated by loadScriptureBook().
 * Shape: translation → bookKey → "chapter:verse" → text
 */
const verseCache: Partial<Record<BibleTranslation, Record<string, Record<string, string>>>> = {};

/** Tracks which (translation, bookKey) pairs have already been fetched to avoid duplicate requests. */
const bookLoadState: Partial<Record<BibleTranslation, Record<string, "loading" | "loaded" | "error">>> = {};

export const fullScriptureReadsEnabled = process.env.NEXT_PUBLIC_ENABLE_FULL_SCRIPTURE_READS === "1";

// ---- Canonical reference parser ----

type ParsedRef = { bookKey: string; chapter: number; verseStart: number; verseEnd: number };

function parseCanonicalRef(ref: string): ParsedRef | null {
  // "1 Corinthians 13:1-13"
  const rangeMatch = ref.match(/^(.+?)\s+(\d+):(\d+)-(\d+)$/);
  if (rangeMatch) {
    return {
      bookKey: rangeMatch[1].toLowerCase(),
      chapter: parseInt(rangeMatch[2], 10),
      verseStart: parseInt(rangeMatch[3], 10),
      verseEnd: parseInt(rangeMatch[4], 10),
    };
  }
  // "Proverbs 22:7"
  const singleMatch = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
  if (singleMatch) {
    const v = parseInt(singleMatch[3], 10);
    return { bookKey: singleMatch[1].toLowerCase(), chapter: parseInt(singleMatch[2], 10), verseStart: v, verseEnd: v };
  }
  // "Psalm 23" (whole chapter)
  const chapterMatch = ref.match(/^(.+?)\s+(\d+)$/);
  if (chapterMatch) {
    return { bookKey: chapterMatch[1].toLowerCase(), chapter: parseInt(chapterMatch[2], 10), verseStart: 1, verseEnd: 999 };
  }
  return null;
}

// ---- Verse-cache assembly ----

function assembleFromVerseCache(translation: BibleTranslation, parsed: ParsedRef): ScriptureRead | undefined {
  const bookVerses = verseCache[translation]?.[parsed.bookKey];
  if (!bookVerses) return undefined;

  const assembled: Array<{ verse: string; text: string }> = [];
  for (let v = parsed.verseStart; v <= parsed.verseEnd; v++) {
    const key = `${parsed.chapter}:${v}`;
    if (bookVerses[key]) assembled.push({ verse: key, text: bookVerses[key] });
  }
  if (assembled.length === 0) return undefined;

  const translationMeta = TRANSLATION_META[translation] ?? { label: translation, language: "en" as LanguageCode };
  return {
    translation,
    label: translationMeta.label,
    text: assembled.map((v) => v.text).join(" "),
    availableLanguage: translationMeta.language as LanguageCode,
    kind: "passage",
    verses: assembled,
  };
}

// ---- Public API ----

/**
 * Synchronously returns a ScriptureRead if available in memory or assembled from verse cache.
 * Returns undefined when the chunk has not yet been loaded — call loadScriptureBook() first.
 */
export function getFullScriptureRead(translation: BibleTranslation, canonicalReference: string): ScriptureRead | undefined {
  const inMemory = fullScriptureReadsByTranslation[translation]?.[canonicalReference];
  if (inMemory) return inMemory;

  const parsed = parseCanonicalRef(canonicalReference);
  if (!parsed) return undefined;

  return assembleFromVerseCache(translation, parsed);
}

/** Chunk format written by scripts/generate-full-scripture-chunks.mjs */
interface ScriptureBookChunk {
  translation: string;
  book: string;
  generatedAt: string;
  verses: Record<string, string>; // "chapter:verse" → text
}

/**
 * Asynchronously loads a full book's verse data from a pre-generated static chunk.
 * Safe to call multiple times — subsequent calls for already-loaded books are no-ops.
 * Returns true when verses are available (either freshly loaded or already cached).
 */
export async function loadScriptureBook(translation: BibleTranslation, bookKey: string): Promise<boolean> {
  const manifest = fullScriptureChunkManifest.translations[translation];
  if (!manifest?.chunks.includes(bookKey)) return false;

  const state = bookLoadState[translation]?.[bookKey];
  if (state === "loaded") return true;
  if (state === "loading") return false; // in-flight

  // Mark as loading
  if (!bookLoadState[translation]) bookLoadState[translation] = {};
  bookLoadState[translation]![bookKey] = "loading";

  try {
    const fileKey = bookKey.replace(/ /g, "-");
    const res = await fetch(`/scripture-chunks/${translation}/${fileKey}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: ScriptureBookChunk = await res.json();

    if (!verseCache[translation]) verseCache[translation] = {};
    verseCache[translation]![bookKey] = data.verses;
    bookLoadState[translation]![bookKey] = "loaded";
    return true;
  } catch {
    bookLoadState[translation]![bookKey] = "error";
    return false;
  }
}

/** Returns true if a chunk file is expected to exist for the given translation + book. */
export function hasScriptureChunk(translation: BibleTranslation, bookKey: string): boolean {
  return fullScriptureChunkManifest.translations[translation]?.chunks.includes(bookKey) ?? false;
}