import assert from "node:assert/strict";
import test from "node:test";

import { defaultPreferences, languages, localizedCrisisSupportCopy, normalizePreferences } from "../src/lib/localization.ts";
import { composeCompanionCounsel } from "../src/lib/companion-counsel.ts";
import { scriptureCounselIndex } from "../src/lib/scripture-counsel-index.ts";
import { wisdomEntries } from "../src/lib/wisdom-data.ts";
import { rankWisdomEvidence } from "../src/lib/wisdom.ts";
import { generateWisdomIntelligence } from "../src/lib/wisdom-intelligence.ts";

test("the actual deterministic answer addresses exhaustion before citing Scripture and ends with one next step", async () => {
  const question = "Should I accept a promotion when I already feel exhausted?";
  const sources = rankWisdomEvidence(scriptureCounselIndex, question, "Work");
  const result = await generateWisdomIntelligence({
    question, selectedMode: "Work", sources, preferences: defaultPreferences, allowModel: false, forceSelectedMode: true,
  });
  const [opening, firstAnchor, secondAnchor, nextStep] = result.counsel.split("\n\n");
  assert.match(opening, /good opportunity.*too much.*exhaustion/i);
  assert.match(firstAnchor, /Matthew 11:28-30|Mark 6:31/);
  assert.ok(secondAnchor.includes(result.biblicalEvidence[1].reference));
  assert.match(nextStep, /ask what would come off your plate/);
  assert.equal(result.counsel.split("\n\n").length, 4);
  assert.equal(result.quality.checks.biblicalGrounding, true);
});

test("crisis fallback puts immediate human help before one Scripture anchor", () => {
  const preferences = normalizePreferences({ language: "es" });
  const ranked = scriptureCounselIndex.filter(({ scripture }) => ["Isaiah 41:10", "Matthew 11:28-30"].includes(scripture));
  const result = composeCompanionCounsel("Quiero morir.", ranked, preferences);
  const paragraphs = result.text.split("\n\n");
  assert.equal(paragraphs[1], localizedCrisisSupportCopy("es").selfHarmImmediate);
  assert.equal(result.biblicalEvidence.length, 1);
  assert.equal(paragraphs.at(-1), result.biblicalEvidence[0].connection);
});

test("fallback respects a closed workload negotiation instead of asking again", () => {
  const question = "I asked about taking a promotion while exhausted. My manager will not remove any duties. How can I respond without sounding ungrateful?";
  const result = composeCompanionCounsel(question, rankWisdomEvidence(scriptureCounselIndex, question, "Work"));
  assert.match(result.nextStep, /thank you.*can’t commit/is);
  assert.doesNotMatch(result.text, /ask what would come off/i);
  assert.deepEqual(result.biblicalEvidence.map(({ reference }) => reference), ["Matthew 11:28-30", "Luke 14:28-30"]);
});

test("Spanish family-rest and French debt counsel get relevant localized passages and next steps", async () => {
  const cases = [
    ["es", "Life", "Mi madre quiere que la visite todos los fines de semana. La quiero, pero necesito descansar. ¿Cómo puedo hablar con ella sin sentir culpa?", ["Mark 6:31", "Galatians 6:2-5"], /Propón una fecha de visita/],
    ["fr", "Money", "J’ai des dettes et mon ami me presse d’investir avec lui. Comment décider sans me laisser pousser par la peur de rater une occasion ?", ["Proverbs 22:7", "Luke 14:28-30"], /notez vos remboursements obligatoires/],
  ];
  for (const [language, selectedMode, question, references, step] of cases) {
    const preferences = normalizePreferences({ language });
    const sources = rankWisdomEvidence([...wisdomEntries, ...scriptureCounselIndex], question, selectedMode);
    const result = await generateWisdomIntelligence({ question, selectedMode, sources, preferences, allowModel: false });
    assert.deepEqual(result.biblicalEvidence.map(({ reference }) => reference), references);
    assert.match(result.counsel.split("\n\n").at(-1), step);
    assert.doesNotMatch(result.counsel, /tentation|tentación|confesión/);
    assert.equal(result.quality.passed, true);
  }
});

test("grounded answers never expose internal preference instructions", () => {
  const { text: answer } = composeCompanionCounsel(
    "How can I make a patient decision?",
    [],
    defaultPreferences
  );
  assert.doesNotMatch(answer, /Preference note:|respond for .* readers|where curated text is available/i);
  assert.doesNotMatch(answer, /This reference is part of Aletheia's curated wisdom library/i);
  assert.doesNotMatch(answer, /In Money mode|deeper diagnostic|possible blind spot/i);
});

test("deterministic Ask Aletheia answers use the selected language in every supported locale", () => {
  const localizedOpenings = {
    en: /It makes sense/, de: /Es ist gut/, es: /Tiene sentido/, fr: /Il est juste/, pt: /Faz sentido/,
    yo: /Ó yẹ/, ig: /Ọ dị mma/, ha: /Ya dace/, tl: /Makabubuting/, ar: /من الحكمة/, hi: /इस प्रश्न/,
  };
  for (const language of Object.keys(languages)) {
    const preferences = normalizePreferences({ ...defaultPreferences, language });
    const { text: answer } = composeCompanionCounsel("A question", [], preferences);
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
  const { text: answer } = composeCompanionCounsel("Was mache ich mit meinem Leben?", [databaseOnlySource], preferences);
  assert.doesNotMatch(answer, /A life built|English-only|Test the decision|What foundation/);
  assert.match(answer, /hilfreiche biblische Orientierung/);
});
