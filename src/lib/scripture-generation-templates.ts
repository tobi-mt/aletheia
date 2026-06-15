export type GenerationLanguage = "en" | "es" | "fr" | "pt" | "de" | "yo" | "ig" | "ha" | "tl" | "ar" | "hi";

export type StudyThemeKey = "trust" | "stewardship" | "wisdom" | "generosity" | "perseverance";

export type StudyThemeTemplate = {
  key: StudyThemeKey;
  title: string;
  keywords: string[];
  insight: string;
  reflectionQuestion: string;
  action: string;
};

export type CompanionTemplate = {
  opening: string;
  reflectionQuestion: string;
};

const FALLBACK_LANGUAGE: GenerationLanguage = "en";

const SUPPORTED_LANGUAGES: GenerationLanguage[] = ["en", "es", "fr", "pt", "de", "yo", "ig", "ha", "tl", "ar", "hi"];

export function resolveGenerationLanguage(value: string | null | undefined): GenerationLanguage {
  const normalized = String(value ?? "").toLowerCase();
  return (SUPPORTED_LANGUAGES.find((code) => code === normalized) ?? FALLBACK_LANGUAGE) as GenerationLanguage;
}

const COMPANION_TEMPLATES: Record<GenerationLanguage, CompanionTemplate> = {
  en: {
    opening: "You do not have to decide from pressure today.",
    reflectionQuestion: "Where is wisdom asking me to slow down today?",
  },
  es: {
    opening: "No tienes que decidir desde la presión hoy.",
    reflectionQuestion: "¿Dónde me invita la sabiduría a bajar el ritmo hoy?",
  },
  fr: {
    opening: "Tu n'as pas besoin de décider sous pression aujourd'hui.",
    reflectionQuestion: "Où la sagesse m'invite-t-elle à ralentir aujourd'hui ?",
  },
  pt: {
    opening: "Hoje, você não precisa decidir sob pressão.",
    reflectionQuestion: "Onde a sabedoria me convida a desacelerar hoje?",
  },
  de: {
    opening: "Du musst heute nicht aus Druck heraus entscheiden.",
    reflectionQuestion: "Wo lädt Weisheit mich heute ein, langsamer zu werden?",
  },
  yo: {
    opening: "O ko ni lati pinnu lati inu titẹ loni.",
    reflectionQuestion: "Níbo ni ọgbọ́n ń pè mí láti dákẹ́ lónìí?",
  },
  ig: {
    opening: "I gaghị eme mkpebi site n'ike nrụgide taa.",
    reflectionQuestion: "Ebee ka amamihe na-akpọ m ka m belata ọsọ taa?",
  },
  ha: {
    opening: "Ba lallai ne ka yanke shawara daga matsin lamba yau ba.",
    reflectionQuestion: "Ina hikima ke kiran ni in rage gaggawa yau?",
  },
  tl: {
    opening: "Hindi mo kailangang magpasya mula sa pressure ngayon.",
    reflectionQuestion: "Saan ako hinihikayat ng karunungan na bumagal ngayon?",
  },
  ar: {
    opening: "لست مضطرًا لأن تقرر من تحت الضغط اليوم.",
    reflectionQuestion: "أين تدعوني الحكمة إلى التمهل اليوم؟",
  },
  hi: {
    opening: "आज आपको दबाव से निर्णय लेने की ज़रूरत नहीं है।",
    reflectionQuestion: "आज बुद्धि मुझे कहाँ धीमे होने के लिए कह रही है?",
  },
};

