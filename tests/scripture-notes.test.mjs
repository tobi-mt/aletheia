import assert from "node:assert/strict";
import test from "node:test";
import { getScriptureNotes, postScriptureNotes } from "../src/app/api/scripture-notes/route.ts";
import { groupVersesIntoParagraphs, parseChapterLayout } from "../src/lib/bible-paragraphs.ts";
import { encodeUsfmBook } from "../scripts/generate-bible-paragraphs.mjs";
import { getScriptureHighlights, postScriptureHighlights } from "../src/app/api/scripture-highlights/route.ts";
import { LEGACY_HIGHLIGHT_TIMESTAMP, entriesFromLegacyHighlights, highlightsFromEntries, mergeScriptureHighlightEntries, mergeScriptureNotes } from "../src/lib/saved-scripture.ts";

const postJson = (body) => new Request("http://localhost/api/scripture-notes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const note = (overrides = {}) => ({
  id: "note-1",
  book: "John",
  chapter: 3,
  verse: 16,
  endVerse: 17,
  passage: "For God so loved the world...",
  note: "Love gives first.",
  updatedAt: "2026-11-27T10:00:00.000Z",
  ...overrides,
});

test("scripture notes require sign-in", async () => {
  const deps = { getCurrentUser: async () => null, many: async () => [], run: async () => undefined };
  assert.equal((await getScriptureNotes(deps)).status, 401);
  assert.equal((await postScriptureNotes(postJson({ note: note() }), deps)).status, 401);
});

test("scripture notes reject invalid references and keep newer account edits", async () => {
  const writes = [];
  const deps = {
    getCurrentUser: async () => ({ id: "user-1" }),
    many: async () => [],
    run: async (sql, ...params) => { writes.push({ sql, params }); },
  };

  const invalid = await postScriptureNotes(postJson({ notes: [note({ verse: 0 }), note({ note: "   " }), note({ endVerse: 10 })] }), deps);
  assert.equal(invalid.status, 400);
  assert.equal(writes.length, 0);

  const saved = await postScriptureNotes(postJson({ note: note() }), deps);
  assert.equal(saved.status, 200);
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /ON CONFLICT \(user_id, book, chapter, verse\)/);
  assert.match(writes[0].sql, /WHERE scripture_notes\.updated_at <= EXCLUDED\.updated_at/);
  assert.deepEqual(writes[0].params.slice(1, 9), ["user-1", "note-1", "John", 3, 16, 17, "For God so loved the world...", "Love gives first."]);

  await postScriptureNotes(postJson({ note: note({ updatedAt: new Date(Date.now() + 86_400_000).toISOString() }) }), deps);
  assert.ok(Date.parse(writes[1].params[10]) <= Date.now(), "future edit times from a skewed device clock are clamped to now");
});

test("merging scripture notes keeps the most recent edit per passage", () => {
  const local = [note({ id: "local", note: "Newer local", updatedAt: "2026-11-27T12:00:00.000Z" }), note({ id: "psalm", book: "Psalms", chapter: 23, verse: 1, endVerse: 1 })];
  const account = [note({ id: "account", note: "Older account", updatedAt: "2026-11-27T09:00:00.000Z" })];
  const merged = mergeScriptureNotes(local, account);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].note, "Newer local");
  assert.ok(merged.some((entry) => entry.id === "psalm"));
});

const highlight = (overrides = {}) => ({ book: "John", chapter: 3, verse: 16, color: "gold", updatedAt: "2026-11-27T10:00:00.000Z", ...overrides });

test("scripture highlights require sign-in", async () => {
  const deps = { getCurrentUser: async () => null, many: async () => [], run: async () => undefined };
  assert.equal((await getScriptureHighlights(deps)).status, 401);
  assert.equal((await postScriptureHighlights(postJson({ highlights: [highlight()] }), deps)).status, 401);
});

test("scripture highlights sync every verse, keep cleared markers and never overwrite newer account edits", async () => {
  const writes = [];
  const deps = {
    getCurrentUser: async () => ({ id: "user-1" }),
    many: async () => [],
    run: async (sql, ...params) => { writes.push({ sql, params }); },
  };

  const invalid = await postScriptureHighlights(postJson({ highlights: [highlight({ verse: 0 }), highlight({ color: "purple" }), highlight({ book: " " })] }), deps);
  assert.equal(invalid.status, 400);
  assert.equal(writes.length, 0);

  const future = new Date(Date.now() + 86_400_000).toISOString();
  const saved = await postScriptureHighlights(postJson({ highlights: [highlight(), highlight({ verse: 17, color: null }), highlight({ verse: 18, updatedAt: future })] }), deps);
  assert.equal(saved.status, 200);
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /ON CONFLICT \(user_id, book, chapter, verse\)/);
  assert.match(writes[0].sql, /WHERE scripture_highlights\.updated_at <= EXCLUDED\.updated_at/);
  assert.deepEqual(writes[0].params.slice(0, 12), ["user-1", "John", 3, 16, "gold", "2026-11-27T10:00:00.000Z", "user-1", "John", 3, 17, null, "2026-11-27T10:00:00.000Z"]);
  assert.ok(Date.parse(writes[0].params[17]) <= Date.now(), "future edit times are clamped to now");
});

