import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.MODE_SWITCH_TEST_URL || "http://localhost:3000";
const outputDir = path.resolve("test-results/mode-switch-visual");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
  colorScheme: "light",
});
const page = await context.newPage();
const requestedModes = [];

await page.route("**/api/chat", async (route, request) => {
  if (request.method() !== "POST") {
    await route.continue();
    return;
  }
  const body = request.postDataJSON();
  requestedModes.push(body.mode);
  await new Promise((resolve) => setTimeout(resolve, body.mode === "Work" ? 2200 : 250));
  const marker = body.mode === "Work" ? "DISCARDED_WORK_ANSWER" : "FINAL_MONEY_ANSWER";
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      userMessage: { id: crypto.randomUUID(), role: "user", mode: body.mode, text: body.message },
      reply: { id: crypto.randomUUID(), role: "aletheia", mode: body.mode, text: marker, sources: [] },
      persisted: false,
      deferredPersistence: false,
      usedOpenAI: false,
    }),
  }).catch(() => undefined);
});

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem("aletheia_preferences", JSON.stringify({
      language: "en",
      region: "US",
      bibleTranslation: "WEB",
      voiceEnabled: true,
      thirdPartyAiConsent: false,
    }));
    localStorage.setItem("aletheia_third_party_ai_declined", "yes");
    localStorage.setItem("aletheia_onboarding_complete", "yes");
    localStorage.setItem("aletheia_first_run_gate_complete", "yes");
    localStorage.removeItem("aletheia_onboarding_progress");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Ask Aletheia", exact: true }).first().click();
  await page.locator("#companion-question-input").waitFor({ state: "visible", timeout: 10_000 });
  await page.locator("#companion-question-input").fill("Should I accept this new job offer or stay in my current career?");
  await page.locator("#companion-question-input").locator("xpath=ancestor::form").locator('button[type="submit"]').click();

  const notice = page.getByText("Using the Work lens for a better fit", { exact: true });
  await notice.waitFor({ state: "visible", timeout: 2_000 });
  assert.equal(await page.getByRole("button", { name: "Keep Money", exact: true }).isVisible(), true);
  assert.equal(await page.locator(".mode-switch-progress").isVisible(), true);
  await page.screenshot({ path: path.join(outputDir, "01-auto-switch-notice.png"), fullPage: false });

  await page.getByRole("button", { name: "Keep Money", exact: true }).click();
  await page.getByText("FINAL_MONEY_ANSWER", { exact: true }).waitFor({ state: "visible", timeout: 5_000 });
  await page.waitForTimeout(2500);

  assert.deepEqual(requestedModes, ["Work", "Money"]);
  assert.equal(await page.getByText("DISCARDED_WORK_ANSWER", { exact: true }).count(), 0);
  assert.equal(await page.getByText("FINAL_MONEY_ANSWER", { exact: true }).count(), 1);
  assert.equal(await page.getByText("Using the Work lens for a better fit", { exact: true }).count(), 0);
  await page.screenshot({ path: path.join(outputDir, "02-final-money-answer.png"), fullPage: false });

  console.log(`PASS visual mode-switch flow: ${requestedModes.join(" -> ")}`);
  console.log(outputDir);
} finally {
  await browser.close();
}
