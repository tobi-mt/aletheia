#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const languages = ['tl', 'ar', 'hi'];

function walkKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...walkKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const english = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/en.json'), 'utf8'));
const englishKeys = walkKeys(english);
let hasFailures = false;

for (const language of languages) {
  const localePath = path.join(root, 'src/locales', `${language}.json`);
  const locale = JSON.parse(fs.readFileSync(localePath, 'utf8'));
  const localeKeys = new Set(walkKeys(locale));
  const missing = englishKeys.filter((key) => !localeKeys.has(key));

  if (missing.length > 0) {
    hasFailures = true;
    console.error(`\n${language}: ${missing.length} missing keys`);
    for (const key of missing) {
      console.error(`- ${key}`);
    }
  } else {
    console.log(`${language}: complete`);
  }
}

if (hasFailures) {
  console.error('\nStrict locale check failed. Fill all missing keys before disabling English fallback.');
  process.exit(1);
}

console.log('\nStrict locale check passed for tl, ar, and hi.');
