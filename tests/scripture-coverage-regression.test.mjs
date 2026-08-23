import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("scripture coverage validates the curated dataset without false full-book warnings", async () => {
  const generate = spawnSync(process.execPath, ["scripts/generate-scripture-coverage-manifest.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(generate.status, 0, generate.stderr);

  const validate = spawnSync(process.execPath, ["scripts/validate-scripture-coverage.mjs"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(validate.status, 0, validate.stderr);
  assert.match(validate.stdout, /Curated-reference complete translations: 14\/14 \(12 references each\)/);
  assert.doesNotMatch(`${validate.stdout}\n${validate.stderr}`, /full-book|66 books/i);

  const manifest = JSON.parse(
    await readFile("translation-reports/scripture-coverage-manifest.json", "utf8")
  );
  assert.equal(manifest.expected.curatedReferenceCount, 12);
  assert.equal(manifest.totals.presentTranslationCount, 14);
  for (const coverage of Object.values(manifest.translations)) {
    assert.equal(coverage.hasCompleteCuratedCoverage, true);
    assert.deepEqual(coverage.missingReferences, []);
  }
});
