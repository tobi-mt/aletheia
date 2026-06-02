export type ManualContextProfile = {
  healthContext: string;
  financeContext: string;
  workContext: string;
  obligations: string;
  goals: string;
  boundaries: string;
  futureFinanceContext: string;
  futureWorkContext: string;
  futureHealthContext: string;
  futureRelationshipsContext: string;
  futureValuesContext: string;
  futureGoals: string;
  futureBoundaries: string;
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
  targetSavingsBufferMonths: number | null;
  targetWorkHoursPerWeek: number | null;
  targetSleepHours: number | null;
  targetExerciseSessionsPerWeek: number | null;
  targetTimeWithLovedOnesHoursPerWeek: number | null;
  targetTimeWithCommunityHoursPerWeek: number | null;
  targetStressLevel: number | null;
  targetUrgencyLevel: number | null;
  targetSupportLevel: number | null;
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
  futureFinanceContext: "",
  futureWorkContext: "",
  futureHealthContext: "",
  futureRelationshipsContext: "",
  futureValuesContext: "",
  futureGoals: "",
  futureBoundaries: "",
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
  targetSavingsBufferMonths: null,
  targetWorkHoursPerWeek: null,
  targetSleepHours: null,
  targetExerciseSessionsPerWeek: null,
  targetTimeWithLovedOnesHoursPerWeek: null,
  targetTimeWithCommunityHoursPerWeek: null,
  targetStressLevel: null,
  targetUrgencyLevel: null,
  targetSupportLevel: null,
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
    futureFinanceContext: clean(input.futureFinanceContext),
    futureWorkContext: clean(input.futureWorkContext),
    futureHealthContext: clean(input.futureHealthContext),
    futureRelationshipsContext: clean(input.futureRelationshipsContext),
    futureValuesContext: clean(input.futureValuesContext),
    futureGoals: clean(input.futureGoals),
    futureBoundaries: clean(input.futureBoundaries),
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
    targetSavingsBufferMonths: numberOrNull(input.targetSavingsBufferMonths, 0, 60),
    targetWorkHoursPerWeek: numberOrNull(input.targetWorkHoursPerWeek, 0, 120),
    targetSleepHours: numberOrNull(input.targetSleepHours, 0, 24),
    targetExerciseSessionsPerWeek: numberOrNull(input.targetExerciseSessionsPerWeek, 0, 30),
    targetTimeWithLovedOnesHoursPerWeek: numberOrNull(input.targetTimeWithLovedOnesHoursPerWeek, 0, 120),
    targetTimeWithCommunityHoursPerWeek: numberOrNull(input.targetTimeWithCommunityHoursPerWeek, 0, 120),
    targetStressLevel: numberOrNull(input.targetStressLevel, 0, 10),
    targetUrgencyLevel: numberOrNull(input.targetUrgencyLevel, 0, 10),
    targetSupportLevel: numberOrNull(input.targetSupportLevel, 0, 10),
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
    if (context.targetSavingsBufferMonths !== null) lines.push(`Desired money state: target_savings_buffer_months=${context.targetSavingsBufferMonths}`);
    if (context.futureFinanceContext) lines.push(`Desired money posture: ${context.futureFinanceContext}`);
  }
  if (context.useWorkInAnswers) {
    if (context.workHoursPerWeek !== null || context.commuteHoursPerWeek !== null || context.energyDrainLevel !== null) {
      lines.push(
        `Work metrics: work_hours_per_week=${context.workHoursPerWeek ?? "unknown"}, commute_hours_per_week=${context.commuteHoursPerWeek ?? "unknown"}, energy_drain_level_0_10=${context.energyDrainLevel ?? "unknown"}`
      );
    }
    if (context.workContext) lines.push(`Work and vocation context: ${context.workContext}`);
    if (context.targetWorkHoursPerWeek !== null) lines.push(`Desired work rhythm: target_work_hours_per_week=${context.targetWorkHoursPerWeek}`);
    if (context.futureWorkContext) lines.push(`Desired work and vocation state: ${context.futureWorkContext}`);
  }
  if (context.useHealthInAnswers) {
    if (context.sleepHours !== null || context.exerciseSessionsPerWeek !== null || context.stressLevel !== null) {
      lines.push(
        `Health metrics: sleep_hours=${context.sleepHours ?? "unknown"}, exercise_sessions_per_week=${context.exerciseSessionsPerWeek ?? "unknown"}, stress_level_0_10=${context.stressLevel ?? "unknown"}`
      );
    }
    if (context.healthContext) lines.push(`Health and body rhythms: ${context.healthContext}`);
    if (context.targetSleepHours !== null || context.targetExerciseSessionsPerWeek !== null || context.targetStressLevel !== null) {
      lines.push(
        `Desired health rhythm: target_sleep_hours=${context.targetSleepHours ?? "unknown"}, target_exercise_sessions_per_week=${context.targetExerciseSessionsPerWeek ?? "unknown"}, target_stress_level_0_10=${context.targetStressLevel ?? "unknown"}`
      );
    }
    if (context.futureHealthContext) lines.push(`Desired health state: ${context.futureHealthContext}`);
  }
  if (context.useRelationshipsInAnswers) {
    if (context.timeWithLovedOnesHoursPerWeek !== null || context.timeWithCommunityHoursPerWeek !== null || context.supportLevel !== null) {
      lines.push(
        `Relationship metrics: loved_ones_hours_per_week=${context.timeWithLovedOnesHoursPerWeek ?? "unknown"}, community_hours_per_week=${context.timeWithCommunityHoursPerWeek ?? "unknown"}, support_level_0_10=${context.supportLevel ?? "unknown"}`
      );
    }
    if (context.obligations) lines.push(`Responsibilities and obligations: ${context.obligations}`);
    if (context.targetTimeWithLovedOnesHoursPerWeek !== null || context.targetTimeWithCommunityHoursPerWeek !== null || context.targetSupportLevel !== null) {
      lines.push(
        `Desired relationship rhythm: target_loved_ones_hours_per_week=${context.targetTimeWithLovedOnesHoursPerWeek ?? "unknown"}, target_community_hours_per_week=${context.targetTimeWithCommunityHoursPerWeek ?? "unknown"}, target_support_level_0_10=${context.targetSupportLevel ?? "unknown"}`
      );
    }
    if (context.futureRelationshipsContext) lines.push(`Desired relationships/community state: ${context.futureRelationshipsContext}`);
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
    if (context.targetUrgencyLevel !== null) lines.push(`Desired decision pressure: target_urgency_level_0_10=${context.targetUrgencyLevel}`);
    if (context.futureGoals) lines.push(`Desired future goals: ${context.futureGoals}`);
    if (context.futureValuesContext) lines.push(`Desired values posture: ${context.futureValuesContext}`);
    if (context.futureBoundaries) lines.push(`Desired future boundaries: ${context.futureBoundaries}`);
  }
  const signals = manualContextCounselSignals(context);
  return [
    signals.length ? `Strategic counsel signals:\n${signals.map((signal) => `- ${signal}`).join("\n")}` : "",
    lines
    .filter(Boolean)
    .join("\n"),
  ].filter(Boolean).join("\n\n");
}

