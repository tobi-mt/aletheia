import { canonicalScriptureReference, localizedScriptureReference, type LanguageCode } from "@/lib/localization";

export function normalizeScriptureMatchText(text: string) {
  return text.replace(/[–—]/g, "-");
}

export function scriptureTextMatches(text: string, allowedScriptures: readonly string[], language: LanguageCode) {
  const referencesByLabel = new Map<string, string>();
  for (const allowed of allowedScriptures) {
    const reference = canonicalScriptureReference(allowed);
    if (!reference) continue;
    for (const label of [reference, localizedScriptureReference(reference, language)]) {
      referencesByLabel.set(normalizeScriptureMatchText(label).toLowerCase(), reference);
    }
  }
  if (!referencesByLabel.size) return [];

  const alternatives = [...referencesByLabel.keys()]
    .sort((a, b) => b.length - a.length)
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const pattern = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{M}\\p{N}]|-\\d)`, "giu");

  return Array.from(normalizeScriptureMatchText(text).matchAll(pattern)).flatMap((match) => {
    const scripture = referencesByLabel.get(match[0].toLowerCase());
    return scripture === undefined ? [] : [{ label: match[0], scripture, index: match.index }];
  });
}
