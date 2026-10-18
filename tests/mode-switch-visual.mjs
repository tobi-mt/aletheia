import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.MODE_SWITCH_TEST_URL || "http://localhost:3000";
const outputDir = path.resolve("test-results/mode-switch-visual");
const freshConsentScenario = process.env.MODE_SWITCH_FRESH_CONSENT === "1";
const testQuestion = "How do I become more productive at work?";
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
let legacyClassifierCalls = 0;

await page.route("**/api/chat/mode-fit", async (route) => {
  legacyClassifierCalls += 1;
  await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
});

await page.route("**/api/chat", async (route) => {
  const request = route.request();
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
  await new Promise((resolve) => setTimeout(resolve, 350));
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      userMessage: { id: crypto.randomUUID(), role: "user", mode: "Work", text: body.message },
      reply: { id: crypto.randomUUID(), role: "aletheia", mode: "Work", text: "UNIFIED_WORK_COUNSEL", sources: [] },
      persisted: false,
      deferredPersistence: false,
      usedOpenAI: true,
      intelligence: {
        recommendedMode: "Work",
        probabilities: { Money: 0.05, Work: 0.72, Purpose: 0.1, Generosity: 0.03, Life: 0.1 },
        ambiguity: { mixed: false, uncertain: false, alternativeMode: "Purpose", reason: "The central question concerns vocation, capacity, and sustainable effort." },
        safeTopic: "general",
        reasoningPlan: { tension: "Productivity and sustainable capacity are competing.", diagnosticQuestion: "What kind of service is this work meant to support?", blindSpot: "Busyness can look like faithfulness.", maturitySignal: "The pace remains sustainable.", nextStep: "Choose one reversible improvement for tomorrow." },
        quality: { passed: true }, routing: { route: "primary", latencyMs: 350 },
      },
    }),
  }).catch(() => undefined);
});

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(({ freshConsentScenario }) => {
    localStorage.setItem("aletheia_preferences", JSON.stringify({
      language: "en",
      region: "US",
      bibleTranslation: "WEB",
      voiceEnabled: true,
      thirdPartyAiConsent: !freshConsentScenario,
    }));
    if (freshConsentScenario) localStorage.removeItem("aletheia_third_party_ai_declined");
    else localStorage.setItem("aletheia_third_party_ai_declined", "yes");
    localStorage.setItem("aletheia_onboarding_complete", "yes");
    localStorage.setItem("aletheia_first_run_gate_complete", "yes");
    localStorage.removeItem("aletheia_onboarding_progress");
  }, { freshConsentScenario });
  await page.reload({ waitUntil: "networkidle" });
  if (freshConsentScenario) {
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("aletheia_preferences") ?? "{}").thirdPartyAiConsent), false);
    assert.equal(await page.evaluate(() => localStorage.getItem("aletheia_third_party_ai_declined")), null);
  }
  await page.getByRole("button", { name: "Ask Aletheia", exact: true }).first().click();
  await page.locator("#companion-question-input").waitFor({ state: "visible", timeout: 10_000 });
  await page.locator("#companion-question-input").fill(testQuestion);
  const askButton = page.locator("#companion-question-input").locator("xpath=ancestor::form").locator('button[type="submit"]');
  await askButton.tap();
  if (freshConsentScenario) {
    await page.getByRole("dialog").waitFor({ state: "visible", timeout: 5_000 }).catch(async (error) => {
      console.error({ requestedModes, body: (await page.locator("body").innerText()).slice(-2_000) });
      throw error;
    });
    await page.getByRole("button", { name: /Allow .* processing/i }).click();
  } else {
    await page.waitForFunction(() => document.querySelector('#companion-question-input')?.closest('form')?.querySelector('button[type="submit"]')?.getAttribute('aria-busy') === 'true');
  }
  await page.getByText("UNIFIED_WORK_COUNSEL", { exact: true }).waitFor({ state: "visible", timeout: 5_000 }).catch(async (error) => {
    console.error({ requestedModes, body: (await page.locator("body").innerText()).slice(-3_000) });
    throw error;
  });
  assert.deepEqual(requestedModes, ["Money"]);
  assert.equal(legacyClassifierCalls, 0);
  assert.equal(await page.getByText("Current lens: Work", { exact: true }).count() > 0, true);
  assert.equal(await page.getByText("The central question concerns vocation, capacity, and sustainable effort.", { exact: true }).isVisible(), true);
  await page.screenshot({ path: path.join(outputDir, "01-unified-work-answer.png"), fullPage: true });

  console.log(`PASS unified visual mode-switch flow: ${requestedModes.length} chat request, ${legacyClassifierCalls} classifier requests`);
  console.log(outputDir);
} finally {
  await browser.close();
}
