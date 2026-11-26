import "server-only";
import OpenAI from "openai";
import { localizedModeProfile, localizedScriptureReference, localizedWisdomEntry, localizedWisdomResponseCopy, promptPreferenceContext, responseLanguageContract, type LanguageCode, type UserPreferences } from "@/lib/localization";
import { MODE_KEYS, type Mode } from "@/lib/mode-keys";
import { suggestModeForQuestion } from "@/lib/mode-suggestion";
import { calibrateSemanticModeFit, normalizeModeProbabilities, type ModeProbabilities } from "@/lib/semantic-mode-fit";
import type { WisdomSource } from "@/lib/wisdom";
import { closedWorkloadNextStep, composeCompanionCounsel, isFixedWorkloadContinuation, needsFinancialBoundary, preferredCounselReferences } from "@/lib/companion-counsel";
import { detectLifeSupportConcern } from "@/lib/life-support";

const modes = Object.values(MODE_KEYS) as Mode[];
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 }) : null;
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

type CounselDraft = Omit<WisdomIntelligence, "quality" | "routing" | "counsel"> & { opening: string };

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
      tension: { type: "string" }, diagnosticQuestion: { type: "string", maxLength: 160, description: "After drafting the visible counsel and next step, write one optional, open-ended follow-up in the response language, or an empty string. Use one fact the person shared to open a concrete angle not already answered: a value to protect, a trade-off to explore, or a conversation to prepare. Never ask for a yes/no verdict, paraphrase the original question or next step, reopen an option already ruled out, infer motives, or push disclosure. Omit it when there is no useful new angle or the person is in crisis." }, blindSpot: { type: "string" }, maturitySignal: { type: "string" }, nextStep: { type: "string" },
    }, required: ["tension", "diagnosticQuestion", "blindSpot", "maturitySignal", "nextStep"] },
    biblicalEvidence: {
      type: "array",
      minItems: minimumEvidence,
      maxItems: Math.min(2, allowedReferences.length),
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          reference: { type: "string", enum: allowedReferences },
          connection: { type: "string", minLength: 24, maxLength: 600, description: "The final paragraph for this passage, without a citation label. Explain the passage in context and what it helps the person do or notice here." },
        },
        required: ["reference", "connection"],
      },
    },
    opening: { type: "string", minLength: 24, maxLength: 500 },
  }, required: ["responseLanguage", "recommendedMode", "probabilities", "ambiguity", "safeTopic", "reasoningPlan", "biblicalEvidence", "opening"],
  } as const;
}

function safetyTopic(question: string): SafeTopic {
  if (detectLifeSupportConcern(question) === "self_harm" || /immediate danger/i.test(question)) return "crisis";
  if (/doctor|diagnos|medicine|medical|symptom|therapy|depression/i.test(question)) return "medical";
  if (/lawyer|legal|contract|lawsuit|criminal|custody/i.test(question)) return "legal";
  if (needsFinancialBoundary(question)) return "financial";
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

export function assembleCompanionDraft(draft: CounselDraft, preferences: UserPreferences, question: string) {
  const { opening, ...result } = draft;
  const biblicalEvidence = draft.biblicalEvidence.map(({ reference, connection }) => ({
    reference,
    connection: `${localizedScriptureReference(reference, preferences.language)} — ${connection.trim()}`,
  }));
  const boundary = result.safeTopic === "financial" || result.safeTopic === "legal"
    ? localizedWisdomResponseCopy(preferences.language).disclaimer : "";
  const nextStep = closedWorkloadNextStep(question, preferences.language) ?? result.reasoningPlan.nextStep.trim();
  const counsel = [opening.trim(), ...biblicalEvidence.map(({ connection }) => connection), boundary, nextStep]
    .filter(Boolean).join("\n\n");
  return { ...result, reasoningPlan: { ...result.reasoningPlan, nextStep }, biblicalEvidence, counsel };
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
      return allowed.has(evidence.reference)
        && normalizedConnection.includes(normalizedReference)
        && normalizedConnection.replace(normalizedReference, "").trim().length >= 24
        && normalizedCounsel.includes(normalizedConnection);
    });
}

