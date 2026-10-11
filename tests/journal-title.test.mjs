import assert from "node:assert/strict";
import test from "node:test";
import { deriveJournalTitle, journalDisplayTitle } from "../src/lib/journal-title.ts";

test("journal titles become short, readable phrases without inventing content", () => {
  assert.equal(
    deriveJournalTitle("How can I practice faithful stewardship with today's money and work choices?"),
    "How can I practice faithful stewardship with today's…"
  );
  assert.equal(deriveJournalTitle("I noticed peace after asking for counsel."), "I noticed peace after asking for counsel");
  assert.equal(deriveJournalTitle("Peace"), null);
});

test("generic reflection titles are replaced from the saved prompt", () => {
  assert.equal(
    journalDisplayTitle({
      title: "Money Reflection",
      body: "Long counsel follows.",
      prompt: "Should I wait before making this purchase?",
      modeLabel: "Money",
      reflectionLabel: "Reflection",
    }),
    "Should I wait before making this purchase"
  );
});

test("a deliberate title is preserved and weak content can remain untitled", () => {
  assert.equal(
    journalDisplayTitle({
      title: "A slower yes",
      body: "Body",
      modeLabel: "Purpose",
      reflectionLabel: "Reflection",
    }),
    "A slower yes"
  );
  assert.equal(
    journalDisplayTitle({
      title: "Reflection",
      body: "Peace",
      modeLabel: "Life",
      reflectionLabel: "Reflection",
    }),
    null
  );
});
