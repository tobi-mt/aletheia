import { answerContinuationPromptPrefix, focusedContinuation } from "@/lib/companion-counsel";
import { counselSafetyTopic } from "@/lib/counsel-safety";
import type { UserPreferences } from "@/lib/localization";
import type { Mode } from "@/lib/wisdom-data";

export type AnswerContinuation = {
  kind: "boundary" | "counsel" | "next_step" | "clarify";
  direction: string;
  prompt: string;
};

type ContinuationReasoningPlan = {
  tension?: string;
  diagnosticQuestion?: string;
  nextStep?: string;
};

export type AnswerContinuationContext = {
  reasoningPlan?: ContinuationReasoningPlan;
  safeTopic?: string;
  responseLanguage?: UserPreferences["language"];
  routing?: { route: "primary" | "secondary" | "deterministic" };
};

const SIGNALS: Array<{ kind: AnswerContinuation["kind"]; pattern: RegExp; weight: number }> = [
  { kind: "boundary", pattern: /\b(boundar(?:y|ies)|limit|capacity|say no|overcommit|burnout|resent)/i, weight: 5 },
  { kind: "counsel", pattern: /\b(counsel|trusted (?:voice|person)|mentor|advisor|ask someone|relationship|family|spouse)/i, weight: 4 },
  { kind: "next_step", pattern: /\b(next (?:faithful )?step|start with|begin by|practice|try|pause|wait|experiment)/i, weight: 3 },
  { kind: "clarify", pattern: /\b(tension|question beneath|notice|discern|clarify|motive|fear|pressure|shame|guilt|explore|deeper)/i, weight: 4 },
];