export function validateWisdomIntelligence(
  result: Omit<WisdomIntelligence, "quality" | "routing">,
  sources: WisdomSource[],
  preferences: UserPreferences,
  minimumEvidence: number,
) {
  const { tension, blindSpot, maturitySignal, nextStep } = result.reasoningPlan;
  const planParts = [tension, blindSpot, maturitySignal, nextStep].map((part) => part.trim());
  const checks = {
    responseLanguage: result.responseLanguage === preferences.language,
    modeAdherence: modes.includes(result.recommendedMode) && planParts.every((part) => part.length >= 10) && new Set(planParts).size === planParts.length,
    biblicalGrounding: biblicalGroundingIntegrity(result, sources, preferences, minimumEvidence),
    calibratedCertainty: !/god (?:told|promises) you|guaranteed|certainly will|cannot fail/i.test(result.counsel),
    relevantNextStep: result.reasoningPlan.nextStep.trim().length >= 12,
    specificCounsel: result.counsel.trim().length >= 180 && !/just trust|follow your heart|everything happens for a reason/i.test(result.counsel),
    safetyBoundary: result.safeTopic === "general"
      || result.counsel.includes(localizedWisdomResponseCopy(preferences.language).disclaimer)
      || /qualified|professional|doctor|clinician|lawyer|pastor|emergency|crisis|trusted/i.test(result.counsel),
  };
  return { passed: Object.values(checks).every(Boolean), checks };
}

function deterministic(question: string, selectedMode: Mode, sources: WisdomSource[], preferences: UserPreferences, started: number, attempts: number, forceSelectedMode = false): WisdomIntelligence {
  const suggestion = suggestModeForQuestion(question, selectedMode);
  const recommendedMode = forceSelectedMode ? selectedMode : suggestion?.mode ?? selectedMode;
  const profile = localizedModeProfile(recommendedMode, preferences.language);
  const safeTopic = safetyTopic(question);
  const minimumEvidence = requiredBiblicalEvidenceCount(question, sources.length, safeTopic);
  const fallback = composeCompanionCounsel(question, sources, preferences, minimumEvidence || 2);
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
    reasoningPlan: { tension: profile.diagnosticTracks[0], diagnosticQuestion: "", blindSpot: profile.blindSpots[0], maturitySignal: profile.maturitySignals[0], nextStep: fallback.nextStep },
    biblicalEvidence: fallback.biblicalEvidence,
    counsel: fallback.text,
  };
  return { ...base, quality: validateWisdomIntelligence(base, fallback.sources, preferences, minimumEvidence), routing: { route: "deterministic", attempts, latencyMs: Date.now() - started, circuitOpen: Date.now() < circuitOpenUntil } };
}

