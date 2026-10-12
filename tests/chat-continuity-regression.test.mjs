import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("../src/app/api/chat/route.ts", import.meta.url), "utf8");
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
