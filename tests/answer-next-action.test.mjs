import assert from "node:assert/strict";
import test from "node:test";

import { recommendAnswerNextAction } from "../src/lib/answer-next-action.ts";

test("slows high-pressure decisions before other recommendations", () => {
  assert.equal(recommendAnswerNextAction("I need to decide right now and I am panicking"), "wait");
});

test("routes relational discernment toward trusted counsel", () => {
  assert.equal(recommendAnswerNextAction("How should I handle this conflict with my spouse?"), "counsel");
});

test("routes formation concerns toward reflection", () => {
  assert.equal(recommendAnswerNextAction("How can I rebuild a healthy prayer habit?"), "reflection");
});

test("routes concrete choices toward decision tracking", () => {
  assert.equal(recommendAnswerNextAction("Should I accept this job offer?"), "decision");
});
