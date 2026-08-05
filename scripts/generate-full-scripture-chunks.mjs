#!/usr/bin/env node
/**
 * Phase 8 chunk generator: fetches full-book scripture data from getbible.net v2
 * and writes static JSON chunks to public/scripture-chunks/[TRANSLATION]/[bookKey].json
 *
 * Usage:
 *   node scripts/generate-full-scripture-chunks.mjs --translation WEB
 *   node scripts/generate-full-scripture-chunks.mjs --translation WEB --books matthew,mark,luke
 *   node scripts/generate-full-scripture-chunks.mjs --all
 *
 * Flags:
 *   --translation <CODE>   Single Aletheia translation code (WEB, KJV, etc.)
 *   --books <list>         Comma-separated lowercase book keys to generate (default: all 66)
 *   --all                  Process all 14 translations (slow — use with care)
 *   --force                Re-fetch even if the chunk file already exists
 *   --delay <ms>           Milliseconds between requests (default: 150)
 *   --dry-run              Print what would be fetched without writing files
 *
 * Output format (per chunk file):
 * {
 *   "translation": "WEB",
 *   "book": "matthew",
 *   "generatedAt": "2026-06-15T00:00:00.000Z",
 *   "verses": { "1:1": "...", "1:2": "...", "2:1": "..." }
 * }
 *
 * After generation, update src/lib/full-scripture-manifest.ts with the new chunks list.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CHUNKS_DIR = join(ROOT, "public", "scripture-chunks");
const MANIFEST_PATH = join(ROOT, "src", "lib", "full-scripture-manifest.ts");

// Maps Aletheia translation codes to getbible.net abbreviations
const TRANSLATION_MAP = {
  WEB: "web",
  KJV: "kjv",
  ASV: "asv",
  RV1909: "reinavalera",
  RV1960: "reinavalera",
  LSG1910: "segond",
  MARTIN: "martin",
  AA: "almeida",
  ARC: "almeida",
  LUTH1912: "luther1912",
  SCHLACH: "schlachter",
  YOR1900: "yoruba",
  IGB1913: "igbo",
  HAU1932: "hausa",
};

// All 14 Aletheia translation codes
const ALL_TRANSLATIONS = Object.keys(TRANSLATION_MAP);

// Canonical 66-book list with getbible.net book numbers
const BOOKS = [
  { key: "genesis", number: 1, chapters: 50 },
  { key: "exodus", number: 2, chapters: 40 },
  { key: "leviticus", number: 3, chapters: 27 },
  { key: "numbers", number: 4, chapters: 36 },
  { key: "deuteronomy", number: 5, chapters: 34 },
  { key: "joshua", number: 6, chapters: 24 },
  { key: "judges", number: 7, chapters: 21 },
  { key: "ruth", number: 8, chapters: 4 },
  { key: "1 samuel", number: 9, chapters: 31 },
  { key: "2 samuel", number: 10, chapters: 24 },
  { key: "1 kings", number: 11, chapters: 22 },
  { key: "2 kings", number: 12, chapters: 25 },
  { key: "1 chronicles", number: 13, chapters: 29 },
  { key: "2 chronicles", number: 14, chapters: 36 },
  { key: "ezra", number: 15, chapters: 10 },
  { key: "nehemiah", number: 16, chapters: 13 },
  { key: "esther", number: 17, chapters: 10 },
  { key: "job", number: 18, chapters: 42 },
  { key: "psalm", number: 19, chapters: 150 },
  { key: "proverbs", number: 20, chapters: 31 },
  { key: "ecclesiastes", number: 21, chapters: 12 },
  { key: "song of solomon", number: 22, chapters: 8 },
  { key: "isaiah", number: 23, chapters: 66 },
  { key: "jeremiah", number: 24, chapters: 52 },
  { key: "lamentations", number: 25, chapters: 5 },
  { key: "ezekiel", number: 26, chapters: 48 },
  { key: "daniel", number: 27, chapters: 12 },
  { key: "hosea", number: 28, chapters: 14 },
  { key: "joel", number: 29, chapters: 3 },
  { key: "amos", number: 30, chapters: 9 },
  { key: "obadiah", number: 31, chapters: 1 },
  { key: "jonah", number: 32, chapters: 4 },
  { key: "micah", number: 33, chapters: 7 },
  { key: "nahum", number: 34, chapters: 3 },
  { key: "habakkuk", number: 35, chapters: 3 },
  { key: "zephaniah", number: 36, chapters: 3 },
  { key: "haggai", number: 37, chapters: 2 },
  { key: "zechariah", number: 38, chapters: 14 },
  { key: "malachi", number: 39, chapters: 4 },
  { key: "matthew", number: 40, chapters: 28 },
  { key: "mark", number: 41, chapters: 16 },
  { key: "luke", number: 42, chapters: 24 },
  { key: "john", number: 43, chapters: 21 },
  { key: "acts", number: 44, chapters: 28 },
  { key: "romans", number: 45, chapters: 16 },
  { key: "1 corinthians", number: 46, chapters: 16 },
  { key: "2 corinthians", number: 47, chapters: 13 },
  { key: "galatians", number: 48, chapters: 6 },
  { key: "ephesians", number: 49, chapters: 6 },
  { key: "philippians", number: 50, chapters: 4 },
  { key: "colossians", number: 51, chapters: 4 },
  { key: "1 thessalonians", number: 52, chapters: 5 },
  { key: "2 thessalonians", number: 53, chapters: 3 },
  { key: "1 timothy", number: 54, chapters: 6 },
  { key: "2 timothy", number: 55, chapters: 4 },
  { key: "titus", number: 56, chapters: 3 },
  { key: "philemon", number: 57, chapters: 1 },
  { key: "hebrews", number: 58, chapters: 13 },
  { key: "james", number: 59, chapters: 5 },
  { key: "1 peter", number: 60, chapters: 5 },
  { key: "2 peter", number: 61, chapters: 3 },
  { key: "1 john", number: 62, chapters: 5 },
  { key: "2 john", number: 63, chapters: 1 },
  { key: "3 john", number: 64, chapters: 1 },
  { key: "jude", number: 65, chapters: 1 },
  { key: "revelation", number: 66, chapters: 22 },
];

const BOOK_BY_KEY = Object.fromEntries(BOOKS.map((b) => [b.key, b]));

// ---------- CLI arg parsing ----------

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const translationArg = getArg("--translation");
const booksArg = getArg("--books");
const allFlag = hasFlag("--all");
const forceFlag = hasFlag("--force");
const dryRun = hasFlag("--dry-run");
const delayMs = parseInt(getArg("--delay") ?? "150", 10);

if (!translationArg && !allFlag) {
  console.error("Usage: node generate-full-scripture-chunks.mjs --translation WEB [--books matthew,luke] [--force] [--dry-run]");
  console.error("       node generate-full-scripture-chunks.mjs --all");
  process.exit(1);
}

const translationsToProcess = allFlag
  ? ALL_TRANSLATIONS
  : [translationArg.toUpperCase()];

const booksToProcess = booksArg
  ? booksArg.split(",").map((b) => b.trim().toLowerCase())
  : BOOKS.map((b) => b.key);

// Validate
for (const t of translationsToProcess) {
  if (!TRANSLATION_MAP[t]) {
    console.error(`Unknown translation: ${t}. Valid: ${ALL_TRANSLATIONS.join(", ")}`);
    process.exit(1);
  }
}
for (const b of booksToProcess) {
  if (!BOOK_BY_KEY[b]) {
    console.error(`Unknown book key: "${b}". Use lowercase canonical keys like "matthew", "1 corinthians".`);
    process.exit(1);
  }
}

// ---------- Fetch helpers ----------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchChapter(getbibleId, bookNumber, chapter) {
  const url = `https://getbible.net/v2/${getbibleId}/${bookNumber}/${chapter}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const data = await res.json();
  return data; // { chapter: { verses: { 1: { verse: 1, text: "..." }, ... } } }
}

// ---------- Main ----------

async function generateChunk(translationCode, bookMeta) {
  const getbibleId = TRANSLATION_MAP[translationCode];
  const chunkDir = join(CHUNKS_DIR, translationCode);
  const chunkFile = join(chunkDir, `${bookMeta.key.replace(/ /g, "-")}.json`);

  if (!forceFlag && existsSync(chunkFile)) {
    console.log(`  [skip] ${translationCode}/${bookMeta.key} (already exists)`);
    return { skipped: true };
  }

  if (dryRun) {
    console.log(`  [dry-run] Would fetch ${bookMeta.chapters} chapters for ${translationCode}/${bookMeta.key}`);
    return { skipped: false, dryRun: true };
  }

  const verses = {};
  let fetchErrors = 0;

  for (let ch = 1; ch <= bookMeta.chapters; ch++) {
    try {
      const data = await fetchChapter(getbibleId, bookMeta.number, ch);
      // getbible.net v2 format: data.chapter is an object with verse numbers as keys
      const chapterData = data.chapter ?? {};
      for (const [verseNum, verseData] of Object.entries(chapterData)) {
        const text = (verseData.text ?? "").trim();
        if (text) {
          verses[`${ch}:${verseNum}`] = text;
        }
      }
      process.stdout.write(".");
    } catch {
      process.stdout.write("E");
      fetchErrors++;
      if (fetchErrors > 5) {
        console.error(`\n  Too many errors for ${translationCode}/${bookMeta.key}, aborting book.`);
        return { skipped: false, error: true };
      }
    }
    if (ch < bookMeta.chapters) await sleep(delayMs);
  }
  process.stdout.write("\n");

  if (Object.keys(verses).length === 0) {
    console.warn(`  [warn] No verses retrieved for ${translationCode}/${bookMeta.key} — skipping write.`);
    return { skipped: false, empty: true };
  }

  const chunk = {
    translation: translationCode,
    book: bookMeta.key,
    generatedAt: new Date().toISOString(),
    verses,
  };

  mkdirSync(chunkDir, { recursive: true });
  writeFileSync(chunkFile, JSON.stringify(chunk), "utf8");
  console.log(`  [ok] ${translationCode}/${bookMeta.key} → ${Object.keys(verses).length} verses`);
  return { skipped: false, verseCount: Object.keys(verses).length };
}

async function updateManifest(generatedMap) {
  // generatedMap: { [translation]: string[] } — book keys successfully written
  // Build the translations object for the manifest
  const lines = [
    `// AUTO-GENERATED partially by scripts/generate-full-scripture-chunks.mjs`,
    `// Run that script to add new translations/books. Do not edit translations{} manually.`,
    `import type { BibleTranslation } from "@/lib/localization";`,
    ``,
    `export type FullScriptureChunkManifest = {`,
    `  version: string;`,
    `  generatedAt: string;`,
    `  translations: Partial<Record<BibleTranslation, {`,
    `    chunkCount: number;`,
    `    chunks: string[]; // lowercase book keys available as static JSON`,
    `  }>>;`,
    `};`,
    ``,
    `export const fullScriptureChunkManifest: FullScriptureChunkManifest = {`,
    `  version: "1",`,
    `  generatedAt: ${JSON.stringify(new Date().toISOString())},`,
    `  translations: {`,
  ];

  for (const [trans, books] of Object.entries(generatedMap)) {
    if (books.length === 0) continue;
    lines.push(`    ${trans}: { chunkCount: ${books.length}, chunks: ${JSON.stringify(books)} },`);
  }

  lines.push(`  },`);
  lines.push(`};`);
  lines.push(``);

  writeFileSync(MANIFEST_PATH, lines.join("\n"), "utf8");
  console.log(`\nUpdated ${MANIFEST_PATH}`);
}

// Collect existing manifest state so we don't clobber other translations
function parseExistingManifest() {
  if (!existsSync(MANIFEST_PATH)) return {};
  const content = readFileSync(MANIFEST_PATH, "utf8");
  const result = {};
  const transRegex = /(\w+): \{ chunkCount: \d+, chunks: (\[.*?\]) \}/g;
  let m;
  while ((m = transRegex.exec(content)) !== null) {
    try {
      result[m[1]] = JSON.parse(m[2]);
    } catch {}
  }
  return result;
}

(async () => {
  const existingManifest = parseExistingManifest();
  const newlyGenerated = { ...existingManifest };

  for (const translation of translationsToProcess) {
    console.log(`\n=== ${translation} (getbible: ${TRANSLATION_MAP[translation]}) ===`);
    if (!newlyGenerated[translation]) {
      newlyGenerated[translation] = [];
    }

    for (const bookKey of booksToProcess) {
      const bookMeta = BOOK_BY_KEY[bookKey];
      console.log(`  Processing: ${bookKey} (${bookMeta.chapters} chapters)`);
      const result = await generateChunk(translation, bookMeta);

      if (!result.skipped && !result.error && !result.empty && !result.dryRun) {
        if (!newlyGenerated[translation].includes(bookKey)) {
          newlyGenerated[translation].push(bookKey);
        }
      } else if (result.skipped) {
        // Already exists — still track in manifest
        if (!newlyGenerated[translation].includes(bookKey)) {
          newlyGenerated[translation].push(bookKey);
        }
      }
    }
  }

  if (!dryRun) {
    await updateManifest(newlyGenerated);
  }

  console.log("\nDone.");
})();
