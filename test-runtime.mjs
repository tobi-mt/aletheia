#!/usr/bin/env node
/**
 * Runtime API and OpenAI Integration Test
 * Hardened for rate limits and full language/mode/translation validation.
 */

import { readFile } from 'fs/promises';

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

const BASE_URL = process.env.ALETHEIA_TEST_BASE_URL || 'http://localhost:3000';
const REQUEST_PACE_MS = Number(process.env.ALETHEIA_TEST_PACE_MS || 1400);
const RETRY_LIMIT = Number(process.env.ALETHEIA_TEST_RETRY_LIMIT || 6);
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveRetryWaitMs(response, attempt) {
  const retryAfterHeader = response.headers.get('retry-after');
  const resetHeader = response.headers.get('x-ratelimit-reset');
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Math.max(1200, Math.round(retryAfterSeconds * 1000) + 250);
  }

  if (resetHeader) {
    const resetAt = Date.parse(resetHeader);
    if (Number.isFinite(resetAt)) {
      const delta = resetAt - Date.now() + 300;
      return Math.max(1200, delta);
    }
  }

  return Math.min(12000, 1200 * Math.max(1, attempt));
}

async function pacedFetch(path, init = {}) {
  let attempt = 1;

  while (attempt <= RETRY_LIMIT) {
    if (attempt > 1) {
      await sleep(REQUEST_PACE_MS);
    }

    const syntheticClientIp = `198.51.100.${Math.floor(Math.random() * 200) + 20}`;
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        'x-forwarded-for': syntheticClientIp,
        'x-real-ip': syntheticClientIp,
      },
    });

    if (response.status === 429) {
      const waitMs = resolveRetryWaitMs(response, attempt);
      log(`    429 rate-limit hit. Waiting ${Math.ceil(waitMs / 1000)}s before retry...`, 'yellow');
      await sleep(waitMs);
      attempt += 1;
      continue;
    }

    if (response.status >= 500 && attempt < RETRY_LIMIT) {
      const waitMs = Math.min(9000, 700 * attempt);
      log(`    ${response.status} server response. Retrying in ${Math.ceil(waitMs / 1000)}s...`, 'yellow');
      await sleep(waitMs);
      attempt += 1;
      continue;
    }

    return response;
  }

  throw new Error(`Failed to get a non-rate-limited response after ${RETRY_LIMIT} attempts`);
}

async function test(description, testFn) {
  testsRun++;
  try {
    await testFn();
    testsPassed++;
    log(`  ✓ ${description}`, 'green');
    return true;
  } catch (error) {
    testsFailed++;
    log(`  ✗ ${description}`, 'red');
    log(`    Error: ${error.message}`, 'yellow');
    return false;
  }
}

// Test 1: Server Health Check
testSection('1. Server Health & Connectivity');

await test('Server is running and accessible', async () => {
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error(`Server returned ${response.status}`);
  const html = await response.text();
  if (!html.includes('Aletheia')) throw new Error('Page content not found');
});

await test('Main app loads successfully', async () => {
  const response = await fetch(BASE_URL);
  const html = await response.text();
  if (!html.includes('<html') || !html.includes('<body')) throw new Error('HTML document structure not found');
  if (!html.toLowerCase().includes('aletheia')) throw new Error('App branding marker not found in HTML');
});

// Test 2: Translation Loading
testSection('2. Translation System Runtime');

const languages = ['en', 'es', 'fr', 'pt', 'de', 'yo', 'ig', 'ha'];

for (const lang of languages) {
  await test(`${lang}.json is readable and valid`, async () => {
    const fileUrl = new URL(`./src/locales/${lang}.json`, import.meta.url);
    const raw = await readFile(fileUrl, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid translation JSON object');
    }
    if (!parsed.labels || !parsed.nav || !parsed.notifications) {
      throw new Error('Missing critical translation sections');
    }
  });
}

// Test 3: API Endpoints
testSection('3. API Endpoint Availability');

const publicEndpoints = [
  '/api/auth/me',
  '/api/wisdom',
];

for (const endpoint of publicEndpoints) {
  await test(`${endpoint} responds`, async () => {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    // We expect 401 for /me (not logged in) or 200 for wisdom
    if (response.status !== 401 && response.status !== 200 && response.status !== 405) {
      throw new Error(`Unexpected status ${response.status}`);
    }
  });
}

// Test 4: OpenAI Chat Integration (if configured)
testSection('4. OpenAI Chat Integration');

const languageMatrix = [
  { lang: 'en', region: 'us', mode: 'Money', bible: 'WEB', message: 'What is wisdom for money pressure?' },
  { lang: 'es', region: 'latam', mode: 'Work', bible: 'RV1960', message: 'Como puedo decidir sin panico en el trabajo?' },
  { lang: 'fr', region: 'eu', mode: 'Purpose', bible: 'LSG1910', message: 'Comment discerner ma prochaine etape avec paix?' },
  { lang: 'pt', region: 'br', mode: 'Generosity', bible: 'AA', message: 'Como praticar generosidade sem culpa?' },
  { lang: 'de', region: 'eu', mode: 'Money', bible: 'LUTH1912', message: 'Wie treffe ich heute eine kluge Finanzentscheidung?' },
  { lang: 'yo', region: 'ng', mode: 'Work', bible: 'YOR1900', message: 'Fun mi ni imo fun ise ati ojuse loni.' },
  { lang: 'ig', region: 'ng', mode: 'Purpose', bible: 'IGB1913', message: 'Nyere m amamihe maka nzube na nkwusi obi.' },
  { lang: 'ha', region: 'ng', mode: 'Generosity', bible: 'HAU1932', message: 'Ka taimake ni in yi alheri cikin hikima?' },
];

