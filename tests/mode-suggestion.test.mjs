import assert from "node:assert/strict";
import test from "node:test";
import { suggestModeForQuestion } from "../src/lib/mode-suggestion.ts";

test("suggests a clearly better lens without changing an already fitting lens", () => {
  assert.deepEqual(
    suggestModeForQuestion("Should I accept this new job offer or stay in my current career?", "Money"),
    { mode: "Work", confidence: "very_high", evidence: "explicit_phrase" },
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
  assert.equal(suggestModeForQuestion("How to navigate life purposefully?", "Money")?.mode, "Purpose");
  assert.equal(suggestModeForQuestion("Should I change my career this year?", "Money")?.mode, "Work");
  assert.deepEqual(
    suggestModeForQuestion("How do I become more productive at work?", "Money"),
    { mode: "Work", confidence: "very_high", evidence: "explicit_phrase" },
  );
});

test("combines multiple contextual clues instead of relying only on exact phrases", () => {
  assert.deepEqual(
    suggestModeForQuestion("My manager keeps adding project deadlines and meetings.", "Life"),
    { mode: "Work", confidence: "very_high", evidence: "context_pair" },
  );
  assert.deepEqual(
    suggestModeForQuestion("Our mortgage and retirement expenses need a clearer plan.", "Work"),
    { mode: "Money", confidence: "very_high", evidence: "multiple_signals" },
  );
  assert.deepEqual(
    suggestModeForQuestion("Grief and sleep are affecting my recovery.", "Work"),
    { mode: "Life", confidence: "very_high", evidence: "multiple_signals" },
  );
});

test("understands compositional paraphrases while requiring both intent and context", () => {
  assert.deepEqual(
    suggestModeForQuestion("How can I get more done and focus while working from home?", "Money"),
    { mode: "Work", confidence: "very_high", evidence: "context_pair" },
  );
  assert.deepEqual(
    suggestModeForQuestion("How can I delegate this project to my team more wisely?", "Life"),
    { mode: "Work", confidence: "very_high", evidence: "context_pair" },
  );
  assert.deepEqual(
    suggestModeForQuestion("I feel stuck and uncertain about my future direction.", "Money"),
    { mode: "Purpose", confidence: "very_high", evidence: "context_pair" },
  );
  assert.deepEqual(
    suggestModeForQuestion("Can I afford the cost of this house?", "Purpose"),
    { mode: "Money", confidence: "very_high", evidence: "context_pair" },
  );
  assert.equal(suggestModeForQuestion("How can I focus better during prayer?", "Money"), null);
  assert.equal(suggestModeForQuestion("I want to help my friend feel supported.", "Money"), null);
});

test("uses stronger hysteresis for follow-ups so the established lens is not changed casually", () => {
  assert.equal(
    suggestModeForQuestion("How should I handle this interview?", "Money", { followUp: true }),
    null,
  );
  assert.deepEqual(
    suggestModeForQuestion("How do I become more productive at work?", "Money", { followUp: true }),
    { mode: "Work", confidence: "very_high", evidence: "explicit_phrase" },
  );
  assert.deepEqual(
    suggestModeForQuestion("My manager added three project deadlines.", "Money", { followUp: true }),
    { mode: "Work", confidence: "very_high", evidence: "context_pair" },
  );
});

test("stays quiet for vague or genuinely cross-mode questions", () => {
  assert.equal(suggestModeForQuestion("How do I make a wise choice?", "Money"), null);
  assert.equal(
    suggestModeForQuestion("Should I leave my job so I can pay off debt faster?", "Purpose"),
    null,
  );
  assert.equal(suggestModeForQuestion("I want to be more productive with my mornings.", "Life"), null);
  assert.equal(suggestModeForQuestion("What does meaningful work look like in my life?", "Life"), null);
});

test("supports distinctive questions in other app languages", () => {
  assert.equal(suggestModeForQuestion("¿Cómo puedo pagar deudas de mi tarjeta de crédito?", "Life")?.mode, "Money");
  assert.equal(suggestModeForQuestion("Soll ich dieses neue Jobangebot annehmen?", "Money")?.mode, "Work");
  assert.equal(suggestModeForQuestion("मुझे अपने परिवार के इस विवाद को कैसे सुलझाना चाहिए?", "Money")?.mode, "Life");
});
