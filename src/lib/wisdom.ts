import "server-only";
import { many } from "@/lib/db";
import {
  defaultPreferences,
  hasCompleteLocalizedWisdomEntry,
  localizedCrisisSupportCopy,
  localizedWisdomResponseCopy,
  localizedModeProfile,
  localizedScriptureRead,
  localizedScriptureReference,
  localizedWisdomEntry,
  scriptureDisplayLabel,
  type UserPreferences,
} from "@/lib/localization";
import { detectLifeSupportConcern } from "@/lib/life-support";
import { MODE_KEYS, type Mode } from "@/lib/mode-keys";
import { scriptureCounselIndex } from "@/lib/scripture-counsel-index";
import { wisdomEntries, WisdomEntryData } from "@/lib/wisdom-data";

export type WisdomSource = WisdomEntryData & { id?: string };

type WisdomRow = {
  id: string;
  theme: string;
  scripture: string;
  principle: string;
  context: string;
  application: string;
  keywords: string[] | string;
  emotions: string[] | string;
  questions: string[] | string;
};

const modeTerms: Record<Mode, string[]> = {
  Money: ["money", "debt", "stewardship", "contentment", "saving", "investing", "risk", "wealth"],
  Work: ["work", "job", "career", "business", "counsel", "diligence", "cost", "planning"],
  Purpose: ["purpose", "identity", "direction", "discernment", "peace", "anxiety", "motives", "calling"],
  Generosity: ["generosity", "give", "giving", "charity", "willing", "sustainable", "stewardship", "guilt"],
  Life: [
    "life",
    "home",
    "family",
    "relationships",
    "habits",
    "rest",
    "health",
    "everyday",
    "addiction",
    "recovery",
    "sobriety",
    "lonely",
    "loneliness",
    "depression",
    "holy",
    "holiness",
    "temptation",
    "relapse",
    "purity",
  ],
};

