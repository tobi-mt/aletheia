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
  assert.match(reflectPanel, /reflectSection === "gratitude" \? \(/);
  assert.match(reflectPanel, /\) : \(\s*<section id="reflect-journal"/);
  assert.doesNotMatch(reflectPanel, /scrollTargetBelowTopChrome\(target\)/);
});

test("Save as reflection persists the exchange and opens the journal destination", () => {
  const handler = app.slice(app.indexOf("async function draftReflectionFromExchange"), app.indexOf("function draftCounselSummaryFromExchange"));
  assert.match(handler, /await persistJournalEntry/);
  assert.match(handler, /role: "prompt"/);
  assert.match(handler, /role: "counsel"/);
  assert.match(handler, /setReflectSection\("journal"\)/);
  assert.doesNotMatch(handler, /setJournalTitle|setJournalBody|reflectionDraftPrepared/);
});

test("Reflection history stays compact while detail shows complete timestamped conversations", () => {
  const journal = app.slice(app.indexOf("function JournalPanel"), app.indexOf("function JournalEntryDetailModal"));
  const modal = app.slice(app.indexOf("function JournalEntryDetailModal"));
  assert.doesNotMatch(journal, /line-clamp/);
  assert.match(journal, /JOURNAL_HISTORY_PAGE_SIZE = 4/);
  assert.match(journal, /entries\.slice\(0, visibleEntryCount\)/);
  assert.match(journal, /groupedVisibleEntries/);
  assert.match(journal, /labels\.moreReflections/);
  assert.doesNotMatch(journal, /\{entry\.body\}<\/p>/);
  assert.match(modal, /messages\.map/);
  assert.match(modal, /messageTime/);
  assert.match(modal, /onAddReflection\(entry\.id, body\)/);
  assert.match(modal, /journalDisplayTitle/);
  assert.doesNotMatch(modal, />\s*\{ts\("labels\.reflection"\)\}\s*<\/h2>/);
  assert.match(modal, /className="relative pr-16"/);
});

test("Decision owns the live discernment readout", () => {
  const decisionPanel = app.slice(app.indexOf("function DecisionCompanionPanel"), app.indexOf("function ReflectPanel"));
  assert.match(decisionPanel, /discernmentResult/);
  assert.match(decisionPanel, /labels\.readinessSignal/);
  assert.match(decisionPanel, /labels\.counselStillNeeded/);
});

test("eligible answers promote one contextual continuation before secondary actions", () => {
  const currentCounsel = app.slice(app.indexOf("function CurrentCounselCard"), app.indexOf("function AnswerFeedback"));
  const continuationIndex = currentCounsel.indexOf("continuation.direction");
  const secondaryActionsIndex = currentCounsel.indexOf("{showDecisionActions ?");
  assert.ok(continuationIndex > 0);
  assert.ok(continuationIndex < secondaryActionsIndex);
  assert.match(currentCounsel, /onContinue\(exchange, continuation\)/);
  assert.doesNotMatch(currentCounsel, /line-clamp-2/);
  assert.doesNotMatch(currentCounsel, /line-clamp-3/);
  assert.match(currentCounsel, /disabled=\{isWorking\}/);
  const continuationHandler = app.slice(app.indexOf("function continueFromExchange"), app.indexOf("function waitFromExchange"));
  assert.match(continuationHandler, /setAnswerFocusId\("continuation-pending"\)/);
  assert.doesNotMatch(continuationHandler, /showView|setHomeSection/);
});

test("answer scripture evidence stays compact until requested", () => {
  const scriptureSources = app.slice(app.indexOf("function ScriptureChips"), app.indexOf("function escapeRegExp"));
  assert.match(scriptureSources, /aria-expanded=\{expanded\}/);
  assert.match(scriptureSources, /uniqueSources\.length/);
  assert.match(scriptureSources, /overflow-x-auto/);
  assert.doesNotMatch(scriptureSources, /scriptureDisplayLabel\(source\.scripture/);
});

test("Gratitude keeps optional postcard styling behind photo-aware disclosure", () => {
  const gratitude = app.slice(app.indexOf("function GratitudeLensPanel"), app.indexOf("function LibraryPanel"));
  assert.match(gratitude, /\{previewUrl \? \([\s\S]*?<DisclosureSection[\s\S]*?labels\.gratitudeStyleCard/);
  assert.match(gratitude, /compactCollapsed/);
  assert.match(gratitude, /showDetailsLabel=\{ts\('showDetails'\)\}/);
});