test("merging scripture highlights lets the newest edit win, including removals", () => {
  const local = [
    highlight({ color: null, updatedAt: "2026-11-27T12:00:00.000Z" }),
    ...entriesFromLegacyHighlights({ "Psalms:23:1": "mint" }),
  ];
  const account = [
    highlight({ color: "rose", updatedAt: "2026-11-27T09:00:00.000Z" }),
    highlight({ book: "Psalms", chapter: 23, verse: 1, color: "sky" }),
  ];
  const merged = mergeScriptureHighlightEntries(local, account);
  assert.equal(merged.length, 2);
  assert.deepEqual(highlightsFromEntries(merged), { "Psalms:23:1": "sky" });
  assert.equal(entriesFromLegacyHighlights({ "1 John:4:8": "gold", broken: "gold" })[0].updatedAt, LEGACY_HIGHLIGHT_TIMESTAMP);
  assert.equal(entriesFromLegacyHighlights({ "1 John:4:8": "gold", broken: "gold" }).length, 1);
});

const versesOf = (count) => Array.from({ length: count }, (_, index) => ({ verse: index + 1, text: `v${index + 1}` }));
const starts = (paragraphs) => paragraphs.map((paragraph) => paragraph.verses[0].verse);

test("paragraph layout breaks chapters at real paragraph starts and sets poetry as lines", () => {
  const genesis = groupVersesIntoParagraphs("Genesis", 1, versesOf(31));
  assert.deepEqual(starts(genesis), [1, 3, 6, 9, 14, 20, 24, 26, 31]);
  assert.equal(genesis.flatMap((paragraph) => paragraph.verses).length, 31, "every verse is rendered exactly once");
  assert.equal(genesis.every((paragraph) => paragraph.poetry.size === 0), true);

  const beatitudes = groupVersesIntoParagraphs("Matthew", 5, versesOf(48));
  assert.ok(beatitudes.length > 5);
  const poetryVerses = beatitudes.flatMap((paragraph) => [...paragraph.poetry]);
  assert.deepEqual(poetryVerses, [3, 4, 5, 6, 7, 8, 9, 10]);

  const psalm = groupVersesIntoParagraphs("Psalms", 23, versesOf(6));
  assert.equal(psalm.length, 1);
  assert.equal(psalm[0].poetry.size, 6);
});

test("paragraph layout keeps every verse when a translation has extra verses or the book is unknown", () => {
  const extended = groupVersesIntoParagraphs("Genesis", 1, versesOf(33));
  assert.equal(extended.flatMap((paragraph) => paragraph.verses).length, 33);
  assert.deepEqual(groupVersesIntoParagraphs("Unknown", 1, versesOf(3)).map((paragraph) => paragraph.verses.length), [3]);
  assert.deepEqual(groupVersesIntoParagraphs("Genesis", 1, []), []);
});

test("regenerated paragraph data keeps poetry lines the reader can decode", () => {
  const usfm = [
    "\\id PSA",
    "\\c 1",
    "\\d A heading",
    "\\q1",
    "\\v 1 Blessed is the man",
    "\\q2 who doesn't walk",
    "\\v 2 but his delight",
    "\\b",
    "\\q1",
    "\\v 3 He will be like a tree",
    "\\p",
    "\\v 4 The wicked are not so.",
    "\\c 2",
    "\\p",
    "\\v 1 Why do the nations rage?",
  ].join("\n");

  const chapters = encodeUsfmBook(usfm).split(";");
  assert.equal(chapters.length, 2);

  const first = parseChapterLayout(chapters[0]);
  assert.deepEqual([...first.paragraphStarts], [1, 3, 4]);
  assert.deepEqual([...first.poetry], [1, 2, 3]);

  const second = parseChapterLayout(chapters[1]);
  assert.deepEqual([...second.paragraphStarts], [1]);
  assert.equal(second.poetry.size, 0);
});
