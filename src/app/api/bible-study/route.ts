import { NextRequest, NextResponse } from "next/server";
import { buildBibleStudyGuide, type BibleChapterData } from "@/lib/bible-study";
import { resolveGenerationLanguage } from "@/lib/scripture-generation-templates";
import type { BibleTranslation } from "@/lib/localization";

type ChapterFetchResult = {
  ok: boolean;
  status: number;
  data?: BibleChapterData;
};

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

  const data = (await chapterResponse.json()) as BibleChapterData;
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

    let chapterData: BibleChapterData | null = null;
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

    const study = buildBibleStudyGuide(chapterData, {
      language,
      bibleTranslation: translation as BibleTranslation,
    });
    return NextResponse.json(study, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to build study insights" }, { status: 502 });
  }
}
