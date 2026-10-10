import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const migration = readFileSync(new URL("../migrations/2026-10-10_add_journal_messages.sql", import.meta.url), "utf8");
const runner = readFileSync(new URL("../scripts/migrate-push-subscriptions-last-verified-at.mjs", import.meta.url), "utf8");

test("production start applies the journal migration before Next starts", () => {
  assert.equal(packageJson.scripts.prestart, "npm run db:migrate:journal-messages");
  assert.match(packageJson.scripts["db:migrate:journal-messages"], /2026-10-10_add_journal_messages\.sql/);
  assert.equal(packageJson.scripts.start, "next start");
});

test("journal migration is additive and safe to repeat", () => {
  assert.match(migration, /ALTER TABLE journal_entries/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS messages JSONB NOT NULL DEFAULT '\[\]'::jsonb/);
  assert.doesNotMatch(migration, /DROP\s|DELETE\s|TRUNCATE\s/i);
});

test("migration runner serializes concurrent releases and rolls back failures", () => {
  assert.match(runner, /pg_advisory_lock/);
  assert.match(runner, /await client\.query\("BEGIN"\)/);
  assert.match(runner, /await client\.query\("COMMIT"\)/);
  assert.match(runner, /await client\.query\("ROLLBACK"\)/);
  assert.match(runner, /pg_advisory_unlock/);
});
