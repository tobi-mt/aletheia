import assert from "node:assert/strict";
import test from "node:test";
import OpenAI from "openai";
import { postChat } from "../src/app/api/chat/route.ts";
import { defaultPreferences } from "../src/lib/localization.ts";
import { generateWisdomIntelligence } from "../src/lib/wisdom-intelligence.ts";
import { scriptureCounselIndex } from "../src/lib/scripture-counsel-index.ts";
import { suggestModeForQuestion } from "../src/lib/mode-suggestion.ts";
import multilingualCases from "./fixtures/mode-fit-multilingual.json" with { type: "json" };

const modes = ["Money", "Work", "Purpose", "Generosity", "Life"];
const probabilitiesFor = (leader) => Object.fromEntries(modes.map((mode) => [mode, mode === leader ? 0.84 : 0.04]));
const fitFor = (mode, extra = {}) => ({
  available: true, recommendedMode: mode, probabilities: probabilitiesFor(mode),
  mixed: false, uncertain: false, continuesSelectedGoal: false, topic: "general", ...extra,
});

function request(question, extra = {}) {
  return new Request("http://localhost/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: question, mode: "Money",
      preferences: { ...defaultPreferences, thirdPartyAiConsent: true }, ...extra }),
  });
}

test("runtime semantic routing accepts model judgments across every lens and keeps ambiguity or continuation stable", async (t) => {
  const env = process.env;
  process.env = { ...env, OPENAI_API_KEY: "test-key" };
  t.after(() => { process.env = env; });
  const requests = [];
  let output;
  t.mock.method(OpenAI.prototype, "post", (_path, options) => {
    requests.push(options.body);
    return { _thenUnwrap: (unwrap) => Promise.resolve(unwrap({ output_text: JSON.stringify(output), output: [] })) };
  });

  const { classifyModeAtRuntime } = await import("../src/lib/runtime-mode-fit.ts?semantic-routing");
  const cases = [
    ["Money", "There is more month than paycheck. How can I make the essentials last?"],
    ["Work", "The queue never empties. How can I negotiate what actually belongs on my plate?"],
    ["Purpose", "When nobody applauds me, I no longer know who I am. Where can I find a steadier sense of self?"],
    ["Generosity", "Each yes leaves me with less room to breathe. How do I offer help without becoming the permanent rescue plan?"],
    ["Life", "We share a roof but hardly a conversation. How can we find our way back to each other?"],
  ];
  for (const [mode, question] of cases) {
    const selectedMode = mode === "Money" ? "Work" : "Money";
    output = { probabilities: probabilitiesFor(mode), mixed: false, uncertain: false, continuesSelectedGoal: false, topic: "general" };
    const result = await classifyModeAtRuntime({ question, selectedMode, allowModel: true });
    assert.equal(result.recommendedMode, mode, question);
    assert.ok(requests.at(-1).input[1].content.includes(question));
  }
  output = { probabilities: probabilitiesFor("Life"), mixed: false, uncertain: true, continuesSelectedGoal: false, topic: "general" };
  assert.equal((await classifyModeAtRuntime({ question: "What should change?", selectedMode: "Work", allowModel: true })).recommendedMode, "Work");
  output = { ...output, uncertain: false, continuesSelectedGoal: true };
  assert.equal((await classifyModeAtRuntime({ question: "What if that is not possible?", selectedMode: "Work", allowModel: true })).recommendedMode, "Work");
  output = { ...output, continuesSelectedGoal: false, mixed: true,
    probabilities: { Money: 0.45, Work: 0.45, Purpose: 0.04, Generosity: 0.03, Life: 0.03 } };
  assert.equal((await classifyModeAtRuntime({ question: "Two goals pull me in opposite directions.", selectedMode: "Money", allowModel: true })).recommendedMode, "Money");
});

