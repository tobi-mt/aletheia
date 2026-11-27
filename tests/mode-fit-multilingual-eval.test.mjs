import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import cases from "./fixtures/mode-fit-multilingual.json" with { type: "json" };
import { isModeFitContinuation, modeFitExplicitGoal, suggestModeForQuestion } from "../src/lib/mode-suggestion.ts";

const goalCases = {
  en: ["My job, promotion and deadlines are taking over.", "How can I repair my marriage?", "How can I renegotiate my workload?", "What if they mention my promotion again?"],
  es: ["Mi empleo, el ascenso y los plazos me agobian.", "¿Cómo puedo reconstruir la confianza con mi pareja?", "¿Cómo puedo renegociar mi carga de trabajo?", "¿Qué pasa si ellos mencionan el ascenso?"],
  fr: ["Mon emploi, la promotion et les délais me stressent.", "Comment puis-je réparer mon couple ?", "Comment renégocier ma charge de travail ?", "Et s’ils mentionnent la promotion ?"],
  de: ["Mein Job und die Überstunden belasten mich.", "Wie kann ich meine Ehe retten?", "Wie kann ich meine Arbeitsbelastung neu verhandeln?", "Was, wenn sie die Beförderung erwähnen?"],
  pt: ["Meu trabalho e a promoção estão me deixando sob pressão.", "Como posso reconstruir a confiança no meu casamento?", "Como posso renegociar minha carga de trabalho?", "E se eles falarem da promoção?"],
  ar: ["العمل والترقية والمواعيد تضغط علي.", "كيف يمكنني إصلاح زواجي؟", "كيف يمكنني إعادة التفاوض بشأن عبء عملي؟", "ماذا لو ذكروا الترقية؟"],
  ha: ["Aikina da karin girma suna damuna.", "Ta yaya zan gyara aurena?", "Ta yaya zan sake tattauna nauyin aikina?", "Me zai faru idan su ma suka ambaci karin girma?"],
  ig: ["Ọrụ na nkwalite na-enye m nsogbu.", "Kedu ka m ga-esi idozi alụmdi na nwunye m?", "Kedu ka m ga-esi kparịta ibu ọrụ m ọzọ?", "Gịnị ma ọ bụrụ na ha ekwuo banyere nkwalite?"],
  yo: ["Iṣẹ́ àti ìgbéga ń fa ìdààmú fún mi.", "Báwo ni mo ṣe lè tún ìgbéyàwó mi ṣe?", "Báwo ni mo ṣe lè tún jíròrò ẹrù iṣẹ́ mi?", "Kí ló ṣẹlẹ̀ tí wọ́n bá mẹ́nuba ìgbéga?"],
  hi: ["नौकरी और पदोन्नति का दबाव बहुत है।", "मैं अपनी शादी कैसे बचाऊँ?", "मैं काम का बोझ कम करने की बात कैसे करूँ?", "अगर वे पदोन्नति की बात फिर करें तो?"],
  tl: ["Naiipit ako sa trabaho at sa usapin ng promosyon.", "Paano ko ayusin ang pagsasama namin?", "Paano ko muling pag-usapan ang dami ng trabaho ko?", "Paano kung sila ang magbanggit ng promosyon?"],
};

test("multilingual mode-fit evaluation corpus protects every supported language", () => {
  const coveredLanguages = new Set(cases.map((entry) => entry.language));
  assert.deepEqual([...coveredLanguages].sort(), ["ar", "de", "en", "es", "fr", "ha", "hi", "ig", "pt", "tl", "yo"]);
  for (const entry of cases) {
    const result = suggestModeForQuestion(entry.question, entry.selectedMode);
    assert.equal(result?.mode ?? null, entry.expectedMode, `${entry.language}: ${entry.question}`);
  }
});

test("localized explicit outcomes outrank common background and follow-ups preserve the lens", () => {
  for (const [language, [background, relationship, workload, followUp]] of Object.entries(goalCases)) {
    for (const [ask, expected] of [[relationship, "Life"], [workload, "Work"]]) {
      assert.equal(modeFitExplicitGoal(`${background} ${ask}`), expected, language);
      assert.equal(suggestModeForQuestion(`${background} ${ask}`, "Money")?.mode, expected, language);
    }
    assert.equal(suggestModeForQuestion(`${workload} ${relationship}`, "Money"), null, language);
    assert.equal(isModeFitContinuation(followUp), true, language);
  }
  assert.equal(modeFitExplicitGoal("¿Cómo puedo pagar el alquiler sin renegociar mi carga de trabajo?"), "Money");
  assert.equal(modeFitExplicitGoal("Comment puis-je réparer mon couple sans renégocier ma charge de travail ?"), "Life");
});

test("every locale has complete Auto-Fit copy without English fallbacks or broken substitutions", () => {
  const readCopy = (locale) => JSON.parse(readFileSync(new URL(`../src/locales/${locale}.json`, import.meta.url), "utf8")).modeSuggestion;
  const english = readCopy("en");
  for (const locale of Object.keys(goalCases)) {
    const copy = readCopy(locale);
    for (const [key, value] of Object.entries(english)) {
      assert.ok(copy[key]?.trim(), `${locale}: ${key}`);
      assert.deepEqual(copy[key].match(/\{[^}]+\}/g)?.sort(), value.match(/\{[^}]+\}/g)?.sort(), `${locale}: ${key}`);
      if (locale !== "en") assert.notEqual(copy[key], value, `${locale}: ${key}`);
    }
  }
});
