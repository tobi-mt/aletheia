import assert from "node:assert/strict";
import test from "node:test";
import { journalDisplayTitle } from "../src/lib/journal-title.ts";

test("generic reflection titles remain untitled instead of repeating the prompt", () => {
  assert.equal(
    journalDisplayTitle({
      title: "Money Reflection",
      body: "Long counsel follows.",
      prompt: "Should I wait before making this purchase?",
      modeLabel: "Money",
      reflectionLabel: "Reflection",
    }),
    null
  );
});

test("a deliberate title is preserved while a title copied from content is omitted", () => {
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
  assert.equal(
    journalDisplayTitle({
      title: "What does the Bible say about sexuality and…",
      body: "Full counsel follows.",
      prompt: "What does the Bible say about sexuality and feelings?",
      modeLabel: "Money",
      reflectionLabel: "Reflection",
    }),
    null
  );
});
