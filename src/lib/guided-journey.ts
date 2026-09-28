export const GUIDED_JOURNEY_STORAGE_KEY = "aletheia_guided_journey_v1";

// Append new discoveries here. Journey state stores stable IDs rather than a
// position, so existing users can receive a newly added gem without resetting.
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
  version: 2;
  seenStepIds: GuidedJourneyStep[];
  lastPresentedDate: string;
};

export type GuidedJourneyUsage = Partial<Record<Exclude<GuidedJourneyStep, "welcome">, number>>;

function isGuidedJourneyStep(value: unknown): value is GuidedJourneyStep {
  return typeof value === "string" && (GUIDED_JOURNEY_STEPS as readonly string[]).includes(value);
}

export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startGuidedJourney(date = new Date()): GuidedJourneyState {
  return {
    version: 2,
    seenStepIds: ["welcome"],
    lastPresentedDate: localDateKey(date),
  };
}

export function parseGuidedJourneyState(value: string | null): GuidedJourneyState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (typeof parsed.lastPresentedDate !== "string") return null;

    if (parsed.version === 2) {
      if (!Array.isArray(parsed.seenStepIds) || !parsed.seenStepIds.every(isGuidedJourneyStep)) return null;
      return {
        version: 2,
        seenStepIds: [...new Set(parsed.seenStepIds as GuidedJourneyStep[])],
        lastPresentedDate: parsed.lastPresentedDate,
      };
    }

    if (
      parsed.version === 1 &&
      Number.isInteger(parsed.nextStepIndex) &&
      Number(parsed.nextStepIndex) >= 1 &&
      Number(parsed.nextStepIndex) <= GUIDED_JOURNEY_STEPS.length
    ) {
      return {
        version: 2,
        seenStepIds: [...GUIDED_JOURNEY_STEPS.slice(0, Number(parsed.nextStepIndex))],
        lastPresentedDate: parsed.lastPresentedDate,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function prioritizeGuidedJourneySteps(usage: GuidedJourneyUsage): GuidedJourneyStep[] {
  return GUIDED_JOURNEY_STEPS.filter((step) => step !== "welcome").sort((left, right) => {
    const usageDifference = (usage[left] ?? 0) - (usage[right] ?? 0);
    return usageDifference || GUIDED_JOURNEY_STEPS.indexOf(left) - GUIDED_JOURNEY_STEPS.indexOf(right);
  });
}

export function nextGuidedJourneyStep(
  state: GuidedJourneyState | null,
  date = new Date(),
  prioritizedSteps: readonly GuidedJourneyStep[] = GUIDED_JOURNEY_STEPS,
): GuidedJourneyStep | null {
  if (!state || state.lastPresentedDate === localDateKey(date)) return null;
  const candidates = [...prioritizedSteps, ...GUIDED_JOURNEY_STEPS];
  return candidates.find((step) => step !== "welcome" && !state.seenStepIds.includes(step)) ?? null;
}

export function markGuidedJourneyPresented(state: GuidedJourneyState, date = new Date()): GuidedJourneyState {
  return { ...state, lastPresentedDate: localDateKey(date) };
}

export function advanceGuidedJourney(state: GuidedJourneyState, step: GuidedJourneyStep): GuidedJourneyState {
  return state.seenStepIds.includes(step)
    ? state
    : { ...state, seenStepIds: [...state.seenStepIds, step] };
}
