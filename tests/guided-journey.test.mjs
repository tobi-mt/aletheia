import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  advanceGuidedJourney,
  GUIDED_JOURNEY_STEPS,
  markGuidedJourneyPresented,
  nextGuidedJourneyStep,
  parseGuidedJourneyState,
  prioritizeGuidedJourneySteps,
  startGuidedJourney,
} from "../src/lib/guided-journey.ts";

const dayOne = new Date(2026, 8, 28, 9);
const dayTwo = new Date(2026, 8, 29, 9);

test("the welcome gem counts as day one and no second gem appears that day", () => {
  const state = startGuidedJourney(dayOne);
  assert.deepEqual(state.seenStepIds, ["welcome"]);
  assert.equal(nextGuidedJourneyStep(state, dayOne), null);
  assert.equal(nextGuidedJourneyStep(state, dayTwo), "today");
});

test("presenting a gem prevents repeat interruption until another local day", () => {
  const state = startGuidedJourney(dayOne);
  const presented = markGuidedJourneyPresented(state, dayTwo);
  assert.equal(nextGuidedJourneyStep(presented, dayTwo), null);
});

test("acknowledging gems records stable IDs and exhausts the current catalog", () => {
  let state = startGuidedJourney(dayOne);
  for (let index = 1; index < GUIDED_JOURNEY_STEPS.length; index += 1) {
    state = advanceGuidedJourney(state, GUIDED_JOURNEY_STEPS[index]);
  }
  assert.deepEqual(state.seenStepIds, GUIDED_JOURNEY_STEPS);
  assert.equal(nextGuidedJourneyStep(state, dayTwo), null);
});

test("legacy position state migrates to stable gem IDs", () => {
  const state = parseGuidedJourneyState(JSON.stringify({ version: 1, nextStepIndex: 3, lastPresentedDate: "2026-09-28" }));
  assert.deepEqual(state?.seenStepIds, ["welcome", "today", "ask"]);
  assert.equal(state?.version, 2);
});

test("less-used unseen features are discovered first", () => {
  const state = advanceGuidedJourney(startGuidedJourney(dayOne), "today");
  const priority = prioritizeGuidedJourneySteps({ ask: 8, decisions: 0, reflect: 3, library: 1, account: 1, today: 10 });
  assert.equal(nextGuidedJourneyStep(state, dayTwo, priority), "decisions");
});

test("invalid or future-shaped stored state is ignored safely", () => {
  assert.equal(parseGuidedJourneyState("not-json"), null);
  assert.equal(parseGuidedJourneyState(JSON.stringify({ version: 3, seenStepIds: ["welcome"], lastPresentedDate: "2026-09-28" })), null);
  assert.equal(parseGuidedJourneyState(JSON.stringify({ version: 2, seenStepIds: ["unknown"], lastPresentedDate: "2026-09-28" })), null);
  assert.equal(parseGuidedJourneyState(JSON.stringify({ version: 1, nextStepIndex: 99, lastPresentedDate: "2026-09-28" })), null);
});

test("the UI keeps the journey optional and out of active work", async () => {
  const client = await readFile(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8");
  assert.match(client, /<ProgressiveOnboardingModal/);
  assert.match(client, /<GuidedJourneyNudge/);
  assert.match(client, /focused instanceof HTMLTextAreaElement/);
  assert.match(client, /isWorking \|\|[\s\S]{0,100}isListening \|\|[\s\S]{0,100}isSpeaking/);
  assert.match(client, /onDismiss=\{\(\) => closeGuidedJourneyStep\("dismissed"\)\}/);
  assert.match(client, /setQuery\(onboardingConcern\.trim\(\)\)/);
  assert.doesNotMatch(client, /gem_number/);
  assert.doesNotMatch(client, /guidedJourney\.progress"\)\.replace/);
  assert.doesNotMatch(client, /onboardingSetupNav/);
});
