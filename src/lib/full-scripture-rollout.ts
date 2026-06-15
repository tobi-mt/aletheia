/**
 * Phase 9: Rollout flags by translation/language cohort.
 *
 * Controls which translations use the full-scripture-reads path vs. the curated fallback.
 * Set NEXT_PUBLIC_SCRIPTURE_ROLLOUT_COHORT to one of: pilot | expanded | global
 * Default (unset or "off"): full-scripture reads disabled for all translations.
 *
 * Cohort progression:
 *   pilot    → English translations only (WEB, KJV, ASV)
 *   expanded → + major Western European (RV1960, LSG1910, MARTIN, LUTH1912, SCHLACH)
 *   global   → all 14 translations
 */

import type { BibleTranslation, LanguageCode } from "@/lib/localization";

export type ScriptureRolloutCohort = "pilot" | "expanded" | "global";

const COHORT_TRANSLATIONS: Record<ScriptureRolloutCohort, BibleTranslation[]> = {
  pilot: ["WEB", "KJV", "ASV"],
  expanded: ["WEB", "KJV", "ASV", "RV1960", "LSG1910", "MARTIN", "LUTH1912", "SCHLACH"],
  global: ["WEB", "KJV", "ASV", "RV1909", "RV1960", "LSG1910", "MARTIN", "AA", "ARC", "LUTH1912", "SCHLACH", "YOR1900", "IGB1913", "HAU1932"],
};

const ENABLED_COHORT =
  (process.env.NEXT_PUBLIC_SCRIPTURE_ROLLOUT_COHORT ?? "off") as ScriptureRolloutCohort | "off";

/**
 * Returns true if full-scripture reads should be attempted for the given translation.
 * Also requires NEXT_PUBLIC_ENABLE_FULL_SCRIPTURE_READS=1 to be set.
 */
export function isFullScriptureEnabled(translation: BibleTranslation, _language?: LanguageCode): boolean {
  if (ENABLED_COHORT === "off") return false;
  return COHORT_TRANSLATIONS[ENABLED_COHORT]?.includes(translation) ?? false;
}

export function getEnabledCohort(): ScriptureRolloutCohort | "off" {
  return ENABLED_COHORT;
}

export function getCohortTranslations(cohort: ScriptureRolloutCohort): BibleTranslation[] {
  return COHORT_TRANSLATIONS[cohort];
}

// ---- Fallback metrics ----
// Lightweight in-process counters tracking when localizedScriptureRead() falls back
// from full-scripture to the curated dataset. Exposed for analytics and observability.

type FallbackKey = `${BibleTranslation}/${LanguageCode}`;

const fallbackCounts: Partial<Record<FallbackKey, number>> = {};
const fallbackRefs: string[] = [];
const MAX_TRACKED_REFS = 200;

/**
 * Record a fallback event: full-scripture read was enabled but missed for this reference.
 * Called by localizedScriptureRead() in localization.ts.
 */
export function recordScriptureFallback(
  translation: BibleTranslation,
  language: LanguageCode,
  canonicalRef: string,
): void {
  const key: FallbackKey = `${translation}/${language}`;
  fallbackCounts[key] = (fallbackCounts[key] ?? 0) + 1;
  if (fallbackRefs.length < MAX_TRACKED_REFS) {
    fallbackRefs.push(`${key}:${canonicalRef}`);
  }
}

export interface ScriptureFallbackMetrics {
  totalFallbacks: number;
  byTranslationLanguage: Partial<Record<FallbackKey, number>>;
  recentRefs: string[];
  cohort: ScriptureRolloutCohort | "off";
}

/** Returns a snapshot of fallback metrics for the current process lifetime. */
export function getScriptureFallbackMetrics(): ScriptureFallbackMetrics {
  const totalFallbacks = Object.values(fallbackCounts).reduce((sum, n) => sum + (n ?? 0), 0);
  return {
    totalFallbacks,
    byTranslationLanguage: { ...fallbackCounts },
    recentRefs: fallbackRefs.slice(-50),
    cohort: ENABLED_COHORT,
  };
}
