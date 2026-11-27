import "server-only";
import OpenAI from "openai";
import { localizedCrisisSupportCopy, localizedModeProfile, localizedScriptureReference, localizedWisdomEntry, promptPreferenceContext, responseLanguageContract, type LanguageCode, type UserPreferences } from "@/lib/localization";
import { MODE_KEYS, type Mode } from "@/lib/mode-keys";
import { suggestModeForQuestion } from "@/lib/mode-suggestion";
import { normalizeModeProbabilities, resolveUnifiedRecommendedMode, type ModeProbabilities } from "@/lib/semantic-mode-fit";
import type { RuntimeModeFit } from "@/lib/runtime-mode-fit";
import type { WisdomSource } from "@/lib/wisdom";
import { closedWorkloadNextStep, composeCompanionCounsel, isFixedWorkloadContinuation, preferredCounselReferences, requiredBiblicalEvidenceCount } from "@/lib/companion-counsel";
import { counselSafetyBoundary, counselSafetyTopic, type SafeTopic } from "@/lib/counsel-safety";
import { scriptureTextMatches } from "@/lib/scripture-text-matches";

const modes = Object.values(MODE_KEYS) as Mode[];
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 }) : null;
let failures = 0;
let circuitOpenUntil = 0;

export type { SafeTopic } from "@/lib/counsel-safety";
export { requiredBiblicalEvidenceCount } from "@/lib/companion-counsel";
export { resolveUnifiedRecommendedMode } from "@/lib/semantic-mode-fit";
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

type CounselDraft = Omit<WisdomIntelligence, "quality" | "routing" | "counsel" | "biblicalEvidence"> & {
  opening: string;
  biblicalEvidence: Array<WisdomIntelligence["biblicalEvidence"][number] & { questionDetail: string }>;
};

function responseSchema(language: LanguageCode, sources: WisdomSource[], minimumEvidence: number, requiredMode?: Mode) {
  const allowedReferences = sources.map((source) => source.scripture);
  return {
  type: "object", additionalProperties: false,
  properties: {
    responseLanguage: { type: "string", enum: [language] },
    recommendedMode: { type: "string", enum: requiredMode ? [requiredMode] : modes },
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
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          reference: { type: "string", enum: allowedReferences },
          connection: { type: "string", minLength: 24, maxLength: 600, description: "Explain the passage in context and apply it to the requested outcome. Use a meaningful word or short phrase from QUESTION naturally within your explanation. Do not add a citation label or repeat the whole question." },
          questionDetail: { type: "string", description: "After writing connection, extract a short, meaningful, exact substring present in BOTH connection and QUESTION (case-insensitive). Prefer a concrete noun or short phrase, not a sentence. For example, if both discuss life, use life rather than copying an entire interrogative sentence. Do not use a citation, generic filler, or terminal punctuation." },
        },
        required: ["reference", "connection", "questionDetail"],
      },
    },
    opening: { type: "string", minLength: 24, maxLength: 500 },
  }, required: ["responseLanguage", "recommendedMode", "probabilities", "ambiguity", "safeTopic", "reasoningPlan", "biblicalEvidence", "opening"],
  } as const;
}

function fallbackProbabilities(mode: Mode): ModeProbabilities {
  return Object.fromEntries(modes.map((item) => [item, item === mode ? 0.68 : 0.08])) as ModeProbabilities;
}

function normalizeEvidenceText(value: string) {
  return value.normalize("NFKC").replace(/[‘’]/gu, "'").replace(/[“”]/gu, '"')
    .replace(/[\s\u00a0]+/gu, " ").trim().toLocaleLowerCase();
}

export function assembleCompanionDraft(draft: CounselDraft, preferences: UserPreferences, question: string) {
  const { opening, ...result } = draft;
  const biblicalEvidence = draft.biblicalEvidence.map(({ reference, connection }) => ({
    reference,
    connection: `${localizedScriptureReference(reference, preferences.language)} — ${connection.trim()}`,
  }));
  const boundary = counselSafetyBoundary(result.safeTopic, preferences.language);
  const nextStep = closedWorkloadNextStep(question, preferences.language) ?? result.reasoningPlan.nextStep.trim();
  const counsel = [opening.trim(), ...biblicalEvidence.map(({ connection }) => connection), boundary, nextStep]
    .filter(Boolean).join("\n\n");
  return { ...result, reasoningPlan: { ...result.reasoningPlan, nextStep }, biblicalEvidence, counsel };
}

