import { MODE_KEYS, type Mode } from "@/lib/mode-keys";

export type ModeSuggestion = {
  mode: Mode;
  confidence: "high" | "very_high";
  evidence: "explicit_phrase" | "context_pair" | "multiple_signals" | "distinct_signal" | "semantic";
  topic?: string;
};

type ModeSuggestionContext = {
  followUp?: boolean;
};

// These cues describe an expressed goal, not a condition inferred from emotion.
const FOCUSED_GOALS: Array<{ mode: Mode; cue: RegExp }> = [
  { mode: MODE_KEYS.LIFE, cue: /\b(?:repair|rebuild|protect|save|restore|heal)\b.{0,45}\b(?:marriage|friendship|health|relationship(?! with (?:my |our |the )?(?:boss|manager|team|coworker))|trust with (?:my |our )?(?:spouse|partner|family|friend|child))\b|\b(?:reconstruir|reparar|salvar|proteger)\b.{0,45}\b(?:matrimonio|relacion|casamento|relacionamento)\b|\b(?:reparer|sauver|reconstruire)\b.{0,45}\b(?:couple|mariage)\b/u },
  { mode: MODE_KEYS.PURPOSE, cue: /\b(?:stop|quit|learn not to)\b.{0,45}\b(?:tying|basing|measuring|judging|defining)\b.{0,45}\b(?:worth|value|identity)\b|\b(?:who i am|my worth|my value)\b.{0,30}\b(?:depends on|is tied to)\b/u },
  { mode: MODE_KEYS.GENEROSITY, cue: /\b(?:say no|set (?:a )?limit|set boundaries)\b.{0,70}\b(?:lend|giving|bail(?:ing)? out|financial help|asking for money)\b|\b(?:decir que no|poner limites)\b.{0,65}\b(?:prestar|dinero|ayuda economica)\b/u },
  { mode: MODE_KEYS.MONEY, cue: /\b(?:cover|make|pay)\b.{0,30}\b(?:rent|mortgage|bills|essentials)\b|\b(?:stretch|balance|rebuild)\b.{0,35}\b(?:budget|savings)\b/u },
  { mode: MODE_KEYS.WORK, cue: /\b(?:negotiate|renegotiate|reduce|prioritize)\b.{0,40}\b(?:workload|deadlines?|hours|responsibilities|job duties)\b/u },
];

const LOCALIZED_GOALS: Record<Mode, string[]> = {
  Life: ["reconstruir la confianza con mi pareja", "réparer mon couple", "meine ehe retten", "reconstruir a confiança no meu casamento", "إصلاح زواجي", "gyara aurena", "idozi alụmdi na nwunye m", "tún ìgbéyàwó mi ṣe", "अपनी शादी कैसे बचाऊँ", "ayusin ang pagsasama namin"],
  Work: ["renegociar mi carga de trabajo", "renégocier ma charge de travail", "meine arbeitsbelastung neu verhandeln", "renegociar minha carga de trabalho", "إعادة التفاوض بشأن عبء عملي", "sake tattauna nauyin aikina", "kparịta ibu ọrụ m ọzọ", "tún jíròrò ẹrù iṣẹ́ mi", "काम का बोझ कम करने की बात कैसे करूँ", "muling pag-usapan ang dami ng trabaho ko"],
  Purpose: ["dejar de medir mi valor por mis logros", "arrêter de mesurer ma valeur à mes réussites", "meinen wert nicht mehr an meiner leistung messen", "parar de medir meu valor pelas minhas conquistas", "أتوقف عن قياس قيمتي بإنجازاتي", "daina auna kimata da nasarorina", "kwụsị iji ihe m rụzuru tụọ uru m", "dáwọ́ wíwọ̀n iyì mi pẹ̀lú àṣeyọrí mi dúró", "अपनी उपलब्धियों से अपना मूल्य आँकना कैसे छोड़ूँ", "itigil ang pagsukat ng halaga ko sa mga tagumpay ko"],
  Money: ["pagar el alquiler", "payer mon loyer", "meine miete bezahlen", "pagar meu aluguel", "دفع الإيجار", "biya kuɗin haya", "kwụọ ụgwọ ụlọ", "san owó ilé", "किराया कैसे चुकाऊँ", "bayaran ang upa"],
  Generosity: ["poner límites a los préstamos", "poser des limites aux prêts", "beim geldleihen grenzen setzen", "impor limites aos empréstimos", "أضع حدودا للإقراض", "sanya iyaka ga aron kuɗi", "tinye oke n'ibinye ego", "fi ààlà sí yíyá owó", "उधार देने की सीमा कैसे तय करूँ", "magtakda ng hangganan sa pagpapautang"],
};

