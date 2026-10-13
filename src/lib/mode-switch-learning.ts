import type { Mode } from "@/lib/mode-keys";
import type { ModeSuggestion } from "@/lib/mode-suggestion";

// Keep learned feedback scoped to the classifier policy that produced it.
// The v1 policy was exercised heavily during QA and could silently suppress
// newly improved, high-confidence suggestions for 90 days after an app update.
const STORAGE_KEY = "aletheia_mode_switch_learning_v2";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

type TransitionFeedback = {
  accepted: number;
  declined: number;
  updatedAt: number;
};

type LearningState = Record<string, TransitionFeedback>;

function transitionKey(originalMode: Mode, suggestedMode: Mode) {
  return `${originalMode}>${suggestedMode}`;
}

function learnedKey(originalMode: Mode, suggestion: Pick<ModeSuggestion, "mode" | "topic" | "evidence">) {
  return `${transitionKey(originalMode, suggestion.mode)}:${suggestion.topic ?? suggestion.evidence}`;
}

function readState(storage: Pick<Storage, "getItem">): LearningState {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed as LearningState : {};
  } catch {
    return {};
  }
}

export function shouldApplyLearnedModeSuggestion(
  storage: Pick<Storage, "getItem">,
  originalMode: Mode,
  suggestion: ModeSuggestion,
  now = Date.now(),
) {
  const feedback = readState(storage)[learnedKey(originalMode, suggestion)];
  if (!feedback || now - feedback.updatedAt > MAX_AGE_MS) return true;
  const resistance = feedback.declined - feedback.accepted;
  const threshold = suggestion.confidence === "very_high" ? 3 : 2;
  return resistance < threshold;
}

export function recordModeSwitchFeedback(
  storage: Pick<Storage, "getItem" | "setItem">,
  originalMode: Mode,
  suggestedMode: Mode,
  topic: string,
  outcome: "accepted" | "declined",
  now = Date.now(),
) {
  try {
    const state = readState(storage);
    const key = `${transitionKey(originalMode, suggestedMode)}:${topic}`;
    const previous = state[key];
    const current = !previous || now - previous.updatedAt > MAX_AGE_MS
      ? { accepted: 0, declined: 0, updatedAt: now }
      : previous;
    state[key] = {
      accepted: Math.min(20, current.accepted + (outcome === "accepted" ? 1 : 0)),
      declined: Math.min(20, current.declined + (outcome === "declined" ? 1 : 0)),
      updatedAt: now,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Personalization is best-effort and never blocks an answer.
  }
}

export const modeSwitchLearningStorageKey = STORAGE_KEY;
