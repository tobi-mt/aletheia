import { many } from "@/lib/db";
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
      const modeScore = haystack.includes(mode.toLowerCase()) ? 2 : 0;
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

export function composeFallbackResponse(question: string, sources: WisdomSource[]) {
  const primary = sources[0] ?? wisdomEntries[0];
  const secondary = sources[1] ?? wisdomEntries[2];
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
    `${primary.scripture} gives a helpful anchor here: ${primary.principle.toLowerCase()} In ordinary life, that means ${primary.application.toLowerCase()}`,
    "",
    `${secondary.scripture} adds another layer: ${secondary.principle.toLowerCase()} So a wise next step is not to ask, "Can I make this work?" only, but also, "What kind of person will this decision train me to become?"`,
    "",
    `A few questions may help: ${primary.questions[0]} ${primary.questions[1]} ${secondary.questions[0]}`,
    "",
    "This is wisdom support, not financial or legal advice. If the stakes are significant, bring the numbers and the plan to someone qualified and trustworthy before you act.",
  ].join("\n");
}
