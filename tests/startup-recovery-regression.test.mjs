import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("the app shell recovers from startup failures and stalls", async () => {
  const source = await readFile(new URL("src/components/home-client-shell.tsx", root), "utf8");

  assert.match(source, /class AppStartupBoundary extends Component/);
  assert.match(source, /const STARTUP_TIMEOUT_MS = 30_000/);
  assert.match(source, /home-client-shell:boot-timeout/);
  assert.match(source, /data-testid="app-startup-recovery"/);
  assert.match(source, /startupRecovery\.reload/);
  assert.match(source, /window\.location\.reload\(\)/);
});

test("startup recovery copy is available in every supported locale", async () => {
  const localeNames = ["en", "es", "fr", "de", "pt", "ar", "ha", "ig", "yo", "hi", "tl"];

  for (const localeName of localeNames) {
    const locale = JSON.parse(
      await readFile(new URL(`src/locales/${localeName}.json`, root), "utf8")
    );

    assert.equal(typeof locale.startupRecovery?.title, "string", `${localeName} title`);
    assert.equal(typeof locale.startupRecovery?.body, "string", `${localeName} body`);
    assert.equal(typeof locale.startupRecovery?.reload, "string", `${localeName} reload action`);
  }
});
