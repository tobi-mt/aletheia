import { NextRequest, NextResponse } from "next/server";
import {
  buildStudySummary,
  getStudyThemes,
  resolveGenerationLanguage,
  type GenerationLanguage,
  type StudyThemeTemplate,
} from "@/lib/scripture-generation-templates";

type BibleVerse = { verse: number; text: string };
type BibleChapterResponse = {
  translation: string;
  fallbackTranslation?: string;
  book: string;
  chapter: number;
  verses: BibleVerse[];
};

type ChapterFetchResult = {
  ok: boolean;
  status: number;
  data?: BibleChapterResponse;
};

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function bestVerseCitations(book: string, chapter: number, verses: BibleVerse[], keywords: string[]): string[] {
  const hits = verses
    .filter((v) => {
      const normalized = normalizeText(v.text);
      return keywords.some((keyword) => normalized.includes(keyword));
    })
    .slice(0, 3)
    .map((v) => `${book} ${chapter}:${v.verse}`);

  if (hits.length) {
    return hits;
  }

  const fallback = verses.slice(0, 2).map((v) => `${book} ${chapter}:${v.verse}`);
  return fallback.length ? fallback : [`${book} ${chapter}`];
}

function buildStudy(chapterData: BibleChapterResponse, language: GenerationLanguage) {
  const themes = getStudyThemes(language);
  const chapterText = normalizeText(chapterData.verses.map((v) => v.text).join(" "));

  const scored = themes.map((theme) => {
    const score = theme.keywords.reduce((sum, keyword) => {
      return sum + (chapterText.includes(keyword) ? 1 : 0);
    }, 0);
    return { theme, score };
  }).sort((a, b) => b.score - a.score);

  const selected = scored.filter((s) => s.score > 0).slice(0, 3);
  const effectiveThemes: StudyThemeTemplate[] = (selected.length ? selected : scored.slice(0, 2)).map((s) => s.theme);

  const summaryLead = chapterData.verses.slice(0, 2).map((v) => v.text).join(" ").trim();
  const chapterSummary = buildStudySummary(language, chapterData.verses.length, Boolean(summaryLead));

  return {
    reference: `${chapterData.book} ${chapterData.chapter}`,
    translation: chapterData.translation,
    fallbackTranslation: chapterData.fallbackTranslation,
    summary: chapterSummary,
    themes: effectiveThemes.map((theme) => ({
      title: theme.title,
      explanation: theme.insight,
      verseCitations: bestVerseCitations(chapterData.book, chapterData.chapter, chapterData.verses, theme.keywords),
    })),
    reflectionQuestions: effectiveThemes.map((theme) => theme.reflectionQuestion),
    practiceActions: effectiveThemes.map((theme, index) => ({
      id: `action-${index + 1}`,
      text: theme.action,
      verseCitations: bestVerseCitations(chapterData.book, chapterData.chapter, chapterData.verses, theme.keywords),
    })),
  };
}

async function fetchChapter(
  origin: string,
  translation: string,
  book: string,
  chapter: number,
): Promise<ChapterFetchResult> {
  const chapterUrl = `${origin}/api/bible?translation=${encodeURIComponent(translation)}&book=${encodeURIComponent(book)}&chapter=${chapter}`;
  const chapterResponse = await fetch(chapterUrl, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!chapterResponse.ok) {
    return { ok: false, status: chapterResponse.status };
  }

  const data = (await chapterResponse.json()) as BibleChapterResponse;
  if (!data.verses?.length) {
    return { ok: false, status: 404 };
  }

  return { ok: true, status: 200, data };
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const translation = (searchParams.get("translation") ?? "WEB").toUpperCase();
  const book = searchParams.get("book") ?? "";
  const chapter = parseInt(searchParams.get("chapter") ?? "", 10);
  const language = resolveGenerationLanguage(searchParams.get("language"));

  if (!book || !Number.isFinite(chapter) || chapter < 1) {
    return NextResponse.json({ error: "Missing or invalid book/chapter" }, { status: 400 });
  }

  try {
    const fallbackCandidates = [translation, "WEB", "KJV"];
    const tried = new Set<string>();

    let chapterData: BibleChapterResponse | null = null;
    let lastStatus = 404;

    for (const candidate of fallbackCandidates) {
      if (tried.has(candidate)) {
        continue;
      }
      tried.add(candidate);

      const result = await fetchChapter(origin, candidate, book, chapter);
      if (!result.ok) {
        lastStatus = result.status;
        continue;
      }

      chapterData = result.data ?? null;
      if (!chapterData) {
        continue;
      }

      if (candidate !== translation) {
        chapterData = {
          ...chapterData,
          translation,
          fallbackTranslation: candidate,
        };
      }

      break;
    }

    if (!chapterData) {
      if (lastStatus === 404) {
        return NextResponse.json({ error: "Chapter not found in this translation" }, { status: 404 });
      }
      return NextResponse.json({ error: "Bible study service unavailable" }, { status: 502 });
    }

    const study = buildStudy(chapterData, language);
    return NextResponse.json(study, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to build study insights" }, { status: 502 });
  }
}