function hasQuestionGrounding(draft: CounselDraft, question: string, language: LanguageCode) {
  const questionText = normalizeEvidenceText(question);
  const references = draft.biblicalEvidence.map(({ reference }) => reference);
  const connections = new Set<string>();
  return draft.biblicalEvidence.every(({ questionDetail, connection }) => {
    if (typeof questionDetail !== "string" || typeof connection !== "string") return false;
    const detail = normalizeEvidenceText(questionDetail).trim();
    const explanation = normalizeEvidenceText(connection).trim();
    if (detail.length < 4 || !questionText.includes(detail) || !explanation.includes(detail)
      || scriptureTextMatches(detail, references, language).some(({ label }) => label === detail)
      || /^(?:what should i do|can you help|how do i|what do i do)[?.!]*$/iu.test(detail)
      || connections.has(explanation)) return false;
    connections.add(explanation);
    return true;
  });
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
  return result.biblicalEvidence.length >= Math.max(1, minimumEvidence)
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
  const boundary = counselSafetyBoundary(result.safeTopic, preferences.language);
  const crisisCopy = localizedCrisisSupportCopy(preferences.language);
  const checks = {
    responseLanguage: result.responseLanguage === preferences.language,
    modeAdherence: modes.includes(result.recommendedMode) && planParts.every((part) => part.length >= 10) && new Set(planParts).size === planParts.length,
    biblicalGrounding: biblicalGroundingIntegrity(result, sources, preferences, minimumEvidence),
    calibratedCertainty: !/god (?:told|promises) you|guaranteed|certainly will|cannot fail/i.test(result.counsel),
    relevantNextStep: result.reasoningPlan.nextStep.trim().length >= 12,
    specificCounsel: result.counsel.trim().length >= 180 && !/just trust|follow your heart|everything happens for a reason/i.test(result.counsel),
    safetyBoundary: result.safeTopic === "crisis"
      ? result.counsel.startsWith(boundary) || result.counsel.startsWith(`${crisisCopy.selfHarmOpening}\n\n${crisisCopy.selfHarmImmediate}`)
      : !boundary || result.counsel.split("\n\n").includes(boundary),
  };
  return { passed: Object.values(checks).every(Boolean), checks };
}

function deterministic(question: string, selectedMode: Mode, sources: WisdomSource[], preferences: UserPreferences, started: number, attempts: number, forceSelectedMode = false, safeTopic = counselSafetyTopic(question), modeFit?: RuntimeModeFit): WisdomIntelligence {
  const fit = !forceSelectedMode && safeTopic !== "crisis" && modeFit?.available ? modeFit : undefined;
  const suggestion = forceSelectedMode || safeTopic === "crisis" || fit ? null : suggestModeForQuestion(question, selectedMode);
  const recommendedMode = fit?.recommendedMode ?? suggestion?.mode ?? selectedMode;
  const profile = localizedModeProfile(recommendedMode, preferences.language);
  const minimumEvidence = requiredBiblicalEvidenceCount(question, sources.length, safeTopic);
  const fallback = composeCompanionCounsel(question, sources, preferences, safeTopic);
  const base = {
    responseLanguage: preferences.language,
    recommendedMode, probabilities: fit?.probabilities ?? fallbackProbabilities(recommendedMode),
    ambiguity: {
      mixed: fit?.mixed ?? false,
      uncertain: fit?.uncertain ?? !suggestion,
      alternativeMode: null,
      reason: suggestion ? profile.useWhen : profile.promptCue,
    },
    safeTopic,
    reasoningPlan: { tension: profile.diagnosticTracks[0], diagnosticQuestion: "", blindSpot: profile.blindSpots[0], maturitySignal: profile.maturitySignals[0], nextStep: fallback.nextStep },
    biblicalEvidence: fallback.biblicalEvidence,
    counsel: fallback.text,
  };
  return { ...base, quality: validateWisdomIntelligence(base, sources, preferences, minimumEvidence), routing: { route: "deterministic", attempts, latencyMs: Date.now() - started, circuitOpen: Date.now() < circuitOpenUntil } };
}

