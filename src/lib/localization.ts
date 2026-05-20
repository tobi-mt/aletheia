import type { Mode, WisdomEntryData } from "@/lib/wisdom-data";

export type LanguageCode = "en" | "es" | "fr" | "pt" | "de" | "yo" | "ig" | "ha";
export type RegionCode = "global" | "us" | "uk" | "eu" | "ng" | "br" | "latam";
export type BibleTranslation = "WEB" | "KJV" | "ASV";

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
  voiceEnabled: false,
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

export const bibleTranslations: Record<BibleTranslation, { label: string; note: string }> = {
  WEB: {
    label: "World English Bible",
    note: "Public domain English translation. Default for scripture quotation if verse text is later added.",
  },
  KJV: {
    label: "King James Version",
    note: "Public domain English translation with traditional phrasing.",
  },
  ASV: {
    label: "American Standard Version",
    note: "Public domain English translation with formal phrasing.",
  },
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
    translationFallback: "Las referencias bíblicas usan una traducción pública disponible; si no, volvemos al inglés.",
    voiceHint: "Usa la voz para una conversación más pausada si tu navegador lo permite.",
    askPlaceholder: "Pregunta con sabiduría, no con prisa...",
    regionHint: "Los ejemplos reflejarán tu región sin reemplazar consejo legal, fiscal o financiero.",
  },
  fr: {
    onboarding: "Choisis la manière dont Aletheia doit parler: langue, région, traduction biblique et voix.",
    dailyLabel: "Sagesse du jour",
    translationFallback: "Les références bibliques utilisent une traduction publique disponible; sinon, l’anglais sert de repli.",
    voiceHint: "Utilise la voix pour une conversation plus lente si ton navigateur le permet.",
    askPlaceholder: "Pose ta question avec sagesse, sans précipitation...",
    regionHint: "Les exemples tiendront compte de ta région sans remplacer un conseil professionnel.",
  },
  pt: {
    onboarding: "Escolha como Aletheia deve falar: idioma, região, tradução bíblica e voz.",
    dailyLabel: "Sabedoria diária",
    translationFallback: "As referências bíblicas usam uma tradução pública disponível; caso contrário, voltamos ao inglês.",
    voiceHint: "Use voz para uma conversa mais calma quando o navegador permitir.",
    askPlaceholder: "Pergunte com sabedoria, não com pressa...",
    regionHint: "Os exemplos considerarão sua região sem substituir aconselhamento profissional.",
  },
  de: {
    onboarding: "Wähle, wie Aletheia sprechen soll: Sprache, Region, Bibelübersetzung und Stimme.",
    dailyLabel: "Tägliche Weisheit",
    translationFallback: "Bibelstellen nutzen eine verfügbare gemeinfreie Übersetzung; sonst greifen wir auf Englisch zurück.",
    voiceHint: "Nutze Sprache für ein ruhigeres Gespräch, wenn dein Browser es unterstützt.",
    askPlaceholder: "Frage mit Weisheit, nicht aus Eile...",
    regionHint: "Beispiele berücksichtigen deine Region, ersetzen aber keine Fachberatung.",
  },
  yo: {
    onboarding: "Yan bí Aletheia ṣe máa ba ọ sọrọ: èdè, agbègbè, ìtumọ̀ Bíbélì, àti ohùn.",
    dailyLabel: "Ọgbọ́n ojoojúmọ́",
    translationFallback: "A máa lo ìtọ́kasí Bíbélì tó dá lórí ìtumọ̀ tó wà; bí kò bá sí, a padà sí Gẹ̀ẹ́sì.",
    voiceHint: "Lo ohùn fún ìjíròrò tó lọra tí browser rẹ bá gba.",
    askPlaceholder: "Béèrè pẹ̀lú ọgbọ́n, kì í ṣe pẹ̀lú ìkánjú...",
    regionHint: "Àpẹẹrẹ yóò rántí agbègbè rẹ, ṣùgbọ́n kò rọ́pò ìmọ̀ràn amọ̀ja.",
  },
  ig: {
    onboarding: "Họrọ otu Aletheia ga-esi gwa gị okwu: asụsụ, mpaghara, ntụgharị Baịbụl, na olu.",
    dailyLabel: "Amamihe kwa ụbọchị",
    translationFallback: "A ga-eji ntụaka Baịbụl dị nchebe; ma ọ bụrụ na ntụgharị adịghị, anyị alaghachi n'Bekee.",
    voiceHint: "Jiri olu mee mkparịta ụka dị nwayọọ ma ọ bụrụ na browser gị kwadoro ya.",
    askPlaceholder: "Jụọ n'amamihe, ọ bụghị n'ịgba ọsọ...",
    regionHint: "Ihe atụ ga-elebara mpaghara gị anya, ma ọ naghị dochie ndụmọdụ ọkachamara.",
  },
  ha: {
    onboarding: "Zaɓi yadda Aletheia za ta yi magana da kai: harshe, yanki, fassarar Littafi Mai Tsarki, da murya.",
    dailyLabel: "Hikima ta yau",
    translationFallback: "Za mu yi amfani da nassoshin Littafi Mai Tsarki masu aminci; idan babu fassara, za mu koma Turanci.",
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
  },
  es: {
    Money: "Hoy, no optimices para tener más. Define qué es suficiente.",
    Work: "Hoy, elige el siguiente paso fiel antes que el más impresionante.",
    Purpose: "Hoy, deja que la paz marque el ritmo del discernimiento.",
    Generosity: "Hoy, da por convicción, no por culpa.",
  },
  fr: {
    Money: "Aujourd’hui, ne cherche pas seulement plus. Définis ce qui suffit.",
    Work: "Aujourd’hui, choisis le prochain pas fidèle avant le pas impressionnant.",
    Purpose: "Aujourd’hui, laisse la paix donner le rythme du discernement.",
    Generosity: "Aujourd’hui, donne par conviction, non par culpabilité.",
  },
  pt: {
    Money: "Hoje, não otimize para ter mais. Defina o suficiente.",
    Work: "Hoje, escolha o próximo passo fiel antes do passo impressionante.",
    Purpose: "Hoje, deixe a paz definir o ritmo do discernimento.",
    Generosity: "Hoje, dê por convicção, não por culpa.",
  },
  de: {
    Money: "Heute geht es nicht um mehr. Definiere, was genug ist.",
    Work: "Wähle heute den nächsten treuen Schritt vor dem beeindruckenden.",
    Purpose: "Lass heute Frieden das Tempo deiner Klärung bestimmen.",
    Generosity: "Gib heute aus Überzeugung, nicht aus Schuldgefühl.",
  },
  yo: {
    Money: "Lónìí, má ṣe lé pọ̀ síi nìkan. Sọ ohun tó tó di mímọ̀.",
    Work: "Lónìí, yan ìgbésẹ̀ olóòtítọ́ tó kàn kí o tó lé ohun tó ń yanilẹ́nu.",
    Purpose: "Lónìí, jẹ́ kí àlàáfíà ṣètò ìyára ìmọ̀ràn rẹ.",
    Generosity: "Lónìí, fúnni látinú ìdánilójú, kì í ṣe ẹ̀bi.",
  },
  ig: {
    Money: "Taa, achụla naanị karịa. Kọwaa ihe zuru ezu.",
    Work: "Taa, họrọ nzọụkwụ kwesịrị ntụkwasị obi tupu ihe na-adọrọ mmasị.",
    Purpose: "Taa, ka udo duzie ọsọ nghọta gị.",
    Generosity: "Taa, nye site n'ikwere, ọ bụghị site n'ikpe ọmụma.",
  },
  ha: {
    Money: "Yau, kada ka bi ƙarin abu kawai. Ka bayyana abin da ya isa.",
    Work: "Yau, zaɓi mataki mai aminci kafin abin burgewa.",
    Purpose: "Yau, bari salama ta tsara saurin fahimtarka.",
    Generosity: "Yau, ka bayar da tabbaci, ba saboda laifi ba.",
  },
};

