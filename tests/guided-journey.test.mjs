import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  advanceGuidedJourney,
  GUIDED_JOURNEY_STEPS,
  markGuidedJourneyPresented,
  nextGuidedJourneyStep,
  parseGuidedJourneyState,
  startGuidedJourney,
} from "../src/lib/guided-journey.ts";

const dayOne = new Date(2026, 8, 28, 9);
const dayTwo = new Date(2026, 8, 29, 9);

test("the welcome gem counts as day one and no second gem appears that day", () => {
  const state = startGuidedJourney(dayOne);
  assert.equal(state.nextStepIndex, 1);
  assert.equal(nextGuidedJourneyStep(state, dayOne), null);
  assert.equal(nextGuidedJourneyStep(state, dayTwo), "today");
});

test("presenting a gem prevents repeat interruption until another local day", () => {
  const state = startGuidedJourney(dayOne);
  const presented = markGuidedJourneyPresented(state, dayTwo);
  assert.equal(nextGuidedJourneyStep(presented, dayTwo), null);
});

test("acknowledging gems advances once and completes after the seventh gem", () => {
  let state = startGuidedJourney(dayOne);
  for (let index = 1; index < GUIDED_JOURNEY_STEPS.length; index += 1) {
    state = advanceGuidedJourney(state);
  }
  assert.equal(state.nextStepIndex, GUIDED_JOURNEY_STEPS.length);
  assert.equal(nextGuidedJourneyStep(state, dayTwo), null);
});

test("invalid or future-shaped stored state is ignored safely", () => {
  assert.equal(parseGuidedJourneyState("not-json"), null);
  assert.equal(parseGuidedJourneyState(JSON.stringify({ version: 2, nextStepIndex: 1, lastPresentedDate: "2026-09-28" })), null);
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
  assert.doesNotMatch(client, /onboardingSetupNav/);
});
