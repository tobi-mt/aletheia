import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { modeProfiles } from "../src/lib/mode-profiles.ts";

const app = readFileSync(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8");
const openAi = readFileSync(new URL("../src/lib/openai.ts", import.meta.url), "utf8");

test("every wisdom mode has a complete and distinct intelligence profile", () => {
  const profiles = Object.values(modeProfiles);
  assert.equal(profiles.length, 5);
  for (const profile of profiles) {
    assert.ok(profile.intent.length >= 20);
    assert.ok(profile.lens.length >= 30);
    assert.ok(profile.diagnosticTracks.length >= 4);
    assert.ok(profile.blindSpots.length >= 4);
    assert.ok(profile.maturitySignals.length >= 4);
    assert.ok(profile.practices.length >= 4);
    assert.ok(profile.responseMoves.length >= 4);
  }
  assert.equal(new Set(profiles.map((profile) => profile.intent)).size, profiles.length);
  assert.equal(new Set(profiles.map((profile) => profile.lens)).size, profiles.length);
  assert.equal(new Set(profiles.map((profile) => profile.diagnosticTracks[0])).size, profiles.length);
  assert.equal(new Set(profiles.map((profile) => profile.practices[0])).size, profiles.length);
});

test("Ask visibly explains how the active lens reasons", () => {
  const panel = app.slice(app.indexOf("function CompanionPanel"), app.indexOf("function ScriptureChips"));
  assert.match(panel, /sectionId="active-mode-intelligence"/);
  assert.match(panel, /modeProfile\.diagnosticTracks\[0\]/);
  assert.match(panel, /modeProfile\.blindSpots\[0\]/);
  assert.match(panel, /modeProfile\.maturitySignals\[0\]/);
  assert.match(panel, /modeProfile\.practices\[0\]/);
});

test("AI counsel has an explicit mode-differentiation contract", () => {
  assert.match(openAi, /Make the selected mode materially change the reasoning/);
  assert.match(openAi, /Preserve mode boundaries/);
  assert.match(openAi, /Do not blend every lens into a generic response/);
});
