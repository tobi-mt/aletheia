import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8");

test("client does not duplicate authentication failures already recorded by the server", () => {
  assert.match(app, /serverRecordedFailure = Boolean\(data\.errorCode\)/);
  assert.match(app, /if \(!serverRecordedFailure\) \{\s*trackAuthFailure\(failureMetadata\)/);
});

test("meaningful outcomes remain categorical and do not include private answer text", () => {
  const outcomeFunction = app.match(/function recordMeaningfulOutcome[\s\S]*?\n  \}/)?.[0] ?? "";
  assert.match(outcomeFunction, /outcome: value/);
  assert.doesNotMatch(outcomeFunction, /question|answer|response|text:/);
});
