import assert from "node:assert/strict";
import test from "node:test";
import { rankWisdomEvidence } from "../src/lib/wisdom.ts";
import { validateWisdomIntelligence } from "../src/lib/wisdom-intelligence.ts";

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

test("quality gate accepts grounded mode-specific counsel", () => {
  const result = {
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
    counsel: "This deserves patient attention rather than a rushed yes. Proverbs 15:22 points toward tested counsel, while Luke 14:28 asks you to count the real cost. Write the smallest reversible experiment, name its time and relationship costs, and ask one grounded person to challenge the fragile assumptions before you commit.",
  };
  assert.equal(validateWisdomIntelligence(result, sources).passed, true);
});

test("quality gate rejects invented references, false certainty, and boundary failures", () => {
  const result = {
    recommendedMode: "Money",
    probabilities: { Money: 0.8, Work: 0.05, Purpose: 0.05, Generosity: 0.05, Life: 0.05 },
    ambiguity: { mixed: false, uncertain: false, alternativeMode: null, reason: "Financial decision." },
    safeTopic: "financial",
    reasoningPlan: { tension: "Financial pressure needs attention.", diagnosticQuestion: "What is the true cost?", blindSpot: "Debt capacity is not permission.", maturitySignal: "The numbers remain visible.", nextStep: "Write down the complete repayment plan today." },
    counsel: "God promises you this investment certainly will succeed. Philippians 4:99 proves it, so act immediately on your own. This sentence is deliberately long enough to reach the specificity threshold while remaining unsafe and unsupported for the validator regression test.",
  };
  const quality = validateWisdomIntelligence(result, sources);
  assert.equal(quality.passed, false);
  assert.equal(quality.checks.sourceIntegrity, false);
  assert.equal(quality.checks.calibratedCertainty, false);
  assert.equal(quality.checks.safetyBoundary, false);
});
