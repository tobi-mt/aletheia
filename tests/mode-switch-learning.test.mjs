import assert from "node:assert/strict";
import test from "node:test";
import {
  modeSwitchLearningStorageKey,
  recordModeSwitchFeedback,
  shouldApplyLearnedModeSuggestion,
} from "../src/lib/mode-switch-learning.ts";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

const highWork = { mode: "Work", confidence: "high", evidence: "distinct_signal", topic: "career" };
const explicitWork = { mode: "Work", confidence: "very_high", evidence: "explicit_phrase" };

test("learns repeated vetoes without storing question text", () => {
  const storage = memoryStorage();
  recordModeSwitchFeedback(storage, "Money", "Work", "career", "declined", 1000);
  assert.equal(shouldApplyLearnedModeSuggestion(storage, "Money", highWork, 1001), true);
  recordModeSwitchFeedback(storage, "Money", "Work", "career", "declined", 1002);
  assert.equal(shouldApplyLearnedModeSuggestion(storage, "Money", highWork, 1003), false);
  const serialized = storage.getItem(modeSwitchLearningStorageKey);
  assert.doesNotMatch(serialized, /question|productive|how do i/i);
});

test("requires more veto evidence to suppress an explicit very-high-confidence fit", () => {
  const storage = memoryStorage();
  recordModeSwitchFeedback(storage, "Money", "Work", "explicit_phrase", "declined", 1000);
  recordModeSwitchFeedback(storage, "Money", "Work", "explicit_phrase", "declined", 1001);
  assert.equal(shouldApplyLearnedModeSuggestion(storage, "Money", explicitWork, 1002), true);
  recordModeSwitchFeedback(storage, "Money", "Work", "explicit_phrase", "declined", 1003);
  assert.equal(shouldApplyLearnedModeSuggestion(storage, "Money", explicitWork, 1004), false);
});

test("accepted recommendations offset prior vetoes and old feedback expires", () => {
  const storage = memoryStorage();
  recordModeSwitchFeedback(storage, "Money", "Work", "distinct_signal", "declined", 1000);
  recordModeSwitchFeedback(storage, "Money", "Work", "distinct_signal", "declined", 1001);
  recordModeSwitchFeedback(storage, "Money", "Work", "distinct_signal", "accepted", 1002);
  assert.equal(shouldApplyLearnedModeSuggestion(storage, "Money", highWork, 1003), true);
  const afterNinetyDays = 1003 + 91 * 24 * 60 * 60 * 1000;
  assert.equal(shouldApplyLearnedModeSuggestion(storage, "Money", highWork, afterNinetyDays), true);
});
