#!/usr/bin/env node
/**
 * Imports eBible VPL XML archives into local JSON used by /api/bible fallback.
 *
 * Output files:
 *   public/ebible-vpl/yor.json
 *   public/ebible-vpl/ibo.json
 *   public/ebible-vpl/hausa.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const ROOT = process.cwd();
const TMP_DIR = join(ROOT, "tmp", "ebible-import");
const OUT_DIR = join(ROOT, "public", "ebible-vpl");

const SOURCES = [
  { code: "yor", archive: "yor_vpl.zip", xml: "yor_vpl.xml" },
  { code: "ibo", archive: "ibo_vpl.zip", xml: "ibo_vpl.xml" },
  { code: "hausa", archive: "hausa_vpl.zip", xml: "hausa_vpl.xml" },
];

function decodeEntities(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseVplXml(xml) {
  const books = {};
  const re = /<v\s+b="([^"]+)"\s+c="([^"]+)"\s+v="([^"]+)">([\s\S]*?)<\/v>/g;

  let match;
  let count = 0;
  while ((match = re.exec(xml)) !== null) {
    const book = match[1];
    const chapter = String(parseInt(match[2], 10));
    const verse = String(parseInt(match[3], 10));
    const text = decodeEntities(match[4]);
    if (!book || !chapter || !verse || !text) continue;

    if (!books[book]) books[book] = {};
    if (!books[book][chapter]) books[book][chapter] = {};
    books[book][chapter][verse] = text;
    count++;
  }

  return { books, verseCount: count };
}

function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function main() {
  ensureDir(TMP_DIR);
  ensureDir(OUT_DIR);

  for (const source of SOURCES) {
    const url = `https://ebible.org/Scriptures/${source.archive}`;
    const zipPath = join(TMP_DIR, source.archive);
    const extractDir = join(TMP_DIR, source.code);
    ensureDir(extractDir);

    console.log(`\n[${source.code}] Downloading ${url}`);
    run(`curl -fLsS "${url}" -o "${zipPath}"`);

    console.log(`[${source.code}] Extracting ${source.archive}`);
    run(`unzip -o "${zipPath}" -d "${extractDir}" >/dev/null`);

    const xmlPath = join(extractDir, source.xml);
    const xml = readFileSync(xmlPath, "utf8");

    console.log(`[${source.code}] Parsing ${source.xml}`);
    const { books, verseCount } = parseVplXml(xml);

    const payload = {
      source: "ebible",
      code: source.code,
      generatedAt: new Date().toISOString(),
      verseCount,
      books,
    };

    const outPath = join(OUT_DIR, `${source.code}.json`);
    writeFileSync(outPath, JSON.stringify(payload), "utf8");
    console.log(`[${source.code}] Wrote ${outPath} (${verseCount} verses)`);
  }

  console.log("\nDone importing eBible VPL datasets.");
}

main();
