import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const languages = ["en", "es", "fr", "pt", "de", "yo", "ig", "ha", "tl", "ar", "hi"];

test("the Bible reader has complete language copy instead of an English UI fallback", async () => {
  const source = await read("src/components/bible-reader.tsx");

  assert.match(source, /const UI: Record<LanguageCode, BibleReaderCopy>/);
  assert.match(source, /const chapterNavLabels: Record<LanguageCode, \{ previous: string; next: string \}>/);
  assert.doesNotMatch(source, /UI\[language\] \?\? UI\.en/);
  assert.doesNotMatch(source, /chapterNavLabels\[language\] \?\? chapterNavLabels\.en/);
  assert.doesNotMatch(source, /ui\.tapToChangeBook \?\?/);
});

test("the offline PWA page localizes its public copy for every supported language", async () => {
  const source = await read("src/app/sw.js/route.ts");

  for (const language of languages) {
    assert.match(source, new RegExp(`\\n  ${language}: \\{`));
  }

  assert.match(source, /const offlineCopyByLanguage = __OFFLINE_COPY__;/);
  assert.match(source, /const copy = offlineCopyByLanguage\[language\] \|\| offlineCopyByLanguage\.en;/);
  assert.match(source, /data-title/);
  assert.match(source, /data-description/);
  assert.match(source, /\.replaceAll\("__OFFLINE_COPY__", JSON\.stringify\(OFFLINE_COPY\)\)/);
});
