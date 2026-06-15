import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const INPUT_FILE = resolve("src/lib/display-ready-scripture-reads.ts");
const OUTPUT_FILE = resolve("translation-reports/scripture-coverage-manifest.json");

const EXPECTED_TRANSLATIONS = [
  "WEB",
  "KJV",
  "ASV",
  "RV1909",
  "RV1960",
  "LSG1910",
  "MARTIN",
  "AA",
  "ARC",
  "LUTH1912",
  "SCHLACH",
  "YOR1900",
  "IGB1913",
  "HAU1932",
];

const CANONICAL_BOOKS = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalm",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
];

function parseDisplayReadyDataset(rawModuleText) {
  const match = rawModuleText.match(/=\s*(\{[\s\S]*\});\s*$/m);
  if (!match) {
    throw new Error(`Could not parse display-ready scripture dataset from ${INPUT_FILE}`);
  }
  return JSON.parse(match[1]);
}

function parseBook(reference) {
  const match = reference.match(/^(.+?)\s+\d+:\d+(?:-\d+)?$/);
  return match ? match[1].trim() : null;
}

function buildTranslationCoverage(translationCode, referenceMap) {
  const references = Object.keys(referenceMap ?? {}).sort();
  const books = [...new Set(references.map(parseBook).filter(Boolean))].sort();
  const missingBooks = CANONICAL_BOOKS.filter((book) => !books.includes(book));

  return {
    referenceCount: references.length,
    bookCount: books.length,
    books,
    missingBooks,
    hasFullBookCoverage: missingBooks.length === 0,
    references,
  };
}

async function main() {
  const raw = await readFile(INPUT_FILE, "utf8");
  const dataset = parseDisplayReadyDataset(raw);
  const presentTranslations = Object.keys(dataset).sort();

  const translations = {};
  presentTranslations.forEach((translationCode) => {
    translations[translationCode] = buildTranslationCoverage(translationCode, dataset[translationCode]);
  });

  const missingTranslations = EXPECTED_TRANSLATIONS.filter((code) => !presentTranslations.includes(code));
  const unexpectedTranslations = presentTranslations.filter((code) => !EXPECTED_TRANSLATIONS.includes(code));

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceFile: "src/lib/display-ready-scripture-reads.ts",
    expected: {
      translationCount: EXPECTED_TRANSLATIONS.length,
      translationCodes: EXPECTED_TRANSLATIONS,
      canonicalBookCount: CANONICAL_BOOKS.length,
      canonicalBooks: CANONICAL_BOOKS,
    },
    totals: {
      presentTranslationCount: presentTranslations.length,
      missingTranslationCount: missingTranslations.length,
      unexpectedTranslationCount: unexpectedTranslations.length,
    },
    missingTranslations,
    unexpectedTranslations,
    translations,
  };

  await mkdir(dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote scripture coverage manifest: ${OUTPUT_FILE}`);
  console.log(
    `Translations: present=${manifest.totals.presentTranslationCount}, missing=${manifest.totals.missingTranslationCount}, unexpected=${manifest.totals.unexpectedTranslationCount}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});