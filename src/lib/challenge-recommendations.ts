import { challengeDefinitions, getChallengeById, type ChallengeId } from "@/lib/challenge-data";
import { normalizePreferences, type LanguageCode } from "@/lib/localization";
import { normalizeManualContext, type ManualContextProfile } from "@/lib/manual-context";
import { getChallengeMissedDays, getChallengeProgressState, type ChallengeProgressState } from "@/lib/challenge-progress";
import { loadTranslationsSync, getTranslation } from "@/lib/translations";

type ModeCounts = Partial<Record<string, number>>;

export type ChallengeRecommendationContext = {
  language?: LanguageCode;
  manualContext?: Partial<ManualContextProfile> | null;
  guestManualContext?: Partial<ManualContextProfile> | null;
  focusIntentions?: string[] | null;
  modeCounts?: ModeCounts;
  currentMode?: string | null;
  recentTexts?: string[];
  completedChallengeIds?: string[];
  activeChallenge?: {
    challengeId: string;
    daysCompleted: number;
    totalDays: number;
    lastCompletedAt?: string | null;
  } | null;
};

export type ChallengeRecommendation = {
  challengeId: ChallengeId;
  titleKey: string;
  title: string;
  descriptionKey: string;
  description: string;
  totalDays: number;
  mode: string;
  completedDays: number;
  score: number;
  note: string;
  signals: string[];
  fitChips: string[];
  actionLabel: string;
  actionKind: "start" | "continue";
  progressState?: ChallengeProgressState;
  missedDays?: number | null;
  statusLabel?: string;
  statusBody?: string;
  statusTone?: "neutral" | "warning" | "success";
};

export type ChallengeRecommendationBundle = {
  primary: ChallengeRecommendation | null;
  alternatives: ChallengeRecommendation[];
};

const MONEY_KEYWORDS = [
  "budget",
  "debt",
  "spend",
  "spending",
  "save",
  "saving",
  "money",
  "finance",
  "financial",
  "income",
  "salary",
  "bill",
  "expense",
  "giving",
  "tithe",
  "charity",
  "invest",
];

const WORK_KEYWORDS = [
  "work",
  "job",
  "career",
  "burnout",
  "overtime",
  "deadline",
  "boss",
  "leadership",
  "commute",
  "overworked",
  "exhausted",
  "tired",
  "rest",
  "sleep",
  "pace",
];

const RELATIONSHIP_KEYWORDS = [
  "friend",
  "family",
  "marriage",
  "spouse",
  "encourage",
  "support",
  "community",
  "together",
  "check in",
  "walk with",
  "sharpen",
];

const DECISION_KEYWORDS = [
  "decision",
  "decide",
  "choose",
  "urgent",
  "urgency",
  "wait",
  "waiting",
  "unclear",
  "pressure",
  "discern",
  "next step",
  "counsel",
  "timing",
];

const REPAIR_KEYWORDS = [
  "apolog",
  "forgiv",
  "conflict",
  "hurt",
  "restore",
  "repair",
  "reconcile",
  "resentment",
  "mend",
];

const LISTENING_KEYWORDS = [
  "listen",
  "hear",
  "understand",
  "clarify",
  "attune",
  "perspective",
  "question",
  "silence",
  "careful",
];

const GENEROSITY_KEYWORDS = [
  "give",
  "gift",
  "generous",
  "generosity",
  "open-handed",
  "openhanded",
  "support",
  "share",
  "bless",
  "serve",
];

const ATTENTION_KEYWORDS = [
  "scroll",
  "scrolling",
  "phone",
  "social",
  "media",
  "distract",
  "attention",
  "focus",
  "doomscroll",
  "noise",
  "overstim",
  "overwhelm",
];

const SERVICE_KEYWORDS = [
  "serve",
  "service",
  "unseen",
  "anonymous",
  "quiet",
  "humble",
  "hidden",
  "behind the scenes",
  "no credit",
];

