import assert from "node:assert/strict";
import test from "node:test";
import { classifyAnalyticsClient, normalizeAnalyticsRuntime } from "../src/lib/analytics-client-context.ts";

test("analytics client classification distinguishes native apps, PWA hints, and browsers", () => {
  const ios = classifyAnalyticsClient(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    "ios_app"
  );
  assert.deepEqual(ios, {
    runtime: "ios_app",
    deviceClass: "mobile",
    osFamily: "ios",
    browserFamily: "native_webview",
  });

  const android = classifyAnalyticsClient(
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36",
    "android_app"
  );
  assert.equal(android.runtime, "android_app");
  assert.equal(android.deviceClass, "mobile");
  assert.equal(android.osFamily, "android");
  assert.equal(android.browserFamily, "native_webview");

  const pwa = classifyAnalyticsClient(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36",
    "pwa"
  );
  assert.equal(pwa.runtime, "pwa");
  assert.equal(pwa.deviceClass, "desktop");
  assert.equal(pwa.osFamily, "windows");
  assert.equal(pwa.browserFamily, "chrome");
});

test("untrusted runtime values fail closed", () => {
  assert.equal(normalizeAnalyticsRuntime("ios_app"), "ios_app");
  assert.equal(normalizeAnalyticsRuntime("precise-device-id"), "unknown");
  assert.equal(normalizeAnalyticsRuntime(null), "unknown");
});
