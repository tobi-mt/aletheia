import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8");

test("Create counsel summary opens the saved summary in Counsel Circle without drafting a decision", () => {
  const handler = app.slice(app.indexOf("function draftCounselSummaryFromExchange"), app.indexOf("function keepCounselSummaryForLater"));
  assert.match(handler, /sourceExchangeId: exchange\.id/);
  assert.match(handler, /setCounselSummaries\(\[summary, \.\.\.counselSummaries\]\)/);
  assert.match(handler, /setPendingCounselSummaryFocusId\(summary\.id\)/);
  assert.match(handler, /showView\("decisions"\)/);
  assert.doesNotMatch(handler, /setDecisionTitle|setDecisionPressure|setDecisionEmotion|setPendingDecisionComposerFocus/);
  assert.doesNotMatch(handler, /scrollToSection\("counsel-circle"\)/);
});

test("Counsel summary destination selects Counsel and focuses the exact saved summary", () => {
  const panel = app.slice(app.indexOf("function DecisionCompanionPanel"), app.indexOf("function ReflectPanel"));
  assert.match(panel, /pendingCounselSummaryFocusId/);
  assert.match(panel, /setDecisionSection\("counsel"\)/);
  assert.match(panel, /counselSummaryRefs\.current\.get\(pendingCounselSummaryFocusId\)/);
  assert.match(panel, /onPendingCounselSummaryFocusHandled\(\)/);
});

test("Counsel summaries persist as a collection and restore legacy single-summary storage", () => {
  assert.match(app, /Array\.isArray\(storedSummaryValue\) \? storedSummaryValue : storedSummaryValue \? \[storedSummaryValue\] : \[\]/);
  assert.match(app, /window\.localStorage\.setItem\("aletheia-counsel-summary-draft", JSON\.stringify\(value\)\)/);
  assert.match(app, /const \[counselSummaries, setCounselSummariesState\] = useState<CounselSummaryDraft\[]>\(\[\]\)/);
});

test("Saved summaries show full content and explicit share, keep, and reminder actions", () => {
  const panel = app.slice(app.indexOf("function DecisionCompanionPanel"), app.indexOf("function ReflectPanel"));
  assert.match(panel, /onShareCounselSummary\(summary\.id\)/);
  assert.match(panel, /onKeepCounselSummary\(summary\.id\)/);
  assert.match(panel, /onRemindCounselSummary\(summary\.id, days\)/);
  assert.match(panel, /\(\[1, 3, 7\] as const\)/);
  assert.match(panel, /<CounselSummaryBody title=\{summary\.title\} body=\{summary\.body\}/);
  assert.doesNotMatch(panel, /max-h-72/);
});

test("Due counsel-summary reminders return users to the saved Counsel Circle item", () => {
  const reminderEffect = app.slice(app.indexOf("const scheduled = counselSummaries"), app.indexOf("const updateAuthPromptState"));
  assert.match(reminderEffect, /summary\.status === "reminder_scheduled"/);
  assert.match(reminderEffect, /setPendingCounselSummaryFocusId\(dueSummary\.id\)/);
  assert.match(reminderEffect, /setActiveView\("decisions", "counsel_summary_reminder"\)/);
  assert.match(reminderEffect, /visibilitychange/);
});