const BOOK_KEYWORDS = [
  "book",
  "books",
  "reading",
  "chapter",
  "chapters",
  "page",
  "pages",
  "author",
  "quote",
  "study",
  "memoir",
  "essay",
  "novel",
  "library",
];

const READING_CIRCLE_KEYWORDS = [
  "group",
  "together",
  "shared",
  "discussion",
  "discuss",
  "book club",
  "read along",
  "circle",
];

const GRATITUDE_KEYWORDS = [
  "gratitude",
  "thank",
  "thanks",
  "bless",
  "mercy",
  "gift",
  "content",
  "appreciat",
];

const MODE_BONUSES: Record<string, Partial<Record<ChallengeId, number>>> = {
  Money: {
    "stewardship-7day": 4,
    "generosity-7day": 2,
    "gratitude-3day": 1,
  },
  Work: {
    "sabbath-rest-5day": 4,
    "attention-fast-5day": 1,
    "waiting-5day": 1,
  },
  Purpose: {
    "waiting-5day": 4,
    "listening-3day": 2,
    "attention-fast-5day": 1,
    "read-with-me-7day": 2,
  },
  Generosity: {
    "generosity-7day": 4,
    "hidden-service-5day": 3,
    "shared-encouragement-3day": 1,
  },
  Life: {
    "shared-encouragement-3day": 3,
    "listening-3day": 2,
    "repair-4day": 2,
    "gratitude-3day": 1,
    "read-with-me-7day": 1,
  },
};

const FOCUS_BONUSES: Record<string, Partial<Record<ChallengeId, number>>> = {
  reduce_anxiety: {
    "waiting-5day": 2,
    "gratitude-3day": 2,
    "sabbath-rest-5day": 1,
  },
  improve_stewardship: {
    "stewardship-7day": 5,
    "generosity-7day": 2,
  },
  wait_with_peace: {
    "waiting-5day": 5,
    "listening-3day": 1,
  },
  build_consistency: {
    "hidden-service-5day": 3,
    "gratitude-3day": 2,
    "sabbath-rest-5day": 1,
    "read-with-me-7day": 1,
  },
  seek_counsel: {
    "listening-3day": 4,
    "waiting-5day": 2,
    "shared-encouragement-3day": 1,
    "read-with-me-7day": 2,
  },
};

