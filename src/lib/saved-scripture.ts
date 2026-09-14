export type ScriptureHighlightColor = "gold" | "rose" | "sky" | "mint";

export type SavedScripture = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  highlight: ScriptureHighlightColor | null;
  savedAt: string;
};

export type ScriptureHighlights = Record<string, ScriptureHighlightColor>;

export function scriptureHighlightKey(book: string, chapter: number, verse: number) {
  return `${book}:${chapter}:${verse}`;
}
