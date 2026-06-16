import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = 'http://localhost:3000';
const widths = [375, 390, 430];
const screens = [
  { key: 'home', nav: /^Home$/ },
  { key: 'decisions', nav: /^(Decide|Decisions)$/ },
  { key: 'reflect', nav: /^Reflect$/ },
  { key: 'library', nav: /^Library$/ },
  { key: 'account', nav: /^Account$/ },
];

const phase = process.argv[2] || 'before';
const outDir = path.join('tmp', 'tooltip-qa', phase);
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
const page = await context.newPage();

const report = [];

async function gotoScreen(regex) {
  const btn = page.getByRole('button', { name: regex }).last();
  await btn.click({ force: true });
  await page.waitForTimeout(500);
}

async function dismissOnboardingIfPresent() {
  const onboardingHeading = page.getByRole('heading', { name: /Make Aletheia feel like it knows your context/i }).first();
  if (await onboardingHeading.isVisible().catch(() => false)) {
    const skipButton = page.getByRole('button', { name: /Change later in Account/i }).first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
      return;
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
}

async function expandAccountSections() {
  const personalize = page.getByRole('button', { name: /Personalization|Personalize/i }).first();
  if (await personalize.isVisible().catch(() => false)) {
    await personalize.click({ force: true }).catch(() => {});
    await page.waitForTimeout(200);
  }
  const privacy = page.getByRole('tab', { name: /Privacy/i }).first();
  if (await privacy.isVisible().catch(() => false)) {
    await privacy.click({ force: true }).catch(() => {});
    await page.waitForTimeout(250);
  }
}

for (const width of widths) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await dismissOnboardingIfPresent();

  for (const screen of screens) {
    await gotoScreen(screen.nav);

    if (screen.key === 'account') {
      await expandAccountSections();
    }

    const png = path.join(outDir, `${screen.key}-${width}.png`);
    await page.screenshot({ path: png, fullPage: true });

    const triggers = page.locator('button.info-hint-trigger');
    const count = await triggers.count();

    const checks = [];
    for (let i = 0; i < count; i++) {
      const trg = triggers.nth(i);
      await trg.scrollIntoViewIfNeeded();
      await page.waitForTimeout(80);
      const triggerBox = await trg.boundingBox();
      if (!triggerBox) continue;

      const triggerInViewport =
        triggerBox.x >= 0 &&
        triggerBox.y >= 0 &&
        triggerBox.x + triggerBox.width <= width &&
        triggerBox.y + triggerBox.height <= 900;

      const compactButVisible =
        triggerBox.width >= 10 && triggerBox.width <= 18 && triggerBox.height >= 10 && triggerBox.height <= 18;

      await trg.evaluate((el) => {
        el.click();
      });
      await page.waitForTimeout(120);

      const tip = page.locator('[role="tooltip"]').last();
      const tipBox = await tip.boundingBox();
      const tipVisible = await tip.isVisible().catch(() => false);
      const tipInViewport = Boolean(
        tipBox && tipBox.x >= 0 && tipBox.y >= 0 && tipBox.x + tipBox.width <= width && tipBox.y + tipBox.height <= 900
      );

      const overlapData = await page.evaluate((index) => {
        const triggers = Array.from(document.querySelectorAll('button.info-hint-trigger'));
        const t = triggers[index];
        if (!t) return { overlaps: false, any: 0 };
        const tRect = t.getBoundingClientRect();
        const parent = t.closest('.relative') || t.parentElement;
        if (!parent) return { overlaps: false, any: 0 };
        const texts = Array.from(parent.querySelectorAll('h1, h2, h3, p, span')).filter((el) => el !== t && !el.contains(t));
        let overlaps = false;
        for (const el of texts) {
          const r = el.getBoundingClientRect();
          const intersects = !(tRect.right <= r.left || tRect.left >= r.right || tRect.bottom <= r.top || tRect.top >= r.bottom);
          if (intersects) {
            overlaps = true;
            break;
          }
        }
        return { overlaps, any: texts.length };
      }, i);

      checks.push({
        idx: i,
        triggerInViewport,
        compactButVisible,
        triggerW: Number(triggerBox.width.toFixed(2)),
        triggerH: Number(triggerBox.height.toFixed(2)),
        tipVisible,
        tipInViewport,
        tipW: tipBox ? Number(tipBox.width.toFixed(2)) : null,
        tipH: tipBox ? Number(tipBox.height.toFixed(2)) : null,
        overlapsNearbyText: overlapData.overlaps,
      });

      if (i === 0) {
        const tipPng = path.join(outDir, `${screen.key}-${width}-tooltip.png`);
        await page.screenshot({ path: tipPng, fullPage: true });
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(80);
    }

    report.push({ width, screen: screen.key, triggerCount: count, checks });
  }
}

const reportFile = path.join('tmp', 'tooltip-qa', `${phase}-report.json`);
await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
await browser.close();
console.log(`Saved report: ${reportFile}`);
console.log(`Saved screenshots in: ${outDir}`);
