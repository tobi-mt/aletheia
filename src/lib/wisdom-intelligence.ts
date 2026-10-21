import "server-only";
import OpenAI from "openai";
import { localizedModeProfile, localizedScriptureReference, localizedWisdomEntry, promptPreferenceContext, responseLanguageContract, type LanguageCode, type UserPreferences } from "@/lib/localization";
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
  responseLanguage: LanguageCode;
  recommendedMode: Mode;
  probabilities: ModeProbabilities;
  ambiguity: { mixed: boolean; uncertain: boolean; alternativeMode: Mode | null; reason: string };
  safeTopic: SafeTopic;
  reasoningPlan: { tension: string; diagnosticQuestion: string; blindSpot: string; maturitySignal: string; nextStep: string };
  counsel: string;
  quality: { passed: boolean; checks: Record<string, boolean> };
  routing: { route: "primary" | "secondary" | "deterministic"; attempts: number; latencyMs: number; circuitOpen: boolean };
};

function responseSchema(language: LanguageCode) {
  return {
  type: "object", additionalProperties: false,
  properties: {
    responseLanguage: { type: "string", enum: [language] },
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
  }, required: ["responseLanguage", "recommendedMode", "probabilities", "ambiguity", "safeTopic", "reasoningPlan", "counsel"],
  } as const;
}

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

export function resolveUnifiedRecommendedMode(probabilities: ModeProbabilities, selectedMode: Mode, mixed: boolean) {
  const ranked = modes
    .map((mode) => ({ mode, probability: probabilities[mode] }))
    .sort((left, right) => right.probability - left.probability);
  const leader = ranked[0];
  const runnerUp = ranked[1];
  if (!leader || leader.mode === selectedMode) return selectedMode;

  // "Mixed" describes useful secondary context; it must not veto an otherwise
  // decisive primary lens. The stronger threshold prevents casual switching.
  const dominantDespiteOverlap = leader.probability >= 0.5
    && leader.probability - probabilities[selectedMode] >= 0.25
    && leader.probability - (runnerUp?.probability ?? 0) >= 0.2;
  if (dominantDespiteOverlap) return leader.mode;
  if (mixed) return selectedMode;

  return calibrateSemanticModeFit({ probabilities, mixed: false, topic: "unified" }, selectedMode)?.mode ?? selectedMode;
}

function scriptureIntegrity(counsel: string, sources: WisdomSource[]) {
  const allowed = new Set(sources.map((source) => source.scripture.toLowerCase()));
  const references = counsel.match(/(?:[1-3]\s)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+\d{1,3}:\d{1,3}(?:[-–]\d{1,3})?/g) ?? [];
  return references.every((reference) => allowed.has(reference.toLowerCase()));
}

export function validateWisdomIntelligence(result: Omit<WisdomIntelligence, "quality" | "routing">, sources: WisdomSource[], expectedLanguage?: LanguageCode) {
  const planParts = Object.values(result.reasoningPlan).map((part) => part.trim());
  const checks = {
    responseLanguage: !expectedLanguage || result.responseLanguage === expectedLanguage,
    modeAdherence: modes.includes(result.recommendedMode) && planParts.every((part) => part.length >= 10) && new Set(planParts).size === planParts.length,
    sourceIntegrity: scriptureIntegrity(result.counsel, sources),
    calibratedCertainty: !/god (?:told|promises) you|guaranteed|certainly will|cannot fail/i.test(result.counsel),
    relevantNextStep: result.reasoningPlan.nextStep.trim().length >= 12,
    specificCounsel: result.counsel.trim().length >= 180 && !/just trust|follow your heart|everything happens for a reason/i.test(result.counsel),
    safetyBoundary: result.safeTopic === "general" || /qualified|professional|doctor|clinician|lawyer|pastor|emergency|crisis|trusted/i.test(result.counsel),
  };
  return { passed: Object.values(checks).every(Boolean), checks };
}

function deterministic(question: string, selectedMode: Mode, sources: WisdomSource[], preferences: UserPreferences, started: number, attempts: number, forceSelectedMode = false): WisdomIntelligence {
  const suggestion = suggestModeForQuestion(question, selectedMode);
  const recommendedMode = forceSelectedMode ? selectedMode : suggestion?.mode ?? selectedMode;
  const profile = localizedModeProfile(recommendedMode, preferences.language);
  const safeTopic = safetyTopic(question);
  const base = {
    responseLanguage: preferences.language,
    recommendedMode, probabilities: fallbackProbabilities(recommendedMode),
    ambiguity: {
      mixed: false,
      uncertain: !suggestion,
      alternativeMode: null,
      reason: suggestion ? profile.useWhen : profile.promptCue,
    },
    safeTopic,
    reasoningPlan: { tension: profile.diagnosticTracks[0], diagnosticQuestion: profile.diagnosticTracks[1], blindSpot: profile.blindSpots[0], maturitySignal: profile.maturitySignals[0], nextStep: profile.practices[0] },
    counsel: composeModeAwareFallbackResponse(question, recommendedMode, sources, preferences),
  };
  return { ...base, quality: validateWisdomIntelligence(base, sources), routing: { route: "deterministic", attempts, latencyMs: Date.now() - started, circuitOpen: Date.now() < circuitOpenUntil } };
}

