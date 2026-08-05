import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

// Maps Aletheia's translation codes to api.getbible.net v2 abbreviations.
// Use api.getbible.net (not getbible.net — that domain 301s to a host with an expired cert).
// null means the translation is not hosted by api.getbible.net; the route returns 404.
const TRANSLATION_MAP: Record<string, string | null> = {
  WEB: "web",
  KJV: "kjv",
  ASV: "asv",
  RV1909: "valera",        // Reina Valera (1909)
  RV1960: null,            // Not available on api.getbible.net — use RV1909 in browser or show unavailable
  LSG1910: "ls1910",       // Louis Segond (1910)
  MARTIN: "martin",        // Martin (1744)
  AA: "almeida",           // Almeida Atualizada
  ARC: "almeida",          // Almeida Revisada; same upstream source
  LUTH1912: "luther1545",  // Closest available German Luther (1545); 1912 not hosted
  SCHLACH: "schlachter",   // Schlachter (1951)
  YOR1900: null,           // Yoruba Bible — not hosted on api.getbible.net
  IGB1913: null,           // Igbo Bible — not hosted on api.getbible.net
  HAU1932: null,           // Hausa Bible — not hosted on api.getbible.net
};

// Keep unavailable translations explicit, but allow selected ones to gracefully
// fall back to an available upstream translation.
const TRANSLATION_FALLBACK: Partial<Record<string, string>> = {
  RV1960: "WEB",
};

const LOCAL_EBIBLE_DATASET: Partial<Record<string, "yor" | "ibo" | "hausa">> = {
  YOR1900: "yor",
  IGB1913: "ibo",
  HAU1932: "hausa",
};

const BOOK_CODE_BY_NUMBER: Record<number, string> = {
  1: "GEN", 2: "EXO", 3: "LEV", 4: "NUM", 5: "DEU", 6: "JOS", 7: "JDG", 8: "RUT", 9: "1SA", 10: "2SA",
  11: "1KI", 12: "2KI", 13: "1CH", 14: "2CH", 15: "EZR", 16: "NEH", 17: "EST", 18: "JOB", 19: "PSA", 20: "PRO",
  21: "ECC", 22: "SNG", 23: "ISA", 24: "JER", 25: "LAM", 26: "EZK", 27: "DAN", 28: "HOS", 29: "JOL", 30: "AMO",
  31: "OBA", 32: "JON", 33: "MIC", 34: "NAM", 35: "HAB", 36: "ZEP", 37: "HAG", 38: "ZEC", 39: "MAL", 40: "MAT",
  41: "MRK", 42: "LUK", 43: "JHN", 44: "ACT", 45: "ROM", 46: "1CO", 47: "2CO", 48: "GAL", 49: "EPH", 50: "PHP",
  51: "COL", 52: "1TH", 53: "2TH", 54: "1TI", 55: "2TI", 56: "TIT", 57: "PHM", 58: "HEB", 59: "JAS", 60: "1PE",
  61: "2PE", 62: "1JN", 63: "2JN", 64: "3JN", 65: "JUD", 66: "REV",
};

type LocalEbiblePayload = {
  source: "ebible";
  code: string;
  generatedAt: string;
  verseCount: number;
  books: Record<string, Record<string, Record<string, string>>>;
};

const localEbibleCache: Partial<Record<"yor" | "ibo" | "hausa", LocalEbiblePayload>> = {};

