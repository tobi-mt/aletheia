#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { cwd } from "node:process";
import path from "node:path";

function getGitShortSha() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "nogit";
  }
}

function buildId() {
  const stamp = Date.now().toString(36);
  return `${getGitShortSha()}-${stamp}`;
}

async function main() {
  const envPath = path.resolve(cwd(), ".env.production.local");
  const current = await readFile(envPath, "utf8").catch(() => "");
  const lines = current
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0 && !line.startsWith("NEXT_PUBLIC_BUILD_ID="));
  lines.push(`NEXT_PUBLIC_BUILD_ID="${buildId()}"`);
  await writeFile(envPath, `${lines.join("\n")}\n`, "utf8");
}

await main();
