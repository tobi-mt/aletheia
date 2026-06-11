import { modeProfiles, type ModeProfile } from "@/lib/mode-profiles";
import type { Mode, WisdomEntryData } from "@/lib/wisdom-data";

export type LanguageCode = "en" | "es" | "fr" | "pt" | "de" | "yo" | "ig" | "ha";
export type RegionCode = "global" | "us" | "uk" | "eu" | "ng" | "br" | "latam";
export type BibleTranslation = 
  | "WEB" | "KJV" | "ASV" 
  | "RV1909" | "RV1960" 
  | "LSG1910" | "MARTIN" 
  | "AA" | "ARC" 
  | "LUTH1912" | "SCHLACH" 
  | "YOR1900" 
  | "IGB1913" 
  | "HAU1932";

export type UserPreferences = {
  language: LanguageCode;
  region: RegionCode;
  bibleTranslation: BibleTranslation;
  voiceEnabled: boolean;
};

export const defaultPreferences: UserPreferences = {
  language: "en",
  region: "global",
  bibleTranslation: "WEB",
  voiceEnabled: true,
};

export const languages: Record<LanguageCode, { name: string; nativeName: string; speech: string; direction: "ltr" }> = {
  en: { name: "English", nativeName: "English", speech: "en-US", direction: "ltr" },
  es: { name: "Spanish", nativeName: "Español", speech: "es-ES", direction: "ltr" },
  fr: { name: "French", nativeName: "Français", speech: "fr-FR", direction: "ltr" },
  pt: { name: "Portuguese", nativeName: "Português", speech: "pt-BR", direction: "ltr" },
  de: { name: "German", nativeName: "Deutsch", speech: "de-DE", direction: "ltr" },
  yo: { name: "Yoruba", nativeName: "Yorùbá", speech: "yo-NG", direction: "ltr" },
  ig: { name: "Igbo", nativeName: "Igbo", speech: "ig-NG", direction: "ltr" },
  ha: { name: "Hausa", nativeName: "Hausa", speech: "ha-NG", direction: "ltr" },
};

export const regions: Record<RegionCode, { label: string; example: string; currency: string }> = {
  global: {
    label: "Global",
    currency: "local currency",
    example: "Use local prices, employment norms, family obligations, and tax rules as context.",
  },
  us: {
    label: "United States",
    currency: "USD",
    example: "Use examples like student loans, 401(k)-style retirement saving, mortgages, healthcare costs, and state taxes.",
  },
  uk: {
    label: "United Kingdom",
    currency: "GBP",
    example: "Use examples like pensions, ISAs, rent or mortgage pressure, council tax, and UK workplace norms.",
  },
  eu: {
    label: "Europe",
    currency: "EUR",
    example: "Use examples like consumer protections, social insurance, regional taxes, housing costs, and cross-border work.",
  },
  ng: {
    label: "Nigeria",
    currency: "NGN",
    example: "Use examples like family support, business cash flow, inflation, remittances, school fees, and community obligations.",
  },
  br: {
    label: "Brazil",
    currency: "BRL",
    example: "Use examples like inflation-aware budgeting, family support, informal work, taxes, and entrepreneurship.",
  },
  latam: {
    label: "Latin America",
    currency: "local currency",
    example: "Use examples like family networks, inflation, remittances, informal business, and regional employment norms.",
  },
};

export const bibleTranslations: Record<BibleTranslation, { label: string; note: string; language: LanguageCode }> = {
  // English translations
  WEB: {
    label: "World English Bible",
    language: "en",
    note: "Public domain English translation. Modern language, accessible phrasing.",
  },
  KJV: {
    label: "King James Version",
    language: "en",
    note: "Public domain English translation with traditional phrasing. Completed 1611.",
  },
  ASV: {
    label: "American Standard Version",
    language: "en",
    note: "Public domain English translation with formal phrasing. Completed 1901.",
  },
  
  // Spanish translations
  RV1909: {
    label: "Reina-Valera 1909",
    language: "es",
    note: "Public domain Spanish translation. Classic revision widely used historically.",
  },
  RV1960: {
    label: "Reina-Valera 1960",
    language: "es",
    note: "Public domain Spanish translation. Most popular Spanish Bible globally.",
  },
  
  // French translations
  LSG1910: {
    label: "Louis Segond 1910",
    language: "fr",
    note: "Public domain French translation. Standard French Protestant Bible.",
  },
  MARTIN: {
    label: "Martin 1744",
    language: "fr",
    note: "Public domain French translation. Historic French Reformed tradition.",
  },
  
  // Portuguese translations
  AA: {
    label: "Almeida Atualizada",
    language: "pt",
    note: "Public domain Portuguese translation. Modern language revision.",
  },
  ARC: {
    label: "Almeida Revista e Corrigida",
    language: "pt",
    note: "Public domain Portuguese translation. Traditional phrasing, widely used.",
  },
  
  // German translations
  LUTH1912: {
    label: "Lutherbibel 1912",
    language: "de",
    note: "Public domain German translation. Luther's translation, classic revision.",
  },
  SCHLACH: {
    label: "Schlachter 1951",
    language: "de",
    note: "Public domain German translation. Clear language, evangelical tradition.",
  },
  
  // Yoruba translation
  YOR1900: {
    label: "Bíbélì Mímọ́ (1900)",
    language: "yo",
    note: "Public domain Yoruba translation. British and Foreign Bible Society edition.",
  },
  
  // Igbo translation
  IGB1913: {
    label: "Akwụkwọ Nsọ (1913)",
    language: "ig",
    note: "Public domain Igbo translation. Union Version, missionary translation.",
  },
  
  // Hausa translation
  HAU1932: {
    label: "Littafi Mai Tsarki (1932)",
    language: "ha",
    note: "Public domain Hausa translation. British and Foreign Bible Society edition.",
  },
};

const languageDefaultBibleTranslations: Partial<Record<LanguageCode, BibleTranslation>> = {
  en: "WEB",
  es: "RV1960",
  fr: "LSG1910",
  pt: "AA",
  de: "LUTH1912",
  yo: "YOR1900",
  ig: "IGB1913",
  ha: "HAU1932",
};

export function defaultBibleTranslationForLanguage(language: LanguageCode): BibleTranslation {
  return languageDefaultBibleTranslations[language] ?? defaultPreferences.bibleTranslation;
}

/**
 * Get all available Bible translations, with user's language translations listed first.
 * This allows users to select any Bible translation regardless of their UI language preference.
 * For example, a German speaker can choose to read scripture in English (KJV).
 */
export function bibleTranslationOptionsForLanguage(language: LanguageCode): BibleTranslation[] {
  // Get translations in the user's language
  const inUserLanguage = Object.entries(bibleTranslations)
    .filter(([, translation]) => translation.language === language)
    .map(([code]) => code as BibleTranslation);

  // Get all other translations
  const otherLanguages = Object.entries(bibleTranslations)
    .filter(([, translation]) => translation.language !== language)
    .map(([code]) => code as BibleTranslation);

  // Return user's language first, then all others for cross-language flexibility
  return [...inUserLanguage, ...otherLanguages];
}

export type ScriptureRead = {
  translation: string;
  label: string;
  text: string;
  availableLanguage: LanguageCode;
  kind?: "translation" | "summary";
};

export const scriptureQuickReads: Record<
  string,
  { translation: BibleTranslation; label: string; text: string }
> = {
  "Matthew 25:14-30": {
    translation: "WEB",
    label: "Selected reading",
    text:
      "A man entrusted his servants with different amounts while he traveled. Two servants acted faithfully with what they were given; one hid what was entrusted out of fear. The master praised faithful stewardship and held the fearful servant accountable.",
  },
  "Proverbs 22:7": {
    translation: "WEB",
    label: "World English Bible",
    text: "The rich rule over the poor. The borrower is servant to the lender.",
  },
  "Philippians 4:11-13": {
    translation: "WEB",
    label: "World English Bible",
    text:
      "Not that I speak because of lack, for I have learned in whatever state I am, to be content in it. I know how to be humbled, and I know also how to abound. In everything and in all things I have learned the secret both to be filled and to be hungry, both to abound and to be in need. I can do all things through Christ, who strengthens me.",
  },
  "Proverbs 15:22": {
    translation: "WEB",
    label: "World English Bible",
    text: "Where there is no counsel, plans fail; but in a multitude of counselors they are established.",
  },
  "Luke 14:28": {
    translation: "WEB",
    label: "World English Bible",
    text: "For which of you, desiring to build a tower, doesn’t first sit down and count the cost, to see if he has enough to complete it?",
  },
  "2 Corinthians 9:6-8": {
    translation: "WEB",
    label: "World English Bible",
    text:
      "He who sows sparingly will also reap sparingly. He who sows bountifully will also reap bountifully. Let each man give according as he has determined in his heart, not grudgingly or under compulsion, for God loves a cheerful giver. God is able to make all grace abound to you, that you may always have all sufficiency in everything, and may abound to every good work.",
  },
  "Proverbs 21:5": {
    translation: "WEB",
    label: "World English Bible",
    text: "The plans of the diligent surely lead to profit; and everyone who is hasty surely rushes to poverty.",
  },
  "Matthew 6:25-34": {
    translation: "WEB",
    label: "Selected reading",
    text:
      "Jesus teaches his listeners not to be consumed by anxious striving over food, drink, clothing, or tomorrow. He calls them to seek God’s Kingdom and righteousness first, and to live today with trust rather than rehearsing tomorrow’s trouble.",
  },
};

export const curatedScriptureReferences = Object.keys(scriptureQuickReads).sort((a, b) => b.length - a.length);

const localizedScriptureReads: Partial<Record<BibleTranslation, Record<string, ScriptureRead>>> = {
  KJV: {
    "Matthew 25:14-30": {
      translation: "KJV",
      label: "King James Version",
      availableLanguage: "en",
      text:
        "For the kingdom of heaven is as a man travelling into a far country, who called his own servants, and delivered unto them his goods. And unto one he gave five talents, to another two, and to another one; to every man according to his several ability; and straightway took his journey. Then he that had received the five talents went and traded with the same, and made them other five talents. And likewise he that had received two, he also gained other two. But he that had received one went and digged in the earth, and hid his lord's money. After a long time the lord of those servants cometh, and reckoneth with them. And so he that had received five talents came and brought other five talents, saying, Lord, thou deliveredst unto me five talents: behold, I have gained beside them five talents more. His lord said unto him, Well done, thou good and faithful servant: thou hast been faithful over a few things, I will make thee ruler over many things: enter thou into the joy of thy lord. He also that had received two talents came and said, Lord, thou deliveredst unto me two talents: behold, I have gained two other talents beside them. His lord said unto him, Well done, good and faithful servant; thou hast been faithful over a few things, I will make thee ruler over many things: enter thou into the joy of thy lord. Then he which had received the one talent came and said, Lord, I knew thee that thou art an hard man, reaping where thou hast not sown, and gathering where thou hast not strawed: And I was afraid, and went and hid thy talent in the earth: lo, there thou hast that is thine. His lord answered and said unto him, Thou wicked and slothful servant, thou knewest that I reap where I sowed not, and gather where I have not strawed: Thou oughtest therefore to have put my money to the exchangers, and then at my coming I should have received mine own with usury. Take therefore the talent from him, and give it unto him which hath ten talents. For unto every one that hath shall be given, and he shall have abundance: but from him that hath not shall be taken away even that which he hath. And cast ye the unprofitable servant into outer darkness: there shall be weeping and gnashing of teeth.",
    },
    "Proverbs 22:7": {
      translation: "KJV",
      label: "King James Version",
      availableLanguage: "en",
      text: "The rich ruleth over the poor, and the borrower is servant to the lender.",
    },
    "Philippians 4:11-13": {
      translation: "KJV",
      label: "King James Version",
      availableLanguage: "en",
      text:
        "Not that I speak in respect of want: for I have learned, in whatsoever state I am, therewith to be content. I know both how to be abased, and I know how to abound: every where and in all things I am instructed both to be full and to be hungry, both to abound and to suffer need. I can do all things through Christ which strengtheneth me.",
    },
    "Proverbs 15:22": {
      translation: "KJV",
      label: "King James Version",
      availableLanguage: "en",
      text: "Without counsel purposes are disappointed: but in the multitude of counsellors they are established.",
    },
    "Luke 14:28": {
      translation: "KJV",
      label: "King James Version",
      availableLanguage: "en",
      text: "For which of you, intending to build a tower, sitteth not down first, and counteth the cost, whether he have sufficient to finish it?",
    },
    "2 Corinthians 9:6-8": {
      translation: "KJV",
      label: "King James Version",
      availableLanguage: "en",
      text:
        "But this I say, He which soweth sparingly shall reap also sparingly; and he which soweth bountifully shall reap also bountifully. Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver. And God is able to make all grace abound toward you; that ye, always having all sufficiency in all things, may abound to every good work.",
    },
    "Proverbs 21:5": {
      translation: "KJV",
      label: "King James Version",
      availableLanguage: "en",
      text: "The thoughts of the diligent tend only to plenteousness; but of every one that is hasty only to want.",
    },
    "Matthew 6:25-34": {
      translation: "KJV",
      label: "King James Version",
      availableLanguage: "en",
      text:
        "Therefore I say unto you, Take no thought for your life, what ye shall eat, or what ye shall drink; nor yet for your body, what ye shall put on. Is not the life more than meat, and the body than raiment? Behold the fowls of the air: for they sow not, neither do they reap, nor gather into barns; yet your heavenly Father feedeth them. Are ye not much better than they? Which of you by taking thought can add one cubit unto his stature? And why take ye thought for raiment? Consider the lilies of the field, how they grow; they toil not, neither do they spin: And yet I say unto you, That even Solomon in all his glory was not arrayed like one of these. Wherefore, if God so clothe the grass of the field, which to day is, and to morrow is cast into the oven, shall he not much more clothe you, O ye of little faith? Therefore take no thought, saying, What shall we eat? or, What shall we drink? or, Wherewithal shall we be clothed? For after all these things do the Gentiles seek: for your heavenly Father knoweth that ye have need of all these things. But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you. Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof.",
    },
  },
  RV1909: {
    "Proverbs 22:7": {
      translation: "RV1909",
      label: "Reina-Valera 1909",
      availableLanguage: "es",
      text: "El rico se enseñorea de los pobres; y el que toma prestado, siervo es del que presta.",
    },
    "Proverbs 15:22": {
      translation: "RV1909",
      label: "Reina-Valera 1909",
      availableLanguage: "es",
      text: "Los pensamientos son frustrados donde no hay consejo; mas en la multitud de consejeros se afirman.",
    },
    "Luke 14:28": {
      translation: "RV1909",
      label: "Reina-Valera 1909",
      availableLanguage: "es",
      text: "Jesús enseña a contar el costo antes de comenzar una torre: la sabiduría se sienta primero, mira los recursos y evita compromisos impulsivos.",
    },
    "Proverbs 21:5": {
      translation: "RV1909",
      label: "Reina-Valera 1909",
      availableLanguage: "es",
      text: "Los pensamientos del solícito ciertamente tienden a abundancia; mas todo presuroso, indefectiblemente a pobreza.",
    },
  },
  LSG1910: {
    "Proverbs 22:7": {
      translation: "LSG1910",
      label: "Louis Segond 1910",
      availableLanguage: "fr",
      text: "Le riche domine sur les pauvres, et celui qui emprunte est l'esclave de celui qui prête.",
    },
    "Proverbs 15:22": {
      translation: "LSG1910",
      label: "Louis Segond 1910",
      availableLanguage: "fr",
      text: "Les projets échouent, faute d'une assemblée qui délibère; mais ils réussissent quand il y a de nombreux conseillers.",
    },
    "Luke 14:28": {
      translation: "LSG1910",
      label: "Louis Segond 1910",
      availableLanguage: "fr",
      text: "Jésus invite à s'asseoir d'abord pour calculer la dépense avant de bâtir une tour. La sagesse compte le coût avant l'engagement.",
    },
    "Proverbs 21:5": {
      translation: "LSG1910",
      label: "Louis Segond 1910",
      availableLanguage: "fr",
      text: "Les projets de l'homme diligent ne mènent qu'à l'abondance, mais celui qui agit avec précipitation n'arrive qu'à la disette.",
    },
  },
  AA: {
    "Proverbs 22:7": {
      translation: "AA",
      label: "Almeida Atualizada",
      availableLanguage: "pt",
      text: "O rico domina sobre os pobres, e o que toma emprestado é servo do que empresta.",
    },
    "Proverbs 15:22": {
      translation: "AA",
      label: "Almeida Atualizada",
      availableLanguage: "pt",
      text: "Onde não há conselho, frustram-se os projetos; mas com a multidão de conselheiros se estabelecem.",
    },
    "Luke 14:28": {
      translation: "AA",
      label: "Almeida Atualizada",
      availableLanguage: "pt",
      text: "Jesus ensina a sentar primeiro e calcular o custo antes de construir uma torre. A sabedoria conta o preço antes do compromisso.",
    },
    "Proverbs 21:5": {
      translation: "AA",
      label: "Almeida Atualizada",
      availableLanguage: "pt",
      text: "Os planos do diligente conduzem à abundância; mas todo precipitado se apressa para a pobreza.",
    },
  },
  LUTH1912: {
    "Proverbs 22:7": {
      translation: "LUTH1912",
      label: "Lutherbibel 1912",
      availableLanguage: "de",
      text: "Der Reiche herrscht über die Armen; und wer borgt, ist des Leihers Knecht.",
    },
    "Proverbs 15:22": {
      translation: "LUTH1912",
      label: "Lutherbibel 1912",
      availableLanguage: "de",
      text: "Die Anschläge werden zunichte, wo nicht Rat ist; wo aber viel Ratgeber sind, bestehen sie.",
    },
    "Luke 14:28": {
      translation: "LUTH1912",
      label: "Lutherbibel 1912",
      availableLanguage: "de",
      text: "Jesus fragt, wer einen Turm bauen will, ohne sich zuerst hinzusetzen und die Kosten zu überschlagen. Weisheit zählt den Preis vor der Verpflichtung.",
    },
    "Proverbs 21:5": {
      translation: "LUTH1912",
      label: "Lutherbibel 1912",
      availableLanguage: "de",
      text: "Die Anschläge eines Fleißigen bringen Überfluss; wer aber allzu rasch ist, dem wird's mangeln.",
    },
  },
};

