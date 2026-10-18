import "server-only";
import OpenAI from "openai";
import { localizedModeProfile, localizedScriptureReference, localizedWisdomEntry, promptPreferenceContext, type UserPreferences } from "@/lib/localization";
import { MODE_KEYS, type Mode } from "@/lib/mode-keys";
import { suggestModeForQuestion } from "@/lib/mode-suggestion";
import { calibrateSemanticModeFit, normalizeModeProbabilities, type ModeProbabilities } from "@/lib/semantic-mode-fit";
import { composeModeAwareFallbackResponse, type WisdomSource } from "@/lib/wisdom";

const modes = Object.values(MODE_KEYS) as Mode[];
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
let failures = 0;
let circuitOpenUntil = 0;

export type SafeTopic = "general" | "financial" | "medical" | "legal" | "pastoral" | "crisis";
export type WisdomIntelligence = {
  recommendedMode: Mode;
  probabilities: ModeProbabilities;
  ambiguity: { mixed: boolean; uncertain: boolean; alternativeMode: Mode | null; reason: string };
  safeTopic: SafeTopic;
  reasoningPlan: { tension: string; diagnosticQuestion: string; blindSpot: string; maturitySignal: string; nextStep: string };
  counsel: string;
  quality: { passed: boolean; checks: Record<string, boolean> };
  routing: { route: "primary" | "secondary" | "deterministic"; attempts: number; latencyMs: number; circuitOpen: boolean };
};

const schema = {
  type: "object", additionalProperties: false,
  properties: {
    recommendedMode: { type: "string", enum: modes },
    probabilities: { type: "object", additionalProperties: false, properties: Object.fromEntries(modes.map((mode) => [mode, { type: "number", minimum: 0, maximum: 1 }])), required: modes },
    ambiguity: { type: "object", additionalProperties: false, properties: {
      mixed: { type: "boolean" }, uncertain: { type: "boolean" }, alternativeMode: { type: ["string", "null"], enum: [...modes, null] }, reason: { type: "string", maxLength: 180 },
    }, required: ["mixed", "uncertain", "alternativeMode", "reason"] },
    safeTopic: { type: "string", enum: ["general", "financial", "medical", "legal", "pastoral", "crisis"] },
    reasoningPlan: { type: "object", additionalProperties: false, properties: {
      tension: { type: "string" }, diagnosticQuestion: { type: "string" }, blindSpot: { type: "string" }, maturitySignal: { type: "string" }, nextStep: { type: "string" },
    }, required: ["tension", "diagnosticQuestion", "blindSpot", "maturitySignal", "nextStep"] },
    counsel: { type: "string" },
  }, required: ["recommendedMode", "probabilities", "ambiguity", "safeTopic", "reasoningPlan", "counsel"],
} as const;

function safetyTopic(question: string): SafeTopic {
  if (/suicid|self[- ]?harm|overdose|immediate danger|kill myself/i.test(question)) return "crisis";
  if (/doctor|diagnos|medicine|medical|symptom|therapy|depression/i.test(question)) return "medical";
  if (/lawyer|legal|contract|lawsuit|criminal|custody/i.test(question)) return "legal";
  if (/invest|debt|loan|tax|mortgage|finance|money/i.test(question)) return "financial";
  if (/pastor|church|spiritual abuse|doctrine/i.test(question)) return "pastoral";
  return "general";
}

function fallbackProbabilities(mode: Mode): ModeProbabilities {
  return Object.fromEntries(modes.map((item) => [item, item === mode ? 0.68 : 0.08])) as ModeProbabilities;
}

function scriptureIntegrity(counsel: string, sources: WisdomSource[]) {
  const allowed = new Set(sources.map((source) => source.scripture.toLowerCase()));
  const references = counsel.match(/(?:[1-3]\s)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+\d{1,3}:\d{1,3}(?:[-–]\d{1,3})?/g) ?? [];
  return references.every((reference) => allowed.has(reference.toLowerCase()));
}

export function validateWisdomIntelligence(result: Omit<WisdomIntelligence, "quality" | "routing">, sources: WisdomSource[]) {
  const planParts = Object.values(result.reasoningPlan).map((part) => part.trim());
  const checks = {
    modeAdherence: modes.includes(result.recommendedMode) && planParts.every((part) => part.length >= 10) && new Set(planParts).size === planParts.length,
    sourceIntegrity: scriptureIntegrity(result.counsel, sources),
    calibratedCertainty: !/god (?:told|promises) you|guaranteed|certainly will|cannot fail/i.test(result.counsel),
    relevantNextStep: result.reasoningPlan.nextStep.trim().length >= 12,
    specificCounsel: result.counsel.trim().length >= 180 && !/just trust|follow your heart|everything happens for a reason/i.test(result.counsel),
    safetyBoundary: result.safeTopic === "general" || /qualified|professional|doctor|clinician|lawyer|pastor|emergency|crisis|trusted/i.test(result.counsel),
  };
  return { passed: Object.values(checks).every(Boolean), checks };
}

