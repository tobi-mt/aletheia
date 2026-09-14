import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8");

function component(name, nextName) {
  return app.slice(app.indexOf(`function ${name}`), app.indexOf(`function ${nextName}`));
}

test("Decisions orients around the next decision before opening the composer", () => {
  const decision = component("DecisionCompanionPanel", "PermissionToggle");
  assert.ok(decision.indexOf("<ScreenPurposeHeader") < decision.indexOf('id="decision-companion-card"'));
  assert.match(decision, /title=\{decisionNextTitle\}/);
});

test("Reflect gives purpose before gratitude and journal capture without hiding either journey", () => {
  const reflect = component("ReflectPanel", "GratitudeEntryModal");
  const header = reflect.indexOf("<ScreenPurposeHeader");
  const gratitude = reflect.indexOf('id="reflect-gratitude"');
  const journal = reflect.indexOf('id="reflect-journal"');
  assert.ok(header > 0 && header < gratitude && gratitude < journal);
});

test("Library prioritizes orientation and browsing while progressively disclosing voice recognition", () => {
  const library = component("LibraryPanel", "JournalPanel");
  const header = library.indexOf("<ScreenPurposeHeader");
  const tabs = library.indexOf("<ScreenTabs");
  const explore = library.lastIndexOf('librarySection === "explore" ? (');
  const listenDisclosure = library.lastIndexOf("<DisclosureSection");
  const listen = library.lastIndexOf("<ListenForWisdom");
  assert.ok(header > 0 && header < tabs && tabs < explore);
  assert.ok(listenDisclosure > explore && listen > listenDisclosure);
});

test("Account keeps settings ahead of optional formation recommendations", () => {
  const account = component("AccountPanel", "ChallengeRecommendationCard");
  const tabs = account.indexOf("<ScreenTabs");
  const system = account.indexOf('accountSection === "system"');
  const recommendation = account.lastIndexOf("challengeRecommendation ?");
  assert.ok(tabs > 0 && tabs < system && system < recommendation);
});