const localizedScriptureSummaries: Partial<Record<LanguageCode, Record<string, string>>> = {
  es: {
    "Matthew 25:14-30": "Un hombre confió a sus siervos distintas cantidades mientras viajaba. Los que trabajaron con fidelidad recibieron elogio; quien escondió lo recibido por miedo fue reprendido. La fidelidad, el valor y la responsabilidad hacen crecer lo que se nos encomienda.",
    "Proverbs 22:7": "El rico gobierna sobre el pobre, y el que pide prestado queda sujeto al prestamista.",
    "Philippians 4:11-13": "Pablo aprendió a contentarse en toda situación, con poco o con mucho. La fuerza de Cristo le daba ánimo para seguir adelante.",
    "Proverbs 15:22": "Sin consejo, los planes fracasan; con muchos consejeros se afirman.",
    "Luke 14:28": "Jesús enseña a sentarse primero y calcular el costo antes de construir una torre. La sabiduría cuenta el precio antes del compromiso.",
    "2 Corinthians 9:6-8": "El que siembra poco, poco segará; el que siembra generosamente, generosamente segará. Dar debe salir de un corazón dispuesto, no por obligación.",
    "Proverbs 21:5": "Los planes del diligente llevan a la abundancia; la prisa suele llevar a la escasez.",
    "Matthew 6:25-34": "Jesús enseña a no vivir dominados por la ansiedad por la comida, la ropa o el mañana. Busca primero el reino de Dios y vive hoy con confianza.",
  },
  fr: {
    "Matthew 25:14-30": "Un homme confia à ses serviteurs différentes sommes avant de partir. Ceux qui ont travaillé fidèlement ont été félicités; celui qui a caché ce qui lui avait été confié par peur a été repris. Fidélité, courage et responsabilité font fructifier ce qui nous est remis.",
    "Proverbs 22:7": "Le riche domine sur le pauvre, et celui qui emprunte devient l'esclave du prêteur.",
    "Philippians 4:11-13": "Paul a appris à être content en toute situation, dans le manque comme dans l'abondance. La force du Christ lui donnait d'avancer.",
    "Proverbs 15:22": "Sans conseil, les projets échouent; avec de nombreux conseillers, ils tiennent bon.",
    "Luke 14:28": "Jésus enseigne à s'asseoir d'abord et à calculer le coût avant de bâtir une tour. La sagesse compte le prix avant l'engagement.",
    "2 Corinthians 9:6-8": "Celui qui sème peu moissonnera peu; celui qui sème généreusement moissonnera généreusement. Donner doit venir d'un cœur volontaire, non d'une obligation.",
    "Proverbs 21:5": "Les projets du diligent mènent à l'abondance; la hâte mène souvent à la pénurie.",
    "Matthew 6:25-34": "Jésus enseigne à ne pas être dominé par l'inquiétude au sujet de la nourriture, des vêtements ou de demain. Cherche d'abord le royaume de Dieu et vis aujourd'hui avec confiance.",
  },
  pt: {
    "Matthew 25:14-30": "Um homem confiou diferentes quantias aos seus servos antes de viajar. Os que trabalharam com fidelidade receberam elogios; quem escondeu o que recebeu por medo foi repreendido. Fidelidade, coragem e responsabilidade fazem crescer o que nos é confiado.",
    "Proverbs 22:7": "O rico domina sobre o pobre, e quem toma emprestado fica servo de quem empresta.",
    "Philippians 4:11-13": "Paulo aprendeu a estar contente em toda situação, na falta ou na abundância. A força de Cristo lhe dava ânimo para seguir.",
    "Proverbs 15:22": "Sem conselho, os planos fracassam; com muitos conselheiros, se firmam.",
    "Luke 14:28": "Jesus ensina a sentar primeiro e calcular o custo antes de construir uma torre. A sabedoria conta o preço antes do compromisso.",
    "2 Corinthians 9:6-8": "Quem semeia pouco colherá pouco; quem semeia generosamente colherá generosamente. Dar deve nascer de um coração disposto, não por obrigação.",
    "Proverbs 21:5": "Os planos do diligente levam à abundância; a pressa costuma levar à escassez.",
    "Matthew 6:25-34": "Jesus ensina a não viver dominado pela ansiedade com comida, roupa ou amanhã. Busque primeiro o Reino de Deus e viva hoje com confiança.",
  },
  de: {
    "Matthew 25:14-30": "Ein Mann vertraute seinen Dienern vor seiner Reise unterschiedliche Summen an. Wer treu mit dem Empfangenen arbeitete, wurde gelobt; wer es aus Angst versteckte, wurde getadelt. Treue, Mut und Verantwortung lassen das Wachsende gedeihen, das uns anvertraut ist.",
    "Proverbs 22:7": "Der Reiche herrscht über den Armen, und wer borgt, wird des Leihers Knecht.",
    "Philippians 4:11-13": "Paulus lernte, in jeder Lage zufrieden zu sein, im Mangel wie im Überfluss. Die Kraft Christi gab ihm Halt zum Weitergehen.",
    "Proverbs 15:22": "Ohne Rat scheitern Pläne; mit vielen Ratgebern bleiben sie bestehen.",
    "Luke 14:28": "Jesus lehrt, sich zuerst zu setzen und die Kosten zu überschlagen, bevor man einen Turm baut. Weisheit zählt den Preis vor der Verpflichtung.",
    "2 Corinthians 9:6-8": "Wer wenig sät, wird wenig ernten; wer großzügig sät, wird großzügig ernten. Geben soll aus einem willigen Herzen kommen, nicht aus Zwang.",
    "Proverbs 21:5": "Die Pläne des Fleißigen führen zum Überfluss; Hast führt oft zur Knappheit.",
    "Matthew 6:25-34": "Jesus lehrt, sich nicht von Sorgen um Essen, Kleidung oder morgen beherrschen zu lassen. Suche zuerst Gottes Reich und lebe heute mit Vertrauen.",
  },
  yo: {
    "Matthew 25:14-30": "Ọkùnrin kan fi ohun-ini rẹ̀ lé àwọn ọmọ-ọdọ rẹ̀ lọ́wọ́ gẹ́gẹ́ bí agbára wọn. Àwọn tí wọ́n ṣiṣẹ́ pẹ̀lú ohun tí a fún wọn ló gba ìyìn; ẹni tó fi tálẹ́ǹtì rẹ̀ pamọ́ nítorí ìbẹ̀rù ni a dá lẹ́bi. Ọgbọ́n, ìgboyà, àti ojúṣe ló ń jẹ́ kó dàgbà.",
    "Proverbs 22:7": "Ọlọ́rọ̀ máa ń ṣàkóso talaka, ẹni tí ó sì yá owó sì di ẹrú ẹni tí ó yá a.",
    "Philippians 4:11-13": "Paulu kọ́ bí a ṣe lè ní ìtẹ́lọ́run ní gbogbo ipò, nígbà tí ohun bá kéré tàbí tí ó pọ̀. Agbara Kristi ni ó mú kí ó lè koju ohun gbogbo.",
    "Proverbs 15:22": "Níbi tí kò sí ìmọ̀ràn, èrò máa ń ṣubú; ṣùgbọ́n nígbà tí àwọn olùmọ̀ràn bá pọ̀, ètò ń dúró ṣinṣin.",
    "Luke 14:28": "Ẹni tí ó fẹ́ kọ́ ilé gbọ́dọ̀ kọ́kọ́ jókòó ka owó àti ìye iṣẹ́ kí ó tó bẹ̀rẹ̀.",
    "2 Corinthians 9:6-8": "Ẹni tó bá pọnrúgbìn díẹ̀ máa ká díẹ̀; ẹni tó bá pọnrúgbìn púpọ̀ máa ká púpọ̀. Ẹ̀bùn gbọ́dọ̀ wá láti inú ọkàn tó fẹ́rẹ́rìn-ín, kì í ṣe lábẹ́ fífi ipa mú.",
    "Proverbs 21:5": "Ètò ẹni aláìní lágbára máa ń mu èrè wá; ìkánjú sì máa ń yọrí sí àìní.",
    "Matthew 6:25-34": "Jésù kọ́ wa pé kí a má jẹ́ kí aibalẹ̀ lórí oúnjẹ, aṣọ, tàbí ọ̀la gba ọkàn wa. Kí a wa ìjọba Ọlọ́run kọ́kọ́, kí a sì gbé lónìí pẹ̀lú ìgbẹ́kẹ̀lé.",
  },
  ig: {
    "Matthew 25:14-30": "Nwoke nyere ndị ohu ya ihe onwunwe ya n’usoro ike ha. Ndị ji ihe e nyere ha rụọ ọrụ n’ụzọ kwesịrị ntụkwasị obi natara otuto; onye zoro nke ya n’ihi egwu kwaa ụta. A na-akwanyere ntụkwasị obi, obi ike, na ọrụ ọma ùgwù.",
    "Proverbs 22:7": "Onye bara ọgaranya na-achị onye ogbenye, onye na-agbaziri agbaziri aghọ ohu nke onye gbaziri ya.",
    "Philippians 4:11-13": "Pọl mụtara ịdị afọ ojuju n’ọnọdụ ọ bụla, ma mgbe ihe dị ntakịrị ma mgbe ọ bara ụba. Ike Kraịst nyere ya ike ịnagide ihe niile.",
    "Proverbs 15:22": "N’enweghị ndụmọdụ, atụmatụ na-ada; ma mgbe ndụmọdụ dị ọtụtụ, ha na-eguzosi ike.",
    "Luke 14:28": "Onye chọrọ iwulite ụlọ elu ga-ebu ụzọ nọdụ ala gụọ ọnụ ahịa ya ma hụ ma o nwere ike imecha ya tupu ọ bido.",
    "2 Corinthians 9:6-8": "Onye na-akụ mkpụrụ pere mpe ga-akọrọ pere mpe; onye na-akụ ọtụtụ ga-akọrọ ọtụtụ. Inye kwesịrị ịpụta n’obi dị njikere, ọ bụghị n’ike ma ọ bụ n’ịtụ ụjọ.",
    "Proverbs 21:5": "Atụmatụ nke onye na-arụsi ọrụ ike na-ebute uru; ọsọ ọsọ na-akpụkarị ụkọ.",
    "Matthew 6:25-34": "Jisọs kụziiri ka anyị ghara ikwe ka nchegbu banyere nri, uwe, ma ọ bụ echi jide anyị. Chọọ Alaeze Chineke mbụ, bie taa n’ime ntụkwasị obi.",
  },
  ha: {
    "Matthew 25:14-30": "Wani mutum ya ba bayinsa dukiyarsa gwargwadon ƙarfinsu. Waɗanda suka yi aiki da abin da aka ba su cikin aminci sun sami yabo; wanda ya ɓoye nasa saboda tsoro ya fuskanci hukunci. Aminci, jaruntaka, da alhaki ne ake yabawa.",
    "Proverbs 22:7": "Mai arziki yana mulkin matalauci, mai rance kuma bawa ne ga mai ba da rance.",
    "Philippians 4:11-13": "Bulus ya koyi wadatar zuciya a kowane hali, ko lokacin ƙaranci ko lokacin yalwa. Ta wurin ikon Kristi ya iya jimre wa kowane abu.",
    "Proverbs 15:22": "Idan babu shawara, shirye-shirye sukan rushe; amma inda mashawarta suke da yawa, sukan tsaya da ƙarfi.",
    "Luke 14:28": "Duk wanda yake son gina hasumiya sai ya fara zaune ya ƙididdige kuɗin ginin, ko zai iya kammala ta kafin ya fara.",
    "2 Corinthians 9:6-8": "Wanda ya shuka kaɗan zai girbe kaɗan; wanda ya shuka da yawa zai girbe da yawa. Baiwar bayarwa ta fito ne daga zuciya mai yarda, ba daga tilas ba.",
    "Proverbs 21:5": "Tsarin mai himma yana kaiwa ga riba; gaggawa kuma kan kai ga rashi.",
    "Matthew 6:25-34": "Yesu ya koya mana kada damuwa game da abinci, sutura, ko gobe ta mamaye mu. Ku fara neman Mulkin Allah, ku rayu yau da amincewa.",
  },
};

function normalizeScriptureReference(reference: string) {
  return reference.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
}

