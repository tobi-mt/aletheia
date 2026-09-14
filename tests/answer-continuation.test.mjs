import assert from "node:assert/strict";
import test from "node:test";
import { buildAnswerContinuation, continuationLabel } from "../src/lib/answer-continuation.ts";

test("continuation follows a concrete direction from the answer", () => {
  const continuation = buildAnswerContinuation(
    "Should I accept more work?",
    "Your fatigue matters. A healthy boundary may be the wiser next step. Try naming the actual capacity you have.",
    "Work",
  );
  assert.equal(continuation?.kind, "boundary");
  assert.match(continuation?.prompt ?? "", /healthy boundary/);
  assert.match(continuation?.prompt ?? "", /without claiming certainty/);
});

test("continuations require a real question and bounded answer sentence", () => {
  assert.equal(buildAnswerContinuation("", "Try one small step.", "Purpose"), null);
  const completeLabel = continuationLabel("A very long direction ".repeat(10), "Continue");
  assert.doesNotMatch(completeLabel, /…$/);
  const label = continuationLabel("A very long direction ".repeat(10), "Continue", 58);
  assert.ok(label.length <= 70);
  assert.match(label, /…$/);
});