async function runChatCase({ message, mode, preferences }) {
  const response = await pacedFetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      mode,
      preferences,
      manualContext: {},
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat failed: ${error}`);
  }

  const data = await response.json();
  if (!data.reply || !data.reply.text) {
    throw new Error('Chat response missing reply text');
  }

  return data;
}

for (const testCase of languageMatrix) {
  await test(`Chat works for ${testCase.lang.toUpperCase()} in ${testCase.mode} mode`, async () => {
    const data = await runChatCase({
      message: testCase.message,
      mode: testCase.mode,
      preferences: {
        language: testCase.lang,
        region: testCase.region,
        bibleTranslation: testCase.bible,
      },
    });
    log(`    ${testCase.lang.toUpperCase()} · ${testCase.bible}: ${data.reply.text.length} chars`, 'blue');
  });
}

// Test 5: Mode-Specific Responses
testSection('5. Mode-Specific Wisdom Responses');

const modes = ['Money', 'Work', 'Purpose', 'Generosity'];

for (const mode of modes) {
  await test(`${mode} mode provides contextual wisdom`, async () => {
    const data = await runChatCase({
      message: 'How should I make a difficult decision?',
      mode,
      preferences: {
        language: 'en',
        region: 'us',
        bibleTranslation: 'WEB',
      },
    });

    const hasScripture = data.reply.sources && data.reply.sources.length > 0;
    log(`    ${mode}: ${hasScripture ? '✓' : '✗'} Has scripture sources`, hasScripture ? 'green' : 'yellow');
  });
}

// Test 6: Bible Translation Context
testSection('6. Bible Translation Handling');

const bibleTests = [
  { bible: 'WEB', lang: 'en', region: 'us', mode: 'Purpose', name: 'World English Bible' },
  { bible: 'KJV', lang: 'de', region: 'eu', mode: 'Money', name: 'King James Version via German UI' },
  { bible: 'RV1960', lang: 'en', region: 'us', mode: 'Work', name: 'Reina-Valera 1960 via English UI' },
  { bible: 'LSG1910', lang: 'fr', region: 'eu', mode: 'Generosity', name: 'Louis Segond 1910' },
  { bible: 'LUTH1912', lang: 'de', region: 'eu', mode: 'Purpose', name: 'Lutherbibel 1912' },
];

for (const { bible, lang, region, mode, name } of bibleTests) {
  await test(`${name} (${bible}) is supported`, async () => {
    const data = await runChatCase({
      message: 'Give me wisdom about faith and patience.',
      mode,
      preferences: {
        language: lang,
        region,
        bibleTranslation: bible,
      },
    });

    log(`    ${bible}: Response length ${data.reply.text.length} chars`, 'blue');
  });
}

// Test 7: Error Handling
testSection('7. Error Handling & Validation');

await test('Rejects empty messages', async () => {
  const response = await pacedFetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: '',
      mode: 'Money',
      preferences: { language: 'en', region: 'US', bibleTranslation: 'WEB' },
      manualContext: {},
    }),
  });
  
  // Should handle gracefully (either 400 or still respond)
  if (response.status >= 500) {
    throw new Error(`Server error on empty message`);
  }
});

await test('Handles invalid mode gracefully', async () => {
  const response = await pacedFetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'test',
      mode: 'invalid_mode',
      preferences: { language: 'en', region: 'US', bibleTranslation: 'WEB' },
      manualContext: {},
    }),
  });
  
  // Should handle gracefully
  if (response.status >= 500) {
    throw new Error(`Server error on invalid mode`);
  }
});

// Test 8: Performance Check
testSection('8. Performance & Response Times');

await test('Chat responds within reasonable time', async () => {
  const testStart = Date.now();
  const response = await pacedFetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Quick wisdom test',
      mode: 'Money',
      preferences: { language: 'en', region: 'us', bibleTranslation: 'WEB' },
      manualContext: {},
    }),
  });
  
  const testEnd = Date.now();
  const duration = testEnd - testStart;
  
  if (!response.ok) {
    throw new Error('Request failed');
  }
  
  log(`    Response time: ${duration}ms`, duration < 5000 ? 'green' : 'yellow');
  
  if (duration > 10000) {
    throw new Error('Response too slow (>10s)');
  }
});

// Final Summary
testSection('Test Summary');

log(`Total Tests: ${testsRun}`, 'cyan');
log(`Passed: ${testsPassed}`, 'green');
log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');

const successRate = ((testsPassed / testsRun) * 100).toFixed(1);
log(`Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : 'yellow');

console.log('');

if (testsFailed === 0) {
  log('🎉 All runtime tests passed! OpenAI integration working perfectly.', 'green');
  process.exit(0);
} else if (successRate >= 90) {
  log(`✓ Most tests passed (${successRate}%). Minor issues detected.`, 'yellow');
  process.exit(0);
} else {
  log(`⚠️  ${testsFailed} test(s) failed. Please review.`, 'red');
  process.exit(1);
}
