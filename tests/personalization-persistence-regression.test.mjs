import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mergeSavedScriptures, scripturesMissingFromAccount } from "../src/lib/saved-scripture-merge.ts";

const scripture = (id, book, chapter, verse, savedAt) => ({ id, book, chapter, verse, text: id, highlight: null, savedAt });

test("saved Scripture hydration preserves device and account passages", () => {
  const local = [scripture("local", "John", 3, 16, "2026-09-12T10:00:00Z")];
  const account = [scripture("account", "James", 1, 5, "2026-09-11T10:00:00Z")];
  assert.deepEqual(mergeSavedScriptures(local, account).map(({ id }) => id), ["local", "account"]);
  assert.deepEqual(scripturesMissingFromAccount(local, account).map(({ id }) => id), ["local"]);
});

test("saved Scripture API is user-owned and included in database bootstrap", async () => {
  const [route, removeRoute, db] = await Promise.all([
    readFile(new URL("../src/app/api/saved-scriptures/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/saved-scriptures/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/db.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /WHERE user_id = \?/);
  assert.match(removeRoute, /WHERE user_id = \? AND client_entry_id = \?/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS saved_scriptures/);
  assert.match(db, /REFERENCES users\(id\) ON DELETE CASCADE/);
});

test("first sign-in migrates local preferences instead of applying server defaults", async () => {
  const [app, route, db] = await Promise.all([
    readFile(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/preferences/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/db.ts", import.meta.url), "utf8"),
  ]);
  assert.match(app, /if \(preferencesData\.persisted && preferencesData\.preferences\)/);
  assert.match(app, /setPreferences\(localPreferences\)/);
  assert.match(app, /body: JSON\.stringify\(localPreferences\)/);
  assert.match(app, /useState<SavedScripture\[\]>\(\(\) => storedSavedScriptures\(\)\)/);
  assert.match(app, /method: "PATCH"/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /personalization = EXCLUDED\.personalization/);
  assert.match(db, /personalization JSONB NOT NULL DEFAULT '\{\}'::jsonb/);
});
