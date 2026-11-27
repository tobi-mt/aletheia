import assert from "node:assert/strict";
import test from "node:test";
import OpenAI from "openai";
import { rankWisdomEvidence } from "../src/lib/wisdom.ts";
import { assembleCompanionDraft, requiredBiblicalEvidenceCount, resolveUnifiedRecommendedMode, validateWisdomIntelligence } from "../src/lib/wisdom-intelligence.ts";
import { defaultPreferences, normalizePreferences } from "../src/lib/localization.ts";
import { readFileSync } from "node:fs";
import { scriptureTextMatches } from "../src/lib/scripture-text-matches.ts";

const intelligenceSource = readFileSync(new URL("../src/lib/wisdom-intelligence.ts", import.meta.url), "utf8");
const modeFitRouteSource = readFileSync(new URL("../src/app/api/chat/mode-fit/route.ts", import.meta.url), "utf8");

const sources = [
  { theme: "Stewardship", scripture: "Proverbs 21:5", principle: "Patient planning matters.", context: "Planning", application: "Write the plan.", keywords: ["plan", "money"], emotions: ["pressure"], questions: ["What is the next step?"] },
  { theme: "Counsel", scripture: "Proverbs 15:22", principle: "Plans benefit from counsel.", context: "Counsel", application: "Invite review.", keywords: ["work", "plan"], emotions: ["hope"], questions: ["Who can test this?"] },
  { theme: "Contentment", scripture: "Luke 14:28", principle: "Count the cost.", context: "Cost", application: "Name the tradeoffs.", keywords: ["cost", "work"], emotions: ["pressure"], questions: ["What will this cost?"] },
];

test("evidence ranking combines mode, emotional, question, and scripture-diversity signals", () => {
  const ranked = rankWisdomEvidence(sources, "Should I rush this work plan while anxious?", "Work", 3);
  assert.equal(ranked.length, 3);
  assert.equal(new Set(ranked.map((source) => source.scripture.replace(/\s+\d.*$/, ""))).size, 2);
  assert.ok(ranked.some((source) => source.scripture === "Luke 14:28"));
});

test("model counsel retries an ungrounded citation and accepts four grounded, linkable citations", async (t) => {
  const available = [...sources, { scripture: "James 1:5", theme: "Wisdom" }];
  const questionDetail = "take on a new project";
  const connections = [
    "The proverb values diligent planning, so sketch how you would use your time before you take on a new project.",
    "Before you take on a new project, this proverb suggests that trusted counsel can uncover assumptions you missed.",
    "Jesus uses counting the cost to teach about discipleship; name the sacrifices before you take on a new project.",
    "James encourages asking God for wisdom rather than rushing to take on a new project.",
  ];
  const draft = {
    responseLanguage: "en", recommendedMode: "Purpose",
    probabilities: { Money: 0.05, Work: 0.1, Purpose: 0.75, Generosity: 0.05, Life: 0.05 },
    ambiguity: { mixed: false, uncertain: false, alternativeMode: null, reason: "This is primarily a question of calling and identity." },
    safeTopic: "general", opening: "You want to commit to a useful project without overlooking what it will cost.",
    reasoningPlan: { tension: "The work matters, but your time is finite.", diagnosticQuestion: "", blindSpot: "An appealing idea can crowd out existing duties.", maturitySignal: "Be clear about the time you can offer.", nextStep: "Write down which existing responsibility would need to move." },
    biblicalEvidence: available.map(({ scripture }, i) => ({ reference: scripture, questionDetail, connection: connections[i] })),
  };
  const requests = [];
  t.mock.method(OpenAI.prototype, "post", (_path, options) => {
    requests.push(options.body);
    const invalidDraft = { ...draft, biblicalEvidence: [...draft.biblicalEvidence.slice(0, -1), {
      ...draft.biblicalEvidence.at(-1), connection: "James encourages those who lack wisdom to ask God for it.",
    }] };
    const response = { output_text: JSON.stringify(requests.length === 1 ? invalidDraft : draft), output: [] };
    return { _thenUnwrap: (unwrap) => Promise.resolve(unwrap(response)) };
  });

  const env = { ...process.env, OPENAI_API_KEY: "test-key", OPENAI_BASE_URL: "http://127.0.0.1:1/v1" };
  const originalEnv = process.env;
  let generateWisdomIntelligence;
  try {
    process.env = env;
    ({ generateWisdomIntelligence } = await import("../src/lib/wisdom-intelligence.ts?scripture-count-test"));
  } finally {
    process.env = originalEnv;
  }
  const result = await generateWisdomIntelligence({
    question: "How should I renegotiate my workload so I have time to take on a new project at work?",
    selectedMode: "Money", sources: available, preferences: defaultPreferences,
  });
  assert.equal(result.routing.route, "secondary");
  assert.equal(requests.length, 2);
  assert.equal(result.recommendedMode, "Work");
  assert.equal(result.ambiguity.reason, "");
  assert.match(requests[1].input[0].content, /failed checks: questionGrounding/);
  assert.equal(requests[0].text.format.schema.properties.biblicalEvidence.maxItems, undefined);
  assert.deepEqual(scriptureTextMatches(result.counsel, available.map(({ scripture }) => scripture), "en").map(({ scripture }) => scripture),
    available.map(({ scripture }) => scripture));
});

