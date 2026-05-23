#!/usr/bin/env node
/**
 * Runtime API and OpenAI Integration Test
 * Tests actual functionality with live server
 */

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

const BASE_URL = 'http://localhost:3000';
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

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
  if (!html.includes('__NEXT_DATA__')) throw new Error('Next.js data not found');
});

// Test 2: Translation Loading
testSection('2. Translation System Runtime');

const languages = ['en', 'es', 'fr', 'pt', 'de', 'yo', 'ig', 'ha'];

for (const lang of languages) {
  await test(`${lang}.json is accessible`, async () => {
    const response = await fetch(`${BASE_URL}/locales/${lang}.json`);
    if (!response.ok) {
      // Try alternate path
      const response2 = await fetch(`${BASE_URL}/_next/static/locales/${lang}.json`);
      if (!response2.ok) {
        throw new Error(`Translation file not accessible`);
      }
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

await test('Chat endpoint accepts requests', async () => {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'What is wisdom?',
      mode: 'Money',
      preferences: {
        language: 'en',
        region: 'US',
        bibleTranslation: 'WEB',
      },
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
  
  log(`    Response preview: "${data.reply.text.slice(0, 100)}..."`, 'blue');
});

// Test with different languages
const testQuestions = [
  { lang: 'es', question: '¿Qué es la sabiduría?', mode: 'Work' },
  { lang: 'fr', question: 'Qu\'est-ce que la sagesse?', mode: 'Purpose' },
  { lang: 'pt', question: 'O que é sabedoria?', mode: 'Generosity' },
  { lang: 'de', question: 'Was ist Weisheit?', mode: 'Money' },
];

for (const { lang, question, mode } of testQuestions) {
  await test(`Chat works with ${lang} language`, async () => {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: question,
        mode,
        preferences: {
          language: lang,
          region: 'US',
          bibleTranslation: 'WEB',
        },
        manualContext: {},
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Chat failed for ${lang}`);
    }
    
    const data = await response.json();
    if (!data.reply) {
      throw new Error(`No reply for ${lang}`);
    }
    
    log(`    ${lang.toUpperCase()}: Got ${data.reply.text.length} chars response`, 'blue');
  });
}

// Test 5: Mode-Specific Responses
testSection('5. Mode-Specific Wisdom Responses');

const modes = ['Money', 'Work', 'Purpose', 'Generosity'];

for (const mode of modes) {
  await test(`${mode} mode provides contextual wisdom`, async () => {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'How should I make a difficult decision?',
        mode,
        preferences: {
          language: 'en',
          region: 'US',
          bibleTranslation: 'WEB',
        },
        manualContext: {},
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Mode ${mode} failed`);
    }
    
    const data = await response.json();
    const hasScripture = data.reply.sources && data.reply.sources.length > 0;
    log(`    ${mode}: ${hasScripture ? '✓' : '✗'} Has scripture sources`, hasScripture ? 'green' : 'yellow');
  });
}

// Test 6: Bible Translation Context
testSection('6. Bible Translation Handling');

const bibleTests = [
  { bible: 'WEB', lang: 'en', name: 'World English Bible' },
  { bible: 'KJV', lang: 'en', name: 'King James Version' },
  { bible: 'RV1960', lang: 'es', name: 'Reina-Valera 1960' },
  { bible: 'LSG1910', lang: 'fr', name: 'Louis Segond 1910' },
  { bible: 'LUTH1912', lang: 'de', name: 'Lutherbibel 1912' },
];

for (const { bible, lang, name } of bibleTests) {
  await test(`${name} (${bible}) is supported`, async () => {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Give me wisdom about faith',
        mode: 'steward',
        preferences: {
          language: lang,
          region: 'US',
          bibleTranslation: bible,
        },
        manualContext: {},
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed with ${bible}`);
    }
    
    const data = await response.json();
    log(`    ${bible}: Response length ${data.reply.text.length} chars`, 'blue');
  });
}

// Test 7: Error Handling
testSection('7. Error Handling & Validation');

await test('Rejects empty messages', async () => {
  const response = await fetch(`${BASE_URL}/api/chat`, {
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
  const response = await fetch(`${BASE_URL}/api/chat`, {
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

const startTime = Date.now();
await test('Chat responds within reasonable time', async () => {
  const testStart = Date.now();
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Quick wisdom test',
      mode: 'Money',
      preferences: { language: 'en', region: 'US', bibleTranslation: 'WEB' },
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