const MAX_DIRECTION_LENGTH = 160;
const QUESTION_END = /[?؟？]$/u;
const SCRIPTURE_QUOTE_PATTERN = /(?:\b(?:genesis|exodus|psalms?|proverbs?|matthew|mark|luke|john|romans|corinthians|galatians|ephesians|philippians|james|peter)\b\s*\d+\s*:\s*\d+)|[“”]/i;
const ENGLISH_CLOSED_OR_PRESSURING = /^(?:are|is|am|do|does|did|can|could|should|would|will|have|has)\b|\b(?:what(?:'s| is) wrong with you|why (?:can't|won't|haven't) you|why (?:can’t|won’t|haven’t) you|why don['’]t you|shouldn['’]t you)\b/i;
const ENGLISH_GENERIC = /^(?:what matters most(?: to you)?|how (?:does that make you feel|do you feel about (?:that|this|it))|what feels right(?: to you)?|what would be a (?:wise )?next step)\?$/i;
const ENGLISH_STACKED = /\b(?:and|or)\s+(?:what|how|where|when|who|why|which)\s+(?:would|could|should|will|is|are|do|does|can|might|have)\b/i;

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clipAtWord(value: string, maxLength: number) {
  const normalized = clean(value);
  if (normalized.length <= maxLength) return normalized;
  const clipped = normalized.slice(0, maxLength - 1).replace(/\s+\S*$/u, "").trimEnd();
  return `${clipped || normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function sentences(answer: string) {
  return clean(answer)
    .split(/(?<=[.!?؟？])\s+/u)
    .map(clean)
    .filter((sentence) => sentence.length >= 24 && sentence.length <= MAX_DIRECTION_LENGTH)
    .filter((sentence) => !SCRIPTURE_QUOTE_PATTERN.test(sentence));
}

function kindFor(text: string): AnswerContinuation["kind"] {
  return SIGNALS
    .filter((signal) => signal.pattern.test(text))
    .sort((left, right) => right.weight - left.weight)[0]?.kind ?? "clarify";
}

function userFacingDiagnostic(plan?: ContinuationReasoningPlan) {
  const diagnostic = clean(plan?.diagnosticQuestion ?? "");
  const withoutTrackLabel = diagnostic.replace(/^\p{L}[\p{L}\p{M}-]{1,29}[:：]\s*/u, "");
  const directlyAddressed = withoutTrackLabel
    .replace(/\bthe user['’]s\b/giu, "your")
    .replace(/\bthe user\b/giu, "you");
  return directlyAddressed.charAt(0).toLocaleUpperCase() + directlyAddressed.slice(1);
}

function comparableDirection(text: string) {
  return text.toLocaleLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
}

function contentTerms(text: string) {
  return new Set(comparableDirection(text).split(" ").filter((word) => word.length >= 4
    && !/^(?:what|when|where|which|would|could|should|will|does|your|have|with|that|this|from|about|need|want|write|down)$/u.test(word)));
}

function usefulQuestion(direction: string, question: string, answer: string, language: UserPreferences["language"]) {
  if (direction.length < 12 || direction.length > MAX_DIRECTION_LENGTH
    || !QUESTION_END.test(direction) || (direction.match(/[?؟？]/gu)?.length ?? 0) !== 1
    || SCRIPTURE_QUOTE_PATTERN.test(direction)
    || (language === "en" && (ENGLISH_CLOSED_OR_PRESSURING.test(direction) || ENGLISH_GENERIC.test(direction)
      || ENGLISH_STACKED.test(direction)))) return false;

  const normalized = comparableDirection(direction);
  const terms = contentTerms(direction);
  return ![question, ...clean(answer).split(/(?<=[.!?؟？])\s+/u)].some((previous) => {
    if (normalized === comparableDirection(previous)) return true;
    const previousTerms = contentTerms(previous);
    const shared = [...terms].filter((term) => previousTerms.has(term)).length;
    return shared >= 3 && shared / Math.max(terms.size, previousTerms.size) >= 0.8;
  });
}

function fallbackDirection(question: string, answer: string, language: UserPreferences["language"]) {
  const questionTerms = new Set(
    clean(question)
      .toLocaleLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((term) => term.length >= 5),
  );

  return sentences(answer)
    .filter((sentence) => usefulQuestion(sentence, question, "", language))
    .map((sentence) => {
      const matchingSignal = SIGNALS
        .filter((signal) => signal.pattern.test(sentence))
        .reduce((best, signal) => Math.max(best, signal.weight), 0);
      const sharedTerms = sentence
        .toLocaleLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((term) => questionTerms.has(term)).length;
      return { sentence, score: matchingSignal + Math.min(sharedTerms, 3) * 2 };
    })
    .sort((left, right) => right.score - left.score)[0]?.sentence ?? "";
}

export function buildAnswerContinuation(
  question: string,
  answer: string,
  mode: Mode,
  context: AnswerContinuationContext = {},
): AnswerContinuation | null {
  const normalizedQuestion = clean(question);
  if (!normalizedQuestion || context.safeTopic === "crisis"
    || counselSafetyTopic(normalizedQuestion) === "crisis"
    || /immediate danger/i.test(`${question} ${answer}`)) return null;

  const language = context.responseLanguage ?? "en";
  const focused = focusedContinuation(normalizedQuestion, language);
  if (!focused?.priority && context.routing?.route !== "deterministic" && context.reasoningPlan?.diagnosticQuestion === "") return null;
  const diagnosedDirection = context.routing?.route === "deterministic" ? "" : userFacingDiagnostic(context.reasoningPlan);
  const candidates = focused?.priority ? [focused.direction] : [diagnosedDirection, focused?.direction];
  const direction = candidates.find((candidate) => candidate && usefulQuestion(candidate, normalizedQuestion, answer, language))
    ?? (focused?.priority ? "" : fallbackDirection(normalizedQuestion, answer, language));
  if (!direction) return null;

  const kind = kindFor([
    direction,
    context.reasoningPlan?.tension,
    context.reasoningPlan?.nextStep,
    normalizedQuestion,
  ].filter(Boolean).join(" "));

  return {
    kind,
    direction,
    prompt: `${answerContinuationPromptPrefix}${JSON.stringify(direction)}\nOriginal ${mode} question: ${JSON.stringify(clipAtWord(normalizedQuestion, 1800))}${context.reasoningPlan?.nextStep ? `\nPrevious advice (already given): ${JSON.stringify(clipAtWord(context.reasoningPlan.nextStep, 400))}` : ""}\nAnswer the continuation, not the original question again. Respond with one honest insight, relevant Scripture connections from approved evidence, and one small proportionate next step. Respect constraints and options already ruled out. Do not assume I made a choice. Do not repeat the previous answer, overwhelm me with options, diagnose me, shame me, or claim certainty.`,
  };
}

export function continuationLabel(direction: string, continueLabel: string, maxLength?: number) {
  const cleanDirection = clean(direction).replace(/[.!?]+$/, "");
  const clipped = maxLength ? clipAtWord(cleanDirection, maxLength) : cleanDirection;
  return `${continueLabel}: ${clipped}`;
}
