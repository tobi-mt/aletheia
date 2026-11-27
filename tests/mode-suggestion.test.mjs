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

test("classifies the underlying psychological need instead of only the surface topic", () => {
  assert.deepEqual(
    suggestModeForQuestion("I feel guilty saying no whenever my family asks me for money, and I am becoming resentful.", "Money"),
    { mode: "Generosity", confidence: "very_high", evidence: "explicit_phrase" },
  );
  assert.equal(
    suggestModeForQuestion("My job is consuming me and harming my marriage, but I am afraid to disappoint my boss.", "Work"),
    null,
  );
  assert.equal(
    suggestModeForQuestion("I keep chasing promotions because I need success to prove that I matter.", "Work")?.mode,
    "Purpose",
  );
  assert.equal(
    suggestModeForQuestion("I am anxious that I will never have enough money even though my budget is stable.", "Purpose")?.mode,
    "Money",
  );
  assert.equal(
    suggestModeForQuestion("I am ashamed of this habit and keep hiding it from everyone who cares about me.", "Money")?.mode,
    "Life",
  );
  assert.equal(
    suggestModeForQuestion("Everyone expects me to choose this path, but I am afraid it is not who I am becoming.", "Work")?.mode,
    "Purpose",
  );
});

test("supports distinctive questions in other app languages", () => {
  assert.equal(suggestModeForQuestion("¿Cómo puedo pagar deudas de mi tarjeta de crédito?", "Life")?.mode, "Money");
  assert.equal(suggestModeForQuestion("Soll ich dieses neue Jobangebot annehmen?", "Money")?.mode, "Work");
  assert.equal(suggestModeForQuestion("मुझे अपने परिवार के इस विवाद को कैसे सुलझाना चाहिए?", "Money")?.mode, "Life");
});

test("prioritizes the requested outcome over the same background and emotion", () => {
  const background = "My job, boss, project deadlines and promotion are stressing me out and hurting my marriage.";
  for (const [ask, expected] of [
    ["How can I rebuild trust with my spouse?", "Life"],
    ["How can I renegotiate my workload?", "Work"],
    ["How do I stop tying my worth to my promotion?", "Purpose"],
  ]) {
    assert.equal(suggestModeForQuestion(`${background} ${ask}`, "Money")?.mode, expected);
  }
  assert.equal(suggestModeForQuestion("I'm worried about rent and my savings. How do I say no when my brother keeps asking for money?", "Money")?.mode, "Generosity");
  assert.equal(suggestModeForQuestion("My family is upset and I feel guilty. How can I cover rent and bills?", "Generosity")?.mode, "Money");
  assert.equal(suggestModeForQuestion("Mi empleo y mi ascenso me preocupan. ¿Cómo puedo reconstruir mi matrimonio?", "Work")?.mode, "Life");
  assert.equal(suggestModeForQuestion("My relationship is on my mind. How can I rebuild my relationship with my manager and renegotiate my workload?", "Money")?.mode, "Work");
  assert.equal(suggestModeForQuestion("How can I repair my marriage without needing to renegotiate my hours?", "Money")?.mode, "Life");
});

test("does not switch when two explicit goals compete or a follow-up depends on prior context", () => {
  assert.equal(suggestModeForQuestion("How can I renegotiate my workload and rebuild trust with my spouse?", "Money"), null);
  assert.equal(suggestModeForQuestion("What if they keep mentioning my promotion and project deadlines?", "Life"), null);
  assert.equal(suggestModeForQuestion("What if they keep mentioning my promotion? How can I rebuild trust with my spouse?", "Work")?.mode, "Life");
  assert.equal(suggestModeForQuestion("The promotion is not what I want to discuss, but how can I repair my relationship?", "Work")?.mode, "Life");
});
