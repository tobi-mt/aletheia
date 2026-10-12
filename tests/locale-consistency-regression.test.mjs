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
