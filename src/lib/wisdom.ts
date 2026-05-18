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

  return [
    "Reflection",
    `It makes sense to bring care to this. Your question touches ${primary.theme.toLowerCase()}, and it deserves more than a rushed answer or a fear-driven reaction.`,
    "",
    "Biblical Wisdom",
    `${primary.scripture} points toward this principle: ${primary.principle} ${secondary.scripture} adds a second guardrail: ${secondary.principle}`,
    "",
    "Practical Perspective",
    `${primary.application} This is wisdom support, not financial, legal, or investment advice, so any high-stakes decision should also be reviewed with qualified counsel.`,
    "",
    "Reflection Questions",
    `1. ${primary.questions[0]}`,
    `2. ${primary.questions[1]}`,
    `3. ${secondary.questions[0]}`,
    "",
    "Gentle Reminder",
    "You do not need to force clarity through urgency. Slow, honest, well-counseled obedience is often the most fruitful path.",
  ].join("\n");
}
