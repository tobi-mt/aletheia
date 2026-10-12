import assert from "node:assert/strict";
import test from "node:test";
import { suggestModeForQuestion } from "../src/lib/mode-suggestion.ts";

test("suggests a clearly better lens without changing an already fitting lens", () => {
  assert.deepEqual(
    suggestModeForQuestion("Should I accept this new job offer or stay in my current career?", "Money"),
    { mode: "Work", confidence: "high" },
  );
  assert.equal(
    suggestModeForQuestion("Should I accept this new job offer or stay in my current career?", "Work"),
    null,
  );
});

test("recognizes high-confidence money, generosity, life, and purpose questions", () => {
  assert.equal(suggestModeForQuestion("How should I pay off my credit card debt?", "Work")?.mode, "Money");
  assert.equal(suggestModeForQuestion("How much should I give to charity this month?", "Money")?.mode, "Generosity");
  assert.equal(suggestModeForQuestion("How can I forgive my family after this conflict?", "Money")?.mode, "Life");
  assert.equal(suggestModeForQuestion("I have lost my sense of direction and purpose in life.", "Money")?.mode, "Purpose");
  assert.equal(suggestModeForQuestion("Should I change my career this year?", "Money")?.mode, "Work");
});

test("stays quiet for vague or genuinely cross-mode questions", () => {
  assert.equal(suggestModeForQuestion("How do I make a wise choice?", "Money"), null);
  assert.equal(
    suggestModeForQuestion("Should I leave my job so I can pay off debt faster?", "Purpose"),
    null,
  );
});

test("supports distinctive questions in other app languages", () => {
  assert.equal(suggestModeForQuestion("¿Cómo puedo pagar deudas de mi tarjeta de crédito?", "Life")?.mode, "Money");
  assert.equal(suggestModeForQuestion("Soll ich dieses neue Jobangebot annehmen?", "Money")?.mode, "Work");
  assert.equal(suggestModeForQuestion("मुझे अपने परिवार के इस विवाद को कैसे सुलझाना चाहिए?", "Money")?.mode, "Life");
});
