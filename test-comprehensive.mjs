#!/usr/bin/env node
/**
 * Comprehensive Test Suite for Aletheia App
 * Tests all critical functionality, translations, and integrations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testSection(title) {
  console.log('');
  log(`${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
}

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  testsRun++;
  if (condition) {
    testsPassed++;
    log(`  ✓ ${message}`, 'green');
  } else {
    testsFailed++;
    log(`  ✗ ${message}`, 'red');
  }
}

function assertDeepEqual(actual, expected, message) {
  testsRun++;
  const isEqual = JSON.stringify(actual) === JSON.stringify(expected);
  if (isEqual) {
    testsPassed++;
    log(`  ✓ ${message}`, 'green');
  } else {
    testsFailed++;
    log(`  ✗ ${message}`, 'red');
    log(`    Expected: ${JSON.stringify(expected)}`, 'yellow');
    log(`    Got: ${JSON.stringify(actual)}`, 'yellow');
  }
}

// Test 1: Translation Files Integrity
testSection('1. Translation Files Integrity');

const languages = ['en', 'es', 'fr', 'pt', 'de', 'yo', 'ig', 'ha'];
const localesDir = path.join(__dirname, 'src', 'locales');

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  assert(fs.existsSync(filePath), `${lang}.json exists`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    assert(typeof data === 'object', `${lang}.json is valid JSON`);
    
    // Check key sections exist
    assert('nav' in data, `${lang}.json has 'nav' section`);
    assert('notifications' in data, `${lang}.json has 'notifications' section`);
    assert('status' in data, `${lang}.json has 'status' section`);
    assert('placeholders' in data, `${lang}.json has 'placeholders' section`);
    assert('labels' in data, `${lang}.json has 'labels' section`);
    
    // Count keys
    const notificationKeys = Object.keys(data.notifications || {}).length;
    const statusKeys = Object.keys(data.status || {}).length;
    const placeholderKeys = Object.keys(data.placeholders || {}).length;
    
    log(`    ${lang}: ${notificationKeys} notification keys, ${statusKeys} status keys, ${placeholderKeys} placeholders`, 'blue');
  } catch (error) {
    assert(false, `${lang}.json parsing failed: ${error.message}`);
  }
});

// Test 2: Translation Key Consistency
testSection('2. Translation Key Consistency Across Languages');

const englishPath = path.join(localesDir, 'en.json');
const englishData = JSON.parse(fs.readFileSync(englishPath, 'utf-8'));

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const englishKeys = getAllKeys(englishData);
log(`  English has ${englishKeys.length} total keys`, 'blue');

languages.slice(1).forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const langKeys = getAllKeys(data);
  
  const missingKeys = englishKeys.filter(k => !langKeys.includes(k));
  const extraKeys = langKeys.filter(k => !englishKeys.includes(k));
  
  assert(missingKeys.length === 0, `${lang} has all English keys (missing: ${missingKeys.length})`);
  if (missingKeys.length > 0) {
    log(`    Missing: ${missingKeys.slice(0, 5).join(', ')}...`, 'yellow');
  }
  
  assert(extraKeys.length === 0, `${lang} has no extra keys (extra: ${extraKeys.length})`);
  if (extraKeys.length > 0) {
    log(`    Extra: ${extraKeys.slice(0, 5).join(', ')}...`, 'yellow');
  }
});

// Test 3: Bible Translations Configuration
testSection('3. Bible Translations Configuration');

const localizationPath = path.join(__dirname, 'src', 'lib', 'localization.ts');
const localizationContent = fs.readFileSync(localizationPath, 'utf-8');

// Check for all expected Bible translations
const expectedBibles = ['WEB', 'KJV', 'ASV', 'RV1909', 'RV1960', 'LSG1910', 'MARTIN', 'AA', 'ARC', 'LUTH1912', 'SCHLACH', 'YOR1900', 'IGB1913', 'HAU1932'];
expectedBibles.forEach(bible => {
  assert(localizationContent.includes(`"${bible}"`), `Bible translation ${bible} is defined`);
});

assert(localizationContent.includes('bibleTranslationOptionsForLanguage'), 'Bible translation helper function exists');

// Test 4: Component Translation Integration
testSection('4. Component Translation Integration');

const componentPath = path.join(__dirname, 'src', 'components', 'aletheia-app.tsx');
const componentContent = fs.readFileSync(componentPath, 'utf-8');

assert(componentContent.includes('const t = (key: string'), 't() translation helper is defined');
assert(componentContent.includes('const ts = (key: string'), 'ts() translation helper is defined');
assert(componentContent.includes('buildUiFromTranslations'), 'buildUiFromTranslations function exists');
assert(componentContent.includes('loadTranslationsWithFallback'), 'Translation loading with fallback is implemented');

// Check that translation helpers are used in key places
const tsUsageCount = (componentContent.match(/ts\('/g) || []).length;
const tUsageCount = (componentContent.match(/\bt\('/g) || []).length;

log(`  Found ${tsUsageCount} ts() calls for string-only translations`, 'blue');
log(`  Found ${tUsageCount} t() calls for flexible translations`, 'blue');

assert(tsUsageCount > 50, `ts() is used extensively (${tsUsageCount} times)`);

// Test 5: API Route Structure
testSection('5. API Route Structure');

const apiDir = path.join(__dirname, 'src', 'app', 'api');

function scanApiRoutes(dir, baseRoute = '/api') {
  const routes = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      if (item.startsWith('[') && item.endsWith(']')) {
        // Dynamic route
        routes.push(...scanApiRoutes(itemPath, `${baseRoute}/${item}`));
      } else {
        routes.push(...scanApiRoutes(itemPath, `${baseRoute}/${item}`));
      }
    } else if (item === 'route.ts') {
      routes.push(baseRoute);
    }
  }
  
  return routes;
}

const apiRoutes = scanApiRoutes(apiDir);
log(`  Found ${apiRoutes.length} API routes`, 'blue');

const expectedRoutes = [
  '/api/chat',
  '/api/decisions',
  '/api/journal',
  '/api/preferences',
  '/api/auth/login',
  '/api/auth/register',
  '/api/notifications/subscribe',
  '/api/counsel'
];

expectedRoutes.forEach(route => {
  const exists = apiRoutes.some(r => r.includes(route.split('/').pop()));
  assert(exists, `API route ${route} exists`);
});

// Test 6: Translation Utility Functions
testSection('6. Translation Utility Functions');

const translationsPath = path.join(__dirname, 'src', 'lib', 'translations.ts');
const translationsContent = fs.readFileSync(translationsPath, 'utf-8');

assert(translationsContent.includes('export function loadTranslations'), 'loadTranslations function is exported');
assert(translationsContent.includes('export function getTranslation'), 'getTranslation function is exported');
assert(translationsContent.includes('export function loadTranslationsWithFallback'), 'loadTranslationsWithFallback function is exported');
assert(translationsContent.includes('export function mergeTranslations'), 'mergeTranslations function is exported');

// Test 7: Environment Configuration
testSection('7. Environment Configuration');

const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

assert(envExists, '.env file exists');

if (envExists) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  assert(envContent.includes('DATABASE_URL'), 'DATABASE_URL is configured');
  assert(envContent.includes('NEXTAUTH_SECRET'), 'NEXTAUTH_SECRET is configured');
  
  // Check if OpenAI is configured (optional)
  const hasOpenAI = envContent.includes('OPENAI_API_KEY');
  log(`  OpenAI API Key: ${hasOpenAI ? '✓ Configured' : '✗ Not configured (optional)'}`, hasOpenAI ? 'green' : 'yellow');
}

// Test 8: Build Artifacts
testSection('8. Build Artifacts');

const nextConfigPath = path.join(__dirname, 'next.config.ts');
const tsConfigPath = path.join(__dirname, 'tsconfig.json');
const packageJsonPath = path.join(__dirname, 'package.json');

assert(fs.existsSync(nextConfigPath), 'next.config.ts exists');
assert(fs.existsSync(tsConfigPath), 'tsconfig.json exists');
assert(fs.existsSync(packageJsonPath), 'package.json exists');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
assert(packageJson.dependencies['next'], 'Next.js is installed');
assert(packageJson.dependencies['react'], 'React is installed');
assert(packageJson.dependencies['openai'], 'OpenAI SDK is installed');
assert(packageJson.dependencies['@neondatabase/serverless'], 'Neon Database SDK is installed');

log(`  Next.js version: ${packageJson.dependencies['next']}`, 'blue');
log(`  React version: ${packageJson.dependencies['react']}`, 'blue');

// Test 9: Critical Notification Keys
testSection('9. Critical Notification Keys Present');

const criticalNotificationKeys = [
  'startingPathPrepared',
  'questionSent',
  'answerReady',
  'signedIn',
  'signedOut',
  'decisionTracked',
  'reflectionSaved',
  'notificationsEnabled',
  'counselAddedLocally',
  'ruleOfLifeSaved'
];

criticalNotificationKeys.forEach(key => {
  languages.forEach(lang => {
    const filePath = path.join(localesDir, `${lang}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    assert(
      data.notifications && key in data.notifications,
      `${lang} has notifications.${key}`
    );
  });
});

// Test 10: Language-Specific Characters
testSection('10. Language-Specific Character Support');

const specialChars = {
  yo: ['ọ', 'ẹ', 'ṣ', 'ó', 'á'], // Yoruba tone marks
  de: ['ä', 'ö', 'ü', 'ß'], // German umlauts
  fr: ['é', 'è', 'ê', 'à', 'ç'], // French accents
  es: ['ñ', 'á', 'é', 'í', 'ó', 'ú'], // Spanish accents
  pt: ['ã', 'õ', 'ç', 'á', 'é'], // Portuguese accents
};

Object.entries(specialChars).forEach(([lang, chars]) => {
  const filePath = path.join(localesDir, `${lang}.json`);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const hasSpecialChars = chars.some(char => content.includes(char));
  assert(hasSpecialChars, `${lang} uses proper special characters`);
});

// Final Summary
testSection('Test Summary');

log(`Total Tests: ${testsRun}`, 'cyan');
log(`Passed: ${testsPassed}`, 'green');
log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');

const successRate = ((testsPassed / testsRun) * 100).toFixed(1);
log(`Success Rate: ${successRate}%`, successRate >= 95 ? 'green' : 'yellow');

console.log('');

if (testsFailed === 0) {
  log('🎉 All tests passed! The app is ready for production.', 'green');
  process.exit(0);
} else {
  log(`⚠️  ${testsFailed} test(s) failed. Please review and fix.`, 'red');
  process.exit(1);
}
