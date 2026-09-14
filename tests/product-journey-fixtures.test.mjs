import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const fixtureUrl = new URL("./fixtures/product-journeys.json", import.meta.url);
const fixtures = JSON.parse(readFileSync(fixtureUrl, "utf8"));

test("decision and counsel journey has a stable entry, primary action, and return path", () => {
  const journey = fixtures.decisionCounsel;
  assert.equal(journey.entryTab, "Decisions");
  assert.equal(journey.legacyEntryTab, "Decide");
  assert.match(journey.marker, /decision/i);
  assert.match(journey.primaryInput.placeholderIncludes, /decision title/i);
  assert.ok(journey.steps.some((step) => /counsel/i.test(step)));
  assert.match(journey.steps.at(-1), /without losing context/i);
});

test("reflect and gratitude journey covers both surfaces and draft continuity", () => {
  const journey = fixtures.reflectGratitude;
  assert.equal(journey.entryTab, "Reflect");
  assert.match(journey.reflectionDisclosureIncludes, /reflection journal/i);
  assert.match(journey.reflectionBodyPlaceholderIncludes, /noticing/i);
  assert.ok(journey.steps.some((step) => /gratitude lens/i.test(step)));
  assert.match(journey.steps.at(-1), /without losing the draft/i);
});
