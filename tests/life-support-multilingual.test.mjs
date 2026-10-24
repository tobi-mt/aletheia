import assert from "node:assert/strict";
import test from "node:test";

import { detectLifeSupportConcern } from "../src/lib/life-support.ts";

const crisisCases = [
  ["en", "I want to end my life"],
  ["es", "Quiero acabar con mi vida"],
  ["fr", "Je veux mettre fin à ma vie"],
  ["pt", "Quero acabar com minha vida"],
  ["de", "Ich will mein Leben beenden"],
  ["yo", "Mo fẹ́ pa ara mi"],
  ["ig", "Achọrọ m ịnwụ"],
  ["ha", "Ina son kashe kaina"],
  ["tl", "Gusto kong wakasan ang buhay ko"],
  ["ar", "أريد أن أنهي حياتي"],
  ["hi", "मैं अपना जीवन समाप्त करना चाहता हूँ"],
];

test("detects immediate self-harm concern in every supported language", () => {
  for (const [language, question] of crisisCases) {
    assert.equal(detectLifeSupportConcern(question), "self_harm", `${language}: ${question}`);
  }
});

test("does not classify ordinary difficult decisions as self-harm", () => {
  const ordinaryQuestions = [
    "Should I end this business partnership?",
    "Soll ich diesen Vertrag beenden?",
    "¿Debo terminar este proyecto?",
    "هل يجب أن أنهي هذا المشروع؟",
  ];
  for (const question of ordinaryQuestions) {
    assert.notEqual(detectLifeSupportConcern(question), "self_harm", question);
  }
});
