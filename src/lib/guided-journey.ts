export const GUIDED_JOURNEY_STORAGE_KEY = "aletheia_guided_journey_v1";

export const GUIDED_JOURNEY_STEPS = [
  "welcome",
  "today",
  "ask",
  "decisions",
  "reflect",
  "library",
  "account",
] as const;

export type GuidedJourneyStep = (typeof GUIDED_JOURNEY_STEPS)[number];

export type GuidedJourneyState = {
  version: 1;
  nextStepIndex: number;
  lastPresentedDate: string;
};

export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startGuidedJourney(date = new Date()): GuidedJourneyState {
  return {
    version: 1,
    nextStepIndex: 1,
    lastPresentedDate: localDateKey(date),
  };
}

export function parseGuidedJourneyState(value: string | null): GuidedJourneyState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<GuidedJourneyState>;
    if (
      parsed.version !== 1 ||
      !Number.isInteger(parsed.nextStepIndex) ||
      Number(parsed.nextStepIndex) < 1 ||
      Number(parsed.nextStepIndex) > GUIDED_JOURNEY_STEPS.length ||
      typeof parsed.lastPresentedDate !== "string"
    ) {
      return null;
    }
    return parsed as GuidedJourneyState;
  } catch {
    return null;
  }
}

export function nextGuidedJourneyStep(state: GuidedJourneyState | null, date = new Date()): GuidedJourneyStep | null {
  if (!state || state.nextStepIndex >= GUIDED_JOURNEY_STEPS.length) return null;
  if (state.lastPresentedDate === localDateKey(date)) return null;
  return GUIDED_JOURNEY_STEPS[state.nextStepIndex] ?? null;
}

export function markGuidedJourneyPresented(state: GuidedJourneyState, date = new Date()): GuidedJourneyState {
  return { ...state, lastPresentedDate: localDateKey(date) };
}

export function advanceGuidedJourney(state: GuidedJourneyState): GuidedJourneyState {
  return {
    ...state,
    nextStepIndex: Math.min(GUIDED_JOURNEY_STEPS.length, state.nextStepIndex + 1),
  };
}