export async function generateWisdomIntelligence({ question, selectedMode, sources, preferences, memoryContext = "", allowModel = true, forceSelectedMode = false }: { question: string; selectedMode: Mode; sources: WisdomSource[]; preferences: UserPreferences; memoryContext?: string; allowModel?: boolean; forceSelectedMode?: boolean }): Promise<WisdomIntelligence> {
  const started = Date.now();
  const expectedSafeTopic = safetyTopic(question);
  if (!allowModel || !client || !sources.length || detectLifeSupportConcern(question) === "self_harm"
    || (preferences.language === "en" && isFixedWorkloadContinuation(question)) || Date.now() < circuitOpenUntil) {
    return deterministic(question, selectedMode, sources, preferences, started, 0, forceSelectedMode);
  }
  const minimumEvidence = requiredBiblicalEvidenceCount(question, sources.length, expectedSafeTopic);
  const preferred = preferredCounselReferences(question);
  const focusedSources = sources.filter(({ scripture }) => preferred.includes(scripture));
  const modelSources = minimumEvidence === 2 && focusedSources.length === 2 ? focusedSources : sources;
  const sourceContext = modelSources.map((source, index) => {
    const localized = localizedWisdomEntry(source, preferences);
    return `${index + 1}. ${source.scripture} | ${localized.context} | ${localized.principle} | ${localized.application}`;
  }).join("\n");
  const profiles = modes.map((mode) => {
    const profile = localizedModeProfile(mode, preferences.language);
    return `${mode}: ${profile.useWhen} ${profile.lens}`;
  }).join("\n\n");
  const primaryModel = process.env.OPENAI_WISDOM_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const secondaryModel = process.env.OPENAI_WISDOM_FALLBACK_MODEL || "gpt-4o-mini";
  const routes = [
    { model: primaryModel, route: "primary" as const, timeoutMs: 11_000 },
    { model: secondaryModel, route: "secondary" as const, timeoutMs: 7_000 },
  ];
  let attempts = 0;
  let providerUnavailable = true;
  for (const modelRoute of routes) {
    const signal = AbortSignal.timeout(modelRoute.timeoutMs);
    try {
      attempts += 1;
      const response = await client.responses.create({ model: modelRoute.model, max_output_tokens: 950, input: [
        { role: "developer", content: `${responseLanguageContract(preferences.language)}\n\nYou are Ask Aletheia. Classify the primary problem the person needs help solving, not merely the nouns. Attend to expressed emotion and motive without diagnosing, pathologizing, or inventing personal history. For example, money given from guilt may be Generosity, and work damaging health or marriage may be Life. Use ambiguity.reason to name the primary need. Probabilities sum to 1. Mark mixed only for genuinely competing lenses. Keep private plan fields brief. Never claim divine certainty or replace qualified care.\n\nWrite only one or two short sentences per visible field, with no headings or lists. Opening: name the actual decision, one concrete fact that changes the advice, and the tension the person expressed. Each connection: explain the passage in context and how it helps here; do not include a citation label or quote verse text, which the app supplies through the linked reader. Next step: one observable action (such as a specific question to ask, a sentence to say, or one fact to write down), not a general instruction to reflect or talk. Do not retry a closed option. Be compassionate without equating guilt or tiredness with wrongdoing. Preserve agency; include qualified human help where needed, without repeating financial or legal disclaimers supplied by the app.` },
        { role: "user", content: `LENSES\n${profiles}\n\nPREFERENCES\n${promptPreferenceContext(preferences)}\n\nCONTINUITY (use quietly)\n${memoryContext || "None"}\n\nALLOWED EVIDENCE (most relevant first)\n${sourceContext}\n\nChoose ${minimumEvidence} distinct canonical references from the evidence. Current lens: ${selectedMode}. ${forceSelectedMode ? `Keep ${selectedMode}.` : "Auto-fit may choose a better lens."}${expectedSafeTopic === "crisis" ? " Lead the opening with immediate qualified human help. Do not delay help for reflection." : ""}\n\nQUESTION\n${question}` },
      ], text: { format: { type: "json_schema", name: "aletheia_wisdom_intelligence", strict: true, schema: responseSchema(preferences.language, modelSources, minimumEvidence) } } }, { signal });
      providerUnavailable = false;
      const raw = JSON.parse(response.output_text) as CounselDraft;
      const probabilities = normalizeModeProbabilities(raw.probabilities);
      if (!probabilities || !modes.includes(raw.recommendedMode)) throw new Error("invalid structured response");
      const recommendedMode = forceSelectedMode
        ? selectedMode
        : raw.ambiguity.uncertain
        ? selectedMode
        : resolveUnifiedRecommendedMode(probabilities, selectedMode, raw.ambiguity.mixed);
      const candidate = assembleCompanionDraft({
        ...raw, recommendedMode, probabilities,
        safeTopic: expectedSafeTopic === "general" ? raw.safeTopic : expectedSafeTopic,
      }, preferences, question);
      const quality = validateWisdomIntelligence(candidate, modelSources, preferences, minimumEvidence);
      if (!quality.passed) throw new Error(`quality gate: ${Object.entries(quality.checks).filter(([, ok]) => !ok).map(([name]) => name).join(",")}`);
      failures = 0;
      return { ...candidate, quality, routing: { route: modelRoute.route, attempts, latencyMs: Date.now() - started, circuitOpen: false } };
    } catch (error) {
      const reason = signal.aborted ? "timeout" : error instanceof Error && error.message.startsWith("quality gate:")
        ? error.message : error instanceof Error ? error.constructor.name : "unknown";
      console.warn("[wisdom-intelligence] counsel attempt failed", { route: modelRoute.route, reason });
    }
  }
  failures = providerUnavailable ? failures + 1 : 0;
  if (failures >= 2) circuitOpenUntil = Date.now() + 60_000;
  return deterministic(question, selectedMode, sources, preferences, started, attempts, forceSelectedMode);
}
