import assert from "node:assert/strict";
import test from "node:test";

import { assignExperimentVariant, experimentStorageKey, readExperimentVariant } from "../src/lib/product-experiments.ts";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
}

test("experiment assignment is stable for a person", () => {
  const storage = memoryStorage();
  assert.equal(assignExperimentVariant(storage, "activation_onboarding_v1", 0.2), "control");
  assert.equal(assignExperimentVariant(storage, "activation_onboarding_v1", 0.9), "control");
  assert.equal(readExperimentVariant(storage, "activation_onboarding_v1"), "control");
});

test("experiment split supports focused and ignores invalid stored values", () => {
  const experiment = "activation_onboarding_v1";
  const storage = memoryStorage({ [experimentStorageKey(experiment)]: "invalid" });
  assert.equal(readExperimentVariant(storage, experiment), null);
  assert.equal(assignExperimentVariant(storage, experiment, 0.8), "focused");
});