export async function generateWisdomIntelligence({ question, selectedMode, sources, preferences, memoryContext = "", allowModel = true, forceSelectedMode = false, modeFit, modelDeadline }: { question: string; selectedMode: Mode; sources: WisdomSource[]; preferences: UserPreferences; memoryContext?: string; allowModel?: boolean; forceSelectedMode?: boolean; modeFit?: RuntimeModeFit; modelDeadline?: number }): Promise<WisdomIntelligence> {
  const started = Date.now();
  const expectedSafeTopic = counselSafetyTopic(question);
  const fit = !forceSelectedMode && modeFit?.available ? modeFit : undefined;
  const counselMode = fit?.recommendedMode ?? selectedMode;
  const keepSelectedMode = forceSelectedMode || Boolean(fit);
  if (!allowModel || !client || !sources.length || expectedSafeTopic === "crisis"
    || (preferences.language === "en" && isFixedWorkloadContinuation(question)) || Date.now() < circuitOpenUntil) {
    return deterministic(question, selectedMode, sources, preferences, started, 0, forceSelectedMode, expectedSafeTopic, fit);
  }
  const minimumEvidence = requiredBiblicalEvidenceCount(question, sources.length, expectedSafeTopic);
  const evidenceFloor = minimumEvidence;
  const preferred = preferredCounselReferences(question);
  const focusedSources = sources.filter(({ scripture }) => preferred.includes(scripture));
  const modelSources = [...focusedSources, ...sources.filter(({ scripture }) => !preferred.includes(scripture))];
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
    { model: primaryModel, route: "primary" as const },
    { model: secondaryModel, route: "secondary" as const },
  ];
  const deadline = modelDeadline ?? performance.now() + 18_000;
  let attempts = 0;
  let providerUnavailable = true;
  let repair = "";
  for (const modelRoute of routes) {
    const remaining = Math.floor(deadline - performance.now());
    if (remaining <= 0) break;
    const timeoutMs = modelRoute.route === "primary" ? Math.min(11_000, remaining) : remaining;
    const attemptStarted = performance.now();
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      attempts += 1;
      const response = await client.responses.create({ model: modelRoute.model, max_output_tokens: 950, input: [
        { role: "developer", content: `${responseLanguageContract(preferences.language)}\n\nYou are Ask Aletheia. First distinguish the outcome requested, the situation causing it, and any tension the person actually expressed. Choose the lens for the requested outcome: negotiating hours is Work; repairing a marriage strained by those hours is Life; covering rent is Money; setting a limit on repeated financial help is Generosity; separating self-worth from achievement or understanding life's meaning is Purpose. Fear or guilt alone does not decide the lens. Ignore topics explicitly ruled out. Use continuity only to resolve references in a follow-up, not to override a new goal. Do not infer diagnoses, hidden motives, or personal history. In ambiguity.reason, explain the concrete need in plain language without assigning a motive the person did not state. Probabilities sum to 1. Mark mixed only for genuinely competing lenses. Keep private plan fields brief. Never claim divine certainty or replace qualified care.\n\nWrite only one or two short sentences per visible field, with no headings or lists. Opening: answer the actual question directly. For a decision, name one concrete fact that changes the advice and the expressed tension; for a question about meaning, explain the biblical answer without inventing a decision or personal circumstance. Each connection: explain the passage in context and how it helps here; do not include a citation label or quote verse text, which the app supplies through the linked reader. Next step: one observable action (such as a specific question to ask, a sentence to say, or one fact to write down), not a general instruction to reflect or talk. Do not retry a closed option. Be compassionate without equating guilt or tiredness with wrongdoing. The app supplies localized safety guidance; do not write a separate disclaimer. In every field, do not diagnose, prescribe, suggest medication changes, provide legal or investment instructions, or advise delaying professional or emergency help. Help the person prepare a question or gather information instead. Set safeTopic to crisis if the current question indicates immediate danger or self-harm; the app will replace your draft with immediate human-support guidance.${repair}` },
        { role: "user", content: `LENSES\n${profiles}\n\nPREFERENCES\n${promptPreferenceContext(preferences)}\n\nCONTINUITY (use quietly)\n${memoryContext || "None"}\n\nALLOWED EVIDENCE (most relevant first)\n${sourceContext}\n\nUse at least ${minimumEvidence} distinct canonical references. Do not pad with irrelevant passages. For each passage, use its provided context and explain how it changes what the person can do or notice about the specific detail you identified. A shared theme or emotion alone is not enough. Add other passages only for distinct, useful insights. Put every citation in biblicalEvidence, not in the other fields. Current lens: ${counselMode}. ${keepSelectedMode ? `Keep ${counselMode}. This lens is authoritative for this answer; address secondary concerns without replacing it.` : "Auto-fit may choose a better lens when there is a clearly primary goal."}\n\nQUESTION\n${question}` },
      ], text: { format: { type: "json_schema", name: "aletheia_wisdom_intelligence", strict: true, schema: responseSchema(preferences.language, modelSources, evidenceFloor, keepSelectedMode ? counselMode : undefined) } } }, { signal });
      providerUnavailable = false;
      if (response.status === "incomplete") throw new Error("incomplete response");
      const raw = JSON.parse(response.output_text) as CounselDraft;
      if (raw.safeTopic === "crisis") {
        failures = 0;
        circuitOpenUntil = 0;
        return deterministic(question, selectedMode, sources, preferences, started, attempts, forceSelectedMode, "crisis");
      }
      if (!hasQuestionGrounding(raw, question, preferences.language)) throw new Error("quality gate: questionGrounding");
      const probabilities = normalizeModeProbabilities(raw.probabilities);
      if (!probabilities || !modes.includes(raw.recommendedMode)) throw new Error("invalid structured response");
      const recommendedMode = keepSelectedMode
        ? counselMode
        : (raw.ambiguity.uncertain
        ? selectedMode
        : resolveUnifiedRecommendedMode(probabilities, selectedMode, raw.ambiguity.mixed));
      const ambiguity = recommendedMode !== raw.recommendedMode
        ? { ...raw.ambiguity, reason: "", alternativeMode: null }
        : raw.ambiguity;
      const candidate = assembleCompanionDraft({
        ...raw, recommendedMode, probabilities: fit?.probabilities ?? probabilities,
        ambiguity: fit ? { ...ambiguity, mixed: fit.mixed, uncertain: fit.uncertain } : ambiguity,
        safeTopic: expectedSafeTopic === "general" ? raw.safeTopic : expectedSafeTopic,
      }, preferences, question);
      const quality = validateWisdomIntelligence(candidate, modelSources, preferences, evidenceFloor);
      if (!quality.passed) throw new Error(`quality gate: ${Object.entries(quality.checks).filter(([, ok]) => !ok).map(([name]) => name).join(",")}`);
      failures = 0;
      circuitOpenUntil = 0;
      return { ...candidate, quality, routing: { route: modelRoute.route, attempts, latencyMs: Date.now() - started, circuitOpen: false } };
    } catch (error) {
      const reason = signal.aborted ? "timeout" : error instanceof Error && error.message.startsWith("quality gate:")
        ? error.message : error instanceof Error && error.message === "incomplete response" ? error.message
          : error instanceof Error ? error.constructor.name : "unknown";
      console.warn("[wisdom-intelligence] counsel attempt failed", { route: modelRoute.route, reason, timeoutMs, elapsedMs: Math.round(performance.now() - attemptStarted) });
      if (reason === "timeout" && primaryModel === secondaryModel) break;
      if (reason.startsWith("quality gate:")) repair = `\n\nRevise the response to satisfy the failed checks: ${reason.slice("quality gate: ".length)}. Check every passage against the person's actual question before answering. For questionGrounding, copy a meaningful phrase from QUESTION verbatim into questionDetail and include that same phrase naturally in connection. Answer the actual question directly; do not invent a decision or a personal circumstance.`;
      if (reason === "incomplete response") repair = "\n\nKeep the private plan and visible paragraphs concise enough to finish the structured response.";
    }
  }
  failures = providerUnavailable ? failures + 1 : 0;
  if (failures >= 2) circuitOpenUntil = Date.now() + 60_000;
  return deterministic(question, selectedMode, sources, preferences, started, attempts, forceSelectedMode, expectedSafeTopic, fit);
}
