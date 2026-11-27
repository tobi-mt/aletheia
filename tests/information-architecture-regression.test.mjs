import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8");

test("challenge workflows land on Formation in Library", () => {
  assert.match(app, /function openRecommendedChallenge[\s\S]*?setRequestedLibrarySection\("formation"\)[\s\S]*?showView\("library"\)/);
  const challengeNotification = app.slice(app.indexOf('notificationRoute.focus === "challenge"'), app.indexOf('notificationRoute.focus === "challenge"') + 700);
  assert.match(challengeNotification, /setRequestedLibrarySection\("formation"\)/);
  assert.match(challengeNotification, /setActiveView\("library"/);
});

test("Library combines Scripture memory and saved passages", () => {
  const library = app.slice(app.indexOf("function LibraryPanel"), app.indexOf("function JournalPanel"));
  assert.doesNotMatch(library, /key: "memory"/);
  assert.match(library, /librarySection === "saved" && scriptureMemory/);
  assert.match(library, /librarySection === "saved" && savedScriptures\.length/);
  assert.match(library, /librarySection === "saved" && !savedScriptures\.length && !scriptureMemory/);
});

test("Account puts privacy, personal context, and support in separate direct destinations", () => {
  const account = app.slice(app.indexOf("function AccountPanel"), app.indexOf("function ChallengeRecommendationCard"));
  assert.match(account, /sections: \["notifications", "privacy", "context"\]/);
  assert.match(account, /accountSection === "privacy"[\s\S]*?aiConsent\.settingTitle/);
  assert.match(account, /accountSection === "context"[\s\S]*?<ManualContextPanel/);
  assert.match(account, /accountSection === "support"[\s\S]*?<SupportReportCard[\s\S]*?<AccountShareCard/);
  assert.match(app, /const openManualContextFlow[\s\S]*?section: "context"[\s\S]*?showView\("account"\)/);
});

test("Library shows every workspace destination without scrolling and Account destination labels can wrap", () => {
  const tabs = app.slice(app.indexOf("function ScreenTabs"), app.indexOf("function ContextualNextAction"));
  assert.match(tabs, /wrappedWorkspace[\s\S]*?grid-cols-6 gap-1 sm:grid-cols-5/);
  assert.match(tabs, /overflow-wrap:anywhere/);

  const row = app.slice(app.indexOf("function AccountDestinationRow"), app.indexOf("function AccountToggleRow"));
  assert.match(row, /overflow-wrap:anywhere/);
  assert.doesNotMatch(row, /truncate/);

  const library = app.slice(app.indexOf("function LibraryPanel"), app.indexOf("function JournalPanel"));
  assert.match(library, /ariaLabel=\{ts\('labels\.librarySections'\)\}[\s\S]*?layout="workspace"/);
});

test("primary navigation restores orientation without truncating the narrow brand", () => {
  assert.match(app, /pendingWorkspaceFocusRef\.current = true/);
  assert.match(app, /workspaceRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(app, /ref=\{workspaceRef\}[\s\S]*?tabIndex=\{-1\}[\s\S]*?aria-label=/);
  assert.match(app, /hidden break-words text-\[11px\] leading-4 min-\[430px\]:block/);
  assert.doesNotMatch(app, /className="truncate text-\[11px\] leading-4"/);
});

test("navigation and counsel selection controls keep their full context visible", () => {
  const mobileNav = app.slice(app.indexOf("function MobileNav"), app.indexOf("function WorkspaceLayout"));
  assert.match(mobileNav, /break-words text-center/);
  assert.doesNotMatch(mobileNav, /truncate/);

  const decisionShare = app.slice(app.indexOf("function CounselDecisionShareRail"), app.indexOf("function CounselVoiceCard"));
  assert.match(decisionShare, /break-words text-\[0\.98rem\]/);
  assert.match(decisionShare, /mt-3 break-words text-sm/);
  assert.doesNotMatch(decisionShare, /line-clamp-3|truncate/);
});

test("quiet onboarding completion opens the core Ask workspace without a disruptive celebration", () => {
  const quietCompletion = app.slice(
    app.indexOf('} else {\n      setHomeSection("ask", "onboarding_completed")'),
    app.indexOf('trackClientEvent("onboarding_completed"')
  );
  assert.match(quietCompletion, /setStatusMessage\(ts\('notifications\.setupSavedBody'\)\)/);
  assert.match(quietCompletion, /scrollToSection\("companion-ask"\)/);
  assert.doesNotMatch(quietCompletion, /announceWorkflow/);
  assert.doesNotMatch(quietCompletion, /celebrate/);
});
