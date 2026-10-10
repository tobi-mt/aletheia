#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { Client } from "pg";

const { loadEnvConfig } = nextEnv;
const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvConfig(projectDir);

function getClientConfig() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const parsed = new URL(connectionString);
  const sslMode = parsed.searchParams.get("sslmode");
  const needsSsl = Boolean(sslMode && sslMode !== "disable") || parsed.hostname.includes("neon.tech");

  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");

  return {
    connectionString: parsed.toString(),
    ssl: needsSsl ? true : undefined,
  };
}

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationFile =
    process.env.MIGRATION_FILE?.trim() || "../migrations/2026-07-07_add_push_subscriptions_last_verified_at.sql";
  const sqlPath = path.isAbsolute(migrationFile) ? migrationFile : path.resolve(__dirname, migrationFile);
  const sql = await readFile(sqlPath, "utf8");
  const client = new Client(getClientConfig());

  await client.connect();
  let lockHeld = false;
  let transactionOpen = false;
  try {
    await client.query("SELECT pg_advisory_lock(hashtext($1))", ["aletheia:schema-migrations"]);
    lockHeld = true;
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query(sql);
    await client.query("COMMIT");
    transactionOpen = false;
    console.log(`Applied migration: ${path.basename(sqlPath)}`);
  } catch (error) {
    if (transactionOpen) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    throw error;
  } finally {
    if (lockHeld) {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", ["aletheia:schema-migrations"]).catch(() => undefined);
    }
    await client.end();
  }
}

await main();