test("localized medical counsel passes on primary; incidental English words cannot stand in for the boundary", async (t) => {
  const preferences = normalizePreferences({ language: "es" });
  const question = "¿Cómo puedo hablar de mis síntomas si me cuesta pedir ayuda?";
  const draft = {
    responseLanguage: "es", recommendedMode: "Life",
    probabilities: { Life: 0.8, Work: 0.05, Money: 0.05, Purpose: 0.05, Generosity: 0.05 },
    ambiguity: { mixed: false, uncertain: false, alternativeMode: null, reason: "Le cuesta pedir ayuda para sus síntomas." },
    safeTopic: "medical", opening: "Quieres hablar de lo que te pasa, pero pedir ayuda te cuesta.",
    reasoningPlan: { tension: "Quieres explicar lo que te pasa.", diagnosticQuestion: "", blindSpot: "No tienes que encontrar las palabras perfectas.", maturitySignal: "Puedes pedir apoyo sin tener todas las respuestas.", nextStep: "Anota cuándo empezaron los síntomas y qué quieres preguntar." },
    biblicalEvidence: [{
      reference: "Proverbs 15:22", questionDetail: "mis síntomas",
      connection: "El proverbio valora pedir consejo. Puedes decir «me cuesta hablar de mis síntomas» al comienzo de la conversación.",
    }],
  };
  const post = t.mock.method(OpenAI.prototype, "post", () => ({
    _thenUnwrap: (unwrap) => Promise.resolve(unwrap({ output_text: JSON.stringify(draft), output: [] })),
  }));
  const env = process.env;
  process.env = { ...env, OPENAI_API_KEY: "test-key" };
  t.after(() => { process.env = env; });
  const { generateWisdomIntelligence } = await import("../src/lib/wisdom-intelligence.ts?localized-safety");
  const result = await generateWisdomIntelligence({ question, selectedMode: "Life", sources, preferences });
  assert.equal(post.mock.callCount(), 1);
  assert.equal(result.routing.route, "primary");
  assert.equal(result.quality.passed, true);
  const boundary = result.counsel.split("\n\n")[2];
  assert.match(boundary, /consulta a un profesional sanitario cualificado/);
  const withoutBoundary = { ...result, counsel: result.counsel.replace(boundary, "A trusted friend is available.") };
  assert.equal(validateWisdomIntelligence(withoutBoundary, sources, preferences, 1).checks.safetyBoundary, false);
  const unsafeCertainty = { ...result, counsel: `${result.counsel}\n\nGod promises you this will be cured.` };
  assert.equal(validateWisdomIntelligence(unsafeCertainty, sources, preferences, 1).passed, false);
});

