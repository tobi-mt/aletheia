import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { formatStreak } from "../src/lib/streak-shared.ts";
import { formatFastingDurationLabel } from "../src/lib/fasting-invite.ts";
import { formatReadWithMeDurationLabel } from "../src/lib/read-with-me-invite.ts";

test("streak copy is supplied by the selected app language", () => {
  const copy = {
    startToday: "Beginne deine Serie heute! 🔥",
    oneDay: "🔥 Reflexionsserie: {days} Tag",
    multipleDays: "🔥 Reflexionsserie: {days} Tage",
  };

  assert.equal(formatStreak(0, copy), copy.startToday);
  assert.equal(formatStreak(1, copy), "🔥 Reflexionsserie: 1 Tag");
  assert.equal(formatStreak(12, copy), "🔥 Reflexionsserie: 12 Tage");
});

test("customer-facing dates and times never fall back to the device locale", async () => {
  const source = await readFile(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /toLocaleDateString\(undefined/);
  assert.doesNotMatch(source, /toLocaleTimeString\(\[\]/);
  assert.doesNotMatch(source, /new Intl\.DateTimeFormat\(undefined/);
  assert.match(source, /new Intl\.DateTimeFormat\(language,/);
});

test("challenge durations follow the app language instead of hard-coded English", () => {
  assert.equal(formatFastingDurationLabel(2, "de"), "2 Tage");
  assert.equal(formatReadWithMeDurationLabel(4, "weeks", "de"), "4 Wochen");
  assert.equal(formatFastingDurationLabel(2, "en"), "2 days");
});

test("every locale provides composed streak copy and a compact day badge", async () => {
  const localeCodes = ["ar", "de", "en", "es", "fr", "ha", "hi", "ig", "pt", "tl", "yo"];

  for (const localeCode of localeCodes) {
    const locale = JSON.parse(
      await readFile(new URL(`../src/locales/${localeCode}.json`, import.meta.url), "utf8")
    );
    assert.ok(locale.streak.startToday, `${localeCode}: missing streak.startToday`);
    assert.match(locale.streak.oneDay, /\{days\}/, `${localeCode}: streak.oneDay must contain {days}`);
    assert.match(locale.streak.multipleDays, /\{days\}/, `${localeCode}: streak.multipleDays must contain {days}`);
    assert.match(locale.streak.dayBadge, /\{days\}/, `${localeCode}: streak.dayBadge must contain {days}`);
  }
});

test("non-Latin locales never ship copy pasted from a Latin-script locale", async () => {
  const flatten = (node, prefix = "") =>
    Object.entries(node).flatMap(([key, value]) =>
      value && typeof value === "object" ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]]
    );
  const latinSentence = /[A-Za-zÀ-ÿ]{2,}(?:[ ,'’-]+[A-Za-zÀ-ÿ]{2,}){2,}/;

  for (const localeCode of ["ar", "hi"]) {
    const locale = JSON.parse(
      await readFile(new URL(`../src/locales/${localeCode}.json`, import.meta.url), "utf8")
    );
    const leaked = flatten(locale)
      .filter(([, value]) => typeof value === "string" && latinSentence.test(value))
      .map(([key]) => key);
    assert.deepEqual(leaked, [], `${localeCode}: untranslated Latin-script copy`);

    // Single English words left inside translated sentences ("انعكاس Journal") read as broken copy.
    const allowedLatin = /\{[^}]*\}|Aletheia|OpenAI|IndexedDB|httpOnly|Safari|Chrome|Edge|Apple|Google|Android|DELETE|APNs|Push Notifications|PNG|JPEG|WEBP|URL|WEB|KJV|VAPID|JSON/g;
    const strayWords = flatten(locale)
      .filter(([, value]) => typeof value === "string" && /[\u0600-\u06FF\u0900-\u097F]/.test(value) && /\b[A-Za-z]{4,}\b/.test(value.replace(allowedLatin, "")))
      .map(([key]) => key);
    assert.deepEqual(strayWords, [], `${localeCode}: stray English words inside translated copy`);
  }
});

test("Listen for Scripture copy is translated in every locale", async () => {
  const english = JSON.parse(await readFile(new URL("../src/locales/en.json", import.meta.url), "utf8")).listen;
  const keys = ["start", "duration", "recognizing", "recognizingBody", "recognized", "noMatch"];

  for (const localeCode of ["ar", "de", "es", "fr", "ha", "hi", "ig", "pt", "tl", "yo"]) {
    const { listen } = JSON.parse(
      await readFile(new URL(`../src/locales/${localeCode}.json`, import.meta.url), "utf8")
    );
    for (const key of keys) {
      assert.ok(listen[key], `${localeCode}: missing listen.${key}`);
      assert.notEqual(listen[key], english[key], `${localeCode}: listen.${key} is still English`);
      assert.doesNotMatch(listen[key], /^(Listen|Recognized source|No confident Scripture match)$/, `${localeCode}: listen.${key} is stale English`);
    }
  }
});
