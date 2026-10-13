import assert from "node:assert/strict";
import test from "node:test";
import { modeFitPolicyForIdentity } from "../src/lib/mode-fit-rollout.ts";

test("mode-fit shadow assignment is stable and respects rollout boundaries", () => {
  assert.equal(modeFitPolicyForIdentity("person-a", 100), "shadow");
  assert.equal(modeFitPolicyForIdentity("person-a", 0), "live");
  assert.equal(modeFitPolicyForIdentity("person-a", 35), modeFitPolicyForIdentity("person-a", 35));
});

test("invalid shadow percentages fail safely into a bounded rollout", () => {
  assert.equal(modeFitPolicyForIdentity("person-a", Number.NaN), "live");
  assert.equal(modeFitPolicyForIdentity("person-a", -20), "live");
  assert.equal(modeFitPolicyForIdentity("person-a", 120), "shadow");
});
