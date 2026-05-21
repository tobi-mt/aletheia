import { many } from "@/lib/db";
import {
  defaultPreferences,
  languages,
  localizedScriptureRead,
  regions,
  scriptureTranslationLabel,
  type UserPreferences,
} from "@/lib/localization";
import { modeProfiles } from "@/lib/mode-profiles";
import { Mode, wisdomEntries, WisdomEntryData } from "@/lib/wisdom-data";

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
    theme: row.theme,
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
  return (
    await many<WisdomRow>(
    "SELECT * FROM wisdom_entries ORDER BY theme ASC, scripture ASC"
    )
  ).map(fromRow);
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
      const modeScore = modeTerms[mode].reduce(
        (score, term) => score + (haystack.includes(term) ? 2 : 0),
        haystack.includes(mode.toLowerCase()) ? 2 : 0
      );
      return { entry, score: themeScore + exactKeywordScore + keywordScore + modeScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((result) => result.entry);
}

export async function retrieveWisdom(query: string, mode: Mode, limit = 3) {
  const entries = await getWisdomEntries();
  return searchWisdomEntries(entries, query, mode, limit);
}

function sourceReference(source: WisdomSource, preferences: UserPreferences) {
  return `${source.scripture} (${scriptureTranslationLabel(source.scripture, preferences)})`;
}

export function composeFallbackResponse(
  question: string,
  sources: WisdomSource[],
  preferences: UserPreferences = defaultPreferences
) {
  const primary = sources[0] ?? wisdomEntries[0];
  const secondary = sources[1] ?? wisdomEntries[2];
  const primaryRead = localizedScriptureRead(primary.scripture, preferences);
  const secondaryRead = localizedScriptureRead(secondary.scripture, preferences);
  const asksAboutDebt = /debt|borrow|loan|credit/i.test(question);
  const asksAboutWork = /job|career|business|startup|quit|leave|work/i.test(question);
  const asksAboutGreed = /greed|wealth|rich|money|comparison|contentment/i.test(question);

  const opening = asksAboutDebt
    ? "That is worth slowing down for. Debt is not automatically wrong, but it can quietly reduce freedom if it is taken on from pressure, fear, or speed."
    : asksAboutWork
      ? "That kind of decision can carry both hope and weight. It makes sense to want clarity without forcing yourself into a rushed yes or no."
      : asksAboutGreed
        ? "That is a very human question. Wanting to build responsibly is not the same as being greedy, but the heart can drift if money becomes a source of identity or security."
        : `It makes sense to bring care to this. Your question touches ${primary.theme.toLowerCase()}, and it deserves more than a rushed answer.`;

  return [
    opening,
    "",
    `${sourceReference(primary, preferences)} gives a helpful anchor here: ${primary.principle.toLowerCase()} In ordinary life, that means ${primary.application.toLowerCase()}`,
    "",
    `Selected reading: ${primaryRead.text}`,
    "",
    `${sourceReference(secondary, preferences)} adds another layer: ${secondary.principle.toLowerCase()} So a wise next step is not to ask, "Can I make this work?" only, but also, "What kind of person will this decision train me to become?"`,
    "",
    `Second reading: ${secondaryRead.text}`,
    "",
    `A few questions may help: ${primary.questions[0]} ${primary.questions[1]} ${secondary.questions[0]}`,
    "",
    "This is wisdom support, not financial or legal advice. If the stakes are significant, bring the numbers and the plan to someone qualified and trustworthy before you act.",
  ].join("\n");
}

export function composeModeAwareFallbackResponse(
  question: string,
  mode: Mode,
  sources: WisdomSource[],
  preferences: UserPreferences = defaultPreferences
) {
  const profile = modeProfiles[mode];
  const base = composeFallbackResponse(question, sources, preferences);
  const language = languages[preferences.language] ?? languages.en;
  const region = regions[preferences.region] ?? regions.global;
  const primary = sources[0] ?? wisdomEntries[0];

  return [
    base,
    "",
    `Preference note: respond for ${language.name} readers, with examples sensitive to ${region.label}. Scripture references use ${sourceReference(primary, preferences)} where curated text is available; otherwise use the reference and explain the principle plainly.`,
    "",
    `Because you are in ${mode} mode, I would look at this through ${profile.lens.toLowerCase()}`,
    "",
    `The deeper diagnostic is: ${profile.diagnosticTracks[0]} ${profile.diagnosticTracks[1]}`,
    "",
    `A possible blind spot to watch: ${profile.blindSpots[0].toLowerCase()}. A maturity signal would be this: ${profile.maturitySignals[0].toLowerCase()}.`,
  ].join("\n");
}
