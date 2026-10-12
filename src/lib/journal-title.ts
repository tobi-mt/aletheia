function normalizeForComparison(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLocaleLowerCase();
}

export function journalDisplayTitle({
  title,
  body,
  prompt,
  modeLabel,
  reflectionLabel,
}: {
  title: string;
  body: string;
  prompt?: string;
  modeLabel: string;
  reflectionLabel: string;
}): string | null {
  const normalizedTitle = normalizeForComparison(title);
  const genericTitles = new Set([
    "",
    normalizeForComparison("Reflection"),
    normalizeForComparison(reflectionLabel),
    normalizeForComparison(`${modeLabel} Reflection`),
    normalizeForComparison(`${modeLabel} ${reflectionLabel}`),
  ]);

  if (genericTitles.has(normalizedTitle)) return null;

  const duplicatesSavedContent = [prompt, body].some((value) => {
    const normalizedContent = normalizeForComparison(value ?? "");
    return normalizedContent === normalizedTitle || normalizedContent.startsWith(`${normalizedTitle} `);
  });

  return duplicatesSavedContent ? null : title.trim();
}