const STUDY_THEME_LIBRARY: Record<GenerationLanguage, StudyThemeTemplate[]> = {
  en: [
    {
      key: "trust",
      title: "Trust",
      keywords: ["trust", "faith", "believe", "hope", "confidence"],
      insight: "This chapter points you toward confidence in God instead of fear-driven control.",
      reflectionQuestion: "Where am I trusting control more than God today?",
      action: "Name one fear and pray before your next money or work decision.",
    },
    {
      key: "stewardship",
      title: "Stewardship",
      keywords: ["give", "talent", "manage", "entrust", "faithful", "serve"],
      insight: "Faithfulness in small responsibilities is treated as spiritual formation.",
      reflectionQuestion: "What responsibility needs more faithful care this week?",
      action: "Use one resource intentionally for one person today.",
    },
    {
      key: "wisdom",
      title: "Wisdom",
      keywords: ["wisdom", "understanding", "discern", "instruction", "counsel"],
      insight: "Discernment and listening are emphasized before decisive action.",
      reflectionQuestion: "Whose wise counsel should shape my next decision?",
      action: "Pause before your next major step and seek counsel.",
    },
    {
      key: "generosity",
      title: "Generosity",
      keywords: ["give", "share", "poor", "mercy", "compassion", "neighbor"],
      insight: "Spiritual maturity is connected to practical care for others.",
      reflectionQuestion: "How can my choices become more generous this week?",
      action: "Schedule one concrete act of generosity now.",
    },
    {
      key: "perseverance",
      title: "Perseverance",
      keywords: ["endure", "persevere", "stand", "remain", "finish", "patient"],
      insight: "Steady obedience over time is presented as a path to formation.",
      reflectionQuestion: "Where do I need consistency instead of intensity?",
      action: "Choose one small daily practice and keep it for seven days.",
    },
  ],
  es: [
    {
      key: "trust",
      title: "Confianza",
      keywords: ["confía", "fe", "esperanza", "creer", "seguridad"],
      insight: "Este capítulo te invita a confiar en Dios en lugar de controlar desde el temor.",
      reflectionQuestion: "¿Dónde estoy confiando más en mi control que en Dios?",
      action: "Nombra un temor y ora antes de tu próxima decisión de dinero o trabajo.",
    },
    {
      key: "stewardship",
      title: "Mayordomía",
      keywords: ["dar", "talento", "administrar", "fiel", "servir"],
      insight: "La fidelidad en lo pequeño aparece como una disciplina espiritual.",
      reflectionQuestion: "¿Qué responsabilidad necesita más cuidado fiel esta semana?",
      action: "Usa un recurso de forma intencional para servir a alguien hoy.",
    },
    {
      key: "wisdom",
      title: "Sabiduría",
      keywords: ["sabiduría", "entender", "discernir", "consejo"],
      insight: "El texto resalta discernir y escuchar antes de actuar.",
      reflectionQuestion: "¿Qué consejo sabio debo buscar antes de decidir?",
      action: "Haz una pausa antes del próximo paso importante y pide consejo.",
    },
    {
      key: "generosity",
      title: "Generosidad",
      keywords: ["dar", "compartir", "pobre", "misericordia", "compasión"],
      insight: "La madurez espiritual se vincula con el cuidado práctico del prójimo.",
      reflectionQuestion: "¿Cómo pueden mis decisiones ser más generosas esta semana?",
      action: "Agenda ahora un acto concreto de generosidad.",
    },
    {
      key: "perseverance",
      title: "Perseverancia",
      keywords: ["perseverar", "permanecer", "paciencia", "resistir"],
      insight: "La obediencia constante en el tiempo forma el carácter.",
      reflectionQuestion: "¿Dónde necesito constancia en lugar de intensidad?",
      action: "Elige una práctica pequeña diaria y mantenla por siete días.",
    },
  ],
  fr: [
    {
      key: "trust",
      title: "Confiance",
      keywords: ["confiance", "foi", "croire", "espérance"],
      insight: "Ce chapitre appelle à la confiance en Dieu plutôt qu'au contrôle par la peur.",
      reflectionQuestion: "Où est-ce que je fais plus confiance à mon contrôle qu'à Dieu ?",
      action: "Nomme une peur et prie avant ta prochaine décision de travail ou d'argent.",
    },
    {
      key: "stewardship",
      title: "Intendance",
      keywords: ["donner", "talent", "gérer", "fidèle", "servir"],
      insight: "La fidélité dans les petites responsabilités est présentée comme une formation spirituelle.",
      reflectionQuestion: "Quelle responsabilité demande plus de fidélité cette semaine ?",
      action: "Utilise une ressource intentionnellement pour servir une personne aujourd'hui.",
    },
    {
      key: "wisdom",
      title: "Sagesse",
      keywords: ["sagesse", "discernement", "instruction", "conseil"],
      insight: "Le texte insiste sur l'écoute et le discernement avant d'agir.",
      reflectionQuestion: "Quel conseil sage doit orienter ma prochaine décision ?",
      action: "Fais une pause avant ta prochaine étape importante et cherche un conseil.",
    },
    {
      key: "generosity",
      title: "Générosité",
      keywords: ["donner", "partager", "pauvre", "compassion", "miséricorde"],
      insight: "La maturité spirituelle se traduit par des gestes concrets envers les autres.",
      reflectionQuestion: "Comment mes choix peuvent-ils devenir plus généreux cette semaine ?",
      action: "Planifie maintenant un acte concret de générosité.",
    },
    {
      key: "perseverance",
      title: "Persévérance",
      keywords: ["persévérer", "demeurer", "patient", "tenir ferme"],
      insight: "L'obéissance régulière dans le temps forme le caractère.",
      reflectionQuestion: "Où ai-je besoin de constance plutôt que d'intensité ?",
      action: "Choisis une petite pratique quotidienne pour les sept prochains jours.",
    },
  ],
  pt: [
    {
      key: "trust",
      title: "Confiança",
      keywords: ["confiança", "fé", "crer", "esperança"],
      insight: "Este capítulo convida à confiança em Deus em vez de controle movido pelo medo.",
      reflectionQuestion: "Onde estou confiando mais no meu controle do que em Deus?",
      action: "Nomeie um medo e ore antes da próxima decisão de trabalho ou dinheiro.",
    },
    {
      key: "stewardship",
      title: "Mordomia",
      keywords: ["dar", "talento", "administrar", "fiel", "servir"],
      insight: "Fidelidade no pouco aparece como formação espiritual.",
      reflectionQuestion: "Qual responsabilidade precisa de mais cuidado fiel nesta semana?",
      action: "Use um recurso de forma intencional para servir uma pessoa hoje.",
    },
    {
      key: "wisdom",
      title: "Sabedoria",
      keywords: ["sabedoria", "discernimento", "instrução", "conselho"],
      insight: "O texto destaca discernimento e escuta antes de agir.",
      reflectionQuestion: "Que conselho sábio deve orientar minha próxima decisão?",
      action: "Faça uma pausa antes do próximo passo importante e peça conselho.",
    },
    {
      key: "generosity",
      title: "Generosidade",
      keywords: ["dar", "compartilhar", "pobre", "compaixão", "misericórdia"],
      insight: "Maturidade espiritual se conecta a cuidado prático com outras pessoas.",
      reflectionQuestion: "Como minhas escolhas podem se tornar mais generosas nesta semana?",
      action: "Agende agora um ato concreto de generosidade.",
    },
    {
      key: "perseverance",
      title: "Perseverança",
      keywords: ["perseverar", "permanecer", "paciência", "resistir"],
      insight: "Obediência constante ao longo do tempo forma o caráter.",
      reflectionQuestion: "Onde preciso de constância em vez de intensidade?",
      action: "Escolha uma prática diária pequena e mantenha por sete dias.",
    },
  ],
  de: [
    {
      key: "trust",
      title: "Vertrauen",
      keywords: ["vertrauen", "glaube", "hoffnung", "zuversicht"],
      insight: "Dieses Kapitel ruft zu Vertrauen in Gott statt zu angstgetriebener Kontrolle.",
      reflectionQuestion: "Wo vertraue ich heute mehr meiner Kontrolle als Gott?",
      action: "Benenne eine Angst und bete vor deiner nächsten Geld- oder Arbeitsentscheidung.",
    },
    {
      key: "stewardship",
      title: "Verantwortliche Verwaltung",
      keywords: ["geben", "talent", "verwalten", "treu", "dienen"],
      insight: "Treue in kleinen Aufgaben wird als geistliche Formung dargestellt.",
      reflectionQuestion: "Welche Verantwortung braucht diese Woche mehr treue Pflege?",
      action: "Setze heute eine Ressource bewusst für eine Person ein.",
    },
    {
      key: "wisdom",
      title: "Weisheit",
      keywords: ["weisheit", "einsicht", "rat", "verständnis"],
      insight: "Der Text betont Hören und Unterscheiden vor dem Handeln.",
      reflectionQuestion: "Welcher weise Rat sollte meine nächste Entscheidung prägen?",
      action: "Halte vor dem nächsten großen Schritt kurz inne und suche Rat.",
    },
    {
      key: "generosity",
      title: "Großzügigkeit",
      keywords: ["geben", "teilen", "arm", "barmherzigkeit", "mitgefühl"],
      insight: "Geistliche Reife zeigt sich in praktischer Fürsorge für andere.",
      reflectionQuestion: "Wie können meine Entscheidungen diese Woche großzügiger werden?",
      action: "Plane jetzt eine konkrete Tat der Großzügigkeit.",
    },
    {
      key: "perseverance",
      title: "Ausdauer",
      keywords: ["ausharren", "bleiben", "geduld", "standhaft"],
      insight: "Beständiger Gehorsam über Zeit formt den Charakter.",
      reflectionQuestion: "Wo brauche ich Beständigkeit statt Intensität?",
      action: "Wähle eine kleine tägliche Praxis und halte sie sieben Tage durch.",
    },
  ],
  yo: [
    {
      key: "trust",
      title: "Ìgbẹ́kẹ̀lé",
      keywords: ["igbagbọ", "gbẹkẹle", "ireti", "gbagbo"],
      insight: "Orí yìí ń pè ọ sí ìgbẹ́kẹ̀lé nínú Ọlọ́run dípò ìṣàkóso tí ìbẹ̀rù ń darí.",
      reflectionQuestion: "Níbo ni mo fi ń gbẹ́kẹ̀lé ìṣàkóso mi ju Ọlọ́run lọ lónìí?",
      action: "Darúkọ ìbẹ̀rù kan kí o sì gbàdúrà kí o tó ṣe ìpinnu tó kàn iṣẹ́ tàbí owó.",
    },
    {
      key: "stewardship",
      title: "Ìtọju ohun tí a fi lé wa lọ́wọ́",
      keywords: ["fi", "talenti", "ṣakoso", "olotito", "sin"],
      insight: "Ìṣòtítọ́ nínú ohun kékeré jẹ́ apá ìdàgbàsókè ẹ̀mí.",
      reflectionQuestion: "Ojuse wo ló nílò ìtọju olóòtítọ́ síi lọ́sẹ̀ yìí?",
      action: "Lo orísun kan pẹ̀lú ìdí mímọ̀ láti ràn ẹnìkan lọ́wọ́ lónìí.",
    },
    {
      key: "wisdom",
      title: "Ọgbọ́n",
      keywords: ["ọgbọn", "ìmọ", "ìmọràn", "oye"],
      insight: "Àkọsílẹ̀ yìí fi hàn pé ìgbọ́ran àti ìmòye yẹ kí ó ṣáájú ìṣe.",
      reflectionQuestion: "Ìmọ̀ràn ọgbọ́n ta ni mo nílò kí n tó pinnu?",
      action: "Dákẹ́ díẹ̀ kí o tó gbe ìgbésẹ̀ pàtàkì tó tẹ̀lé, kí o sì wá ìmọ̀ràn.",
    },
    {
      key: "generosity",
      title: "Ọ̀làwọ́",
      keywords: ["fi", "pin", "talaka", "anu", "ifẹ"],
      insight: "Ìdàgbàsókè ẹ̀mí ní asopọ pẹ̀lú ìtọju gidi fún àwọn míì.",
      reflectionQuestion: "Báwo ni àwọn ìpinnu mi ṣe lè túbọ̀ jẹ́ ọ̀làwọ́ lọ́sẹ̀ yìí?",
      action: "Ṣètò ìṣe ọ̀làwọ́ kan gidi báyìí.",
    },
    {
      key: "perseverance",
      title: "Sísùúrù",
      keywords: ["duro", "suru", "farada", "tẹsiwaju"],
      insight: "Ìgbọràn tó dúró ṣinṣin ní àkókò ń kọ iwa.",
      reflectionQuestion: "Níbo ni mo nílò ìdúróṣinṣin dípò ìfarapa-ọwọ́kan?",
      action: "Yan ìṣe kékeré ojoojúmọ́ kan, kí o sì tẹ̀síwájú fún ọjọ́ méje.",
    },
  ],
  ig: [
    {
      key: "trust",
      title: "Ntụkwasị obi",
      keywords: ["okwukwe", "tụkwasị", "olileanya", "kweere"],
      insight: "Isiakwụkwọ a na-akpọ ka i tụkwasị Chineke obi karịa ijikwa ihe n'ụjọ.",
      reflectionQuestion: "Ebee ka m na-atụkwasị njikwa m obi karịa Chineke taa?",
      action: "Kpọọ otu ụjọ aha ma kpee ekpere tupu mkpebi ego ma ọ bụ ọrụ ọzọ.",
    },
    {
      key: "stewardship",
      title: "Nlekọta e nyere",
      keywords: ["nye", "talenti", "lekọta", "kwere", "jee ozi"],
      insight: "Nkwado n'ihe nta ka e ji eme ka ndụ ime mmụọ too.",
      reflectionQuestion: "Kedu ọrụ chọrọ nlekọta kwere ntụkwasị obi n'izu a?",
      action: "Jiri otu akụnụba n'ụzọ nwere ebumnuche nyere otu onye aka taa.",
    },
    {
      key: "wisdom",
      title: "Amamihe",
      keywords: ["amamihe", "nghọta", "ndụmọdụ", "nkuzi"],
      insight: "A na-emesi ntị na nghọta ike tupu ime ihe siri ike.",
      reflectionQuestion: "Onye ndụmọdụ amamihe nke m kwesịrị ịjụ tupu mkpebi ọzọ?",
      action: "Kwụsị obere oge tupu nzọụkwụ dị mkpa ma chọọ ndụmọdụ.",
    },
    {
      key: "generosity",
      title: "Inye aka n'obi",
      keywords: ["nye", "kekọrịta", "ogbenye", "ebere", "ịhụnanya"],
      insight: "Ito ime mmụọ na-apụta n'ịlekọta ndị ọzọ n'ụzọ bara uru.",
      reflectionQuestion: "Kedu ka mkpebi m ga-esi bụrụ nke na-enye aka karịa n'izu a?",
      action: "Hazie otu omume inye aka doro anya ugbu a.",
    },
    {
      key: "perseverance",
      title: "Ndidi",
      keywords: ["ndidi", "iguzosi ike", "nọgide", "kwusie"],
      insight: "Ige ntị mgbe niile n'oge ogologo na-ewu agwa.",
      reflectionQuestion: "Ebee ka m chọrọ ịdịgide adịgide kama ike ọsọ ọsọ?",
      action: "Họrọ otu obere omume kwa ụbọchị ma debe ya ụbọchị asaa.",
    },
  ],
  ha: [
    {
      key: "trust",
      title: "Amincewa",
      keywords: ["amini", "bangaskiya", "bege", "yarda"],
      insight: "Wannan sura tana kira ka dogara ga Allah maimakon sarrafawa daga tsoro.",
      reflectionQuestion: "Ina na dogara ga ikon sarrafawata fiye da Allah a yau?",
      action: "Ka ambaci tsoro ɗaya ka yi addu'a kafin shawarar aikinka ko kuɗi ta gaba.",
    },
    {
      key: "stewardship",
      title: "Kula da amanar da aka ba",
      keywords: ["ba", "talent", "kulawa", "aminci", "hidima"],
      insight: "Aminci a ƙananan alhaki hanya ce ta gina rayuwar ruhaniya.",
      reflectionQuestion: "Wane alhaki ne yake buƙatar ƙarin kulawa ta aminci a wannan mako?",
      action: "Yi amfani da wata albarkatu cikin niyya don taimakon mutum guda a yau.",
    },
    {
      key: "wisdom",
      title: "Hikima",
      keywords: ["hikima", "fahimta", "shawara", "umarni"],
      insight: "An fi jaddada sauraro da tantancewa kafin ɗaukar mataki.",
      reflectionQuestion: "Wace shawara mai hikima ya kamata ta jagoranci matakina na gaba?",
      action: "Ka ɗan tsaya kafin babban mataki na gaba ka nemi shawara.",
    },
    {
      key: "generosity",
      title: "Karimci",
      keywords: ["ba", "rabawa", "talaka", "jinƙai", "tausayawa"],
      insight: "Balagar ruhaniya tana haɗuwa da kulawa ta zahiri ga wasu.",
      reflectionQuestion: "Ta yaya zaɓina za su fi nuna karimci a wannan mako?",
      action: "Ka tsara aiki ɗaya na karimci a sarari yanzu.",
    },
    {
      key: "perseverance",
      title: "Juriya",
      keywords: ["juriya", "haƙuri", "tsaya", "ci gaba"],
      insight: "Biyayya mai ɗorewa a tsawon lokaci tana gina hali.",
      reflectionQuestion: "Ina nake buƙatar daidaito maimakon ƙarfi na lokaci ɗaya?",
      action: "Zaɓi ƙaramin aiki na kullum ka yi shi na tsawon kwana bakwai.",
    },
  ],
  tl: [
    {
      key: "trust",
      title: "Pagtitiwala",
      keywords: ["tiwala", "pananampalataya", "pag-asa", "maniwala"],
      insight: "Inaanyayahan ka ng kabanatang ito na magtiwala sa Diyos kaysa kontrol na galing sa takot.",
      reflectionQuestion: "Saan ako mas nagtitiwala sa kontrol ko kaysa sa Diyos ngayon?",
      action: "Pangalanan ang isang takot at manalangin bago ang susunod mong pasya sa pera o trabaho.",
    },
    {
      key: "stewardship",
      title: "Mabuting Pamamahala",
      keywords: ["bigay", "talento", "pamahala", "tapat", "paglilingkod"],
      insight: "Ang katapatan sa maliliit na tungkulin ay bahagi ng spiritual formation.",
      reflectionQuestion: "Aling responsibilidad ang kailangan ng mas tapat na pag-aalaga ngayong linggo?",
      action: "Gamitin nang may layunin ang isang resource para sa isang tao ngayon.",
    },
    {
      key: "wisdom",
      title: "Karunungan",
      keywords: ["karunungan", "unawa", "pagkilatis", "payo"],
      insight: "Binibigyang-diin ng teksto ang pakikinig at pagkilatis bago kumilos.",
      reflectionQuestion: "Kaninong matalinong payo ang dapat humubog sa susunod kong pasya?",
      action: "Huminto muna bago ang susunod na malaking hakbang at humingi ng payo.",
    },
    {
      key: "generosity",
      title: "Pagiging Bukas-palad",
      keywords: ["bigay", "bahagi", "mahirap", "habag", "awa"],
      insight: "Ang spiritual maturity ay nakikita sa praktikal na pag-aalaga sa iba.",
      reflectionQuestion: "Paano magiging mas bukas-palad ang mga pasya ko ngayong linggo?",
      action: "Magtakda ngayon ng isang konkretong gawa ng generosity.",
    },
    {
      key: "perseverance",
      title: "Pagtitiyaga",
      keywords: ["tiyaga", "manatili", "matatag", "pasensya"],
      insight: "Ang tuloy-tuloy na pagsunod sa paglipas ng panahon ang humuhubog sa ugali.",
      reflectionQuestion: "Saan ko kailangan ng consistency kaysa intensity?",
      action: "Pumili ng isang maliit na daily practice at gawin ito sa loob ng pitong araw.",
    },
  ],
  ar: [
    {
      key: "trust",
      title: "الثقة",
      keywords: ["ثقة", "إيمان", "رجاء", "يؤمن"],
      insight: "يدعوك هذا الفصل إلى الثقة بالله بدل التحكم المدفوع بالخوف.",
      reflectionQuestion: "أين أعتمد على سيطرتي أكثر من اعتمادي على الله اليوم؟",
      action: "سمِّ خوفًا واحدًا وصلِّ قبل قرارك التالي في المال أو العمل.",
    },
    {
      key: "stewardship",
      title: "الأمانة في التدبير",
      keywords: ["يعطي", "موهبة", "يدير", "أمين", "يخدم"],
      insight: "الأمانة في المسؤوليات الصغيرة تُقدَّم كتشكيل روحي.",
      reflectionQuestion: "أي مسؤولية تحتاج رعاية أكثر أمانة هذا الأسبوع؟",
      action: "استخدم موردًا واحدًا بقصد لخدمة شخص واحد اليوم.",
    },
    {
      key: "wisdom",
      title: "الحكمة",
      keywords: ["حكمة", "فهم", "تمييز", "مشورة"],
      insight: "يؤكد النص أهمية الإصغاء والتمييز قبل الفعل.",
      reflectionQuestion: "مشورة مَن ينبغي أن توجه قراري القادم؟",
      action: "توقف قليلًا قبل خطوتك الكبيرة التالية واطلب مشورة.",
    },
    {
      key: "generosity",
      title: "الكرم",
      keywords: ["يعطي", "يشارك", "فقير", "رحمة", "تعاطف"],
      insight: "النضج الروحي يرتبط بعناية عملية تجاه الآخرين.",
      reflectionQuestion: "كيف يمكن أن تصبح قراراتي أكثر كرمًا هذا الأسبوع؟",
      action: "حدّد الآن فعل كرم عمليًا واحدًا.",
    },
    {
      key: "perseverance",
      title: "المثابرة",
      keywords: ["يثابر", "يبقى", "صبر", "يصمد"],
      insight: "الطاعة الثابتة عبر الزمن تُشكّل الشخصية.",
      reflectionQuestion: "أين أحتاج إلى الثبات بدل الاندفاع؟",
      action: "اختر ممارسة يومية صغيرة والتزم بها سبعة أيام.",
    },
  ],
  hi: [
    {
      key: "trust",
      title: "भरोसा",
      keywords: ["विश्वास", "भरोसा", "आशा", "मानना"],
      insight: "यह अध्याय डर-आधारित नियंत्रण के बजाय परमेश्वर पर भरोसे के लिए बुलाता है।",
      reflectionQuestion: "आज मैं कहाँ परमेश्वर से अधिक अपने नियंत्रण पर भरोसा कर रहा हूँ?",
      action: "एक डर का नाम लो और अगली काम या धन-संबंधित निर्णय से पहले प्रार्थना करो।",
    },
    {
      key: "stewardship",
      title: "जिम्मेदार प्रबंधन",
      keywords: ["देना", "प्रतिभा", "प्रबंध", "विश्वासी", "सेवा"],
      insight: "छोटी जिम्मेदारियों में निष्ठा को आत्मिक गठन का भाग बताया गया है।",
      reflectionQuestion: "इस सप्ताह किस जिम्मेदारी को अधिक निष्ठावान देखभाल चाहिए?",
      action: "आज एक संसाधन को उद्देश्यपूर्ण ढंग से एक व्यक्ति के लिए उपयोग करो।",
    },
    {
      key: "wisdom",
      title: "बुद्धि",
      keywords: ["बुद्धि", "समझ", "विवेक", "सलाह"],
      insight: "पाठ कार्य से पहले सुनने और विवेक पर ज़ोर देता है।",
      reflectionQuestion: "मेरे अगले निर्णय को किसकी बुद्धिमान सलाह दिशा देनी चाहिए?",
      action: "अगले बड़े कदम से पहले ठहरो और सलाह लो।",
    },
    {
      key: "generosity",
      title: "उदारता",
      keywords: ["देना", "बाँटना", "गरीब", "दया", "करुणा"],
      insight: "आत्मिक परिपक्वता दूसरों की व्यावहारिक देखभाल से जुड़ती है।",
      reflectionQuestion: "इस सप्ताह मेरे निर्णय अधिक उदार कैसे हो सकते हैं?",
      action: "अभी उदारता का एक ठोस कार्य तय करो।",
    },
    {
      key: "perseverance",
      title: "धैर्यपूर्ण स्थिरता",
      keywords: ["धैर्य", "बने रहना", "स्थिर", "सहन"],
      insight: "समय के साथ स्थिर आज्ञाकारिता चरित्र बनाती है।",
      reflectionQuestion: "मुझे कहाँ तीव्रता नहीं बल्कि निरंतरता चाहिए?",
      action: "एक छोटी दैनिक आदत चुनो और सात दिनों तक निभाओ।",
    },
  ],
};

