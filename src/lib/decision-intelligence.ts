import {
  defaultPreferences,
  localizedModeProfile,
  localizedScriptureReference,
  localizedWisdomEntry,
  scriptureDisplayLabel,
  type UserPreferences,
} from "@/lib/localization";
import type { Mode } from "@/lib/wisdom-data";
import type { WisdomSource } from "@/lib/wisdom";

export type DecisionSignals = {
  readiness: number;
  emotionalPressure: number;
  motiveClarity: number;
  counselSought: boolean;
  costCounted: boolean;
  alignmentClear: boolean;
  reversibleStep: boolean;
  peaceOverUrgency: boolean;
  concerns: string[];
  nextFaithfulStep: string;
};

export const patternMatchers = {
  urgency: /urgent|quick|today|now|asap|immediately|panic|fomo|rush|can't wait/i,
  comparison: /compare|behind|everyone|others|envy|jealous|not enough|successful/i,
  greed: /rich|wealthy|more money|greed|greedy|status|luxury|prove/i,
  fear: /fear|afraid|scared|anxious|worry|worried|terrified|insecure/i,
  avoidance: /avoid|escape|run away|don't want to face|ignore|postpone/i,
  shame: /shame|ashamed|failure|failed|embarrassed|unworthy/i,
  overgiving: /guilt|can't say no|always help|rescue|enable|overgive|owe them/i,
  burnout: /burnout|exhausted|tired|drained|overwhelmed|no energy/i,
  approval: /approval|applause|impress|notice me|validate|accepted|liked/i,
};

export function detectPatterns(text: string) {
  return Object.entries(patternMatchers)
    .filter(([, matcher]) => matcher.test(text))
    .map(([pattern]) => pattern);
}

