const MAX_TITLE_WORDS = 8;
const MAX_TITLE_CHARACTERS = 64;

function normalizeForComparison(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLocaleLowerCase();
}

export function deriveJournalTitle(value: string): string | null {
  const firstMeaningfulLine = value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s#>*_~-]+/, "").trim())
    .find(Boolean);

  if (!firstMeaningfulLine) return null;

  const cleaned = firstMeaningfulLine
    .replace(/^(?:question|prompt|reflection)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean);

  if (words.length < 2 || cleaned.length < 8) return null;

  let title = words.slice(0, MAX_TITLE_WORDS).join(" ");
  const exceedsCharacterLimit = title.length > MAX_TITLE_CHARACTERS;
  if (exceedsCharacterLimit) {
    title = title.slice(0, MAX_TITLE_CHARACTERS + 1).replace(/\s+\S*$/, "").trim();
  }

  title = title.replace(/[,:;.!?\s]+$/, "").trim();
  if (title.length < 8) return null;
  return words.length > MAX_TITLE_WORDS || exceedsCharacterLimit ? `${title}…` : title;
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

  if (!genericTitles.has(normalizedTitle)) {
    return deriveJournalTitle(title) ?? (title.trim() || null);
  }

  return deriveJournalTitle(prompt ?? "") ?? deriveJournalTitle(body);
}
