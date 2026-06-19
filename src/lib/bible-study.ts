import {
  canonicalScriptureReference,
  localizedWisdomEntry,
  localizedBookChapterReference,
  localizedScriptureReference,
  type BibleTranslation,
  type LanguageCode,
  type UserPreferences,
} from "@/lib/localization";
import { buildStudySummary, getStudyThemes, resolveGenerationLanguage } from "@/lib/scripture-generation-templates";
import { wisdomEntries } from "@/lib/wisdom-data";

export type BibleStudyPreferences = {
  language: LanguageCode;
  bibleTranslation: BibleTranslation;
};

export type BibleStudyVerse = {
  verse: number;
  text: string;
};

export type BibleChapterData = {
  translation: string;
  book: string;
  chapter: number;
  verses: BibleStudyVerse[];
  fallbackTranslation?: string;
};

export type BibleStudyTheme = {
  title: string;
  explanation: string;
  verseCitations: string[];
};

export type BibleStudyRelatedVerse = {
  canonicalScripture: string;
  reference: string;
  theme: string;
  principle: string;
  application: string;
};

export type BibleStudyAction = {
  id: string;
  text: string;
  verseCitations: string[];
};

export type BibleStudyData = {
  reference: string;
  translation: string;
  fallbackTranslation?: string;
  summary: string;
  themes: BibleStudyTheme[];
  relatedVerses: BibleStudyRelatedVerse[];
  reflectionQuestions: string[];
  practiceActions: BibleStudyAction[];
};

function normalizeStudyText(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectThemeScores(chapterText: string, themes: ReturnType<typeof getStudyThemes>) {
  return themes
    .map((theme) => {
      const score = theme.keywords.reduce((sum, keyword) => {
        return sum + (chapterText.includes(normalizeStudyText(keyword)) ? 1 : 0);
      }, 0);
      return { theme, score };
    })
    .sort((left, right) => right.score - left.score);
}

function bestVerseCitations(
  book: string,
  chapter: number,
  verses: BibleStudyVerse[],
  keywords: string[],
  language: LanguageCode
): string[] {
  const normalizedKeywords = keywords.map((keyword) => normalizeStudyText(keyword)).filter(Boolean);
  const hits = verses
    .filter((verse) => {
      const normalizedVerse = normalizeStudyText(verse.text);
      return normalizedKeywords.some((keyword) => normalizedVerse.includes(keyword));
    })
    .slice(0, 3)
    .map((verse) => `${localizedBookChapterReference(book, chapter, language)}:${verse.verse}`);

  if (hits.length) {
    return hits;
  }

  const fallback = verses.slice(0, 2).map((verse) => `${localizedBookChapterReference(book, chapter, language)}:${verse.verse}`);
  return fallback.length ? fallback : [localizedBookChapterReference(book, chapter, language)];
}

function scoreRelatedVerse(
  chapterText: string,
  selectedThemes: Array<{ theme: { title: string; keywords: string[] } }>,
  entry: ReturnType<typeof localizedWisdomEntry>
) {
  const entryText = normalizeStudyText(
    [
      entry.theme,
      entry.principle,
      entry.context,
      entry.application,
      ...entry.keywords,
      ...entry.emotions,
      ...entry.questions,
    ].join(" ")
  );

  let score = 0;
  selectedThemes.forEach(({ theme }) => {
    const themeTitle = normalizeStudyText(theme.title);
    if (themeTitle && entryText.includes(themeTitle)) {
      score += 8;
    }

    theme.keywords.forEach((keyword) => {
      const normalizedKeyword = normalizeStudyText(keyword);
      if (!normalizedKeyword) {
        return;
      }
      if (chapterText.includes(normalizedKeyword)) {
        score += 2;
      }
      if (entryText.includes(normalizedKeyword)) {
        score += 4;
      }
    });
  });

  entry.keywords.forEach((keyword) => {
    const normalizedKeyword = normalizeStudyText(keyword);
    if (normalizedKeyword && chapterText.includes(normalizedKeyword)) {
      score += 3;
    }
  });

  entry.emotions.forEach((emotion) => {
    const normalizedEmotion = normalizeStudyText(emotion);
    if (normalizedEmotion && chapterText.includes(normalizedEmotion)) {
      score += 1;
    }
  });

  return score;
}

export function buildBibleStudyGuide(chapterData: BibleChapterData, preferences: BibleStudyPreferences): BibleStudyData {
  const language = resolveGenerationLanguage(preferences.language);
  const themes = getStudyThemes(language);
  const wisdomPreferences = {
    language: preferences.language,
    region: "global",
    bibleTranslation: preferences.bibleTranslation,
    voiceEnabled: false,
  } satisfies UserPreferences;
  const chapterText = normalizeStudyText(chapterData.verses.map((verse) => verse.text).join(" "));

  const scoredThemes = collectThemeScores(chapterText, themes);
  const matchedThemes = scoredThemes.filter((item) => item.score > 0);
  const selectedThemes = matchedThemes.length ? matchedThemes.slice(0, 3) : scoredThemes.slice(0, 2);

  const summaryLead = chapterData.verses.slice(0, 2).map((verse) => verse.text).join(" ").trim();
  const relatedVerses = wisdomEntries
    .map((entry) => {
      const localized = localizedWisdomEntry(entry, wisdomPreferences);
      const canonicalScripture = canonicalScriptureReference(localized.scripture);
      const localizedScripture = localizedScriptureReference(canonicalScripture, preferences.language);
      const score = scoreRelatedVerse(chapterText, selectedThemes, localized);

      return {
        canonicalScripture,
        reference: localizedScripture,
        theme: localized.theme,
        principle: localized.principle,
        application: localized.application,
        score,
      };
    })
    .filter((entry) => !entry.canonicalScripture.startsWith(`${chapterData.book} ${chapterData.chapter}`))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ canonicalScripture, reference, theme, principle, application }) => ({
      canonicalScripture,
      reference,
      theme,
      principle,
      application,
    }));

  return {
    reference: localizedBookChapterReference(chapterData.book, chapterData.chapter, preferences.language),
    translation: chapterData.translation,
    fallbackTranslation: chapterData.fallbackTranslation,
    summary: buildStudySummary(language, chapterData.verses.length, Boolean(summaryLead)),
    themes: selectedThemes.map(({ theme }) => ({
      title: theme.title,
      explanation: theme.insight,
      verseCitations: bestVerseCitations(chapterData.book, chapterData.chapter, chapterData.verses, theme.keywords, preferences.language),
    })),
    relatedVerses,
    reflectionQuestions: selectedThemes.map(({ theme }) => theme.reflectionQuestion),
    practiceActions: selectedThemes.map(({ theme, score }, index) => ({
      id: `action-${index + 1}-${score}`,
      text: theme.action,
      verseCitations: bestVerseCitations(chapterData.book, chapterData.chapter, chapterData.verses, theme.keywords, preferences.language),
    })),
  };
}
