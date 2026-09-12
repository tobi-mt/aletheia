export type SavedScriptureRecord = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  savedAt: string;
};

const passageKey = (entry: SavedScriptureRecord) => `${entry.book}:${entry.chapter}:${entry.verse}`;

export function mergeSavedScriptures<T extends SavedScriptureRecord>(localEntries: T[], accountEntries: T[]) {
  const merged = new Map(accountEntries.map((entry) => [passageKey(entry), entry]));
  for (const entry of localEntries) merged.set(passageKey(entry), entry);
  return [...merged.values()].sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt));
}

export function scripturesMissingFromAccount<T extends SavedScriptureRecord>(localEntries: T[], accountEntries: T[]) {
  const accountKeys = new Set(accountEntries.map(passageKey));
  return localEntries.filter((entry) => !accountKeys.has(passageKey(entry)));
}