export function manualContextCounselSignals(input: Partial<ManualContextProfile> | null | undefined) {
  const context = normalizeManualContext(input ?? {});
  if (!context.useInAnswers) {
    return [];
  }

  const signals: string[] = [];
  const hasDebtPressure = context.debtPayments !== null && context.monthlyIncome !== null && context.monthlyIncome > 0 && context.debtPayments / context.monthlyIncome >= 0.15;
  const lowBuffer = context.savingsBufferMonths !== null && context.savingsBufferMonths < 3;
  const manyDependents = context.financialDependents !== null && context.financialDependents >= 2;
  if (context.useMoneyInAnswers && (lowBuffer || hasDebtPressure || manyDependents)) {
    signals.push(`Financial pressure signal: ${[
      lowBuffer ? "low savings buffer" : "",
      hasDebtPressure ? "meaningful debt-payment pressure" : "",
      manyDependents ? "multiple financial dependents" : "",
    ].filter(Boolean).join(", ")}. Counsel should slow impulsive risk, count the cost, and avoid shame.`);
  }

  const heavyWork = context.workHoursPerWeek !== null && context.workHoursPerWeek >= 50;
  const lowSleep = context.sleepHours !== null && context.sleepHours < 6.5;
  const highStress = context.stressLevel !== null && context.stressLevel >= 7;
  const highDrain = context.energyDrainLevel !== null && context.energyDrainLevel >= 7;
  if ((context.useWorkInAnswers || context.useHealthInAnswers) && (heavyWork || lowSleep || highStress || highDrain)) {
    signals.push(`Burnout signal: ${[
      heavyWork ? "high work hours" : "",
      lowSleep ? "low sleep" : "",
      highStress ? "high stress" : "",
      highDrain ? "high energy drain" : "",
    ].filter(Boolean).join(", ")}. Counsel should consider sustainability, recovery, and pace.`);
  }

  const lowSupport = context.supportLevel !== null && context.supportLevel <= 3;
  const lowCommunity = context.timeWithCommunityHoursPerWeek !== null && context.timeWithCommunityHoursPerWeek < 1;
  const lowLovedOnes = context.timeWithLovedOnesHoursPerWeek !== null && context.timeWithLovedOnesHoursPerWeek < 3;
  if (context.useRelationshipsInAnswers && (lowSupport || lowCommunity || lowLovedOnes)) {
    signals.push(`Isolation signal: ${[
      lowSupport ? "low support" : "",
      lowCommunity ? "little community time" : "",
      lowLovedOnes ? "limited time with loved ones" : "",
    ].filter(Boolean).join(", ")}. Counsel should nudge toward trusted counsel and relational wisdom.`);
  }

  const highUrgency = context.urgencyLevel !== null && context.urgencyLevel >= 7;
  const noCounselRhythm = context.counselCadence.length === 0;
  if (context.useValuesInAnswers && (highUrgency || noCounselRhythm)) {
    signals.push(`Urgency signal: ${[
      highUrgency ? "high urgency pressure" : "",
      noCounselRhythm ? "no stated counsel rhythm" : "",
    ].filter(Boolean).join(", ")}. Counsel should distinguish courage from pressure and recommend waiting or counsel when stakes are high.`);
  }

  if (context.useValuesInAnswers && (context.enoughDefinition || context.mustNotSacrifice || context.successDefinition)) {
    signals.push(`Values signal: user has named formation boundaries. Counsel should anchor recommendations in enoughness, integrity, and what must not be sacrificed.`);
  }

  const futureSignals = [
    context.futureFinanceContext || context.targetSavingsBufferMonths !== null ? "money" : "",
    context.futureWorkContext || context.targetWorkHoursPerWeek !== null ? "work" : "",
    context.futureHealthContext || context.targetSleepHours !== null || context.targetStressLevel !== null ? "health" : "",
    context.futureRelationshipsContext || context.targetSupportLevel !== null ? "relationships" : "",
    context.futureValuesContext || context.futureGoals || context.futureBoundaries || context.targetUrgencyLevel !== null ? "values" : "",
  ].filter(Boolean);
  if (futureSignals.length) {
    signals.push(`Future-state signal: user has described desired direction in ${futureSignals.join(", ")}. Counsel should connect the next faithful step to that future state without overpromising outcomes.`);
  }

  return signals;
}

export function manualContextHasContent(input: ManualContextProfile) {
  return Boolean(
    input.healthContext ||
      input.financeContext ||
      input.workContext ||
      input.obligations ||
      input.goals ||
      input.boundaries ||
      input.futureFinanceContext ||
      input.futureWorkContext ||
      input.futureHealthContext ||
      input.futureRelationshipsContext ||
      input.futureValuesContext ||
      input.futureGoals ||
      input.futureBoundaries ||
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
      input.targetSavingsBufferMonths !== null ||
      input.targetWorkHoursPerWeek !== null ||
      input.targetSleepHours !== null ||
      input.targetExerciseSessionsPerWeek !== null ||
      input.targetTimeWithLovedOnesHoursPerWeek !== null ||
      input.targetTimeWithCommunityHoursPerWeek !== null ||
      input.targetStressLevel !== null ||
      input.targetUrgencyLevel !== null ||
      input.targetSupportLevel !== null ||
      input.riskTolerance ||
      input.waitingPreference ||
      input.counselCadence ||
      input.enoughDefinition ||
      input.successDefinition ||
      input.mustNotSacrifice
  );
}
