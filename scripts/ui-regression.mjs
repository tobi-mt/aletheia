#!/usr/bin/env node

import os from 'node:os';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import journeyFixtures from '../tests/fixtures/product-journeys.json' with { type: 'json' };
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');
const nextBinPath = path.join(workspaceRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

const LOCAL_PORT = Number(process.env.UI_REGRESSION_PORT || 3101);
const HAS_EXPLICIT_LOCAL_PORT = Boolean(process.env.UI_REGRESSION_PORT);
const REQUESTED_BASE_URL = process.env.UI_REGRESSION_BASE_URL || null;
const LOCAL_BASE_URL = `http://localhost:${LOCAL_PORT}`;
const SERVER_START_TIMEOUT_MS = 90_000;
const RUN_EXPANDED_MATRIX = process.env.UI_REGRESSION_EXPANDED === '1';
const RUN_NAV_STRESS = process.env.UI_REGRESSION_NAV_STRESS === '1' || RUN_EXPANDED_MATRIX;
const CONTRAST_ONLY = process.env.UI_REGRESSION_CONTRAST_ONLY === '1';
const ENDURANCE_LOOPS = Math.max(1, Number(process.env.UI_REGRESSION_ENDURANCE_LOOPS || '1'));
const REQUESTED_SCHEMES = (process.env.UI_REGRESSION_SCHEMES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
let runtimeBaseUrl = REQUESTED_BASE_URL || LOCAL_BASE_URL;

const baseViewports = [
  { name: 'iPhone SE', width: 375, height: 667, mobile: true, touch: true, tabs: ['Home', 'Decide', 'Reflect', 'Library', 'Account'] },
  { name: 'iPhone 14 Pro', width: 393, height: 852, mobile: true, touch: true, tabs: ['Home', 'Decide', 'Reflect', 'Library', 'Account'] },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932, mobile: true, touch: true, tabs: ['Home', 'Decide', 'Reflect', 'Library', 'Account'] },
  { name: 'Pixel 7', width: 412, height: 915, mobile: true, touch: true, tabs: ['Home', 'Decide', 'Reflect', 'Library', 'Account'] },
  { name: 'iPad Mini', width: 768, height: 1024, mobile: false, touch: true, tabs: ['Home', 'Decisions', 'Reflect', 'Library', 'Account'] },
  { name: 'Desktop 1440', width: 1440, height: 900, mobile: false, touch: false, tabs: ['Home', 'Decisions', 'Reflect', 'Library', 'Account'] },
  { name: 'iPhone 14 Pro landscape', width: 852, height: 393, mobile: false, touch: true, tabs: ['Home', 'Decisions', 'Reflect', 'Library', 'Account'] },
];

const expandedViewports = [
  { name: 'Compact 320', width: 320, height: 568, mobile: true, touch: true, tabs: ['Home', 'Decide', 'Reflect', 'Library', 'Account'] },
  { name: 'Galaxy S8', width: 360, height: 740, mobile: true, touch: true, tabs: ['Home', 'Decide', 'Reflect', 'Library', 'Account'] },
  { name: 'iPad Mini landscape', width: 1024, height: 768, mobile: false, touch: true, tabs: ['Home', 'Decisions', 'Reflect', 'Library', 'Account'] },
  { name: 'Desktop 1280', width: 1280, height: 800, mobile: false, touch: false, tabs: ['Home', 'Decisions', 'Reflect', 'Library', 'Account'] },
  { name: 'Desktop 1920', width: 1920, height: 1080, mobile: false, touch: false, tabs: ['Home', 'Decisions', 'Reflect', 'Library', 'Account'] },
];

const viewports = RUN_EXPANDED_MATRIX ? [...baseViewports, ...expandedViewports] : baseViewports;
const colorSchemes = REQUESTED_SCHEMES.length
  ? REQUESTED_SCHEMES
  : RUN_EXPANDED_MATRIX
    ? ['dark', 'light']
    : ['dark'];

const markers = {
  Home: 'Ask Aletheia',
  Decide: journeyFixtures.decisionCounsel.marker,
  Decisions: journeyFixtures.decisionCounsel.marker,
  Reflect: 'Reflection Journal',
  Library: 'Search one wisdom theme',
  Account: 'Privacy & data',
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
  const acceptedLabels = tabName === 'Decide'
    ? ['Decide', 'Decisions']
    : tabName === 'Decisions'
      ? ['Decisions', 'Decide']
      : [tabName];
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
    if (acceptedLabels.some((label) => labels.includes(label))) {
      found = true;
      break;
    }
    await page.waitForTimeout(500);
  }

  if (!found) {
    throw new Error(`Unable to find tab label ${tabName}. Visible buttons: ${labels.join(' | ')}`);
  }

  let clicked = false;
  for (let attempt = 0; attempt < 10 && !clicked; attempt += 1) {
    clicked = await page.evaluate(({ acceptedLabels, mobile }) => {
      const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
      const buttons = Array.from(document.querySelectorAll('button'));
      const visibleMatches = buttons.filter((button) => {
        const text = normalize(button.textContent);
        if (!acceptedLabels.includes(text)) {
          return false;
        }
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      const zonedMatches = visibleMatches.filter((button) => {
        const rect = button.getBoundingClientRect();
        return mobile ? rect.top >= window.innerHeight * 0.65 : rect.top <= 160;
      });

      const target = zonedMatches[zonedMatches.length - 1] || visibleMatches[visibleMatches.length - 1];
      if (!target) {
        return false;
      }
      target.click();
      return true;
    }, { acceptedLabels, mobile });
    if (!clicked) {
      await page.waitForTimeout(120);
    }
  }
  if (!clicked) {
    throw new Error(`Unable to find tab: ${tabName}`);
  }
  await page.waitForTimeout(260);
}

async function preparePage(page) {
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem('aletheia_ui_regression_prepared')) return;
    const raw = window.localStorage.getItem('aletheia_preferences');
    const preferences = raw ? JSON.parse(raw) : {};
    preferences.language = preferences.language || 'en';
    preferences.region = preferences.region || 'US';
    preferences.bibleTranslation = preferences.bibleTranslation || 'WEB';
    preferences.voiceEnabled = true;
    window.localStorage.setItem('aletheia_preferences', JSON.stringify(preferences));
    window.localStorage.setItem('aletheia_third_party_ai_declined', 'yes');
    window.sessionStorage.setItem('aletheia_ui_regression_prepared', 'yes');
  });
  await page.goto(runtimeBaseUrl, { waitUntil: 'load' });
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
    const firstHeading = Array.from(document.querySelectorAll('.app-main-content :is(h1, h2, h3)'))
      .map((heading) => {
        const rect = heading.getBoundingClientRect();
        return { top: rect.top, visible: rect.height > 0 && rect.bottom > 0 };
      })
      .filter((item) => item.visible)
      .sort((left, right) => left.top - right.top)[0] || null;
    const overlap = window.scrollY <= 1 && nav && firstHeading ? Math.max(0, Math.round(nav.getBoundingClientRect().bottom - firstHeading.top)) : 0;
    return { overflowX, overlap };
  });
}

