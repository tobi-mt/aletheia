#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const SOURCE_URL = "https://api.getbible.net/v2/web.json";
const OUTPUT_PATH = join(process.cwd(), "data", "scripture", "web-search-index.json");

const response = await fetch(SOURCE_URL);
if (!response.ok) {
  throw new Error(`Unable to download WEB Scripture corpus: HTTP ${response.status}`);
}

const payload = await response.json();
const verses = [];
for (const book of payload.books ?? []) {
  for (const chapter of book.chapters ?? []) {
    for (const verse of chapter.verses ?? []) {
      const text = String(verse.text ?? "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      verses.push({
        reference: `${book.name} ${verse.chapter}:${verse.verse}`,
        book: book.name,
        chapter: Number(verse.chapter),
        verse: Number(verse.verse),
        text,
      });
    }
  }
}

mkdirSync(join(process.cwd(), "data", "scripture"), { recursive: true });
writeFileSync(OUTPUT_PATH, JSON.stringify({
  source: SOURCE_URL,
  translation: "WEB",
  generatedAt: new Date().toISOString(),
  verseCount: verses.length,
  verses,
}));
console.log(`Wrote ${verses.length} verified WEB verses to ${OUTPUT_PATH}`);
