#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

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
  const sqlPath = path.resolve(__dirname, "../migrations/2026-07-07_add_push_subscriptions_last_verified_at.sql");
  const sql = await readFile(sqlPath, "utf8");
  const client = new Client(getClientConfig());

  await client.connect();
  try {
    await client.query(sql);
    console.log(`Applied migration: ${path.basename(sqlPath)}`);
  } finally {
    await client.end();
  }
}

await main();