test("classifier consent, remote disable, and shared deadline prevent provider calls; invalid probabilities fail explicitly", async (t) => {
  const env = process.env;
  process.env = { ...env, OPENAI_API_KEY: "test-key" };
  t.after(() => { process.env = env; });
  const post = t.mock.method(OpenAI.prototype, "post", () => ({
    _thenUnwrap: (unwrap) => Promise.resolve(unwrap({ output_text: JSON.stringify({
      probabilities: { ...probabilitiesFor("Work"), Work: "0.84" }, mixed: false,
      uncertain: false, continuesSelectedGoal: false, topic: "general",
    }), output: [] })),
  }));
  const warning = t.mock.method(console, "warn", () => {});
  const { classifyModeAtRuntime } = await import("../src/lib/runtime-mode-fit.ts?semantic-guards");
  const params = { question: "A private question that must not be logged.", selectedMode: "Money", allowModel: true };
  assert.deepEqual(await classifyModeAtRuntime({ ...params, allowModel: false }), { available: false });
  process.env.SEMANTIC_MODE_FIT_ENABLED = "false";
  assert.deepEqual(await classifyModeAtRuntime(params), { available: false });
  delete process.env.SEMANTIC_MODE_FIT_ENABLED;
  assert.deepEqual(await classifyModeAtRuntime({ ...params, deadline: performance.now() - 1 }), { available: false });
  assert.equal(post.mock.callCount(), 0);
  assert.deepEqual(await classifyModeAtRuntime(params), { available: false });
  assert.equal(post.mock.callCount(), 1);
  assert.equal(warning.mock.calls[0].arguments[1].reason, "invalid classification");
  assert.doesNotMatch(JSON.stringify(warning.mock.calls), /A private question/);
});