function parseScriptureReference(reference: string) {
  const normalized = normalizeScriptureReference(reference);
  const match = normalized.match(/^(.+?)\s+(\d+):(\d+)(?:\s*-\s*(\d+))?$/);
  if (!match) {
    return null;
  }
  const start = Number(match[3]);
  const end = match[4] ? Number(match[4]) : start;
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null;
  }
  return {
    book: match[1].trim().toLowerCase().replace(/\s+/g, " "),
    chapter: Number(match[2]),
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

export function canonicalScriptureReference(scripture: string) {
  const normalizedScripture = normalizeScriptureReference(scripture);
  const exactReference = curatedScriptureReferences.find(
    (reference) => normalizeScriptureReference(reference).toLowerCase() === normalizedScripture.toLowerCase()
  );
  if (exactReference) {
    return exactReference;
  }

  const requested = parseScriptureReference(normalizedScripture);
  if (!requested) {
    return scripture;
  }

  const overlappingReference = curatedScriptureReferences.find((candidate) => {
    const parsed = parseScriptureReference(candidate);
    if (!parsed) {
      return false;
    }
    return (
      parsed.book === requested.book &&
      parsed.chapter === requested.chapter &&
      requested.start <= parsed.end &&
      requested.end >= parsed.start
    );
  });

  return overlappingReference ?? scripture;
}

export function localizedScriptureRead(scripture: string, preferences: UserPreferences): ScriptureRead {
  const canonical = canonicalScriptureReference(scripture);
  const localized = localizedScriptureReads[preferences.bibleTranslation]?.[canonical];
  if (localized) {
    return { ...localized, kind: "translation" };
  }

  const localizedSummary = localizedScriptureSummaries[preferences.language]?.[canonical];
  const preferredTranslation = bibleTranslations[preferences.bibleTranslation] ?? bibleTranslations.WEB;
  const labelCopy = localizedScriptureLabelCopy[preferences.language] ?? localizedScriptureLabelCopy.en;
  if (localizedSummary) {
    return {
      translation: preferences.bibleTranslation,
      label: `${preferredTranslation.label} ${labelCopy.summary}`,
      text: localizedSummary,
      availableLanguage: preferences.language,
      kind: "summary",
    };
  }

  const fallback = scriptureQuickReads[canonical];
  if (fallback && preferences.bibleTranslation !== fallback.translation) {
    return {
      translation: preferences.bibleTranslation,
      label: `${preferredTranslation.label} ${labelCopy.summary}`,
      text: preferences.language === "en" ? fallback.text : localizedScriptureFallbackText[preferences.language],
      availableLanguage: preferences.language,
      kind: "summary",
    };
  }

  return {
    translation: fallback?.translation ?? preferences.bibleTranslation,
    label: fallback?.label ?? labelCopy.curatedReference,
    text:
      fallback?.text ?? localizedScriptureFallbackText[preferences.language],
    availableLanguage: preferences.language,
    kind: fallback?.label === "Selected reading" ? "summary" : "translation",
  };
}

export function scriptureTranslationLabel(scripture: string, preferences: UserPreferences) {
  const read = localizedScriptureRead(scripture, preferences);
  const language = languages[read.availableLanguage] ?? languages.en;
  const labelCopy = localizedScriptureLabelCopy[preferences.language] ?? localizedScriptureLabelCopy.en;
  if (read.kind === "summary") {
    const translation = bibleTranslations[read.translation as BibleTranslation] ?? bibleTranslations.WEB;
    return `${translation.label} ${labelCopy.summary}`;
  }
  const fallbackLabel =
    read.translation === preferences.bibleTranslation && read.availableLanguage === preferences.language
      ? ""
      : ` ${labelCopy.fallback}`;

  return `${read.translation} ${language.name}${fallbackLabel}`;
}

export function scriptureDisplayLabel(scripture: string, preferences: UserPreferences) {
  const read = localizedScriptureRead(scripture, preferences);
  const preferredTranslation = bibleTranslations[preferences.bibleTranslation] ?? bibleTranslations.WEB;
  const labelCopy = localizedScriptureLabelCopy[preferences.language] ?? localizedScriptureLabelCopy.en;

  if (read.kind === "translation") {
    return preferredTranslation.label;
  }

  if (read.kind === "summary") {
    return `${preferredTranslation.label} ${labelCopy.summary}`;
  }

  return preferredTranslation.label;
}

export const languageCopy: Record<
  LanguageCode,
  {
    onboarding: string;
    dailyLabel: string;
    translationFallback: string;
    voiceHint: string;
    askPlaceholder: string;
    regionHint: string;
  }
> = {
  en: {
    onboarding: "Choose how Aletheia should speak: language, region, Bible translation, and voice.",
    dailyLabel: "Daily Wisdom",
    translationFallback: "Scripture references use your preferred public-domain translation where available.",
    voiceHint: "Use voice for a slower, more reflective conversation when your browser supports it.",
    askPlaceholder: "Ask with wisdom, not hurry...",
    regionHint: "Examples will reflect your region without pretending to know local law or taxes.",
  },
  es: {
    onboarding: "Elige cómo debe hablar Aletheia: idioma, región, traducción bíblica y voz.",
    dailyLabel: "Sabiduría diaria",
    translationFallback: "Las referencias bíblicas usan tu traducción pública preferida cuando está disponible.",
    voiceHint: "Usa la voz para una conversación más pausada si tu navegador lo permite.",
    askPlaceholder: "Pregunta con sabiduría, no con prisa...",
    regionHint: "Los ejemplos reflejarán tu región sin reemplazar consejo legal, fiscal o financiero.",
  },
  fr: {
    onboarding: "Choisis la manière dont Aletheia doit parler: langue, région, traduction biblique et voix.",
    dailyLabel: "Sagesse du jour",
    translationFallback: "Les références bibliques utilisent votre traduction du domaine public préférée lorsqu’elle est disponible.",
    voiceHint: "Utilise la voix pour une conversation plus lente si ton navigateur le permet.",
    askPlaceholder: "Pose ta question avec sagesse, sans précipitation...",
    regionHint: "Les exemples tiendront compte de ta région sans remplacer un conseil professionnel.",
  },
  pt: {
    onboarding: "Escolha como Aletheia deve falar: idioma, região, tradução bíblica e voz.",
    dailyLabel: "Sabedoria diária",
    translationFallback: "As referências bíblicas usam sua tradução de domínio público preferida quando disponível.",
    voiceHint: "Use voz para uma conversa mais calma quando o navegador permitir.",
    askPlaceholder: "Pergunte com sabedoria, não com pressa...",
    regionHint: "Os exemplos considerarão sua região sem substituir aconselhamento profissional.",
  },
  de: {
    onboarding: "Wähle, wie Aletheia sprechen soll: Sprache, Region, Bibelübersetzung und Stimme.",
    dailyLabel: "Tägliche Weisheit",
    translationFallback: "Bibelstellen verwenden nach Möglichkeit deine bevorzugte gemeinfreie Übersetzung.",
    voiceHint: "Nutze Sprache für ein ruhigeres Gespräch, wenn dein Browser es unterstützt.",
    askPlaceholder: "Frage mit Weisheit, nicht aus Eile...",
    regionHint: "Beispiele berücksichtigen deine Region, ersetzen aber keine Fachberatung.",
  },
  yo: {
    onboarding: "Yan bí Aletheia ṣe máa ba ọ sọrọ: èdè, agbègbè, ìtumọ̀ Bíbélì, àti ohùn.",
    dailyLabel: "Ọgbọ́n ojoojúmọ́",
    translationFallback: "A máa lo ìtumọ̀ Bíbélì tó o fẹ́ nígbà gbogbo tí ó bá wà.",
    voiceHint: "Lo ohùn fún ìjíròrò tó lọra tí browser rẹ bá gba.",
    askPlaceholder: "Béèrè pẹ̀lú ọgbọ́n, kì í ṣe pẹ̀lú ìkánjú...",
    regionHint: "Àpẹẹrẹ yóò rántí agbègbè rẹ, ṣùgbọ́n kò rọ́pò ìmọ̀ràn amọ̀ja.",
  },
  ig: {
    onboarding: "Họrọ otu Aletheia ga-esi gwa gị okwu: asụsụ, mpaghara, ntụgharị Baịbụl, na olu.",
    dailyLabel: "Amamihe kwa ụbọchị",
    translationFallback: "A ga-eji ntụgharị Baịbụl ị họrọ mgbe ọ bụla ọ dị.",
    voiceHint: "Jiri olu mee mkparịta ụka dị nwayọọ ma ọ bụrụ na browser gị kwadoro ya.",
    askPlaceholder: "Jụọ n'amamihe, ọ bụghị n'ịgba ọsọ...",
    regionHint: "Ihe atụ ga-elebara mpaghara gị anya, ma ọ naghị dochie ndụmọdụ ọkachamara.",
  },
  ha: {
    onboarding: "Zaɓi yadda Aletheia za ta yi magana da kai: harshe, yanki, fassarar Littafi Mai Tsarki, da murya.",
    dailyLabel: "Hikima ta yau",
    translationFallback: "Za mu yi amfani da fassarar Littafi Mai Tsarki da ka fi so idan tana nan.",
    voiceHint: "Yi amfani da murya don tattaunawa a hankali idan browser ɗinka ya goyi baya.",
    askPlaceholder: "Tambaya da hikima, ba da gaggawa ba...",
    regionHint: "Misalai za su dace da yankinka, amma ba su maye gurbin shawarar ƙwararre ba.",
  },
};

export const localizedDailyPractices: Record<LanguageCode, Partial<Record<Mode, string>>> = {
  en: {
    Money: "Today, do not optimize for more. Define enough.",
    Work: "Today, choose the next faithful step before chasing the impressive one.",
    Purpose: "Today, let peace set the pace of discernment.",
    Generosity: "Today, give from conviction, not guilt.",
    Life: "Today, choose one ordinary habit that makes the rest of life steadier.",
  },
  es: {
    Money: "Hoy, no optimices para tener más. Define qué es suficiente.",
    Work: "Hoy, elige el siguiente paso fiel antes que el más impresionante.",
    Purpose: "Hoy, deja que la paz marque el ritmo del discernimiento.",
    Generosity: "Hoy, da por convicción, no por culpa.",
    Life: "Hoy, elige un hábito sencillo que haga más firme el resto de tu vida.",
  },
  fr: {
    Money: "Aujourd’hui, ne cherche pas seulement plus. Définis ce qui suffit.",
    Work: "Aujourd’hui, choisis le prochain pas fidèle avant le pas impressionnant.",
    Purpose: "Aujourd’hui, laisse la paix donner le rythme du discernement.",
    Generosity: "Aujourd’hui, donne par conviction, non par culpabilité.",
    Life: "Aujourd’hui, choisis une habitude ordinaire qui rendra le reste de la vie plus stable.",
  },
  pt: {
    Money: "Hoje, não otimize para ter mais. Defina o suficiente.",
    Work: "Hoje, escolha o próximo passo fiel antes do passo impressionante.",
    Purpose: "Hoje, deixe a paz definir o ritmo do discernimento.",
    Generosity: "Hoje, dê por convicção, não por culpa.",
    Life: "Hoje, escolha um hábito simples que torne o resto da vida mais firme.",
  },
  de: {
    Money: "Heute geht es nicht um mehr. Definiere, was genug ist.",
    Work: "Wähle heute den nächsten treuen Schritt vor dem beeindruckenden.",
    Purpose: "Lass heute Frieden das Tempo deiner Klärung bestimmen.",
    Generosity: "Gib heute aus Überzeugung, nicht aus Schuldgefühl.",
    Life: "Wähle heute eine gewöhnliche Gewohnheit, die den Rest des Lebens stabiler macht.",
  },
  yo: {
    Money: "Lónìí, má ṣe lé pọ̀ síi nìkan. Sọ ohun tó tó di mímọ̀.",
    Work: "Lónìí, yan ìgbésẹ̀ olóòtítọ́ tó kàn kí o tó lé ohun tó ń yanilẹ́nu.",
    Purpose: "Lónìí, jẹ́ kí àlàáfíà ṣètò ìyára ìmọ̀ràn rẹ.",
    Generosity: "Lónìí, fúnni látinú ìdánilójú, kì í ṣe ẹ̀bi.",
    Life: "Lónìí, yan àṣà kan tó wọ́pọ̀ tó máa mú kí ìyókù ayé rẹ dáa síi.",
  },
  ig: {
    Money: "Taa, achụla naanị karịa. Kọwaa ihe zuru ezu.",
    Work: "Taa, họrọ nzọụkwụ kwesịrị ntụkwasị obi tupu ihe na-adọrọ mmasị.",
    Purpose: "Taa, ka udo duzie ọsọ nghọta gị.",
    Generosity: "Taa, nye site n'ikwere, ọ bụghị site n'ikpe ọmụma.",
    Life: "Taa, họrọ otu omume nkịtị ga-eme ka ndụ ndị ọzọ bụrụ nke siri ike.",
  },
  ha: {
    Money: "Yau, kada ka bi ƙarin abu kawai. Ka bayyana abin da ya isa.",
    Work: "Yau, zaɓi mataki mai aminci kafin abin burgewa.",
    Purpose: "Yau, bari salama ta tsara saurin fahimtarka.",
    Generosity: "Yau, ka bayar da tabbaci, ba saboda laifi ba.",
    Life: "Yau, zaɓi wata al'ada mai sauƙi da za ta sa sauran rayuwa ta fi ƙarfi.",
  },
};

const localizedWisdomThemes: Partial<Record<LanguageCode, Record<string, string>>> = {
  es: {
    Stewardship: "Administración",
    Debt: "Deuda",
    Contentment: "Contentamiento",
    Counsel: "Consejo",
    "Cost Counting": "Cálculo del costo",
    Generosity: "Generosidad",
    Diligence: "Diligencia",
    "Provision and Anxiety": "Provisión y ansiedad",
  },
  fr: {
    Stewardship: "Gestion fidèle",
    Debt: "Dette",
    Contentment: "Contentement",
    Counsel: "Conseil",
    "Cost Counting": "Calcul du coût",
    Generosity: "Générosité",
    Diligence: "Diligence",
    "Provision and Anxiety": "Provision et anxiété",
  },
  pt: {
    Stewardship: "Administração",
    Debt: "Dívida",
    Contentment: "Contentamento",
    Counsel: "Conselho",
    "Cost Counting": "Cálculo do custo",
    Generosity: "Generosidade",
    Diligence: "Diligência",
    "Provision and Anxiety": "Provisão e ansiedade",
  },
  yo: {
    Stewardship: "Ìtọ́jú ohun tí a fi lé wa lọ́wọ́",
    Debt: "Gbèsè",
    Contentment: "Ìtẹ́lọ́run",
    Counsel: "Ìmọ̀ràn",
    "Cost Counting": "Kíka iye",
    Generosity: "Ìfẹ́ fúnni",
    Diligence: "Ìfarabalẹ̀ iṣẹ́",
    "Provision and Anxiety": "Ìpèsè àti àníyàn",
  },
  de: {
    Stewardship: "Verantwortliche Verwaltung",
    Debt: "Schulden",
    Contentment: "Genügsamkeit",
    Counsel: "Rat",
    "Cost Counting": "Kosten prüfen",
    Generosity: "Großzügigkeit",
    Diligence: "Sorgfalt",
    "Provision and Anxiety": "Versorgung und Sorge",
  },
};

const localizedScriptureLabelCopy: Record<LanguageCode, { summary: string; fallback: string; curatedReference: string }> = {
  en: { summary: "summary", fallback: "fallback", curatedReference: "Curated wisdom reference" },
  es: { summary: "resumen", fallback: "respaldo", curatedReference: "Referencia de sabiduria curada" },
  fr: { summary: "resume", fallback: "repli", curatedReference: "Reference de sagesse selectionnee" },
  pt: { summary: "resumo", fallback: "reserva", curatedReference: "Referencia de sabedoria curada" },
  de: { summary: "Zusammenfassung", fallback: "Ersatz", curatedReference: "Kuratiertes Weisheitsreferenz" },
  yo: { summary: "akotan", fallback: "afowose", curatedReference: "Itokasi ogbon ti a yan" },
  ig: { summary: "nchikota", fallback: "ndabere", curatedReference: "Ntughari amamihe ahoputara" },
  ha: { summary: "takaitawa", fallback: "madadi", curatedReference: "Nassin hikima da aka tace" },
};

const localizedScriptureFallbackText: Record<LanguageCode, string> = {
  en: "This reference is part of Aletheia's curated wisdom library. The app only surfaces known references and avoids inventing verse text.",
  es: "Esta referencia forma parte de la biblioteca de sabiduría curada de Aletheia. La app solo muestra referencias conocidas y evita inventar texto bíblico.",
  fr: "Cette référence fait partie de la bibliothèque de sagesse curée d'Aletheia. L'application n'affiche que des références connues et évite d'inventer du texte biblique.",
  pt: "Esta referência faz parte da biblioteca de sabedoria curada da Aletheia. O app só mostra referências conhecidas e evita inventar texto bíblico.",
  de: "Diese Stelle gehört zu Aletheias kuratierter Weisheitsbibliothek. Die App zeigt nur bekannte Verweise und erfindet keinen Bibeltext.",
  yo: "Ìtọ́kasí yìí jẹ́ apá kan nínú ìkàwé ọgbọ́n tí Aletheia ti yan. Ohun elo naa ń fi àwọn ìtọ́kasí tí a mọ̀ hàn, kò sì ń dá ọ̀rọ̀ Bíbélì tuntun sílẹ̀.",
  ig: "Ntụaka a bụ akụkụ nke ụlọ akwụkwọ amamihe Aletheia họrọ. Ngwa ahụ na-egosi naanị ntụaka a maara ma ghara ịmepụta ederede amaokwu ọhụrụ.",
  ha: "Wannan nassin yana cikin ɗakin hikimar Aletheia da aka tace. Manhajar tana nuna nassoshi da aka sani kawai, ba ta ƙirƙiri sabon rubutun ayar ba.",
};

const localizedRegionLabels: Partial<Record<LanguageCode, Partial<Record<RegionCode, string>>>> = {
  es: { global: "Mundo", us: "Estados Unidos", uk: "Reino Unido", eu: "Europa", ng: "Nigeria", br: "Brasil", latam: "América Latina" },
  fr: { global: "Monde", us: "États-Unis", uk: "Royaume-Uni", eu: "Europe", ng: "Nigeria", br: "Brésil", latam: "Amérique latine" },
  pt: { global: "Global", us: "Estados Unidos", uk: "Reino Unido", eu: "Europa", ng: "Nigéria", br: "Brasil", latam: "América Latina" },
  de: { global: "Weltweit", us: "Vereinigte Staaten", uk: "Vereinigtes Königreich", eu: "Europa", ng: "Nigeria", br: "Brasilien", latam: "Lateinamerika" },
  yo: { global: "Agbaye", us: "Orílẹ̀-èdè Amẹ́ríkà", uk: "Orílẹ̀-èdè Gẹ̀ẹ́sì", eu: "Yúróòpù", ng: "Nàìjíríà", br: "Bràsíl", latam: "Amẹ́ríkà Látìn" },
  ig: { global: "Uwa niile", us: "United States", uk: "United Kingdom", eu: "Europe", ng: "Naịjịrịa", br: "Brazil", latam: "Latin America" },
  ha: { global: "Duniya", us: "Amurka", uk: "Birtaniya", eu: "Turai", ng: "Najeriya", br: "Brazil", latam: "Latin Amurka" },
};

const localizedModeProfiles: Partial<Record<LanguageCode, Partial<Record<Mode, Partial<ModeProfile>>>>> = {
  en: {
    Money: {
      intent: "Steward resources with peace and clarity.",
      focus: "Budgeting, debt, saving, investing, contentment",
      useWhen: "Use for spending, debt, saving, investing, financial anxiety, or comparison.",
      lens: "A stewardship lens: freedom, enough, patience, risk, and faithful responsibility.",
      diagnosticTracks: [
        "Freedom: will this choice increase or reduce wise options later?",
        "Enough: is the desire clear, or is comparison setting the target?",
        "Risk: what can go wrong, and have I counted the cost soberly?",
      ],
      blindSpots: [
        "Confusing faith with financial certainty",
        "Calling lifestyle pressure a need",
        "Treating debt capacity as permission",
      ],
      maturitySignals: [
        "The plan still makes sense after waiting",
        "Numbers are visible, not vague",
        "Counsel has challenged the assumptions",
      ],
      practices: [
        "Name what is enough for this season",
        "Write the repayment, saving, or giving plan plainly",
        "Wait overnight before irreversible spending",
      ],
      responseMoves: [
        "Separate desire, fear, and responsibility",
        "Clarify tradeoffs without shaming the user",
        "Translate scripture into concrete stewardship habits",
      ],
      promptCue:
        "In Money mode, emphasize stewardship, contentment, debt caution, wise risk, long-term responsibility, generosity, and emotional regulation around money. Avoid investment advice or outcome promises.",
      prompts: [
        "How do I build wealth without greed?",
        "What does wisdom say about debt?",
        "How do I stop comparing myself financially?",
      ],
    },
    Work: {
      intent: "Discern work, calling, leadership, and sustainable ambition.",
      focus: "Career moves, leadership, business, burnout, vocation",
      useWhen: "Use for job decisions, business ideas, leadership pressure, burnout, or ambition.",
      lens: "A vocation lens: diligence, counsel, cost counting, service, and sustainable pace.",
      diagnosticTracks: [
        "Calling: what kind of service or responsibility is being clarified?",
        "Capacity: does the user's life have room for this commitment?",
        "Counsel: who can test the plan without controlling it?",
      ],
      blindSpots: [
        "Mistaking restlessness for calling",
        "Using spiritual language to avoid planning",
        "Confusing applause with fruitfulness",
      ],
      maturitySignals: [
        "The user can name the tradeoffs honestly",
        "There is a reversible next experiment",
        "Wise counsel has seen the numbers and motives",
      ],
      practices: [
        "Define the smallest reversible step",
        "Write the real cost in time, money, and attention",
        "Ask a critic what part of the plan is fragile",
      ],
      responseMoves: [
        "Distinguish calling, ambition, escape, and fatigue",
        "Bring the decision down to the next faithful experiment",
        "Use counsel and cost-counting as stabilizers",
      ],
      promptCue:
        "In Work mode, emphasize vocation, diligence, wise counsel, leadership character, cost counting, sustainable ambition, and service. Help the user examine motives and tradeoffs before major work decisions.",
      prompts: [
        "Should I leave my stable job?",
        "How do I know if ambition is healthy?",
        "Should I start this business now?",
      ],
    },
    Purpose: {
      intent: "Slow down and discern the person this decision forms.",
      focus: "Identity, direction, anxiety, values, long-term clarity",
      useWhen: "Use when the real question is identity, direction, peace, timing, or values.",
      lens: "A discernment lens: identity, peace, motives, patience, and the next faithful step.",
      diagnosticTracks: [
        "Identity: what is the user trying to prove, protect, or become?",
        "Peace: what changes when urgency quiets down?",
        "Motives: which desire is good, and which one is distorted?",
      ],
      blindSpots: [
        "Waiting for perfect certainty before faithful action",
        "Treating anxiety as discernment",
        "Letting success define identity",
      ],
      maturitySignals: [
        "The next step is clear even if the whole path is not",
        "The user can name motives without self-condemnation",
        "The decision can be held with patience",
      ],
      practices: [
        "Name the fear underneath the decision",
        "Write one sentence about the person this choice forms",
        "Choose the next faithful step for the next 24 hours",
      ],
      responseMoves: [
        "Lower urgency and restore agency",
        "Separate identity from outcome",
        "Invite honest motive examination without shame",
      ],
      promptCue:
        "In Purpose mode, emphasize discernment, identity, motives, peace, patience, values, prayerful reflection, and the next faithful step. Keep the guidance grounded and non-mystical; do not claim divine certainty.",
      prompts: [
        "How do I make a decision when I feel unclear?",
        "What if I am chasing success for the wrong reasons?",
        "How do I find peace about my next step?",
      ],
    },
    Generosity: {
      intent: "Give freely without guilt, pressure, or performance.",
      focus: "Giving, family support, charity, boundaries, sustainability",
      useWhen: "Use for giving, tithing, helping family, boundaries, or sustainable generosity.",
      lens: "A generosity lens: willingness, sustainability, joy, wisdom, and love without coercion.",
      diagnosticTracks: [
        "Freedom: is the gift willing, or driven by guilt and fear?",
        "Sustainability: can this generosity continue without hidden resentment?",
        "Wisdom: does helping here strengthen responsibility or enable harm?",
      ],
      blindSpots: [
        "Calling guilt generosity",
        "Giving publicly to feel spiritually impressive",
        "Rescuing others from consequences they need to face",
      ],
      maturitySignals: [
        "The gift is free, not coerced",
        "Boundaries are clear and kind",
        "The giving plan is sustainable",
      ],
      practices: [
        "Decide the gift before the pressure moment",
        "Set a giving boundary in plain language",
        "Ask whether money is the best form of help",
      ],
      responseMoves: [
        "Remove guilt and pressure from the center",
        "Protect cheerful generosity and wise boundaries",
        "Ask whether the gift helps or enables",
      ],
      promptCue:
        "In Generosity mode, emphasize cheerful willingness, sustainability, boundaries, non-coercion, compassion, and responsible giving. Reject guilt-driven or performative giving.",
      prompts: [
        "How do I give without guilt or pressure?",
        "Should I help family financially again?",
        "How much generosity is sustainable for me?",
      ],
    },
    Life: {
      intent: "Apply biblical wisdom to ordinary life with steady, grounded attention.",
      focus: "Habits, relationships, family, rest, health, home rhythms",
      useWhen: "Use for everyday life decisions, routines, relationships, habits, rest, conflict, or when the right next step is not obviously a money or work question.",
      lens: "A whole-life lens: character, relationships, responsibilities, rhythms, and the next faithful step.",
      diagnosticTracks: [
        "Character: what kind of person is this habit or choice forming?",
        "Relationships: who is affected by this, and how can I love them well?",
        "Rhythm: does this create space for rest, attention, and repair?",
      ],
      blindSpots: [
        "Treating ordinary life choices as spiritually irrelevant",
        "Over-spiritualizing what needs practical wisdom",
        "Ignoring body, family, or rest while chasing meaning",
      ],
      maturitySignals: [
        "The decision fits with healthy rhythms, not only ambition",
        "The people closest to the change are considered with care",
        "The next step is simple enough to obey",
      ],
      practices: [
        "Name the smallest faithful habit you can repeat",
        "Check whether this choice strengthens or frays your relationships",
        "Protect a rhythm of rest before adding pressure",
      ],
      responseMoves: [
        "Bring the question down from abstraction into ordinary life",
        "Connect wisdom to habits, relationships, and household realities",
        "Keep the next step concrete and sustainable",
      ],
      promptCue:
        "In Life mode, emphasize ordinary biblical wisdom for family, relationships, habits, rest, conflict, home rhythms, health, and the next faithful small step. Keep the counsel grounded, practical, and gentle.",
      prompts: [
        "How do I make my daily life wiser?",
        "How should I think about this relationship?",
        "What habit should I change first?",
      ],
    },
  },
  es: {
    Money: {
      intent: "Administra los recursos con paz y claridad.",
      focus: "Presupuesto, deuda, ahorro, inversion, contentamiento",
      useWhen: "Usalo para gastos, deuda, ahorro, inversion, ansiedad financiera o comparacion.",
      lens: "Una mirada de administracion: libertad, suficiencia, paciencia, riesgo y responsabilidad fiel.",
      diagnosticTracks: [
        "Libertad: esta decision ampliara o reducira las opciones sabias despues?",
        "Suficiencia: el deseo es claro o la comparacion esta fijando el objetivo?",
        "Riesgo: que puede salir mal y ya calcule el costo con sobriedad?",
      ],
      blindSpots: [
        "Confundir fe con certeza financiera",
        "Llamar necesidad a la presion de estilo de vida",
        "Tratar la capacidad de deuda como permiso",
      ],
      maturitySignals: [
        "El plan sigue teniendo sentido despues de esperar",
        "Los numeros estan visibles, no vagos",
        "El consejo ha cuestionado los supuestos",
      ],
      practices: [
        "Nombra lo que basta para esta temporada",
        "Escribe con claridad el plan de pago, ahorro o donacion",
        "Espera una noche antes de gastar de forma irreversible",
      ],
      responseMoves: [
        "Separa deseo, miedo y responsabilidad",
        "Aclara los intercambios sin avergonzar al usuario",
        "Traduce la Escritura en habitos concretos de administracion",
      ],
      promptCue:
        "En Money mode, enfatiza administracion, contentamiento, cautela con la deuda, riesgo sabio, responsabilidad a largo plazo, generosidad y regulacion emocional con el dinero. Evita consejos de inversion o promesas de resultados.",
      prompts: [
        "Como puedo construir riqueza sin codicia?",
        "Que dice la sabiduria sobre la deuda?",
        "Como dejo de compararme financieramente?",
      ],
    },
    Work: {
      intent: "Discierne trabajo, llamado, liderazgo y ambicion sostenible.",
      focus: "Cambios de carrera, liderazgo, negocio, agotamiento, vocacion",
      useWhen: "Usalo para decisiones de empleo, ideas de negocio, presion de liderazgo, agotamiento o ambicion.",
      lens: "Una mirada de vocacion: diligencia, consejo, calcular el costo, servicio y ritmo sostenible.",
      diagnosticTracks: [
        "Llamado: que tipo de servicio o responsabilidad se esta aclarando?",
        "Capacidad: la vida del usuario tiene espacio para este compromiso?",
        "Consejo: quien puede probar el plan sin controlarlo?",
      ],
      blindSpots: [
        "Confundir inquietud con llamado",
        "Usar lenguaje espiritual para evitar planear",
        "Confundir aplauso con fruto",
      ],
      maturitySignals: [
        "El usuario puede nombrar los intercambios con honestidad",
        "Hay un siguiente experimento reversible",
        "El consejo sabio ya vio los numeros y los motivos",
      ],
      practices: [
        "Define el paso reversible mas pequeno",
        "Escribe el costo real en tiempo, dinero y atencion",
        "Pregunta a un critico que parte del plan es fragil",
      ],
      responseMoves: [
        "Distingue llamado, ambicion, escape y cansancio",
        "Lleva la decision al siguiente experimento fiel",
        "Usa consejo y calculo del costo como estabilizadores",
      ],
      promptCue:
        "En Work mode, enfatiza vocacion, diligencia, consejo sabio, caracter de liderazgo, calculo del costo, ambicion sostenible y servicio. Ayuda al usuario a examinar motivos e intercambios antes de grandes decisiones de trabajo.",
      prompts: [
        "Deberia dejar mi trabajo estable?",
        "Como se si mi ambicion es sana?",
        "Deberia empezar este negocio ahora?",
      ],
    },
    Purpose: {
      intent: "Baja la velocidad y discierne la persona que forma esta decision.",
      focus: "Identidad, direccion, ansiedad, valores, claridad a largo plazo",
      useWhen: "Usalo cuando la pregunta real sea identidad, direccion, paz, tiempo o valores.",
      lens: "Una mirada de discernimiento: identidad, paz, motivos, paciencia y el siguiente paso fiel.",
      diagnosticTracks: [
        "Identidad: que intenta probar, proteger o llegar a ser el usuario?",
        "Paz: que cambia cuando la urgencia se calma?",
        "Motivos: cual deseo es bueno y cual esta distorsionado?",
      ],
      blindSpots: [
        "Esperar certeza perfecta antes de actuar con fidelidad",
        "Tratar la ansiedad como discernimiento",
        "Dejar que el exito defina la identidad",
      ],
      maturitySignals: [
        "El siguiente paso es claro aunque no lo sea todo el camino",
        "El usuario puede nombrar sus motivos sin condenarse",
        "La decision puede sostenerse con paciencia",
      ],
      practices: [
        "Nombra el miedo debajo de la decision",
        "Escribe una frase sobre la persona que esta eleccion forma",
        "Elige el siguiente paso fiel para las proximas 24 horas",
      ],
      responseMoves: [
        "Baja la urgencia y devuelve agencia",
        "Separa identidad y resultado",
        "Invita a examinar los motivos con honestidad y sin vergüenza",
      ],
      promptCue:
        "En Purpose mode, enfatiza discernimiento, identidad, motivos, paz, paciencia, valores, reflexion en oracion y el siguiente paso fiel. Mantiene la guia concreta y no mistica; no afirmes certeza divina.",
      prompts: [
        "Como tomo una decision cuando no lo veo claro?",
        "Y si estoy persiguiendo el exito por razones equivocadas?",
        "Como encuentro paz sobre mi siguiente paso?",
      ],
    },
    Generosity: {
      intent: "Da libremente sin culpa, presion ni apariencia.",
      focus: "Dar, apoyo familiar, caridad, limites, sostenibilidad",
      useWhen: "Usalo para dar, diezmar, ayudar a la familia, poner limites o practicar generosidad sostenible.",
      lens: "Una mirada de generosidad: disposicion, sostenibilidad, gozo, sabiduria y amor sin coercion.",
      diagnosticTracks: [
        "Libertad: el regalo es voluntario o nace de culpa y miedo?",
        "Sostenibilidad: esta generosidad puede continuar sin resentimiento oculto?",
        "Sabiduria: ayudar aqui fortalece responsabilidad o habilita dano?",
      ],
      blindSpots: [
        "Llamar generosidad a la culpa",
        "Dar en publico para parecer espiritualmente impresionante",
        "Rescatar a otros de consecuencias que deben enfrentar",
      ],
      maturitySignals: [
        "El regalo es libre, no forzado",
        "Los limites son claros y amables",
        "El plan de dar es sostenible",
      ],
      practices: [
        "Decide el regalo antes del momento de presion",
        "Define un limite de dar con palabras claras",
        "Pregunta si el dinero es realmente la mejor ayuda",
      ],
      responseMoves: [
        "Saca la culpa y la presion del centro",
        "Protege la generosidad alegre y los limites sabios",
        "Pregunta si el regalo ayuda o habilita",
      ],
      promptCue:
        "En Generosity mode, enfatiza disposicion alegre, sostenibilidad, limites, no coercion, compasion y dar con responsabilidad. Rechaza el dar impulsado por culpa o por apariencia.",
      prompts: [
        "Como doy sin culpa ni presion?",
        "Debo ayudar otra vez economicamente a mi familia?",
        "Cuanta generosidad es sostenible para mi?",
      ],
    },
    Life: {
      intent: "Aplica la sabiduria biblica a la vida cotidiana con atencion serena.",
      focus: "Habitos, relaciones, familia, descanso, salud, ritmos del hogar",
      useWhen: "Usalo para decisiones cotidianas, rutinas, relaciones, habitos, descanso, conflicto o cuando el siguiente paso no parece ser dinero o trabajo.",
      lens: "Una mirada de vida completa: caracter, relaciones, responsabilidades, ritmos y el siguiente paso fiel.",
      diagnosticTracks: [
        "Caracter: que tipo de persona forma este habito o decision?",
        "Relaciones: a quien afecta esto y como puedo amar bien?",
        "Ritmo: crea espacio para descanso, atencion y reparacion?",
      ],
      blindSpots: [
        "Tratar las decisiones ordinarias como irrelevantes espiritualmente",
        "Espiritualizar en exceso lo que necesita sabiduria practica",
        "Ignorar cuerpo, familia o descanso mientras persigues significado",
      ],
      maturitySignals: [
        "La decision encaja con ritmos sanos, no solo ambicion",
        "Se considera con cuidado a quienes estan mas cerca del cambio",
        "El siguiente paso es simple de obedecer",
      ],
      practices: [
        "Nombra el habito fiel mas pequeno que puedes repetir",
        "Comprueba si esta decision fortalece o desgasta tus relaciones",
        "Protege un ritmo de descanso antes de añadir presion",
      ],
      responseMoves: [
        "Baja la pregunta desde la abstraccion a la vida diaria",
        "Conecta la sabiduria con habitos, relaciones y realidad del hogar",
        "Mantiene el siguiente paso concreto y sostenible",
      ],
      promptCue:
        "En Life mode, enfatiza sabiduria biblica cotidiana para familia, relaciones, habitos, descanso, conflicto, ritmos del hogar, salud y el siguiente paso pequeno y fiel. Mantiene el consejo concreto, practico y amable.",
      prompts: [
        "Como hago mi vida diaria mas sabia?",
        "Como debo pensar sobre esta relacion?",
        "Que habito debo cambiar primero?",
      ],
    },
  },
  fr: {
    Money: {
      intent: "Gerer les ressources avec paix et clarté.",
      focus: "Budget, dette, épargne, investissement, contentement",
      useWhen: "Utilise-le pour les dépenses, la dette, l'épargne, l'investissement, l'anxiété financière ou la comparaison.",
      lens: "Une grille de gestion: liberté, suffisance, patience, risque et responsabilité fidèle.",
      diagnosticTracks: [
        "Liberté: ce choix élargira-t-il ou réduira-t-il les options sages plus tard?",
        "Suffisance: le désir est-il clair ou la comparaison fixe-t-elle la cible?",
        "Risque: qu'est-ce qui peut mal tourner et ai-je compté le coût avec sobriété?",
      ],
      blindSpots: [
        "Confondre foi et certitude financière",
        "Appeler besoin la pression du style de vie",
        "Traiter la capacité d'endettement comme un permis",
      ],
      maturitySignals: [
        "Le plan a toujours du sens après attente",
        "Les chiffres sont visibles, pas flous",
        "Le conseil a challengé les hypothèses",
      ],
      practices: [
        "Nommer ce qui suffit pour cette saison",
        "Ecrire clairement le plan de remboursement, d'épargne ou de don",
        "Attendre une nuit avant une dépense irréversible",
      ],
      responseMoves: [
        "Séparer désir, peur et responsabilité",
        "Clarifier les arbitrages sans honte",
        "Traduire l'Écriture en habitudes concrètes de gestion",
      ],
      promptCue:
        "En Money mode, mets l'accent sur la gestion, le contentement, la prudence face à la dette, le risque sage, la responsabilité à long terme, la générosité et la régulation émotionnelle autour de l'argent. Évite les conseils d'investissement ou les promesses de résultat.",
      prompts: [
        "Comment bâtir de la richesse sans cupidité?",
        "Que dit la sagesse au sujet de la dette?",
        "Comment arrêter de me comparer financièrement?",
      ],
    },
    Work: {
      intent: "Discerner le travail, l'appel, le leadership et l'ambition durable.",
      focus: "Choix de carrière, leadership, entreprise, épuisement, vocation",
      useWhen: "Utilise-le pour les décisions d'emploi, les idées d'entreprise, la pression du leadership, l'épuisement ou l'ambition.",
      lens: "Une grille vocationnelle: diligence, conseil, calcul du coût, service et rythme durable.",
      diagnosticTracks: [
        "Appel: quel type de service ou de responsabilité est en train d'être clarifié?",
        "Capacité: la vie de l'utilisateur a-t-elle de la place pour cet engagement?",
        "Conseil: qui peut tester le plan sans le contrôler?",
      ],
      blindSpots: [
        "Confondre agitation et appel",
        "Utiliser le langage spirituel pour éviter la planification",
        "Confondre applaudissements et fruit",
      ],
      maturitySignals: [
        "L'utilisateur peut nommer les arbitrages honnêtement",
        "Il existe un prochain test réversible",
        "Le conseil sage a vu les chiffres et les motivations",
      ],
      practices: [
        "Définir le plus petit pas réversible",
        "Écrire le coût réel en temps, argent et attention",
        "Demander à un critique quelle partie du plan est fragile",
      ],
      responseMoves: [
        "Distinguer appel, ambition, fuite et fatigue",
        "Ramener la décision au prochain test fidèle",
        "Utiliser le conseil et le calcul du coût comme stabilisateurs",
      ],
      promptCue:
        "En Work mode, mets l'accent sur la vocation, la diligence, le conseil sage, le caractère du leader, le calcul du coût, l'ambition durable et le service. Aide l'utilisateur à examiner ses motivations et ses arbitrages avant les grandes décisions professionnelles.",
      prompts: [
        "Dois-je quitter mon emploi stable?",
        "Comment savoir si mon ambition est saine?",
        "Dois-je lancer cette entreprise maintenant?",
      ],
    },
    Purpose: {
      intent: "Ralentir et discerner la personne que cette décision façonne.",
      focus: "Identité, direction, anxiété, valeurs, clarté à long terme",
      useWhen: "Utilise-le lorsque la vraie question est l'identité, la direction, la paix, le temps ou les valeurs.",
      lens: "Une grille de discernement: identité, paix, motivations, patience et prochain pas fidèle.",
      diagnosticTracks: [
        "Identité: que cherche à prouver, protéger ou devenir l'utilisateur?",
        "Paix: qu'est-ce qui change quand l'urgence se calme?",
        "Motivations: quel désir est bon, et lequel est déformé?",
      ],
      blindSpots: [
        "Attendre une certitude parfaite avant d'agir fidèlement",
        "Prendre l'anxiété pour du discernement",
        "Laisser le succès définir l'identité",
      ],
      maturitySignals: [
        "Le prochain pas est clair même si tout le chemin ne l'est pas",
        "L'utilisateur peut nommer ses motivations sans se condamner",
        "La décision peut être tenue avec patience",
      ],
      practices: [
        "Nommer la peur sous-jacente à la décision",
        "Écrire une phrase sur la personne que ce choix façonne",
        "Choisir le prochain pas fidèle pour les 24 prochaines heures",
      ],
      responseMoves: [
        "Baisser l'urgence et rendre de l'agence",
        "Séparer identité et résultat",
        "Inviter à examiner les motivations sans honte",
      ],
      promptCue:
        "En Purpose mode, mets l'accent sur le discernement, l'identité, les motivations, la paix, la patience, les valeurs, la réflexion priante et le prochain pas fidèle. Garde un conseil concret et non mystique; ne prétends pas à une certitude divine.",
      prompts: [
        "Comment décider quand tout reste flou?",
        "Et si je poursuis le succès pour les mauvaises raisons?",
        "Comment trouver la paix pour mon prochain pas?",
      ],
    },
    Generosity: {
      intent: "Donner librement, sans culpabilité, pression ni performance.",
      focus: "Don, soutien familial, charité, limites, durabilité",
      useWhen: "Utilise-le pour donner, soutenir la famille, poser des limites ou pratiquer une générosité durable.",
      lens: "Une grille de générosité: disponibilité, durabilité, joie, sagesse et amour sans coercition.",
      diagnosticTracks: [
        "Liberté: le don est-il volontaire ou poussé par la culpabilité et la peur?",
        "Durabilité: cette générosité peut-elle continuer sans ressentiment caché?",
        "Sagesse: aider ici renforce-t-il la responsabilité ou permet-il un tort?",
      ],
      blindSpots: [
        "Appeler générosité la culpabilité",
        "Donner en public pour paraître spirituel",
        "Sauver les autres des conséquences qu'ils doivent affronter",
      ],
      maturitySignals: [
        "Le don est libre, pas forcé",
        "Les limites sont claires et bienveillantes",
        "Le plan de don est durable",
      ],
      practices: [
        "Décider du don avant le moment de pression",
        "Poser une limite de don en mots simples",
        "Demander si l'argent est vraiment la meilleure aide",
      ],
      responseMoves: [
        "Retirer la culpabilité et la pression du centre",
        "Protéger la générosité joyeuse et les limites sages",
        "Demander si le don aide ou entretient le problème",
      ],
      promptCue:
        "En Generosity mode, mets l'accent sur la disponibilité joyeuse, la durabilité, les limites, l'absence de coercition, la compassion et le don responsable. Rejette le don motivé par la culpabilité ou la mise en scène.",
      prompts: [
        "Comment donner sans culpabilité ni pression?",
        "Dois-je encore aider ma famille financièrement?",
        "Quelle générosité est durable pour moi?",
      ],
    },
    Life: {
      intent: "Appliquer la sagesse biblique à la vie ordinaire avec une attention stable.",
      focus: "Habitudes, relations, famille, repos, santé, rythmes du foyer",
      useWhen: "Utilise-le pour les décisions du quotidien, les routines, les relations, les habitudes, le repos, les conflits ou quand le prochain pas n'est pas clairement une question d'argent ou de travail.",
      lens: "Une grille de vie entière: caractère, relations, responsabilités, rythmes et prochain pas fidèle.",
      diagnosticTracks: [
        "Caractère: quel type de personne cette habitude ou ce choix forme-t-il?",
        "Relations: qui est affecté et comment puis-je aimer bien?",
        "Rythme: cela crée-t-il de l'espace pour le repos, l'attention et la réparation?",
      ],
      blindSpots: [
        "Traiter les choix ordinaires comme spirituellement sans importance",
        "Sur-spiritualiser ce qui demande une sagesse pratique",
        "Ignorer le corps, la famille ou le repos en poursuivant du sens",
      ],
      maturitySignals: [
        "La décision s'accorde avec des rythmes sains, pas seulement avec l'ambition",
        "Les personnes les plus proches du changement sont considérées avec soin",
        "Le prochain pas est simple à obéir",
      ],
      practices: [
        "Nommer la plus petite habitude fidèle que tu peux répéter",
        "Vérifier si ce choix renforce ou fragilise tes relations",
        "Protéger un rythme de repos avant d'ajouter de la pression",
      ],
      responseMoves: [
        "Ramener la question de l'abstraction à la vie quotidienne",
        "Relier la sagesse aux habitudes, aux relations et au foyer",
        "Garder le prochain pas concret et durable",
      ],
      promptCue:
        "En Life mode, mets l'accent sur la sagesse biblique ordinaire pour la famille, les relations, les habitudes, le repos, les conflits, les rythmes du foyer, la santé et le prochain petit pas fidèle. Garde un conseil concret, pratique et doux.",
      prompts: [
        "Comment rendre ma vie quotidienne plus sage?",
        "Comment dois-je penser à cette relation?",
        "Quelle habitude dois-je changer en premier?",
      ],
    },
  },
  pt: {
    Money: {
      intent: "Administre os recursos com paz e clareza.",
      focus: "Orcamento, divida, poupanca, investimento, contentamento",
      useWhen: "Use para gastos, divida, poupanca, investimento, ansiedade financeira ou comparacao.",
      lens: "Uma lente de mordomia: liberdade, suficiente, paciencia, risco e responsabilidade fiel.",
      diagnosticTracks: [
        "Liberdade: esta escolha amplia ou reduz opcoes sabias depois?",
        "Suficiencia: o desejo esta claro ou a comparacao esta definindo a meta?",
        "Risco: o que pode dar errado e eu já contei o custo com sobriedade?",
      ],
      blindSpots: [
        "Confundir fe com certeza financeira",
        "Chamar pressao de estilo de vida de necessidade",
        "Tratar capacidade de divida como permissao",
      ],
      maturitySignals: [
        "O plano ainda faz sentido depois de esperar",
        "Os numeros estao visiveis, nao vagos",
        "O conselho desafiou os pressupostos",
      ],
      practices: [
        "Nomeie o que basta para esta temporada",
        "Escreva claramente o plano de pagar, poupar ou dar",
        "Espere uma noite antes de gastar de forma irreversivel",
      ],
      responseMoves: [
        "Separe desejo, medo e responsabilidade",
        "Deixe as trocas claras sem envergonhar o usuario",
        "Traduza a Escritura em habitos concretos de mordomia",
      ],
      promptCue:
        "No modo Money, enfatize mordomia, contentamento, cautela com divida, risco sabio, responsabilidade de longo prazo, generosidade e regulacao emocional com dinheiro. Evite conselhos de investimento ou promessas de resultado.",
      prompts: [
        "Como construir riqueza sem cobica?",
        "O que a sabedoria diz sobre divida?",
        "Como parar de me comparar financeiramente?",
      ],
    },
    Work: {
      intent: "Discernir trabalho, chamado, lideranca e ambicao sustentavel.",
      focus: "Mudancas de carreira, lideranca, negocio, esgotamento, vocacao",
      useWhen: "Use para decisoes de emprego, ideias de negocio, pressao de lideranca, esgotamento ou ambicao.",
      lens: "Uma lente de vocacao: diligencia, conselho, contar o custo, servico e ritmo sustentavel.",
      diagnosticTracks: [
        "Chamado: que tipo de servico ou responsabilidade esta sendo esclarecido?",
        "Capacidade: a vida do usuario tem espaco para esse compromisso?",
        "Conselho: quem pode testar o plano sem controla-lo?",
      ],
      blindSpots: [
        "Confundir inquietacao com chamado",
        "Usar linguagem espiritual para evitar planejamento",
        "Confundir aplauso com fruto",
      ],
      maturitySignals: [
        "O usuario consegue nomear as trocas com honestidade",
        "Ha um proximo experimento reversivel",
        "Conselho sabio ja viu os numeros e os motivos",
      ],
      practices: [
        "Defina o passo reversivel mais pequeno",
        "Escreva o custo real em tempo, dinheiro e atencao",
        "Pergunte a um critico que parte do plano e fragil",
      ],
      responseMoves: [
        "Distinguir chamado, ambicao, fuga e cansaco",
        "Levar a decisao ao proximo experimento fiel",
        "Usar conselho e contagem do custo como estabilizadores",
      ],
      promptCue:
        "No modo Work, enfatize vocacao, diligencia, conselho sabio, carater de lideranca, contagem do custo, ambicao sustentavel e servico. Ajude o usuario a examinar motivos e trocas antes de grandes decisoes de trabalho.",
      prompts: [
        "Devo deixar meu emprego estavel?",
        "Como sei se minha ambicao e saudavel?",
        "Devo iniciar este negocio agora?",
      ],
    },
    Purpose: {
      intent: "Desacelere e discirna a pessoa que esta decisao forma.",
      focus: "Identidade, direcao, ansiedade, valores, clareza de longo prazo",
      useWhen: "Use quando a pergunta real for identidade, direcao, paz, tempo ou valores.",
      lens: "Uma lente de discernimento: identidade, paz, motivos, paciencia e o proximo passo fiel.",
      diagnosticTracks: [
        "Identidade: o que o usuario esta tentando provar, proteger ou se tornar?",
        "Paz: o que muda quando a urgencia acalma?",
        "Motivos: qual desejo e bom, e qual esta distorcido?",
      ],
      blindSpots: [
        "Esperar certeza perfeita antes de agir com fidelidade",
        "Tratar ansiedade como discernimento",
        "Deixar o sucesso definir a identidade",
      ],
      maturitySignals: [
        "O proximo passo e claro mesmo que o caminho inteiro nao seja",
        "O usuario consegue nomear os motivos sem condenacao",
        "A decisao pode ser sustentada com paciencia",
      ],
      practices: [
        "Nomeie o medo por baixo da decisao",
        "Escreva uma frase sobre a pessoa que esta escolha forma",
        "Escolha o proximo passo fiel para as proximas 24 horas",
      ],
      responseMoves: [
        "Reduza a urgencia e devolva agencia",
        "Separe identidade de resultado",
        "Convide a examinar motivos sem vergonha",
      ],
      promptCue:
        "No modo Purpose, enfatize discernimento, identidade, motivos, paz, paciencia, valores, reflexao em oracao e o proximo passo fiel. Mantenha a orientacao concreta e nao mistica; nao reivindique certeza divina.",
      prompts: [
        "Como decidir quando nao estou claro?",
        "E se eu estiver perseguindo sucesso pelas razoes erradas?",
        "Como encontrar paz sobre meu proximo passo?",
      ],
    },
    Generosity: {
      intent: "Dê livremente sem culpa, pressao ou performance.",
      focus: "Doacao, apoio familiar, caridade, limites, sustentabilidade",
      useWhen: "Use para doar, dizimar, ajudar a familia, definir limites ou praticar generosidade sustentavel.",
      lens: "Uma lente de generosidade: vontade, sustentabilidade, alegria, sabedoria e amor sem coerção.",
      diagnosticTracks: [
        "Liberdade: o presente e voluntario ou movido por culpa e medo?",
        "Sustentabilidade: essa generosidade pode continuar sem ressentimento escondido?",
        "Sabedoria: ajudar aqui fortalece a responsabilidade ou permite dano?",
      ],
      blindSpots: [
        "Chamar culpa de generosidade",
        "Dar em publico para parecer espiritualmente impressionante",
        "Resgatar outros de consequencias que precisam enfrentar",
      ],
      maturitySignals: [
        "O presente e livre, nao coagido",
        "Os limites sao claros e gentis",
        "O plano de dar e sustentavel",
      ],
      practices: [
        "Decida o presente antes do momento de pressao",
        "Estabeleca um limite de doacao em linguagem simples",
        "Pergunte se dinheiro e realmente a melhor ajuda",
      ],
      responseMoves: [
        "Retire culpa e pressao do centro",
        "Proteja a generosidade alegre e limites sabios",
        "Pergunte se o presente ajuda ou habilita",
      ],
      promptCue:
        "No modo Generosity, enfatize disposicao alegre, sustentabilidade, limites, nao coercao, compaixao e dar com responsabilidade. Rejeite o dar movido por culpa ou exibicao.",
      prompts: [
        "Como dar sem culpa nem pressao?",
        "Devo ajudar financeiramente minha familia de novo?",
        "Quanta generosidade e sustentavel para mim?",
      ],
    },
    Life: {
      intent: "Aplique a sabedoria biblica a vida comum com atencao firme.",
      focus: "Habitos, relacionamentos, familia, descanso, saude, ritmos da casa",
      useWhen: "Use para decisoes do dia a dia, rotinas, relacoes, habitos, descanso, conflito ou quando o proximo passo nao parece ser dinheiro ou trabalho.",
      lens: "Uma lente de vida inteira: carater, relacoes, responsabilidades, ritmos e o proximo passo fiel.",
      diagnosticTracks: [
        "Carater: que tipo de pessoa este habito ou escolha esta formando?",
        "Relacoes: quem e afetado e como posso amar bem?",
        "Ritmo: isso cria espaco para descanso, atencao e reparo?",
      ],
      blindSpots: [
        "Tratar escolhas ordinarias como espiritualmente irrelevantes",
        "Superespiritualizar o que precisa de sabedoria pratica",
        "Ignorar corpo, familia ou descanso enquanto busca significado",
      ],
      maturitySignals: [
        "A decisao combina com ritmos saudaveis, nao apenas ambicao",
        "As pessoas mais proximas da mudanca sao consideradas com cuidado",
        "O proximo passo e simples o suficiente para obedecer",
      ],
      practices: [
        "Nomeie o menor habito fiel que voce pode repetir",
        "Veja se esta escolha fortalece ou desgasta seus relacionamentos",
        "Proteja um ritmo de descanso antes de adicionar pressao",
      ],
      responseMoves: [
        "Leve a pergunta da abstracao para a vida comum",
        "Conecte sabedoria a habitos, relacoes e realidade da casa",
        "Mantenha o proximo passo concreto e sustentavel",
      ],
      promptCue:
        "No modo Life, enfatize sabedoria biblica ordinaria para familia, relacoes, habitos, descanso, conflito, ritmos da casa, saude e o proximo passo pequeno e fiel. Mantenha o conselho concreto, pratico e gentil.",
      prompts: [
        "Como tornar minha vida diaria mais sabia?",
        "Como devo pensar sobre este relacionamento?",
        "Que habito devo mudar primeiro?",
      ],
    },
  },
  de: {
    Money: {
      intent: "Verwalte Ressourcen mit Ruhe und Klarheit.",
      focus: "Budget, Schulden, Sparen, Investieren, Genügsamkeit",
      useWhen: "Nutze es für Ausgaben, Schulden, Sparen, Investieren, finanzielle Angst oder Vergleich.",
      lens: "Eine Stewardship-Linse: Freiheit, Genug, Geduld, Risiko und treue Verantwortung.",
      diagnosticTracks: [
        "Freiheit: Wird diese Wahl spätere kluge Optionen erweitern oder einschränken?",
        "Genug: Ist das Verlangen klar oder setzt der Vergleich das Ziel?",
        "Risiko: Was kann schiefgehen und habe ich die Kosten nüchtern gezählt?",
      ],
      blindSpots: [
        "Glauben mit finanzieller Gewissheit verwechseln",
        "Lebensstil-Druck als Bedürfnis bezeichnen",
        "Verschuldungskapazität als Freibrief behandeln",
      ],
      maturitySignals: [
        "Der Plan bleibt auch nach Warten sinnvoll",
        "Zahlen sind sichtbar, nicht verschwommen",
        "Rat hat die Annahmen herausgefordert",
      ],
      practices: [
        "Benenne, was für diese Saison genug ist",
        "Schreibe den Plan zum Rückzahlen, Sparen oder Geben klar auf",
        "Warte eine Nacht vor irreversiblen Ausgaben",
      ],
      responseMoves: [
        "Trenne Wunsch, Angst und Verantwortung",
        "Mache Abwägungen klar ohne den Nutzer zu beschämen",
        "Übersetze Schrift in konkrete Haushaltroutinen",
      ],
      promptCue:
        "Im Money-Modus betone Treue im Umgang mit Geld, Genügsamkeit, Schuldenvorsicht, kluges Risiko, langfristige Verantwortung, Großzügigkeit und emotionale Regulierung. Vermeide Anlageberatung oder Erfolgsversprechen.",
      prompts: [
        "Wie baue ich Vermögen ohne Gier auf?",
        "Was sagt Weisheit über Schulden?",
        "Wie höre ich auf, mich finanziell zu vergleichen?",
      ],
    },
    Work: {
      intent: "Arbeite, Berufung, Führung und nachhaltigen Ehrgeiz unterscheiden.",
      focus: "Karrierewechsel, Führung, Geschäft, Erschöpfung, Berufung",
      useWhen: "Nutze es für Jobentscheidungen, Geschäftsideen, Führungsdruck, Burnout oder Ehrgeiz.",
      lens: "Eine Berufungslinse: Fleiß, Rat, Kosten zählen, Dienst und tragfähiges Tempo.",
      diagnosticTracks: [
        "Berufung: Welche Art von Dienst oder Verantwortung wird gerade klar?",
        "Kapazität: Hat das Leben des Nutzers Raum für dieses Commitment?",
        "Rat: Wer kann den Plan prüfen, ohne ihn zu kontrollieren?",
      ],
      blindSpots: [
        "Unruhe mit Berufung verwechseln",
        "Spirituelle Sprache nutzen, um Planung zu vermeiden",
        "Applaus mit Frucht verwechseln",
      ],
      maturitySignals: [
        "Der Nutzer kann die Abwägungen ehrlich benennen",
        "Es gibt ein reversibles nächstes Experiment",
        "Weiser Rat hat Zahlen und Motive gesehen",
      ],
      practices: [
        "Definiere den kleinsten reversiblen Schritt",
        "Schreibe die realen Kosten in Zeit, Geld und Aufmerksamkeit auf",
        "Frag einen Kritiker, welcher Teil des Plans fragil ist",
      ],
      responseMoves: [
        "Unterscheide Berufung, Ehrgeiz, Flucht und Müdigkeit",
        "Führe die Entscheidung zum nächsten treuen Experiment zurück",
        "Nutze Rat und Kostenrechnung als Stabilisierung",
      ],
      promptCue:
        "Im Work-Modus betone Berufung, Fleiß, weisen Rat, Charakter, Kostenrechnung, nachhaltigen Ehrgeiz und Dienst. Hilf dem Nutzer, Motive und Abwägungen vor großen Arbeitsentscheidungen zu prüfen.",
      prompts: [
        "Soll ich meinen sicheren Job verlassen?",
        "Wie weiß ich, ob Ehrgeiz gesund ist?",
        "Soll ich dieses Unternehmen jetzt gründen?",
      ],
    },
    Purpose: {
      intent: "Verlangsame und prüfe, welche Person diese Entscheidung formt.",
      focus: "Identität, Richtung, Angst, Werte, langfristige Klarheit",
      useWhen: "Nutze es, wenn die eigentliche Frage Identität, Richtung, Frieden, Timing oder Werte ist.",
      lens: "Eine Unterscheidungslinse: Identität, Frieden, Motive, Geduld und der nächste treue Schritt.",
      diagnosticTracks: [
        "Identität: Was versucht der Nutzer zu beweisen, zu schützen oder zu werden?",
        "Frieden: Was verändert sich, wenn Dringlichkeit leiser wird?",
        "Motive: Welches Verlangen ist gut und welches verzerrt?",
      ],
      blindSpots: [
        "Auf perfekte Gewissheit warten, bevor man treu handelt",
        "Angst mit Unterscheidung verwechseln",
        "Erfolg die Identität definieren lassen",
      ],
      maturitySignals: [
        "Der nächste Schritt ist klar, auch wenn der ganze Weg nicht klar ist",
        "Der Nutzer kann Motive ohne Selbstverurteilung benennen",
        "Die Entscheidung kann geduldig gehalten werden",
      ],
      practices: [
        "Benenne die Angst unter der Entscheidung",
        "Schreibe einen Satz darüber, welche Person diese Wahl formt",
        "Wähle den nächsten treuen Schritt für die nächsten 24 Stunden",
      ],
      responseMoves: [
        "Reduziere Dringlichkeit und gib Handlungsspielraum zurück",
        "Trenne Identität von Ergebnis",
        "Lade zu ehrlicher Motivanalyse ohne Scham ein",
      ],
      promptCue:
        "Im Purpose-Modus betone Unterscheidung, Identität, Motive, Frieden, Geduld, Werte, betende Reflexion und den nächsten treuen Schritt. Bleib geerdet und nicht mystisch; behaupte keine göttliche Gewissheit.",
      prompts: [
        "Wie entscheide ich, wenn mir alles unklar ist?",
        "Was, wenn ich Erfolg aus den falschen Gründen verfolge?",
        "Wie finde ich Frieden für meinen nächsten Schritt?",
      ],
    },
    Generosity: {
      intent: "Gib frei ohne Schuld, Druck oder Show.",
      focus: "Geben, Familienhilfe, Wohltätigkeit, Grenzen, Nachhaltigkeit",
      useWhen: "Nutze es für Geben, Zehnten, Familienhilfe, Grenzen oder nachhaltige Großzügigkeit.",
      lens: "Eine Großzügigkeits-Linse: Bereitschaft, Nachhaltigkeit, Freude, Weisheit und Liebe ohne Zwang.",
      diagnosticTracks: [
        "Freiheit: Ist das Geschenk freiwillig oder von Schuld und Angst getrieben?",
        "Nachhaltigkeit: Kann diese Großzügigkeit ohne versteckten Groll weitergehen?",
        "Weisheit: Stärkt Hilfe hier Verantwortung oder ermöglicht sie Schaden?",
      ],
      blindSpots: [
        "Schuld Großzügigkeit nennen",
        "Öffentlich geben, um geistlich beeindruckend zu wirken",
        "Andere von Konsequenzen retten, die sie selbst tragen müssen",
      ],
      maturitySignals: [
        "Das Geschenk ist frei, nicht erzwungen",
        "Grenzen sind klar und freundlich",
        "Der Gebeplan ist nachhaltig",
      ],
      practices: [
        "Entscheide das Geschenk vor dem Druckmoment",
        "Setze eine klare Grenze für das Geben",
        "Frage, ob Geld wirklich die beste Hilfe ist",
      ],
      responseMoves: [
        "Nimm Schuld und Druck aus der Mitte",
        "Schütze fröhliche Großzügigkeit und weise Grenzen",
        "Frag, ob das Geschenk hilft oder abhängig macht",
      ],
      promptCue:
        "Im Generosity-Modus betone fröhliche Bereitschaft, Nachhaltigkeit, Grenzen, keinen Zwang, Mitgefühl und verantwortliches Geben. Weise schuldgetriebenes oder inszeniertes Geben zurück.",
      prompts: [
        "Wie gebe ich ohne Schuld oder Druck?",
        "Soll ich meine Familie wieder finanziell helfen?",
        "Wie viel Großzügigkeit ist für mich nachhaltig?",
      ],
    },
    Life: {
      intent: "Wende biblische Weisheit mit ruhiger Aufmerksamkeit auf den Alltag an.",
      focus: "Gewohnheiten, Beziehungen, Familie, Ruhe, Gesundheit, Hausrhythmen",
      useWhen: "Nutze es für Alltagsentscheidungen, Routinen, Beziehungen, Gewohnheiten, Ruhe, Konflikte oder wenn der nächste Schritt nicht klar Geld oder Arbeit ist.",
      lens: "Eine Ganzheits-Linse: Charakter, Beziehungen, Verantwortung, Rhythmen und der nächste treue Schritt.",
      diagnosticTracks: [
        "Charakter: Welche Art von Person formt diese Gewohnheit oder Wahl?",
        "Beziehungen: Wen betrifft das und wie kann ich gut lieben?",
        "Rhythmus: Schafft das Raum für Ruhe, Aufmerksamkeit und Reparatur?",
      ],
      blindSpots: [
        "Gewöhnliche Lebensentscheidungen als geistlich irrelevant behandeln",
        "Das Praktische überspiritualisieren",
        "Körper, Familie oder Ruhe ignorieren, während man nach Bedeutung jagt",
      ],
      maturitySignals: [
        "Die Entscheidung passt zu gesunden Rhythmen, nicht nur zu Ehrgeiz",
        "Die Menschen nahe an der Veränderung werden sorgfältig bedacht",
        "Der nächste Schritt ist einfach genug, um ihm zu gehorchen",
      ],
      practices: [
        "Benenne die kleinste treue Gewohnheit, die du wiederholen kannst",
        "Prüfe, ob diese Wahl Beziehungen stärkt oder belastet",
        "Schütze einen Rhythmus der Ruhe, bevor du Druck hinzufügst",
      ],
      responseMoves: [
        "Hol die Frage aus der Abstraktion in den Alltag",
        "Verbinde Weisheit mit Gewohnheiten, Beziehungen und Hausrealität",
        "Halte den nächsten Schritt konkret und tragfähig",
      ],
      promptCue:
        "Im Life-Modus betone alltägliche biblische Weisheit für Familie, Beziehungen, Gewohnheiten, Ruhe, Konflikte, Hausrhythmen, Gesundheit und den nächsten kleinen treuen Schritt. Bleib konkret, praktisch und sanft.",
      prompts: [
        "Wie mache ich meinen Alltag weiser?",
        "Wie soll ich über diese Beziehung denken?",
        "Welche Gewohnheit sollte ich zuerst ändern?",
      ],
    },
  },
  yo: {
    Money: {
      intent: "Ṣe ìtọ́jú ohun tí a fi lé ọ lọ́wọ́ pẹ̀lú àlàáfíà àti ìmọ̀.",
      focus: "Ìṣètò owó, gbèsè, ìfipamọ́, ìdókòwò, ìtẹ́lọ́run",
      useWhen: "Lo fún ináwó, gbèsè, ìfipamọ́, ìdókòwò, àníyàn owó, tàbí fífi ara wé ẹlòmíì.",
      lens: "Ìwòye ìtọ́jú: òmìnira, ohun tó tó, sùúrù, ewu, àti ojúṣe olóòtítọ́.",
      diagnosticTracks: [
        "Òmìnira: ṣé yíyàn yìí máa pọ̀ síi tàbí dín àwọn àṣàyàn ọgbọ́n kù?",
        "Ohun tó tó: ṣé ìfẹ́ náà mọ́, tàbí fífi ara wé ẹlòmíì ló ń ṣètò ibi-afẹ́?",
        "Ewu: kí ló lè lọ dáadáa, kí ló lè kuna, àti ṣé mo ti ka iye owó rẹ dáadáa?",
      ],
      blindSpots: [
        "Dídapọ̀ ìgbàgbọ́ mọ́ ìdánilójú owó",
        "Pípè ìfọkànsìn ìgbé-ayé ní àìní",
        "Rí agbára gbèsè bí ìyọ̀nda",
      ],
      maturitySignals: [
        "Ètò náà ṣi dára lẹ́yìn ìdúró",
        "Àwọn nọ́ńbà hàn gbangba, wọn kò ṣòro",
        "Ìmọ̀ràn ti dán àwọn ìròyìn inú rẹ wò",
      ],
      practices: [
        "Darúkọ ohun tó tó fún àsìkò yìí",
        "Kọ ètò sísan gbèsè, ìfipamọ́, tàbí fífúnni sílẹ̀ kedere",
        "Dúró títí di ọ̀la kí o tó ná owó tí kò rọrùn láti yí padà",
      ],
      responseMoves: [
        "Ya ìfẹ́, ìbẹ̀rù, àti ojúṣe sọ́tọ̀",
        "Ṣàlàyé ohun tí a ń fọwọ́sowọ́pọ̀ rẹ̀ láì dójútì olumulo",
        "Tumọ̀ Ìwé Mímọ́ sí ìṣe ìtọ́jú tó hàn gbangba",
      ],
      promptCue:
        "Ní Money mode, tẹnumọ́ ìtọ́jú, ìtẹ́lọ́run, ìṣọ́ra gbèsè, ewu ọgbọ́n, ojúṣe pípẹ́, ìfẹ́ fúnni, àti fífi ọkàn balẹ̀ nípa owó. Má ṣe dá ìmọ̀ràn ìdókòwò tàbí ìlérí ìyọrísí.",
      prompts: [
        "Báwo ni mo ṣe lè kọ ọrọ̀ láì jẹ́ kí ìwọra darí mi?",
        "Kí ni ọgbọ́n sọ nípa gbèsè?",
        "Báwo ni mo ṣe lè dá fífi ara mi wé ẹlòmíì dúró nípa owó?",
      ],
    },
    Work: {
      intent: "Ṣàyẹ̀wò iṣẹ́, ìpè, olórí, àti ìfẹ́ṣọ́nà tó péye.",
      focus: "Ìyípadà iṣẹ́, olórí, òwò, ìrẹ̀wẹ̀sì, ìpè",
      useWhen: "Lo fún ìpinnu iṣẹ́, ìmọ̀ràn òwò, ìfọkànsìn olórí, ìrẹ̀wẹ̀sì, tàbí ìfẹ́ṣọ́nà.",
      lens: "Ìwòye ìpè: aápọn tó dára, ìmọ̀ràn, kika iye, iṣẹ́ ìránṣẹ́, àti ìyára tó péye.",
      diagnosticTracks: [
        "Ìpè: irú iṣẹ́ tàbí ojúṣe wo ni a ń ṣàlàyé?",
        "Agbara: ṣe ayé olumulo ní àyè fún ìlérí yìí?",
        "Ìmọ̀ràn: ta ni lè dán ètò náà wò láì darí rẹ?",
      ],
      blindSpots: [
        "Mímo ìfarapa ọkàn sí ìpè",
        "Lílò èdè ẹ̀mí láti yẹra fún ètò",
        "Dídà ìtẹ́wọ́gbà pọ̀ mọ́ èso",
      ],
      maturitySignals: [
        "Olumulo lè darukọ ìṣòro àti àṣàyàn rẹ̀ dáadáa",
        "Ẹ̀yà kan tó lè yí padà wà",
        "Ìmọ̀ràn ọlọ́gbọ́n ti rí nọ́ńbà àti ìdí kedere",
      ],
      practices: [
        "Ṣàlàyé ìgbésẹ̀ kékeré tó lè yí padà",
        "Kọ iye gidi ní àsìkò, owó, àti àkíyèsí",
        "Béèrè lọ́wọ́ alátakò ohun tí ó rọrùn láti fọ́",
      ],
      responseMoves: [
        "Ya ìpè, ìfẹ́ṣọ́nà, ìsálọ́, àti ìrẹ̀wẹ̀sì sọ́tọ̀",
        "Mu ìpinnu náà wá sí ìdánwò olóòtítọ́ tó kàn",
        "Lo ìmọ̀ràn àti kíkà iye gẹ́gẹ́ bí ìdúróṣinṣin",
      ],
      promptCue:
        "Ní Work mode, tẹnumọ́ ìpè, aápọn, ìmọ̀ràn ọlọ́gbọ́n, ìwà olórí, kíkà iye, ìfẹ́ṣọ́nà tó lè tẹ̀síwájú, àti iṣẹ́ ìránṣẹ́. Ràn olumulo lọ́wọ́ láti ṣàyẹ̀wò ìdí àti ìṣòro ṣáájú ìpinnu iṣẹ́ ńlá.",
      prompts: [
        "Ṣé kí n fi iṣẹ́ mi tó dúró ṣinṣin sílẹ̀?",
        "Báwo ni mo ṣe mọ̀ pé ìfẹ́ṣọ́nà mi dára?",
        "Ṣé kí n bẹ̀rẹ̀ òwò yìí báyìí?",
      ],
    },
    Purpose: {
      intent: "Dákẹ́ kí o ṣàyẹ̀wò ẹni tí ìpinnu yìí ń dá sílẹ̀.",
      focus: "Ìdánimọ̀, ìtọ́sọ́nà, àníyàn, iye, ìmọ̀ pípẹ́",
      useWhen: "Lo nígbà tí ìbéèrè gidi jẹ́ ìdánimọ̀, ìtọ́sọ́nà, àlàáfíà, àsìkò, tàbí iye.",
      lens: "Ìwòye ìmòye: ìdánimọ̀, àlàáfíà, ìdí inú, sùúrù, àti ìgbésẹ̀ olóòtítọ́ tó kàn.",
      diagnosticTracks: [
        "Ìdánimọ̀: kí ni olumulo ń gbìmọ̀ láti fìdí múlẹ̀, dáàbò bo, tàbí di?",
        "Àlàáfíà: kí ni ó yí padà nígbà tí ìkánjú bá dákẹ́?",
        "Ìdí inú: èwo ló dára, èwo sì ni ó bàjẹ́?",
      ],
      blindSpots: [
        "Dídúró de ìdánilójú pípé kí o tó ṣiṣẹ́ ní ìdúróṣinṣin",
        "Mímu àníyàn gẹ́gẹ́ bí ìmòye",
        "Jíjẹ́ kí àṣeyọrí túmọ̀ sí ìdánimọ̀",
      ],
      maturitySignals: [
        "Ìgbésẹ̀ tó kàn hàn gbangba bí gbogbo ọ̀nà kò tilẹ̀ hàn",
        "Olumulo lè darukọ ìdí inú láì dá ara rẹ lẹ́bi",
        "A lè di ìpinnu náà mú pẹ̀lú sùúrù",
      ],
      practices: [
        "Darúkọ ibẹ̀rù tó wà lábẹ́ ìpinnu náà",
        "Kọ gbolohun kan nípa ẹni tí yìí ń dá sílẹ̀",
        "Yan ìgbésẹ̀ olóòtítọ́ tó kàn fún wákàtí 24 tó ń bọ̀",
      ],
      responseMoves: [
        "Dín ìkánjú kù, kí o sì fúnni ní agbára padà",
        "Ya ìdánimọ̀ sọ́tọ̀ kúrò ní abajade",
        "Pe ìbẹ̀rù òtítọ́ sọ́rọ̀ láì jẹ́ kí ojú tì",
      ],
      promptCue:
        "Ní Purpose mode, tẹnumọ́ ìmòye, ìdánimọ̀, ìdí inú, àlàáfíà, sùúrù, iye, ìròyìn adúrà, àti ìgbésẹ̀ olóòtítọ́ tó kàn. Jẹ́ kí ìtọ́nisọ́nà náà dúró lórí ilẹ̀, kì í ṣe ìmísí àjèjì; má ṣe sọ pé o ní ìdánilójú láti ọ̀dọ̀ Ọlọ́run.",
      prompts: [
        "Báwo ni mo ṣe pinnu nígbà tí mi ò ye mi?",
        "Kí ló ṣẹlẹ̀ bí mo bá ń lé àṣeyọrí fún ìdí tí kò tọ́?",
        "Báwo ni mo ṣe rí àlàáfíà nípa ìgbésẹ̀ tó kàn?",
      ],
    },
    Generosity: {
      intent: "Fúnni ní òmìnira láì jẹ́ ẹ̀bi, ìfọkànsìn, tàbí ìṣeré.",
      focus: "Fífúnni, ìrànwọ́ ẹbí, iṣẹ́ àánú, ààlà, ìtẹ̀síwájú",
      useWhen: "Lo fún fífúnni, ìrànwọ́ ẹbí, ààlà, tàbí ìfẹ́ fúnni tó lè tẹ̀síwájú.",
      lens: "Ìwòye ìfẹ́ fúnni: ìfẹ́ ọkàn, ìtẹ̀síwájú, ayọ̀, ọgbọ́n, àti ìfẹ́ láì fi ipa múni.",
      diagnosticTracks: [
        "Òmìnira: ṣé ẹ̀bùn náà jẹ́ ìfẹ́ ọkàn, tàbí ẹ̀bi àti ìbẹ̀rù ló ń darí rẹ?",
        "Ìtẹ̀síwájú: ṣé ìfẹ́ fúnni yìí lè tẹ̀síwájú láì ní ìbínú tó sùn?",
        "Ọgbọ́n: ṣé ríràn níbí ń mú ojúṣe lagbara, tàbí ó ń jẹ́ kí ìfarapa bá a lọ?",
      ],
      blindSpots: [
        "Pípè ẹ̀bi ní ìfẹ́ fúnni",
        "Fífúnni ní gbangba láti dà bí ẹni mímọ́",
        "Ríràn àwọn míì sílẹ̀ kúrò nínú àbájáde tí wọ́n gbọ́dọ̀ koju",
      ],
      maturitySignals: [
        "Ẹ̀bùn náà jẹ́ òmìnira, kì í ṣe fífi ipa múni",
        "Ààlà ṣalaye, wọ́n sì jẹ́ ẹni rere",
        "Ètò fífúnni lè tẹ̀síwájú",
      ],
      practices: [
        "Pinnu ẹ̀bùn náà kí ìkanjú tó dé",
        "Ṣètò ààlà fífúnni ní ọ̀rọ̀ tó ye",
        "Béèrè bóyá owó ni ọ̀nà tó dáa jù lọ lati ràn",
      ],
      responseMoves: [
        "Yọ ẹ̀bi àti ìfọkànsìn kúrò ní àárín",
        "Daabobo ìfẹ́ fúnni ayọ̀ àti ààlà ọgbọ́n",
        "Béèrè bóyá ẹ̀bùn náà ń ràn lọ́wọ́ tàbí ń ṣí i sí ìfarapa",
      ],
      promptCue:
        "Ní Generosity mode, tẹnumọ́ ìfẹ́ ọkàn ayọ̀, ìtẹ̀síwájú, ààlà, àìní ipa, ìyọ́nú, àti fífúnni olóòtítọ́. Kọ ìfẹ́ fúnni tí ẹ̀bi tàbí ìṣeré ń darí.",
      prompts: [
        "Báwo ni mo ṣe lè fúnni láì jẹ́ ẹ̀bi tàbí ìfọkànsìn?",
        "Ṣé kí n tún ran ẹbí lọ́wọ́ nípa owó?",
        "Ìfẹ́ fúnni mélòó ni ó le tẹ̀síwájú fún mi?",
      ],
    },
    Life: {
      intent: "Ṣe ìtọ́nisọ́nà ìgbésí ayé ojoojúmọ́ pẹ̀lú ọgbọ́n tí ó dákẹ́.",
      focus: "Àṣà, ìbáṣepọ̀, ẹbí, ìsinmi, ìlera, ìrìnàjò ilé",
      useWhen: "Lo fún àwọn ìpinnu ìgbésí ayé ojoojúmọ́, àṣà, ìbáṣepọ̀, ìsinmi, ìjà, tàbí nígbà tí ìgbésẹ̀ tó tẹ̀lé kò dájú pé ó jẹ́ ìbéèrè owó tàbí iṣẹ́.",
      lens: "Ìwòye gbogbo ìgbésí ayé: ìhuwasi, ìbáṣepọ̀, ojúṣe, ìlànà, àti ìgbésẹ̀ olóòtítọ́ tó kàn.",
      diagnosticTracks: [
        "Ìhuwasi: irú ènìyàn wo ni àṣà tàbí yíyàn yìí ń dá sílẹ̀?",
        "Ìbáṣepọ̀: ta ni ó kan, báwo ni mo ṣe lè fẹ́ wọn dáadáa?",
        "Ìlànà: ṣé èyí ń ṣẹ̀dá àyè fún ìsinmi, àkíyèsí, àti ìtúnṣe?",
      ],
      blindSpots: [
        "Rí àwọn yíyàn ojoojúmọ́ gẹ́gẹ́ bí ohun tí kò ṣe pàtàkì nínú ẹ̀mí",
        "Ṣíṣe ohun tó nílò ọgbọ́n pẹ̀lú ẹ̀mí ju bó ṣe yẹ lọ",
        "Foju kọ ara, ẹbí, tàbí ìsinmi nígbà tó ń lé ìtumọ̀",
      ],
      maturitySignals: [
        "Ìpinnu náà bá ìlànà tó dára mu, kì í ṣe ìfẹ́ láti ṣàṣeyọrí nìkan",
        "A rántí àwọn tó sún mọ́ ìyípadà náà pẹ̀lú àkíyèsí",
        "Ìgbésẹ̀ tó kàn rọrùn tó fi lè jẹ́ kó ṣeé ṣe láti tẹ̀lé",
      ],
      practices: [
        "Darúkọ àṣà olóòtítọ́ tó kere jù tí o lè tún ṣe",
        "Ṣàyẹ̀wò bóyá yíyàn yìí ń mú ìbáṣepọ̀ lagbara tàbí ń bà wọ́n jẹ́",
        "Daabobo ìlànà ìsinmi kí o tó fi ìkànsí kun un",
      ],
      responseMoves: [
        "Mu ìbéèrè náà kúrò ní àríyànjiyàn sí ìgbésí ayé ojoojúmọ́",
        "So ọgbọ́n pọ̀ mọ́ àṣà, ìbáṣepọ̀, àti otitọ ilé",
        "Pa ìgbésẹ̀ tó kàn mọ́ kedere àti ìtẹ̀síwájú",
      ],
      promptCue:
        "Ní Life mode, tẹnumọ́ ọgbọ́n Bíbélì ojoojúmọ́ fún ẹbí, ìbáṣepọ̀, àṣà, ìsinmi, ìjà, ìlànà ilé, ìlera, àti ìgbésẹ̀ kékeré tó kàn. Jẹ́ kí ìtọ́nisọ́nà náà jẹ́ kedere, ìṣe, àti pẹ̀lẹ́.",
      prompts: [
        "Báwo ni mo ṣe lè sọ ìgbésí ayé ojoojúmọ́ mi di ọgbọ́n síi?",
        "Kí ni mo yẹ kí n ṣe nípa ìbáṣepọ̀ yìí?",
        "Àṣà wo ni mo yẹ kí n yí padà kíákíá?",
      ],
    },
  },
  ig: {
    Money: {
      intent: "Jikwaa ihe e nyere gi na udo na doo anya.",
      focus: "Onu ego, ụgwọ, ichekwa, itinye ego, afọ ojuju",
      useWhen: "Jiri ya maka mmefu, ụgwọ, nchekwa, itinye ego, nchegbu ego, ma ọ bụ ntụnyere.",
      lens: "Lense nlekọta: nnwere onwe, nke zuru, ndidi, ihe egwu, na ibu ọrụ kwesiri ntụkwasị obi.",
      diagnosticTracks: [
        "Nnwere onwe: nhọrọ a ga-eme ka nhọrọ amamihe dị n'ọdịnihu bawanye ma ọ bụ belata?",
        "Zuru ezu: ọchịchọ a doro anya ma ọ bụ ntụnyere na-etinye akara?",
        "Ihe egwu: gịnị nwere ike ịga n'ụzọ ọjọọ, ma mụọla m ụgwọ nke ọma?",
      ],
      blindSpots: [
        "Ịgwakọta okwukwe na nkwenye ego",
        "Ịkpọ nrụgide ndụ ka ọ bụrụ mkpa",
        "Ịhụ ikike ụgwọ dịka ikikere",
      ],
      maturitySignals: [
        "Atụmatụ ka nwere isi mgbe echerechara",
        "Ọnụ ọgụgụ doro anya, ọ bụghị iju",
        "Ndụmọdụ agbaghawo echiche ndị e mere",
      ],
      practices: [
        "Kọwaa ihe zuru ezu maka oge a",
        "Dee atụmatụ ịkwụ ụgwọ, ichekwa, ma ọ bụ inye n'ụzọ doro anya",
        "Chere abalị tupu imefu ihe agaghị alaghachi azụ",
      ],
      responseMoves: [
        "Kewapụ ọchịchọ, egwu, na ibu ọrụ",
        "Mee ka mgbanwe doo anya na-enweghị ime ka onye ọrụ nwee ihere",
        "Tụgharịa Akwụkwọ Nsọ ka ọ bụrụ omume nlekọta doro anya",
      ],
      promptCue:
        "Na Money mode, mesie nlekọta, afọ ojuju, ịkpachara ụgwọ, ihe egwu amamihe, ibu ọrụ ogologo oge, mmesapụ aka, na ịhazi mmetụta banyere ego. Zere ndụmọdụ itinye ego ma ọ bụ nkwa nsonaazụ.",
      prompts: [
        "Kedu ka m ga-esi wuo akụ na ụba na-enweghị anyaukwu?",
        "Gịnị ka amamihe na-ekwu banyere ụgwọ?",
        "Kedu ka m ga-esi kwụsị ịtụnyere onwe m na ego?",
      ],
    },
    Work: {
      intent: "Kpebie ọrụ, oku, ndu, na ọchịchọ na-adịgide adịgide.",
      focus: "Mgbanwe ọrụ, ndu, azụmahịa, ịgwụ ike, oku",
      useWhen: "Jiri ya maka mkpebi ọrụ, echiche azụmahịa, nrụgide ndu, ịgwụ ike, ma ọ bụ ọchịchọ.",
      lens: "Lense oku: ịdị uchu, ndụmọdụ, ịgụ ụgwọ, ọrụ, na ọsọ na-adịgide adịgide.",
      diagnosticTracks: [
        "Oku: ụdị ọrụ ma ọ bụ ibu ọrụ gịnị ka a na-akọwapụta?",
        "Ikike: ndụ onye ọrụ nwere ohere maka nkwa a?",
        "Ndụmọdụ: onye nwere ike nwalee atụmatụ ahụ n'enweghị ịchịkwa ya?",
      ],
      blindSpots: [
        "Ịhụ enweghị izuike dịka oku",
        "Iji okwu ime mmụọ zere ịhazi",
        "Ịgwakọta ịkụ aka na mkpụrụ",
      ],
      maturitySignals: [
        "Onye ọrụ nwere ike ịkpọ mgbanwe ndị ahụ n'eziokwu",
        "E nwere nnwale ọzọ a pụrụ ịtụgharị azụ",
        "Ndụmọdụ amamihe ahụla ọnụ ọgụgụ na ebumnuche",
      ],
      practices: [
        "Kọwaa obere nzọụkwụ a pụrụ ịtụgharị azụ",
        "Dee ụgwọ eziokwu n'oge, ego, na nlebara anya",
        "Jụọ onye na-akatọ akụkụ nke atụmatụ ahụ siri ike",
      ],
      responseMoves: [
        "Kewaa oku, ọchịchọ, mgbapụ, na ike gwụrụ",
        "Wetu mkpebi ahụ ruo na nnwale ọzọ kwesịrị ntụkwasị obi",
        "Jiri ndụmọdụ na ịgụ ụgwọ dịka ihe na-eme ka ihe kwụsie ike",
      ],
      promptCue:
        "Na Work mode, mesie oku, ịdị uchu, ndụmọdụ amamihe, agwa ndu, ịgụ ụgwọ, ọchịchọ na-adịgide adịgide, na ọrụ. Nye aka ka onye ọrụ nyochaa ebumnuche na mgbanwe tupu mkpebi ọrụ ukwu.",
      prompts: [
        "Ò kwesiri m ịhapụ ọrụ m kwụsiri ike?",
        "Kedu ka m ga-esi mara ma ọchịchọ m dị mma?",
        "Ò kwesiri m ịmalite azụmahịa a ugbu a?",
      ],
    },
    Purpose: {
      intent: "Were oge kwụsị ma tụlee onye mkpebi a na-akpụ.",
      focus: "Njirimara, ntụziaka, nchegbu, ụkpụrụ, nkọwa ogologo oge",
      useWhen: "Jiri ya mgbe ajụjụ bụ njirimara, ntụziaka, udo, oge, ma ọ bụ ụkpụrụ.",
      lens: "Lense nghọta: njirimara, udo, ebumnuche, ndidi, na nzọụkwụ kwesịrị ntụkwasị obi sochirinụ.",
      diagnosticTracks: [
        "Njirimara: gịnị ka onye ọrụ na-anwa igosipụta, ichekwa, ma ọ bụ bụrụ?",
        "Udo: gịnị na-agbanwe mgbe ịdị ngwa jụrụ?",
        "Ebumnuche: ọchịchọ nke ọma bụ nke a, nke gbagọtara bụ nke a?",
      ],
      blindSpots: [
        "Ichere nkwenye zuru oke tupu ime omume kwesịrị ntụkwasị obi",
        "Ịhụ nchegbu dịka nghọta",
        "Ikwe ka ihe ịga nke ọma kọwaa njirimara",
      ],
      maturitySignals: [
        "Nzọụkwụ sochirinụ doo anya ọbụlagodi ma ụzọ dum adịghị",
        "Onye ọrụ nwere ike ịkpọ ebumnuche n'enweghị ịkatọ onwe ya",
        "A pụrụ ijide mkpebi ahụ na ndidi",
      ],
      practices: [
        "Kpọọ egwu dị n'okpuru mkpebi ahụ",
        "Dee ahịrịokwu gbasara onye nhọrọ a na-akpụ",
        "Họrọ nzọụkwụ kwesịrị ntụkwasị obi maka awa 24 sochirinụ",
      ],
      responseMoves: [
        "Belata ọsọ ma weghachite ikike",
        "Kewaa njirimara na nsonaazụ",
        "Kpọọ nyocha ebumnuche n'eziokwu na-enweghị ihere",
      ],
      promptCue:
        "Na Purpose mode, mesie nghọta, njirimara, ebumnuche, udo, ndidi, ụkpụrụ, ntụgharị uche ekpere, na nzọụkwụ kwesịrị ntụkwasị obi sochirinụ. Mee ka nduzi nọgide na ala ma ghara ịbụ ihe omimi; ekwula na i nwere nkwenye sitere n'aka Chineke.",
      prompts: [
        "Kedu ka m ga-esi kpebie mgbe ihe na-adịrị m mgbagwoju anya?",
        "Gịnị ma ọ bụrụ na m na-achụso ihe ịga nke ọma n'ihi ihe na-ezighị ezi?",
        "Kedu ka m ga-esi chọta udo banyere nzọụkwụ m sochirinụ?",
      ],
    },
    Generosity: {
      intent: "Nye n'efu na-enweghị ikpe ọmụma, nrụgide, ma ọ bụ ngosi.",
      focus: "Inye, nkwado ezinụlọ, ebere, oke, ịdịgide",
      useWhen: "Jiri ya maka inye, inye otu ụzọ iri, inyere ezinụlọ, oke, ma ọ bụ mmesapụ aka na-adịgide adịgide.",
      lens: "Lense mmesapụ aka: ịdị njikere, ịdịgide, ọṅụ, amamihe, na ịhụnanya na-enweghị ime ka a pịọọ gị.",
      diagnosticTracks: [
        "Nnwere onwe: onyinye a ọ bụ nke onye nyere na ọchịchọ, ma ọ bụ ikpe ọmụma na egwu na-edu ya?",
        "Ịdịgide: mmesapụ aka a ọ nwere ike ịga n'ihu na-enweghị iwe zoro ezo?",
        "Amamihe: enyemaka ebe a ọ na-ewusi ibu ọrụ ike, ma ọ bụ na-enye ohere maka mmebi?",
      ],
      blindSpots: [
        "Ịkpọ ikpe ọmụma mmesapụ aka",
        "Ịnye n'ihu ọha iji pụta ìhè dịka onye mmụọ",
        "Ịnapụta ndị ọzọ na nsonaazụ ha kwesịrị ihu",
      ],
      maturitySignals: [
        "Onyinye ahụ bụ nke n'efu, ọ bụghị nke e nyere iwu",
        "Oke doo anya ma dị nro",
        "Atụmatụ inye nwere ike ịdịgide",
      ],
      practices: [
        "Kpebie onyinye tupu oge nrụgide",
        "Seta oke inye n'okwu doro anya",
        "Jụọ ma ego bụ ezigbo enyemaka kachasị mma",
      ],
      responseMoves: [
        "Wepụ ikpe ọmụma na nrụgide n'etiti",
        "Chekwaa mmesapụ aka nwere ọṅụ na oke amamihe",
        "Jụọ ma onyinye ahụ na-enyere ma ọ bụ na-eme ka nsogbu dịgide",
      ],
      promptCue:
        "Na Generosity mode, mesie ịdị njikere nke nwere ọṅụ, ịdịgide, oke, enweghị ime ka a pịọọ gị, ọmịiko, na inye n'ụzọ kwesịrị ntụkwasị obi. Jụ inye nke ikpe ọmụma ma ọ bụ ngosi na-edu.",
      prompts: [
        "Kedu ka m ga-esi nye na-enweghị ikpe ọmụma ma ọ bụ nrụgide?",
        "Ò kwesiri m inyere ezinụlọ m ego ọzọ?",
        "Nke m, mmesapụ aka ole ka nwere ike ịdịgide?",
      ],
    },
    Life: {
      intent: "Tinye amamihe Baịbụl n'ọrụ na ndụ kwa ụbọchị n'ụzọ kwụ ọtọ.",
      focus: "Omume, mmekọrịta, ezinụlọ, izuike, ahụike, usoro ụlọ",
      useWhen: "Jiri ya maka mkpebi kwa ụbọchị, usoro, mmekọrịta, omume, izuike, esemokwu, ma ọ bụ mgbe nzọụkwụ sochirinụ abụghị nke ego ma ọ bụ ọrụ doro anya.",
      lens: "Lense ndụ dum: agwa, mmekọrịta, ibu ọrụ, usoro, na nzọụkwụ kwesịrị ntụkwasị obi sochirinụ.",
      diagnosticTracks: [
        "Agwa: ụdị onye omume a ma ọ bụ nhọrọ a na-akpụ bụ gịnị?",
        "Mmekọrịta: onye a na-emetụta, kedu ka m ga-esi hụ ya n'anya nke ọma?",
        "Usoro: ọ na-emepụta ohere maka izuike, nlebara anya, na ndozi?",
      ],
      blindSpots: [
        "Ịhụ nhọrọ ndụ nkịtị dịka enweghị ihe ime mmụọ",
        "Ịme ihe chọrọ amamihe bara uru ka ọ bụrụ ihe omimi",
        "Ịhapụ ahụ, ezinụlọ, ma ọ bụ izuike mgbe ị na-achụso ihe pụtara",
      ],
      maturitySignals: [
        "Mkpebi ahụ dabara na usoro dị mma, ọ bụghị naanị ọchịchọ",
        "A na-ele ndị kacha nso na mgbanwe ahụ anya nke ọma",
        "Nzọụkwụ sochirinụ dị mfe iji rube isi",
      ],
      practices: [
        "Kpọọ obere omume kwesịrị ntụkwasị obi ị nwere ike imegharị",
        "Lelee ma nhọrọ a na-ewusi ma ọ bụ na-emebi mmekọrịta",
        "Chebe usoro izuike tupu itinye nrụgide",
      ],
      responseMoves: [
        "Weta ajụjụ ahụ site na echiche gaa na ndụ kwa ụbọchị",
        "Jikọọ amamihe na omume, mmekọrịta, na eziokwu ụlọ",
        "Debe nzọụkwụ sochirinụ ka ọ bụrụ nke doro anya na nke nwere ike ịdịgide",
      ],
      promptCue:
        "Na Life mode, mesie amamihe Baịbụl kwa ụbọchị maka ezinụlọ, mmekọrịta, omume, izuike, esemokwu, usoro ụlọ, ahụike, na obere nzọụkwụ kwesịrị ntụkwasị obi sochirinụ. Debe ndụmọdụ ahụ doro anya, bara uru, ma dị nro.",
      prompts: [
        "Kedu ka m ga-esi mee ndụ m kwa ụbọchị bụrụ nke amamihe karịa?",
        "Kedu ka m kwesịrị iche banyere mmekọrịta a?",
        "Omume kedu ka m kwesịrị ịgbanwe mbụ?",
      ],
    },
  },
  ha: {
    Money: {
      intent: "Ka ka tafiyar da abin da aka damka da nutsuwa da bayani.",
      focus: "Kasafin kudi, bashi, ajiyar kudi, saka jari, gamsuwa",
      useWhen: "Ka yi amfani da shi don kashe kudi, bashi, ajiyar kudi, saka jari, damuwar kudi ko kwatantawa.",
      lens: "Lente na kula: yanci, isa, hakuri, hadari, da alhakin aminci.",
      diagnosticTracks: [
        "Yanci: wannan zabi zai kara ko rage zabukan hikima a gaba?",
        "Isa: buri ya bayyana a fili ne ko kwatantawa ke saita ma'ana?",
        "Hadari: me zai iya lalacewa, kuma na lissafta kudin a hankali?",
      ],
      blindSpots: [
        "Rikita imani da tabbas na kudi",
        "Kiran matsin salon rayuwa bukata",
        "Daukar ikon bashi a matsayin izini",
      ],
      maturitySignals: [
        "Tsarin har yanzu yana da ma'ana bayan jira",
        "Lambobi suna bayyana, ba a rufe ba",
        "Shawara ta kalubalanci zato",
      ],
      practices: [
        "Sanya sunan abin da ya isa ga wannan kakar",
        "Rubuta tsarin biyan bashi, ajiyar kudi, ko bayarwa a fili",
        "Jira dare guda kafin kashe abin da ba ya dawowa",
      ],
      responseMoves: [
        "Raba buri, tsoro, da alhaki",
        "Bayyana musayar ba tare da kunyata mai amfani ba",
        "Fassara Nassosi zuwa halaye na kula da kudi",
      ],
      promptCue:
        "A Money mode, ka mai da hankali kan kula, gamsuwa, taka-tsantsan ga bashi, hadarin hikima, alhakin dogon lokaci, karimci, da sarrafa motsin zuciya kan kudi. Ka guji shawarar saka jari ko alkawarin sakamako.",
      prompts: [
        "Yaya zan gina arziki ba tare da kwaɗayi ba?",
        "Me hikima ke cewa game da bashi?",
        "Yaya zan daina kwatanta kaina da kudi?",
      ],
    },
    Work: {
      intent: "Ka rarrabe aiki, kira, jagoranci, da burin da zai dore.",
      focus: "Canjin aiki, jagoranci, kasuwanci, gajiya, kira",
      useWhen: "Ka yi amfani da shi don shawarwarin aiki, ra'ayoyin kasuwanci, matsin jagoranci, gajiya, ko buri.",
      lens: "Lente na kira: kwazo, shawara, lissafin kudi, hidima, da saurin da zai dore.",
      diagnosticTracks: [
        "Kira: irin hidima ko alhakin da ake bayyanawa?",
        "Karfi: rayuwar mai amfani tana da sarari ga wannan alkawari?",
        "Shawara: wa zai iya gwada tsarin ba tare da sarrafa shi ba?",
      ],
      blindSpots: [
        "Rikita rashin natsuwa da kira",
        "Amfani da harshe na ruhaniya don gujewa tsarawa",
        "Rikita tafi-da-kai da 'ya'ya",
      ],
      maturitySignals: [
        "Mai amfani zai iya bayyana musayar gaskiya",
        "Akwai gwaji na gaba da za a iya juyawa",
        "Shawarar hikima ta ga lambobi da dalilai",
      ],
      practices: [
        "Saita mafi karamin mataki da za a iya juyawa",
        "Rubuta hakikanin kudin lokaci, kudi, da hankali",
        "Tambayi mai suka wane bangare na tsarin ne mai rauni",
      ],
      responseMoves: [
        "Rarrabe kira, buri, tserewa, da gajiya",
        "Sauke shawarar zuwa gwajin aminci na gaba",
        "Yi amfani da shawara da lissafin kudi a matsayin abin da ke daidaita",
      ],
      promptCue:
        "A Work mode, ka mai da hankali kan kira, kwazo, shawara mai hikima, hali na jagoranci, lissafin kudi, buri da zai dore, da hidima. Ka taimaki mai amfani ya duba dalilai da musayar kafin manyan shawarwarin aiki.",
      prompts: [
        "Shin zan bar aikina da yake da kwanciyar hankali?",
        "Ta yaya zan san buri na yana lafiya?",
        "Shin zan fara wannan kasuwancin yanzu?",
      ],
    },
    Purpose: {
      intent: "Ka rage sauri ka kuma gane irin mutumin da wannan shawara ke ginawa.",
      focus: "Siffa, alkibla, damuwa, dabi'u, haske na dogon lokaci",
      useWhen: "Ka yi amfani da shi idan tambayar gaskiya ita ce siffa, alkibla, salama, lokaci, ko dabi'u.",
      lens: "Lente na ganewa: siffa, salama, dalilai, hakuri, da mataki na gaba mai aminci.",
      diagnosticTracks: [
        "Siffa: me mai amfani yake kokarin tabbatarwa, karewa, ko zama?",
        "Salama: me ke canzawa idan gaggawa ta lafa?",
        "Dalilai: wane buri ne mai kyau, kuma wane ne ya karkace?",
      ],
      blindSpots: [
        "Jiran cikakken tabbaci kafin a yi aiki da aminci",
        "Daukar damuwa a matsayin ganewa",
        "Barin nasara ta ayyana siffa",
      ],
      maturitySignals: [
        "Mataki na gaba ya bayyana ko da tafiyar gaba daya ba ta bayyana ba",
        "Mai amfani zai iya sunan dalilai ba tare da la'antar kansa ba",
        "Ana iya daukar shawarar da hakuri",
      ],
      practices: [
        "Saka sunan tsoron da ke karkashin shawarar",
        "Rubuta jimla guda game da mutumin da wannan zabi ke ginawa",
        "Zabi mataki na gaba mai aminci na sa'o'i 24 masu zuwa",
      ],
      responseMoves: [
        "Rage gaggawa kuma ka maido da iko",
        "Raba siffa daga sakamako",
        "Kira a duba dalilai da gaskiya ba tare da kunyata ba",
      ],
      promptCue:
        "A Purpose mode, ka mai da hankali kan ganewa, siffa, dalilai, salama, hakuri, dabi'u, tunani cikin addu'a, da mataki na gaba mai aminci. Ka bar shawarwarin su kasance a kasa, ba na sihiri ba; kada ka yi ikirarin tabbaci daga Allah.",
      prompts: [
        "Ta yaya zan yanke shawara idan komai ya rikice?",
        "Idan ina bin nasara ne saboda dalilai marasa kyau fa?",
        "Ta yaya zan samu salama game da mataki na gaba?",
      ],
    },
    Generosity: {
      intent: "Ka bayar da yardar rai ba tare da laifi, matsin lamba, ko nuna kai ba.",
      focus: "Bayarwa, taimakon iyali, sadaka, iyaka, dorewa",
      useWhen: "Ka yi amfani da shi don bayarwa, zakka, taimakon iyali, iyaka, ko karimci mai dorewa.",
      lens: "Lente na karimci: yarda, dorewa, farin ciki, hikima, da kauna ba tare da tilastawa ba.",
      diagnosticTracks: [
        "Yanci: kyautar da aka bayar da son rai ce ko laifi da tsoro ke tuka ta?",
        "Dorewa: wannan karimcin zai iya ci gaba ba tare da boyayyen bacin rai ba?",
        "Hikima: taimako a nan yana karfafa alhaki ko yana ba da damar cuta?",
      ],
      blindSpots: [
        "Kiran laifi karimci",
        "Bayarwa a fili don a ga kamar mai tsarki",
        "Ceto wasu daga sakamakon da ya kamata su fuskanta",
      ],
      maturitySignals: [
        "Kyautar tana da 'yanci, ba a tilasta ba",
        "Iyaka suna bayyane kuma masu kirki",
        "Tsarin bayarwa zai iya dorewa",
      ],
      practices: [
        "Yanke shawarar kyautar kafin lokacin matsin lamba",
        "Sanya iyakar bayarwa a bayyane",
        "Tambayi ko kudi shi ne mafi kyawun taimako",
      ],
      responseMoves: [
        "Cire laifi da matsin lamba daga tsakiyar",
        "Kare karimcin farin ciki da iyaka masu hikima",
        "Tambayi ko kyautar tana taimakawa ko tana ba da damar ci gaba da matsala",
      ],
      promptCue:
        "A Generosity mode, ka mai da hankali kan yarda mai farin ciki, dorewa, iyaka, rashin tilastawa, tausayi, da bayarwa mai alhaki. Ka ki karimcin da laifi ko nuna kai ke tukawa.",
      prompts: [
        "Ta yaya zan bayar ba tare da laifi ko matsin lamba ba?",
        "Shin zan sake taimaka wa iyali da kudi?",
        "Nawa karimci zai iya dorewa a wurina?",
      ],
    },
    Life: {
      intent: "Ka yi amfani da hikimar Littafi Mai Tsarki ga rayuwar yau da kullum cikin natsuwa.",
      focus: "Halaye, dangantaka, iyali, hutawa, lafiya, tsarin gida",
      useWhen: "Ka yi amfani da shi don shawarwarin yau da kullum, al'adu, dangantaka, halaye, hutawa, rikici, ko lokacin da mataki na gaba ba a bayyane yake kudi ko aiki ba.",
      lens: "Lente na rayuwa gaba daya: hali, dangantaka, alhaki, al'adu, da mataki na gaba mai aminci.",
      diagnosticTracks: [
        "Hali: irin mutum me wannan al'ada ko zabi ke ginawa?",
        "Dangantaka: wa abin ya shafa kuma ta yaya zan so su da kyau?",
        "Al'ada: wannan yana samar da wuri ga hutawa, kulawa, da gyara?",
      ],
      blindSpots: [
        "Daukar zabukan yau da kullum a matsayin marasa muhimmanci ga ruhaniya",
        "Yin abin da ke bukatar hikima ta aikace ya zama abin sihiri",
        "Rufe ido ga jiki, iyali, ko hutawa yayin bin ma'ana",
      ],
      maturitySignals: [
        "Shawarar ta dace da al'adu masu lafiya, ba buri kawai ba",
        "An yi la'akari da mutane mafi kusa da sauyi da kulawa",
        "Mataki na gaba yana da sauki a bi",
      ],
      practices: [
        "Saka sunan karamin al'ada mai aminci da za ka iya maimaitawa",
        "Duba ko wannan zabi yana karfafa ko yana rage dangantaka",
        "Kare tsarin hutawa kafin ka kara matsin lamba",
      ],
      responseMoves: [
        "Ka sauke tambayar daga abstraction zuwa rayuwa ta yau da kullum",
        "Ka danganta hikima da halaye, dangantaka, da gaskiyar gida",
        "Ka sa mataki na gaba ya kasance a fili kuma mai dorewa",
      ],
      promptCue:
        "A Life mode, ka mai da hankali kan hikimar Littafi Mai Tsarki ta yau da kullum ga iyali, dangantaka, halaye, hutawa, rikici, tsarin gida, lafiya, da karamin mataki na gaba mai aminci. Ka sa shawarwarin su kasance a kasa, masu amfani, kuma masu tausayi.",
      prompts: [
        "Ta yaya zan sa rayuwata ta yau da kullum ta zama mai hikima?",
        "Ta yaya zan kamata in yi tunani game da wannan dangantaka?",
        "Wane al'ada ne zan canza da farko?",
      ],
    },
  },
};

type LocalizedWisdomEntryData = Partial<Pick<WisdomEntryData, "theme" | "principle" | "context" | "application" | "keywords" | "emotions" | "questions">>;

const localizedWisdomLibraryEntries: Partial<Record<LanguageCode, Record<string, LocalizedWisdomEntryData>>> = {
  en: {
    "Matthew 25:14-30": {
      theme: "Stewardship",
      principle: "Entrusted resources are handled with faithfulness, courage, and accountability.",
      context:
        "The parable is about servants entrusted with responsibility while the master is away. It commends faithful action, not speculation or anxiety.",
      application:
        "Treat money, skill, time, and opportunity as entrusted resources. Growth matters, but so do motive, patience, diligence, and accountability.",
      keywords: ["money", "invest", "investing", "wealth", "stewardship", "growth", "risk", "responsibility"],
      emotions: ["fear", "uncertainty", "greed", "pressure"],
      questions: [
        "What has actually been entrusted to me right now?",
        "Am I acting from faithful responsibility or from comparison?",
        "What counsel or accountability would make this decision wiser?",
      ],
    },
    "Proverbs 22:7": {
      theme: "Debt",
      principle: "Debt can reduce freedom and should be approached with sobriety.",
      context:
        "Proverbs often describes patterns of wisdom rather than absolute legal rules. This proverb names the relational and practical weight debt can create.",
      application:
        "Before taking on debt, examine necessity, repayment capacity, emotional pressure, and whether the obligation supports wise stewardship.",
      keywords: ["debt", "loan", "credit", "mortgage", "borrow", "owe", "payment"],
      emotions: ["stress", "shame", "fear", "urgency"],
      questions: [
        "Is this debt serving a clear purpose or soothing a short-term pressure?",
        "What freedom will I lose while repaying it?",
        "Have I made the repayment plan visible and realistic?",
      ],
    },
    "Philippians 4:11-13": {
      theme: "Contentment",
      principle: "Contentment is learned through trust, not achieved through perfect circumstances.",
      context:
        "Paul writes from hardship and describes contentment as learned dependence, not denial of real need.",
      application:
        "Financial peace often begins by naming enough, resisting comparison, and building habits that lower emotional volatility.",
      keywords: ["comparison", "contentment", "salary", "envy", "peace", "lifestyle", "greed"],
      emotions: ["envy", "restlessness", "anxiety", "scarcity"],
      questions: [
        "What am I calling enough in this season?",
        "Where is comparison distorting my judgment?",
        "What practice would help my nervous system slow down?",
      ],
    },
    "Proverbs 15:22": {
      theme: "Counsel",
      principle: "Plans become sturdier when they are examined with humble counsel.",
      context:
        "Wisdom literature repeatedly values teachability, correction, and the ability to seek perspective before acting.",
      application:
        "For major work, money, or business choices, invite people who are wise, honest, and not financially dependent on your decision.",
      keywords: ["job", "career", "business", "startup", "leave", "quit", "decision", "counsel", "mentor"],
      emotions: ["confusion", "excitement", "fear", "ambition"],
      questions: [
        "Who can challenge my assumptions without controlling me?",
        "What would a wise critic notice about this plan?",
        "What would I still do if nobody applauded the decision?",
      ],
    },
    "Luke 14:28": {
      theme: "Cost Counting",
      principle: "Wise action considers cost before commitment.",
      context:
        "Jesus uses the image of building a tower to emphasize sober assessment before public commitment.",
      application:
        "Before a major business or career move, define runway, tradeoffs, obligations, timing, and the smallest reversible experiment.",
      keywords: ["business", "startup", "risk", "job", "career", "plan", "runway", "entrepreneur"],
      emotions: ["excitement", "pressure", "uncertainty", "impatience"],
      questions: [
        "What is the real cost if this takes twice as long?",
        "Which part of the decision is reversible?",
        "What experiment could reveal truth before I make a larger commitment?",
      ],
    },
    "2 Corinthians 9:6-8": {
      theme: "Generosity",
      principle: "Generosity is willing and thoughtful, not coerced or performative.",
      context:
        "Paul invites cheerful generosity while rejecting compulsion. The posture matters as much as the amount.",
      application:
        "Give from conviction and planning, not guilt, social pressure, or the need to appear spiritual.",
      keywords: ["give", "giving", "generosity", "tithe", "donate", "charity", "church"],
      emotions: ["guilt", "joy", "pressure", "gratitude"],
      questions: [
        "Is this gift free, thoughtful, and sustainable?",
        "Does my giving plan protect both generosity and responsibility?",
        "What need am I being invited to notice with love?",
      ],
    },
    "Proverbs 21:5": {
      theme: "Diligence",
      principle: "Diligent planning tends toward abundance; haste tends toward lack.",
      context:
        "This proverb contrasts steady diligence with hurried action. It warns against impulsive shortcuts.",
      application:
        "Avoid financial moves driven by hype, panic, or urgency. Write the plan, test assumptions, and give time for counsel.",
      keywords: ["budget", "plan", "hype", "impulse", "crypto", "spending", "saving", "discipline"],
      emotions: ["panic", "fomo", "urgency", "excitement"],
      questions: [
        "What would I choose if there were no urgency?",
        "Is this opportunity still wise after a quiet night of sleep?",
        "What process protects me from impulse?",
      ],
    },
    "Matthew 6:25-34": {
      theme: "Provision and Anxiety",
      principle: "Trust reduces anxious striving while still allowing responsible action.",
      context:
        "Jesus addresses worry and misplaced striving, calling listeners to seek God's kingdom while living one day at a time.",
      application:
        "Separate responsible planning from anxiety loops. Do the next faithful action, then refuse to rehearse every worst-case scenario.",
      keywords: ["anxiety", "worry", "provision", "fear", "future", "security", "scarcity"],
      emotions: ["anxiety", "fear", "scarcity", "overwhelm"],
      questions: [
        "What is the next faithful action for today?",
        "Which worries are calling for planning, and which are calling for release?",
        "What would peace change about my pace?",
      ],
    },
  },
};

export function localizedRegionLabel(regionCode: RegionCode, language: LanguageCode) {
  return localizedRegionLabels[language]?.[regionCode] ?? regions[regionCode]?.label ?? regions.global.label;
}

export function localizedModeProfile(mode: Mode, language: LanguageCode) {
  return {
    ...modeProfiles[mode],
    ...localizedModeProfiles[language]?.[mode],
    displayLabel: mode,
  };
}

export function localizedWisdomEntry(entry: WisdomEntryData, preferences: UserPreferences): WisdomEntryData {
  const canonical = canonicalScriptureReference(entry.scripture);
  const localized = localizedWisdomLibraryEntries[preferences.language]?.[canonical];
  const localizedSummary = localizedScriptureSummaries[preferences.language]?.[canonical];
  const theme = localizedWisdomThemes[preferences.language]?.[entry.theme] ?? entry.theme;

  return {
    ...entry,
    theme,
    principle: localized?.principle ?? localizedSummary ?? entry.principle,
    context: localized?.context ?? entry.context,
    application: localized?.application ?? entry.application,
    keywords: localized?.keywords ?? entry.keywords,
    emotions: localized?.emotions ?? entry.emotions,
    questions: localized?.questions ?? entry.questions,
  };
}

export function localizedWisdomLibraryEntry(entry: WisdomEntryData, preferences: UserPreferences): WisdomEntryData {
  return localizedWisdomEntry(entry, preferences);
}

export function normalizePreferences(input: Partial<UserPreferences> = {}): UserPreferences {
  const language = input.language && input.language in languages ? input.language : defaultPreferences.language;
  const region = input.region && input.region in regions ? input.region : defaultPreferences.region;
  const requestedBibleTranslation =
    input.bibleTranslation && input.bibleTranslation in bibleTranslations
      ? input.bibleTranslation
      : defaultBibleTranslationForLanguage(language);
  const options = bibleTranslationOptionsForLanguage(language);
  const bibleTranslation = options.includes(requestedBibleTranslation)
    ? requestedBibleTranslation
    : defaultBibleTranslationForLanguage(language);

  return {
    language,
    region,
    bibleTranslation,
    voiceEnabled: typeof input.voiceEnabled === "boolean" ? input.voiceEnabled : defaultPreferences.voiceEnabled,
  };
}

export function localizedDailyWisdom(
  entry: WisdomEntryData,
  mode: Mode,
  preferences: UserPreferences
) {
  const copy = languageCopy[preferences.language] ?? languageCopy.en;
  const localizedEntry = localizedWisdomEntry(entry, preferences);
  const practice =
    localizedDailyPractices[preferences.language]?.[mode] ??
    localizedDailyPractices.en[mode] ??
    localizedEntry.questions[0];

  return {
    label: copy.dailyLabel,
    theme: localizedEntry.theme,
    scripture: `${entry.scripture} (${scriptureDisplayLabel(entry.scripture, preferences)})`,
    principle: localizedEntry.principle,
    practice,
    translationNote: copy.translationFallback,
  };
}

export function localizedWisdomLibraryNote(entry: WisdomEntryData, preferences: UserPreferences) {
  const regionLabel = localizedRegionLabel(preferences.region, preferences.language);
  const translation = scriptureDisplayLabel(entry.scripture, preferences);

  const notes: Record<LanguageCode, string> = {
    en: `Use ${entry.scripture} with the ${translation} reference label, then apply it with ${regionLabel} realities in view.`,
    es: `Usa ${entry.scripture} con la referencia ${translation}, y aplica el principio considerando la realidad de ${regionLabel}.`,
    fr: `Utilise ${entry.scripture} avec la référence ${translation}, puis applique le principe dans le contexte de ${regionLabel}.`,
    pt: `Use ${entry.scripture} com a referência ${translation}, aplicando o princípio à realidade de ${regionLabel}.`,
    de: `Nutze ${entry.scripture} mit der Referenz ${translation} und wende das Prinzip im Kontext von ${regionLabel} an.`,
    yo: `Lo ${entry.scripture} pẹ̀lú ìtọ́kasí ${translation}, kí o sì fi sí ìṣe ní agbègbè ${regionLabel}.`,
    ig: `Jiri ${entry.scripture} na ntụaka ${translation}, tinye ụkpụrụ ya n'ọrụ n'ọnọdụ ${regionLabel}.`,
    ha: `Yi amfani da ${entry.scripture} tare da alamar ${translation}, sannan ka aiwatar da ƙa'idar a yanayin ${regionLabel}.`,
  };

  return notes[preferences.language] ?? notes.en;
}

export function promptPreferenceContext(preferences: UserPreferences) {
  const language = languages[preferences.language] ?? languages.en;
  const region = regions[preferences.region] ?? regions.global;
  const translation = bibleTranslations[preferences.bibleTranslation] ?? bibleTranslations.WEB;

  return [
    `Preferred response language: ${language.name} (${language.nativeName}).`,
    `Region context: ${region.label}. ${region.example}`,
    `Preferred Bible translation: ${preferences.bibleTranslation} - ${translation.label}.`,
    "When a curated public-domain scripture reading is available in the user's chosen language, use that language label and keep the reference exact.",
    "If the requested language does not have a safe public-domain scripture text available, keep scripture references accurate and translate only the explanation around the reference.",
  ].join("\n");
}
