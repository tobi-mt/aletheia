export type ManualContextProfile = {
  healthContext: string;
  financeContext: string;
  workContext: string;
  obligations: string;
  goals: string;
  boundaries: string;
  monthlyIncome: number | null;
  fixedExpenses: number | null;
  debtPayments: number | null;
  savingsBufferMonths: number | null;
  givingTargetPercent: number | null;
  financialDependents: number | null;
  workHoursPerWeek: number | null;
  commuteHoursPerWeek: number | null;
  sleepHours: number | null;
  exerciseSessionsPerWeek: number | null;
  timeWithLovedOnesHoursPerWeek: number | null;
  timeWithCommunityHoursPerWeek: number | null;
  stressLevel: number | null;
  energyDrainLevel: number | null;
  urgencyLevel: number | null;
  supportLevel: number | null;
  riskTolerance: string;
  waitingPreference: string;
  counselCadence: string;
  enoughDefinition: string;
  successDefinition: string;
  mustNotSacrifice: string;
  useMoneyInAnswers: boolean;
  useWorkInAnswers: boolean;
  useHealthInAnswers: boolean;
  useRelationshipsInAnswers: boolean;
  useValuesInAnswers: boolean;
  useInAnswers: boolean;
};

export const defaultManualContext: ManualContextProfile = {
  healthContext: "",
  financeContext: "",
  workContext: "",
  obligations: "",
  goals: "",
  boundaries: "",
  monthlyIncome: null,
  fixedExpenses: null,
  debtPayments: null,
  savingsBufferMonths: null,
  givingTargetPercent: null,
  financialDependents: null,
  workHoursPerWeek: null,
  commuteHoursPerWeek: null,
  sleepHours: null,
  exerciseSessionsPerWeek: null,
  timeWithLovedOnesHoursPerWeek: null,
  timeWithCommunityHoursPerWeek: null,
  stressLevel: null,
  energyDrainLevel: null,
  urgencyLevel: null,
  supportLevel: null,
  riskTolerance: "",
  waitingPreference: "",
  counselCadence: "",
  enoughDefinition: "",
  successDefinition: "",
  mustNotSacrifice: "",
  useMoneyInAnswers: true,
  useWorkInAnswers: true,
  useHealthInAnswers: true,
  useRelationshipsInAnswers: true,
  useValuesInAnswers: true,
  useInAnswers: true,
};

function clean(value: unknown, limit = 900) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function numberOrNull(value: unknown, min = 0, max = 1_000_000) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(min, Math.min(max, parsed));
}

export function normalizeManualContext(input: Partial<ManualContextProfile> = {}): ManualContextProfile {
  return {
    healthContext: clean(input.healthContext),
    financeContext: clean(input.financeContext),
    workContext: clean(input.workContext),
    obligations: clean(input.obligations),
    goals: clean(input.goals),
    boundaries: clean(input.boundaries),
    monthlyIncome: numberOrNull(input.monthlyIncome),
    fixedExpenses: numberOrNull(input.fixedExpenses),
    debtPayments: numberOrNull(input.debtPayments),
    savingsBufferMonths: numberOrNull(input.savingsBufferMonths, 0, 60),
    givingTargetPercent: numberOrNull(input.givingTargetPercent, 0, 100),
    financialDependents: numberOrNull(input.financialDependents, 0, 20),
    workHoursPerWeek: numberOrNull(input.workHoursPerWeek, 0, 120),
    commuteHoursPerWeek: numberOrNull(input.commuteHoursPerWeek, 0, 60),
    sleepHours: numberOrNull(input.sleepHours, 0, 24),
    exerciseSessionsPerWeek: numberOrNull(input.exerciseSessionsPerWeek, 0, 30),
    timeWithLovedOnesHoursPerWeek: numberOrNull(input.timeWithLovedOnesHoursPerWeek, 0, 120),
    timeWithCommunityHoursPerWeek: numberOrNull(input.timeWithCommunityHoursPerWeek, 0, 120),
    stressLevel: numberOrNull(input.stressLevel, 0, 10),
    energyDrainLevel: numberOrNull(input.energyDrainLevel, 0, 10),
    urgencyLevel: numberOrNull(input.urgencyLevel, 0, 10),
    supportLevel: numberOrNull(input.supportLevel, 0, 10),
    riskTolerance: clean(input.riskTolerance, 120),
    waitingPreference: clean(input.waitingPreference, 120),
    counselCadence: clean(input.counselCadence, 120),
    enoughDefinition: clean(input.enoughDefinition),
    successDefinition: clean(input.successDefinition),
    mustNotSacrifice: clean(input.mustNotSacrifice),
    useMoneyInAnswers: input.useMoneyInAnswers !== false,
    useWorkInAnswers: input.useWorkInAnswers !== false,
    useHealthInAnswers: input.useHealthInAnswers !== false,
    useRelationshipsInAnswers: input.useRelationshipsInAnswers !== false,
    useValuesInAnswers: input.useValuesInAnswers !== false,
    useInAnswers: input.useInAnswers !== false,
  };
}