test("an exhausted secondary deadline falls back without resetting the shared provider budget", async (t) => {
  const env = process.env;
  process.env = { ...env, OPENAI_API_KEY: "test-key", OPENAI_WISDOM_MODEL: "primary-test", OPENAI_WISDOM_FALLBACK_MODEL: "secondary-test" };
  t.after(() => { process.env = env; });
  let clock = 0;
  t.mock.method(performance, "now", () => clock);
  let controller;
  const timers = t.mock.method(AbortSignal, "timeout", () => {
    controller = new AbortController();
    return controller.signal;
  });
  const warnings = t.mock.method(console, "warn", () => {});
  const post = t.mock.method(OpenAI.prototype, "post", (_path, options) => ({
    _thenUnwrap: () => {
      if (options.body.model === "primary-test") {
        clock = 9000;
        return Promise.resolve({ output_text: "{}", output: [] });
      }
      controller.abort(new DOMException("Timed out", "TimeoutError"));
      return Promise.reject(options.signal.reason);
    },
  }));
  const { generateWisdomIntelligence } = await import("../src/lib/wisdom-intelligence.ts?shared-deadline");
  const params = { question: "Should I change this work plan?", selectedMode: "Work", sources, preferences: defaultPreferences };
  const result = await generateWisdomIntelligence(params);
  assert.equal(result.routing.route, "deterministic");
  assert.equal(result.routing.attempts, 2);
  assert.deepEqual(timers.mock.calls.map(({ arguments: args }) => args[0]), [11000, 9000]);
  assert.equal(warnings.mock.calls.at(-1).arguments[1].reason, "timeout");
  process.env.OPENAI_WISDOM_MODEL = "secondary-test";
  assert.equal((await generateWisdomIntelligence(params)).routing.attempts, 1);
  assert.equal(post.mock.callCount(), 3);
  const crisis = await generateWisdomIntelligence({ ...params, question: "I am in immediate danger." });
  assert.equal(crisis.routing.attempts, 0);
  assert.match(crisis.counsel.split("\n\n")[0], /contact local emergency services now/);
  assert.equal(post.mock.callCount(), 3);
});

test("offline counsel keeps directly requested approved passages without padding", async () => {
  const { composeCompanionCounsel } = await import("../src/lib/companion-counsel.ts");
  const unrelated = { ...sources[0], scripture: "Mark 6:31" };
  const result = composeCompanionCounsel("How does Proverbs 15:22 help me decide?", [unrelated, ...sources]);
  assert.deepEqual(result.sources.map(({ scripture }) => scripture), ["Proverbs 15:22"]);
});

test("offline counsel skips broad keyword matches when a specific passage fits", async () => {
  const { composeCompanionCounsel } = await import("../src/lib/companion-counsel.ts");
  const cost = { ...sources[2], keywords: ["childcare"] };
  const result = composeCompanionCounsel("Can I take on more work without losing time for childcare?", [sources[1], cost]);
  assert.deepEqual(result.sources.map(({ scripture }) => scripture), ["Luke 14:28"]);
});

test("a dominant primary lens switches even when secondary context makes the question mixed", () => {
  assert.equal(resolveUnifiedRecommendedMode({ Money: 0.08, Work: 0.73, Purpose: 0.1, Generosity: 0.02, Life: 0.07 }, "Money", true), "Work");
  assert.equal(resolveUnifiedRecommendedMode({ Money: 0.16, Work: 0.52, Purpose: 0.14, Generosity: 0.03, Life: 0.15 }, "Money", true), "Work");
  assert.equal(resolveUnifiedRecommendedMode({ Money: 0.26, Work: 0.48, Purpose: 0.18, Generosity: 0.03, Life: 0.05 }, "Money", true), "Money");
});

test("quality gate accepts grounded mode-specific counsel", () => {
  const result = {
    responseLanguage: "en",
    recommendedMode: "Work",
    probabilities: { Money: 0.05, Work: 0.72, Purpose: 0.1, Generosity: 0.03, Life: 0.1 },
    ambiguity: { mixed: false, uncertain: false, alternativeMode: "Purpose", reason: "The central decision concerns vocation and capacity." },
    safeTopic: "general",
    reasoningPlan: {
      tension: "The opportunity is competing with sustainable capacity.",
      diagnosticQuestion: "What happens if the work takes twice as long?",
      blindSpot: "Restlessness can look like a new calling.",
      maturitySignal: "The tradeoffs remain honest after patient review.",
      nextStep: "Write the smallest reversible experiment and ask a trusted critic to review it.",
    },
    biblicalEvidence: [
      { reference: "Proverbs 15:22", connection: "Proverbs 15:22 points toward tested counsel" },
      { reference: "Luke 14:28", connection: "Luke 14:28 asks you to count the real cost" },
    ],
    counsel: "This deserves patient attention rather than a rushed yes. Proverbs 15:22 points toward tested counsel, while Luke 14:28 asks you to count the real cost. Write the smallest reversible experiment, name its time and relationship costs, and ask one grounded person to challenge the fragile assumptions before you commit.",
  };
  assert.equal(validateWisdomIntelligence(result, sources, defaultPreferences, 2).passed, true);
  const listOfReferences = {
    ...result,
    counsel: "This deserves patient attention rather than a rushed yes. Proverbs 15:22; Luke 14:28. Write the smallest reversible experiment, name its time and relationship costs, and ask one grounded person to challenge the fragile assumptions before you commit.",
  };
  assert.equal(validateWisdomIntelligence(listOfReferences, sources, defaultPreferences, 2).checks.biblicalGrounding, false);
});