const ASK_START = /^(?:how|what|should|can|i (?:want|need) to|como|que puedo|comment|wie|كيف|ta yaya|kedu ka|bawo ni|paano)(?=\s)/u;
const HINDI_ASK = /(?:^|\s)(?:कैसे|क्या)(?=\s|$)/u;

const LIFE_MEANING_CUES = [
  /\bwhat(?: is|'s) (?:life (?:all )?about|(?:the )?(?:meaning|purpose|point) of (?:my |our )?(?:life(?!\s+insurance)|lives))\b/u,
  /\bwhat does life mean\b|\bwhat are we living for\b/u,
  /^why (?:am i here|do we exist|are we alive)[?.!]*$/u,
  /\b(?:sentido|proposito) de la vida\b|\bsens de la vie\b|\bsinn des lebens\b|\b(?:sentido|proposito) da vida\b/u,
  /معنى الحياة|هدف الحياة|ma'anar rayuwa|nzube ndu|itumo aye|जीवन का (?:अर्थ|उद्देश्य)|kahulugan ng buhay/u,
];

export function isLifeMeaningQuestion(question: string) {
  const normalized = normalize(question);
  return LIFE_MEANING_CUES.some((cue) => cue.test(normalized));
}

type ModeSignals = {
  phrases: string[];
  terms: string[];
  contextPairs?: Array<{ intent: string[]; context: string[] }>;
};

const SIGNALS: Record<Mode, ModeSignals> = {
  [MODE_KEYS.MONEY]: {
    contextPairs: [
      { intent: ["afford", "pay", "cost"], context: ["home", "house", "car", "rent", "bill"] },
      { intent: ["anxious", "anxiety", "afraid", "fear", "worry", "secure", "enough", "comparison"], context: ["money", "income", "debt", "saving", "spending", "financial"] },
      { intent: ["impuls", "control", "avoid", "regret"], context: ["spend", "buy", "purchase", "money", "budget"] },
    ],
    phrases: [
      "credit card", "pay off debt", "student loan", "home loan", "financial plan", "emergency fund",
      "money anxiety", "financially safe", "never have enough money", "impulse spending", "afraid of running out of money",
      "tarjeta de crédito", "pagar deudas", "prêt étudiant", "carte de crédit", "schulden abzahlen",
      "kreditkarte", "cartão de crédito", "pagar dívida", "بطاقة ائتمان", "سداد الدين",
      "biyan bashi", "katin bashi", "kwụghachi ụgwọ", "kaadị kredit", "san gbese",
      "kaadi kirẹditi", "क्रेडिट कार्ड", "कर्ज चुकाना", "utang sa credit card", "bayaran ang utang",
    ],
    terms: [
      "budget", "debt", "loan", "mortgage", "saving", "savings", "invest", "investing", "finance", "financial", "income", "expense", "expenses", "retirement", "taxes",
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
    contextPairs: [
      { intent: ["productiv", "focus", "efficient", "procrastinat", "perform"], context: ["work", "job", "office", "career", "profession"] },
      { intent: ["lead", "manag", "delegat"], context: ["team", "employee", "staff", "coworker", "project"] },
      { intent: ["prove", "worth", "approval", "fail", "disappoint", "perform"], context: ["boss", "manager", "work", "job", "career", "team"] },
      { intent: ["overwhelm", "exhaust", "burnout", "boundary", "rest"], context: ["work", "job", "manager", "deadline", "career", "office"] },
    ],
    phrases: [
      "new job", "job offer", "leave my job", "quit my job", "career change", "start a business", "work burnout",
      "work is consuming me", "disappoint my boss", "prove myself at work", "worth through work", "no boundaries at work",
      "productive at work", "productivity at work", "more productive at work", "focus at work", "work productivity",
      "nuevo trabajo", "oferta de trabajo", "cambio de carrera", "dejar mi trabajo",
      "productivo en el trabajo", "productiva en el trabajo", "productividad en el trabajo",
      "nouvel emploi", "offre d'emploi", "changer de carrière", "quitter mon emploi",
      "productif au travail", "productive au travail", "productivité au travail",
      "neuer job", "jobangebot", "karrierewechsel", "meinen job kündigen",
      "produktiv bei der arbeit", "produktivität bei der arbeit",
      "novo emprego", "oferta de emprego", "mudar de carreira", "deixar meu emprego",
      "produtivo no trabalho", "produtiva no trabalho", "produtividade no trabalho",
      "وظيفة جديدة", "عرض عمل", "عرض العمل", "تغيير المسار المهني", "ترك عملي",
      "الإنتاجية في العمل", "أكثر إنتاجية في العمل",
      "sabon aiki", "tayin aiki", "canjin sana'a", "barin aiki",
      "ƙwazo a wurin aiki", "yawan aiki a wurin aiki",
      "ọrụ ọhụrụ", "onyinye ọrụ", "mgbanwe ọrụ", "ịhapụ ọrụ",
      "ịrụpụta ihe n'ọrụ", "ịrụsi ọrụ ike n'ọrụ",
      "iṣẹ tuntun", "ìfilọ́ iṣẹ́", "yí iṣẹ́ padà", "fi iṣẹ́ sílẹ̀",
      "mú iṣẹ́ jáde dáadáa", "ìṣiṣẹ́ jáde níbi iṣẹ́",
      "नई नौकरी", "नौकरी का प्रस्ताव", "करियर बदलना", "नौकरी छोड़ना",
      "काम में उत्पादक", "कार्यस्थल पर उत्पादकता",
      "bagong trabaho", "alok na trabaho", "magpalit ng karera", "umalis sa trabaho",
      "produktibo sa trabaho", "pagiging produktibo sa trabaho",
    ],
    terms: [
      "job", "career", "workplace", "promotion", "interview", "resign", "burnout", "business", "leadership",
      "deadline", "deadlines", "manager", "coworker", "coworkers", "meeting", "meetings", "workload", "project", "projects", "office",
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
    contextPairs: [
      { intent: ["lost", "stuck", "uncertain", "confus"], context: ["direction", "calling", "purpose", "meaning", "future"] },
      { intent: ["prove", "worth", "identity", "approval", "fear", "afraid"], context: ["success", "future", "path", "calling", "direction", "choice"] },
      { intent: ["pressure", "expect", "supposed"], context: ["purpose", "path", "future", "calling", "direction"] },
    ],
    phrases: [
      "meaning of my life", "what am i called to", "sense of direction", "who am i becoming", "next chapter of my life",
      "what should i do with my life", "afraid of choosing wrong", "trying to prove myself", "everyone expects me to",
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
      "purpose", "purposeful", "purposefully", "identity", "direction", "meaning", "calling", "discernment", "values", "legacy", "vocation",
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
    contextPairs: [
      { intent: ["help", "support", "lend", "give"], context: ["financial", "money", "rent", "bill", "debt"] },
      { intent: ["guilt", "obligat", "pressure", "afraid", "boundary", "resent", "no"], context: ["give", "help", "support", "lend", "family", "charity"] },
      { intent: ["rescu", "enable", "responsib"], context: ["family", "friend", "give", "help", "money"] },
    ],
    phrases: [
      "help family financially", "give to charity", "how much should i give", "lend money to family",
      "feel guilty saying no", "afraid to say no", "keep rescuing", "they depend on me financially",
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
      "generosity", "donate", "donation", "charity", "tithe", "giving", "alms", "fundraiser", "philanthropy",
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
    contextPairs: [
      { intent: ["heal", "repair", "improve", "struggl"], context: ["marriage", "relationship", "family", "friendship", "health"] },
      { intent: ["shame", "ashamed", "hide", "lonely", "isolat", "stuck"], context: ["habit", "relationship", "family", "addiction", "temptation", "health"] },
      { intent: ["safe", "unsafe", "abuse", "harm", "control"], context: ["relationship", "marriage", "family", "home"] },
    ],
    phrases: [
      "family conflict", "marriage problem", "feel lonely", "sexual feelings", "mental health", "physical health",
      "ashamed of this habit", "unsafe in my relationship", "cannot stop hiding", "can't stop hiding", "relationship is controlling",
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
      "sleep", "grief", "anxiety", "friendship", "parenting", "rest", "recovery",
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
  return value.toLowerCase().normalize("NFKD")
    .replace(/(\p{Script=Latin})\p{M}+/gu, "$1")
    .replace(/[\u064b-\u065f\u0670]/gu, "")
    .replace(/[‘’]/gu, "'").replace(/\s+/gu, " ").trim();
}

function wordSet(value: string) {
  return new Set(value.match(/[\p{L}\p{M}\p{N}]+/gu) ?? []);
}

function hasConcept(words: Set<string>, concepts: string[]) {
  return concepts.some((concept) => {
    const normalizedConcept = normalize(concept);
    return [...words].some((word) => word === normalizedConcept || (normalizedConcept.length >= 4 && word.startsWith(normalizedConcept)));
  });
}

function scoreMode(question: string, words: Set<string>, signals: ModeSignals) {
  const key = (value: string) => ` ${[...(value.match(/[\p{L}\p{M}\p{N}']+/gu) ?? [])].join(" ")} `;
  const questionKey = key(question);
  const phraseMatches = new Set(signals.phrases.map(normalize).filter((phrase) => questionKey.includes(key(phrase))));
  const termMatches = new Set(signals.terms.map(normalize).filter((term) => words.has(term)));
  const contextPairMatches = (signals.contextPairs ?? []).filter(
    (pair) => hasConcept(words, pair.intent) && hasConcept(words, pair.context),
  ).length;
  return {
    score: phraseMatches.size * 5 + contextPairMatches * 5 + termMatches.size * 2,
    phraseMatches: phraseMatches.size,
    contextPairMatches,
    termMatches: termMatches.size,
  };
}

function focusedGoals(question: string) {
  const asks = question.split(/[.!?¿؟;।]+|\s+(?:but|pero|mas|mais|aber|لكن|amma|mana|sugbon|लेकिन)\s+/u)
    .map((clause) => clause.trim())
    .filter((clause) => ASK_START.test(clause) || HINDI_ASK.test(clause))
    .map((clause) => clause.split(/\s+(?:without|rather than|instead of|sin|sans|sem|ohne|دون|ba tare da|n'eghi|lai|nang hindi)\s+/u, 1)[0]);
  return FOCUSED_GOALS.filter(({ mode, cue }) => asks.some((clause) =>
    cue.test(clause) || LOCALIZED_GOALS[mode].some((goal) => ` ${clause} `.includes(` ${normalize(goal)} `))
    || (mode === MODE_KEYS.PURPOSE && isLifeMeaningQuestion(clause)),
  ));
}

export function modeFitExplicitGoal(question: string) {
  const goals = focusedGoals(normalize(question));
  if (!goals.length && isLifeMeaningQuestion(question)) return MODE_KEYS.PURPOSE;
  return goals.length === 1 ? goals[0].mode : null;
}

export function hasCompetingModeFitGoals(question: string) {
  return focusedGoals(normalize(question)).length > 1;
}

export function isModeFitContinuation(question: string) {
  const normalized = normalize(question).replace(/^[¿¡]+/u, "");
  return /^(?:and |but |so )?(?:what (?:about|if) (?:it|that|this|they|he|she|the other option)\b|how (?:do|can|should) i (?:say|do|handle|start) (?:it|that|this)\b|can you (?:say more|explain that)\b|tell me more\b)/u.test(normalized)
    || /^(?:que pasa si (?:ellos|ellas|eso)|et s(?:'ils|'elles|i cela)|was,? wenn (?:sie|das)|e se (?:eles|elas|isso)|ماذا لو|me zai faru idan (?:su|hakan)|gini ma o buru na ha|ki lo sele ti won ba|अगर वे|paano kung (?:sila|iyon))(?=$|[^\p{L}\p{M}])/u.test(normalized);
}

export function suggestModeForQuestion(
  question: string,
  currentMode: Mode,
  context: ModeSuggestionContext = {},
): ModeSuggestion | null {
  const normalizedQuestion = normalize(question);
  const words = wordSet(normalizedQuestion);
  const goals = focusedGoals(normalizedQuestion);
  if (goals.length > 1) return null;
  if (goals.length === 1) {
    const goal = goals[0].mode;
    return goal === currentMode ? null : { mode: goal, confidence: "very_high", evidence: "context_pair" };
  }
  if (isLifeMeaningQuestion(question)) {
    return currentMode === MODE_KEYS.PURPOSE ? null : { mode: MODE_KEYS.PURPOSE, confidence: "very_high", evidence: "explicit_phrase" };
  }
  if (normalizedQuestion.length < 12 || words.size < 3) return null;
  if (isModeFitContinuation(normalizedQuestion)) return null;

  const ranked = (Object.keys(SIGNALS) as Mode[])
    .map((mode) => ({ mode, ...scoreMode(normalizedQuestion, words, SIGNALS[mode]) }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const runnerUp = ranked[1];
  const currentScore = ranked.find((candidate) => candidate.mode === currentMode)?.score ?? 0;
  const joinsDistinctConcerns = /\b(so|because|while|but|and|para|porque|mientras|mais|pendant|aber|während|damit|mas|enquanto)\b/u.test(normalizedQuestion);

  if (
    !best ||
    best.mode === currentMode ||
    (joinsDistinctConcerns && (runnerUp?.score ?? 0) >= 2 && best.score - (runnerUp?.score ?? 0) < 6) ||
    best.score < 2 ||
    best.score - (runnerUp?.score ?? 0) < 2 ||
    best.score - currentScore < 2
  ) {
    return null;
  }

  const runnerUpScore = runnerUp?.score ?? 0;
  const evidence = best.phraseMatches > 0
    ? "explicit_phrase"
    : best.contextPairMatches > 0
      ? "context_pair"
    : best.termMatches >= 2
      ? "multiple_signals"
      : "distinct_signal";
  const suggestion: ModeSuggestion = {
    mode: best.mode,
    confidence: (best.phraseMatches > 0 || best.contextPairMatches > 0 || best.termMatches >= 2)
      && best.score - runnerUpScore >= 4
      && best.score - currentScore >= 4
      ? "very_high"
      : "high",
    evidence,
  };
  return context.followUp && suggestion.confidence !== "very_high" ? null : suggestion;
}
