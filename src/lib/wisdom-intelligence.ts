import "server-only";
import OpenAI from "openai";
import { hasCompleteLocalizedWisdomEntry, localizedModeProfile, localizedScriptureReference, localizedWisdomEntry, localizedWisdomResponseCopy, promptPreferenceContext, responseLanguageContract, scriptureDisplayLabel, type LanguageCode, type UserPreferences } from "@/lib/localization";
import { MODE_KEYS, type Mode } from "@/lib/mode-keys";
import { suggestModeForQuestion } from "@/lib/mode-suggestion";
import { calibrateSemanticModeFit, normalizeModeProbabilities, type ModeProbabilities } from "@/lib/semantic-mode-fit";
import { composeModeAwareFallbackResponse, type WisdomSource } from "@/lib/wisdom";
import { detectLifeSupportConcern } from "@/lib/life-support";

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
  biblicalEvidence: Array<{ reference: string; connection: string }>;
  counsel: string;
  quality: { passed: boolean; checks: Record<string, boolean> };
  routing: { route: "primary" | "secondary" | "deterministic"; attempts: number; latencyMs: number; circuitOpen: boolean };
};

function responseSchema(language: LanguageCode, sources: WisdomSource[], minimumEvidence: number) {
  const allowedReferences = sources.map((source) => source.scripture);
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
    biblicalEvidence: {
      type: "array",
      minItems: minimumEvidence,
      maxItems: Math.min(4, allowedReferences.length),
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          reference: { type: "string", enum: allowedReferences },
          connection: { type: "string", minLength: 24 },
        },
        required: ["reference", "connection"],
      },
    },
    counsel: { type: "string" },
  }, required: ["responseLanguage", "recommendedMode", "probabilities", "ambiguity", "safeTopic", "reasoningPlan", "biblicalEvidence", "counsel"],
  } as const;
}

function safetyTopic(question: string): SafeTopic {
  if (detectLifeSupportConcern(question) === "self_harm" || /immediate danger/i.test(question)) return "crisis";
  if (/doctor|diagnos|medicine|medical|symptom|therapy|depression/i.test(question)) return "medical";
  if (/lawyer|legal|contract|lawsuit|criminal|custody/i.test(question)) return "legal";
  if (/invest|debt|loan|tax|mortgage|finance|money/i.test(question)) return "financial";
  if (/pastor|church|spiritual abuse|doctrine/i.test(question)) return "pastoral";
  return "general";
}

function fallbackProbabilities(mode: Mode): ModeProbabilities {
  return Object.fromEntries(modes.map((item) => [item, item === mode ? 0.68 : 0.08])) as ModeProbabilities;
}

