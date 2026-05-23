/**
 * Translation utility functions
 * Provides type-safe translation loading and helper functions
 */

import type { LanguageCode } from './localization';

export type TranslationKey = keyof typeof import('@/locales/en.json');

export interface TranslationData {
  [key: string]: string | string[] | TranslationData;
}

/**
 * In-memory cache for loaded translations
 * Prevents re-loading the same translation files multiple times
 */
const translationCache = new Map<LanguageCode, TranslationData>();

/**
 * Load translation file for a specific language (with caching)
 */
export async function loadTranslations(language: LanguageCode): Promise<TranslationData> {
  // Check cache first
  if (translationCache.has(language)) {
    return translationCache.get(language)!;
  }

  try {
    // Dynamic import based on language
    const translations = await import(`@/locales/${language}.json`);
    const data = translations.default || translations;
    
    // Cache the loaded translations
    translationCache.set(language, data);
    return data;
  } catch (error) {
    console.warn(`Failed to load translations for ${language}, falling back to English`);
    
    // Check cache for English fallback
    if (translationCache.has('en')) {
      return translationCache.get('en')!;
    }
    
    const fallback = await import('@/locales/en.json');
    const data = fallback.default || fallback;
    translationCache.set('en', data);
    return data;
  }
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
  let value: any = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return fallback || key;
    }
  }
  
  return value !== undefined && value !== null ? value : fallback || key;
}

/**
 * Merge translations with English fallback
 * Ensures all keys have values even if target language is incomplete
 */
export async function loadTranslationsWithFallback(language: LanguageCode): Promise<TranslationData> {
  const [targetTranslations, englishTranslations] = await Promise.all([
    loadTranslations(language),
    loadTranslations('en'),
  ]);
  
  return mergeTranslations(englishTranslations, targetTranslations);
}

/**
 * Deep merge two translation objects
 * Target translations override English where they exist
 */
function mergeTranslations(base: TranslationData, override: TranslationData): TranslationData {
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
 * Translation coverage checker
 * Returns percentage of translated keys
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
 * Get all keys from translation object (flattened with dot notation)
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
 * Get missing translation keys
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