function loadLocalEbiblePayload(code: "yor" | "ibo" | "hausa"): LocalEbiblePayload | null {
  if (localEbibleCache[code]) {
    return localEbibleCache[code] ?? null;
  }

  const filePath = join(process.cwd(), "public", "ebible-vpl", `${code}.json`);
  if (!existsSync(filePath)) {
    return null;
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as LocalEbiblePayload;
  localEbibleCache[code] = parsed;
  return parsed;
}

// getbible.net book numbers (canonical order, 1-based)
// OT: 1-39, NT: 40-66
const BOOK_NAMES: Record<string, number> = {
  Genesis: 1, Exodus: 2, Leviticus: 3, Numbers: 4, Deuteronomy: 5,
  Joshua: 6, Judges: 7, Ruth: 8, "1 Samuel": 9, "2 Samuel": 10,
  "1 Kings": 11, "2 Kings": 12, "1 Chronicles": 13, "2 Chronicles": 14,
  Ezra: 15, Nehemiah: 16, Esther: 17, Job: 18, Psalms: 19, Psalm: 19,
  Proverbs: 20, Ecclesiastes: 21, "Song of Solomon": 22, Isaiah: 23,
  Jeremiah: 24, Lamentations: 25, Ezekiel: 26, Daniel: 27, Hosea: 28,
  Joel: 29, Amos: 30, Obadiah: 31, Jonah: 32, Micah: 33, Nahum: 34,
  Habakkuk: 35, Zephaniah: 36, Haggai: 37, Zechariah: 38, Malachi: 39,
  Matthew: 40, Mark: 41, Luke: 42, John: 43, Acts: 44, Romans: 45,
  "1 Corinthians": 46, "2 Corinthians": 47, Galatians: 48, Ephesians: 49,
  Philippians: 50, Colossians: 51, "1 Thessalonians": 52, "2 Thessalonians": 53,
  "1 Timothy": 54, "2 Timothy": 55, Titus: 56, Philemon: 57, Hebrews: 58,
  James: 59, "1 Peter": 60, "2 Peter": 61, "1 John": 62, "2 John": 63,
  "3 John": 64, Jude: 65, Revelation: 66,
};

export interface BibleVerse {
  verse: number;
  text: string;
}

export interface BibleChapterResponse {
  translation: string;
  book: string;
  chapter: number;
  verses: BibleVerse[];
  fallbackTranslation?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const translationCode = (searchParams.get("translation") ?? "WEB").toUpperCase();
  const bookName = searchParams.get("book") ?? "";
  const chapterParam = searchParams.get("chapter") ?? "";

  const chapter = parseInt(chapterParam, 10);
  if (!bookName || !Number.isFinite(chapter) || chapter < 1) {
    return NextResponse.json({ error: "Missing or invalid book/chapter" }, { status: 400 });
  }

  // Resolve book number
  const bookNumber = BOOK_NAMES[bookName];
  if (!bookNumber) {
    return NextResponse.json({ error: `Unknown book: ${bookName}` }, { status: 400 });
  }

  // Local eBible fallback for translations not hosted upstream (same-language close equivalents).
  const localDatasetCode = LOCAL_EBIBLE_DATASET[translationCode];
  if (localDatasetCode) {
    const payload = loadLocalEbiblePayload(localDatasetCode);
    if (!payload) {
      return NextResponse.json({ error: "Chapter not found in this translation" }, { status: 404 });
    }

    const bookCode = BOOK_CODE_BY_NUMBER[bookNumber];
    const chapterVerses = payload.books[bookCode]?.[String(chapter)] ?? {};
    const verses = Object.entries(chapterVerses)
      .map(([verse, text]) => ({ verse: parseInt(verse, 10), text: text.replace(/\s+/g, " ").trim() }))
      .filter((v) => Number.isFinite(v.verse) && v.text.length > 0)
      .sort((a, b) => a.verse - b.verse);

    if (!verses.length) {
      return NextResponse.json({ error: "Chapter not found in this translation" }, { status: 404 });
    }

    const response: BibleChapterResponse = {
      translation: translationCode,
      book: bookName,
      chapter,
      verses,
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // Resolve translation (with optional fallback)
  const upstreamTranslationCode = TRANSLATION_MAP[translationCode] === null
    ? TRANSLATION_FALLBACK[translationCode] ?? translationCode
    : translationCode;

  const getbibleId = TRANSLATION_MAP[upstreamTranslationCode];
  if (getbibleId === undefined) {
    return NextResponse.json({ error: `Unsupported translation: ${translationCode}` }, { status: 400 });
  }
  if (getbibleId === null) {
    // Translation exists in Aletheia but is not hosted by api.getbible.net
    return NextResponse.json({ error: "Chapter not found in this translation" }, { status: 404 });
  }

  try {
    // api.getbible.net is the stable subdomain (getbible.net itself 301s to a host with an expired cert)
    const url = `https://api.getbible.net/v2/${getbibleId}/${bookNumber}/${chapter}.json`;
    const upstream = await fetch(url, {
      next: { revalidate: 86400 }, // cache for 24 hours
      headers: { "Accept": "application/json" },
    });

    if (!upstream.ok) {
      if (upstream.status === 404) {
        return NextResponse.json({ error: "Chapter not found in this translation" }, { status: 404 });
      }
      return NextResponse.json({ error: "Bible service unavailable" }, { status: 502 });
    }

    const data = await upstream.json();

    // api.getbible.net v2 shape: { book_nr, book_name, chapter, verses: Array<{ chapter, verse, name, text }> }
    const versesRaw: Array<{ verse: number; text: string }> = Array.isArray(data.verses)
      ? data.verses
      : Object.values(data.verses ?? {});
    const verses: BibleVerse[] = versesRaw
      .map((v) => ({ verse: v.verse, text: v.text.replace(/\s+/g, " ").trim() }))
      .sort((a, b) => a.verse - b.verse);

    const response: BibleChapterResponse = {
      translation: translationCode,
      book: bookName,
      chapter,
      verses,
      ...(upstreamTranslationCode !== translationCode ? { fallbackTranslation: upstreamTranslationCode } : {}),
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch scripture" }, { status: 502 });
  }
}

// Endpoint for listing books (static, no upstream call needed)
export const BIBLE_BOOKS = Object.keys(BOOK_NAMES);
export const BIBLE_BOOK_NUMBERS = BOOK_NAMES;
