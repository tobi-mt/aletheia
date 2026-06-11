#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');
const nextBinPath = path.join(workspaceRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

const LOCAL_PORT = Number(process.env.UI_I18N_PORT || 3102);
const REQUESTED_BASE_URL = process.env.UI_I18N_BASE_URL || null;
const LOCAL_BASE_URL = `http://localhost:${LOCAL_PORT}`;
const SERVER_START_TIMEOUT_MS = 90_000;
let runtimeBaseUrl = REQUESTED_BASE_URL || LOCAL_BASE_URL;

const untranslatedPattern = /\b(?:labels|notifications|manualContext|supportMission|share|avatar|theme|auth|status|nav)\.[A-Za-z0-9_]+\b/g;

const viewports = [
  { name: 'iPhone 14 Pro', width: 393, height: 852, mobile: true, touch: true },
  { name: 'iPad Mini', width: 768, height: 1024, mobile: false, touch: true },
  { name: 'Desktop 1440', width: 1440, height: 900, mobile: false, touch: false },
];

const languageProfiles = {
  en: { region: 'us', bibleTranslation: 'WEB' },
  es: { region: 'latam', bibleTranslation: 'RV1960' },
  fr: { region: 'eu', bibleTranslation: 'LSG1910' },
  pt: { region: 'br', bibleTranslation: 'AA' },
  de: { region: 'eu', bibleTranslation: 'LUTH1912' },
  yo: { region: 'ng', bibleTranslation: 'YOR1900' },
  ig: { region: 'ng', bibleTranslation: 'IGB1913' },
  ha: { region: 'ng', bibleTranslation: 'HAU1932' },
};

const requestedLanguages = (process.env.UI_I18N_LANGUAGES || Object.keys(languageProfiles).join(','))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function color(code, text) {
  return `${code}${text}\x1b[0m`;
}

const ok = (text) => color('\x1b[32m', text);
const bad = (text) => color('\x1b[31m', text);
const info = (text) => color('\x1b[36m', text);
const warn = (text) => color('\x1b[33m', text);

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
    if (process.env.UI_I18N_VERBOSE === '1') {
      process.stdout.write(chunk.toString());
    }
  });

  child.stderr.on('data', (chunk) => {
    if (process.env.UI_I18N_VERBOSE === '1') {
      process.stderr.write(chunk.toString());
    }
  });

  return child;
}

async function loadLocale(language) {
  const localePath = path.join(workspaceRoot, 'src', 'locales', `${language}.json`);
  const raw = await readFile(localePath, 'utf8');
  return JSON.parse(raw);
}

function tabLabelsFromLocale(locale, mobile) {
  const decisionsLabel = mobile && locale.decideShort ? locale.decideShort : locale.nav?.decisions;
  return [
    locale.nav?.companion,
    decisionsLabel,
    locale.nav?.reflect,
    locale.nav?.library,
    locale.nav?.account,
  ].filter(Boolean);
}

async function preparePage(page, language, profile) {
  await page.goto(runtimeBaseUrl, { waitUntil: 'networkidle' });
  await page.evaluate(({ language, profile }) => {
    const raw = window.localStorage.getItem('aletheia_preferences');
    const preferences = raw ? JSON.parse(raw) : {};
    preferences.language = language;
    preferences.region = profile.region;
    preferences.bibleTranslation = profile.bibleTranslation;
    preferences.voiceEnabled = true;
    window.localStorage.setItem('aletheia_preferences', JSON.stringify(preferences));
  }, { language, profile });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(260);
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="app-launch-splash"]'),
    undefined,
    { timeout: 9000 }
  ).catch(() => undefined);
}

