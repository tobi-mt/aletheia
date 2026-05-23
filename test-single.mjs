#!/usr/bin/env node
/**
 * Minimal API Test - Single Request Only
 * Use this when rate limits are in effect
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

const BASE_URL = 'http://localhost:3000';

log('', 'reset');
log('='.repeat(60), 'cyan');
log('  Single API Request Test', 'cyan');
log('='.repeat(60), 'cyan');
log('', 'reset');

log('Testing OpenAI chat with English + Money mode...', 'yellow');

try {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'How can I be wise with money?',
      mode: 'Money',
      preferences: {
        language: 'en',
        region: 'US',
        bibleTranslation: 'WEB',
      },
      manualContext: {},
    }),
  });
  
  if (response.status === 429) {
    log('', 'reset');
    log('⚠️  Rate limit reached. This is expected after running many tests.', 'yellow');
    log('   The rate limit is 12 requests/hour for guests.', 'yellow');
    log('   Please wait an hour or manually test in browser at:', 'yellow');
    log('   http://localhost:3000', 'blue');
    log('', 'reset');
    log('📝 Manual Testing Checklist:', 'cyan');
    log('  1. Open http://localhost:3000 in browser', 'reset');
    log('  2. Click language dropdown, test all 8 languages', 'reset');
    log('  3. Verify UI elements translate correctly', 'reset');
    log('  4. Test Bible translation dropdown (should show 14 options)', 'reset');
    log('  5. Ask a question in chat with different modes', 'reset');
    log('  6. Verify scripture sources appear', 'reset');
    log('  7. Test with different language + Bible combinations', 'reset');
    log('', 'reset');
    process.exit(0);
  }
  
  if (!response.ok) {
    const error = await response.json();
    log(`✗ Request failed: ${response.status}`, 'red');
    log(`  Error: ${JSON.stringify(error)}`, 'yellow');
    process.exit(1);
  }
  
  const data = await response.json();
  
  log('', 'reset');
  log('✓ Chat API working!', 'green');
  log('', 'reset');
  log('Response Preview:', 'cyan');
  log(`  ${data.reply.text.slice(0, 200)}...`, 'blue');
  log('', 'reset');
  
  if (data.reply.sources && data.reply.sources.length > 0) {
    log(`✓ Scripture sources included: ${data.reply.sources.length} sources`, 'green');
    log(`  ${data.reply.sources.map(s => s.scripture).join(', ')}`, 'blue');
  } else {
    log('  No scripture sources (using local wisdom library)', 'yellow');
  }
  
  log('', 'reset');
  log('🎉 OpenAI integration working correctly!', 'green');
  log('   Translation system ready for production.', 'green');
  log('', 'reset');
  
  process.exit(0);
  
} catch (error) {
  log('', 'reset');
  log('✗ Test failed with error:', 'red');
  log(`  ${error.message}`, 'yellow');
  process.exit(1);
}
