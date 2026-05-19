import { Pool } from "pg";
import { wisdomEntries } from "@/lib/wisdom-data";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required. Set it to your Neon Postgres connection string.");
}

const globalForDb = globalThis as unknown as {
  aletheiaPool?: Pool;
  aletheiaDbReady?: Promise<void>;
};

export const pool =
  globalForDb.aletheiaPool ??
  new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.aletheiaPool = pool;
}

function postgresParams(sql: string) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wisdom_entries (
      id TEXT PRIMARY KEY,
      theme TEXT NOT NULL,
      scripture TEXT NOT NULL UNIQUE,
      principle TEXT NOT NULL,
      context TEXT NOT NULL,
      application TEXT NOT NULL,
      keywords JSONB NOT NULL,
      emotions JSONB NOT NULL,
      questions JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      mode TEXT NOT NULL,
      content TEXT NOT NULL,
      sources JSONB,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      mode TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS chat_messages_user_created_idx ON chat_messages(user_id, created_at);
    CREATE INDEX IF NOT EXISTS journal_entries_user_created_idx ON journal_entries(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS rate_limits_reset_idx ON rate_limits(reset_at);
  `);

  const { rows } = await pool.query<{ count: string }>(
    "SELECT COUNT(*) as count FROM wisdom_entries"
  );

  if (Number(rows[0]?.count ?? 0) > 0) {
    return;
  }

  const now = new Date().toISOString();
  for (const entry of wisdomEntries) {
    await pool.query(
      `INSERT INTO wisdom_entries (
        id, theme, scripture, principle, context, application, keywords, emotions, questions, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11)
      ON CONFLICT (scripture) DO NOTHING`,
      [
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
        now,
      ]
    );
  }
}

export async function ensureDbReady() {
  globalForDb.aletheiaDbReady ??= initializeDatabase();
  return globalForDb.aletheiaDbReady;
}

export async function one<T extends Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
) {
  await ensureDbReady();
  const result = await pool.query(postgresParams(sql), params);
  return result.rows[0] as T | undefined;
}

export async function many<T extends Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
) {
  await ensureDbReady();
  const result = await pool.query(postgresParams(sql), params);
  return result.rows as T[];
}

export async function run(sql: string, ...params: unknown[]) {
  await ensureDbReady();
  return pool.query(postgresParams(sql), params);
}