test("chat classifies before retrieval and never lets lexical cues replace an available semantic fit", async () => {
  const question = "Should I change my career this year?";
  assert.equal(suggestModeForQuestion(question, "Money")?.mode, "Work");
  for (const fit of [fitFor("Purpose"), fitFor("Money", { uncertain: true })]) {
    const calls = [];
    const sources = scriptureCounselIndex.slice(0, 2);
    const response = await postChat(request(question), {
      getCurrentUser: async () => null, getClientIdentity: async () => "semantic-order",
      classifyModeAtRuntime: async () => { calls.push("classify"); return fit; },
      retrieveWisdomEvidence: async (_question, mode) => { calls.push(`retrieve:${mode}`); return sources; },
      generateWisdomIntelligence: async (params) => {
        calls.push(`counsel:${params.modeFit.recommendedMode}`);
        assert.equal(params.modelDeadline > performance.now(), true);
        return {
          responseLanguage: "en", ...fit, ambiguity: { mixed: fit.mixed, uncertain: fit.uncertain, alternativeMode: null, reason: "" },
          safeTopic: "general", reasoningPlan: { tension: "A real tension.", diagnosticQuestion: "", blindSpot: "A real blind spot.", maturitySignal: "A real signal.", nextStep: "Write the next concrete step." },
          biblicalEvidence: sources.map(({ scripture }) => ({ reference: scripture, connection: `${scripture} explains the next step.` })),
          counsel: "A grounded answer.", quality: { passed: true, checks: {} },
          routing: { route: "deterministic", attempts: 0, latencyMs: 1, circuitOpen: false },
        };
      },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(calls, ["classify", `retrieve:${fit.recommendedMode}`, `counsel:${fit.recommendedMode}`]);
    assert.equal((await response.json()).reply.mode, fit.recommendedMode);
  }
});

test("manual reversion locks retrieval and counsel to the user's mode without classifying again", async () => {
  const question = "What is life all about?";
  const response = await postChat(request(question, { autoFit: false }), {
    getCurrentUser: async () => null, getClientIdentity: async () => "semantic-revert",
    classifyModeAtRuntime: async () => { assert.fail("Manual reversion must bypass classification"); },
    retrieveWisdomEvidence: async (_question, mode) => {
      assert.equal(mode, "Money");
      return scriptureCounselIndex.filter(({ scripture }) => ["Ephesians 2:10", "Micah 6:8"].includes(scripture));
    },
    generateWisdomIntelligence: async (params) => {
      assert.equal(params.forceSelectedMode, true);
      assert.equal(params.modeFit, undefined);
      return generateWisdomIntelligence({ ...params, allowModel: false });
    },
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.reply.mode, "Money");
  assert.equal(data.userMessage.mode, "Money");
  assert.equal(data.intelligence.quality.passed, true);
});

test("deterministic counsel retains runtime fit and probabilities after rejected drafts instead of re-running phrase rules", async (t) => {
  const env = process.env;
  process.env = { ...env, OPENAI_API_KEY: "test-key" };
  t.after(() => { process.env = env; });
  t.mock.method(console, "warn", () => {});
  const post = t.mock.method(OpenAI.prototype, "post", () => ({
    _thenUnwrap: (unwrap) => Promise.resolve(unwrap({ output_text: '{"biblicalEvidence":[]}', output: [] })),
  }));
  const { generateWisdomIntelligence } = await import("../src/lib/wisdom-intelligence.ts?semantic-counsel-failure");
  const modeFit = fitFor("Purpose");
  const result = await generateWisdomIntelligence({
    question: "Should I change my career this year?", selectedMode: "Money",
    sources: scriptureCounselIndex, preferences: defaultPreferences, modeFit,
  });
  assert.equal(post.mock.callCount(), 2);
  assert.equal(result.routing.route, "deterministic");
  assert.equal(result.recommendedMode, "Purpose");
  assert.deepEqual(result.probabilities, modeFit.probabilities);
});

test("malformed classification gets one repair without resetting the deadline or logging question text", async (t) => {
  const env = process.env;
  process.env = { ...env, OPENAI_API_KEY: "test-key" };
  t.after(() => { process.env = env; });
  const requests = [];
  let outputText = "{";
  let repairText = JSON.stringify({ probabilities: probabilitiesFor("Life"), mixed: false,
    uncertain: false, continuesSelectedGoal: false, topic: "relationships" });
  t.mock.method(OpenAI.prototype, "post", (_path, options) => {
    requests.push(options);
    const response = { output_text: outputText, output: [] };
    outputText = repairText;
    return { _thenUnwrap: (unwrap) => Promise.resolve(unwrap(response)) };
  });
  const warning = t.mock.method(console, "warn", () => {});
  const { classifyModeAtRuntime } = await import("../src/lib/runtime-mode-fit.ts?classification-repair");
  const params = { question: "A private question that must not be logged.", selectedMode: "Money", allowModel: true };
  assert.equal((await classifyModeAtRuntime(params)).recommendedMode, "Life");
  assert.equal(requests.length, 2);
  assert.equal(requests[0].signal, requests[1].signal);
  assert.equal(requests[0].body, requests[1].body);
  outputText = repairText = "{";
  assert.deepEqual(await classifyModeAtRuntime(params), { available: false });
  assert.equal(requests.length, 4);
  assert.deepEqual(await classifyModeAtRuntime({ ...params, deadline: performance.now() + 500 }), { available: false });
  assert.equal(requests.length, 5);
  assert.doesNotMatch(JSON.stringify(warning.mock.calls), /A private question/);
});

test("live runtime mode-fit classifies outcomes across every lens and supported language", {
  skip: process.env.MODE_FIT_LIVE_EVAL !== "1",
}, async (t) => {
  const { default: nextEnv } = await import("@next/env");
  nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
  assert.ok(process.env.OPENAI_API_KEY, "OPENAI_API_KEY is required for the opt-in live evaluation");
  const { classifyModeAtRuntime } = await import("../src/lib/runtime-mode-fit.ts?live-evaluation");
  const cases = [
    { language: "en", question: "What is life all about?", selectedMode: "Money", expectedMode: "Purpose" },
    { language: "en", question: "There is more month than paycheck. How can I make the essentials last?", selectedMode: "Work", expectedMode: "Money" },
    { language: "en", question: "At the office, the queue never empties. How can I negotiate what actually belongs on my plate?", selectedMode: "Money", expectedMode: "Work" },
    { language: "en", question: "When nobody applauds me, I no longer know who I am. Where can I find a steadier sense of self?", selectedMode: "Work", expectedMode: "Purpose" },
    { language: "en", question: "I keep paying relatives bills to avoid feeling guilty. How can I offer help freely without becoming their permanent rescue plan?", selectedMode: "Money", expectedMode: "Generosity" },
    { language: "en", question: "We share a roof but hardly a conversation. How can we find our way back to each other?", selectedMode: "Money", expectedMode: "Life" },
    { language: "en", question: "I do not need a new budget or a different job. How can I repair trust with my spouse after years of being absent?", selectedMode: "Money", expectedMode: "Life" },
    { language: "en", question: "This is not about saving more. How do I stop saying yes to every request for help just to avoid disappointing people?", selectedMode: "Money", expectedMode: ["Generosity", "Life"] },
    { language: "en", question: "How do I say that?", selectedMode: "Work", expectedMode: "Work" },
    { language: "en", question: "What should change?", selectedMode: "Money", expectedMode: "Money" },
    ...multilingualCases.filter(({ expectedMode }) => expectedMode),
  ];
  const failures = [];
  for (const { language, question, selectedMode, expectedMode } of cases) {
    const started = performance.now();
    const fit = await classifyModeAtRuntime({ question, selectedMode, allowModel: true });
    t.diagnostic(`${language}: ${expectedMode} -> ${fit.available ? fit.recommendedMode : "unavailable"} (${Math.round(performance.now() - started)} ms)`);
    const acceptableModes = Array.isArray(expectedMode) ? expectedMode : [expectedMode];
    if (!fit.available || !acceptableModes.includes(fit.recommendedMode)) failures.push({ language, question, expectedMode, fit });
  }
  assert.deepEqual(failures, [], "All live scenarios must return an available, appropriately routed classification");
});
