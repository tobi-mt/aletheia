#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src/locales/en.json');
const localeDir = path.join(root, 'src/locales');
const languages = (process.env.TRANSLATE_LANGUAGES || 'tl,hi,ar')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const batchCharLimit = Number(process.env.TRANSLATE_BATCH_CHARS || 1800);
const defaultBatchSize = Number(process.env.TRANSLATE_BATCH_SIZE || 12);
const requestPauseMs = Number(process.env.TRANSLATE_PAUSE_MS || 50);
const preserveExactValues = new Set([
  'Aletheia',
  'WEB',
  'KJV',
  'ASV',
  'RV1909',
  'RV1960',
  'LSG1910',
  'MARTIN',
  'AA',
  'ARC',
  'LUTH1912',
  'SCHLACH',
  'YOR1900',
  'IGB1913',
  'HAU1932',
]);

const batchSizes = {
  tl: Number(process.env.TRANSLATE_BATCH_SIZE_TL || 3),
  hi: Number(process.env.TRANSLATE_BATCH_SIZE_HI || 1),
  ar: Number(process.env.TRANSLATE_BATCH_SIZE_AR || 20),
};
const singleConcurrency = Number(process.env.TRANSLATE_CONCURRENCY || 8);

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function shouldPreserve(text) {
  if (!text) {
    return true;
  }
  if (preserveExactValues.has(text)) {
    return true;
  }
  if (/^\{[^}]+\}$/.test(text)) {
    return true;
  }
  if (/^\d?\s?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+\d+:\d+(?:-\d+)?(?:,\d+:\d+(?:-\d+)?)*$/.test(text)) {
    return true;
  }
  if (/^[A-Z0-9._-]{2,}$/.test(text)) {
    return true;
  }
  if (/^https?:\/\//.test(text) || /^mailto:/.test(text)) {
    return true;
  }
  return false;
}

function maskText(text) {
  const tokens = [];
  let masked = text.replace(/\n/g, '__NL__');

  masked = masked.replace(/\{[^}]+\}/g, (match) => {
    const token = `__TOK${tokens.length}__`;
    tokens.push([token, match]);
    return token;
  });

  masked = masked.replace(/\bAletheia\b/g, (match) => {
    const token = `__TOK${tokens.length}__`;
    tokens.push([token, match]);
    return token;
  });

  return { masked, tokens };
}

function unmaskText(text, tokens) {
  let restored = text.replace(/__NL__/g, '\n');
  for (const [token, original] of tokens) {
    restored = restored.replaceAll(token, original);
  }
  return restored;
}

function walkLeaves(obj, prefix = '') {
  const leaves = [];
  if (Array.isArray(obj)) {
    obj.forEach((value, index) => {
      const key = prefix ? `${prefix}.${index}` : String(index);
      if (isPlainObject(value) || Array.isArray(value)) {
        leaves.push(...walkLeaves(value, key));
      } else {
        leaves.push({ path: key, value });
      }
    });
    return leaves;
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value) || Array.isArray(value)) {
      leaves.push(...walkLeaves(value, fullPath));
    } else {
      leaves.push({ path: fullPath, value });
    }
  }
  return leaves;
}

function getAtPath(obj, dottedPath) {
  const parts = dottedPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function setAtPath(obj, dottedPath, value) {
  const parts = dottedPath.split('.');
  let current = obj;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (!(part in current) || current[part] == null) {
      current[part] = /^\d+$/.test(parts[index + 1]) ? [] : {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

async function translateBatch(language, entries) {
  if (entries.length === 1) {
    const [single] = await translateEntriesIndividually(language, entries);
    return [single];
  }

  const masked = entries.map((entry) => maskText(entry.source));
  const body = masked
    .map((item, index) => `<span data-k="${index}">${escapeHtml(item.masked)}</span>`)
    .join('');
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: language,
    dt: 't',
    q: body,
  });
  const url = `https://translate.googleapis.com/translate_a/single?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Translation request failed for ${language} with status ${response.status}`);
  }
  const data = await response.json();
  const translated = Array.isArray(data?.[0]) ? data[0].map((row) => row[0]).join('') : '';
  const pieces = extractTranslatedSpans(translated);
  if (pieces.length !== entries.length) {
    console.warn(
      `Batch separator mismatch for ${language} (${entries.length} entries, got ${pieces.length}). Splitting the batch and retrying.`
    );
    const midpoint = Math.ceil(entries.length / 2);
    const left = await translateBatch(language, entries.slice(0, midpoint));
    const right = await translateBatch(language, entries.slice(midpoint));
    return [...left, ...right];
  }
  return pieces.map((piece, index) => unmaskText(piece, masked[index].tokens));
}

