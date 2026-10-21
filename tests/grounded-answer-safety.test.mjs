import assert from "node:assert/strict";
import test from "node:test";

import { defaultPreferences, languages, normalizePreferences } from "../src/lib/localization.ts";
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
  assert.match(answer, /In Money mode, consider this through this lens/);
});

test("deterministic Ask Aletheia answers use the selected language in every supported locale", () => {
  const localizedOpenings = {
    en: /It makes sense/, de: /Es ist gut/, es: /Tiene sentido/, fr: /Il est juste/, pt: /Faz sentido/,
    yo: /Ó yẹ/, ig: /Ọ dị mma/, ha: /Ya dace/, tl: /Makabubuting/, ar: /من الحكمة/, hi: /इस प्रश्न/,
  };
  for (const language of Object.keys(languages)) {
    const preferences = normalizePreferences({ ...defaultPreferences, language });
    const answer = composeModeAwareFallbackResponse("A question", "Money", [], preferences);
    assert.match(answer, localizedOpenings[language], language);
    if (language !== "en") {
      assert.doesNotMatch(answer, /It makes sense|gives a helpful anchor|adds another layer|The deeper diagnostic|possible blind spot|wisdom support/, language);
    }
  }
});

test("deterministic non-English answers do not expose untranslated database wisdom fields", () => {
  const databaseOnlySource = {
    theme: "Formation",
    scripture: "Matthew 7:24-27",
    principle: "A life built on Jesus' words can withstand pressure.",
    context: "English-only database context.",
    application: "Test the decision against obedience rather than image or speed.",
    keywords: ["formation"],
    emotions: ["uncertainty"],
    questions: ["What foundation is this decision building on?"],
  };
  const preferences = normalizePreferences({ language: "de", region: "eu", bibleTranslation: "LUTH1912" });
  const answer = composeModeAwareFallbackResponse("Was mache ich mit meinem Leben?", "Life", [databaseOnlySource], preferences);
  assert.doesNotMatch(answer, /A life built|English-only|Test the decision|What foundation/);
  assert.match(answer, /hilfreiche biblische Orientierung/);
});
