import assert from "node:assert/strict";
import test from "node:test";

import { BIOMETRIC_BACKGROUND_GRACE_MS, shouldLockAfterBackground } from "../src/lib/native-biometric-lifecycle.ts";

test("brief app switches stay unlocked without prompting for biometrics", () => {
  assert.equal(shouldLockAfterBackground(1_000, 1_000 + BIOMETRIC_BACKGROUND_GRACE_MS - 1), false);
});

test("long background periods require an explicit unlock", () => {
  assert.equal(shouldLockAfterBackground(1_000, 1_000 + BIOMETRIC_BACKGROUND_GRACE_MS), true);
  assert.equal(shouldLockAfterBackground(null, Date.now()), false);
});
