import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gratitudeEntriesMissingFromAccount, mergeGratitudeEntries } from "../src/lib/gratitude-entry-merge.ts";

const entry = (id, createdAt, note = id) => ({ id, createdAt, note });

test("sign-in hydration preserves both device-only and account-only gratitude", () => {
  const local = [entry("local", "2026-09-12T10:00:00.000Z")];
  const account = [entry("account", "2026-09-11T10:00:00.000Z")];
  assert.deepEqual(mergeGratitudeEntries(local, account).map(({ id }) => id), ["local", "account"]);
  assert.deepEqual(gratitudeEntriesMissingFromAccount(local, account).map(({ id }) => id), ["local"]);
});

test("the active device copy survives an ID collision after a failed sync", () => {
  const local = [entry("same", "2026-09-12T10:00:00.000Z", "edited locally")];
  const account = [entry("same", "2026-09-12T10:00:00.000Z", "older account copy")];
  assert.equal(mergeGratitudeEntries(local, account)[0].note, "edited locally");
  assert.deepEqual(gratitudeEntriesMissingFromAccount(local, account), []);
});

test("empty account data can never erase device gratitude", () => {
  const local = [entry("kept", "invalid-date")];
  assert.deepEqual(mergeGratitudeEntries(local, []), local);
});

test("signed-in workspace hydration uses the non-destructive merge path", async () => {
  const app = await readFile(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8");
  assert.match(app, /mergeGratitudeEntries\(localEntries, accountEntries\)/);
  assert.match(app, /gratitudeEntriesMissingFromAccount\(localEntries, accountEntries\)/);
  assert.match(app, /if \(!response\.ok\) \{\s*throw new Error\("gratitude_sync_load_failed"\)/);
  assert.doesNotMatch(app, /response\.ok \? response : null,\s*\{ entries: \[\] as GratitudeEntry\[\] \}/);
});
