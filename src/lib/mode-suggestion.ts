import { MODE_KEYS, type Mode } from "@/lib/mode-keys";

export type ModeSuggestion = {
  mode: Mode;
  confidence: "high" | "very_high";
};

type ModeSignals = {
  phrases: string[];
  terms: string[];
};

const SIGNALS: Record<Mode, ModeSignals> = {
  [MODE_KEYS.MONEY]: {
    phrases: [
      "credit card", "pay off debt", "student loan", "home loan", "financial plan", "emergency fund",
      "tarjeta de crédito", "pagar deudas", "prêt étudiant", "carte de crédit", "schulden abzahlen",
      "kreditkarte", "cartão de crédito", "pagar dívida", "بطاقة ائتمان", "سداد الدين",
      "biyan bashi", "katin bashi", "kwụghachi ụgwọ", "kaadị kredit", "san gbese",
      "kaadi kirẹditi", "क्रेडिट कार्ड", "कर्ज चुकाना", "utang sa credit card", "bayaran ang utang",
    ],
    terms: [
      "budget", "debt", "loan", "mortgage", "saving", "savings", "invest", "investing", "finance", "financial",
      "presupuesto", "deuda", "préstamo", "ahorro", "invertir", "finanzas",
      "budget", "dette", "emprunt", "épargne", "investir", "finances",
      "haushalt", "schulden", "darlehen", "sparen", "investieren", "finanzen",
      "orçamento", "dívida", "empréstimo", "poupança", "investir", "finanças",
      "ميزانية", "دين", "قرض", "ادخار", "استثمار", "مال",
      "kasafi", "bashi", "rance", "ajiya", "zuba", "kuɗi",
      "mmefu", "ụgwọ", "mbinye", "ego",
      "isuna", "gbese", "awin", "ifowopamọ", "idoko",
      "बजट", "कर्ज", "ऋण", "बचत", "निवेश", "वित्त",
      "badyet", "utang", "pautang", "ipon", "pamumuhunan", "pera",
    ],
  },
  [MODE_KEYS.WORK]: {
    phrases: [
      "new job", "job offer", "leave my job", "quit my job", "career change", "start a business", "work burnout",
      "nuevo trabajo", "oferta de trabajo", "cambio de carrera", "dejar mi trabajo",
      "nouvel emploi", "offre d'emploi", "changer de carrière", "quitter mon emploi",
      "neuer job", "jobangebot", "karrierewechsel", "meinen job kündigen",
      "novo emprego", "oferta de emprego", "mudar de carreira", "deixar meu emprego",
      "وظيفة جديدة", "عرض عمل", "تغيير المسار المهني", "ترك عملي",
      "sabon aiki", "tayin aiki", "canjin sana'a", "barin aiki",
      "ọrụ ọhụrụ", "onyinye ọrụ", "mgbanwe ọrụ", "ịhapụ ọrụ",
      "iṣẹ tuntun", "ìfilọ́ iṣẹ́", "yí iṣẹ́ padà", "fi iṣẹ́ sílẹ̀",
      "नई नौकरी", "नौकरी का प्रस्ताव", "करियर बदलना", "नौकरी छोड़ना",
      "bagong trabaho", "alok na trabaho", "magpalit ng karera", "umalis sa trabaho",
    ],
    terms: [
      "job", "career", "workplace", "promotion", "interview", "resign", "burnout", "business", "leadership",
      "carrera", "ascenso", "entrevista", "renunciar", "agotamiento", "negocio", "liderazgo",
      "carrière", "promotion", "entretien", "démissionner", "épuisement", "entreprise", "leadership",
      "karriere", "beförderung", "vorstellungsgespräch", "kündigen", "burnout", "unternehmen", "führung",
      "carreira", "promoção", "entrevista", "demissão", "esgotamento", "negócio", "liderança",
      "مهنة", "ترقية", "مقابلة", "استقالة", "احتراق", "عمل", "قيادة",
      "sana'a", "matsayi", "hira", "murabus", "gajiya", "kasuwanci", "jagoranci",
      "ọrụ", "nkwalite", "ajụjụ ọnụ", "ịgba arụkwaghịm", "azụmahịa", "ndu",
      "iṣẹ́", "ìgbéga", "ifọrọwanilẹnuwo", "fífìṣẹ́sílẹ̀", "òwò", "aṣáájú",
      "करियर", "पदोन्नति", "साक्षात्कार", "इस्तीफा", "बर्नआउट", "व्यवसाय", "नेतृत्व",
      "karera", "promosyon", "interbyu", "magbitiw", "burnout", "negosyo", "pamumuno",
    ],
  },
  [MODE_KEYS.PURPOSE]: {
    phrases: [
      "meaning of my life", "what am i called to", "sense of direction", "who am i becoming", "next chapter of my life",
      "sentido de mi vida", "cuál es mi llamado", "sentido de dirección",
      "sens de ma vie", "quelle est ma vocation", "manque de direction",
      "sinn meines lebens", "wozu bin ich berufen", "keine richtung",
      "sentido da minha vida", "qual é meu chamado", "sem direção",
      "معنى حياتي", "ما هي دعوتي", "بلا اتجاه",
      "ma'anar rayuwata", "menene kirana", "rashin alkibla",
      "ihe ndụ m pụtara", "gịnị bụ ọkpụkpọ m", "enweghị ntụzịaka",
      "ìtumọ̀ ayé mi", "kí ni ìpè mi", "àìní ìtọ́sọ́nà",
      "मेरे जीवन का अर्थ", "मेरी बुलाहट क्या है", "दिशा नहीं",
      "kahulugan ng buhay ko", "ano ang tawag sa akin", "walang direksyon",
    ],
    terms: [
      "purpose", "identity", "direction", "meaning", "calling", "discernment", "values",
      "propósito", "identidad", "dirección", "sentido", "llamado", "discernimiento", "valores",
      "but", "identité", "direction", "sens", "vocation", "discernement", "valeurs",
      "zweck", "identität", "richtung", "sinn", "berufung", "werte",
      "propósito", "identidade", "direção", "sentido", "chamado", "discernimento", "valores",
      "هدف", "هوية", "اتجاه", "معنى", "دعوة", "تمييز", "قيم",
      "manufa", "asali", "alkibla", "ma'ana", "kira", "ƙimomi",
      "ebumnuche", "njirimara", "ntụzịaka", "pụtara", "ọkpụkpọ", "ụkpụrụ",
      "èrò", "ìdánimọ̀", "ìtọ́sọ́nà", "ìtumọ̀", "ìpè", "ìye",
      "उद्देश्य", "पहचान", "दिशा", "अर्थ", "बुलाहट", "विवेक", "मूल्य",
      "layunin", "pagkakakilanlan", "direksyon", "kahulugan", "tawag", "pagkilatis", "pagpapahalaga",
    ],
  },
  [MODE_KEYS.GENEROSITY]: {
    phrases: [
      "help family financially", "give to charity", "how much should i give", "lend money to family",
      "ayudar económicamente a mi familia", "dar a la caridad", "cuánto debo dar",
      "aider financièrement ma famille", "donner à une association", "combien donner",
      "familie finanziell unterstützen", "für wohltätigkeit spenden", "wie viel soll ich geben",
      "ajudar financeiramente a família", "doar para caridade", "quanto devo dar",
      "مساعدة عائلتي ماليًا", "التبرع للجمعيات الخيرية", "كم ينبغي أن أعطي",
      "taimaka wa iyali da kuɗi", "ba da sadaka", "nawa zan bayar",
      "nyere ezinụlọ ego", "nye onyinye ebere", "ego ole ka m nye",
      "ran ẹbí lọ́wọ́", "fún aláàánú", "mélòó ni kí n fún",
      "परिवार की आर्थिक मदद", "दान में देना", "कितना देना चाहिए",
      "tulungan ang pamilya sa pera", "magbigay sa kawanggawa", "magkano ang ibibigay",
    ],
    terms: [
      "generosity", "donate", "donation", "charity", "tithe", "giving", "alms",
      "generosidad", "donar", "donación", "caridad", "diezmo", "limosna",
      "générosité", "donner", "don", "charité", "dîme", "aumône",
      "großzügigkeit", "spenden", "spende", "wohltätigkeit", "zehnt", "almosen",
      "generosidade", "doar", "doação", "caridade", "dízimo", "esmola",
      "كرم", "تبرع", "صدقة", "عشور", "عطاء",
      "karimci", "sadaka", "zakkah", "bayarwa",
      "emesapụaka", "onyinye", "ebere", "otuụzọn'ụzọiri",
      "ọ̀làwọ́", "fífún", "àánú", "ìdámẹ́wàá",
      "उदारता", "दान", "चंदा", "दशमांश", "भिक्षा",
      "pagkabukas-palad", "mag-abuloy", "donasyon", "kawanggawa", "ikapu",
    ],
  },
  [MODE_KEYS.LIFE]: {
    phrases: [
      "family conflict", "marriage problem", "feel lonely", "sexual feelings", "mental health", "physical health",
      "conflicto familiar", "problema matrimonial", "me siento solo", "salud mental",
      "conflit familial", "problème de couple", "je me sens seul", "santé mentale",
      "familienkonflikt", "eheproblem", "ich fühle mich einsam", "psychische gesundheit",
      "conflito familiar", "problema no casamento", "me sinto sozinho", "saúde mental",
      "خلاف عائلي", "مشكلة زوجية", "أشعر بالوحدة", "الصحة النفسية",
      "rikicin iyali", "matsalar aure", "ina jin kaɗaici", "lafiyar kwakwalwa",
      "esemokwu ezinụlọ", "nsogbu alụmdi na nwunye", "owu na-ama m", "ahụike uche",
      "aáwọ̀ ẹbí", "ìṣòro ìgbéyàwó", "mo dá wà", "ìlera ọpọlọ",
      "पारिवारिक विवाद", "विवाह की समस्या", "अकेलापन महसूस", "मानसिक स्वास्थ्य",
      "alitan sa pamilya", "problema sa pag-aasawa", "pakiramdam na nag-iisa", "kalusugang pangkaisipan",
    ],
    terms: [
      "relationship", "marriage", "family", "forgive", "forgiveness", "conflict", "lonely", "loneliness", "addiction", "temptation", "sexuality", "health", "habit",
      "relación", "matrimonio", "familia", "perdonar", "perdón", "conflicto", "soledad", "adicción", "tentación", "sexualidad", "salud", "hábito",
      "relation", "mariage", "famille", "pardonner", "pardon", "conflit", "solitude", "dépendance", "tentation", "sexualité", "santé", "habitude",
      "beziehung", "ehe", "familie", "vergeben", "vergebung", "konflikt", "einsamkeit", "sucht", "versuchung", "sexualität", "gesundheit", "gewohnheit",
      "relacionamento", "casamento", "família", "perdoar", "perdão", "conflito", "solidão", "vício", "tentação", "sexualidade", "saúde", "hábito",
      "علاقة", "زواج", "عائلة", "يغفر", "غفران", "خلاف", "وحدة", "إدمان", "تجربة", "جنس", "صحة", "عادة",
      "dangantaka", "aure", "iyali", "gafara", "rikici", "kaɗaici", "jaraba", "lafiya", "ɗabi'a",
      "mmekọrịta", "alụmdi", "ezinụlọ", "mgbaghara", "esemokwu", "owu", "riri ahụ", "ọnwụnwa", "mmekọahụ", "ahụike", "omume",
      "ìbáṣepọ̀", "ìgbéyàwó", "ẹbí", "dáríjì", "ìdáríjì", "aáwọ̀", "ìdánìkan", "afẹsodi", "ìdẹwò", "ìbálòpọ̀", "ìlera", "àṣà",
      "रिश्ता", "विवाह", "परिवार", "माफ", "क्षमा", "विवाद", "अकेलापन", "लत", "प्रलोभन", "यौनिकता", "स्वास्थ्य", "आदत",
      "relasyon", "kasal", "pamilya", "magpatawad", "kapatawaran", "alitan", "kalungkutan", "pagkalulong", "tukso", "sekswalidad", "kalusugan", "gawi",
    ],
  },
};