export function manualContextSummary(input: Partial<ManualContextProfile> | null | undefined) {
  const context = normalizeManualContext(input ?? {});
  if (!context.useInAnswers) {
    return "";
  }

  const lines: string[] = [];
  if (context.useMoneyInAnswers) {
    if (context.monthlyIncome !== null || context.fixedExpenses !== null || context.debtPayments !== null) {
      lines.push(
        `Money metrics: income=${context.monthlyIncome ?? "unknown"}, fixed_expenses=${context.fixedExpenses ?? "unknown"}, debt_payments=${context.debtPayments ?? "unknown"}, savings_buffer_months=${context.savingsBufferMonths ?? "unknown"}, giving_target_percent=${context.givingTargetPercent ?? "unknown"}, dependents=${context.financialDependents ?? "unknown"}`
      );
    }
    if (context.financeContext) lines.push(`Financial context: ${context.financeContext}`);
  }
  if (context.useWorkInAnswers) {
    if (context.workHoursPerWeek !== null || context.commuteHoursPerWeek !== null || context.energyDrainLevel !== null) {
      lines.push(
        `Work metrics: work_hours_per_week=${context.workHoursPerWeek ?? "unknown"}, commute_hours_per_week=${context.commuteHoursPerWeek ?? "unknown"}, energy_drain_level_0_10=${context.energyDrainLevel ?? "unknown"}`
      );
    }
    if (context.workContext) lines.push(`Work and vocation context: ${context.workContext}`);
  }
  if (context.useHealthInAnswers) {
    if (context.sleepHours !== null || context.exerciseSessionsPerWeek !== null || context.stressLevel !== null) {
      lines.push(
        `Health metrics: sleep_hours=${context.sleepHours ?? "unknown"}, exercise_sessions_per_week=${context.exerciseSessionsPerWeek ?? "unknown"}, stress_level_0_10=${context.stressLevel ?? "unknown"}`
      );
    }
    if (context.healthContext) lines.push(`Health and body rhythms: ${context.healthContext}`);
  }
  if (context.useRelationshipsInAnswers) {
    if (context.timeWithLovedOnesHoursPerWeek !== null || context.timeWithCommunityHoursPerWeek !== null || context.supportLevel !== null) {
      lines.push(
        `Relationship metrics: loved_ones_hours_per_week=${context.timeWithLovedOnesHoursPerWeek ?? "unknown"}, community_hours_per_week=${context.timeWithCommunityHoursPerWeek ?? "unknown"}, support_level_0_10=${context.supportLevel ?? "unknown"}`
      );
    }
    if (context.obligations) lines.push(`Responsibilities and obligations: ${context.obligations}`);
  }
  if (context.useValuesInAnswers) {
    if (context.urgencyLevel !== null) lines.push(`Decision pressure metric: urgency_level_0_10=${context.urgencyLevel}`);
    if (context.riskTolerance) lines.push(`Risk tolerance: ${context.riskTolerance}`);
    if (context.waitingPreference) lines.push(`Waiting preference: ${context.waitingPreference}`);
    if (context.counselCadence) lines.push(`Counsel cadence: ${context.counselCadence}`);
    if (context.enoughDefinition) lines.push(`Definition of enough: ${context.enoughDefinition}`);
    if (context.successDefinition) lines.push(`Definition of success: ${context.successDefinition}`);
    if (context.mustNotSacrifice) lines.push(`Must not sacrifice: ${context.mustNotSacrifice}`);
    if (context.goals) lines.push(`Goals the user is pursuing: ${context.goals}`);
    if (context.boundaries) lines.push(`User-defined boundaries: ${context.boundaries}`);
  }
  return lines
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
      input.boundaries ||
      input.monthlyIncome !== null ||
      input.fixedExpenses !== null ||
      input.debtPayments !== null ||
      input.savingsBufferMonths !== null ||
      input.givingTargetPercent !== null ||
      input.financialDependents !== null ||
      input.workHoursPerWeek !== null ||
      input.commuteHoursPerWeek !== null ||
      input.sleepHours !== null ||
      input.exerciseSessionsPerWeek !== null ||
      input.timeWithLovedOnesHoursPerWeek !== null ||
      input.timeWithCommunityHoursPerWeek !== null ||
      input.stressLevel !== null ||
      input.energyDrainLevel !== null ||
      input.urgencyLevel !== null ||
      input.supportLevel !== null ||
      input.riskTolerance ||
      input.waitingPreference ||
      input.counselCadence ||
      input.enoughDefinition ||
      input.successDefinition ||
      input.mustNotSacrifice
  );
}