function normalizeDraftText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function truncateDraftText(value: string, maxLength: number) {
  const trimmed = normalizeDraftText(value);
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function sentenceCaseDraftText(value: string) {
  const trimmed = normalizeDraftText(value);
  if (!trimmed) {
    return trimmed;
  }
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function stripQuestionPrefix(value: string) {
  return normalizeDraftText(value)
    .replace(/^(how do i|how can i|how should i|what should i|what do i do to|what is the best way to|should i|do i|can i|is it wise to|is it okay to|how do we|how can we)\s+/i, "")
    .replace(/\?+$/g, "")
    .trim();
}

function cleanAnswerLead(value: string) {
  const lead = normalizeDraftText(value)
    .replace(/^(it sounds like|you may be|this seems to be|the pressure may be|the main pressure is|it may help to|consider|try|one next step is|a good next step is)\s+/i, "")
    .split(/(?:[.!?]\s+|\n)+/)[0]
    .trim();
  return lead;
}

export function buildDecisionDraftPrefill(question: string, answer: string) {
  const normalizedQuestion = normalizeDraftText(question);
  const normalizedAnswer = normalizeDraftText(answer);
  const title = sentenceCaseDraftText(truncateDraftText(stripQuestionPrefix(normalizedQuestion) || normalizedQuestion.replace(/\?+$/g, ""), 64));
  const patterns = detectPatterns(`${normalizedQuestion} ${normalizedAnswer}`);
  const pressureTopics = [
    patterns.includes("comparison") ? "comparison" : "",
    patterns.includes("urgency") ? "urgency" : "",
    patterns.includes("fear") ? "fear" : "",
    patterns.includes("shame") ? "shame" : "",
    patterns.includes("approval") ? "approval" : "",
    patterns.includes("burnout") ? "burnout" : "",
    patterns.includes("overgiving") ? "overgiving" : "",
  ].filter((topic): topic is string => Boolean(topic));
  const pressure =
    pressureTopics.length > 0
      ? sentenceCaseDraftText(truncateDraftText(`Pressure around ${pressureTopics.join(" and ")}`, 96))
      : sentenceCaseDraftText(truncateDraftText(cleanAnswerLead(normalizedAnswer) || `Pressure around ${stripQuestionPrefix(normalizedQuestion).toLowerCase() || normalizedQuestion.toLowerCase()}`, 96));
  const emotion =
    /peace|calm|steady|settled|rest|quiet/i.test(`${normalizedQuestion} ${normalizedAnswer}`)
      ? "peaceful"
      : patterns.includes("urgency") || patterns.includes("burnout")
        ? "pressured"
        : patterns.includes("fear") || patterns.includes("shame")
          ? "anxious"
          : /excited|hopeful|opportunity|open door/i.test(`${normalizedQuestion} ${normalizedAnswer}`)
            ? "excited"
            : "uncertain";

  return { title, pressure, emotion };
}

export function buildDecisionCardPreview(summary: string | null | undefined, fallback: string) {
  const normalizedSummary = (summary ?? "").trim();
  if (!normalizedSummary) {
    return fallback;
  }

  const lines = normalizedSummary
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bodyLines = lines.length > 1 ? lines.slice(1) : lines;
  const stripLabel = (value: string, label: string) => value.replace(new RegExp(`^${label}\\s*:?\\s*`, "i"), "").trim();
  const getNextLineAfterHeading = (heading: RegExp) => {
    const index = bodyLines.findIndex((line) => heading.test(line));
    if (index < 0) {
      return null;
    }
    return bodyLines.slice(index + 1).find((line) => Boolean(line)) ?? null;
  };

  const nextFaithfulStep = getNextLineAfterHeading(/^next faithful step/i);
  if (nextFaithfulStep) {
    return nextFaithfulStep.length > 120 ? `${nextFaithfulStep.slice(0, 119).trimEnd()}…` : nextFaithfulStep;
  }

  const mainConcern = bodyLines.find((line) => /^main concern/i.test(line));
  if (mainConcern) {
    return stripLabel(mainConcern, "main concern");
  }

  const questionHeadingIndex = bodyLines.findIndex((line) => /^questions to ask/i.test(line));
  if (questionHeadingIndex >= 0) {
    const firstQuestion = bodyLines.slice(questionHeadingIndex + 1).find((line) => /^[-•]/.test(line) || Boolean(line));
    if (firstQuestion) {
      const cleaned = firstQuestion.replace(/^[-•]\s*/, "").trim();
      return cleaned.length > 120 ? `${cleaned.slice(0, 119).trimEnd()}…` : cleaned;
    }
  }

  const previewLines = bodyLines.filter(
    (line) =>
      !/^(?:title|mode|initial pressure|initial emotion|wisdom lens|scripture anchors|discernment signal|questions to ask|next faithful step)\b/i.test(line)
  );
  const candidate = previewLines[0] ?? bodyLines[0] ?? lines[0] ?? fallback;
  return candidate.length > 120 ? `${candidate.slice(0, 119).trimEnd()}…` : candidate;
}

export function scoreDecision({
  pressure,
  emotion,
  counselSought,
  costCounted,
  alignmentClear,
  reversibleStep,
  peaceOverUrgency,
}: {
  pressure: string;
  emotion: string;
  counselSought: boolean;
  costCounted: boolean;
  alignmentClear: boolean;
  reversibleStep: boolean;
  peaceOverUrgency: boolean;
}): DecisionSignals {
  const patterns = detectPatterns(`${pressure} ${emotion}`);
  const emotionalPressure = Math.min(
    100,
    34 +
      (patterns.includes("urgency") ? 28 : 0) +
      (patterns.includes("fear") ? 18 : 0) +
      (patterns.includes("comparison") ? 12 : 0) +
      (/pressured|anxious|overwhelmed|afraid/i.test(emotion) ? 18 : 0)
  );
  const motiveClarity = Math.max(
    20,
    72 -
      (patterns.includes("approval") ? 18 : 0) -
      (patterns.includes("comparison") ? 16 : 0) -
      (patterns.includes("avoidance") ? 14 : 0) -
      (patterns.includes("shame") ? 10 : 0)
  );
  const readiness = Math.max(
    18,
    Math.min(
      95,
      34 +
        (counselSought ? 14 : 0) +
        (costCounted ? 16 : 0) +
        (alignmentClear ? 12 : 0) +
        (reversibleStep ? 10 : 0) +
        (peaceOverUrgency ? 12 : 0) +
        Math.round(motiveClarity / 8) -
        Math.round(emotionalPressure / 10)
    )
  );

  const concerns = [
    !counselSought ? "missing counsel" : "",
    !costCounted ? "unclear cost" : "",
    !alignmentClear ? "values need naming" : "",
    !reversibleStep ? "next step may be too irreversible" : "",
    !peaceOverUrgency ? "urgency may be louder than peace" : "",
  ].filter(Boolean);

  const nextFaithfulStep = !counselSought
    ? "Bring this decision to one wise person before acting."
    : !costCounted
      ? "Write the real cost in time, money, energy, and relationships."
      : !reversibleStep
        ? "Find the smallest reversible experiment."
        : !peaceOverUrgency
          ? "Wait until the emotional pressure quiets before committing."
          : "Record the decision, the reason, and the first faithful step.";

  return {
    readiness,
    emotionalPressure,
    motiveClarity,
    counselSought,
    costCounted,
    alignmentClear,
    reversibleStep,
    peaceOverUrgency,
    concerns,
    nextFaithfulStep,
  };
}

export function buildDecisionSummary({
  title,
  mode,
  pressure,
  emotion,
  sources,
  signals,
  preferences = defaultPreferences,
}: {
  title: string;
  mode: Mode;
  pressure: string;
  emotion: string;
  sources: WisdomSource[];
  signals: DecisionSignals;
  preferences?: UserPreferences;
}) {
  const profile = localizedModeProfile(mode, preferences.language);
  const anchors = sources
    .slice(0, 3)
    .map((source) => {
      const localizedSource = localizedWisdomEntry(source, preferences);
      const scriptureReference = localizedScriptureReference(source.scripture, preferences.language);
      return `${scriptureReference} (${scriptureDisplayLabel(localizedSource.scripture, preferences)}): ${localizedSource.principle}`;
    })
    .join("\n");

  return [
    title,
    "",
    `Mode: ${mode}`,
    `Initial pressure: ${pressure}`,
    `Initial emotion: ${emotion}`,
    "",
    "Wisdom lens",
    profile.lens,
    "",
    "Scripture anchors",
    anchors || "No anchors selected yet.",
    "",
    "Discernment signal",
    `Readiness: ${signals.readiness}%`,
    `Emotional pressure: ${signals.emotionalPressure}%`,
    `Motive clarity: ${signals.motiveClarity}%`,
    signals.concerns.length ? `Main concern: ${signals.concerns.join(", ")}` : "Main concern: none obvious yet",
    "",
    "Questions to ask",
    ...profile.diagnosticTracks.slice(0, 3).map((track) => `- ${track}`),
    "",
    "Next faithful step",
    signals.nextFaithfulStep,
  ].join("\n");
}
