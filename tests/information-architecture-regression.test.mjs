import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8");

test("challenge workflows land on Formation at Home", () => {
  assert.match(app, /id="home-formation"/);
  assert.match(app, /function openRecommendedChallenge[\s\S]*?showView\("companion"\)[\s\S]*?scrollToSection\("home-formation"\)/);
  const challengeNotification = app.slice(app.indexOf('notificationRoute.focus === "challenge"'), app.indexOf('notificationRoute.focus === "challenge"') + 700);
  assert.match(challengeNotification, /setActiveView\("companion"/);
  assert.match(challengeNotification, /scrollToSection\("home-formation"\)/);
});

test("Library combines Scripture memory and saved passages", () => {
  const library = app.slice(app.indexOf("function LibraryPanel"), app.indexOf("function JournalPanel"));
  assert.doesNotMatch(library, /key: "memory"/);
  assert.match(library, /librarySection === "saved" && scriptureMemory/);
  assert.match(library, /savedScriptures\.length \|\| scriptureMemory/);
});

test("Account routes privacy and system workflows into Settings", () => {
  const account = app.slice(app.indexOf("function AccountPanel"), app.indexOf("function ChallengeRecommendationCard"));
  assert.doesNotMatch(account, /key: "privacy"/);
  assert.doesNotMatch(account, /key: "share"/);
  assert.match(account, /key: "system"/);
  assert.match(account, /requestedSection === "personalization" \? "personalization" : "system"/);
  assert.match(account, /aiConsent\.settingTitle/);
  assert.match(account, /<AccountShareCard/);
});

test("primary navigation restores orientation without truncating the narrow brand", () => {
  assert.match(app, /pendingWorkspaceFocusRef\.current = true/);
  assert.match(app, /workspaceRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(app, /ref=\{workspaceRef\}[\s\S]*?tabIndex=\{-1\}[\s\S]*?aria-label=/);
  assert.match(app, /hidden whitespace-nowrap text-\[11px\] leading-4 min-\[430px\]:block/);
  assert.doesNotMatch(app, /className="truncate text-\[11px\] leading-4"/);
});

test("quiet onboarding completion does not obscure the first workspace", () => {
  const quietCompletion = app.slice(
    app.indexOf('} else {\n      setHomeSection("today", "onboarding_completed")'),
    app.indexOf('trackClientEvent("onboarding_completed"')
  );
  assert.match(quietCompletion, /setStatusMessage\(ts\('notifications\.setupSavedBody'\)\)/);
  assert.doesNotMatch(quietCompletion, /announceWorkflow/);
  assert.doesNotMatch(quietCompletion, /celebrate/);
});
