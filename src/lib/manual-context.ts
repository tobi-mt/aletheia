export type ManualContextProfile = {
  healthContext: string;
  financeContext: string;
  workContext: string;
  obligations: string;
  goals: string;
  boundaries: string;
  useInAnswers: boolean;
};

export const defaultManualContext: ManualContextProfile = {
  healthContext: "",
  financeContext: "",
  workContext: "",
  obligations: "",
  goals: "",
  boundaries: "",
  useInAnswers: true,
};

function clean(value: unknown, limit = 900) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export function normalizeManualContext(input: Partial<ManualContextProfile> = {}): ManualContextProfile {
  return {
    healthContext: clean(input.healthContext),
    financeContext: clean(input.financeContext),
    workContext: clean(input.workContext),
    obligations: clean(input.obligations),
    goals: clean(input.goals),
    boundaries: clean(input.boundaries),
    useInAnswers: input.useInAnswers !== false,
  };
}

export function manualContextSummary(input: Partial<ManualContextProfile> | null | undefined) {
  const context = normalizeManualContext(input ?? {});
  if (!context.useInAnswers) {
    return "";
  }

  return [
    context.healthContext ? `Health and body rhythms: ${context.healthContext}` : "",
    context.financeContext ? `Financial context: ${context.financeContext}` : "",
    context.workContext ? `Work and vocation context: ${context.workContext}` : "",
    context.obligations ? `Responsibilities and obligations: ${context.obligations}` : "",
    context.goals ? `Goals the user is pursuing: ${context.goals}` : "",
    context.boundaries ? `User-defined boundaries: ${context.boundaries}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function manualContextHasContent(input: ManualContextProfile) {
  return Boolean(
    input.healthContext ||
      input.financeContext ||
      input.workContext ||
      input.obligations ||
      input.goals ||
      input.boundaries
  );
}
