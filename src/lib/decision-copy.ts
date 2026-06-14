import type { LanguageCode } from "./localization";

type DecisionCopy = {
  timelineReady: string;
  startedDiscerning: string;
  urgency: string;
  comparison: string;
  fear: string;
  active: (count: number) => string;
};

const decisionCopy: Partial<Record<LanguageCode, DecisionCopy>> = {
  en: {
    timelineReady: "Your timeline is ready to track decisions, patterns, counsel, and learning.",
    startedDiscerning: "Started discerning",
    urgency: "Urgency appears in your recent decisions. That does not make the desire wrong, but speed may be clouding wisdom.",
    comparison: "Comparison appears in your recent reflections. It may help to define enough before choosing more.",
    fear: "Fear appears in your recent discernment. Some fear calls for planning; some calls for release.",
    active: (count) => `You are carrying ${count} active decision${count === 1 ? "" : "s"}. Keep the next faithful step small and visible.`,
  },
  es: {
    timelineReady: "Tu línea de tiempo está lista para registrar decisiones, patrones, consejo y aprendizaje.",
    startedDiscerning: "Empezaste a discernir",
    urgency: "La urgencia asoma en tus decisiones recientes. Eso no vuelve malo el deseo, pero la prisa puede nublar la sabiduría.",
    comparison: "La comparación asoma en tus reflexiones recientes. Puede ayudar definir lo suficiente antes de elegir más.",
    fear: "El miedo asoma en tu discernimiento reciente. A veces pide plan; a veces, soltar.",
    active: (count) => `Tienes ${count} decisión${count === 1 ? "" : "es"} activa${count === 1 ? "" : "s"}. Mantén pequeño y visible el siguiente paso fiel.`,
  },
  fr: {
    timelineReady: "Votre chronologie est prête à suivre les décisions, les schémas, le conseil et l’apprentissage.",
    startedDiscerning: "Vous avez commencé à discerner",
    urgency: "L’urgence se fait sentir dans vos décisions récentes. Cela ne rend pas le désir mauvais, mais la vitesse peut brouiller la sagesse.",
    comparison: "La comparaison se fait sentir dans vos réflexions récentes. Il peut être utile de définir ce qui suffit avant de choisir davantage.",
    fear: "La peur se fait sentir dans votre discernement récent. Parfois elle invite à planifier; parfois, à lâcher prise.",
    active: (count) => `Vous avez ${count} décision${count === 1 ? "" : "s"} en cours. Gardez le prochain pas fidèle petit et bien visible.`,
  },
  pt: {
    timelineReady: "Sua linha do tempo está pronta para acompanhar decisões, padrões, conselho e aprendizado.",
    startedDiscerning: "Você começou a discernir",
    urgency: "A urgência aparece em suas decisões recentes. Isso não torna o desejo errado, mas a pressa pode estar ofuscando a sabedoria.",
    comparison: "A comparação aparece em suas reflexões recentes. Pode ajudar definir o suficiente antes de escolher mais.",
    fear: "O medo aparece em seu discernimento recente. Às vezes pede planejamento; às vezes, desapego.",
    active: (count) => `Você está com ${count} decisão${count === 1 ? "" : "es"} ativas. Mantenha pequeno e visível o próximo passo fiel.`,
  },
  de: {
    timelineReady: "Deine Zeitleiste ist bereit, Entscheidungen, Muster, Rat und Lernen im Blick zu behalten.",
    startedDiscerning: "Du hast begonnen zu unterscheiden",
    urgency: "Dringlichkeit zeigt sich in deinen jüngsten Entscheidungen. Das macht das Verlangen nicht falsch, aber Tempo kann die Weisheit vernebeln.",
    comparison: "Vergleich zeigt sich in deinen jüngsten Reflexionen. Es kann helfen, erst genug zu definieren, bevor du mehr wählst.",
    fear: "Angst zeigt sich in deinem jüngsten Abwägen. Manchmal braucht sie Planung, manchmal Loslassen.",
    active: (count) => `Du hast ${count} aktive Entscheidung${count === 1 ? "" : "en"}. Halte den nächsten treuen Schritt klein und sichtbar.`,
  },
  yo: {
    timelineReady: "Àkójọpọ̀ rẹ ti ṣetan láti tọ́pa àwọn ìpinnu, àwọn àpẹẹrẹ, ìmọ̀ràn, àti ẹ̀kọ́.",
    startedDiscerning: "O ti bẹ̀rẹ̀ sí í ronú jinlẹ̀",
    urgency: "Ìkánkán ń hàn nínú àwọn ìpinnu rẹ láìpẹ́. Èyí kò túmọ̀ sí pé ìfẹ́ náà buru, ṣùgbọ́n ìkánkán lè bo ọgbọ́n mọ́lẹ̀.",
    comparison: "Ìfiwéra ń hàn nínú àwọn ìrònú rẹ láìpẹ́. Ó lè ràn ẹ́ lọ́wọ́ láti mọ ohun tó tó kí o tó yan síi.",
    fear: "Ẹ̀rù ń hàn nínú ìmòye rẹ láìpẹ́. Díẹ̀ nínú ẹ̀rù ń béèrè fún ètò; díẹ̀ sì ń béèrè fún ìtúsílẹ̀.",
    active: (count) => `O ní ìpinnu ${count} tó ṣì ń lọ. Jẹ́ kí ìgbésẹ̀ olóòtítọ́ tó tẹ̀lé kéré, kí ó sì hàn gbangba.`,
  },
  ig: {
    timelineReady: "Usoro oge gị dị njikere ịdekọ mkpebi, usoro, ndụmọdụ na mmụta.",
    startedDiscerning: "Ị malitela ịtụle okwu a",
    urgency: "Ịsọ ọsọ na-apụta n’ime mkpebi gị nso nso a. Nke a anaghị eme ọchịchọ ahụ ihe ọjọọ, ma ọsọ ọsọ nwere ike ime ka amamihe kpuchie.",
    comparison: "Ịtụnyere na-apụta n’ime ntụgharị uche gị nso nso a. O nwere ike inye aka ịkọwa nke zuru ezu tupu ịhọrọ ọzọ.",
    fear: "Egwu na-apụta n’ime nghọta gị nso nso a. Ụfọdụ egwu chọrọ atụmatụ; ụfọdụ chọrọ ịhapụ ya.",
    active: (count) => `Ị nwere mkpebi ${count} na-aga n'ihu. Debe nzọụkwụ kwesịrị ntụkwasị obi na-esote ka ọ dị nta ma doo anya.`,
  },
  ha: {
    timelineReady: "Jadawalin lokacinka ya shirya don bin sawun shawarwari, alamu, shawara da koyo.",
    startedDiscerning: "Ka fara nazari",
    urgency: "Gaggawa ta bayyana a cikin shawarwarinka na baya-bayan nan. Wannan ba ya nufin burin bai dace ba, amma sauri na iya ɓoye hikima.",
    comparison: "Kwatantawa ta bayyana a cikin tunaninka na baya-bayan nan. Yana iya taimaka maka fayyace abin da ya isa kafin ka zaɓi ƙari.",
    fear: "Tsoro ya bayyana a cikin fahimtarka na baya-bayan nan. Wani tsoro yana bukatar tsari; wani kuma yana bukatar saki.",
    active: (count) => `Kana da shawarwari ${count} da ke ci gaba. Ka sanya mataki na aminci na gaba ya kasance ƙarami kuma a gani.`,
  },
};

function decisionCopyFor(language: LanguageCode): DecisionCopy {
  return decisionCopy[language] ?? decisionCopy.en!;
}

export function decisionTimelineObservation(
  language: LanguageCode,
  patterns: string[],
  activeCount: number,
): string {
  const copy = decisionCopyFor(language);
  if (patterns.includes("urgency")) {
    return copy.urgency;
  }
  if (patterns.includes("comparison")) {
    return copy.comparison;
  }
  if (patterns.includes("fear")) {
    return copy.fear;
  }
  if (activeCount > 0) {
    return copy.active(activeCount);
  }
  return copy.timelineReady;
}

export function decisionStartedDiscerningBody(language: LanguageCode, title: string): string {
  return `${decisionCopyFor(language).startedDiscerning}: ${title}`;
}

export function localizeDecisionEventBody(language: LanguageCode, eventType: string, body: string): string {
  if (eventType !== "created") {
    return body;
  }

  const title = body.replace(/^.*?:\s*/, "").trim();
  if (!title) {
    return body;
  }

  return decisionStartedDiscerningBody(language, title);
}