export async function generateWisdomIntelligence({ question, selectedMode, sources, preferences, memoryContext = "", allowModel = true, forceSelectedMode = false }: { question: string; selectedMode: Mode; sources: WisdomSource[]; preferences: UserPreferences; memoryContext?: string; allowModel?: boolean; forceSelectedMode?: boolean }): Promise<WisdomIntelligence> {
  const started = Date.now();
  if (!allowModel || !client || Date.now() < circuitOpenUntil) return deterministic(question, selectedMode, sources, preferences, started, 0, forceSelectedMode);
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
    { model: primaryModel, route: "primary" as const, timeoutMs: 7_000, retry: false },
    { model: primaryModel, route: "primary" as const, timeoutMs: 5_000, retry: true },
    { model: secondaryModel, route: "secondary" as const, timeoutMs: 5_000, retry: false },
  ];
  let attempts = 0;
  let skipPrimaryRetry = false;
  for (const modelRoute of routes) {
    if (modelRoute.retry && skipPrimaryRetry) continue;
    try {
      attempts += 1;
      const response = await client.responses.create({ model: modelRoute.model, input: [
        { role: "system", content: `${responseLanguageContract(preferences.language)}\n\nYou are Aletheia's unified wisdom engine. Classify the question, choose exactly one primary lens, plan using that lens, and write final counsel in one operation. Probabilities must sum to 1. Be calibrated: mark ambiguity when evidence is mixed. Use only supplied scripture references. Never claim divine certainty. Give a concrete next step. Maintain medical, financial, legal, pastoral and crisis boundaries. The five lenses change reasoning, not tone: Money=stewardship/risk; Work=vocation/capacity; Purpose=identity/motives/timing; Generosity=freedom/boundaries/sustainability; Life=formation/care/relationships. For crisis, prioritize urgent human help.${forceSelectedMode ? " The user explicitly chose to keep the current lens. You MUST set recommendedMode to the supplied current lens and use that lens's reasoning signature for the plan and counsel. Probabilities may still honestly reflect topical fit." : ""}\n\n${responseLanguageContract(preferences.language)}` },
        { role: "user", content: `LENSES\n${profiles}\n\nUSER PREFERENCES\n${promptPreferenceContext(preferences)}\n\nPRIVATE CONTINUITY (use quietly)\n${memoryContext || "None"}\n\nALLOWED EVIDENCE\n${sourceContext}\n\nCURRENT USER-SELECTED LENS\n${selectedMode}\n\nLENS POLICY\n${forceSelectedMode ? `Keep ${selectedMode}; do not switch.` : "Auto-fit may select the strongest lens."}\n\nQUESTION\n${question}` },
      ], text: { format: { type: "json_schema", name: "aletheia_wisdom_intelligence", strict: true, schema: responseSchema(preferences.language) } } }, { signal: AbortSignal.timeout(modelRoute.timeoutMs) });
      const raw = JSON.parse(response.output_text) as Omit<WisdomIntelligence, "quality" | "routing">;
      const probabilities = normalizeModeProbabilities(raw.probabilities);
      if (!probabilities || !modes.includes(raw.recommendedMode)) throw new Error("invalid structured response");
      const recommendedMode = forceSelectedMode
        ? selectedMode
        : raw.ambiguity.uncertain
        ? selectedMode
        : resolveUnifiedRecommendedMode(probabilities, selectedMode, raw.ambiguity.mixed);
      const candidate = { ...raw, recommendedMode, probabilities };
      const quality = validateWisdomIntelligence(candidate, sources, preferences.language);
      if (!quality.passed) throw new Error(`quality gate: ${Object.entries(quality.checks).filter(([, ok]) => !ok).map(([name]) => name).join(",")}`);
      failures = 0;
      return { ...candidate, quality, routing: { route: modelRoute.route, attempts, latencyMs: Date.now() - started, circuitOpen: false } };
    } catch (error) {
      failures += 1;
      const message = error instanceof Error ? error.message : "";
      if (modelRoute.route === "primary" && !modelRoute.retry && /quality gate|invalid structured response/i.test(message)) {
        skipPrimaryRetry = true;
      }
      if (failures >= 4) circuitOpenUntil = Date.now() + 60_000;
    }
  }
  return deterministic(question, selectedMode, sources, preferences, started, attempts, forceSelectedMode);
}
