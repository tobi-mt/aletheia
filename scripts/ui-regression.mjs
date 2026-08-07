#!/usr/bin/env node

import os from 'node:os';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
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
  Decide: 'Name the decision under pressure',
  Decisions: 'Name the decision under pressure',
  Reflect: 'Reflection Journal',
  Library: 'Search one wisdom theme',
  Account: 'Sign in or continue as guest',
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
  const decisionTab = viewport.tabs.includes('Decisions') ? 'Decisions' : 'Decide';
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
  const askSubtabFound = await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button')).find((candidate) => {
      const text = (candidate.textContent || '').replace(/\s+/g, ' ').trim();
      const rect = candidate.getBoundingClientRect();
      return text === 'Ask Aletheia' && rect.width > 0 && rect.height > 0;
    });
    if (button instanceof HTMLButtonElement) {
      button.click();
      return true;
    }
    return false;
  });
  if (askSubtabFound) {
    await page.waitForTimeout(220);
  }
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
    askSubtabFound,
    promptPopulated,
    pass: askSubtabFound && initial.markerVisible && initial.inlineActions && promptPopulated && rowTight,
  };
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
    const quickRead = await verifyModalChrome(page, {
      openLocator: page.getByRole('button', { name: /^Scripture/i }).first(),
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
    const history = await verifyModalChrome(page, {
      openLocator: page.locator('div[aria-label="Conversation history"] button').first(),
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
  let initial = { markerVisible: false, canToggle: false, before: '' };
  for (let attempt = 0; attempt < 10; attempt += 1) {
    initial = await page.evaluate((marker) => {
      const markerVisible = document.body.innerText.toLowerCase().includes(marker.toLowerCase());
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

  let afterFirst = '';
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

  for (let attempt = 0; attempt < 8; attempt += 1) {
    ({ after: afterFirst } = await page.evaluate(() => {
      const profileButton = Array.from(document.querySelectorAll('button')).find((button) => {
        const text = (button.textContent || '').toLowerCase();
        const isAccountProfileDisclosure = text.includes('sign in or continue as guest') || text.includes('signed in as');
        return isAccountProfileDisclosure && (text.includes('show details') || text.includes('hide details'));
      });
      return {
        after: profileButton instanceof HTMLButtonElement ? profileButton.textContent || '' : '',
      };
    }));
    if (afterFirst && afterFirst !== initial.before) {
      break;
    }
    await page.waitForTimeout(120);
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

  let afterSecond = '';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    ({ after: afterSecond } = await page.evaluate(() => {
      const profileButton = Array.from(document.querySelectorAll('button')).find((button) => {
        const text = (button.textContent || '').toLowerCase();
        const isAccountProfileDisclosure = text.includes('sign in or continue as guest') || text.includes('signed in as');
        return isAccountProfileDisclosure && (text.includes('show details') || text.includes('hide details'));
      });
      return {
        after: profileButton instanceof HTMLButtonElement ? profileButton.textContent || '' : '',
      };
    }));
    if (afterSecond && afterSecond === initial.before) {
      break;
    }
    await page.waitForTimeout(120);
  }

  return {
    markerVisible: initial.markerVisible,
    extraPass: initial.before !== afterFirst && afterSecond === initial.before,
    pass: initial.markerVisible && initial.before !== afterFirst && afterSecond === initial.before,
  };
}

async function checkSimpleMarker(page, tabName, mobile, extraCheck) {
  if (extraCheck === 'account') {
    return checkAccount(page, mobile);
  }

  await clickTab(page, tabName, mobile);
  if (extraCheck === 'reflect') {
    await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button')).find((candidate) => {
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
    const results = [];

    for (const viewport of viewports) {
      for (const colorScheme of colorSchemes) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.mobile,
        hasTouch: viewport.touch,
        colorScheme,
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
        home,
        modalChrome,
        decision,
        reflect,
        library,
        account,
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
      if (result.modalChrome.failures.length) {
        failures.push(...result.modalChrome.failures.slice(0, 6));
      }
      for (const [name, check] of Object.entries({ home: result.home, decision: result.decision, reflect: result.reflect, library: result.library, account: result.account })) {
        if (!check.pass) {
          failures.push(`${name} regression`);
        }
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
  console.error(bad(`UI regression failed: ${error.message}`));
  if (/browserType\.launch/.test(String(error)) || /Executable doesn't exist/.test(String(error))) {
    console.error(warn('Playwright browser binaries are missing. Run: npx playwright install chromium'));
  }
  process.exitCode = 1;
});
