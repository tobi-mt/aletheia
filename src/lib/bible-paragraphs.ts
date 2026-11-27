import { BIBLE_PARAGRAPH_STARTS } from "@/lib/bible-paragraphs.generated";

export type BibleChapterLayout = { paragraphStarts: Set<number>; poetry: Set<number> };
export type BibleParagraph<T> = { verses: T[]; poetry: Set<number> };

const parsedBooks = new Map<string, BibleChapterLayout[]>();

function parseVerseList(value: string) {
  const verses = new Set<number>();
  for (const token of value.split(",").filter(Boolean)) {
    const [from, to = from] = token.split("-").map(Number);
    for (let verse = from; verse <= to; verse += 1) verses.add(verse);
  }
  return verses;
}

// Decodes one chapter written by scripts/generate-bible-paragraphs.mjs: "paragraph starts|poetry ranges".
export function parseChapterLayout(encoded: string): BibleChapterLayout {
  const [starts = "", poetry = ""] = encoded.split("|");
  return { paragraphStarts: parseVerseList(starts), poetry: parseVerseList(poetry) };
}

export function bibleChapterLayout(book: string, chapter: number): BibleChapterLayout | null {
  const encoded = BIBLE_PARAGRAPH_STARTS[book];
  if (!encoded) return null;
  let chapters = parsedBooks.get(book);
  if (!chapters) {
    chapters = encoded.split(";").map(parseChapterLayout);
    parsedBooks.set(book, chapters);
  }
  return chapters[chapter - 1] ?? null;
}

// Groups a chapter's verses into reading paragraphs. Verse numbering is shared across the translations
// the reader serves, so one public-domain layout gives every edition natural paragraph and poetry breaks.
export function groupVersesIntoParagraphs<T extends { verse: number }>(book: string, chapter: number, verses: T[]): BibleParagraph<T>[] {
  const layout = bibleChapterLayout(book, chapter);
  if (!layout) return verses.length ? [{ verses, poetry: new Set() }] : [];
  const paragraphs: BibleParagraph<T>[] = [];
  for (const verse of verses) {
    const current = paragraphs[paragraphs.length - 1];
    if (!current || layout.paragraphStarts.has(verse.verse)) paragraphs.push({ verses: [verse], poetry: new Set() });
    else current.verses.push(verse);
    if (layout.poetry.has(verse.verse)) paragraphs[paragraphs.length - 1].poetry.add(verse.verse);
  }
  return paragraphs;
}
