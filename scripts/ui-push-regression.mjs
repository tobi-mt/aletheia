import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.UI_REGRESSION_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch();

try {
  const page = await browser.newPage({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  page.setDefaultTimeout(15000);
  await page.addInitScript(() => {
    for (const key of ["first_run_gate_complete", "onboarding_complete", "third_party_ai_declined"]) {
      localStorage.setItem(`aletheia_${key}`, "yes");
    }
    const listeners = new Map();
    window.qaPush = {
      registrationCount: 0,
      hasListener: (event) => [...listeners.values()].some(([name]) => name === event),
      emit: (event, data) => {
        for (const [name, cb] of listeners.values()) if (name === event) cb(data);
      },
    };
    window.CapacitorCustomPlatform = { name: "ios" };
    const plugin = (name, methods) => ({
      name,
      methods: methods.map((method) => ({
        name: method,
        rtype: method.endsWith("Listener") ? "callback" : "promise",
      })),
    });
    window.Capacitor = {
      PluginHeaders: [
        plugin("App", ["getInfo", "getState", "addListener", "removeListener"]),
        plugin("PushNotifications", ["checkPermissions", "register", "unregister", "addListener", "removeListener"]),
      ],
      nativeCallback(_plugin, method, args, callback) {
        if (method !== "addListener") return listeners.delete(args.callbackId);
        const id = crypto.randomUUID();
        listeners.set(id, [args.eventName, callback]);
        return id;
      },
      async nativePromise(_plugin, method) {
        if (method === "getInfo") return { name: "Aletheia", version: "1.0", build: "1" };
        if (method === "getState") return { isActive: true };
        if (method === "checkPermissions") return { receive: "granted" };
        if (method === "register") {
          window.qaPush.registrationCount++;
          window.qaPush.emit("registration", { value: "qa-token" });
        }
      },
    };
  });

  let subscribed = false;
  let testTarget;
  await page.route("**/api/auth/me", (route) => route.fulfill({
    json: { user: { id: "qa-user", email: "qa@example.org", name: "QA" } },
  }));
  await page.route(/\/api\/notifications\/native(\?|$)/, (route) => {
    const method = route.request().method();
    if (method === "DELETE") {
      assert.deepEqual(route.request().postDataJSON(), { deviceId: "qa-device" });
      subscribed = false;
    }
    if (method === "POST") {
      subscribed = true;
      return route.fulfill({ json: { deviceId: "qa-device" } });
    }
    return route.fulfill({ json: { configured: true, apnsConfigured: true, devices: 1, deviceSubscribed: subscribed } });
  });
  await page.route("**/api/notifications/test", (route) => {
    testTarget = route.request().postDataJSON();
    return route.fulfill({ status: 502, json: { errorCode: "push_delivery_failed" } });
  });

  await page.goto(`${baseUrl}/?tab=companion`);
  const nav = page.locator(".app-bottom-nav");
  const account = nav.getByRole("button", { name: "Account", exact: true });
  await account.waitFor();
  await page.waitForFunction(() => window.qaPush.hasListener("pushNotificationReceived"));
  const emit = (kind, id, title, ttl = 60_000) => page.evaluate(({ kind, id, title, ttl }) => {
    window.qaPush.emit("pushNotificationReceived", {
      title,
      body: "A counsel update is ready to review.",
      data: {
        notificationKind: kind, notificationId: id, recipientUserId: "qa-user",
        url: "/?source=notification&focus=decision&decisionId=qa-decision",
        expiresAt: new Date(Date.now() + ttl).toISOString(),
      },
    });
  }, { kind, id, title, ttl });
  await emit("daily_wisdom", "routine", "Routine reminder");
  await emit("counsel_comment", "old", "Old counsel", -5000);
  await emit("counsel_comment", "new", "New counsel");
  const card = page.getByRole("complementary").filter({ hasText: "New counsel" });
  await card.waitFor();
  await card.getByRole("button", { name: "Open", exact: true }).waitFor();
  assert.equal(await card.evaluate((element) => getComputedStyle(element).position), "static");
  assert.equal(await page.getByText("Routine reminder", { exact: true }).count(), 0);
  assert.equal(await page.getByText("Old counsel", { exact: true }).count(), 0);
  await card.getByRole("button", { name: "Dismiss workflow notice" }).click({ trial: true });
  if (process.env.PUSH_QA_SCREENSHOT) await page.screenshot({ path: process.env.PUSH_QA_SCREENSHOT });
  await card.getByRole("button", { name: "Dismiss workflow notice" }).click();
  await emit("counsel_comment", "new", "New counsel");
  assert.equal(await card.count(), 0);
  await emit("counsel_comment", "next", "New counsel");
  await card.getByRole("button", { name: "Open", exact: true }).click();
  await nav.getByRole("button", { name: "Decide", exact: true }).waitFor();
  assert.equal(await nav.getByRole("button", { name: "Decide", exact: true }).getAttribute("aria-current"), "page");

  const destination = page.locator("[data-account-destination=notifications]");
  const panel = page.locator("[data-account-section=notifications]");
  await account.click();
  await destination.click();
  const toggle = panel.getByRole("switch", { name: "Daily wisdom notifications" });
  await panel.getByRole("button", { name: "Send test", exact: true }).click();
  await panel.getByText("The test could not be sent right now. Please try again in a moment.", { exact: true }).waitFor();
  assert.deepEqual(testTarget, { nativeDeviceId: "qa-device" });
  assert.equal(await page.evaluate(() => window.qaPush.registrationCount), 1);
  await toggle.click();
  await page.waitForFunction(() => localStorage.getItem("aletheia_push_opt_out:qa-user") === "1");
  await page.goto(`${baseUrl}/?tab=account`);
  await destination.click();
  await panel.getByText("Daily wisdom notifications are turned off for this device.", { exact: true }).first().waitFor();
  assert.equal(await toggle.getAttribute("aria-checked"), "false");
  assert.equal(await page.evaluate(() => window.qaPush.registrationCount), 0);
  console.log("Push UI passed: inline counsel, expired and duplicate suppression, scoped test failure, and durable device opt-out.");
} finally {
  await browser.close();
}
