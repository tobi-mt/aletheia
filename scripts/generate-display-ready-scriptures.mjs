import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const OUTPUT_FILE = resolve("src/lib/display-ready-scripture-reads.ts");

const passages = [
  { reference: "Matthew 25:14-30", book: "Matthew", chapter: 25, start: 14, end: 30 },
  { reference: "Proverbs 22:7", book: "Proverbs", chapter: 22, start: 7, end: 7 },
  { reference: "Philippians 4:11-13", book: "Philippians", chapter: 4, start: 11, end: 13 },
  { reference: "Proverbs 15:22", book: "Proverbs", chapter: 15, start: 22, end: 22 },
  { reference: "Luke 14:28", book: "Luke", chapter: 14, start: 28, end: 28 },
  { reference: "2 Corinthians 9:6-8", book: "2 Corinthians", chapter: 9, start: 6, end: 8 },
  { reference: "Proverbs 21:5", book: "Proverbs", chapter: 21, start: 5, end: 5 },
  { reference: "Matthew 6:25-34", book: "Matthew", chapter: 6, start: 25, end: 34 },
];

const translations = {
  WEB: {
    label: "World English Bible",
    availableLanguage: "en",
    source: "usfx",
    url: "https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-web.usfx.xml",
    bookIds: { Matthew: "MAT", Proverbs: "PRO", Philippians: "PHP", Luke: "LUK", "2 Corinthians": "2CO" },
  },
  KJV: {
    label: "King James Version",
    availableLanguage: "en",
    source: "osis",
    url: "https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-kjv.osis.xml",
    bookIds: { Matthew: "Matt", Proverbs: "Prov", Philippians: "Phil", Luke: "Luke", "2 Corinthians": "2Cor" },
  },
  RV1909: {
    label: "Reina-Valera 1909",
    availableLanguage: "es",
    source: "usfx",
    url: "https://raw.githubusercontent.com/seven1m/open-bibles/master/spa-rv1909.usfx.xml",
    bookIds: { Matthew: "MAT", Proverbs: "PRO", Philippians: "PHP", Luke: "LUK", "2 Corinthians": "2CO" },
  },
  LSG1910: {
    label: "Louis Segond 1910",
    availableLanguage: "fr",
    source: "beblia",
    url: "https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/FrenchBible.xml",
  },
  AA: {
    label: "Almeida Atualizada",
    availableLanguage: "pt",
    source: "beblia",
    url: "https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/PortugueseBible.xml",
  },
  LUTH1912: {
    label: "Lutherbibel 1912",
    availableLanguage: "de",
    source: "beblia",
    url: "https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/GermanLuther1912Bible.xml",
  },
  YOR1900: {
    label: "Bíbélì Mímọ́ (1900)",
    availableLanguage: "yo",
    source: "beblia",
    url: "https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/YorubaBible.xml",
  },
  IGB1913: {
    label: "Akwụkwọ Nsọ (1913)",
    availableLanguage: "ig",
    source: "beblia",
    url: "https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/Igbo2006Bible.xml",
  },
  HAU1932: {
    label: "Littafi Mai Tsarki (1932)",
    availableLanguage: "ha",
    source: "beblia",
    url: "https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/Hausa2010Bible.xml",
  },
};

const bookNumbers = {
  Matthew: 40,
  Proverbs: 20,
  Philippians: 50,
  Luke: 42,
  "2 Corinthians": 47,
};

