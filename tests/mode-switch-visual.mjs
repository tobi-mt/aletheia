import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.MODE_SWITCH_TEST_URL || "http://localhost:3000";
const outputDir = path.resolve("test-results/mode-switch-visual");
const shadowScenario = process.env.MODE_SWITCH_SHADOW === "1";
const freshConsentScenario = process.env.MODE_SWITCH_FRESH_CONSENT === "1";
const semanticScenario = process.env.MODE_SWITCH_SEMANTIC === "1" || shadowScenario;
const testQuestion = semanticScenario
  ? "Would a different role make better use of my strengths?"
  : "How do I become more productive at work?";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
  colorScheme: "light",
});
const page = await context.newPage();
page.on("pageerror", (error) => console.error("PAGE ERROR", error));
const requestedModes = [];

await page.route("**/api/chat/mode-fit", async (route) => {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
    available: true, mixed: false,
    probabilities: { Money: 0.05, Work: 0.72, Purpose: 0.1, Generosity: 0.03, Life: 0.1 },
    suggestion: { mode: "Work", confidence: "very_high", evidence: "semantic", topic: "career_fit", leadingProbability: 0.72, selectedProbability: 0.05, margin: 0.67 },
  }) });
});

await page.route("**/api/chat", async (route, request) => {
  if (request.method() === "GET") {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ messages: [
        { id: "10000000-0000-4000-8000-000000000001", role: "user", mode: "Money", text: "How should I plan this month's budget?" },
        { id: "10000000-0000-4000-8000-000000000002", role: "aletheia", mode: "Money", text: "Begin with what is essential." },
      ] }),
    });
    return;
  }
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
  await page.evaluate(({ semanticScenario, freshConsentScenario }) => {
    localStorage.setItem("aletheia_preferences", JSON.stringify({
      language: "en",
      region: "US",
      bibleTranslation: "WEB",
      voiceEnabled: true,
      thirdPartyAiConsent: freshConsentScenario ? false : semanticScenario,
    }));
    if (freshConsentScenario) localStorage.removeItem("aletheia_third_party_ai_declined");
    else localStorage.setItem("aletheia_third_party_ai_declined", "yes");
    localStorage.setItem("aletheia_onboarding_complete", "yes");
    localStorage.setItem("aletheia_first_run_gate_complete", "yes");
    localStorage.removeItem("aletheia_onboarding_progress");
  }, { semanticScenario, freshConsentScenario });
  await page.reload({ waitUntil: "networkidle" });
  if (freshConsentScenario) {
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("aletheia_preferences") ?? "{}").thirdPartyAiConsent), false);
    assert.equal(await page.evaluate(() => localStorage.getItem("aletheia_third_party_ai_declined")), null);
  }
  await page.getByRole("button", { name: "Ask Aletheia", exact: true }).first().click();
  await page.locator("#companion-question-input").waitFor({ state: "visible", timeout: 10_000 });
  await page.locator("#companion-question-input").fill(testQuestion);
  const semanticRequest = semanticScenario
    ? page.waitForRequest((request) => request.url().includes("/api/chat/mode-fit"), { timeout: 5_000 })
    : null;
  await page.locator("#companion-question-input").locator("xpath=ancestor::form").locator('button[type="submit"]').click();
  if (freshConsentScenario) {
    await page.getByRole("dialog").waitFor({ state: "visible", timeout: 5_000 }).catch(async (error) => {
      console.error({ requestedModes, body: (await page.locator("body").innerText()).slice(-2_000) });
      throw error;
    });
    await page.getByRole("button", { name: /Allow .* processing/i }).click();
  }
  if (semanticRequest) await semanticRequest;

  if (shadowScenario) {
    await page.getByText("FINAL_MONEY_ANSWER", { exact: true }).waitFor({ state: "visible", timeout: 5_000 });
    assert.deepEqual(requestedModes, ["Money"]);
    assert.equal(await page.getByText("Using the Work lens for a better fit", { exact: true }).count(), 0);
    await page.screenshot({ path: path.join(outputDir, "03-shadow-selected-answer.png"), fullPage: false });
    console.log(`PASS shadow visual mode-fit flow: ${requestedModes.join(" -> ")}`);
    console.log(outputDir);
    process.exitCode = 0;
  } else {

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

  console.log(`PASS ${semanticScenario ? "semantic " : "deterministic "}visual mode-switch flow: ${requestedModes.join(" -> ")}`);
  console.log(outputDir);
  }
} finally {
  await browser.close();
}
