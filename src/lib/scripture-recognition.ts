import "server-only";
import { readFileSync } from "fs";
import { join } from "path";
import { displayReadyScriptureReads } from "@/lib/display-ready-scripture-reads";
import type { BibleTranslation } from "@/lib/localization";

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
  queryCoverage: number;
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
let cachedVocabulary: string[] | null = null;

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
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
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
  cachedVocabulary = [...index.keys()];
  return { index, frequency };
}

function editDistanceAtMostTwo(left: string, right: string) {
  if (Math.abs(left.length - right.length) > 2) return 3;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    let rowMinimum = current[0]!;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const value = Math.min(
        current[rightIndex - 1]! + 1,
        previous[rightIndex]! + 1,
        previous[rightIndex - 1]! + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      current.push(value);
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > 2) return 3;
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length]!;
}

function expandedQueryTokens(tokens: string[], index: Map<string, number[]>) {
  const expanded = new Set(tokens);
  const vocabulary = cachedVocabulary ?? [...index.keys()];
  for (const token of tokens) {
    if (index.has(token) || token.length < 5) continue;
    const maximumDistance = token.length >= 8 ? 2 : 1;
    let additions = 0;
    for (const candidate of vocabulary) {
      if (candidate[0] !== token[0] || Math.abs(candidate.length - token.length) > maximumDistance) continue;
      if (editDistanceAtMostTwo(token, candidate) <= maximumDistance) {
        expanded.add(candidate);
        additions += 1;
        if (additions === 3) break;
      }
    }
  }
  return [...expanded];
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
  const originalQueryTokens = [...new Set(recognitionTokens(cleanTranscript))];
  const queryTokens = expandedQueryTokens(originalQueryTokens, index);
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
      const queryCoverage = originalQueryTokens.length
        ? originalQueryTokens.filter((token) => verseTokens.has(token) || sharedTokens.some((shared) => editDistanceAtMostTwo(token, shared) <= (token.length >= 8 ? 2 : 1))).length / originalQueryTokens.length
        : 0;
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
        queryCoverage,
        phraseScore,
        evidence: sharedTokens.slice(0, 8).join(", "),
        combinedScore: weightedScore + lexicalScore * 30 + queryCoverage * 28 + phraseScore * 60,
      };
    })
    .filter((candidate) => candidate.lexicalScore >= 0.1 || candidate.queryCoverage >= 0.34 || candidate.phraseScore > 0 || direct.has(normalizeRecognitionText(candidate.reference)))
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
      queryCoverage: candidate.queryCoverage,
      phraseScore: candidate.phraseScore,
      evidence: candidate.evidence,
    }));
}

export function verifiedCandidateMatchLabel(candidate: VerifiedScriptureCandidate) {
  if (candidate.phraseScore >= 0.45 || (candidate.lexicalScore >= 0.72 && candidate.queryCoverage >= 0.45) || candidate.queryCoverage >= 0.78) return "strong_wording" as const;
  if (candidate.phraseScore >= 0.12 || (candidate.lexicalScore >= 0.38 && candidate.queryCoverage >= 0.45) || candidate.queryCoverage >= 0.52) return "likely_paraphrase" as const;
  return "possible_echo" as const;
}

function selectedTranslationCandidates(transcript: string, translation: BibleTranslation) {
  if (translation === "WEB") return [];
  const reads = displayReadyScriptureReads[translation];
  if (!reads) return [];
  const queryTokens = [...new Set(recognitionTokens(transcript))];
  if (!queryTokens.length) return [];
  const candidates: Array<VerifiedScriptureCandidate & { combinedScore: number }> = [];

  for (const [passageReference, read] of Object.entries(reads)) {
    const parsed = passageReference.match(/^(.+?)\s+(\d+):/);
    if (!parsed) continue;
    const book = parsed[1]!;
    const chapter = Number(parsed[2]);
    const verses = read.verses ?? [];
    verses.forEach((verse, index) => {
      const verseNumber = Number.parseInt(verse.verse, 10);
      if (!Number.isInteger(verseNumber)) return;
      const verseTokens = new Set(recognitionTokens(verse.text));
      const shared = queryTokens.filter((token) => verseTokens.has(token));
      const lexicalScore = verseTokens.size ? shared.length / verseTokens.size : 0;
      const queryCoverage = shared.length / queryTokens.length;
      const phraseScore = phraseSimilarity(transcript, verse.text);
      if (shared.length < 2 && phraseScore === 0) return;
      if (queryCoverage < 0.3 && lexicalScore < 0.2 && phraseScore === 0) return;
      candidates.push({
        id: `${translation}:${book}:${chapter}:${verseNumber}`,
        reference: `${book} ${chapter}:${verseNumber}`,
        book, chapter, verse: verseNumber, text: verse.text,
        contextBefore: verses[index - 1]?.text ?? "",
        contextAfter: verses[index + 1]?.text ?? "",
        lexicalScore, queryCoverage, phraseScore,
        evidence: shared.slice(0, 8).join(", "),
        combinedScore: lexicalScore * 30 + queryCoverage * 35 + phraseScore * 65,
      });
    });
  }
  return candidates.sort((left, right) => right.combinedScore - left.combinedScore);
}

export function retrieveVerifiedScriptureCandidatesForTranslation(
  transcript: string,
  translation: BibleTranslation,
  limit = 12,
) {
  const selected = selectedTranslationCandidates(transcript, translation);
  const web = retrieveVerifiedScriptureCandidates(transcript, Math.max(limit, 12));
  const seen = new Set<string>();
  return [...selected, ...web].filter((candidate) => {
    const key = `${candidate.book}:${candidate.chapter}:${candidate.verse}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}