async function clickTab(page, tabName, mobile) {
  let found = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    found = await page.evaluate(({ tabName, mobile }) => {
      const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
      const buttons = Array.from(document.querySelectorAll('button'));
      const visibleMatches = buttons.filter((button) => {
        const text = normalize(button.textContent);
        if (text !== tabName) {
          return false;
        }
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      const zonedMatches = visibleMatches.filter((button) => {
        const rect = button.getBoundingClientRect();
        return mobile ? rect.top >= window.innerHeight * 0.65 : rect.top <= 180;
      });

      const target = zonedMatches[zonedMatches.length - 1] || visibleMatches[visibleMatches.length - 1];
      if (!target) {
        return false;
      }
      target.click();
      return true;
    }, { tabName, mobile });

    if (found) {
      await page.waitForTimeout(220);
      return true;
    }

    await page.waitForTimeout(200);
  }

  return false;
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

async function getUntranslatedTokenLeaks(page) {
  const text = await page.evaluate(() => document.body.innerText || '');
  const matches = text.match(untranslatedPattern) || [];
  return [...new Set(matches)].slice(0, 25);
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
      await waitForServer(runtimeBaseUrl, SERVER_START_TIMEOUT_MS, server);
    }

    const browser = await chromium.launch({ headless: true });
    const allResults = [];

    for (const language of requestedLanguages) {
      const profile = languageProfiles[language];
      if (!profile) {
        allResults.push({
          language,
          viewport: 'N/A',
          failures: [`Unsupported language code: ${language}`],
        });
        continue;
      }
      const locale = await loadLocale(language);

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

        await preparePage(page, language, profile);
        const globalLayout = await checkGlobalLayout(page);
        const tapTargets = await checkTapTargets(page, viewport.touch);

        const labels = tabLabelsFromLocale(locale, viewport.mobile);
        const tabFailures = [];
        for (const label of labels) {
          const clicked = await clickTab(page, label, viewport.mobile);
          if (!clicked) {
            tabFailures.push(`Could not find/click tab: ${label}`);
            continue;
          }
          const leaksAfterTab = await getUntranslatedTokenLeaks(page);
          if (leaksAfterTab.length) {
            tabFailures.push(`Untranslated tokens after tab ${label}: ${leaksAfterTab.join(', ')}`);
            break;
          }
        }

        const finalLeaks = await getUntranslatedTokenLeaks(page);

        const failures = [];
        if (globalLayout.overflowX > 0 || globalLayout.overlap > 0) {
          failures.push(`layout overflow=${globalLayout.overflowX} overlap=${globalLayout.overlap}`);
        }
        if (tapTargets.length) {
          failures.push(`tap targets <44px: ${tapTargets.length}`);
        }
        if (pageErrors.length) {
          failures.push(`page errors: ${pageErrors.length}`);
        }
        if (consoleErrors.length) {
          failures.push(`console errors: ${consoleErrors.length}`);
        }
        if (finalLeaks.length) {
          failures.push(`untranslated token leaks: ${finalLeaks.join(', ')}`);
        }
        failures.push(...tabFailures);

        allResults.push({
          language,
          viewport: viewport.name,
          failures,
          tapTargets,
        });

        await context.close();
      }
    }

    await browser.close();

    let hasFailure = false;
    for (const result of allResults) {
      const prefix = `${result.language.toUpperCase()} · ${result.viewport}`;
      if (result.failures.length) {
        hasFailure = true;
        console.log(bad(`FAIL ${prefix}`));
        for (const failure of result.failures) {
          console.log(`  - ${failure}`);
        }
        if (result.tapTargets?.length) {
          for (const violation of result.tapTargets.slice(0, 5)) {
            console.log(`    * ${violation.label || 'unlabeled'} (${violation.width}x${violation.height})`);
          }
        }
      } else {
        console.log(ok(`PASS ${prefix}`));
      }
    }

    if (hasFailure) {
      process.exitCode = 1;
    } else {
      console.log(ok('All multilingual UI regression checks passed.'));
    }
  } finally {
    if (server && !server.killed) {
      server.kill('SIGTERM');
    }
  }
}

run().catch((error) => {
  console.error(bad(`UI i18n regression failed: ${error.message}`));
  process.exitCode = 1;
});