async function checkAccessibilitySemantics(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const hasName = (element) => Boolean(
      element.getAttribute('aria-label')?.trim()
      || element.getAttribute('aria-labelledby')?.trim()
      || element.textContent?.trim()
      || (element instanceof HTMLInputElement && element.value.trim())
    );
    const ids = Array.from(document.querySelectorAll('[id]')).map((element) => element.id).filter(Boolean);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const unnamedControls = Array.from(document.querySelectorAll('button, a[href], input:not([type="hidden"]), textarea, select'))
      .filter(visible)
      .filter((element) => !hasName(element))
      .slice(0, 10)
      .map((element) => element.tagName.toLowerCase());
    const unlabelledDialogs = Array.from(document.querySelectorAll('[role="dialog"]'))
      .filter(visible)
      .filter((element) => !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby'))
      .length;

    return {
      mainCount: document.querySelectorAll('main').length,
      headingCount: document.querySelectorAll('h1, h2, h3').length,
      duplicateIds,
      unnamedControls,
      unlabelledDialogs,
      documentLanguage: document.documentElement.lang,
      documentDirection: document.documentElement.dir,
    };
  });
}

async function checkPrimaryInputStress(page) {
  return page.evaluate(() => {
    const textarea = document.querySelector('#companion-question-input');
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return { hasTextarea: false, grewToExpectedLines: false };
    }

    const original = textarea.value;
    const beforeHeight = textarea.getBoundingClientRect().height;
    textarea.value = 'This is a long regression stress prompt. '.repeat(40);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    const afterHeight = textarea.getBoundingClientRect().height;
    textarea.value = original;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));

    return {
      hasTextarea: true,
      grewToExpectedLines: Math.round(afterHeight) >= Math.round(beforeHeight),
    };
  });
}

function tabStressSequences(viewport) {
  const decisionTab = viewport.tabs.includes(journeyFixtures.decisionCounsel.entryTab)
    ? journeyFixtures.decisionCounsel.entryTab
    : journeyFixtures.decisionCounsel.legacyEntryTab;
  const ordered = ['Home', decisionTab, 'Reflect', 'Library', 'Account'];
  const reverse = [...ordered].reverse();
  const bounce = ['Home', decisionTab, 'Home', 'Reflect', 'Library', 'Account', 'Home'];
  return [ordered, reverse, bounce];
}

async function verifyTabMarker(page, tabName) {
  const marker = markers[tabName];
  if (!marker) {
    return true;
  }
  return page.evaluate((needle) => document.body.innerText.includes(needle), marker);
}

async function runNavigationFlowStress(page, viewport) {
  const failures = [];
  for (const sequence of tabStressSequences(viewport)) {
    for (const tab of sequence) {
      try {
        await clickTab(page, tab, viewport.mobile);
      } catch (error) {
        failures.push(`tab stress click failed for ${tab}: ${error.message}`);
        continue;
      }
      const markerVisible = await verifyTabMarker(page, tab);
      if (!markerVisible) {
        failures.push(`tab stress marker missing after ${tab}`);
      }
      const { overflowX, overlap } = await checkGlobalLayout(page);
      if (overflowX || overlap) failures.push(`${tab}: overflow=${overflowX}px, header overlap=${overlap}px`);
    }
  }
  return failures;
}

async function runExpandableToggleStress(page) {
  // Get list of expandable controls with their initial states
  const controls = await page.evaluate(() => {
    const visibilityCheck = (node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };

    const expandedButtons = Array.from(document.querySelectorAll('button[aria-expanded]')).filter(visibilityCheck).slice(0, 6);
    const summaryControls = Array.from(document.querySelectorAll('details > summary')).filter(visibilityCheck).slice(0, 6);

    return {
      buttonCount: expandedButtons.length,
      summaryCount: summaryControls.length,
      buttons: expandedButtons.map((btn, idx) => ({
        type: 'button',
        index: idx,
        selector: `button[aria-expanded]:nth-of-type(${idx + 1})`,
      })),
      summaries: summaryControls.map((summary, idx) => ({
        type: 'summary',
        index: idx,
        selector: `details > summary:nth-of-type(${idx + 1})`,
      })),
    };
  });

  let exercised = 0;
  let failed = 0;

  // Test buttons with aria-expanded using Playwright's click (respects React events)
  for (let i = 0; i < controls.buttons.length; i += 1) {
    try {
      const before = await page.getAttribute(`button[aria-expanded]`, 'aria-expanded');
      await page.locator(`button[aria-expanded]`).first().click();
      await page.waitForTimeout(50);
      const mid = await page.getAttribute(`button[aria-expanded]`, 'aria-expanded');
      await page.locator(`button[aria-expanded]`).first().click();
      await page.waitForTimeout(50);
      const after = await page.getAttribute(`button[aria-expanded]`, 'aria-expanded');

      exercised += 1;
      if (before === mid || before !== after) {
        failed += 1;
      }
    } catch {
      // Control may have disappeared or become hidden
    }
  }

  // Test details/summary (native HTML, no React event issues)
  for (const summary of controls.summaries) {
    try {
      const before = await page.evaluate((sel) => {
        const elem = document.querySelector(sel);
        return elem?.parentElement instanceof HTMLDetailsElement ? String(elem.parentElement.open) : null;
      }, summary.selector);

      await page.locator(summary.selector).click();
      await page.waitForTimeout(50);

      const mid = await page.evaluate((sel) => {
        const elem = document.querySelector(sel);
        return elem?.parentElement instanceof HTMLDetailsElement ? String(elem.parentElement.open) : null;
      }, summary.selector);

      await page.locator(summary.selector).click();
      await page.waitForTimeout(50);

      const after = await page.evaluate((sel) => {
        const elem = document.querySelector(sel);
        return elem?.parentElement instanceof HTMLDetailsElement ? String(elem.parentElement.open) : null;
      }, summary.selector);

      exercised += 1;
      if (before === mid || before !== after) {
        failed += 1;
      }
    } catch {
      // Control may have disappeared or become hidden
    }
  }

  return {
    found: controls.buttons.length + controls.summaries.length,
    exercised,
    failed,
  };
}