function deterministic(question: string, selectedMode: Mode, sources: WisdomSource[], preferences: UserPreferences, started: number, attempts: number): WisdomIntelligence {
  const suggestion = suggestModeForQuestion(question, selectedMode);
  const recommendedMode = suggestion?.mode ?? selectedMode;
  const profile = localizedModeProfile(recommendedMode, preferences.language);
  const safeTopic = safetyTopic(question);
  const base = {
    recommendedMode, probabilities: fallbackProbabilities(recommendedMode),
    ambiguity: { mixed: false, uncertain: !suggestion, alternativeMode: null, reason: suggestion ? `The question's strongest signal fits ${recommendedMode}.` : `The available signal does not justify overriding ${selectedMode}.` },
    safeTopic,
    reasoningPlan: { tension: profile.diagnosticTracks[0], diagnosticQuestion: profile.diagnosticTracks[1], blindSpot: profile.blindSpots[0], maturitySignal: profile.maturitySignals[0], nextStep: profile.practices[0] },
    counsel: composeModeAwareFallbackResponse(question, recommendedMode, sources, preferences),
  };
  return { ...base, quality: validateWisdomIntelligence(base, sources), routing: { route: "deterministic", attempts, latencyMs: Date.now() - started, circuitOpen: Date.now() < circuitOpenUntil } };
}

export async function generateWisdomIntelligence({ question, selectedMode, sources, preferences, memoryContext = "", allowModel = true }: { question: string; selectedMode: Mode; sources: WisdomSource[]; preferences: UserPreferences; memoryContext?: string; allowModel?: boolean }): Promise<WisdomIntelligence> {
  const started = Date.now();
  if (!allowModel || !client || Date.now() < circuitOpenUntil) return deterministic(question, selectedMode, sources, preferences, started, 0);
  const sourceContext = sources.map((source, index) => {
    const localized = localizedWisdomEntry(source, preferences);
    return `${index + 1}. ${localizedScriptureReference(source.scripture, preferences.language)} | ${localized.principle} | ${localized.application}`;
  }).join("\n");
  const profiles = modes.map((mode) => {
    const profile = localizedModeProfile(mode, preferences.language);
    return `${mode}: ${profile.useWhen} Diagnostic: ${profile.diagnosticTracks.join(" | ")} Blind spots: ${profile.blindSpots.join(" | ")} Maturity: ${profile.maturitySignals.join(" | ")}`;
  }).join("\n\n");
  const primaryModel = process.env.OPENAI_WISDOM_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const secondaryModel = process.env.OPENAI_WISDOM_FALLBACK_MODEL || "gpt-4o-mini";
  const routes = [
    { model: primaryModel, route: "primary" as const, timeoutMs: 8_000 },
    { model: primaryModel, route: "primary" as const, timeoutMs: 8_000 },
    { model: secondaryModel, route: "secondary" as const, timeoutMs: 6_000 },
  ];
  let attempts = 0;
  for (const modelRoute of routes) {
    try {
      attempts += 1;
      const response = await client.responses.create({ model: modelRoute.model, input: [
        { role: "system", content: "You are Aletheia's unified wisdom engine. Classify the question, choose exactly one primary lens, plan using that lens, and write final counsel in one operation. Probabilities must sum to 1. Be calibrated: mark ambiguity when evidence is mixed. Use only supplied scripture references. Never claim divine certainty. Give a concrete next step. Maintain medical, financial, legal, pastoral and crisis boundaries. The five lenses change reasoning, not tone: Money=stewardship/risk; Work=vocation/capacity; Purpose=identity/motives/timing; Generosity=freedom/boundaries/sustainability; Life=formation/care/relationships. For crisis, prioritize urgent human help." },
        { role: "user", content: `LENSES\n${profiles}\n\nUSER PREFERENCES\n${promptPreferenceContext(preferences)}\n\nPRIVATE CONTINUITY (use quietly)\n${memoryContext || "None"}\n\nALLOWED EVIDENCE\n${sourceContext}\n\nCURRENT USER-SELECTED LENS\n${selectedMode}\n\nQUESTION\n${question}` },
      ], text: { format: { type: "json_schema", name: "aletheia_wisdom_intelligence", strict: true, schema } } }, { signal: AbortSignal.timeout(modelRoute.timeoutMs) });
      const raw = JSON.parse(response.output_text) as Omit<WisdomIntelligence, "quality" | "routing">;
      const probabilities = normalizeModeProbabilities(raw.probabilities);
      if (!probabilities || !modes.includes(raw.recommendedMode)) throw new Error("invalid structured response");
      const calibrated = calibrateSemanticModeFit({ probabilities, mixed: raw.ambiguity.mixed, topic: raw.safeTopic }, selectedMode);
      const recommendedMode = calibrated?.mode ?? (raw.recommendedMode === selectedMode ? selectedMode : (raw.ambiguity.uncertain || raw.ambiguity.mixed ? selectedMode : raw.recommendedMode));
      const candidate = { ...raw, recommendedMode, probabilities };
      const quality = validateWisdomIntelligence(candidate, sources);
      if (!quality.passed) throw new Error(`quality gate: ${Object.entries(quality.checks).filter(([, ok]) => !ok).map(([name]) => name).join(",")}`);
      failures = 0;
      return { ...candidate, quality, routing: { route: modelRoute.route, attempts, latencyMs: Date.now() - started, circuitOpen: false } };
    } catch {
      failures += 1;
      if (failures >= 4) circuitOpenUntil = Date.now() + 60_000;
    }
  }
  return deterministic(question, selectedMode, sources, preferences, started, attempts);
}
