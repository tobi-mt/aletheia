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

// This file validates the deliberately curated, display-ready passage dataset.
// Full-canon availability is tracked separately by full-scripture-manifest.ts;
// seeing one curated passage from a book does not mean that book is complete.
const EXPECTED_REFERENCES = [
  "Matthew 25:14-30",
  "Proverbs 22:7",
  "Philippians 4:11-13",
  "Proverbs 15:22",
  "Luke 14:28",
  "2 Corinthians 9:6-8",
  "Proverbs 21:5",
  "Matthew 6:25-34",
  "Psalm 51:10-12",
  "James 5:16",
  "1 Thessalonians 4:3-5",
  "1 Corinthians 10:13",
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
  const missingReferences = EXPECTED_REFERENCES.filter((reference) => !references.includes(reference));
  const unexpectedReferences = references.filter((reference) => !EXPECTED_REFERENCES.includes(reference));

  return {
    referenceCount: references.length,
    bookCount: books.length,
    books,
    missingReferences,
    unexpectedReferences,
    hasCompleteCuratedCoverage: missingReferences.length === 0,
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
      curatedReferenceCount: EXPECTED_REFERENCES.length,
      curatedReferences: EXPECTED_REFERENCES,
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