async function runNavigationEndurance(page, viewport, loops) {
  const loopResults = [];

  for (let loop = 0; loop < loops; loop += 1) {
    const navFailures = await runNavigationFlowStress(page, viewport);
    const expandableStress = await runExpandableToggleStress(page);
    const loopFailures = [...navFailures];

    if (expandableStress.found > 0 && expandableStress.failed > 0) {
      loopFailures.push(`expandable toggle stress failed: ${expandableStress.failed}/${expandableStress.exercised}`);
    }

    loopResults.push({
      loop: loop + 1,
      failures: loopFailures,
      expandableStress,
    });
  }

  const failedLoops = loopResults.filter((result) => result.failures.length > 0).length;
  const flakyLoops = failedLoops > 0 && failedLoops < loops ? failedLoops : 0;

  return {
    loops,
    failedLoops,
    flakyLoops,
    loopResults,
  };
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
  const askTab = page.getByRole('tab', { name: 'Ask Aletheia', exact: true });
  if (await askTab.count() === 1) {
    await askTab.click();
    await page.waitForTimeout(120);
  }
  const askSurfaceFound = await page.locator('#companion-ask').count() === 1;
  const initial = await page.evaluate((marker) => {
    const markerVisible = document.body.innerText.includes(marker);
    const scope = document.querySelector('#companion-ask form') || document;
    const textarea = document.querySelector('#companion-question-input');
    const buttons = Array.from(scope.querySelectorAll('button'));
    const askButton = buttons.find((button) => (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase() === 'ask');
    const micButton = buttons.find((button) => {
      const aria = (button.getAttribute('aria-label') || '').toLowerCase();
      const text = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return aria.includes('voice input') || aria.includes('dictation') || text.includes('dictation');
    });
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
    askSurfaceFound,
    promptPopulated,
    pass: askSurfaceFound && initial.markerVisible && initial.inlineActions && promptPopulated && rowTight,
  };
}

async function checkFeatureDiscovery(page, mobile) {
  const failures = [];
  const imageHasLoaded = async (image, expectedSource = null) => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const loaded = await image.evaluate((element, source) => {
        if (!(element instanceof HTMLImageElement) || !element.complete || element.naturalWidth <= 0) {
          return false;
        }
        if (!source) return true;
        const resolvedSource = decodeURIComponent(element.currentSrc || element.src || '');
        return resolvedSource.includes(source);
      }, expectedSource).catch(() => false);
      if (loaded) return true;
      await page.waitForTimeout(100);
    }
    return false;
  };
  const openWorkspace = async (label) => {
    const tab = page.getByRole('tab', { name: label, exact: true });
    if (await tab.count() !== 1) {
      failures.push(`workspace destination missing: ${label}`);
      return false;
    }
    await tab.click();
    const panel = page.locator(`[id="${await tab.getAttribute('aria-controls')}"]`);
    if (await tab.getAttribute('aria-selected') !== 'true' || !await panel.isVisible()
        || await panel.getAttribute('aria-labelledby') !== await tab.getAttribute('id')) {
      failures.push(`workspace destination did not activate: ${label}`);
      return false;
    }
    return true;
  };
  const checkWorkspaceNavigation = async () => {
    const tabs = page.locator('button[role="tab"][aria-controls$="-workspace-panel"]');
    const clipped = await tabs.evaluateAll((buttons) => buttons.filter((button) => {
      const bounds = button.getBoundingClientRect();
      return bounds.left < 0 || bounds.right > innerWidth || bounds.height < 44 || button.scrollWidth > button.clientWidth;
    }).map((button) => button.textContent.trim()));
    if (clipped.length) failures.push(`workspace tabs clipped or too small: ${clipped.join(', ')}`);
  };

  await clickTab(page, 'Home', mobile);
  await checkWorkspaceNavigation();
  await openWorkspace('Today');
  if (await openWorkspace('Ask Aletheia')) {
    const composer = await page.getByTestId('ask-question-composer').boundingBox();
    if (!composer || composer.height < 144) {
      failures.push(`Ask question composer height below 144px: ${composer?.height ?? 'not visible'}`);
    }
  }

  await clickTab(page, mobile ? 'Decide' : 'Decisions', mobile);
  await checkWorkspaceNavigation();
  for (const label of ['Decisions', 'Counsel Circle', 'Rhythm']) await openWorkspace(label);

  await clickTab(page, 'Reflect', mobile);
  await checkWorkspaceNavigation();
  await openWorkspace('Gratitude Lens');
  await openWorkspace('Formation');
  if (await openWorkspace('Reflection Journal') && !await page.locator('#reflect-journal').isVisible()) {
    failures.push('reflection journal destination is not visible');
  }

  await clickTab(page, 'Library', mobile);
  await checkWorkspaceNavigation();
  if (await openWorkspace('Explore')) {
    const tabs = page.getByRole('tablist', { name: 'Library sections' });
    for (const [key, destination] of [
      ['ArrowRight', 'Bible'], ['End', 'Formation'], ['ArrowRight', 'Explore'],
      ['ArrowLeft', 'Formation'], ['Home', 'Explore'],
    ]) {
      await page.keyboard.press(key);
      const active = tabs.getByRole('tab', { name: destination, exact: true, selected: true });
      if (await active.count() !== 1 || !await active.evaluate((tab) => tab === document.activeElement)
          || !await page.getByRole('tabpanel', { name: destination, exact: true }).isVisible()) {
        failures.push(`workspace keyboard navigation did not activate and focus ${destination} with ${key}`);
      }
    }
  }
  const exploreVisualLoaded = await imageHasLoaded(page.locator('[aria-label="Wisdom Library"] article img').first());
  if (!exploreVisualLoaded) failures.push('library Explore visual did not load');

  if (await openWorkspace('Bible')) {
    const bible = page.getByRole('tabpanel', { name: 'Bible', exact: true });
    const search = bible.getByRole('textbox', { name: 'Search books…', exact: true });
    const chapterUrl = (url) => url.pathname === '/api/bible'
      && url.searchParams.get('book') === 'Genesis' && url.searchParams.get('chapter') === '1';
    await page.route(chapterUrl, (route) => route.fulfill({
      json: { book: 'Genesis', chapter: 1, translation: 'WEB', verses: [{ verse: 1, text: 'In the beginning, God created the heavens and the earth.' }] },
    }));
    try {
      await search.fill('Genesis');
      await search.blur();
      await bible.getByRole('button', { name: 'Genesis', exact: true }).click();
      const verse = bible.locator('#verse-1');
      await verse.waitFor({ timeout: 5000 });
      const fontSize = await verse.locator('p').evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
      if (fontSize < 17) failures.push(`Bible verse text below 17px: ${fontSize}`);
      const highlights = verse.getByRole('group', { name: 'Highlight', exact: true }).getByRole('button');
      const sizes = await highlights.evaluateAll((buttons) => buttons.map((button) => {
        const { width, height } = button.getBoundingClientRect();
        return Math.min(width, height);
      }));
      if (sizes.length !== 4 || sizes.some((size) => size < 44)) failures.push('Bible highlight controls unavailable or smaller than 44px');
      await highlights.first().click();
      if (await highlights.first().getAttribute('aria-pressed') !== 'true') failures.push('Bible highlight selection was not announced');
    } catch (error) {
      failures.push(`Bible reader check failed: ${error.message.split('\n')[0]} (${(await bible.innerText().catch(() => '')).slice(0, 240)})`);
    } finally {
      await page.unroute(chapterUrl);
    }
  }
  await openWorkspace('Formation');

  if (await openWorkspace('Listening')) {
    const listenTrigger = page.getByRole('button', { name: /Listen for Scripture Recognize a verse/i });
    await listenTrigger.waitFor({ state: 'visible', timeout: 2500 }).catch(() => undefined);
    if (!await listenTrigger.isVisible()) failures.push('listen-for-scripture action is not visible');
  }
  if (await openWorkspace('Saved')) {
    if (!await page.getByRole('heading', { name: 'Saved', exact: true }).isVisible()) {
      failures.push('saved-scripture empty state is not visible');
    }
    const savedEmptyVisualLoaded = await imageHasLoaded(page.locator('img[src*="saved-scripture-first-use"]').first());
    if (!savedEmptyVisualLoaded) failures.push('saved-scripture empty-state visual did not load');
  }

  await clickTab(page, 'Account', mobile);
  for (const section of ['appearance', 'language', 'voice', 'focus', 'notifications', 'privacy', 'context', 'support', 'system']) {
    const row = page.locator(`[data-account-destination="${section}"]`);
    await row.click();
    const detail = page.locator(`[data-account-section="${section}"]`);
    if (!await detail.getByRole('heading', { level: 2 }).isVisible()) failures.push(`account destination did not open: ${section}`);
    if (section === 'appearance') {
      if (await detail.getByText('Language settings are ready.', { exact: true }).count()) failures.push('Appearance shows unrelated language status');
      await detail.getByRole('button', { name: 'Classic', exact: true }).click();
      if (await detail.getByRole('status').textContent() !== 'Theme applied automatically.') failures.push('Appearance did not confirm the theme change');
      await detail.getByRole('button', { name: 'System', exact: true }).click();
    }
    if (section === 'language' && await detail.getByText('Theme applied automatically.', { exact: true }).count()) {
      failures.push('Appearance feedback leaked into Language');
    }
    if (section === 'context') {
      const topic = detail.getByRole('combobox', { name: 'Edit current and future context' });
      if (await detail.locator('details, [aria-expanded]').count() || await topic.locator('option').count() !== 9) {
        failures.push('Personal context should have nine directly accessible topics and no expanders');
      }
      const permission = detail.getByRole('checkbox', { name: 'Allow Aletheia to use this context in answers' });
      const moneyUse = detail.getByRole('checkbox', { name: 'Use money context in answers' });
      const savedContext = () => page.evaluate(() => JSON.parse(localStorage.getItem('aletheia_manual_context') || '{}'));
      const controlsFit = await detail.locator('select, textarea, input, button').evaluateAll((controls) => controls.every((control) => {
        const { left, right } = control.getBoundingClientRect();
        return left >= 0 && right <= document.documentElement.clientWidth + 1;
      }));
      if (!controlsFit || !await detail.getByRole('combobox', { name: /^Guidance region/ }).isVisible()) failures.push('Personal context controls do not fit or guidance region is missing');
      await moneyUse.uncheck();
      await permission.uncheck();
      const paused = await savedContext();
      if (!await moneyUse.isDisabled() || paused.useInAnswers !== false || paused.useMoneyInAnswers !== false) failures.push('Personal context privacy choices did not save immediately');
      const dismissNotice = page.getByRole('button', { name: 'Dismiss workflow notice' });
      const safeArea = await page.addStyleTag({ content: ':root { --safe-area-inset-top: 52px; }' });
      try {
        await page.waitForFunction(() => {
          const header = document.querySelector('nav.app-top-nav');
          const notice = document.querySelector('.app-safe-floating-panel[role="status"]');
          return header && notice && notice.getBoundingClientRect().top >= header.getBoundingClientRect().bottom + 4;
        }, undefined, { timeout: 2000 });
      } catch {
        failures.push('Workflow notice overlaps the fixed header after the safe area changes');
      } finally {
        await safeArea.evaluate((style) => style.remove());
      }
      if (await dismissNotice.isVisible()) await dismissNotice.click();
      await permission.check();
      if (await moneyUse.isChecked()) failures.push('Resuming personalization reset a category choice');
      await topic.selectOption('future:posture');
      const goals = detail.getByRole('textbox', { name: 'Future goals', exact: true });
      await goals.fill('Synthetic UI regression goal');
      await topic.selectOption('current:money');
      const income = detail.getByRole('spinbutton', { name: 'Monthly income', exact: true });
      const incomeSlider = detail.getByRole('slider', { name: 'Monthly income', exact: true });
      await income.fill('1200');
      if (await incomeSlider.inputValue() !== '1200') failures.push('Personal context income slider did not reflect direct input');
      await detail.getByRole('button', { name: /^Clear Monthly income$/i }).press('Enter');
      if (await income.inputValue() !== '') failures.push('Personal context numeric input could not be cleared');
      const money = detail.getByRole('textbox', { name: 'Money context', exact: true });
      await money.fill('Draft money note');
      const quick = detail.getByRole('combobox', { name: 'Add one helpful detail', exact: true });
      await quick.selectOption('financeContext');
      const quickInput = detail.locator('form').filter({
        has: page.getByRole('button', { name: 'Add detail', exact: true }),
      }).getByRole('textbox');
      await quickInput.fill('First short note');
      const addDetail = detail.getByRole('button', { name: 'Add detail', exact: true });
      if (mobile) {
        const point = await addDetail.evaluate((button) => {
          const rect = button.getBoundingClientRect();
          window.scrollBy({ top: rect.top + rect.height / 2 - (window.innerHeight - 40), behavior: 'instant' });
          const placed = button.getBoundingClientRect();
          return { x: placed.x + placed.width / 2, y: placed.y + placed.height / 2 };
        });
        await page.mouse.move(point.x, point.y);
        await page.mouse.down();
        const obscured = await addDetail.evaluate((button, { x, y }) => !button.contains(document.elementFromPoint(x, y)), point);
        await page.mouse.up();
        if (obscured) failures.push('Mobile navigation obscured Quick Add between pointerdown and pointerup');
      } else {
        await addDetail.click();
      }
      await quickInput.fill('Second short note');
      await addDetail.click();
      const quickSaved = await savedContext();
      if (quickSaved.financeContext !== 'First short note\nSecond short note' || quickSaved.futureGoals || await money.inputValue() !== 'Draft money note\nFirst short note\nSecond short note') {
        failures.push('Quick Add did not append notes independently of pending editor changes');
      }
      await topic.selectOption('future:posture');
      if (await goals.inputValue() !== 'Synthetic UI regression goal') failures.push('Personal context lost draft edits when switching topics');
      await detail.getByRole('button', { name: 'Save manual context', exact: true }).click();
      const saved = await savedContext();
      if (saved.futureGoals !== 'Synthetic UI regression goal' || saved.financeContext !== 'Draft money note\nFirst short note\nSecond short note') {
        failures.push('Personal context did not save edits across topics');
      }
    }
    if (section === 'focus') {
      const options = detail.getByRole('list').getByRole('button');
      const boxes = await options.evaluateAll((buttons) => buttons.map((button) => {
        const { x, y, right, height } = button.getBoundingClientRect();
        return { x, y, right, height };
      }));
      if (boxes.length < 4 || boxes.some(({ x, y, right, height }, index) => (
        x < 0 || right > page.viewportSize().width || height < 44 || (index > 0 && y <= boxes[index - 1].y)
      ))) {
        failures.push('focus intentions are not a full-width vertical checklist');
      } else {
        for (let index = 0; index < 3; index++) await options.nth(index).click();
        if (await detail.getByRole('button', { pressed: true }).count() !== 3 || !await options.nth(3).isDisabled()) {
          failures.push('focus intentions did not enforce the three-option limit');
        }
        await options.first().click();
        await options.nth(3).click();
        if (await options.first().getAttribute('aria-pressed') !== 'false' || await options.nth(3).getAttribute('aria-pressed') !== 'true') {
          failures.push('focus intentions could not be deselected and replaced');
        }
      }
    }
    await detail.getByRole('button', { name: 'Back to Account' }).click();
    if (!await row.evaluate((element) => element === document.activeElement)) failures.push(`account destination focus was not restored: ${section}`);
  }

  return { pass: failures.length === 0, failures };
}