function decodeList(value: string[] | string) {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function fromRow(row: WisdomRow): WisdomSource {
  return {
    id: row.id,
    theme: row.theme as WisdomEntryData["theme"],
    scripture: row.scripture,
    principle: row.principle,
    context: row.context,
    application: row.application,
    keywords: decodeList(row.keywords),
    emotions: decodeList(row.emotions),
    questions: decodeList(row.questions),
  };
}

export async function getWisdomEntries() {
  const dbEntries = (
    await many<WisdomRow>(
    "SELECT * FROM wisdom_entries ORDER BY theme ASC, scripture ASC"
    )
  ).map(fromRow);
  const seen = new Set(dbEntries.map((entry) => entry.scripture));
  const expandedEntries = scriptureCounselIndex
    .filter((entry) => !seen.has(entry.scripture))
    .map(({ modes, ...entry }) => {
      void modes;
      return entry;
    });

  return [...dbEntries, ...expandedEntries];
}

export function searchWisdomEntries(
  entries: WisdomSource[],
  query: string,
  mode: Mode,
  limit = 3
) {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

  return entries
    .map((entry) => {
      const haystack = [
        entry.scripture,
        entry.principle,
        entry.context,
        entry.application,
        ...entry.keywords,
        ...entry.emotions,
      ]
        .join(" ")
        .toLowerCase();
      const themeScore = words.includes(entry.theme.toLowerCase()) ? 8 : 0;
      const exactKeywordScore = entry.keywords.reduce(
        (score, keyword) => score + (words.includes(keyword) ? 6 : 0),
        0
      );
      const keywordScore = words.reduce(
        (score, word) => score + (haystack.includes(word) ? 1 : 0),
        0
      );
      const modeScore = modeTerms[mode]
        ? modeTerms[mode].reduce(
            (score, term) => score + (haystack.includes(term) ? 2 : 0),
            haystack.includes(mode.toLowerCase()) ? 2 : 0
          )
        : 0;
      const expandedEntry = scriptureCounselIndex.find((item) => item.scripture === entry.scripture);
      const expandedModeScore = expandedEntry?.modes.includes(mode) ? 10 : 0;
      const directReferenceScore = entry.scripture.toLowerCase().includes(query.toLowerCase().trim()) ? 20 : 0;
      return { entry, score: themeScore + exactKeywordScore + keywordScore + modeScore + expandedModeScore + directReferenceScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((result) => result.entry);
}

export async function retrieveWisdom(query: string, mode: Mode, limit = 3) {
  const entries = await getWisdomEntries();
  return searchWisdomEntries(entries, query, mode, limit);
}

const emotionalSignals: Record<string, string[]> = {
  pressure: ["urgent", "rush", "pressure", "afraid", "anxious", "fear", "worried", "overwhelmed"],
  grief: ["grief", "loss", "died", "mourning", "sad", "lonely"],
  shame: ["ashamed", "guilty", "failure", "hide", "secret", "unworthy"],
  hope: ["hope", "dream", "opportunity", "possible", "future"],
};

const questionSignals: Record<string, string[]> = {
  decision: ["should", "choose", "decide", "option", "whether"],
  practice: ["how", "habit", "start", "stop", "plan", "next"],
  discernment: ["why", "calling", "purpose", "know", "peace", "wise"],
  boundary: ["boundary", "say no", "again", "enable", "pressure", "guilt"],
};

function conceptSet(value: string) {
  return new Set(value.toLocaleLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").match(/[\p{L}\p{N}]+/gu) ?? []);
}

/** Evidence ranking intentionally combines several independent signals. Mode fit and
 * emotional/question context outweigh raw word overlap, while the final pass avoids
 * returning several references from the same biblical book. */
export function rankWisdomEvidence(entries: WisdomSource[], query: string, mode: Mode, limit = 8) {
  const words = conceptSet(query);
  const normalizedQuery = [...words].join(" ");
  const emotions = Object.entries(emotionalSignals)
    .filter(([, terms]) => terms.some((term) => normalizedQuery.includes(term)))
    .map(([label]) => label);
  const questionTypes = Object.entries(questionSignals)
    .filter(([, terms]) => terms.some((term) => normalizedQuery.includes(term)))
    .map(([label]) => label);

  const ranked = entries.map((entry) => {
    const entryWords = conceptSet([
      entry.theme, entry.principle, entry.context, entry.application,
      ...entry.keywords, ...entry.emotions, ...entry.questions,
    ].join(" "));
    const semanticOverlap = [...words].filter((word) => word.length > 3 && entryWords.has(word)).length;
    const expanded = scriptureCounselIndex.find((item) => item.scripture === entry.scripture);
    const modeFit = expanded?.modes.includes(mode) ? 18 : modeTerms[mode].filter((term) => entryWords.has(term)).length * 2;
    const emotionalFit = emotions.reduce((score, emotion) =>
      score + (entry.emotions.some((value) => conceptSet(value).has(emotion)) || entryWords.has(emotion) ? 7 : 0), 0);
    const questionFit = questionTypes.reduce((score, type) =>
      score + (entry.questions.some((value) => conceptSet(value).has(type)) || entryWords.has(type) ? 6 : 0), 0);
    const directReference = normalizedQuery && entry.scripture.toLowerCase().includes(normalizedQuery) ? 30 : 0;
    return { entry, score: modeFit + emotionalFit + questionFit + Math.min(semanticOverlap, 8) * 2 + directReference };
  }).sort((a, b) => b.score - a.score || a.entry.scripture.localeCompare(b.entry.scripture));

  const selected: WisdomSource[] = [];
  const books = new Set<string>();
  for (const candidate of ranked) {
    const book = candidate.entry.scripture.replace(/\s+\d.*$/, "");
    if (books.has(book) && ranked.some((other) => !books.has(other.entry.scripture.replace(/\s+\d.*$/, "")))) continue;
    selected.push(candidate.entry);
    books.add(book);
    if (selected.length >= limit) break;
  }
  return selected;
}

export async function retrieveWisdomEvidence(query: string, mode: Mode, limit = 8) {
  return rankWisdomEvidence(await getWisdomEntries(), query, mode, limit);
}

function sourceReference(source: Pick<WisdomSource, "scripture">, preferences: UserPreferences) {
  const scriptureReference = localizedScriptureReference(source.scripture, preferences.language);
  return `${scriptureReference} (${scriptureDisplayLabel(source.scripture, preferences)})`;
}

export function composeFallbackResponse(
  question: string,
  sources: WisdomSource[],
  preferences: UserPreferences = defaultPreferences
) {
  const lifeConcern = detectLifeSupportConcern(question);
  const crisisCopy = localizedCrisisSupportCopy(preferences.language);
  const copy = localizedWisdomResponseCopy(preferences.language);
  const primary = localizedWisdomEntry(sources[0] ?? wisdomEntries[0], preferences);
  const secondary = localizedWisdomEntry(sources[1] ?? wisdomEntries[2], preferences);
  const primaryIsLocalized = hasCompleteLocalizedWisdomEntry(sources[0] ?? wisdomEntries[0], preferences.language);
  const secondaryIsLocalized = hasCompleteLocalizedWisdomEntry(sources[1] ?? wisdomEntries[2], preferences.language);
  const primaryRead = localizedScriptureRead(primary.scripture, preferences);
  const secondaryRead = localizedScriptureRead(secondary.scripture, preferences);
  const opening = lifeConcern === "self_harm"
    ? crisisCopy.selfHarmOpening
    : lifeConcern === "addiction"
      ? crisisCopy.addictionOpening
      : lifeConcern === "depression"
        ? crisisCopy.depressionOpening
        : lifeConcern === "loneliness"
          ? crisisCopy.lonelinessOpening
          : lifeConcern === "holiness"
            ? crisisCopy.holinessOpening
          : copy.opening;

  return [
    opening,
    "",
    lifeConcern === "self_harm"
      ? crisisCopy.selfHarmFollowUp
      : `${copy.primaryAnchor(sourceReference(primary, preferences), primaryIsLocalized ? primary.principle : "")} ${primaryIsLocalized ? copy.ordinaryLife(primary.application) : ""}`,
    lifeConcern === "self_harm"
      ? crisisCopy.selfHarmImmediate
      : "",
    lifeConcern === "self_harm"
      ? ""
      : primaryRead.kind === "passage"
        ? copy.scriptureText(primaryRead.text)
        : "",
    "",
    lifeConcern === "self_harm"
      ? ""
      : `${copy.secondAnchor(sourceReference(secondary, preferences), secondaryIsLocalized ? secondary.principle : "")} ${copy.nextStepQuestion}`,
    lifeConcern === "self_harm"
      ? ""
      : secondaryRead.kind === "passage"
        ? copy.scriptureText(secondaryRead.text)
        : "",
    lifeConcern === "self_harm" || sources.length < 3
      ? ""
      : copy.widerCounsel(sourceReference(sources[2], preferences), hasCompleteLocalizedWisdomEntry(sources[2], preferences.language) ? localizedWisdomEntry(sources[2], preferences).principle : ""),
    lifeConcern === "self_harm" || sources.length < 4
      ? ""
      : copy.additionalWitness(sourceReference(sources[3], preferences), hasCompleteLocalizedWisdomEntry(sources[3], preferences.language) ? localizedWisdomEntry(sources[3], preferences).principle : ""),
    lifeConcern === "self_harm"
      ? ""
      : primaryIsLocalized && secondaryIsLocalized
        ? copy.reflectionQuestions(`${primary.questions[0]} ${primary.questions[1]} ${secondary.questions[0]}`)
        : "",
    lifeConcern === "self_harm"
      ? ""
      : copy.disclaimer,
    lifeConcern === "addiction"
      ? crisisCopy.addictionNext
      : "",
    lifeConcern === "depression"
      ? crisisCopy.depressionNext
      : "",
    lifeConcern === "loneliness"
      ? crisisCopy.lonelinessNext
      : "",
    lifeConcern === "holiness"
      ? crisisCopy.holinessNext
      : "",
  ].join("\n");
}

export function composeModeAwareFallbackResponse(
  question: string,
  mode: Mode,
  sources: WisdomSource[],
  preferences: UserPreferences = defaultPreferences
) {
  const profile = localizedModeProfile(mode, preferences.language);
  const copy = localizedWisdomResponseCopy(preferences.language);
  const base = composeFallbackResponse(question, sources, preferences);
  if (mode === MODE_KEYS.LIFE && detectLifeSupportConcern(question) === "self_harm") {
    return base;
  }
  return [
    base,
    "",
    copy.modeLens(profile.displayLabel, profile.lens),
    "",
    copy.diagnostic(profile.diagnosticTracks[0], profile.diagnosticTracks[1]),
    "",
    copy.formationSignal(profile.blindSpots[0], profile.maturitySignals[0]),
  ].join("\n");
}
