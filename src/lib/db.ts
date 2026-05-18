import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { wisdomEntries } from "@/lib/wisdom-data";

const dataDir = path.join(process.cwd(), "data");
mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.SQLITE_PATH || path.join(dataDir, "aletheia.sqlite");
const globalForDb = globalThis as unknown as { aletheiaDb?: DatabaseSync };

export const db = globalForDb.aletheiaDb ?? new DatabaseSync(dbPath);

if (process.env.NODE_ENV !== "production") {
  globalForDb.aletheiaDb = db;
}

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS wisdom_entries (
    id TEXT PRIMARY KEY,
    theme TEXT NOT NULL,
    scripture TEXT NOT NULL UNIQUE,
    principle TEXT NOT NULL,
    context TEXT NOT NULL,
    application TEXT NOT NULL,
    keywords TEXT NOT NULL,
    emotions TEXT NOT NULL,
    questions TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    mode TEXT NOT NULL,
    content TEXT NOT NULL,
    sources TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    mode TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

const wisdomCount = db.prepare("SELECT COUNT(*) as count FROM wisdom_entries").get()
  ?.count as number | undefined;

if (!wisdomCount) {
  const insert = db.prepare(`
    INSERT INTO wisdom_entries (
      id, theme, scripture, principle, context, application, keywords, emotions, questions, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  for (const entry of wisdomEntries) {
    insert.run(
      crypto.randomUUID(),
      entry.theme,
      entry.scripture,
      entry.principle,
      entry.context,
      entry.application,
      JSON.stringify(entry.keywords),
      JSON.stringify(entry.emotions),
      JSON.stringify(entry.questions),
      now,
      now
    );
  }
}

export function one<T extends Record<string, unknown>>(sql: string, ...params: unknown[]) {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function many<T extends Record<string, unknown>>(sql: string, ...params: unknown[]) {
  return db.prepare(sql).all(...params) as T[];
}

export function run(sql: string, ...params: unknown[]) {
  return db.prepare(sql).run(...params);
}
