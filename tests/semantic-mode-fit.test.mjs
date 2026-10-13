import assert from "node:assert/strict";
import test from "node:test";
import { calibrateSemanticModeFit, normalizeModeProbabilities } from "../src/lib/semantic-mode-fit.ts";

const clearWork = { Money: 0.06, Work: 0.78, Purpose: 0.06, Generosity: 0.03, Life: 0.07 };

test("calibrates a clear semantic winner against the selected lens", () => {
  assert.deepEqual(calibrateSemanticModeFit({ probabilities: clearWork, mixed: false, topic: "career_productivity" }, "Money"), {
    mode: "Work", confidence: "very_high", evidence: "semantic", topic: "career_productivity",
    leadingProbability: 0.78, selectedProbability: 0.06, margin: 0.72,
  });
});

test("retains the selected lens for mixed, low-confidence, and narrow-margin results", () => {
  assert.equal(calibrateSemanticModeFit({ probabilities: clearWork, mixed: true, topic: "mixed" }, "Money"), null);
  assert.equal(calibrateSemanticModeFit({ probabilities: { Money: 0.2, Work: 0.55, Purpose: 0.15, Generosity: 0.03, Life: 0.07 }, mixed: false, topic: "career" }, "Money"), null);
  assert.equal(calibrateSemanticModeFit({ probabilities: { Money: 0, Work: 0.62, Purpose: 0, Generosity: 0, Life: 0.38 }, mixed: false, topic: "career" }, "Life"), null);
});

test("rejects malformed probability distributions", () => {
  assert.equal(normalizeModeProbabilities({ ...clearWork, Work: 1.4 }), null);
  assert.equal(normalizeModeProbabilities({ Money: 0.1, Work: 0.2 }), null);
  assert.equal(normalizeModeProbabilities({ Money: 0.1, Work: 0.2, Purpose: 0.1, Generosity: 0.1, Life: 0.1 }), null);
});