function decodeXml(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanText(text) {
  return decodeXml(
    text
      .replace(/<f\b[\s\S]*?<\/f>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "codex" } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

async function extractBeblia(url, bookNumber, chapter, start, end) {
  const xml = await fetchText(url);
  const bookMatch = xml.match(new RegExp(`<book[^>]*number="${bookNumber}"[\\s\\S]*?</book>`, "i"));
  if (!bookMatch) {
    throw new Error(`Could not find book ${bookNumber} in ${url}`);
  }
  const chapterMatch = bookMatch[0].match(new RegExp(`<chapter[^>]*number="${chapter}"[\\s\\S]*?</chapter>`, "i"));
  if (!chapterMatch) {
    throw new Error(`Could not find chapter ${chapter} in ${url}`);
  }

  const verses = [];
  for (const match of chapterMatch[0].matchAll(/<verse[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/verse>/g)) {
    const verseNumber = Number(match[1]);
    if (verseNumber >= start && verseNumber <= end) {
      verses.push({ verse: String(verseNumber), text: cleanText(match[2]) });
    }
  }
  return verses;
}

async function extractUSFX(url, bookId, chapter, start, end) {
  const xml = await fetchText(url);
  const bookMatch = xml.match(new RegExp(`<book[^>]*id="${bookId}"[\\s\\S]*?</book>`, "i"));
  if (!bookMatch) {
    throw new Error(`Could not find book ${bookId} in ${url}`);
  }
  const chapterMatch = bookMatch[0].match(new RegExp(`<c id="${chapter}"\\s*\\/?>[\\s\\S]*?(?=<c id="|</book>)`, "i"));
  if (!chapterMatch) {
    throw new Error(`Could not find chapter ${chapter} in ${url}`);
  }

  const verses = [];
  for (const match of chapterMatch[0].matchAll(/<v id="(\d+)"\s*\/>([\s\S]*?)(?=<ve\s*\/>|<v id="|$)/g)) {
    const verseNumber = Number(match[1]);
    if (verseNumber >= start && verseNumber <= end) {
      verses.push({ verse: String(verseNumber), text: cleanText(match[2]) });
    }
  }
  return verses;
}

async function extractOSIS(url, bookId, chapter, start, end) {
  const xml = await fetchText(url);
  const chapterMatch = xml.match(
    new RegExp(`<chapter[^>]*osisRef="${bookId}\\.${chapter}"[^>]*/>[\\s\\S]*?(?=<chapter[^>]*osisRef="|</div>)`, "i")
  );
  if (!chapterMatch) {
    throw new Error(`Could not find chapter ${chapter} in ${url}`);
  }

  const verses = [];
  const verseStarts = [...chapterMatch[0].matchAll(new RegExp(`<verse[^>]*osisID="${bookId}\\.${chapter}\\.(\\d+)"[^>]*>`, "g"))];
  for (let index = 0; index < verseStarts.length; index += 1) {
    const verseNumber = Number(verseStarts[index][1]);
    const verseStart = verseStarts[index].index + verseStarts[index][0].length;
    const nextVerseStart = index + 1 < verseStarts.length ? verseStarts[index + 1].index : chapterMatch[0].length;
    if (verseNumber >= start && verseNumber <= end) {
      verses.push({ verse: String(verseNumber), text: cleanText(chapterMatch[0].slice(verseStart, nextVerseStart)) });
    }
  }
  return verses;
}

function buildText(verses) {
  return verses.map((verse) => `${verse.verse} ${verse.text}`).join(" ");
}

function renderModule(entries) {
  return `import type { BibleTranslation, ScriptureRead } from "@/lib/localization";\n\nexport const displayReadyScriptureReads: Partial<Record<BibleTranslation, Record<string, ScriptureRead>>> = ${JSON.stringify(entries, null, 2)};\n`;
}

async function buildTranslationEntries(code, config) {
  const entries = {};
  for (const passage of passages) {
    let verses;
    if (config.source === "beblia") {
      verses = await extractBeblia(config.url, bookNumbers[passage.book], passage.chapter, passage.start, passage.end);
    } else if (config.source === "usfx") {
      verses = await extractUSFX(
        config.url,
        config.bookIds[passage.book],
        passage.chapter,
        passage.start,
        passage.end
      );
    } else if (config.source === "osis") {
      verses = await extractOSIS(
        config.url,
        config.bookIds[passage.book],
        passage.chapter,
        passage.start,
        passage.end
      );
    } else {
      throw new Error(`Unknown source ${config.source}`);
    }

    entries[passage.reference] = {
      translation: code,
      label: config.label,
      availableLanguage: config.availableLanguage,
      verses,
      text: buildText(verses),
    };
  }
  return entries;
}

const output = {};
for (const [code, config] of Object.entries(translations)) {
  output[code] = await buildTranslationEntries(code, config);
}

await writeFile(OUTPUT_FILE, renderModule(output));
console.log(`Wrote ${OUTPUT_FILE}`);
