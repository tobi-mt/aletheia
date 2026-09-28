import assert from "node:assert/strict";
import test from "node:test";

import { defaultPreferences } from "../src/lib/localization.ts";
import { composeModeAwareFallbackResponse } from "../src/lib/wisdom.ts";

test("grounded answers never expose internal preference instructions", () => {
  const answer = composeModeAwareFallbackResponse(
    "How can I make a patient decision?",
    "Money",
    [],
    defaultPreferences
  );
  assert.doesNotMatch(answer, /Preference note:|respond for .* readers|where curated text is available/i);
  assert.doesNotMatch(answer, /This reference is part of Aletheia's curated wisdom library/i);
  assert.match(answer, /Because you are in Money mode/);
});
