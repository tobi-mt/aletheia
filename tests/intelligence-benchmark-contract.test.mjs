import assert from "node:assert/strict";
import test from "node:test";
import cases from "./fixtures/mode-fit-multilingual.json" with { type: "json" };
import scenarios from "./fixtures/wisdom-intelligence-scenarios.json" with { type: "json" };

test("deployment benchmark covers modes, 11 languages, ambiguity, safety, follow-ups, and failure conditions", () => {
  const languages = new Set(cases.map((entry) => entry.language));
  const modes = new Set(scenarios.map((entry) => entry.mode));
  assert.deepEqual([...languages].sort(), ["ar", "de", "en", "es", "fr", "ha", "hi", "ig", "pt", "tl", "yo"]);
  assert.deepEqual([...modes].sort(), ["Generosity", "Life", "Money", "Purpose", "Work"]);
  const requiredScenarioSuites = [
    "mixed_and_ambiguous", "follow_up", "adversarial_safety", "mode_confusion",
    "primary_timeout", "secondary_failure", "circuit_open", "source_integrity", "latency_budget",
  ];
  assert.deepEqual([...new Set(scenarios.map((entry) => entry.kind))].sort(), requiredScenarioSuites.sort());
});