async function checkResilienceStates(page) {
  const failures = [];
  await page.context().setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.waitForTimeout(80);
  const offlineStatus = page.getByRole('status').filter({ hasText: 'Offline' });
  if (!await offlineStatus.isVisible()) failures.push('offline status is not visible');
  await page.context().setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedMotionApplied = await page.evaluate(() => {
    const control = document.querySelector('.app-shell button');
    if (!(control instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(control);
    const durations = style.transitionDuration.split(',').map((value) => {
      const duration = value.trim();
      return duration.endsWith('ms') ? Number.parseFloat(duration) : Number.parseFloat(duration) * 1000;
    });
    return durations.length > 0 && durations.every((duration) => Number.isFinite(duration) && duration <= 0.011);
  });
  if (!reducedMotionApplied) failures.push('reduced-motion preference is not applied');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  return { pass: failures.length === 0, failures };
}

const modalScreenshotDir = path.join(os.tmpdir(), 'aletheia-modal-chrome');

function boxesOverlap(left, right) {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}

async function captureModalScreenshot(page, fileName) {
  await mkdir(modalScreenshotDir, { recursive: true });
  const screenshotPath = path.join(modalScreenshotDir, fileName.endsWith('.png') ? fileName : `${fileName}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  return screenshotPath;
}

async function verifyModalChrome(page, {
  openLocator,
  closeLabel,
  titleSelector = 'h2',
  screenshotName,
  railSelector = null,
}) {
  await openLocator.evaluate((element) => {
    if (element instanceof HTMLElement) {
      element.click();
    }
  });

  const closeButtons = page.locator(`button[aria-label="${closeLabel}"]`);
  const visibleCloseIndex = await closeButtons.evaluateAll((buttons) => buttons.findIndex((button) => {
    const rect = button.getBoundingClientRect();
    const style = window.getComputedStyle(button);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  }));

  if (visibleCloseIndex < 0) {
    throw new Error(`Unable to find a visible close button for ${screenshotName}`);
  }

  const closeButton = closeButtons.nth(visibleCloseIndex);
  await closeButton.waitFor({ state: 'visible', timeout: 5000 });
  const dialog = closeButton.locator('xpath=ancestor::*[@role="dialog"][1]');
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(150);

  const title = dialog.locator(titleSelector).first();

  const [dialogBox, closeBox, titleBox] = await Promise.all([
    dialog.boundingBox(),
    closeButton.boundingBox(),
    title.boundingBox(),
  ]);

  if (!dialogBox || !closeBox || !titleBox) {
    throw new Error(`Unable to measure modal chrome for ${screenshotName}`);
  }

  const failures = [];
  if (closeBox.x < dialogBox.x || closeBox.y < dialogBox.y) {
    failures.push('close button escaped modal bounds');
  }
  if (closeBox.x + closeBox.width > dialogBox.x + dialogBox.width) {
    failures.push('close button clipped the right edge');
  }
  if (closeBox.y + closeBox.height > dialogBox.y + dialogBox.height) {
    failures.push('close button clipped the bottom edge');
  }
  if (boxesOverlap(closeBox, titleBox)) {
    failures.push('close button overlaps modal title');
  }

  if (railSelector) {
    const rail = dialog.locator(railSelector).first();
    const railBox = await rail.boundingBox().catch(() => null);
    if (railBox && closeBox.y + closeBox.height > railBox.y - 4) {
      failures.push('close button intrudes into the action rail');
    }
  }

  const screenshotPath = await captureModalScreenshot(page, screenshotName);

  await closeButton.click();
  await dialog.waitFor({ state: 'hidden', timeout: 5000 });

  return {
    screenshotPath,
    failures,
  };
}

async function checkScriptureQuickReadChrome(page, viewport, colorScheme) {
  const shouldRun = viewport.mobile && colorScheme === colorSchemes[0] && ['iPhone SE', 'iPhone 14 Pro'].includes(viewport.name);
  if (!shouldRun) {
    return { ran: false, failures: [] };
  }

  const failures = [];

  try {
    await clickTab(page, 'Home', viewport.mobile);
    const scriptureDisclosure = page.getByRole('button', { name: /^Scripture · \d+/i }).first();
    if (await scriptureDisclosure.isVisible().catch(() => false)) {
      await scriptureDisclosure.click();
    }
    const disclosedReference = page.locator('div[aria-label="Scripture"] button').first();
    const openLocator = await disclosedReference.isVisible().catch(() => false)
      ? disclosedReference
      : page.getByRole('button', { name: /^Scripture/i }).first();
    const quickRead = await verifyModalChrome(page, {
      openLocator,
      closeLabel: 'Close scripture quick read',
      titleSelector: 'h2',
      screenshotName: `${viewport.name.replace(/\s+/g, '-').toLowerCase()}-${colorScheme}-scripture-quick-read`,
      railSelector: 'div[aria-label="Scripture quick read"]',
    });
    failures.push(...quickRead.failures);
  } catch (error) {
    failures.push(`scripture quick read modal check failed: ${error.message}`);
    try {
      await page.keyboard.press('Escape');
    } catch {
      // Best effort recovery.
    }
  }

  return {
    ran: true,
    failures,
  };
}

async function checkConversationHistoryChrome(page, viewport, colorScheme) {
  const shouldRun = viewport.mobile && colorScheme === colorSchemes[0] && ['iPhone SE', 'iPhone 14 Pro'].includes(viewport.name);
  if (!shouldRun) {
    return { ran: false, failures: [] };
  }

  const failures = [];

  try {
    const historyButton = page.locator('div[aria-label="Conversation history"] button').first();
    if (await historyButton.count() === 0) {
      const textarea = page.locator('#companion-question-input');
      const askForm = page.locator('#companion-ask form');
      for (const prompt of [
        'How can I make a patient and wise decision?',
        'What should I examine before I act?',
      ]) {
        if (await historyButton.count() > 0) {
          break;
        }
        await textarea.fill(prompt);
        await askForm.evaluate((form) => {
          if (form instanceof HTMLFormElement) {
            form.requestSubmit();
          }
        });
        await page.waitForFunction(() => {
          const textarea = document.querySelector('#companion-question-input');
          return textarea instanceof HTMLTextAreaElement && textarea.value === '';
        }, undefined, { timeout: 5000 });
        await page.waitForFunction(() => {
          const form = document.querySelector('#companion-ask form');
          const askButton = form
            ? Array.from(form.querySelectorAll('button')).find((button) => (button.textContent || '').trim().toLowerCase() === 'ask')
            : null;
          return askButton instanceof HTMLButtonElement && !askButton.disabled;
        }, undefined, { timeout: 60_000 });
      }
      await historyButton.waitFor({ state: 'visible', timeout: 5000 });
    }
    const history = await verifyModalChrome(page, {
      openLocator: historyButton,
      closeLabel: 'Close',
      titleSelector: 'h2',
      screenshotName: `${viewport.name.replace(/\s+/g, '-').toLowerCase()}-${colorScheme}-conversation-history`,
    });
    failures.push(...history.failures);
  } catch (error) {
    failures.push(`conversation history modal check failed: ${error.message}`);
    try {
      await page.keyboard.press('Escape');
    } catch {
      // Best effort recovery.
    }
  }

  return {
    ran: true,
    failures,
  };
}

async function checkAccount(page, mobile) {
  await clickTab(page, 'Account', mobile);
  const overview = page.locator('[data-account-section="overview"]');
  const markerVisible = await overview.getByText(markers.Account, { exact: true }).isVisible();
  const profile = overview.locator('[data-account-destination="profile"]');
  await profile.click();
  const detail = page.locator('[data-account-section="profile"]');
  const signInVisible = await detail.locator('input[type="email"]').isVisible();
  await detail.getByRole('button', { name: 'Back to Account' }).click();
  const extraPass = signInVisible && await profile.evaluate((element) => element === document.activeElement);
  return { markerVisible, extraPass, pass: markerVisible && extraPass };
}

async function checkSimpleMarker(page, tabName, mobile, extraCheck) {
  if (extraCheck === 'account') {
    return checkAccount(page, mobile);
  }

  await clickTab(page, tabName, mobile);
  if (extraCheck === 'reflect') {
    await page.evaluate(() => {
      const journal = document.querySelector('#reflect-journal');
      const button = Array.from((journal || document).querySelectorAll('button')).find((candidate) => {
        const text = (candidate.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const rect = candidate.getBoundingClientRect();
        return text.includes('reflection journal') && rect.width > 0 && rect.height > 0;
      });
      if (button instanceof HTMLButtonElement) {
        button.click();
      }
    });
    await page.waitForTimeout(260);
  }
  let result = { markerVisible: false, extraPass: false };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    result = await page.evaluate(({ marker, extraCheck }) => {
      const markerVisible = document.body.innerText.includes(marker);
      let extraPass = true;

      if (extraCheck === 'decision') {
        extraPass = Boolean(Array.from(document.querySelectorAll('input')).find((input) => (input.getAttribute('placeholder') || '').toLowerCase().includes('decision title')));
      }

      if (extraCheck === 'reflect') {
        const titleInput = document.querySelector('input[placeholder="Reflection title"]');
        const bodyInput = document.querySelector('textarea[placeholder*="What are you noticing"]');
        extraPass = Boolean(titleInput) && Boolean(bodyInput);
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

async function checkThemeContrast(browser) {
  const settings = [
    ...['classic', 'dark', 'black', 'warm', 'ocean', 'forest', 'sunset'].map((theme) => [theme, 'light', theme]),
    ['system', 'light', 'classic'],
    ['system', 'dark', 'dark'],
  ];
  const failures = [];
  for (const [preference, colorScheme, resolved] of settings) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme, reducedMotion: 'reduce', serviceWorkers: 'block' });
    try {
      await context.addInitScript((preference) => {
        window.localStorage.setItem('aletheia_theme_preference', preference);
        window.localStorage.setItem('aletheia_first_run_gate_complete', 'yes');
        window.localStorage.setItem('aletheia_onboarding_complete', 'yes');
        window.localStorage.setItem('aletheia_third_party_ai_declined', 'yes');
      }, preference);
      const page = await context.newPage();
      await page.goto(`${runtimeBaseUrl}/?tab=companion`, { waitUntil: 'load' });
      await page.waitForFunction((theme) => document.documentElement.dataset.theme === theme, resolved);
      await page.getByRole('tab', { name: 'Ask Aletheia', exact: true }).click();
      const check = async (label, locator, minimum, pseudo) => {
        const ratio = await locator.evaluate((element, pseudo) => {
          const pixel = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
          const rgba = (value) => {
            pixel.clearRect(0, 0, 1, 1);
            pixel.fillStyle = value;
            pixel.fillRect(0, 0, 1, 1);
            const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data;
            return [r, g, b, a / 255];
          };
          const over = ([r, g, b, a], bg) => [r, g, b].map((value, i) => value * a + bg[i] * (1 - a));
          const luminance = (color) => color.map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
          const layers = [];
          for (let node = element; node; node = node.parentElement) {
            const background = rgba(getComputedStyle(node).backgroundColor);
            layers.unshift(background);
            if (background[3] === 1) break;
          }
          const bg = layers.reduce((base, layer) => over(layer, base), [255, 255, 255]);
          const style = getComputedStyle(element, pseudo);
          const color = rgba(element instanceof SVGElement ? style.stroke : style.color);
          color[3] *= Number(style.opacity);
          const levels = [luminance(bg), luminance(over(color, bg))].sort((a, b) => b - a);
          return (levels[0] + 0.05) / (levels[1] + 0.05);
        }, pseudo ?? null);
        if (ratio < minimum) failures.push(`${preference}/${colorScheme}: ${label} ${ratio.toFixed(2)}:1 < ${minimum}:1`);
      };
      await check('desktop lens caption', page.locator('aside').getByText('Current lens', { exact: true }), 4.5);
      await check('auto-fit label', page.locator('#companion-ask').getByRole('button', { name: 'Auto-fit', exact: true }), 4.5);
      await check('current lens icon', page.locator('#companion-ask [aria-label^="Current lens:"] svg'), 3);
      await check('question placeholder', page.getByRole('textbox', { name: 'Your question' }), 4.5, '::placeholder');
      await page.setViewportSize({ width: 900, height: 844 });
      const navRail = page.locator('.app-top-nav .editorial-surface');
      await navRail.getByRole('button', { name: 'Account', exact: true }).waitFor();
      const clipped = await navRail.evaluate((rail) => {
        const { left, right } = rail.getBoundingClientRect();
        return Array.from(rail.querySelectorAll('button')).filter((button) => {
          const bounds = button.getBoundingClientRect();
          return bounds.left < Math.max(0, left) || bounds.right > Math.min(innerWidth, right);
        }).map((button) => button.textContent.trim());
      });
      if (clipped.length) failures.push(`${preference}/${colorScheme}: clipped tablet navigation: ${clipped.join(', ')}`);
      await page.setViewportSize({ width: 390, height: 844 });
      await check('current mobile destination', page.locator('.app-bottom-nav').getByRole('button', { name: 'Home', exact: true }), 4.5);
      for (const destination of ['Home', 'Decide', 'Reflect', 'Library']) {
        await clickTab(page, destination, true);
        const tabs = page.locator('button[role="tab"][aria-controls$="-workspace-panel"]');
        await tabs.first().waitFor();
        for (const tab of await tabs.all()) {
          const label = await tab.innerText();
          await check(`${destination} / ${label} label`, tab, 4.5);
          await check(`${destination} / ${label} icon`, tab.locator('svg'), 3);
        }
      }
    } finally {
      await context.close();
    }
  }
  if (failures.length) throw new Error(`Theme contrast regressions:\n${failures.join('\n')}`);
  console.log(ok(`Theme contrast passed for ${settings.length} settings (text 4.5:1; icons 3:1)`));
}

async function checkOnboardingDismissal(browser) {
  const context = await browser.newContext({
    viewport: { width: 320, height: 667 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block',
  });
  try {
    const page = await context.newPage();
    await page.goto(runtimeBaseUrl);
    await page.getByRole('button', { name: 'Continue without account', exact: true }).click();
    const onboarding = page.getByRole('dialog', { name: 'Begin with what matters today' });
    const close = onboarding.getByRole('button', { name: 'Close and continue' });
    const box = await close.boundingBox();
    if (!box || box.width < 44 || box.height < 44) throw new Error('Onboarding close target is smaller than 44px');
    await close.click();
    await onboarding.waitFor({ state: 'hidden' });
    await page.getByTestId('ask-question-composer').waitFor();
  } finally {
    await context.close();
  }
}

async function run() {
  let server;
  try {
    if (REQUESTED_BASE_URL) {
      runtimeBaseUrl = REQUESTED_BASE_URL;
    } else if (!HAS_EXPLICIT_LOCAL_PORT && await canReach('http://localhost:3000')) {
      runtimeBaseUrl = 'http://localhost:3000';
      console.log(info(`Using existing local app at ${runtimeBaseUrl}`));
    } else if (!HAS_EXPLICIT_LOCAL_PORT && await canReach('http://127.0.0.1:3000')) {
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
    if (CONTRAST_ONLY) {
      try {
        await checkThemeContrast(browser);
      } finally {
        await browser.close();
      }
      return;
    }
    try {
      await checkOnboardingDismissal(browser);
    } catch (error) {
      await browser.close();
      throw error;
    }
    const results = [];

    for (const viewport of viewports) {
      for (const colorScheme of colorSchemes) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.mobile,
        hasTouch: viewport.touch,
        colorScheme,
        serviceWorkers: 'block',
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
        if (text.includes('429')) {
          return;
        }

        consoleErrors.push(text);
      });

      await preparePage(page);

      const globalLayout = await checkGlobalLayout(page);
      const accessibility = await checkAccessibilitySemantics(page);
      const tapTargets = await checkTapTargets(page, viewport.touch);
      const quickReadModalChrome = await checkScriptureQuickReadChrome(page, viewport, colorScheme);
      const home = await checkHome(page, viewport.mobile);
      const conversationModalChrome = await checkConversationHistoryChrome(page, viewport, colorScheme);
      const modalChrome = {
        ran: quickReadModalChrome.ran || conversationModalChrome.ran,
        failures: [...quickReadModalChrome.failures, ...conversationModalChrome.failures],
      };
      const decision = await checkSimpleMarker(page, viewport.tabs.includes('Decisions') ? 'Decisions' : 'Decide', viewport.mobile, 'decision');
      const reflect = await checkSimpleMarker(page, 'Reflect', viewport.mobile, 'reflect');
      const library = await checkSimpleMarker(page, 'Library', viewport.mobile, 'library');
      const account = await checkSimpleMarker(page, 'Account', viewport.mobile, 'account');
      const featureDiscovery = await checkFeatureDiscovery(page, viewport.mobile);
      const resilienceStates = await checkResilienceStates(page);
      await clickTab(page, 'Home', viewport.mobile);
      const inputStress = await checkPrimaryInputStress(page);
      const navStressFailures = RUN_NAV_STRESS ? await runNavigationFlowStress(page, viewport) : [];
      const expandableStress = RUN_NAV_STRESS ? await runExpandableToggleStress(page) : null;
      const endurance = RUN_NAV_STRESS && ENDURANCE_LOOPS > 1
        ? await runNavigationEndurance(page, viewport, ENDURANCE_LOOPS)
        : null;

      results.push({
        viewport: viewport.name,
        colorScheme,
        globalLayout,
        accessibility,
        home,
        modalChrome,
        decision,
        reflect,
        library,
        account,
        featureDiscovery,
        resilienceStates,
        inputStress,
        navStressFailures,
        expandableStress,
        endurance,
        tapTargets,
        pageErrors,
        consoleErrors,
      });

      await context.close();
      }
    }

    await browser.close();

    let hasFailure = false;
    for (const result of results) {
      const failures = [];
      if (result.globalLayout.overflowX > 0 || result.globalLayout.overlap > 0) {
        failures.push(`layout overflow=${result.globalLayout.overflowX} overlap=${result.globalLayout.overlap}`);
      }
      if (result.accessibility.mainCount !== 1) {
        failures.push(`accessibility main landmarks=${result.accessibility.mainCount}`);
      }
      if (result.accessibility.headingCount < 1) {
        failures.push('accessibility heading hierarchy missing');
      }
      if (!result.accessibility.documentLanguage) {
        failures.push('document language missing');
      }
      if (!['ltr', 'rtl'].includes(result.accessibility.documentDirection)) {
        failures.push(`document direction invalid: ${result.accessibility.documentDirection || 'empty'}`);
      }
      if (result.accessibility.duplicateIds.length) {
        failures.push(`duplicate ids: ${result.accessibility.duplicateIds.slice(0, 5).join(', ')}`);
      }
      if (result.accessibility.unnamedControls.length) {
        failures.push(`unnamed controls: ${result.accessibility.unnamedControls.join(', ')}`);
      }
      if (result.accessibility.unlabelledDialogs > 0) {
        failures.push(`unlabelled dialogs: ${result.accessibility.unlabelledDialogs}`);
      }
      if (result.modalChrome.failures.length) {
        failures.push(...result.modalChrome.failures.slice(0, 6));
      }
      for (const [name, check] of Object.entries({ home: result.home, decision: result.decision, reflect: result.reflect, library: result.library, account: result.account })) {
        if (!check.pass) {
          failures.push(`${name} regression`);
        }
      }
      if (!result.featureDiscovery.pass) {
        failures.push(...result.featureDiscovery.failures);
      }
      if (!result.resilienceStates.pass) {
        failures.push(...result.resilienceStates.failures);
      }
      if (!result.inputStress.hasTextarea || !result.inputStress.grewToExpectedLines) {
        failures.push('primary input stress behavior regression');
      }
      if (RUN_NAV_STRESS && result.navStressFailures.length) {
        failures.push(...result.navStressFailures.slice(0, 6));
      }
      if (RUN_NAV_STRESS && result.expandableStress && result.expandableStress.found > 0 && result.expandableStress.failed > 0) {
        failures.push(`expandable toggle stress failed: ${result.expandableStress.failed}/${result.expandableStress.exercised}`);
      }
      if (result.endurance && result.endurance.flakyLoops > 0) {
        failures.push(`flaky nav stress loops: ${result.endurance.flakyLoops}/${result.endurance.loops}`);
      }
      if (result.endurance && result.endurance.failedLoops === result.endurance.loops) {
        failures.push(`nav stress endurance failed all loops: ${result.endurance.failedLoops}/${result.endurance.loops}`);
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
        console.log(bad(`FAIL ${result.viewport} · ${result.colorScheme}`));
        for (const failure of failures) {
          console.log(`  - ${failure}`);
        }
        if (result.tapTargets.length) {
          for (const violation of result.tapTargets.slice(0, 5)) {
            console.log(`    * ${violation.label || 'unlabeled'} (${violation.width}x${violation.height})`);
          }
        }
      } else {
        console.log(ok(`PASS ${result.viewport} · ${result.colorScheme}`));
      }
    }

    if (hasFailure) {
      process.exitCode = 1;
    } else {
      console.log(ok(`All UI regression checks passed (${results.length} matrix runs).`));
    }
  } finally {
    if (server && !server.killed) {
      server.kill('SIGTERM');
    }
  }
}

run().catch((error) => {
  console.error(bad(`UI regression failed: ${process.env.UI_REGRESSION_VERBOSE === '1' ? error.stack : error.message}`));
  if (/browserType\.launch/.test(String(error)) || /Executable doesn't exist/.test(String(error))) {
    console.error(warn('Playwright browser binaries are missing. Run: npx playwright install chromium'));
  }
  process.exitCode = 1;
});
