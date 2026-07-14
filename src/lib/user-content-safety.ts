const blockedContentPatterns: RegExp[] = [
  /\b(?:kill|hurt|attack)\s+(?:you|him|her|them|yourself)\b/i,
  /\b(?:i(?:'|’)ll|i will|we(?:'|’)ll|we will)\s+(?:kill|hurt|attack)\b/i,
  /\b(?:child|minor|underage)\s+(?:porn|sex|nude|naked)\b/i,
  /\b(?:porn|sexual)\s+(?:with|involving)\s+(?:a\s+)?(?:child|minor)\b/i,
  /\b(?:send|share|post)\s+(?:me\s+)?(?:nudes?|porn)\b/i,
  /\b(?:go\s+)?kill\s+yourself\b/i,
];

function normalizedUserContent(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[@4]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/[^\p{L}\p{N}'’]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isObjectionableUserContent(value: string) {
  const normalized = normalizedUserContent(value);
  return normalized.length > 0 && blockedContentPatterns.some((pattern) => pattern.test(normalized));
}