test("structured prose produces the same localized citation in visible counsel and evidence", () => {
  const preferences = normalizePreferences({ language: "es" });
  const nextStep = "Propón una fecha que puedas sostener y dísela con cariño.";
  const explanation = "Jesús invita a sus discípulos a descansar en medio de muchas demandas. Puedes ofrecer otra fecha sin renunciar al cariño.";
  const draft = {
    responseLanguage: "es",
    recommendedMode: "Life",
    probabilities: { Life: 0.8, Work: 0.05, Money: 0.05, Purpose: 0.05, Generosity: 0.05 },
    ambiguity: { mixed: false, uncertain: false, alternativeMode: null, reason: "Hay una tensión entre cuidar la relación y descansar." },
    safeTopic: "general",
    opening: "Puedes querer ver a tu madre y también necesitar tiempo para descansar.",
    reasoningPlan: { tension: "Cuidar la relación sin renunciar al descanso.", diagnosticQuestion: "¿Qué frecuencia de visitas podrías sostener?", blindSpot: "La culpa no siempre indica una obligación.", maturitySignal: "Expresa cariño sin prometer lo que no puedes cumplir.", nextStep },
    biblicalEvidence: [{ reference: "Mark 6:31", connection: explanation }],
  };
  const result = assembleCompanionDraft(draft, preferences, "¿Cómo puedo hablar con mi madre sobre las visitas?");
  assert.deepEqual(result.counsel.split("\n\n"), [draft.opening, `Marcos 6:31 — ${explanation}`, nextStep]);
  assert.equal(validateWisdomIntelligence(result, [{ scripture: "Mark 6:31" }], preferences, 1).passed, true);
  assert.equal(validateWisdomIntelligence(result, [{ scripture: "Luke 14:28" }], preferences, 1).checks.biblicalGrounding, false);
  const closed = assembleCompanionDraft({
    ...draft, responseLanguage: "en", recommendedMode: "Work",
    reasoningPlan: { ...draft.reasoningPlan, nextStep: "Ask your manager whether they can adjust your responsibilities." },
  }, defaultPreferences, "I'm exhausted and my manager won't remove any duties if I take the promotion. What do I say?");
  assert.match(closed.counsel.split("\n\n").at(-1), /Thank you.*can’t commit/);
  assert.doesNotMatch(closed.counsel, /ask your manager/i);
});

test("quality gate rejects invented references, false certainty, and boundary failures", () => {
  const result = {
    responseLanguage: "en",
    recommendedMode: "Money",
    probabilities: { Money: 0.8, Work: 0.05, Purpose: 0.05, Generosity: 0.05, Life: 0.05 },
    ambiguity: { mixed: false, uncertain: false, alternativeMode: null, reason: "Financial decision." },
    safeTopic: "financial",
    reasoningPlan: { tension: "Financial pressure needs attention.", diagnosticQuestion: "What is the true cost?", blindSpot: "Debt capacity is not permission.", maturitySignal: "The numbers remain visible.", nextStep: "Write down the complete repayment plan today." },
    biblicalEvidence: [{ reference: "Philippians 4:99", connection: "Philippians 4:99 supposedly guarantees this result" }],
    counsel: "God promises you this investment certainly will succeed. Philippians 4:99 proves it, so act immediately on your own. This sentence is deliberately long enough to reach the specificity threshold while remaining unsafe and unsupported for the validator regression test.",
  };
  const quality = validateWisdomIntelligence(result, sources, defaultPreferences, 1);
  assert.equal(quality.passed, false);
  assert.equal(quality.checks.biblicalGrounding, false);
  assert.equal(quality.checks.calibratedCertainty, false);
  assert.equal(quality.checks.safetyBoundary, false);
});

