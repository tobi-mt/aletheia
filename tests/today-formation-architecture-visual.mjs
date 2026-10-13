import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const outputDir = path.resolve("test-results/today-formation-architecture");
await mkdir(outputDir, { recursive: true });

const challenge = {
  id: "gratitude-3day",
  titleKey: "challenges.gratitude3.title",
  title: "Gratitude Practice",
  descriptionKey: "challenges.gratitude3.description",
  description: "Notice grace in ordinary moments.",
  totalDays: 3,
  mode: "Life",
  completedDays: [{ day: 1, reflection: "I noticed an unexpected kindness.", completedAt: "2026-10-13T08:00:00.000Z" }],
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
const page = await context.newPage();

await page.route("**/api/auth/me", (route) => route.fulfill({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({ user: { id: "qa-user", name: "QA", email: "qa@example.com", avatarUrl: null } }),
}));
await page.route("**/api/challenges", (route) => route.fulfill({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({ challenges: [challenge] }),
}));
await page.route("**/api/challenge-circles", (route) => route.fulfill({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({ circles: [] }),
}));

try {
  await page.goto(process.env.FORMATION_ARCHITECTURE_TEST_URL ?? "http://localhost:3000", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem("aletheia_onboarding_complete", "yes");
    localStorage.setItem("aletheia_first_run_gate_complete", "yes");
    localStorage.setItem("aletheia-active-view", "companion");
    localStorage.setItem("aletheia-home-section", "today");
  });
  await page.reload({ waitUntil: "networkidle" });

  await page.getByText("Continue your current practice", { exact: true }).waitFor();
  assert.equal(await page.getByText("Formation Practices", { exact: true }).count(), 0);
  assert.equal(await page.getByText("Shared circle", { exact: true }).count(), 0);
  await page.screenshot({ path: path.join(outputDir, "01-today-compact-continuation.png"), fullPage: true });

  await page.getByText("Continue your current practice", { exact: true }).click();
  await page.getByText("Formation Practices", { exact: true }).waitFor();
  await page.getByText("Shared circle", { exact: true }).waitFor();
  await page.screenshot({ path: path.join(outputDir, "02-library-formation-workspace.png"), fullPage: true });

  await page.getByRole("button", { name: "Reflect", exact: true }).last().click();
  await page.getByRole("tab", { name: "Formation", exact: true }).waitFor({ timeout: 5_000 }).catch(async (error) => {
    console.error((await page.locator("body").innerText()).slice(-3_000));
    throw error;
  });
  await page.getByRole("tab", { name: "Formation", exact: true }).click();
  await page.getByText("I noticed an unexpected kindness.", { exact: true }).waitFor();
  await page.screenshot({ path: path.join(outputDir, "03-reflect-formation-history.png"), fullPage: true });

  console.log(`PASS Today → Library Formation → Reflect history architecture`);
  console.log(outputDir);
} finally {
  await browser.close();
}
