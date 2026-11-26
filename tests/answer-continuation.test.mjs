import assert from "node:assert/strict";
import test from "node:test";
import { buildAnswerContinuation, continuationLabel } from "../src/lib/answer-continuation.ts";
import { composeCompanionCounsel } from "../src/lib/companion-counsel.ts";
import { scriptureCounselIndex } from "../src/lib/scripture-counsel-index.ts";
import { rankWisdomEvidence } from "../src/lib/wisdom.ts";
import { wisdomEntries } from "../src/lib/wisdom-data.ts";

test("continuation does not repackage an answer's instructions as a question", () => {
  const continuation = buildAnswerContinuation(
    "Should I accept more work?",
    "Your fatigue matters. A healthy boundary may be the wiser next step. Try naming the actual capacity you have.",
    "Work",
  );
  assert.equal(continuation, null);
});

test("continuation prefers the answer's psychologically calibrated diagnostic question", () => {
  const continuation = buildAnswerContinuation(
    "Should I accept a promotion when I already feel exhausted?",
    "The opportunity may be good, but capacity matters. A smaller experiment could reveal more than a rushed yes.",
    "Work",
    {
      safeTopic: "general",
      reasoningPlan: {
        tension: "Ambition and sustainable capacity",
        diagnosticQuestion: "Capacity: what would the user need to protect in a typical week?",
        nextStep: "Name the actual weekly capacity before deciding.",
      },
    },
  );
  assert.equal(continuation?.kind, "boundary");
  assert.equal(continuation?.direction, "What would you need to protect in a typical week?");
  assert.doesNotMatch(continuation?.prompt ?? "", /A smaller experiment could reveal/);
});

test("continuation is withheld in a crisis rather than adding engagement pressure", () => {
  assert.equal(buildAnswerContinuation(
    "I want to end my life.",
    "Please contact emergency help and stay with another person.",
    "Life",
    { safeTopic: "crisis", reasoningPlan: { diagnosticQuestion: "What feels unbearable right now?" } },
  ), null);
  assert.equal(buildAnswerContinuation(
    "Quiero morir.",
    "Habla ahora con alguien de confianza. ¿Puedes llamar a alguien?",
    "Life",
  ), null);
});

test("a localized diagnostic is kept whole rather than cutting off its qualifier", () => {
  const diagnosticQuestion = "القدرة: ما الذي يمكنك التفاوض بشأنه في هذا الدور الجديد حتى تحافظ على وقت كافٍ للراحة دون أن تتخلى عن فرصة تهمك؟";
  const continuation = buildAnswerContinuation("هل أقبل الترقية؟", "", "Work", {
    responseLanguage: "ar",
    reasoningPlan: { diagnosticQuestion },
  });

  const direction = diagnosticQuestion.split(": ")[1];
  assert.equal(continuation?.direction, direction);
  assert.ok(continuation?.prompt.includes(`"${direction}"`));
});

test("fixed workload leads to an open, new angle rather than another capacity verdict or negotiation", () => {
  const question = "I'm exhausted, but I was offered a promotion. The workload is fixed and no duties can be removed. Should I accept?";
  const nextStep = "If the role is unsustainable, decline it as offered.";
  const continuation = buildAnswerContinuation(question, nextStep, "Work", {
    reasoningPlan: { diagnosticQuestion: "What would you negotiate to make the new role sustainable?", nextStep },
  });
  assert.equal(continuation?.direction, "If you decline this offer, what would you want to keep open for your future at work?");
  assert.match(continuation.prompt, /The workload is fixed/);
  assert.match(continuation.prompt, /Previous advice \(already given\): "If the role is unsustainable, decline it as offered."/);
  assert.match(continuation.prompt, /Do not assume I made a choice/);
  const reply = composeCompanionCounsel(continuation.prompt, rankWisdomEvidence([...wisdomEntries, ...scriptureCounselIndex], continuation.prompt, "Work"));
  assert.match(reply.nextStep, /Name one part of the role you would still like to grow into/);
  assert.doesNotMatch(reply.nextStep, /can.t commit to the role|come off your plate/);
  assert.deepEqual(reply.sources.map(({ scripture }) => scripture), ["Colossians 3:23-24", "Proverbs 15:22"]);
  const ambiguous = buildAnswerContinuation(question.replace(" and no duties can be removed", ""), "", "Work");
  assert.doesNotMatch(ambiguous?.direction ?? "", /If you decline/);
});

test("generic, pressuring, and already answered prompts do not earn a continuation", () => {
  const question = "I'm torn about renewing my membership.";
  const answer = "Write down the monthly cost and cancellation deadline.";
  for (const diagnosticQuestion of [
    "",
    "What matters most to you?",
    "Are you sure you can pay the fee?",
    "Why can't you commit to the club?",
    "What is the monthly cost and cancellation deadline?",
    "What would you miss about the club, and how could you replace it?",
  ]) {
    assert.equal(buildAnswerContinuation(question, answer, "Life", { reasoningPlan: { diagnosticQuestion } }), null, diagnosticQuestion);
  }
});

test("deterministic continuation uses contextual copy in the response language or stays quiet", () => {
  const context = { responseLanguage: "es", routing: { route: "deterministic" } };
  const question = "Estoy agotada. Mi madre quiere que la visite cada fin de semana, pero necesito descansar.";
  assert.match(buildAnswerContinuation(question, "", "Life", context)?.direction ?? "", /^¿Qué forma de estar presente con tu familia/);
  assert.equal(buildAnswerContinuation(question, "", "Life", { ...context, responseLanguage: "ar" }), null);
});

test("repeated or stacked diagnostic questions do not override a useful follow-up", () => {
  const question = "Should I accept the promotion?";
  const nextQuestion = "What could you negotiate to make the new role sustainable?";
  for (const diagnosticQuestion of [question, "Do you want this role? What scares you?"]) {
    const continuation = buildAnswerContinuation(question, `${question} ${nextQuestion}`, "Work", {
      reasoningPlan: { diagnosticQuestion },
    });
    assert.equal(continuation?.direction, nextQuestion);
  }
  assert.equal(buildAnswerContinuation(question, "This is certainly an important decision for you.", "Work"), null);
});

test("legacy answers score relevance instead of selecting the first keyword hit", () => {
  const continuation = buildAnswerContinuation(
    "How can I stop making rushed money decisions from fear?",
    "Notice the numbers before acting. A boundary can sometimes help. What changes in this money decision when fear is no longer setting the deadline?",
    "Money",
  );
  assert.equal(continuation?.direction, "What changes in this money decision when fear is no longer setting the deadline?");
});

test("legacy counsel favors a reflection question over a general disclaimer", () => {
  const continuation = buildAnswerContinuation(
    "Should I accept the promotion?",
    "This is wisdom support, not professional advice, so review high-stakes decisions with qualified counsel. What would a sustainable week look like?",
    "Work",
  );
  assert.equal(continuation?.direction, "What would a sustainable week look like?");
});

test("continuations require a real question and bounded answer sentence", () => {
  assert.equal(buildAnswerContinuation("", "Try one small step.", "Purpose"), null);
  const completeLabel = continuationLabel("A very long direction ".repeat(10), "Continue");
  assert.doesNotMatch(completeLabel, /…$/);
  const label = continuationLabel("A very long direction ".repeat(10), "Continue", 58);
  assert.ok(label.length <= 70);
  assert.match(label, /…$/);
});