const STUDY_SUMMARY_TEMPLATES: Record<GenerationLanguage, { withLead: (verseCount: number) => string; withoutLead: (verseCount: number) => string }> = {
  en: {
    withLead: (verseCount) => `This chapter anchors practical discipleship with ${verseCount} verses and invites trust-filled obedience in daily decisions.`,
    withoutLead: (verseCount) => `This chapter includes ${verseCount} verses and invites practical obedience with wisdom and perseverance.`,
  },
  es: {
    withLead: (verseCount) => `Este capítulo, con ${verseCount} versículos, orienta la vida diaria hacia una obediencia práctica y confiada en Dios.`,
    withoutLead: (verseCount) => `Este capítulo incluye ${verseCount} versículos e invita a una obediencia práctica con sabiduría y perseverancia.`,
  },
  fr: {
    withLead: (verseCount) => `Ce chapitre, avec ${verseCount} versets, ancre les décisions quotidiennes dans une obéissance pratique et confiante en Dieu.`,
    withoutLead: (verseCount) => `Ce chapitre contient ${verseCount} versets et invite à une obéissance concrète avec sagesse et persévérance.`,
  },
  pt: {
    withLead: (verseCount) => `Este capítulo, com ${verseCount} versículos, orienta as decisões diárias para uma obediência prática e confiante em Deus.`,
    withoutLead: (verseCount) => `Este capítulo tem ${verseCount} versículos e convida à obediência prática com sabedoria e perseverança.`,
  },
  de: {
    withLead: (verseCount) => `Dieses Kapitel mit ${verseCount} Versen verankert alltägliche Entscheidungen in vertrauensvollem, praktischem Gehorsam.`,
    withoutLead: (verseCount) => `Dieses Kapitel enthält ${verseCount} Verse und lädt zu praktischem Gehorsam mit Weisheit und Ausdauer ein.`,
  },
  yo: {
    withLead: (verseCount) => `Orí yìí pẹ̀lú ẹsẹ̀ ${verseCount} ń tọ́ wa sí ìgbọràn tó wúlò nínú ìpinnu ojoojúmọ́ pẹ̀lú ìgbẹ́kẹ̀lé Ọlọ́run.`,
    withoutLead: (verseCount) => `Orí yìí ní ẹsẹ̀ ${verseCount} ó sì ń pè wa sí ìgbọràn tó wúlò pẹ̀lú ọgbọ́n àti sísùúrù.`,
  },
  ig: {
    withLead: (verseCount) => `Isiakwụkwọ a nwere amaokwu ${verseCount} ma na-eduga mkpebi kwa ụbọchị n'ịge ntị nke bara uru na ntụkwasị obi n'Ọlọrun.`,
    withoutLead: (verseCount) => `Isiakwụkwọ a nwere amaokwu ${verseCount} ma na-akpọ ka e nwee nrube isi bara uru n'amamihe na ndidi.`,
  },
  ha: {
    withLead: (verseCount) => `Wannan sura mai ayoyi ${verseCount} tana karkatar da rayuwar yau da kullum zuwa biyayya mai amfani da dogaro ga Allah.`,
    withoutLead: (verseCount) => `Wannan sura tana da ayoyi ${verseCount} kuma tana kira ga biyayya mai amfani tare da hikima da juriya.`,
  },
  tl: {
    withLead: (verseCount) => `Ang kabanatang ito na may ${verseCount} talata ay nag-aanyaya ng praktikal na pagsunod na may pagtitiwala sa Diyos sa araw-araw na pasya.`,
    withoutLead: (verseCount) => `Ang kabanatang ito ay may ${verseCount} talata at nag-aanyaya ng praktikal na pagsunod na may karunungan at pagtitiyaga.`,
  },
  ar: {
    withLead: (verseCount) => `هذا الفصل، وفيه ${verseCount} آيات، يوجّه قرارات الحياة اليومية إلى طاعة عملية مملوءة بالثقة بالله.`,
    withoutLead: (verseCount) => `يحتوي هذا الفصل على ${verseCount} آيات ويدعو إلى طاعة عملية بحكمة ومثابرة.`,
  },
  hi: {
    withLead: (verseCount) => `यह अध्याय ${verseCount} पदों के साथ दैनिक निर्णयों को परमेश्वर पर भरोसे वाली व्यावहारिक आज्ञाकारिता की ओर ले जाता है।`,
    withoutLead: (verseCount) => `इस अध्याय में ${verseCount} पद हैं और यह बुद्धि व धैर्य के साथ व्यावहारिक आज्ञाकारिता के लिए बुलाता है।`,
  },
};

export function getCompanionTemplate(language: GenerationLanguage): CompanionTemplate {
  return COMPANION_TEMPLATES[language] ?? COMPANION_TEMPLATES[FALLBACK_LANGUAGE];
}

export function getStudyThemes(language: GenerationLanguage): StudyThemeTemplate[] {
  return STUDY_THEME_LIBRARY[language] ?? STUDY_THEME_LIBRARY[FALLBACK_LANGUAGE];
}

export function buildStudySummary(language: GenerationLanguage, verseCount: number, hasLeadText: boolean): string {
  const template = STUDY_SUMMARY_TEMPLATES[language] ?? STUDY_SUMMARY_TEMPLATES[FALLBACK_LANGUAGE];
  return hasLeadText ? template.withLead(verseCount) : template.withoutLead(verseCount);
}
