import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const MANIFEST_FILE = resolve("translation-reports/scripture-coverage-manifest.json");

function equalSet(a, b) {
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}

function formatList(values) {
  return values.length ? values.join(", ") : "none";
}

async function main() {
  const raw = await readFile(MANIFEST_FILE, "utf8");
  const manifest = JSON.parse(raw);
  const errors = [];
  const warnings = [];

  if (manifest.missingTranslations?.length) {
    errors.push(`Missing expected translations: ${formatList(manifest.missingTranslations)}`);
  }

  if (manifest.unexpectedTranslations?.length) {
    warnings.push(`Unexpected translations in dataset: ${formatList(manifest.unexpectedTranslations)}`);
  }

  const translationEntries = Object.entries(manifest.translations ?? {});
  if (!translationEntries.length) {
    errors.push("No translation coverage entries were found in the manifest.");
  }

  const baseline = translationEntries[0]?.[1]?.references ?? [];
  const baselineSet = new Set(baseline);

  translationEntries.forEach(([translationCode, data]) => {
    const references = data.references ?? [];
    const referenceSet = new Set(references);
    if (!equalSet(referenceSet, baselineSet)) {
      errors.push(
        `${translationCode} has a different reference set than the baseline translation (${translationEntries[0]?.[0] ?? "unknown"}).`
      );
    }

    if ((data.referenceCount ?? 0) === 0) {
      errors.push(`${translationCode} has zero references.`);
    }

    if ((data.bookCount ?? 0) === 0) {
      errors.push(`${translationCode} has zero books.`);
    }

    if (!data.hasCompleteCuratedCoverage || data.missingReferences?.length) {
      errors.push(
        `${translationCode} is missing curated references: ${formatList(data.missingReferences ?? [])}`
      );
    }

    if (data.unexpectedReferences?.length) {
      warnings.push(
        `${translationCode} has references outside the curated set: ${formatList(data.unexpectedReferences)}`
      );
    }
  });

  if (warnings.length) {
    console.warn("Scripture coverage warnings:");
    warnings.forEach((warning) => console.warn(`- ${warning}`));
  }

  if (errors.length) {
    console.error("Scripture coverage validation errors:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log(
    `Scripture coverage validation passed. Curated-reference complete translations: ${translationEntries.length}/${translationEntries.length} (${manifest.expected?.curatedReferenceCount ?? 0} references each).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
