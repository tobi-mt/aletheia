type GratitudeMergeEntry = {
  id: string;
  createdAt: string;
};

const entryTime = (entry: GratitudeMergeEntry) => {
  const value = Date.parse(entry.createdAt);
  return Number.isFinite(value) ? value : 0;
};

/**
 * Combines device and account gratitude without allowing hydration to erase
 * device-only entries. The active device wins an ID collision because it may
 * contain an edit whose previous sync attempt failed.
 */
export function mergeGratitudeEntries<T extends GratitudeMergeEntry>(localEntries: T[], accountEntries: T[]) {
  const merged = new Map<string, T>();
  for (const entry of accountEntries) {
    if (entry?.id) merged.set(entry.id, entry);
  }
  for (const entry of localEntries) {
    if (entry?.id) merged.set(entry.id, entry);
  }
  return [...merged.values()].sort((left, right) => entryTime(right) - entryTime(left));
}

export function gratitudeEntriesMissingFromAccount<T extends GratitudeMergeEntry>(localEntries: T[], accountEntries: T[]) {
  const accountIds = new Set(accountEntries.map((entry) => entry.id));
  return localEntries.filter((entry) => entry?.id && !accountIds.has(entry.id));
}
