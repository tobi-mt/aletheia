import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDecisionDraftPrefill,
  detectPatterns,
  scoreDecision,
} from "../src/lib/decision-intelligence.ts";

test("decision signals retain explainable emotional-context patterns", () => {
  const signals = scoreDecision({
    pressure: "I feel ashamed, exhausted, and unable to say no.",
    emotion: "overwhelmed",
    counselSought: false,
    costCounted: false,
    alignmentClear: false,
    reversibleStep: false,
    peaceOverUrgency: false,
  });

  assert.deepEqual(signals.detectedPatterns.sort(), ["burnout", "overgiving", "shame"]);
  assert.equal(signals.emotionalPressure, 90);
  assert.ok(signals.readiness < 40);
  assert.equal(signals.nextFaithfulStep, "Bring this decision to one wise person before acting.");
});

test("urgency and fear cues produce a pressured draft without inventing certainty", () => {
  const draft = buildDecisionDraftPrefill(
    "Should I accept this urgent offer now? I am afraid it will disappear.",
    "Slow down and seek counsel before committing."
  );

  assert.equal(draft.emotion, "pressured");
  assert.match(draft.pressure, /urgency/);
  assert.deepEqual(detectPatterns(`${draft.title} ${draft.pressure}`).includes("urgency"), true);
});

test("generic counsel does not duplicate the decision question into the pressure field", () => {
  const draft = buildDecisionDraftPrefill(
    "How can I practice faithful stewardship with today's money and work choices?",
    "Begin with one calm next step and review it with someone you trust."
  );

  assert.match(draft.title, /practice faithful stewardship/i);
  assert.equal(draft.pressure, "");
});
