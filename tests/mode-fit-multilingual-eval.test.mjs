import assert from "node:assert/strict";
import test from "node:test";
import cases from "./fixtures/mode-fit-multilingual.json" with { type: "json" };
import { suggestModeForQuestion } from "../src/lib/mode-suggestion.ts";

test("multilingual mode-fit evaluation corpus protects every supported language", () => {
  const coveredLanguages = new Set(cases.map((entry) => entry.language));
  assert.deepEqual([...coveredLanguages].sort(), ["ar", "de", "en", "es", "fr", "ha", "hi", "ig", "pt", "tl", "yo"]);
  for (const entry of cases) {
    const result = suggestModeForQuestion(entry.question, entry.selectedMode);
    assert.equal(result?.mode ?? null, entry.expectedMode, `${entry.language}: ${entry.question}`);
  }
});
