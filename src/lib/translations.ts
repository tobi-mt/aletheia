/**
 * Translation utility functions
 * Provides type-safe translation loading and helper functions
 */

import type { LanguageCode } from './localization';

// Statically import all translation files
import enTranslations from '@/locales/en.json';
import esTranslations from '@/locales/es.json';
import frTranslations from '@/locales/fr.json';
import ptTranslations from '@/locales/pt.json';
import deTranslations from '@/locales/de.json';
import yoTranslations from '@/locales/yo.json';
import igTranslations from '@/locales/ig.json';
import haTranslations from '@/locales/ha.json';
import tlTranslations from '@/locales/tl.json';
import arTranslations from '@/locales/ar.json';
import hiTranslations from '@/locales/hi.json';

export type TranslationKey = keyof typeof import('@/locales/en.json');

export interface TranslationData {
  [key: string]: string | string[] | TranslationData;
}

type TranslationValue = string | string[] | TranslationData;

export interface TranslationLoadOptions {
  strict?: boolean;
}

export interface TranslationMissingReport {
  language: LanguageCode;
  translatedKeys: number;
  missingKeys: string[];
  totalKeys: number;
  coveragePercent: number;
}

/**
 * Map of all available translations
 */
const translationMap: Record<LanguageCode, TranslationData> = {
  en: enTranslations,
  es: esTranslations,
  fr: frTranslations,
  pt: ptTranslations,
  de: deTranslations,
  yo: yoTranslations,
  ig: igTranslations,
  ha: haTranslations,
  tl: tlTranslations,
  ar: arTranslations,
  hi: hiTranslations,
};

/**
 * In-memory cache for loaded translations
 * Prevents re-loading the same translation files multiple times
 */
const translationCache = new Map<LanguageCode, TranslationData>();

/**
 * Load a locale bundle for a specific language with caching.
 * This is the raw loader; callers decide whether to merge English fallback or run strict checks.
 */
export function loadTranslationsSync(language: LanguageCode): TranslationData {
  // Reuse the cached bundle when we already loaded this locale.
  if (translationCache.has(language)) {
    return translationCache.get(language)!;
  }

  try {
    // Resolve from the statically imported locale map.
    const data = translationMap[language] || translationMap.en;

    // Cache the resolved bundle for future calls.
    translationCache.set(language, data);
    return data;
  } catch {
    console.warn(`Failed to load translations for ${language}, falling back to English`);

    // Preserve English as the safety net if the locale bundle cannot be read.
    if (translationCache.has('en')) {
      return translationCache.get('en')!;
    }

    const data = translationMap.en;
    translationCache.set('en', data);
    return data;
  }
}

/**
 * Async wrapper around the cached locale loader.
 * Kept for compatibility with call sites that expect a Promise.
 */
export async function loadTranslations(language: LanguageCode): Promise<TranslationData> {
  return loadTranslationsSync(language);
}

/**
 * Get nested translation value using dot notation
 * Example: t('nav.companion') => translations.nav.companion
 */
export function getTranslation(
  translations: TranslationData,
  key: string,
  fallback?: string
): string | string[] {
  const keys = key.split('.');
  let value: TranslationValue | undefined = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      value = value[k];
    } else {
      return fallback || key;
    }
  }
  
  if (typeof value === 'string' || Array.isArray(value)) {
    return value;
  }

  return fallback || key;
}

/**
 * Load translations with English fallback or strict completeness checking.
 * Production deliberately keeps English fallback so incomplete locales remain usable.
 * Strict mode is the dev gate: it throws instead of merging fallback when keys are missing.
 */
export function loadTranslationsWithFallbackSync(language: LanguageCode, options?: TranslationLoadOptions): TranslationData;
export function loadTranslationsWithFallbackSync(language: LanguageCode, options?: TranslationLoadOptions): TranslationData {
  const data = loadTranslationsSync(language);
  if (language === 'en') {
    return data;
  }

  const missingKeys = getMissingTranslationKeys(language, data);
  if (options?.strict && missingKeys.length > 0) {
    throw new Error(buildStrictLocaleError(language, missingKeys));
  }

  return options?.strict ? data : mergeTranslations(translationMap.en, data);
}

export async function loadTranslationsWithFallback(
  language: LanguageCode,
  options?: TranslationLoadOptions
): Promise<TranslationData>;
/**
 * Async version of the fallback-aware loader.
 * English fallback remains intentional outside strict/dev checks.
 */
export async function loadTranslationsWithFallback(language: LanguageCode, options?: TranslationLoadOptions): Promise<TranslationData> {
  return loadTranslationsWithFallbackSync(language, options);
}

/**
 * Deep merge two translation objects.
 * Locale values override English where they exist, and English remains the fallback source.
 */
export function mergeTranslations(base: TranslationData, override: TranslationData): TranslationData {
  const result: TranslationData = { ...base };
  
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value) && typeof base[key] === 'object' && !Array.isArray(base[key])) {
        result[key] = mergeTranslations(base[key] as TranslationData, value as TranslationData);
      } else {
        result[key] = value;
      }
    }
  }
  
  return result;
}

/**
 * Translation coverage checker.
 * Measures how much of the English source is present in the target locale bundle.
 */
export function calculateCoverage(
  targetTranslations: TranslationData,
  masterTranslations: TranslationData
): number {
  const allKeys = getAllKeys(masterTranslations);
  const translatedKeys = allKeys.filter((key) => {
    const value = getTranslation(targetTranslations, key);
    return value !== key && value !== undefined && value !== null;
  });
  
  return (translatedKeys.length / allKeys.length) * 100;
}

/**
 * Get all keys from a translation object, flattened with dot notation.
 */
function getAllKeys(obj: TranslationData, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as TranslationData, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Get the keys that are missing from a locale bundle.
 */
export function getMissingKeys(
  targetTranslations: TranslationData,
  masterTranslations: TranslationData
): string[] {
  const allKeys = getAllKeys(masterTranslations);
  return allKeys.filter((key) => {
    const value = getTranslation(targetTranslations, key);
    return value === key || value === undefined || value === null;
  });
}

export function getMissingTranslationKeys(language: LanguageCode, targetTranslations?: TranslationData): string[] {
  if (language === "en") {
    return [];
  }

  return getMissingKeys(targetTranslations ?? loadTranslationsSync(language), translationMap.en);
}

export function getTranslationMissingReport(
  language: LanguageCode,
  targetTranslations?: TranslationData
): TranslationMissingReport {
  const missingKeys = getMissingTranslationKeys(language, targetTranslations);
  const totalKeys = getAllKeys(translationMap.en).length;
  const translatedKeys = totalKeys - missingKeys.length;

  return {
    language,
    translatedKeys,
    missingKeys,
    totalKeys,
    coveragePercent: totalKeys === 0 ? 100 : (translatedKeys / totalKeys) * 100,
  };
}

function buildStrictLocaleError(language: LanguageCode, missingKeys: string[]): string {
  const preview = missingKeys.slice(0, 12).join(", ");
  const extra = missingKeys.length > 12 ? `, ...and ${missingKeys.length - 12} more` : "";
  return `Locale ${language} is incomplete for strict mode. Missing ${missingKeys.length} keys: ${preview}${extra}`;
}