function extractTranslatedSpans(html) {
  const pieces = [];
  const regex = /<span data-k=(?:"\d+"|'\d+')>([\s\S]*?)<\/span>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    pieces.push(match[1]);
  }
  return pieces;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
}

async function translateEntriesIndividually(language, entries) {
  const results = new Array(entries.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= entries.length) {
        return;
      }
      results[index] = await translateSingle(language, entries[index].source);
      if (requestPauseMs > 0) {
        await sleep(requestPauseMs);
      }
    }
  }

  const workers = Array.from({ length: Math.min(singleConcurrency, entries.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function translateSingle(language, sourceText) {
  const masked = maskText(sourceText);
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: language,
    dt: 't',
    q: masked.masked,
  });
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Translation request failed for ${language} with status ${response.status}`);
  }
  const data = await response.json();
  const translated = Array.isArray(data?.[0]) ? data[0].map((row) => row[0]).join('') : '';
  return unmaskText(translated, masked.tokens);
}

async function fillLanguage(language) {
  const localePath = path.join(localeDir, `${language}.json`);
  const current = fs.existsSync(localePath)
    ? JSON.parse(fs.readFileSync(localePath, 'utf8'))
    : {};

  const leaves = walkLeaves(source);
  const queue = [];
  const languageBatchSize = batchSizes[language] || defaultBatchSize;

  for (const leaf of leaves) {
    const currentValue = getAtPath(current, leaf.path);
    const sourceValue = leaf.value;

    if (typeof sourceValue !== 'string') {
      continue;
    }

    const shouldTranslate =
      typeof currentValue !== 'string' ||
      currentValue.trim() === '' ||
      currentValue === sourceValue ||
      currentValue.startsWith('[TODO: Translate]');

    if (shouldTranslate && !shouldPreserve(sourceValue)) {
      queue.push({ path: leaf.path, source: sourceValue });
    }
  }

  console.log(`\n${language}: translating ${queue.length} strings`);

  const translated = new Map();
  let cursor = 0;
  while (cursor < queue.length) {
    let batch = [];
    let chars = 0;
    while (cursor < queue.length && batch.length < languageBatchSize && chars + queue[cursor].source.length <= batchCharLimit) {
      batch.push(queue[cursor]);
      chars += queue[cursor].source.length + 1;
      cursor += 1;
    }
    if (batch.length === 0) {
      batch = [queue[cursor]];
      cursor += 1;
    }

    const result = await translateBatch(language, batch);
    batch.forEach((entry, index) => {
      translated.set(entry.path, result[index]);
    });
    await sleep(requestPauseMs);
  }

  const updated = JSON.parse(JSON.stringify(source));
  for (const leaf of leaves) {
    if (typeof leaf.value !== 'string') {
      continue;
    }
    const currentValue = getAtPath(current, leaf.path);
    const shouldTranslate =
      typeof currentValue !== 'string' ||
      currentValue.trim() === '' ||
      currentValue === leaf.value ||
      currentValue.startsWith('[TODO: Translate]');

    const nextValue = shouldTranslate && translated.has(leaf.path)
      ? translated.get(leaf.path)
      : currentValue;
    if (typeof nextValue === 'string') {
      setAtPath(updated, leaf.path, nextValue);
    }
  }

  fs.writeFileSync(localePath, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(`${language}: written ${localePath}`);
}

for (const language of languages) {
  await fillLanguage(language);
}