test("quality gate rejects a response that declares a different language than the app locale", () => {
  const result = {
    responseLanguage: "en",
    recommendedMode: "Work",
    probabilities: { Money: 0.05, Work: 0.72, Purpose: 0.1, Generosity: 0.03, Life: 0.1 },
    ambiguity: { mixed: false, uncertain: false, alternativeMode: null, reason: "The decision concerns sustainable work." },
    safeTopic: "general",
    reasoningPlan: {
      tension: "The opportunity is competing with sustainable capacity.",
      diagnosticQuestion: "What happens if the work takes twice as long?",
      blindSpot: "Restlessness can look like a new calling.",
      maturitySignal: "The tradeoffs remain honest after patient review.",
      nextStep: "Write the smallest reversible experiment and ask a trusted critic to review it.",
    },
    biblicalEvidence: [{ reference: "Proverbs 15:22", connection: "Proverbs 15:22 points toward tested counsel" }],
    counsel: "This deserves patient attention rather than a rushed answer. Proverbs 15:22 points toward tested counsel. Write the smallest reversible experiment, name its real costs, and ask one grounded person to challenge the fragile assumptions before you commit to the opportunity.",
  };
  const quality = validateWisdomIntelligence(result, sources, normalizePreferences({ language: "de" }), 1);
  assert.equal(quality.passed, false);
  assert.equal(quality.checks.responseLanguage, false);
});

test("quality gate rejects counsel with no biblical evidence", () => {
  const result = {
    responseLanguage: "en",
    recommendedMode: "Purpose",
    probabilities: { Money: 0.05, Work: 0.1, Purpose: 0.72, Generosity: 0.03, Life: 0.1 },
    ambiguity: { mixed: false, uncertain: false, alternativeMode: null, reason: "The question concerns direction." },
    safeTopic: "general",
    reasoningPlan: {
      tension: "Direction needs patient discernment.", diagnosticQuestion: "Which motive is strongest?",
      blindSpot: "Urgency can imitate clarity.", maturitySignal: "The direction remains peaceful after waiting.",
      nextStep: "Write down the smallest faithful next step.",
    },
    biblicalEvidence: [],
    counsel: "Slow down, clarify your values, and take one proportionate next step. Ask a trusted person to challenge your assumptions before you make a commitment that would be difficult to reverse. Give the decision time rather than treating urgency as proof of clarity.",
  };
  const quality = validateWisdomIntelligence(result, sources, defaultPreferences, 1);
  assert.equal(quality.passed, false);
  assert.equal(quality.checks.biblicalGrounding, false);
});

test("biblical evidence requirements scale with question substance and preserve a crisis reference", () => {
  assert.equal(requiredBiblicalEvidenceCount("Should I wait?", 8, "general"), 1);
  assert.equal(requiredBiblicalEvidenceCount("How should I weigh this opportunity, its cost, my motives, and its effect on my family?", 8, "general"), 2);
  assert.equal(requiredBiblicalEvidenceCount("I may hurt myself", 8, "crisis"), 1);
  assert.equal(requiredBiblicalEvidenceCount("Any question", 0, "general"), 0);
});

test("auto-fit classifies the underlying need without inventing a diagnosis", () => {
  assert.match(intelligenceSource, /distinguish the outcome requested, the situation causing it, and any tension the person actually expressed/);
  assert.match(intelligenceSource, /Do not infer diagnoses, hidden motives, or personal history/);
  assert.match(intelligenceSource, /setting a limit on repeated financial help is Generosity/);
  assert.match(intelligenceSource, /repairing a marriage strained by those hours is Life/);
  assert.match(intelligenceSource, /In ambiguity\.reason, explain the concrete need in plain language/);
  assert.match(modeFitRouteSource, /Consider expressed emotion, motive, pressure, desired change, and relational stakes/);
});