export function normalizePreferences(input: Partial<UserPreferences> = {}): UserPreferences {
  const language = input.language && input.language in languages ? input.language : defaultPreferences.language;
  const region = input.region && input.region in regions ? input.region : defaultPreferences.region;
  const bibleTranslation =
    input.bibleTranslation && input.bibleTranslation in bibleTranslations
      ? input.bibleTranslation
      : defaultPreferences.bibleTranslation;

  return {
    language,
    region,
    bibleTranslation,
    voiceEnabled: Boolean(input.voiceEnabled),
  };
}

export function localizedDailyWisdom(
  entry: WisdomEntryData,
  mode: Mode,
  preferences: UserPreferences
) {
  const copy = languageCopy[preferences.language] ?? languageCopy.en;
  const practice =
    localizedDailyPractices[preferences.language]?.[mode] ??
    localizedDailyPractices.en[mode] ??
    entry.questions[0];

  return {
    label: copy.dailyLabel,
    theme: entry.theme,
    scripture: `${entry.scripture} (${preferences.bibleTranslation})`,
    principle: preferences.language === "en" ? entry.principle : practice,
    practice,
    translationNote: copy.translationFallback,
  };
}

export function localizedWisdomLibraryNote(entry: WisdomEntryData, preferences: UserPreferences) {
  const region = regions[preferences.region] ?? regions.global;
  const translation = preferences.bibleTranslation;

  const notes: Record<LanguageCode, string> = {
    en: `Use ${entry.scripture} with the ${translation} reference label, then apply it with ${region.label} realities in view.`,
    es: `Usa ${entry.scripture} con la referencia ${translation}, y aplica el principio considerando la realidad de ${region.label}.`,
    fr: `Utilise ${entry.scripture} avec la référence ${translation}, puis applique le principe dans le contexte de ${region.label}.`,
    pt: `Use ${entry.scripture} com a referência ${translation}, aplicando o princípio à realidade de ${region.label}.`,
    de: `Nutze ${entry.scripture} mit der Referenz ${translation} und wende das Prinzip im Kontext von ${region.label} an.`,
    yo: `Lo ${entry.scripture} pẹ̀lú ìtọ́kasí ${translation}, kí o sì fi sí ìṣe ní agbègbè ${region.label}.`,
    ig: `Jiri ${entry.scripture} na ntụaka ${translation}, tinye ụkpụrụ ya n'ọrụ n'ọnọdụ ${region.label}.`,
    ha: `Yi amfani da ${entry.scripture} tare da alamar ${translation}, sannan ka aiwatar da ƙa'idar a yanayin ${region.label}.`,
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
    "If the requested language does not have a safe public-domain scripture text available, keep scripture references accurate and translate only the explanation around the reference.",
  ].join("\n");
}