const SIGNAL_CHIP_OVERRIDES: Record<string, string> = {
  "a stated waiting preference": "Waiting preference",
  "a named decision style": "Decision style",
  "a money context": "Money context",
  "a work context": "Work context",
  "a learning goal": "Learning goal",
  "a counsel rhythm": "Counsel rhythm",
  "a counsel focus": "Counsel focus",
  "a shared reading circle": "Shared reading circle",
  "a steady reading rhythm": "Steady reading rhythm",
  "a gentle entry point": "Gentle entry point",
  "burnout signals": "Burnout signals",
  "financial pressure": "Financial pressure",
  "high urgency": "High urgency",
  "low support": "Low support",
  "money language": "Money language",
  "relational obligations": "Relational obligations",
  "relational strain": "Relational strain",
  "relational language": "Relational language",
  "repair language": "Repair language",
  "quiet faithfulness": "Quiet faithfulness",
  "quiet service language": "Quiet service",
  "reading language": "Reading language",
  "shared reading language": "Shared reading",
  "steady consistency": "Steady consistency",
  "stewardship focus": "Stewardship focus",
  "attention fatigue": "Attention fatigue",
  "future generosity": "Future generosity",
  "listening language": "Listening language",
  "generosity language": "Generosity language",
  "gratitude language": "Gratitude language",
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function joinSignals(signals: string[]) {
  if (!signals.length) return "";
  if (signals.length === 1) return signals[0];
  if (signals.length === 2) return `${signals[0]} and ${signals[1]}`;
  return `${signals[0]}, ${signals[1]}, and ${signals[2]}`;
}

function containsAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function scoreWithKeywords(text: string, keywords: string[], points: number, signal: string, signals: string[]) {
  if (!containsAny(text, keywords)) return 0;
  signals.push(signal);
  return points;
}

function formatSignalChip(signal: string) {
  const normalized = normalizeText(signal).trim();
  const override = SIGNAL_CHIP_OVERRIDES[normalized];
  if (override) {
    return override;
  }

  const cleaned = signal
    .replace(/^(?:a|an|the)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return signal;
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function pushChip(chips: string[], value: string) {
  const trimmed = value.trim();
  if (!trimmed || chips.includes(trimmed)) {
    return;
  }
  chips.push(trimmed);
}

function buildFitChips(
  challengeId: ChallengeId,
  signals: string[],
  context: ManualContextProfile,
  currentMode: string | null
) {
  const chips: string[] = [];
  for (const signal of signals) {
    pushChip(chips, formatSignalChip(signal));
    if (chips.length >= 3) {
      return chips.slice(0, 3);
    }
  }

  switch (challengeId) {
    case "waiting-5day":
      pushChip(chips, context.urgencyLevel !== null && context.urgencyLevel >= 7 ? "High urgency" : "A slower pace");
      pushChip(chips, context.waitingPreference ? "Waiting preference" : "Discern before moving");
      break;
    case "stewardship-7day":
      pushChip(chips, context.financeContext || context.futureFinanceContext ? "Money context" : "Stewardship focus");
      pushChip(chips, context.givingTargetPercent !== null ? "Giving target named" : "Financial clarity");
      break;
    case "sabbath-rest-5day":
      pushChip(chips, context.workHoursPerWeek !== null && context.workHoursPerWeek >= 50 ? "Heavy work rhythm" : "Work and rest balance");
      pushChip(chips, context.sleepHours !== null && context.sleepHours < 6.5 ? "Low sleep" : "Space to recover");
      break;
    case "shared-encouragement-3day":
      pushChip(chips, context.supportLevel !== null && context.supportLevel <= 3 ? "Low support" : "Relational strength");
      pushChip(chips, context.obligations || context.futureRelationshipsContext ? "Shared responsibility" : "Mutual encouragement");
      break;
    case "listening-3day":
      pushChip(chips, context.counselCadence ? "Counsel rhythm" : "Listening before answering");
      pushChip(chips, currentMode ? `${currentMode} focus` : "Discernment through listening");
      break;
    case "repair-4day":
      pushChip(chips, context.boundaries || context.whatHasntWorkedRelationships ? "Relational strain" : "Room for repair");
      pushChip(chips, "Repair and reconciliation");
      break;
    case "generosity-7day":
      pushChip(chips, context.givingTargetPercent !== null ? "Giving target" : "Open-handed practice");
      pushChip(chips, context.futureFinanceContext || context.futureValuesContext ? "Future generosity" : "Steady giving");
      break;
    case "attention-fast-5day":
      pushChip(chips, context.goals || context.futureGoals ? "Attention needs focus" : "Noise reduction");
      pushChip(chips, "Attention reset");
      break;
    case "hidden-service-5day":
      pushChip(chips, context.mustNotSacrifice || context.boundaries ? "Quiet faithfulness" : "Hidden service");
      pushChip(chips, "Service without spotlight");
      break;
    case "read-with-me-7day":
      pushChip(chips, context.goals || context.futureGoals ? "Learning goal" : "Shared reading");
      pushChip(chips, context.counselCadence || context.waitingPreference ? "Steady reading rhythm" : "A book worth sharing");
      break;
    case "gratitude-3day":
    default:
      pushChip(chips, context.useInAnswers ? "Gentle entry point" : "Simple reset");
      pushChip(chips, context.futureValuesContext || context.futureGoals ? "Future direction" : "Noticing the good");
      break;
  }

  if (chips.length < 2) {
    pushChip(chips, currentMode ? `${currentMode} focus` : "Personal context");
  }

  if (chips.length < 3) {
    pushChip(chips, "Based on your current season");
  }

  return chips.slice(0, 3);
}

function topMode(modeCounts: ModeCounts | undefined | null) {
  const entries = Object.entries(modeCounts ?? {});
  if (!entries.length) return null;
  return entries.sort((left, right) => Number(right[1]) - Number(left[1]))[0]?.[0] ?? null;
}

function manualContextText(context: ManualContextProfile) {
  return [
    context.healthContext,
    context.financeContext,
    context.workContext,
    context.obligations,
    context.goals,
    context.boundaries,
    context.futureFinanceContext,
    context.futureWorkContext,
    context.futureHealthContext,
    context.futureRelationshipsContext,
    context.futureValuesContext,
    context.futureGoals,
    context.futureBoundaries,
    context.whatHasntWorkedMoney,
    context.whatHasntWorkedWork,
    context.whatHasntWorkedHealth,
    context.whatHasntWorkedRelationships,
    context.whatHasntWorkedValues,
    context.lifeSeasons,
    context.decisionMakingTendency,
    context.incomeType,
    context.riskTolerance,
    context.waitingPreference,
    context.counselCadence,
    context.enoughDefinition,
    context.successDefinition,
    context.mustNotSacrifice,
  ].join(" ");
}

function buildRecommendationNote(
  challengeId: ChallengeId,
  signals: string[],
  context: ManualContextProfile,
  currentMode: string | null
) {
  const lead = joinSignals(signals.slice(0, 3));
  const modeHint = currentMode ? `Your ${currentMode.toLowerCase()} focus also points this way.` : "";

  switch (challengeId) {
    case "waiting-5day":
      return lead
        ? `You have ${lead}. This practice helps you slow down before you decide.`
        : "This practice helps you slow down before you decide.";
    case "stewardship-7day":
      return lead
        ? `You have ${lead}. This practice turns money pressure into a calmer, clearer plan.`
        : "This practice turns money pressure into a calmer, clearer plan.";
    case "sabbath-rest-5day":
      return lead
        ? `You have ${lead}. This practice gives your rhythm room to recover.`
        : "This practice gives your rhythm room to recover.";
    case "shared-encouragement-3day":
      return lead
        ? `You have ${lead}. This practice helps you build mutual encouragement with people who matter.`
        : "This practice helps you build mutual encouragement with people who matter.";
    case "listening-3day":
      return lead
        ? `You have ${lead}. This practice helps you hear more clearly before you answer.`
        : "This practice helps you hear more clearly before you answer.";
    case "repair-4day":
      return lead
        ? `You have ${lead}. This practice makes space for repair before distance hardens.`
        : "This practice makes space for repair before distance hardens.";
    case "generosity-7day":
      return lead
        ? `You have ${lead}. This practice turns giving into a steady habit instead of a one-off impulse.`
        : "This practice turns giving into a steady habit instead of a one-off impulse.";
    case "attention-fast-5day":
      return lead
        ? `You have ${lead}. This practice helps you reclaim attention from noise and distraction.`
        : "This practice helps you reclaim attention from noise and distraction.";
    case "hidden-service-5day":
      return lead
        ? `You have ${lead}. This practice strengthens quiet faithfulness that does not need attention.`
        : "This practice strengthens quiet faithfulness that does not need attention.";
    case "read-with-me-7day":
      return lead
        ? `You have ${lead}. This practice turns a good book into a shared rhythm of attention and conversation.`
        : "This practice turns a good book into a shared rhythm of attention and conversation.";
    case "gratitude-3day":
    default:
      return lead
        ? `You have ${lead}. This is a gentle entry point that helps you notice what is already good.`
        : `This is a gentle entry point that helps you notice what is already good.${modeHint ? ` ${modeHint}` : ""}`;
  }
}

function scoreChallenge(
  challengeId: ChallengeId,
  context: ManualContextProfile,
  input: ChallengeRecommendationContext,
  text: string,
  currentMode: string | null
) {
  const signals: string[] = [];
  let score = 0;

  const modeBoost = MODE_BONUSES[input.currentMode ?? currentMode ?? ""]?.[challengeId] ?? 0;
  score += modeBoost;

  for (const focus of input.focusIntentions ?? []) {
    const bonus = FOCUS_BONUSES[focus]?.[challengeId] ?? 0;
    if (bonus > 0) {
      score += bonus;
      signals.push({
        reduce_anxiety: "reduce anxiety",
        improve_stewardship: "stewardship focus",
        wait_with_peace: "waiting with peace",
        build_consistency: "steady consistency",
        seek_counsel: "seeking counsel",
      }[focus] ?? focus);
    }
  }

  switch (challengeId) {
    case "waiting-5day": {
      score += scoreWithKeywords(text, DECISION_KEYWORDS, 4, "an active decision", signals);
      if (context.urgencyLevel !== null && context.urgencyLevel >= 7) {
        score += 4;
        signals.push("high urgency");
      }
      if (context.waitingPreference) {
        score += 1;
        signals.push("a stated waiting preference");
      }
      if (context.decisionMakingTendency) {
        score += 1;
        signals.push("a named decision style");
      }
      break;
    }
    case "stewardship-7day": {
      score += scoreWithKeywords(text, MONEY_KEYWORDS, 4, "money language", signals);
      if (context.financeContext || context.futureFinanceContext) {
        score += 3;
        signals.push("a money context");
      }
      if (
        (context.monthlyIncome !== null && context.debtPayments !== null && context.monthlyIncome > 0 && context.debtPayments / context.monthlyIncome >= 0.15) ||
        (context.savingsBufferMonths !== null && context.savingsBufferMonths < 3)
      ) {
        score += 4;
        signals.push("financial pressure");
      }
      break;
    }
    case "sabbath-rest-5day": {
      score += scoreWithKeywords(text, WORK_KEYWORDS, 4, "burnout language", signals);
      if (
        (context.workHoursPerWeek !== null && context.workHoursPerWeek >= 50) ||
        (context.sleepHours !== null && context.sleepHours < 6.5) ||
        (context.stressLevel !== null && context.stressLevel >= 7) ||
        (context.energyDrainLevel !== null && context.energyDrainLevel >= 7)
      ) {
        score += 5;
        signals.push("burnout signals");
      }
      if (context.workContext || context.futureWorkContext) {
        score += 2;
        signals.push("a work context");
      }
      break;
    }
    case "shared-encouragement-3day": {
      score += scoreWithKeywords(text, RELATIONSHIP_KEYWORDS, 3, "relational language", signals);
      if (
        (context.supportLevel !== null && context.supportLevel <= 3) ||
        (context.timeWithCommunityHoursPerWeek !== null && context.timeWithCommunityHoursPerWeek < 1) ||
        (context.timeWithLovedOnesHoursPerWeek !== null && context.timeWithLovedOnesHoursPerWeek < 3)
      ) {
        score += 4;
        signals.push("low support");
      }
      if (context.obligations || context.futureRelationshipsContext) {
        score += 2;
        signals.push("relational obligations");
      }
      break;
    }
    case "listening-3day": {
      score += scoreWithKeywords(text, LISTENING_KEYWORDS, 4, "listening language", signals);
      if (input.focusIntentions?.includes("seek_counsel")) {
        score += 3;
        signals.push("a counsel focus");
      }
      if (context.counselCadence) {
        score += 1;
        signals.push("a counsel rhythm");
      }
      break;
    }
    case "repair-4day": {
      score += scoreWithKeywords(text, REPAIR_KEYWORDS, 5, "repair language", signals);
      if (context.boundaries || context.whatHasntWorkedRelationships) {
        score += 1;
        signals.push("relational strain");
      }
      break;
    }
    case "generosity-7day": {
      score += scoreWithKeywords(text, GENEROSITY_KEYWORDS, 4, "generosity language", signals);
      if (context.givingTargetPercent !== null && context.givingTargetPercent > 0) {
        score += 2;
        signals.push("a giving target");
      }
      if (context.futureFinanceContext || context.futureValuesContext) {
        score += 1;
        signals.push("future generosity");
      }
      break;
    }
    case "attention-fast-5day": {
      score += scoreWithKeywords(text, ATTENTION_KEYWORDS, 4, "attention fatigue", signals);
      if (context.goals || context.futureGoals) {
        score += 1;
        signals.push("a reset for attention");
      }
      break;
    }
    case "hidden-service-5day": {
      score += scoreWithKeywords(text, SERVICE_KEYWORDS, 4, "quiet service language", signals);
      if (context.boundaries || context.mustNotSacrifice) {
        score += 1;
        signals.push("quiet faithfulness");
      }
      break;
    }
    case "read-with-me-7day": {
      score += scoreWithKeywords(text, BOOK_KEYWORDS, 4, "book or reading language", signals);
      score += scoreWithKeywords(text, READING_CIRCLE_KEYWORDS, 3, "shared reading language", signals);
      if (containsAny(text, BOOK_KEYWORDS) && containsAny(text, READING_CIRCLE_KEYWORDS)) {
        score += 2;
        signals.push("a shared reading circle");
      }
      if (context.goals || context.futureGoals || context.successDefinition) {
        score += 1;
        signals.push("a learning goal");
      }
      if (context.counselCadence || context.waitingPreference) {
        score += 1;
        signals.push("a steady reading rhythm");
      }
      break;
    }
    case "gratitude-3day":
    default: {
      score += scoreWithKeywords(text, GRATITUDE_KEYWORDS, 3, "gratitude language", signals);
      if (!context.useInAnswers || !context.healthContext && !context.financeContext && !context.workContext && !context.obligations && !context.goals && !context.boundaries) {
        score += 1;
        signals.push("a gentle entry point");
      }
      break;
    }
  }

  if (!signals.length) {
    score += challengeId === "gratitude-3day" ? 1 : 0;
  }

  return {
    challengeId,
    titleKey: challengeDefinitions.find((challenge) => challenge.id === challengeId)?.titleKey ?? challengeId,
    title: challengeDefinitions.find((challenge) => challenge.id === challengeId)?.title ?? challengeId,
    descriptionKey: challengeDefinitions.find((challenge) => challenge.id === challengeId)?.descriptionKey ?? challengeId,
    description: challengeDefinitions.find((challenge) => challenge.id === challengeId)?.description ?? "",
    totalDays: challengeDefinitions.find((challenge) => challenge.id === challengeId)?.totalDays ?? 0,
    mode: challengeDefinitions.find((challenge) => challenge.id === challengeId)?.mode ?? "Life",
    completedDays: 0,
    score,
    signals,
    fitChips: buildFitChips(challengeId, signals, context, currentMode),
    actionLabel: "start" as const,
    actionKind: "start" as const,
  };
}

export function recommendChallenges(input: ChallengeRecommendationContext): ChallengeRecommendationBundle {
  const context = normalizeManualContext({
    ...(input.guestManualContext ?? {}),
    ...(input.manualContext ?? {}),
  });
  const currentMode = input.currentMode ?? topMode(input.modeCounts);
  const language = normalizePreferences({ language: input.language ?? "en" }).language;
  const translations = loadTranslationsSync(language);
  const t = (key: string) => String(getTranslation(translations, key));
  const text = [
    manualContextText(context),
    ...(input.recentTexts ?? []),
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  const completedChallengeIds = new Set(input.completedChallengeIds ?? []);
  const activeChallengeSnapshot = input.activeChallenge && input.activeChallenge.daysCompleted > 0 && input.activeChallenge.daysCompleted < input.activeChallenge.totalDays
    ? input.activeChallenge
    : null;
  const activeChallengeState = activeChallengeSnapshot
    ? getChallengeProgressState(
        {
          completedDays: activeChallengeSnapshot.daysCompleted,
          totalDays: activeChallengeSnapshot.totalDays,
          lastCompletedAt: activeChallengeSnapshot.lastCompletedAt ?? null,
        },
        Date.now()
      )
    : null;
  const activeChallengeId = activeChallengeSnapshot?.challengeId ?? null;

  const scored = challengeDefinitions
    .filter((challenge) => !completedChallengeIds.has(challenge.id))
    .map((challenge) => {
      const base = scoreChallenge(challenge.id, context, input, text, currentMode);
      return {
        ...base,
        note: buildRecommendationNote(challenge.id, base.signals, context, currentMode),
      };
    })
    .sort((a, b) => b.score - a.score || a.totalDays - b.totalDays || a.title.localeCompare(b.title));

  const active = activeChallengeId
    ? (() => {
        const def = getChallengeById(activeChallengeId);
        if (!def) return null;
        const daysCompleted = activeChallengeSnapshot?.daysCompleted ?? 0;
        const missedDays =
          activeChallengeState === "inactive"
            ? getChallengeMissedDays(
                {
                  completedDays: daysCompleted,
                  totalDays: def.totalDays,
                  lastCompletedAt: activeChallengeSnapshot?.lastCompletedAt ?? null,
                },
                Date.now()
              )
            : null;
        const nextDay = Math.min(daysCompleted + 1, def.totalDays);
        const statusLabel =
          activeChallengeState === "inactive"
            ? t("challenges.inactive")
            : activeChallengeState === "completed_today"
              ? t("challenges.completedToday")
              : t("challenges.inProgress");
        const statusTone =
          activeChallengeState === "inactive"
            ? "warning"
            : activeChallengeState === "completed_today"
              ? "success"
              : "neutral";
        const statusBody =
          activeChallengeState === "inactive"
            ? t("challenges.inactiveReentryBody")
                .replace("{missedDays}", String(missedDays ?? 0))
                .replace("{nextDay}", String(nextDay))
                .replaceAll("{total}", String(def.totalDays))
            : activeChallengeState === "completed_today"
              ? t("challenges.completedTodayBody")
                  .replace("{nextDay}", String(nextDay))
                  .replaceAll("{total}", String(def.totalDays))
              : t("challenges.inProgressBody")
                  .replace("{nextDay}", String(nextDay))
                  .replaceAll("{total}", String(def.totalDays));
        return {
          challengeId: def.id,
          titleKey: def.titleKey,
          title: def.title,
          descriptionKey: def.descriptionKey,
          description: def.description,
          totalDays: def.totalDays,
          mode: def.mode,
          completedDays: daysCompleted,
          score: 100,
          signals: [
            t("challenges.daysCompleted")
              .replace("{completed}", String(daysCompleted))
              .replace("{total}", String(def.totalDays)),
            t("challenges.continueCurrentPractice"),
          ],
          fitChips: [
            t("challenges.daysCompleted")
              .replace("{completed}", String(daysCompleted))
              .replace("{total}", String(def.totalDays)),
            t("challenges.continueCurrentPractice"),
          ],
          actionLabel: t("challenges.continueChallenge"),
          actionKind: "continue" as const,
          progressState: activeChallengeState ?? undefined,
          missedDays,
          statusLabel,
          statusBody,
          statusTone,
          note: t("challenges.reentryNote")
            .replace("{nextDay}", String(Math.min(daysCompleted + 1, def.totalDays))),
        } satisfies ChallengeRecommendation;
      })()
    : null;

  const suggestions = scored.slice(0, 3).map((item) => ({
    ...item,
    actionLabel: t("challenges.startChallenge"),
    actionKind: "start" as const,
  }));

  return {
    primary: active ?? suggestions[0] ?? null,
    alternatives: active ? [] : suggestions.slice(1),
  };
}
