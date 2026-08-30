import "server-only";
import { readFileSync } from "fs";
import { join } from "path";

export type ScriptureCorpusVerse = {
  reference: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

export type VerifiedScriptureCandidate = {
  id: string;
  reference: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  contextBefore: string;
  contextAfter: string;
  lexicalScore: number;
  phraseScore: number;
  evidence: string;
};

type ScriptureCorpus = {
  translation: "WEB";
  verseCount: number;
  verses: ScriptureCorpusVerse[];
};

const STOP_WORDS = new Set([
  "a", "about", "after", "again", "all", "also", "am", "an", "and", "any", "are", "as", "at", "be", "because", "been", "before", "being", "but", "by", "can", "could", "did", "do", "does", "for", "from", "had", "has", "have", "he", "her", "here", "him", "his", "how", "i", "if", "in", "into", "is", "it", "its", "just", "may", "me", "more", "most", "my", "no", "not", "of", "on", "one", "or", "our", "out", "said", "say", "she", "should", "so", "some", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this", "those", "through", "to", "up", "us", "was", "we", "were", "what", "when", "where", "which", "who", "will", "with", "would", "you", "your",
]);

let cachedCorpus: ScriptureCorpus | null = null;
let cachedTokenIndex: Map<string, number[]> | null = null;
let cachedDocumentFrequency: Map<string, number> | null = null;

function corpus() {
  if (!cachedCorpus) {
    const filePath = join(process.cwd(), "data", "scripture", "web-search-index.json");
    cachedCorpus = JSON.parse(readFileSync(filePath, "utf8")) as ScriptureCorpus;
  }
  return cachedCorpus;
}

export function normalizeRecognitionText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stem(token: string) {
  if (token.length > 6 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 5 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

export function recognitionTokens(value: string) {
  return normalizeRecognitionText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .map(stem);
}

function tokenIndex() {
  if (cachedTokenIndex && cachedDocumentFrequency) {
    return { index: cachedTokenIndex, frequency: cachedDocumentFrequency };
  }
  const index = new Map<string, number[]>();
  const frequency = new Map<string, number>();
  corpus().verses.forEach((verse, verseIndex) => {
    const tokens = new Set(recognitionTokens(verse.text));
    for (const token of tokens) {
      const entries = index.get(token) ?? [];
      entries.push(verseIndex);
      index.set(token, entries);
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  });
  cachedTokenIndex = index;
  cachedDocumentFrequency = frequency;
  return { index, frequency };
}

function ngrams(value: string, size = 3) {
  const tokens = normalizeRecognitionText(value).split(" ").filter(Boolean);
  const result = new Set<string>();
  for (let index = 0; index <= tokens.length - size; index += 1) {
    result.add(tokens.slice(index, index + size).join(" "));
  }
  return result;
}

function phraseSimilarity(transcript: string, verseText: string) {
  const transcriptGrams = ngrams(transcript);
  const verseGrams = ngrams(verseText);
  if (!transcriptGrams.size || !verseGrams.size) return 0;
  let shared = 0;
  for (const gram of verseGrams) if (transcriptGrams.has(gram)) shared += 1;
  return shared / verseGrams.size;
}

function directReferences(transcript: string) {
  const normalized = transcript.replace(/\b(?:chapter|verse)\s+/gi, "");
  const matches = normalized.match(/\b(?:[1-3]\s*)?[A-Za-z]+(?:\s+of\s+[A-Za-z]+)?\s+\d{1,3}:\d{1,3}\b/g) ?? [];
  return new Set(matches.map((match) => normalizeRecognitionText(match).replace(/\s+/g, " ")));
}

function candidateContext(verses: ScriptureCorpusVerse[], verseIndex: number) {
  const current = verses[verseIndex]!;
  const before = verses[verseIndex - 1];
  const after = verses[verseIndex + 1];
  return {
    before: before?.book === current.book && before.chapter === current.chapter ? before.text : "",
    after: after?.book === current.book && after.chapter === current.chapter ? after.text : "",
  };
}

export function retrieveVerifiedScriptureCandidates(transcript: string, limit = 12): VerifiedScriptureCandidate[] {
  const cleanTranscript = transcript.trim().slice(0, 8_000);
  if (!cleanTranscript) return [];
  const data = corpus();
  const { index, frequency } = tokenIndex();
  const queryTokens = [...new Set(recognitionTokens(cleanTranscript))];
  const scores = new Map<number, number>();
  const direct = directReferences(cleanTranscript);

  for (const token of queryTokens) {
    const matches = index.get(token) ?? [];
    const inverseFrequency = Math.log((data.verseCount + 1) / ((frequency.get(token) ?? 0) + 1));
    for (const verseIndex of matches) {
      scores.set(verseIndex, (scores.get(verseIndex) ?? 0) + inverseFrequency);
    }
  }

  for (let verseIndex = 0; verseIndex < data.verses.length; verseIndex += 1) {
    const verse = data.verses[verseIndex]!;
    if (direct.has(normalizeRecognitionText(verse.reference))) {
      scores.set(verseIndex, (scores.get(verseIndex) ?? 0) + 100);
    }
  }

  return [...scores.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 180)
    .map(([verseIndex, weightedScore]) => {
      const verse = data.verses[verseIndex]!;
      const verseTokens = new Set(recognitionTokens(verse.text));
      const sharedTokens = queryTokens.filter((token) => verseTokens.has(token));
      const lexicalScore = verseTokens.size ? sharedTokens.length / verseTokens.size : 0;
      const phraseScore = phraseSimilarity(cleanTranscript, verse.text);
      const context = candidateContext(data.verses, verseIndex);
      return {
        id: `web:${verse.book}:${verse.chapter}:${verse.verse}`,
        reference: verse.reference,
        book: verse.book,
        chapter: verse.chapter,
        verse: verse.verse,
        text: verse.text,
        contextBefore: context.before,
        contextAfter: context.after,
        lexicalScore,
        phraseScore,
        evidence: sharedTokens.slice(0, 8).join(", "),
        combinedScore: weightedScore + lexicalScore * 35 + phraseScore * 60,
      };
    })
    .filter((candidate) => candidate.lexicalScore >= 0.12 || candidate.phraseScore > 0 || direct.has(normalizeRecognitionText(candidate.reference)))
    .sort((left, right) => right.combinedScore - left.combinedScore)
    .slice(0, Math.max(1, Math.min(20, limit)))
    .map((candidate) => ({
      id: candidate.id,
      reference: candidate.reference,
      book: candidate.book,
      chapter: candidate.chapter,
      verse: candidate.verse,
      text: candidate.text,
      contextBefore: candidate.contextBefore,
      contextAfter: candidate.contextAfter,
      lexicalScore: candidate.lexicalScore,
      phraseScore: candidate.phraseScore,
      evidence: candidate.evidence,
    }));
}

export function verifiedCandidateMatchLabel(candidate: VerifiedScriptureCandidate) {
  if (candidate.phraseScore >= 0.45 || candidate.lexicalScore >= 0.72) return "strong_wording" as const;
  if (candidate.phraseScore >= 0.12 || candidate.lexicalScore >= 0.38) return "likely_paraphrase" as const;
  return "possible_echo" as const;
}