export function requiredBiblicalEvidenceCount(question: string, sourceCount: number, safeTopic: SafeTopic) {
  if (sourceCount <= 0) return 0;
  if (safeTopic === "crisis") return 1;
  const wordCount = question.trim().split(/\s+/u).filter(Boolean).length;
  const substantive = wordCount > 8 || question.trim().length > 80;
  return Math.min(substantive ? 2 : 1, sourceCount);
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

function normalizeEvidenceText(value: string) {
  return value.normalize("NFKC").replace(/[\s\u00a0]+/gu, " ").trim().toLocaleLowerCase();
}

function biblicalGroundingIntegrity(
  result: Omit<WisdomIntelligence, "quality" | "routing">,
  sources: WisdomSource[],
  preferences: UserPreferences,
  minimumEvidence: number,
) {
  const allowed = new Set(sources.map((source) => source.scripture));
  const distinctReferences = new Set(result.biblicalEvidence.map((evidence) => evidence.reference));
  const normalizedCounsel = normalizeEvidenceText(result.counsel);
  return result.biblicalEvidence.length >= minimumEvidence
    && distinctReferences.size === result.biblicalEvidence.length
    && result.biblicalEvidence.every((evidence) => {
      const localizedReference = localizedScriptureReference(evidence.reference, preferences.language);
      const normalizedConnection = normalizeEvidenceText(evidence.connection);
      const normalizedReference = normalizeEvidenceText(localizedReference);
      const referenceIndex = normalizedCounsel.indexOf(normalizedReference);
      const explanationAfterReference = referenceIndex < 0
        ? ""
        : normalizedCounsel.slice(referenceIndex + normalizedReference.length, referenceIndex + normalizedReference.length + 360);
      const explanationCharacterCount = (explanationAfterReference.match(/[\p{L}\p{N}]/gu) ?? []).length;
      return allowed.has(evidence.reference)
        && normalizedConnection.length >= 24
        && referenceIndex >= 0
        && explanationCharacterCount >= 24;
    });
}

export function validateWisdomIntelligence(
  result: Omit<WisdomIntelligence, "quality" | "routing">,
  sources: WisdomSource[],
  preferences: UserPreferences,
  minimumEvidence: number,
) {
  const planParts = Object.values(result.reasoningPlan).map((part) => part.trim());
  const checks = {
    responseLanguage: result.responseLanguage === preferences.language,
    modeAdherence: modes.includes(result.recommendedMode) && planParts.every((part) => part.length >= 10) && new Set(planParts).size === planParts.length,
    biblicalGrounding: biblicalGroundingIntegrity(result, sources, preferences, minimumEvidence),
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
  const minimumEvidence = requiredBiblicalEvidenceCount(question, sources.length, safeTopic);
  const copy = localizedWisdomResponseCopy(preferences.language);
  const biblicalEvidence = sources.slice(0, minimumEvidence).map((source, index) => {
    const localized = localizedWisdomEntry(source, preferences);
    const complete = hasCompleteLocalizedWisdomEntry(source, preferences.language);
    const reference = `${localizedScriptureReference(source.scripture, preferences.language)} (${scriptureDisplayLabel(source.scripture, preferences)})`;
    const connection = index === 0
      ? copy.primaryAnchor(reference, complete ? localized.principle : "")
      : copy.secondAnchor(reference, complete ? localized.principle : "");
    return { reference: source.scripture, connection };
  });
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
    biblicalEvidence,
    counsel: composeModeAwareFallbackResponse(question, recommendedMode, sources, preferences),
  };
  return { ...base, quality: validateWisdomIntelligence(base, sources, preferences, minimumEvidence), routing: { route: "deterministic", attempts, latencyMs: Date.now() - started, circuitOpen: Date.now() < circuitOpenUntil } };
}

export async function generateWisdomIntelligence({ question, selectedMode, sources, preferences, memoryContext = "", allowModel = true, forceSelectedMode = false }: { question: string; selectedMode: Mode; sources: WisdomSource[]; preferences: UserPreferences; memoryContext?: string; allowModel?: boolean; forceSelectedMode?: boolean }): Promise<WisdomIntelligence> {
  const started = Date.now();
  if (!allowModel || !client || Date.now() < circuitOpenUntil) return deterministic(question, selectedMode, sources, preferences, started, 0, forceSelectedMode);
  const sourceContext = sources.map((source, index) => {
    const localized = localizedWisdomEntry(source, preferences);
    return `${index + 1}. ${localizedScriptureReference(source.scripture, preferences.language)} | ${localized.principle} | ${localized.application}`;
  }).join("\n");
  const expectedSafeTopic = safetyTopic(question);
  const minimumEvidence = requiredBiblicalEvidenceCount(question, sources.length, expectedSafeTopic);
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
        { role: "system", content: `${responseLanguageContract(preferences.language)}\n\nYou are Aletheia's unified wisdom engine. Classify the question, choose exactly one primary lens, plan using that lens, and write final counsel in one operation. Probabilities must sum to 1. Be calibrated: mark ambiguity when evidence is mixed. Ground every answer in the supplied biblical evidence. Use only supplied scripture references. Never claim divine certainty. Give a concrete next step. Maintain medical, financial, legal, pastoral and crisis boundaries. The five lenses change reasoning, not tone: Money=stewardship/risk; Work=vocation/capacity; Purpose=identity/motives/timing; Generosity=freedom/boundaries/sustainability; Life=formation/care/relationships. For crisis, prioritize urgent human help before biblical reflection, then include one gentle, relevant supplied passage without implying that Scripture replaces emergency or clinical care.${forceSelectedMode ? " The user explicitly chose to keep the current lens. You MUST set recommendedMode to the supplied current lens and use that lens's reasoning signature for the plan and counsel. Probabilities may still honestly reflect topical fit." : ""}\n\n${responseLanguageContract(preferences.language)}` },
        { role: "user", content: `LENSES\n${profiles}\n\nUSER PREFERENCES\n${promptPreferenceContext(preferences)}\n\nPRIVATE CONTINUITY (use quietly)\n${memoryContext || "None"}\n\nALLOWED EVIDENCE\n${sourceContext}\n\nBIBLICAL GROUNDING CONTRACT\nSelect at least ${minimumEvidence} distinct reference${minimumEvidence === 1 ? "" : "s"} from ALLOWED EVIDENCE. For each biblicalEvidence item, use the canonical reference shown in the evidence and write a concrete connection in the response language explaining how that passage addresses this question. Include the localized display form of every selected reference in counsel and meaningfully convey its connection there. Integrate the passages as connected reasoning, not a verse dump.${expectedSafeTopic === "crisis" ? " Put immediate safety guidance first; biblical support follows and must never replace urgent human help." : ""}\n\nCURRENT USER-SELECTED LENS\n${selectedMode}\n\nLENS POLICY\n${forceSelectedMode ? `Keep ${selectedMode}; do not switch.` : "Auto-fit may select the strongest lens."}\n\nQUESTION\n${question}` },
      ], text: { format: { type: "json_schema", name: "aletheia_wisdom_intelligence", strict: true, schema: responseSchema(preferences.language, sources, minimumEvidence) } } }, { signal: AbortSignal.timeout(modelRoute.timeoutMs) });
      const raw = JSON.parse(response.output_text) as Omit<WisdomIntelligence, "quality" | "routing">;
      const probabilities = normalizeModeProbabilities(raw.probabilities);
      if (!probabilities || !modes.includes(raw.recommendedMode)) throw new Error("invalid structured response");
      const recommendedMode = forceSelectedMode
        ? selectedMode
        : raw.ambiguity.uncertain
        ? selectedMode
        : resolveUnifiedRecommendedMode(probabilities, selectedMode, raw.ambiguity.mixed);
      const candidate = { ...raw, recommendedMode, probabilities };
      const quality = validateWisdomIntelligence(candidate, sources, preferences, minimumEvidence);
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
