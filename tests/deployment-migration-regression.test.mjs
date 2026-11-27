import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const migration = readFileSync(new URL("../migrations/2026-10-10_add_journal_messages.sql", import.meta.url), "utf8");
const analyticsMigration = readFileSync(new URL("../migrations/2026-11-26_add_analytics_events_metadata.sql", import.meta.url), "utf8");
const formationMigration = readFileSync(new URL("../migrations/2026-11-27_add_formation_enrollments.sql", import.meta.url), "utf8");
const scriptureStudyMigration = readFileSync(new URL("../migrations/2026-11-27_add_scripture_notes_and_highlights.sql", import.meta.url), "utf8");
const db = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
const runner = readFileSync(new URL("../scripts/migrate-push-subscriptions-last-verified-at.mjs", import.meta.url), "utf8");

test("production start applies compatibility migrations before Next starts", () => {
  assert.equal(packageJson.scripts.prestart, "npm run db:migrate:analytics-events-metadata && npm run db:migrate:journal-messages && npm run db:migrate:formation-enrollments && npm run db:migrate:scripture-study");
  assert.match(packageJson.scripts["db:migrate:scripture-study"], /2026-11-27_add_scripture_notes_and_highlights\.sql/);
  assert.match(packageJson.scripts["db:migrate:formation-enrollments"], /2026-11-27_add_formation_enrollments\.sql/);
  assert.match(packageJson.scripts["db:migrate:analytics-events-metadata"], /2026-11-26_add_analytics_events_metadata\.sql/);
  assert.match(packageJson.scripts["db:migrate:journal-messages"], /2026-10-10_add_journal_messages\.sql/);
  assert.equal(packageJson.scripts.start, "next start");
});

test("legacy analytics tables are repaired before metadata queries run", () => {
  const metadataColumn = /ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '\{\}'::jsonb/;
  assert.match(db, metadataColumn);
  assert.match(analyticsMigration, metadataColumn);
  assert.match(analyticsMigration, /CREATE INDEX IF NOT EXISTS analytics_events_event_created_idx/);
  assert.doesNotMatch(analyticsMigration, /DROP\s|DELETE\s|TRUNCATE\s/i);
});

test("formation migration creates enrollment and invite-link tables additively", () => {
  assert.match(formationMigration, /CREATE TABLE IF NOT EXISTS challenge_enrollments/);
  assert.match(formationMigration, /PRIMARY KEY \(user_id, challenge_id\)/);
  assert.match(formationMigration, /CREATE TABLE IF NOT EXISTS challenge_circle_invite_links/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS challenge_enrollments/);
  assert.doesNotMatch(formationMigration, /DROP\s|DELETE\s+FROM|TRUNCATE\s/i);
});

test("scripture study migration creates note and highlight sync tables additively", () => {
  for (const table of ["scripture_notes", "scripture_highlights"]) {
    assert.match(scriptureStudyMigration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(db, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(scriptureStudyMigration, /PRIMARY KEY \(user_id, book, chapter, verse\)/);
  assert.doesNotMatch(scriptureStudyMigration, /DROP\s|DELETE\s+FROM|TRUNCATE\s/i);
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
