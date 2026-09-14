import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8");

test("Reflect no longer exposes Wisdom Check as a separate section", () => {
  const reflectPanel = app.slice(app.indexOf("function ReflectPanel"), app.indexOf("function GratitudeEntryModal"));
  assert.doesNotMatch(reflectPanel, /key: "check"/);
  assert.doesNotMatch(reflectPanel, /<WisdomCheck/);
  assert.match(reflectPanel, /id="reflect-gratitude"/);
  assert.match(reflectPanel, /id="reflect-journal"/);
  assert.doesNotMatch(reflectPanel, /FormationRailSection/);
});

test("Decision owns the live discernment readout", () => {
  const decisionPanel = app.slice(app.indexOf("function DecisionCompanionPanel"), app.indexOf("function ReflectPanel"));
  assert.match(decisionPanel, /discernmentResult/);
  assert.match(decisionPanel, /labels\.readinessSignal/);
  assert.match(decisionPanel, /labels\.counselStillNeeded/);
});

test("eligible answers promote one contextual continuation before secondary actions", () => {
  const currentCounsel = app.slice(app.indexOf("function CurrentCounselCard"), app.indexOf("function AnswerFeedback"));
  const continuationIndex = currentCounsel.indexOf("continuationLabel(continuation.direction");
  const secondaryActionsIndex = currentCounsel.indexOf("{showDecisionActions ?");
  assert.ok(continuationIndex > 0);
  assert.ok(continuationIndex < secondaryActionsIndex);
  assert.match(currentCounsel, /onContinue\(exchange, continuation\)/);
});

test("Gratitude keeps optional postcard styling behind photo-aware disclosure", () => {
  const gratitude = app.slice(app.indexOf("function GratitudeLensPanel"), app.indexOf("function LibraryPanel"));
  assert.match(gratitude, /\{previewUrl \? \([\s\S]*?<DisclosureSection[\s\S]*?labels\.gratitudeStyleCard/);
  assert.match(gratitude, /compactCollapsed/);
  assert.match(gratitude, /showDetailsLabel=\{ts\('showDetails'\)\}/);
});
