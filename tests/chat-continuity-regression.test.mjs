import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("../src/app/api/chat/route.ts", import.meta.url), "utf8");
const modeFitRoute = readFileSync(new URL("../src/app/api/chat/mode-fit/route.ts", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8");

test("chat reload returns the newest bounded history in chronological display order", () => {
  assert.match(route, /ORDER BY created_at DESC, CASE WHEN role = 'aletheia' THEN 0 ELSE 1 END\s+LIMIT 60/);
  assert.match(route, /\) recent_messages\s+ORDER BY created_at ASC, CASE WHEN role = 'user' THEN 0 ELSE 1 END/);
});

test("signed-in answer context includes a bounded recent-question history", () => {
  assert.match(route, /WHERE user_id = \? AND role = 'user'/);
  assert.match(route, /ORDER BY created_at DESC\s+LIMIT 6/);
  assert.match(route, /Recent questions for continuity/);
});

test("Decision surfaces the latest answered question as a continuation", () => {
  const panel = app.slice(app.indexOf("function DecisionCompanionPanel"), app.indexOf("function ReflectPanel"));
  assert.match(panel, /latestCounselExchange/);
  assert.match(panel, /latestCounselContinuation/);
  assert.match(panel, /labels\.continueFromThis/);
  assert.match(panel, /onOpenLatestCounsel\(latestCounselExchange\)/);
});

test("Ask composer does not repeat account sync state between voice and suggestions", () => {
  const panel = app.slice(app.indexOf("function CompanionPanel"), app.indexOf("function ScriptureChips"));
  assert.doesNotMatch(panel, /labels\.syncActiveFull/);
  assert.doesNotMatch(panel, /labels\.accountGuestSummary/);
});

test("mode-fit guidance auto-switches on submit with a calm, cancellable veto window", () => {
  const submit = app.slice(app.indexOf("async function submitQuestionWithModeCheck"), app.indexOf("async function handleAsk"));
  const panel = app.slice(app.indexOf("function CompanionPanel"), app.indexOf("function ScriptureChips"));
  assert.match(submit, /suggestModeForQuestion\(trimmed, originalMode, \{ followUp: isFollowUp \}\)/);
  assert.match(submit, /modeFitSubmissionInFlightRef\.current/);
  assert.match(submit, /deferPersistence: true/);
  assert.match(submit, /const vetoUntil = Date\.now\(\) \+ 3500/);
  assert.match(submit, /holdUntil: vetoUntil/);
  assert.match(submit, /chatAbortControllerRef\.current\?\.abort\(\)/);
  assert.match(submit, /replacePending: true/);
  assert.match(panel, /modeSuggestion\.autoUsing/);
  assert.match(panel, /modeSuggestion\.keep/);
  assert.match(panel, /modeSuggestion\.autoFitActive/);
  assert.match(panel, /mode-switch-progress/);
  assert.match(panel, /bottom-\[calc\(5\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.doesNotMatch(panel.slice(panel.indexOf('id="companion-question-input"'), panel.indexOf("</textarea>")), /scrollIntoView/);
});

test("semantic mode-fit is consent-gated, bounded, and remotely disableable", () => {
  assert.match(modeFitRoute, /thirdPartyAiConsent !== true/);
  assert.match(modeFitRoute, /SEMANTIC_MODE_FIT_ENABLED === "false"/);
  assert.match(modeFitRoute, /\.slice\(0, 1_200\)/);
  assert.match(modeFitRoute, /AbortSignal\.timeout\(1_400\)/);
  assert.doesNotMatch(modeFitRoute, /conversationHistory|recentQuestions|userProfile/);
});

test("first-question AI consent resumes through mode-fit classification", () => {
  const consent = app.slice(app.indexOf("<AiConsentModal"), app.indexOf("<ReportIssueModal"));
  assert.match(consent, /submitQuestionWithModeCheck\(pending\.question, pending\.visibleQuestion, false\)/);
  assert.match(consent, /submitQuestionWithModeCheck\(pending\.question, pending\.visibleQuestion, true\)/);
  assert.doesNotMatch(consent, /askAletheia\(pending\.question/);
});

test("provisional answers are persisted and counted only through finalization", () => {
  assert.match(route, /deferPersistence\?: boolean/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /if \(user && !deferPersistence\)/);
  assert.match(route, /deferredPersistence: Boolean\(user\) && deferPersistence/);
  assert.match(route, /ON CONFLICT \(id\) DO NOTHING/);
});
