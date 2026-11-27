import { MODE_KEYS, type Mode } from "@/lib/mode-keys";
import type { ModeSuggestion } from "@/lib/mode-suggestion";

export type ModeProbabilities = Record<Mode, number>;

export type SemanticModeFit = {
  probabilities: ModeProbabilities;
  mixed: boolean;
  topic: string;
};

export type CalibratedSemanticSuggestion = {
  mode: Mode;
  confidence: "very_high";
  evidence: "semantic";
  topic: string;
  leadingProbability: number;
  selectedProbability: number;
  margin: number;
};

const modes = Object.values(MODE_KEYS) as Mode[];

export function resolveTrustedModeSuggestion({
  semanticAvailable,
  semanticSuggestion,
  localSuggestion,
}: {
  semanticAvailable: boolean;
  semanticSuggestion: CalibratedSemanticSuggestion | null;
  localSuggestion: ModeSuggestion | null;
}) {
  return semanticAvailable ? semanticSuggestion : localSuggestion;
}

export function normalizeModeProbabilities(value: unknown): ModeProbabilities | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (modes.some((mode) => typeof record[mode] !== "number")) return null;
  const entries = modes.map((mode) => [mode, record[mode] as number] as const);
  if (entries.some(([, probability]) => !Number.isFinite(probability) || probability < 0 || probability > 1)) return null;
  const total = entries.reduce((sum, [, probability]) => sum + probability, 0);
  if (total < 0.98 || total > 1.02) return null;
  return Object.fromEntries(entries.map(([mode, probability]) => [mode, probability / total])) as ModeProbabilities;
}

export function resolveUnifiedRecommendedMode(probabilities: ModeProbabilities, selectedMode: Mode, mixed: boolean) {
  const ranked = modes.map((mode) => ({ mode, probability: probabilities[mode] }))
    .sort((left, right) => right.probability - left.probability);
  const leader = ranked[0];
  const runnerUp = ranked[1];
  if (leader.mode === selectedMode) return selectedMode;
  const dominant = leader.probability + Number.EPSILON >= 0.5
    && leader.probability - probabilities[selectedMode] + Number.EPSILON >= 0.25
    && leader.probability - runnerUp.probability + Number.EPSILON >= 0.2;
  const selectedLensDisplaced = probabilities[selectedMode] <= 0.1 + Number.EPSILON
    && leader.probability + Number.EPSILON >= (mixed ? 0.5 : 2 / modes.length)
    && leader.probability - runnerUp.probability > Number.EPSILON;
  if (dominant || selectedLensDisplaced) return leader.mode;
  if (mixed) return selectedMode;
  return calibrateSemanticModeFit({ probabilities, mixed: false, topic: "unified" }, selectedMode)?.mode ?? selectedMode;
}

export function calibrateSemanticModeFit(
  fit: SemanticModeFit,
  selectedMode: Mode,
): CalibratedSemanticSuggestion | null {
  if (fit.mixed) return null;
  const ranked = modes
    .map((mode) => ({ mode, probability: fit.probabilities[mode] }))
    .sort((left, right) => right.probability - left.probability);
  const leader = ranked[0];
  const runnerUp = ranked[1];
  const selectedProbability = fit.probabilities[selectedMode];
  if (
    !leader || leader.mode === selectedMode || leader.probability + Number.EPSILON < 0.62
    || leader.probability - selectedProbability + Number.EPSILON < 0.25
    || leader.probability - (runnerUp?.probability ?? 0) + Number.EPSILON < 0.15
  ) return null;
  return {
    mode: leader.mode,
    confidence: "very_high",
    evidence: "semantic",
    topic: fit.topic.replace(/[^a-z0-9_-]/gi, "_").slice(0, 48) || "general",
    leadingProbability: leader.probability,
    selectedProbability,
    margin: leader.probability - selectedProbability,
  };
}
