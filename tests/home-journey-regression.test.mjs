import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8");

test("view changes dismiss stale workflow notices before showing the destination", () => {
  const navigation = app.slice(app.indexOf("const setActiveView = useCallback"), app.indexOf("const setHomeSection = useCallback"));
  assert.match(navigation, /setWorkflowNotice\(null\)/);
});

test("Home chooses one explainable next wise step and keeps secondary work resumable", () => {
  const home = app.slice(app.indexOf("function HomeDashboard"), app.indexOf("function WeeklyReviewRailStat"));
  assert.match(home, /const nextWiseStep = journeyItems\[0\]/);
  assert.match(home, /journey\.nextWiseStep/);
  assert.match(home, /journey\.whyThisStep/);
  assert.match(home, /journey\.continueTitle/);
  assert.match(home, /journeyItems\.slice\(1, 5\)/);
  assert.match(home, /continueJourneyRailHasOverflow \? <RailOverflowCorner/);
});

test("Home exposes a calm labeled shortcut to the canonical Scripture listening surface", () => {
  const home = app.slice(app.indexOf("function HomeDashboard"), app.indexOf("function WeeklyReviewRailStat"));
  const navigation = app.slice(app.indexOf("function openListenForScriptureFromHome"), app.indexOf("function carryCompanionCard"));
  assert.match(home, /onClick=\{onListenForScripture\}/);
  assert.match(home, /listen\.compactTitle/);
  assert.match(home, /listen\.compactBody/);
  assert.match(home, /<Mic size=\{18\}/);
  assert.match(home, /<BookOpen className="absolute -bottom-1 -right-1/);
  assert.match(navigation, /setRequestedLibrarySection\("listen"\)/);
  assert.match(navigation, /setListenOpenRequest\(\(current\) => current \+ 1\)/);
  assert.match(navigation, /surface: "home"/);
  assert.match(navigation, /destination: "listen"/);
  assert.match(navigation, /showView\("library"\)/);
});

test("Ask gives the mobile question composer primary visual weight", () => {
  const ask = app.slice(app.indexOf("function CompanionPanel"), app.indexOf("function CurrentCounselCard"));
  assert.match(ask, /data-testid="ask-question-composer"/);
  assert.match(ask, /min-h-36/);
  assert.match(ask, /placeholder=\{copy\.askPlaceholder\}/);
  assert.match(ask, /MessageCircle className="pointer-events-none absolute left-4 top-4/);
  assert.match(ask, /focus-visible:ring-4/);
  assert.match(ask, /linear-gradient\(145deg/);
});

test("journey priority covers reminders, counsel, active decisions, outcomes, and reflections", () => {
  const journey = app.slice(app.indexOf("const journeyItems = useMemo"), app.indexOf("const journeySearchItems = useMemo"));
  assert.match(journey, /kind: "reminder"/);
  assert.match(journey, /kind: "counsel"/);
  assert.match(journey, /kind: "decision"/);
  assert.match(journey, /journey\.outcomeReview/);
  assert.match(journey, /kind: "reflection"/);
  assert.match(journey, /right\.priority - left\.priority/);
});

test("journey search spans saved content and preserves exact destinations", () => {
  const search = app.slice(app.indexOf("const journeySearchItems = useMemo"), app.indexOf("// Get translated mode-specific content"));
  for (const category of ["decisionItems", "reflectionItems", "counselItems", "gratitudeItems", "scriptureItems", "ruleItems"]) {
    assert.match(search, new RegExp(`const ${category}`));
  }
  assert.match(search, /section: "journal", entryId: entry\.id/);
  assert.match(search, /section: "gratitude", entryId: entry\.id/);
  assert.match(search, /section: "counsel", entryId: summary\.id/);
  assert.match(search, /section: "saved", entryId: entry\.id/);
});

test("destination router opens the right surface before focusing an exact saved item", () => {
  const router = app.slice(app.indexOf("const openJourneyDestination"), app.indexOf("const openAccountFlow"));
  assert.match(router, /setPendingDecisionSection\(destination\.section\)/);
  assert.match(router, /setPendingCounselSummaryFocusId\(destination\.entryId\)/);
  assert.match(router, /setPendingJournalEntryFocusId\(destination\.entryId/);
  assert.match(router, /setPendingGratitudeEntryFocusId\(destination\.entryId/);
  assert.match(router, /setRequestedLibrarySection\(destination\.section\)/);
  assert.match(router, /setPendingLibraryEntryFocusId\(destination\.entryId/);
});

test("focused journal, gratitude, counsel, and Scripture items open after navigation", () => {
  const journal = app.slice(app.indexOf("function JournalPanel"), app.indexOf("function JournalEntryDetailModal"));
  const gratitude = app.slice(app.indexOf("function GratitudeLensPanel"), app.indexOf("function LibraryPanel"));
  const decision = app.slice(app.indexOf("function DecisionCompanionPanel"), app.indexOf("function ReflectPanel"));
  const library = app.slice(app.indexOf("function LibraryPanel"), app.indexOf("function JournalPanel"));
  assert.match(journal, /setSelectedEntryId\(pendingEntryFocusId\)/);
  assert.match(gratitude, /setGratitudeDetailOpen\(true\)/);
  assert.match(decision, /counselSummaryRefs\.current\.get\(pendingCounselSummaryFocusId\)/);
  assert.match(library, /savedScriptures\.find\(\(candidate\) => candidate\.id === pendingEntryFocusId\)/);
});

test("journey search keeps native button semantics", () => {
  const home = app.slice(app.indexOf("function HomeDashboard"), app.indexOf("function WeeklyReviewRailStat"));
  assert.doesNotMatch(home, /role="listitem"/);
  assert.doesNotMatch(home, /role="list"/);
});

test("weekly review notices unfinished learning without scores or judgment", () => {
  const review = app.slice(app.indexOf("const weeklyReview = useMemo"), app.indexOf("const journeyItems = useMemo"));
  assert.match(review, /unresolvedDecisions/);
  assert.match(review, /decisionsAwaitingCounsel/);
  assert.match(review, /continuedReflections/);
  assert.match(review, /outcomesAwaitingLearning/);
  assert.match(review, /observations/);
});

test("journal guidance scales from an open page to a deep review", () => {
  const journal = app.slice(app.indexOf("function JournalPanel"), app.indexOf("function JournalEntryDetailModal"));
  assert.match(journal, /"open" \| "gentle" \| "guided" \| "deep"/);
  assert.match(journal, /promptLevel === "open" \? 0/);
  assert.match(journal, /journey\.openPage/);
  assert.match(journal, /journey\.deepReview/);
  assert.match(journal, /aria-pressed=\{promptLevel === level\.id\}/);
});

test("counsel summary library supports search and lifecycle filters", () => {
  const decision = app.slice(app.indexOf("function DecisionCompanionPanel"), app.indexOf("function ReflectPanel"));
  assert.match(decision, /counselSummarySearch/);
  assert.match(decision, /counselSummaryFilter/);
  assert.match(decision, /summary\.lastSharedAt/);
  assert.match(decision, /summary\.status === "reminder_scheduled"/);
  assert.match(decision, /visibleCounselSummaries\.map/);
  assert.match(decision, /<CounselSummaryBody title=\{summary\.title\}/);
});

test("long counsel summaries render semantic sections, bullets, and Scripture anchors", () => {
  const summary = app.slice(app.indexOf("function CounselSummaryBody"), app.indexOf("function DecisionCompanionPanel"));
  assert.match(summary, /const hasHeading/);
  assert.match(summary, /<h5/);
  assert.match(summary, /<ul/);
  assert.match(summary, /scriptureAnchor/);
  assert.match(summary, /border-l-2 pl-3/);
});
