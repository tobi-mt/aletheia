#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');
const nextBinPath = path.join(workspaceRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

const LOCAL_PORT = Number(process.env.UI_REGRESSION_PORT || 3101);
const REQUESTED_BASE_URL = process.env.UI_REGRESSION_BASE_URL || null;
const LOCAL_BASE_URL = `http://localhost:${LOCAL_PORT}`;
const SERVER_START_TIMEOUT_MS = 90_000;
let runtimeBaseUrl = REQUESTED_BASE_URL || LOCAL_BASE_URL;

const viewports = [
  { name: 'iPhone SE', width: 375, height: 667, mobile: true, touch: true, tabs: ['Home', 'Decide', 'Reflect', 'Library', 'Account'] },
  { name: 'iPhone 14 Pro', width: 393, height: 852, mobile: true, touch: true, tabs: ['Home', 'Decide', 'Reflect', 'Library', 'Account'] },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932, mobile: true, touch: true, tabs: ['Home', 'Decide', 'Reflect', 'Library', 'Account'] },
  { name: 'Pixel 7', width: 412, height: 915, mobile: true, touch: true, tabs: ['Home', 'Decide', 'Reflect', 'Library', 'Account'] },
  { name: 'iPad Mini', width: 768, height: 1024, mobile: false, touch: true, tabs: ['Home', 'Decisions', 'Reflect', 'Library', 'Account'] },
  { name: 'Desktop 1440', width: 1440, height: 900, mobile: false, touch: false, tabs: ['Home', 'Decisions', 'Reflect', 'Library', 'Account'] },
  { name: 'iPhone 14 Pro landscape', width: 852, height: 393, mobile: false, touch: true, tabs: ['Home', 'Decisions', 'Reflect', 'Library', 'Account'] },
];

const markers = {
  Home: 'What should I do next?',
  Decide: 'Name the decision under pressure',
  Decisions: 'Name the decision under pressure',
  Reflect: 'Begin with one honest sentence',
  Library: 'Search one wisdom theme',
  Account: 'Open customization hub',
};

function color(code, text) {
  return `${code}${text}\x1b[0m`;
}

