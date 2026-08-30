export type WisdomListenMatchStrength = "strong_wording" | "likely_paraphrase" | "possible_echo";

export type WisdomListenVerseMatch = {
  candidateId: string;
  reference: string;
  book: string;
  chapter: number;
  verse: number;
  strength: WisdomListenMatchStrength;
  explanation: string;
  verifiedText: string;
  contextBefore: string;
  contextAfter: string;
};

export type WisdomListenResult = {
  id: string;
  transcript: string;
  matches: WisdomListenVerseMatch[];
  counsel: string;
  application: string;
  mode: string;
  language: string;
  bibleTranslation: string;
  createdAt: string;
  syncState?: "local" | "synced";
};

function cleanText(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, limit) : "";
}

function boundedInteger(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.max(min, Math.min(max, parsed)) : min;
}

export function normalizeStoredWisdomListenResult(value: unknown): WisdomListenResult | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const rawMatches = Array.isArray(input.matches) ? input.matches : [];
  const matches = rawMatches.map((item): WisdomListenVerseMatch | null => {
    if (!item || typeof item !== "object") return null;
    const match = item as Record<string, unknown>;
    const reference = cleanText(match.reference, 80);
    const strength = cleanText(match.strength, 32) as WisdomListenMatchStrength;
    if (!reference || !["strong_wording", "likely_paraphrase", "possible_echo"].includes(strength)) return null;
    return {
      candidateId: cleanText(match.candidateId, 120) || reference,
      reference,
      book: cleanText(match.book, 48),
      chapter: boundedInteger(match.chapter, 1, 150),
      verse: boundedInteger(match.verse, 1, 176),
      strength,
      explanation: cleanText(match.explanation, 360),
      verifiedText: cleanText(match.verifiedText, 800),
      contextBefore: cleanText(match.contextBefore, 800),
      contextAfter: cleanText(match.contextAfter, 800),
    };
  }).filter((item): item is WisdomListenVerseMatch => Boolean(item)).slice(0, 3);

  const createdAt = cleanText(input.createdAt, 40);
  return {
    id: cleanText(input.id, 80) || crypto.randomUUID(),
    transcript: cleanText(input.transcript, 8_000),
    matches,
    counsel: cleanText(input.counsel, 700),
    application: cleanText(input.application, 700),
    mode: cleanText(input.mode, 24),
    language: cleanText(input.language, 12) || "en",
    bibleTranslation: cleanText(input.bibleTranslation, 24) || "WEB",
    createdAt: Number.isFinite(Date.parse(createdAt)) ? createdAt : new Date().toISOString(),
    syncState: input.syncState === "synced" ? "synced" : "local",
  };
}

type ListenNoteCopy = {
  possibleScripture: string;
  noConfidentMatch: string;
  counselHeard: string;
  possibleApplication: string;
  reflectionPrompt?: string;
  recognitionNote?: string;
};

export function wisdomListenReflectionBody(result: WisdomListenResult, copy: ListenNoteCopy) {
  const references = result.matches.map((match) => match.reference).join(", ");
  return [
    `${copy.possibleScripture}: ${references || copy.noConfidentMatch}`,
    result.counsel ? `${copy.counselHeard}: ${result.counsel}` : "",
    result.application ? `${copy.possibleApplication}: ${result.application}` : "",
    copy.reflectionPrompt ?? "",
  ].filter(Boolean).join("\n\n");
}

export function wisdomListenDecisionNote(result: WisdomListenResult, copy: ListenNoteCopy) {
  const references = result.matches.map((match) => match.reference).join(", ");
  return [
    copy.recognitionNote ? `${copy.recognitionNote}: ${references || copy.noConfidentMatch}.` : "",
    result.counsel ? `${copy.counselHeard}: ${result.counsel}` : "",
    result.application ? `${copy.possibleApplication}: ${result.application}` : "",
  ].filter(Boolean).join(" ");
}
