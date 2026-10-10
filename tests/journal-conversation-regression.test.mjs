import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const collectionRoute = readFileSync(new URL("../src/app/api/journal/route.ts", import.meta.url), "utf8");
const entryRoute = readFileSync(new URL("../src/app/api/journal/[id]/route.ts", import.meta.url), "utf8");
const schema = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");

test("journal creation persists structured conversation messages", () => {
  assert.match(schema, /messages JSONB NOT NULL DEFAULT '\[\]'::jsonb/);
  assert.match(collectionRoute, /normalizeMessages\(body\.messages\)/);
  assert.match(collectionRoute, /messages: messages\.length/);
  assert.match(collectionRoute, /JSON\.stringify\(entry\.messages\)/);
});

test("journal replies are scoped to the signed-in owner and append without erasing history", () => {
  assert.match(entryRoute, /WHERE id = \? AND user_id = \?/);
  assert.match(entryRoute, /const nextMessages = \[\.\.\.messages, message\]/);
  assert.match(entryRoute, /UPDATE journal_entries SET body = \?, messages = \?::jsonb/);
  assert.match(entryRoute, /role: "reflection"/);
});