function normalize(value: string) {
  return value.toLocaleLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();
}

function wordSet(value: string) {
  return new Set(normalize(value).match(/[\p{L}\p{M}\p{N}]+/gu) ?? []);
}

function scoreMode(question: string, words: Set<string>, signals: ModeSignals) {
  let score = 0;
  for (const phrase of signals.phrases) {
    if (question.includes(normalize(phrase))) score += 5;
  }
  for (const term of signals.terms) {
    if (words.has(normalize(term))) score += 2;
  }
  return score;
}

export function suggestModeForQuestion(question: string, currentMode: Mode): ModeSuggestion | null {
  const normalizedQuestion = normalize(question);
  const words = wordSet(normalizedQuestion);
  if (normalizedQuestion.length < 12 || words.size < 3) return null;

  const ranked = (Object.keys(SIGNALS) as Mode[])
    .map((mode) => ({ mode, score: scoreMode(normalizedQuestion, words, SIGNALS[mode]) }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const runnerUp = ranked[1];
  const currentScore = ranked.find((candidate) => candidate.mode === currentMode)?.score ?? 0;

  if (
    !best ||
    best.mode === currentMode ||
    best.score < 2 ||
    best.score - (runnerUp?.score ?? 0) < 2 ||
    best.score - currentScore < 2
  ) {
    return null;
  }

  const runnerUpScore = runnerUp?.score ?? 0;
  return {
    mode: best.mode,
    confidence: best.score >= 5 && best.score - runnerUpScore >= 4 && best.score - currentScore >= 4
      ? "very_high"
      : "high",
  };
}
