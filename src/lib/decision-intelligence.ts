import {
  defaultPreferences,
  localizedModeProfile,
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
      return `${localizedSource.scripture} (${scriptureDisplayLabel(localizedSource.scripture, preferences)}): ${localizedSource.principle}`;
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