const ok = (text) => color('\x1b[32m', text);
const warn = (text) => color('\x1b[33m', text);
const bad = (text) => color('\x1b[31m', text);
const info = (text) => color('\x1b[36m', text);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs, child) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (child?.exitCode !== null) {
      throw new Error(`Local Next server exited early with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.ok || response.status === 307 || response.status === 308) {
        return;
      }
    } catch {
      // Keep polling until timeout.
    }
    await delay(800);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function canReach(url) {
  try {
    const response = await fetch(url, { redirect: 'manual' });
    return response.ok || response.status === 307 || response.status === 308;
  } catch {
    return false;
  }
}

function startServer() {
  let lastStdout = '';
  let lastStderr = '';
  const child = spawn(
    process.execPath,
    [nextBinPath, 'dev', '--hostname', 'localhost', '--port', String(LOCAL_PORT)],
    {
      cwd: workspaceRoot,
      env: { ...process.env, PORT: String(LOCAL_PORT) },
      stdio: 'pipe',
    }
  );

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    lastStdout = `${lastStdout}${text}`.slice(-4000);
    if (process.env.UI_REGRESSION_VERBOSE === '1') {
      process.stdout.write(text);
    }
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    lastStderr = `${lastStderr}${text}`.slice(-4000);
    if (process.env.UI_REGRESSION_VERBOSE === '1') {
      process.stderr.write(text);
    }
  });

  child.on('exit', (code) => {
    if (process.env.UI_REGRESSION_VERBOSE === '1') {
      console.log(warn(`Local Next dev server exited with code ${code}`));
    }
  });

  child.getRecentOutput = () => ({ stdout: lastStdout, stderr: lastStderr });

  return child;
}

async function clickTab(page, tabName, mobile) {
  let labels = [];
  let found = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    labels = await page.evaluate(() => {
      const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
      return Array.from(document.querySelectorAll('button'))
        .map((button) => normalize(button.textContent))
        .filter(Boolean)
        .slice(0, 40);
    });
    if (labels.includes(tabName)) {
      found = true;
      break;
    }
    await page.waitForTimeout(500);
  }

  if (!found) {
    throw new Error(`Unable to find tab label ${tabName}. Visible buttons: ${labels.join(' | ')}`);
  }

  await page.evaluate(({ tabName, mobile }) => {
    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const buttons = Array.from(document.querySelectorAll('button'));
    const visibleMatches = buttons.filter((button) => {
      const text = normalize(button.textContent);
      if (text !== tabName) {
        return false;
      }
      const rect = button.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return false;
      }
      return true;
    });

    const zonedMatches = visibleMatches.filter((button) => {
      const rect = button.getBoundingClientRect();
      return mobile ? rect.top >= window.innerHeight * 0.65 : rect.top <= 160;
    });

    const target = zonedMatches[zonedMatches.length - 1] || visibleMatches[visibleMatches.length - 1];
    if (!target) {
      throw new Error(`Unable to find tab: ${tabName}`);
    }
    target.click();
  }, { tabName, mobile });
  await page.waitForTimeout(260);
}

async function preparePage(page) {
  await page.goto(runtimeBaseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const raw = window.localStorage.getItem('aletheia_preferences');
    const preferences = raw ? JSON.parse(raw) : {};
    preferences.language = preferences.language || 'en';
    preferences.region = preferences.region || 'US';
    preferences.bibleTranslation = preferences.bibleTranslation || 'WEB';
    preferences.voiceEnabled = true;
    window.localStorage.setItem('aletheia_preferences', JSON.stringify(preferences));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(220);
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="app-launch-splash"]'),
    undefined,
    { timeout: 9000 }
  ).catch(() => undefined);
}

async function checkGlobalLayout(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const overflowX = Math.max(0, Math.round(Math.max(doc.scrollWidth - window.innerWidth, body.scrollWidth - window.innerWidth)));
    const nav = document.querySelector('nav.app-top-nav');
    const firstHeading = Array.from(document.querySelectorAll('main.app-shell h1, main.app-shell h2, main.app-shell h3'))
      .map((heading) => {
        const rect = heading.getBoundingClientRect();
        return { top: rect.top, visible: rect.height > 0 && rect.bottom > 0 };
      })
      .filter((item) => item.visible)
      .sort((left, right) => left.top - right.top)[0] || null;
    const overlap = nav && firstHeading ? Math.max(0, Math.round(nav.getBoundingClientRect().bottom - firstHeading.top)) : 0;
    return { overflowX, overlap };
  });
}

async function checkTapTargets(page, enforce44) {
  return page.evaluate((enforce44) => {
    const minimum = 44;
    const controls = Array.from(document.querySelectorAll('button, input, select, textarea, summary, [role="button"]'));
    const violations = [];

    for (const control of controls) {
      const controlStyle = window.getComputedStyle(control);
      const measurementTarget = control instanceof HTMLSelectElement
        && controlStyle.opacity === '0'
        && control.parentElement?.classList.contains('app-chrome-control')
          ? control.parentElement
          : control;
      const rect = measurementTarget.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || controlStyle.visibility === 'hidden' || controlStyle.display === 'none') {
        continue;
      }

      if (!enforce44) {
        continue;
      }

      if (rect.width < minimum || rect.height < minimum) {
        const label = (control.getAttribute('aria-label') || control.textContent || control.getAttribute('placeholder') || control.tagName)
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 90);
        violations.push({
          label,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    }

    return violations.slice(0, 20);
  }, enforce44);
}

async function checkHome(page, mobile) {
  await clickTab(page, 'Home', mobile);
  const initial = await page.evaluate((marker) => {
    const markerVisible = document.body.innerText.includes(marker);
    const scope = document.querySelector('#companion-ask form') || document;
    const textarea = document.querySelector('#companion-question-input');
    const buttons = Array.from(scope.querySelectorAll('button'));
    const askButton = buttons.find((button) => (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase() === 'ask');
    const micButton = buttons.find((button) => (button.getAttribute('aria-label') || '').toLowerCase().includes('voice input'));
    const promptButton = buttons.find((button) => (button.textContent || '').trim() === 'How do I build wealth without greed?');

    if (!(askButton instanceof HTMLButtonElement) || !(micButton instanceof HTMLButtonElement)) {
      return {
        markerVisible,
        inlineActions: false,
        canTriggerPrompt: false,
        deadRight: null,
      };
    }

    const askRect = askButton.getBoundingClientRect();
    const micRect = micButton.getBoundingClientRect();
    const rowRect = askButton.parentElement?.getBoundingClientRect() || null;
    const inlineActions = Math.abs(Math.round(askRect.y - micRect.y)) <= 2;
    const deadRight = rowRect ? Math.max(0, Math.round(rowRect.right - askRect.right)) : null;

    return {
      markerVisible,
      inlineActions,
      canTriggerPrompt: textarea instanceof HTMLTextAreaElement && promptButton instanceof HTMLButtonElement,
      deadRight,
    };
  }, markers.Home);

  if (initial.canTriggerPrompt) {
    await page.evaluate(() => {
      const scope = document.querySelector('#companion-ask form') || document;
      const promptButton = Array.from(scope.querySelectorAll('button')).find((button) => (button.textContent || '').trim() === 'How do I build wealth without greed?');
      if (promptButton instanceof HTMLButtonElement) {
        promptButton.click();
      }
    });
    await page.waitForTimeout(180);
  }

  const promptPopulated = await page.evaluate(() => {
    const textarea = document.querySelector('#companion-question-input');
    return textarea instanceof HTMLTextAreaElement && textarea.value.trim().length > 0;
  });

  const rowTight = !mobile || (initial.deadRight ?? 0) <= 4;

  return {
    ...initial,
    promptPopulated,
    pass: initial.markerVisible && initial.inlineActions && promptPopulated && rowTight,
  };
}

async function checkAccount(page, mobile) {
  await clickTab(page, 'Account', mobile);
  let initial = { markerVisible: false, canToggle: false, before: '' };
  for (let attempt = 0; attempt < 10; attempt += 1) {
    initial = await page.evaluate((marker) => {
      const markerVisible = document.body.innerText.includes(marker);
      const profileButton = Array.from(document.querySelectorAll('button')).find((button) => {
        const text = (button.textContent || '').toLowerCase();
        const isAccountProfileDisclosure = text.includes('sign in or continue as guest') || text.includes('signed in as');
        return isAccountProfileDisclosure && (text.includes('show details') || text.includes('hide details'));
      });
      return {
        markerVisible,
        canToggle: profileButton instanceof HTMLButtonElement,
        before: profileButton instanceof HTMLButtonElement ? profileButton.textContent || '' : '',
      };
    }, markers.Account);
    if (initial.markerVisible && initial.canToggle) {
      break;
    }
    await page.waitForTimeout(140);
  }

  if (!initial.canToggle) {
    return {
      markerVisible: initial.markerVisible,
      extraPass: false,
      pass: false,
    };
  }

  await page.evaluate(() => {
    const profileButton = Array.from(document.querySelectorAll('button')).find((button) => {
      const text = (button.textContent || '').toLowerCase();
      const isAccountProfileDisclosure = text.includes('sign in or continue as guest') || text.includes('signed in as');
      return isAccountProfileDisclosure && (text.includes('show details') || text.includes('hide details'));
    });
    if (profileButton instanceof HTMLButtonElement) {
      profileButton.click();
    }
  });

  let after = '';
  let expandedContentVisible = false;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    ({ after, expandedContentVisible } = await page.evaluate(() => {
      const profileButton = Array.from(document.querySelectorAll('button')).find((button) => {
        const text = (button.textContent || '').toLowerCase();
        const isAccountProfileDisclosure = text.includes('sign in or continue as guest') || text.includes('signed in as');
        return isAccountProfileDisclosure && (text.includes('show details') || text.includes('hide details'));
      });
      const bodyText = document.body.innerText.toLowerCase();
      return {
        after: profileButton instanceof HTMLButtonElement ? profileButton.textContent || '' : '',
        expandedContentVisible:
          bodyText.includes('continue with google') ||
          bodyText.includes('create your aletheia account') ||
          bodyText.includes('guest mode is active') ||
          bodyText.includes('i already have an account') ||
          bodyText.includes('guest only') ||
          bodyText.includes('sign out') ||
          bodyText.includes('avatar studio'),
      };
    }));
    if (after && after !== initial.before && expandedContentVisible) {
      break;
    }
    await page.waitForTimeout(120);
  }

  return {
    markerVisible: initial.markerVisible,
    extraPass: initial.before !== after && expandedContentVisible,
    pass: initial.markerVisible && initial.before !== after && expandedContentVisible,
  };
}

async function checkSimpleMarker(page, tabName, mobile, extraCheck) {
  if (extraCheck === 'account') {
    return checkAccount(page, mobile);
  }

  await clickTab(page, tabName, mobile);
  let result = { markerVisible: false, extraPass: false };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    result = await page.evaluate(({ marker, extraCheck }) => {
      const markerVisible = document.body.innerText.includes(marker);
      let extraPass = true;

      if (extraCheck === 'decision') {
        extraPass = Boolean(Array.from(document.querySelectorAll('input')).find((input) => (input.getAttribute('placeholder') || '').toLowerCase().includes('decision title')));
      }

      if (extraCheck === 'reflect') {
        extraPass = Boolean(document.querySelector('input[placeholder="Reflection title"]')) && Boolean(document.querySelector('textarea[placeholder*="What are you noticing"]'));
      }

      if (extraCheck === 'library') {
        extraPass = Boolean(Array.from(document.querySelectorAll('input')).find((input) => (input.getAttribute('placeholder') || '').toLowerCase().includes('search money wisdom')));
      }

      return { markerVisible, extraPass };
    }, { marker: markers[tabName], extraCheck });

    if (result.markerVisible && result.extraPass) {
      break;
    }
    await page.waitForTimeout(120);
  }

  return {
    ...result,
    pass: result.markerVisible && result.extraPass,
  };
}

async function run() {
  let server;
  try {
    if (REQUESTED_BASE_URL) {
      runtimeBaseUrl = REQUESTED_BASE_URL;
    } else if (await canReach('http://localhost:3000')) {
      runtimeBaseUrl = 'http://localhost:3000';
      console.log(info(`Using existing local app at ${runtimeBaseUrl}`));
    } else if (await canReach('http://127.0.0.1:3000')) {
      runtimeBaseUrl = 'http://127.0.0.1:3000';
      console.log(info(`Using existing local app at ${runtimeBaseUrl}`));
    } else {
      runtimeBaseUrl = LOCAL_BASE_URL;
      console.log(info(`Starting local dev server at ${runtimeBaseUrl}`));
      server = startServer();
      try {
        await waitForServer(runtimeBaseUrl, SERVER_START_TIMEOUT_MS, server);
      } catch (error) {
        const recentOutput = server.getRecentOutput?.() ?? { stdout: '', stderr: '' };
        throw new Error(`${error.message}\nstdout:\n${recentOutput.stdout || '(empty)'}\nstderr:\n${recentOutput.stderr || '(empty)'}`);
      }
    }

    console.log(info(`Running UI regression against ${runtimeBaseUrl}`));

    const browser = await chromium.launch({ headless: true });
    const results = [];

    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.mobile,
        hasTouch: viewport.touch,
        colorScheme: 'dark',
      });
      const page = await context.newPage();
      const pageErrors = [];
      const consoleErrors = [];

      page.on('pageerror', (error) => pageErrors.push(String(error)));
      page.on('console', (message) => {
        if (message.type() !== 'error') {
          return;
        }

        const text = message.text();
        if (text.includes('429 (Too Many Requests)')) {
          return;
        }

        consoleErrors.push(text);
      });

      await preparePage(page);

      const globalLayout = await checkGlobalLayout(page);
      const tapTargets = await checkTapTargets(page, viewport.touch);
      const home = await checkHome(page, viewport.mobile);
      const decision = await checkSimpleMarker(page, viewport.tabs.includes('Decisions') ? 'Decisions' : 'Decide', viewport.mobile, 'decision');
      const reflect = await checkSimpleMarker(page, 'Reflect', viewport.mobile, 'reflect');
      const library = await checkSimpleMarker(page, 'Library', viewport.mobile, 'library');
      const account = await checkSimpleMarker(page, 'Account', viewport.mobile, 'account');

      results.push({
        viewport: viewport.name,
        globalLayout,
        home,
        decision,
        reflect,
        library,
        account,
        tapTargets,
        pageErrors,
        consoleErrors,
      });

      await context.close();
    }

    await browser.close();

    let hasFailure = false;
    for (const result of results) {
      const failures = [];
      if (result.globalLayout.overflowX > 0 || result.globalLayout.overlap > 0) {
        failures.push(`layout overflow=${result.globalLayout.overflowX} overlap=${result.globalLayout.overlap}`);
      }
      for (const [name, check] of Object.entries({ home: result.home, decision: result.decision, reflect: result.reflect, library: result.library, account: result.account })) {
        if (!check.pass) {
          failures.push(`${name} regression`);
        }
      }
      if (result.tapTargets.length) {
        failures.push(`tap targets <44px: ${result.tapTargets.length}`);
      }
      if (result.pageErrors.length) {
        failures.push(`page errors: ${result.pageErrors.length}`);
      }
      if (result.consoleErrors.length) {
        failures.push(`console errors: ${result.consoleErrors.length}`);
      }

      if (failures.length) {
        hasFailure = true;
        console.log(bad(`FAIL ${result.viewport}`));
        for (const failure of failures) {
          console.log(`  - ${failure}`);
        }
        if (result.tapTargets.length) {
          for (const violation of result.tapTargets.slice(0, 5)) {
            console.log(`    * ${violation.label || 'unlabeled'} (${violation.width}x${violation.height})`);
          }
        }
      } else {
        console.log(ok(`PASS ${result.viewport}`));
      }
    }

    if (hasFailure) {
      process.exitCode = 1;
    } else {
      console.log(ok('All UI regression checks passed.'));
    }
  } finally {
    if (server && !server.killed) {
      server.kill('SIGTERM');
    }
  }
}

run().catch((error) => {
  console.error(bad(`UI regression failed: ${error.message}`));
  if (/browserType\.launch/.test(String(error)) || /Executable doesn't exist/.test(String(error))) {
    console.error(warn('Playwright browser binaries are missing. Run: npx playwright install chromium'));
  }
  process.exitCode = 1;
});