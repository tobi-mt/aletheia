import { modeProfiles, type ModeProfile } from "@/lib/mode-profiles";
import type { Mode, WisdomEntryData } from "@/lib/wisdom-data";
import { displayReadyScriptureReads } from "@/lib/display-ready-scripture-reads";
import { getFullScriptureRead, fullScriptureReadsEnabled } from "@/lib/full-scripture-reads";
import { isFullScriptureEnabled, recordScriptureFallback } from "@/lib/full-scripture-rollout";
import { localizedScriptureBookNamesGenerated } from "@/lib/scripture-book-names.generated";

export type LanguageCode = "en" | "es" | "fr" | "pt" | "de" | "yo" | "ig" | "ha" | "tl" | "ar" | "hi";
export type RegionCode = "global" | "us" | "uk" | "eu" | "ng" | "br" | "latam" | "ph" | "mena" | "in";
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

export const languages: Record<LanguageCode, { name: string; nativeName: string; speech: string; direction: "ltr" | "rtl" }> = {
  en: { name: "English", nativeName: "English", speech: "en-US", direction: "ltr" },
  es: { name: "Spanish", nativeName: "Español", speech: "es-ES", direction: "ltr" },
  fr: { name: "French", nativeName: "Français", speech: "fr-FR", direction: "ltr" },
  pt: { name: "Portuguese", nativeName: "Português", speech: "pt-BR", direction: "ltr" },
  de: { name: "German", nativeName: "Deutsch", speech: "de-DE", direction: "ltr" },
  yo: { name: "Yoruba", nativeName: "Yorùbá", speech: "yo-NG", direction: "ltr" },
  ig: { name: "Igbo", nativeName: "Igbo", speech: "ig-NG", direction: "ltr" },
  ha: { name: "Hausa", nativeName: "Hausa", speech: "ha-NG", direction: "ltr" },
  tl: { name: "Filipino", nativeName: "Filipino", speech: "tl-PH", direction: "ltr" },
  ar: { name: "Arabic", nativeName: "العربية", speech: "ar", direction: "rtl" },
  hi: { name: "Hindi", nativeName: "हिन्दी", speech: "hi-IN", direction: "ltr" },
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
  ph: {
    label: "Philippines",
    currency: "PHP",
    example: "Use examples like family obligations, remittances, school costs, island logistics, and community support.",
  },
  mena: {
    label: "Middle East and North Africa",
    currency: "local currency",
    example: "Use examples like family duty, migration, remittances, business uncertainty, and regional community norms.",
  },
  in: {
    label: "India",
    currency: "INR",
    example: "Use examples like family obligations, inflation, savings discipline, work pressure, and regional diversity.",
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
  tl: "WEB",
  ar: "WEB",
  hi: "WEB",
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
  kind?: "translation" | "passage" | "unavailable";
  verses?: Array<{
    verse: string;
    text: string;
  }>;
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

export const curatedScriptureReferences = Object.keys(displayReadyScriptureReads.WEB ?? scriptureQuickReads).sort(
  (a, b) => b.length - a.length
);


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
  const useFullReads = fullScriptureReadsEnabled && isFullScriptureEnabled(preferences.bibleTranslation, preferences.language);
  const fullRead = useFullReads ? getFullScriptureRead(preferences.bibleTranslation, canonical) : undefined;

  if (useFullReads && fullRead === undefined) {
    recordScriptureFallback(preferences.bibleTranslation, preferences.language, canonical);
  }

  const localized = fullRead ?? displayReadyScriptureReads[preferences.bibleTranslation]?.[canonical];
  if (localized?.verses?.length) {
    return {
      ...localized,
      kind: "passage",
    };
  }

  const preferredTranslation = bibleTranslations[preferences.bibleTranslation] ?? bibleTranslations.WEB;

  return {
    translation: preferences.bibleTranslation,
    label: preferredTranslation.label,
    text: localizedScriptureFallbackText[preferences.language] ?? localizedScriptureFallbackText.en ?? "",
    availableLanguage: preferences.language,
    kind: "unavailable",
  };
}

export function scriptureTranslationLabel(scripture: string, preferences: UserPreferences) {
  const read = localizedScriptureRead(scripture, preferences);
  const language = languages[read.availableLanguage] ?? languages.en;
  if (read.kind === "unavailable") {
    const translation = bibleTranslations[read.translation as BibleTranslation] ?? bibleTranslations.WEB;
    return translation.label;
  }
  return `${read.translation} ${language.name}`;
}

export function scriptureDisplayLabel(scripture: string, preferences: UserPreferences) {
  const read = localizedScriptureRead(scripture, preferences);
  const preferredTranslation = bibleTranslations[preferences.bibleTranslation] ?? bibleTranslations.WEB;

  if (read.kind === "translation" || read.kind === "passage") {
    return preferredTranslation.label;
  }

  if (read.kind === "unavailable") {
    return preferredTranslation.label;
  }

  return preferredTranslation.label;
}

const localizedScriptureBookNames: Partial<Record<LanguageCode, Record<string, string>>> =
  localizedScriptureBookNamesGenerated;

export function localizedScriptureReference(scripture: string, language: LanguageCode): string {
  if (language === "en") {
    return canonicalScriptureReference(scripture);
  }

  const canonical = canonicalScriptureReference(scripture);
  const normalized = normalizeScriptureReference(canonical);
  const match = normalized.match(/^(.+?)\s+(\d+):(\d+)(?:\s*-\s*(\d+))?$/);
  if (!match) {
    return canonical;
  }

  const bookKey = match[1].trim().toLowerCase().replace(/\s+/g, " ");
  const localizedBook = localizedScriptureBookNames[language]?.[bookKey];
  if (!localizedBook) {
    return canonical;
  }

  const chapter = match[2];
  const start = match[3];
  const end = match[4];
  return `${localizedBook} ${chapter}:${start}${end ? `-${end}` : ""}`;
}

function escapeScriptureRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function localizeScriptureReferencesInText(
  text: string,
  language: LanguageCode,
  allowedScriptures: string[] = curatedScriptureReferences
): string {
  if (!text || language === "en") {
    return text;
  }

  const uniqueTargets = [...new Set(allowedScriptures.map((scripture) => canonicalScriptureReference(scripture)))]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);

  let localizedText = text;
  uniqueTargets.forEach((scripture) => {
    const localizedReference = localizedScriptureReference(scripture, language);
    if (!localizedReference || localizedReference === scripture) {
      return;
    }
    const pattern = new RegExp(escapeScriptureRegExp(scripture), "g");
    localizedText = localizedText.replace(pattern, localizedReference);
  });

  return localizedText;
}

export const languageCopy: Partial<Record<
  LanguageCode,
  {
    onboarding: string;
    dailyLabel: string;
    translationFallback: string;
    voiceHint: string;
    askPlaceholder: string;
    regionHint: string;
  }
>> = {
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
  tl: {
    onboarding: "Piliin kung paano magsasalita si Aletheia: wika, rehiyon, salin ng Biblia, at boses.",
    dailyLabel: "Karunungan sa Araw-araw",
    translationFallback: "Gumagamit ang mga sanggunian sa Kasulatan ng iyong piniling saling pampubliko kapag mayroon.",
    voiceHint: "Gamitin ang boses para sa mas mabagal at mas mapagnilay na pag-uusap kapag sinusuportahan ito ng browser.",
    askPlaceholder: "Magtanong nang may karunungan, hindi pagmamadali...",
    regionHint: "Sumasalamin ang mga halimbawa sa iyong rehiyon nang hindi nagpapanggap na alam ang lokal na batas o buwis.",
  },
  ar: {
    onboarding: "اختر كيف يتحدث Aletheia: اللغة، المنطقة، ترجمة الكتاب المقدس، والصوت.",
    dailyLabel: "الحكمة اليومية",
    translationFallback: "تستخدم مراجع الكتاب المقدس ترجمتك العامة المفضلة عندما تكون متاحة.",
    voiceHint: "استخدم الصوت لمحادثة أبطأ وأكثر تأملًا عندما يدعم المتصفح ذلك.",
    askPlaceholder: "اسأل بحكمة، لا بعجلة...",
    regionHint: "تعكس الأمثلة منطقتك من دون ادعاء معرفة القانون أو الضرائب المحلية.",
  },
  hi: {
    onboarding: "चुनें कि Aletheia कैसे बोले: भाषा, क्षेत्र, बाइबिल अनुवाद, और आवाज़।",
    dailyLabel: "दैनिक ज्ञान",
    translationFallback: "शास्त्र संदर्भ, जहाँ उपलब्ध हो, आपके पसंदीदा सार्वजनिक अनुवाद का उपयोग करते हैं।",
    voiceHint: "जब आपका ब्राउज़र समर्थन करे, तो धीमी और अधिक चिंतनशील बातचीत के लिए आवाज़ का उपयोग करें।",
    askPlaceholder: "बिना जल्दबाज़ी के, ज्ञान के साथ पूछें...",
    regionHint: "उदाहरण आपके क्षेत्र को दर्शाते हैं, बिना स्थानीय कानून या कर का दावा किए।",
  },
};

export const crisisSupportCopy: Partial<Record<
  LanguageCode,
  {
    selfHarmOpening: string;
    selfHarmImmediate: string;
    selfHarmFollowUp: string;
    addictionOpening: string;
    addictionNext: string;
    depressionOpening: string;
    depressionNext: string;
    lonelinessOpening: string;
    lonelinessNext: string;
    holinessOpening: string;
    holinessNext: string;
  }
>> = {
  en: {
    selfHarmOpening:
      "I’m really glad you said this out loud. If you might act on thoughts of self-harm or suicide, stop here and get immediate human help.",
    selfHarmImmediate:
      "If you are in the U.S. or Canada, call or text 988 now. If you are elsewhere, contact local emergency services or a nearby crisis line right away.",
    selfHarmFollowUp:
      "Reach a trusted person now, do not stay alone, and move anything you could use to hurt yourself away from you.",
    addictionOpening:
      "That is a serious struggle, and you do not need to face it by willpower alone.",
    addictionNext:
      "Tell one trusted person the truth today, remove one easy access point, and make the next 24 hours safer.",
    depressionOpening:
      "That sounds heavy, and I’m sorry you are carrying it.",
    depressionNext:
      "Shrink the next hour: drink water, eat something, step outside, and tell one safe person what is happening.",
    lonelinessOpening:
      "That kind of loneliness matters.",
    lonelinessNext:
      "Choose contact before clarity. Text, call, or sit with one safe person, even if you do not have the right words yet.",
    holinessOpening:
      "This sounds like a holiness and formation question, not just a willpower question.",
    holinessNext:
      "Bring the struggle into the light with confession, boundaries, and accountability.",
  },
  es: {
    selfHarmOpening:
      "Me alegra que lo hayas dicho en voz alta. Si podrías actuar sobre pensamientos de autolesión o suicidio, detente aquí y busca ayuda humana inmediata.",
    selfHarmImmediate:
      "Si estás en EE. UU. o Canadá, llama o envía un mensaje al 988 ahora. Si estás en otro lugar, contacta de inmediato a los servicios de emergencia locales o a una línea de crisis cercana.",
    selfHarmFollowUp:
      "Contacta ahora a una persona de confianza, no te quedes solo y aleja de ti cualquier cosa que podrías usar para hacerte daño.",
    addictionOpening:
      "Eso es una lucha seria y no necesitas enfrentarla solo con fuerza de voluntad.",
    addictionNext:
      "Dile la verdad hoy a una persona de confianza, quita un acceso fácil y haz más seguros los próximos 24 horas.",
    depressionOpening:
      "Eso suena pesado y siento que lo estés cargando.",
    depressionNext:
      "Reduce la próxima hora: toma agua, come algo, sal un momento y dile a una persona segura lo que está pasando.",
    lonelinessOpening:
      "Ese tipo de soledad importa.",
    lonelinessNext:
      "Elige contacto antes que claridad. Escribe, llama o siéntate con una persona segura, aunque no tengas las palabras correctas.",
    holinessOpening:
      "Esto suena más a una pregunta de santidad y formación que solo de fuerza de voluntad.",
    holinessNext:
      "Lleva la lucha a la luz con confesión, límites y rendición de cuentas.",
  },
  fr: {
    selfHarmOpening:
      "Je suis vraiment content que tu l’aies dit à voix haute. Si tu pourrais passer à l’acte, arrête-toi ici et demande une aide humaine immédiate.",
    selfHarmImmediate:
      "Si tu es aux États-Unis ou au Canada, appelle ou envoie un message au 988 maintenant. Sinon, contacte tout de suite les services d’urgence locaux ou une ligne de crise proche.",
    selfHarmFollowUp:
      "Contacte maintenant une personne de confiance, ne reste pas seul et éloigne de toi tout ce que tu pourrais utiliser pour te faire du mal.",
    addictionOpening:
      "C’est une lutte sérieuse et tu n’as pas besoin de l’affronter par la seule volonté.",
    addictionNext:
      "Dis la vérité aujourd’hui à une personne de confiance, enlève un point d’accès facile et rends les prochaines 24 heures plus sûres.",
    depressionOpening:
      "Cela semble lourd, et je suis désolé que tu portes cela.",
    depressionNext:
      "Rends la prochaine heure plus petite: bois de l’eau, mange quelque chose, sors un moment et dis à une personne sûre ce qui se passe.",
    lonelinessOpening:
      "Ce genre de solitude compte.",
    lonelinessNext:
      "Choisis le contact avant la clarté. Envoie un message, appelle ou reste avec une personne sûre, même sans les mots justes.",
    holinessOpening:
      "Cela ressemble à une question de sainteté et de formation, pas seulement de volonté.",
    holinessNext:
      "Amène ce combat à la lumière avec confession, limites et redevabilité.",
  },
  pt: {
    selfHarmOpening:
      "Fico muito grato por você ter dito isso em voz alta. Se você pode agir sobre pensamentos de autoagressão ou suicídio, pare aqui e busque ajuda humana imediata.",
    selfHarmImmediate:
      "Se você está nos EUA ou no Canadá, ligue ou envie mensagem para 988 agora. Se estiver em outro lugar, contate imediatamente os serviços de emergência locais ou uma linha de crise próxima.",
    selfHarmFollowUp:
      "Procure agora uma pessoa de confiança, não fique sozinho e afaste de você qualquer coisa que possa usar para se machucar.",
    addictionOpening:
      "Isso é uma luta séria, e você não precisa enfrentá-la só com força de vontade.",
    addictionNext:
      "Conte a verdade hoje a uma pessoa de confiança, remova um acesso fácil e torne as próximas 24 horas mais seguras.",
    depressionOpening:
      "Isso soa pesado, e sinto muito que você esteja carregando isso.",
    depressionNext:
      "Reduza a próxima hora: beba água, coma algo, saia um pouco e conte a uma pessoa segura o que está acontecendo.",
    lonelinessOpening:
      "Esse tipo de solidão importa.",
    lonelinessNext:
      "Escolha contato antes de clareza. Envie mensagem, ligue ou fique com uma pessoa segura, mesmo sem as palavras certas.",
    holinessOpening:
      "Isso soa mais como uma pergunta de santidade e formação do que apenas de força de vontade.",
    holinessNext:
      "Traga a luta para a luz com confissão, limites e responsabilidade.",
  },
  de: {
    selfHarmOpening:
      "Es ist gut, dass du das laut gesagt hast. Wenn du diesen Gedanken nachgehen könntest, halte jetzt an und hole sofort menschliche Hilfe.",
    selfHarmImmediate:
      "Wenn du in den USA oder Kanada bist, ruf oder schreibe jetzt 988. Wenn du woanders bist, kontaktiere sofort den örtlichen Notruf oder eine nahe Krisenhilfe.",
    selfHarmFollowUp:
      "Kontaktiere jetzt eine Vertrauensperson, bleib nicht allein und entferne alles aus deiner Nähe, womit du dir schaden könntest.",
    addictionOpening:
      "Das ist ein ernstes Ringen, und du musst es nicht nur mit Willenskraft tragen.",
    addictionNext:
      "Sag heute einer Vertrauensperson die Wahrheit, entferne einen leichten Zugang und sichere die nächsten 24 Stunden besser ab.",
    depressionOpening:
      "Das klingt schwer, und es tut mir leid, dass du das trägst.",
    depressionNext:
      "Mach die nächste Stunde kleiner: trink Wasser, iss etwas, geh kurz nach draußen und sag einer sicheren Person, was los ist.",
    lonelinessOpening:
      "Diese Art von Einsamkeit zählt.",
    lonelinessNext:
      "Wähle zuerst Verbindung, dann Klarheit. Schreib, ruf an oder sei mit einer sicheren Person zusammen, auch ohne die richtigen Worte.",
    holinessOpening:
      "Das klingt eher nach einer Frage von Heiligung und Formung als nur nach Willenskraft.",
    holinessNext:
      "Bring den Kampf mit Bekenntnis, Grenzen und Rechenschaft ans Licht.",
  },
  yo: {
    selfHarmOpening:
      "Ó dáa pé o sọ èyí jáde. Tí o bá lè ṣe ohun tó lè pa ọ lára, dá sílẹ̀ báyìí kí o sì wá ìrànlọ́wọ́ ènìyàn lẹ́sẹ̀kẹsẹ̀.",
    selfHarmImmediate:
      "Tí o bá wà ní U.S. tàbí Canada, pe tàbí ránṣẹ́ sí 988 báyìí. Tí o bá wà níbòmíràn, kan sí ìpè pajawiri agbègbè rẹ tàbí laini ìrànlọ́wọ́ tó sún mọ́ ọ lẹ́sẹ̀kẹsẹ̀.",
    selfHarmFollowUp:
      "Kan sí ẹni tí o lè gbẹ́kẹ̀lé báyìí, má ṣe dúró nikan, kí o sì yọ ohunkóhun tí o lè fi pa ara rẹ lára kúrò nítòsí rẹ.",
    addictionOpening:
      "Ìjà tó lágbára ni èyí, kò sì yẹ kí o koju rẹ pẹ̀lú agbára ìfẹ́ nìkan.",
    addictionNext:
      "Sọ òtítọ́ fún ẹni kan tí o lè gbẹ́kẹ̀lé lónìí, yọ ọ̀nà ìraye kan kúrò, kí o sì jẹ́ kí wákàtí 24 tó ń bọ dáa síi.",
    depressionOpening:
      "Èyí wuwo gan-an, ó sì dùn mí pé o ń rú ẹ̀rù yìí.",
    depressionNext:
      "Dín wákàtí tó ń bọ kù: mu omi, jẹun, jáde díẹ̀, kí o sì sọ fún ẹni tó dáa ohun tó ń ṣẹlẹ̀.",
    lonelinessOpening:
      "Iru ìdádúró yìí ṣe pàtàkì.",
    lonelinessNext:
      "Yan ìbáṣepọ̀ kí o tó yan ìmúlòye. Ránṣẹ́, pe, tàbí jókòó pẹ̀lú ẹni tó dáa, kó tilẹ̀ jẹ́ pé o kò ní ọ̀rọ̀ tó pé.",
    holinessOpening:
      "Èyí dà bí ìbéèrè ìmímọ́ àti ìdàgbàsókè ju ìṣọ̀kan ìfẹ́ lọ.",
    holinessNext:
      "Mú ìjà náà wá sí ìmọ́lẹ̀ pẹ̀lú ìjẹ́wọ́, ààlà, àti ìjẹ́rìí.",
  },
  ig: {
    selfHarmOpening:
      "Ọ dị mma na ị kwuru nke a n’olu. Ọ bụrụ na ị nwere ike ime ihe ga-emebi gị, kwụsị ebe a ma nweta enyemaka mmadụ ozugbo.",
    selfHarmImmediate:
      "Ọ bụrụ na ị nọ na U.S. ma ọ bụ Canada, kpọọ ma ọ bụ zipu 988 ugbu a. Ọ bụrụ na ị nọ ebe ọzọ, kpọtụrụ ọrụ mberede mpaghara ma ọ bụ akara ndụmọdụ mgbapu nso ozugbo.",
    selfHarmFollowUp:
      "Kpọtụrụ onye ị tụkwasịrị obi ugbu a, anọla naanị gị, ma wepụ ihe ọ bụla ị nwere ike iji merụọ onwe gị n’akụkụ gị.",
    addictionOpening:
      "Nke ahụ bụ ọgụ siri ike, ma ị gaghị enwe ike ịlụ ya naanị site n’ike ọchịchọ.",
    addictionNext:
      "Gwa onye ị tụkwasịrị obi eziokwu taa, wepụ otu ụzọ dị mfe iji nweta ihe ahụ, ma mee ka awa 24 sochirinụ dị nchebe.",
    depressionOpening:
      "Nke ahụ na-ebu ibu, ma ọ dị m nwute na ị na-ebu ya.",
    depressionNext:
      "Mee awa sochirinụ ka ọ dị obere: ṅụọ mmiri, rie ihe, pụọ obere, ma gwa onye nchekwa ihe na-eme.",
    lonelinessOpening:
      "Ụdị owu ọmụma ahụ dị mkpa.",
    lonelinessNext:
      "Họrọ njikọ tupu ị họrọ nghọta. Zipu ozi, kpọọ, ma ọ bụ nọrọ na onye nchekwa, ọbụna ma okwu ezughị ezu.",
    holinessOpening:
      "Nke a yiri ajụjụ banyere ịdị nsọ na nhazi ndụ karịa naanị ike ọchịchọ.",
    holinessNext:
      "Weta ọgụ ahụ n’ìhè site na nkwupụta, ókè, na ịza ajụjụ.",
  },
  ha: {
    selfHarmOpening:
      "Na yi kyau ka ka faɗi wannan a fili. Idan kana iya aiwatar da tunanin cutar da kai ko kashe kai, ka tsaya nan ka nemi taimakon mutum nan take.",
    selfHarmImmediate:
      "Idan kana cikin Amurka ko Kanada, ka kira ko ka tura saƙo zuwa 988 yanzu. Idan kana wani wuri dabam, ka tuntubi sabis na gaggawa na yankinka ko layin taimakon rikici kusa nan take.",
    selfHarmFollowUp:
      "Tuntubi wani amintacce yanzu, kada ka zauna kai kaɗai, kuma ka nisantar da kanka daga duk abin da za ka iya amfani da shi don cutar da kanka.",
    addictionOpening:
      "Wannan gwagwarmaya ce mai tsanani, kuma ba sai ka fuskance ta da ƙarfin hali kaɗai ba.",
    addictionNext:
      "Ka gaya wa wani amintacce gaskiya yau, ka cire hanya ɗaya mai sauƙin shiga, ka sa sa’o’i 24 masu zuwa su fi aminci.",
    depressionOpening:
      "Wannan yana da nauyi sosai, kuma na tausaya maka da kake ɗauke da shi.",
    depressionNext:
      "Ka ƙanƙantar da sa’a ta gaba: ka sha ruwa, ka ci wani abu, ka fito ɗan lokaci, ka kuma gaya wa wani amintacce abin da ke faruwa.",
    lonelinessOpening:
      "Irin wannan kaɗaicin yana da muhimmanci.",
    lonelinessNext:
      "Zaɓi haɗuwa kafin haske. Ka aika saƙo, ka kira, ko ka zauna da wani amintacce, ko da ba ka da kalmomin da suka dace.",
    holinessOpening:
      "Wannan ya fi kama da tambayar tsarki da samuwa fiye da ƙarfin hali kaɗai.",
    holinessNext:
      "Ka kawo gwagwarmayar cikin haske ta ikirari, iyaka, da amsa tambaya.",
  },
  tl: {
    selfHarmOpening:
      "Mabuti at sinabi mo ito nang lantad. Kung maaari mong isagawa ang naiisip na pananakit sa sarili o pagpapakamatay, huminto muna at humingi agad ng tulong ng tao.",
    selfHarmImmediate:
      "Kung nasa U.S. o Canada ka, tumawag o mag-text sa 988 ngayon. Kung nasa ibang lugar ka, makipag-ugnayan agad sa lokal na emergency services o sa pinakamalapit na crisis line.",
    selfHarmFollowUp:
      "Kumontak agad sa isang taong mapagkakatiwalaan, huwag munang mag-isa, at ilayo ang anumang puwede mong gamitin para saktan ang sarili mo.",
    addictionOpening:
      "Mabigat na laban ito, at hindi mo kailangang harapin ito sa sariling lakas lang.",
    addictionNext:
      "Sabihin ngayon ang totoo sa isang taong mapagkakatiwalaan, alisin ang isang madaling daanan, at gawing mas ligtas ang susunod na 24 oras.",
    depressionOpening:
      "Mukhang mabigat iyon, at ikinalulungkot kong pasan mo ito.",
    depressionNext:
      "Paliitin ang susunod na oras: uminom ng tubig, kumain ng kahit ano, lumabas sandali, at sabihin sa isang ligtas na tao ang nangyayari.",
    lonelinessOpening:
      "Mahalaga ang ganitong uri ng pag-iisa.",
    lonelinessNext:
      "Piliin muna ang koneksyon bago ang linaw. Mag-text, tumawag, o makisama sa isang ligtas na tao kahit wala ka pang tamang salita.",
    holinessOpening:
      "Mas mukhang tanong ito ng kabanalan at paghubog kaysa simpleng lakas ng loob.",
    holinessNext:
      "Dalhin ang laban sa liwanag sa pamamagitan ng pag-amin, mga hangganan, at pananagutan.",
  },
  ar: {
    selfHarmOpening:
      "من الجيد أنك قلت هذا بصوتٍ عالٍ. إذا كنت قد تُقدِم على إيذاء نفسك أو الانتحار، فتوقف هنا واطلب مساعدة بشرية فورية.",
    selfHarmImmediate:
      "إذا كنت في الولايات المتحدة أو كندا، فاتصل أو أرسل رسالة إلى 988 الآن. وإذا كنت في مكان آخر، فاتصل فورًا بخدمات الطوارئ المحلية أو بخط أزمة قريب.",
    selfHarmFollowUp:
      "تواصل الآن مع شخص تثق به، ولا تبقَ وحدك، وأبعد عنك أي شيء قد تستخدمه لإيذاء نفسك.",
    addictionOpening:
      "هذا صراع جاد، ولا تحتاج إلى مواجهته بالإرادة وحدها.",
    addictionNext:
      "قل الحقيقة اليوم لشخص تثق به، وأزل منفذًا سهلاً واحدًا، واجعل الساعات الأربع والعشرين القادمة أكثر أمانًا.",
    depressionOpening:
      "يبدو هذا ثقيلًا، وأنا آسف لأنك تحمله.",
    depressionNext:
      "صغّر الساعة القادمة: اشرب ماءً، وكل شيئًا، واخرج قليلًا، وأخبر شخصًا آمنًا بما يحدث.",
    lonelinessOpening:
      "هذا النوع من الوحدة مهم.",
    lonelinessNext:
      "اختر الاتصال قبل الوضوح. أرسل رسالة، أو اتصل، أو اجلس مع شخص آمن، حتى إن لم تكن لديك الكلمات المناسبة بعد.",
    holinessOpening:
      "يبدو هذا أقرب إلى سؤال عن القداسة والتكوين منه إلى مسألة إرادة فقط.",
    holinessNext:
      "أخرج الصراع إلى النور بالاعتراف، والحدود، والمساءلة.",
  },
  hi: {
    selfHarmOpening:
      "यह अच्छी बात है कि आपने यह खुलकर कहा। यदि आप आत्म-हानि या आत्महत्या के विचार पर कार्रवाई कर सकते हैं, तो यहीं रुकें और तुरंत किसी इंसान से मदद लें।",
    selfHarmImmediate:
      "यदि आप U.S. या Canada में हैं, तो अभी 988 पर कॉल या टेक्स्ट करें। यदि आप कहीं और हैं, तो तुरंत स्थानीय आपातकालीन सेवाओं या पास की संकट-रेखा से संपर्क करें।",
    selfHarmFollowUp:
      "अभी किसी भरोसेमंद व्यक्ति से संपर्क करें, अकेले न रहें, और अपने आस-पास की कोई भी चीज़ हटा दें जिससे आप स्वयं को नुकसान पहुँचा सकते हों।",
    addictionOpening:
      "यह एक गंभीर संघर्ष है, और आपको इसे केवल इच्छाशक्ति के सहारे नहीं झेलना चाहिए।",
    addictionNext:
      "आज ही किसी भरोसेमंद व्यक्ति को सच्चाई बताइए, एक आसान पहुँच हटाइए, और अगले 24 घंटों को अधिक सुरक्षित बनाइए।",
    depressionOpening:
      "यह बहुत भारी लगता है, और मुझे दुख है कि आप इसे ढो रहे हैं।",
    depressionNext:
      "अगले घंटे को छोटा करें: पानी पिएँ, कुछ खाएँ, थोड़ी देर बाहर जाएँ, और किसी सुरक्षित व्यक्ति को बताइए कि क्या हो रहा है।",
    lonelinessOpening:
      "ऐसी अकेलापन बहुत मायने रखती है।",
    lonelinessNext:
      "स्पष्टता से पहले संपर्क चुनिए। संदेश भेजिए, कॉल कीजिए, या किसी सुरक्षित व्यक्ति के साथ बैठिए, भले ही अभी सही शब्द न हों।",
    holinessOpening:
      "यह केवल इच्छाशक्ति नहीं, बल्कि पवित्रता और गठन का प्रश्न लगता है।",
    holinessNext:
      "स्वीकारोक्ति, सीमाओं, और जवाबदेही के साथ इस संघर्ष को प्रकाश में लाइए.",
  },
};

export function localizedCrisisSupportCopy(language: LanguageCode) {
  return crisisSupportCopy[language] ?? crisisSupportCopy.en!;
}

export const localizedDailyPractices: Partial<Record<LanguageCode, Partial<Record<Mode, string>>>> = {
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
  tl: {
    Money: "Ngayon, huwag lang humabol sa mas marami. Tukuyin kung ano ang sapat.",
    Work: "Ngayon, piliin ang susunod na tapat na hakbang bago habulin ang kahanga-hanga.",
    Purpose: "Ngayon, hayaang ang kapayapaan ang magtakda ng bilis ng paghatol.",
    Generosity: "Ngayon, magbigay mula sa paninindigan, hindi sa pagkakasala.",
    Life: "Ngayon, pumili ng isang pangkaraniwang gawi na magpapatatag sa natitirang bahagi ng buhay.",
  },
  ar: {
    Money: "اليوم، لا تسعَ وراء المزيد فقط. حدّد ما يكفي.",
    Work: "اليوم، اختر الخطوة الأمينة التالية قبل ملاحقة المثير للإعجاب.",
    Purpose: "اليوم، دع السلام يحدد إيقاع التمييز.",
    Generosity: "اليوم، أعطِ عن قناعة، لا عن ذنب.",
    Life: "اليوم، اختر عادة بسيطة تجعل بقية الحياة أكثر ثباتًا.",
  },
  hi: {
    Money: "आज, अधिक के पीछे मत भागिए। पर्याप्त क्या है, उसे तय करें।",
    Work: "आज, प्रभावशाली कदम से पहले अगला निष्ठावान कदम चुनें।",
    Purpose: "आज, शांति को विवेक की गति तय करने दें।",
    Generosity: "आज, अपराधबोध नहीं, बल्कि दृढ़ विश्वास से दें।",
    Life: "आज, एक साधारण आदत चुनें जो जीवन के बाकी हिस्से को अधिक स्थिर बनाए।",
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
    Recovery: "Recuperación",
    Confession: "Confesión",
    Purity: "Pureza",
    Freedom: "Libertad",
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
    Recovery: "Restauration",
    Confession: "Confession",
    Purity: "Pureté",
    Freedom: "Liberté",
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
    Recovery: "Restauração",
    Confession: "Confissão",
    Purity: "Pureza",
    Freedom: "Liberdade",
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
    Recovery: "Ìmúpadàbọ̀sípò",
    Confession: "Ìjẹ́wọ́",
    Purity: "Mímọ́",
    Freedom: "Òmìnira",
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
    Recovery: "Wiederherstellung",
    Confession: "Bekenntnis",
    Purity: "Reinheit",
    Freedom: "Freiheit",
  },
  ig: {
    Stewardship: "Nlekọta",
    Debt: "Ụgwọ",
    Contentment: "Afọ ojuju",
    Counsel: "Ndụmọdụ",
    "Cost Counting": "Ịgụ ụgwọ",
    Generosity: "Mmesapụ aka",
    Diligence: "Ịrụsi ọrụ ike",
    "Provision and Anxiety": "Nlekọta na nchegbu",
    Recovery: "Nlaghachi",
    Confession: "Nkwupụta",
    Purity: "Ịdị ọcha",
    Freedom: "Nnwere onwe",
  },
  ha: {
    Stewardship: "Kula",
    Debt: "Bashi",
    Contentment: "Gamsuwa",
    Counsel: "Shawara",
    "Cost Counting": "Lissafin kuɗi",
    Generosity: "Karimci",
    Diligence: "Naci",
    "Provision and Anxiety": "Tanadi da damuwa",
    Recovery: "Warkewa",
    Confession: "Iƙirari",
    Purity: "Tsabta",
    Freedom: "'Yanci",
  },
  tl: {
    Stewardship: "Pangangasiwa",
    Debt: "Utang",
    Contentment: "Kuntento",
    Counsel: "Payo",
    "Cost Counting": "Pagtataya ng gastos",
    Generosity: "Pagkamapagbigay",
    Diligence: "Kasipagan",
    "Provision and Anxiety": "Paglalaan at pag-aalala",
    Recovery: "Pagbangon",
    Confession: "Pag-amin",
    Purity: "Kadalisayan",
    Freedom: "Kalayaan",
  },
  ar: {
    Stewardship: "الأمانة في التدبير",
    Debt: "الدَّين",
    Contentment: "القناعة",
    Counsel: "المشورة",
    "Cost Counting": "حساب الكلفة",
    Generosity: "الكرم",
    Diligence: "المثابرة",
    "Provision and Anxiety": "الرزق والقلق",
    Recovery: "الشفاء",
    Confession: "الاعتراف",
    Purity: "الطهارة",
    Freedom: "الحرية",
  },
  hi: {
    Stewardship: "अमानत की देखभाल",
    Debt: "कर्ज़",
    Contentment: "संतोष",
    Counsel: "सलाह",
    "Cost Counting": "लागत का आकलन",
    Generosity: "उदारता",
    Diligence: "परिश्रम",
    "Provision and Anxiety": "प्रावधान और चिंता",
    Recovery: "पुनर्स्थापन",
    Confession: "स्वीकारोक्ति",
    Purity: "पवित्रता",
    Freedom: "स्वतंत्रता",
  },
};

const localizedScriptureFallbackText: Partial<Record<LanguageCode, string>> = {
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
  tl: { global: "Pandaigdig", us: "Estados Unidos", uk: "United Kingdom", eu: "Europa", ng: "Nigeria", br: "Brazil", latam: "Latin America", ph: "Pilipinas", mena: "Gitnang Silangan at Hilagang Aprika", in: "India" },
  ar: { global: "عالمي", us: "الولايات المتحدة", uk: "المملكة المتحدة", eu: "أوروبا", ng: "نيجيريا", br: "البرازيل", latam: "أمريكا اللاتينية", ph: "الفلبين", mena: "الشرق الأوسط وشمال أفريقيا", in: "الهند" },
  hi: { global: "वैश्विक", us: "संयुक्त राज्य", uk: "यूनाइटेड किंगडम", eu: "यूरोप", ng: "नाइजीरिया", br: "ब्राज़ील", latam: "लैटिन अमेरिका", ph: "फिलीपींस", mena: "मध्य पूर्व व उत्तरी अफ्रीका", in: "भारत" },
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
      intent: "Apply biblical wisdom to ordinary life, formation, and care with steady, grounded attention.",
      focus: "Habits, relationships, family, rest, health, recovery, holiness, loneliness",
      useWhen:
        "Use for everyday life decisions, routines, relationships, habits, rest, conflict, loneliness, addiction, temptation, prayer life, or when the right next step is a quiet act of obedience rather than a major decision.",
      lens: "A formation lens: character, healing, accountability, relationships, and the next faithful step.",
      diagnosticTracks: [
        "Character: what is this habit training you to love, tolerate, or hide?",
        "Care: who should know, especially if you feel stuck, isolated, or at risk?",
        "Rhythm: does this pattern create rest, honesty, and repair, or does it erode them?",
        "Holiness: what would faithful repentance, boundaries, or confession look like today?",
      ],
      blindSpots: [
        "Treating addiction, depression, or loneliness as a private problem you must outlast alone",
        "Confusing guilt, shame, and conviction",
        "Calling spiritual intensity holiness while ignoring body, sleep, and accountability",
        "Letting secrecy protect the very habit that is harming you",
      ],
      maturitySignals: [
        "The next step is small, concrete, and shared with a safe person when needed",
        "The plan makes room for prayer, rest, and honest accountability",
        "Compassion and truth are both present",
        "The pattern becomes more honest, not more hidden",
      ],
      practices: [
        "Tell one trusted person the truth if secrecy is keeping the struggle alive",
        "Remove one easy access point to the habit or trigger today",
        "Choose one ordinary act of care: sleep, food, water, a walk, shower, prayer",
        "Write the next 24 hours rather than the next year",
      ],
      responseMoves: [
        "Slow the pace and reduce shame",
        "Distinguish temptation, compulsion, grief, and isolation",
        "Push the counsel toward concrete support, not abstract ideals",
        "Encourage confession, accountability, and professional or pastoral help when needed",
      ],
      promptCue:
        "In Life mode, emphasize ordinary biblical wisdom for family, relationships, habits, rest, conflict, home rhythms, health, recovery, loneliness, addiction, holiness, temptation, and the next faithful small step. Be especially gentle, concrete, and non-shaming. If self-harm, suicide, overdose, abuse, or immediate danger is hinted, stop normal counsel and shift to urgent human support and simple safety steps.",
      prompts: [
        "How do I stay faithful in a hard season?",
        "What do I do when I feel stuck in an unhealthy pattern?",
        "How do I respond when loneliness or temptation gets heavy?",
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
  tl: {
    Money: {
      intent: "Pamahalaan ang mga pinagkakatiwalaang yaman nang may kapayapaan at linaw.",
      focus: "Badyet, utang, pag-iipon, pag-iinvest, kasiyahan",
      useWhen: "Gamitin para sa paggastos, utang, pag-iipon, pag-iinvest, pinansyal na pag-aalala, o paghahambing.",
      lens: "Isang lente ng pangangasiwa: kalayaan, sapat, pagtitiis, panganib, at tapat na pananagutan.",
      diagnosticTracks: [
        "Kalayaan: dadami ba o mababawasan ang matalinong pagpipilian sa bandang huli?",
        "Sapat: malinaw ba ang hangarin, o paghahambing ang nagtatakda ng target?",
        "Panganib: ano ang puwedeng masira, at nasukat ko ba nang maayos ang halaga nito?",
      ],
      blindSpots: [
        "Pagkalito sa pagitan ng pananampalataya at pinansyal na katiyakan",
        "Pagkakamaling ituring ang pressure sa lifestyle bilang pangangailangan",
        "Pagtingin sa kakayahang mangutang bilang pahintulot",
      ],
      maturitySignals: [
        "May saysay pa rin ang plano matapos maghintay",
        "Nakikita ang mga numero, hindi malabo",
        "Nahirap ang mga palagay sa pamamagitan ng payo",
      ],
      practices: [
        "Tukuyin kung ano ang sapat para sa panahong ito",
        "Isulat nang malinaw ang plano sa pagbabayad, pag-iipon, o pagbibigay",
        "Maghintay muna ng isang gabi bago gumastos nang hindi na mababalik",
      ],
      responseMoves: [
        "Ihiwalay ang hangarin, takot, at pananagutan",
        "Linawin ang mga tradeoff nang hindi pinapahiya ang user",
        "Iugnay ang Kasulatan sa konkretong gawi ng pangangasiwa",
      ],
      promptCue:
        "Sa Money mode, bigyang-diin ang pangangasiwa, kasiyahan, pag-iingat sa utang, matalinong panganib, pangmatagalang pananagutan, pagkamapagbigay, at emosyonal na pag-regulate sa pera. Iwasan ang payo sa pag-iinvest o pangakong resulta.",
      prompts: [
        "Paano ako bubuo ng yaman nang hindi nagiging sakim?",
        "Ano ang sinasabi ng karunungan tungkol sa utang?",
        "Paano ko mapipigilan ang paghahambing ko sa pera?",
      ],
    },
    Work: {
      intent: "Tuklasin ang trabaho, tawag, pamumuno, at pangmatagalang ambisyon.",
      focus: "Paglipat ng karera, pamumuno, negosyo, pagkapagod, bokasyon",
      useWhen: "Gamitin para sa mga desisyon sa trabaho, ideya sa negosyo, pressure sa pamumuno, pagkapagod, o ambisyon.",
      lens: "Isang lente ng bokasyon: kasipagan, payo, pagbibilang ng halaga, paglilingkod, at napapanatiling bilis.",
      diagnosticTracks: [
        "Tawag: anong uri ng paglilingkod o responsibilidad ang nililinaw?",
        "Kapasidad: may espasyo ba ang buhay ng user para sa pangakong ito?",
        "Payo: sino ang puwedeng sumubok sa plano nang hindi ito kinokontrol?",
      ],
      blindSpots: [
        "Pagkakamaling tawagin ang pagkabalisa na tawag",
        "Paggamit ng espiritwal na wika para iwasan ang pagpaplano",
        "Pagkalito sa palakpakan at bunga",
      ],
      maturitySignals: [
        "Kayang pangalanan ng user ang tradeoffs nang tapat",
        "May susunod na eksperimentong puwedeng ibalik",
        "Nakikita ng payong matalino ang numero at motibo",
      ],
      practices: [
        "Tukuyin ang pinakamaliit na hakbang na puwedeng ibalik",
        "Isulat ang totoong halaga sa oras, pera, at atensyon",
        "Tanungin ang kritiko kung aling bahagi ng plano ang marupok",
      ],
      responseMoves: [
        "Ihiwalay ang tawag, ambisyon, pagtakas, at pagkapagod",
        "Ibinababa ang desisyon sa susunod na tapat na eksperimento",
        "Gamitin ang payo at pagbibilang ng halaga bilang pampatatag",
      ],
      promptCue:
        "Sa Work mode, bigyang-diin ang bokasyon, kasipagan, matalinong payo, karakter ng pamumuno, pagbibilang ng halaga, napapanatiling ambisyon, at paglilingkod. Tulungan ang user na siyasatin ang motibo at tradeoff bago ang malalaking desisyon sa trabaho.",
      prompts: [
        "Dapat ko bang iwan ang matatag kong trabaho?",
        "Paano ko malalaman kung malusog ang ambisyon ko?",
        "Dapat ko na bang simulan ang negosyong ito ngayon?",
      ],
    },
    Purpose: {
      intent: "Bagalan at siyasatin ang taong hinuhubog ng desisyong ito.",
      focus: "Pagkakakilanlan, direksyon, pagkabalisa, mga halaga, pangmatagalang linaw",
      useWhen: "Gamitin kapag ang tunay na tanong ay pagkakakilanlan, direksyon, kapayapaan, panahon, o mga halaga.",
      lens: "Isang lente ng pagdiscern: pagkakakilanlan, kapayapaan, motibo, pagtitiis, at susunod na tapat na hakbang.",
      diagnosticTracks: [
        "Pagkakakilanlan: ano ang sinusubukang patunayan, protektahan, o maging ng user?",
        "Kapayapaan: ano ang nagbabago kapag humupa ang pagkaapurahan?",
        "Motibo: alin ang mabuting hangarin, at alin ang nabaluktot?",
      ],
      blindSpots: [
        "Paghihintay ng perpektong katiyakan bago sumunod nang tapat",
        "Pagtingin sa pagkabalisa bilang discernment",
        "Pagpapahintulot sa tagumpay na magtakda ng identidad",
      ],
      maturitySignals: [
        "Malinaw ang susunod na hakbang kahit hindi pa ang buong daan",
        "Kayang pangalanan ng user ang motibo nang walang sariling pagkondena",
        "Kayang dalhin ang desisyon nang may pagtitiis",
      ],
      practices: [
        "Pangalanan ang takot sa ilalim ng desisyon",
        "Sumulat ng isang pangungusap tungkol sa taong hinuhubog ng pagpiling ito",
        "Piliin ang susunod na tapat na hakbang para sa susunod na 24 oras",
      ],
      responseMoves: [
        "Bawasan ang pagkaapurahan at ibalik ang kakayahang kumilos",
        "Ihiwalay ang pagkakakilanlan sa resulta",
        "Anyayahan ang tapat na pagsusuri ng motibo nang walang hiya",
      ],
      promptCue:
        "Sa Purpose mode, bigyang-diin ang discernment, pagkakakilanlan, motibo, kapayapaan, pagtitiis, mga halaga, mapanalanging pagninilay, at susunod na tapat na hakbang. Panatilihing nakaugat at hindi mistikal ang gabay; huwag mag-angkin ng banal na katiyakan.",
      prompts: [
        "Paano ako magpapasya kapag malabo ang lahat?",
        "Paano kung hinahabol ko ang tagumpay sa maling dahilan?",
        "Paano ako makakahanap ng kapayapaan tungkol sa susunod kong hakbang?",
      ],
    },
    Generosity: {
      intent: "Magbigay nang malaya, walang hiya, pressure, o pagpapakitang-tao.",
      focus: "Pagbibigay, suporta sa pamilya, kawanggawa, hangganan, pagpapanatili",
      useWhen: "Gamitin para sa pagbibigay, pagtiti, pagtulong sa pamilya, hangganan, o napapanatiling pagkamapagbigay.",
      lens: "Isang lente ng pagkamapagbigay: bukas na loob, pagpapanatili, kagalakan, karunungan, at pag-ibig na walang pamimilit.",
      diagnosticTracks: [
        "Kalayaan: kusang loob ba ang regalo, o pinapatakbo ng hiya at takot?",
        "Pagpapanatili: makakapagpatuloy ba ito nang walang nakatagong hinanakit?",
        "Karunungan: ang pagtulong ba rito ay nagpapalakas ng pananagutan o nagpapahintulot ng pinsala?",
      ],
      blindSpots: [
        "Pagpapanggap na pagkamapagbigay ang hiya",
        "Pagbibigay sa publiko para magmukhang espiritwal",
        "Pagsagip sa iba mula sa mga kahihinatnang kailangan nilang harapin",
      ],
      maturitySignals: [
        "Malaya ang regalo, hindi pinilit",
        "Malinaw at mabait ang mga hangganan",
        "Napapanatili ang plano sa pagbibigay",
      ],
      practices: [
        "Magpasya sa regalo bago ang sandali ng pressure",
        "Itakda ang hangganan sa pagbibigay sa malinaw na salita",
        "Tanungin kung pera ba talaga ang pinakamainam na tulong",
      ],
      responseMoves: [
        "Alisin ang hiya at pressure sa gitna",
        "Protektahan ang masayang pagkamapagbigay at matalinong hangganan",
        "Tanungin kung nakakatulong o nagpapahintulot ng problema ang regalo",
      ],
      promptCue:
        "Sa Generosity mode, bigyang-diin ang masayang bukas na loob, pagpapanatili, hangganan, walang pamimilit, habag, at responsableng pagbibigay. Tanggihan ang pagbibigay na inuudyok ng hiya o pagpapakita.",
      prompts: [
        "Paano ako magbibigay nang walang hiya o pressure?",
        "Dapat ko pa bang tulungan ang pamilya ko sa pera?",
        "Gaano karaming pagkamapagbigay ang kaya kong panindigan?",
      ],
    },
    Life: {
      intent: "Ilapat ang karunungang biblikal sa pang-araw-araw na buhay nang may mahinahong atensyon.",
      focus: "Gawi, relasyon, pamilya, pahinga, kalusugan, ritmo ng tahanan",
      useWhen: "Gamitin para sa pang-araw-araw na desisyon, rutina, relasyon, gawi, pahinga, alitan, o kapag hindi malinaw na pera o trabaho ang susunod na hakbang.",
      lens: "Isang lente ng buong buhay: karakter, relasyon, pananagutan, ritmo, at susunod na tapat na hakbang.",
      diagnosticTracks: [
        "Karakter: anong uri ng tao ang hinuhubog ng gawi o pagpiling ito?",
        "Relasyon: sino ang naaapektuhan at paano ko sila mamahalin nang mabuti?",
        "Ritmo: lumilikha ba ito ng espasyo para sa pahinga, atensyon, at pag-aayos?",
      ],
      blindSpots: [
        "Pagturing sa karaniwang desisyon bilang walang espiritwal na halaga",
        "Sobrang pag-spiritualize sa nangangailangan ng praktikal na karunungan",
        "Hindi pinapansin ang katawan, pamilya, o pahinga habang hinahabol ang kahulugan",
      ],
      maturitySignals: [
        "Ang desisyon ay tumutugma sa malusog na ritmo, hindi lang sa ambisyon",
        "Ang mga taong pinakamalapit sa pagbabago ay isinasaalang-alang nang maayos",
        "Madaling sundin ang susunod na hakbang",
      ],
      practices: [
        "Pangalanan ang pinakamaliit na tapat na gawi na puwede mong ulitin",
        "Suriin kung pinalalakas o pinapahina ng pagpiling ito ang mga relasyon",
        "Protektahan ang ritmo ng pahinga bago magdagdag ng pressure",
      ],
      responseMoves: [
        "Ibaba ang tanong mula sa abstraksyon tungo sa araw-araw na buhay",
        "Ikonekta ang karunungan sa gawi, relasyon, at realidad ng tahanan",
        "Panatilihing konkret at napapanatili ang susunod na hakbang",
      ],
      promptCue:
        "Sa Life mode, bigyang-diin ang araw-araw na karunungang biblikal para sa pamilya, relasyon, gawi, pahinga, alitan, ritmo ng tahanan, kalusugan, at ang maliit na susunod na tapat na hakbang. Panatilihing praktikal, malinaw, at mahinahon ang gabay.",
      prompts: [
        "Paano ko gagawing mas marunong ang araw-araw kong buhay?",
        "Paano ko dapat tingnan ang relasyong ito?",
        "Aling gawi ang dapat kong baguhin muna?",
      ],
    },
  },
  ar: {
    Money: {
      intent: "أدر الموارد الموكولة إليك بسلام ووضوح.",
      focus: "الميزانية، الدَّين، الادخار، الاستثمار، القناعة",
      useWhen: "استخدمه للإنفاق أو الدَّين أو الادخار أو الاستثمار أو القلق المالي أو المقارنة.",
      lens: "منظور الأمانة في التدبير: الحرية، الكفاية، الصبر، المخاطرة، والمسؤولية الأمينة.",
      diagnosticTracks: [
        "الحرية: هل يزيد هذا الاختيار الخيارات الحكيمة لاحقًا أم يقللها؟",
        "الكفاية: هل الرغبة واضحة أم أن المقارنة هي التي تحدد الهدف؟",
        "المخاطرة: ما الذي قد يسوء، وهل حسبت الكلفة بواقعية؟",
      ],
      blindSpots: [
        "الخلط بين الإيمان واليقين المالي",
        "اعتبار ضغط نمط الحياة حاجة",
        "التعامل مع القدرة على الاستدانة كأنها إذن",
      ],
      maturitySignals: [
        "ما يزال الخُطّة منطقية بعد الانتظار",
        "الأرقام واضحة وليست ضبابية",
        "اختبرها المشورة ونقحت الفرضيات",
      ],
      practices: [
        "سمِّ ما يكفي لهذه المرحلة",
        "اكتب خطة السداد أو الادخار أو العطاء بوضوح",
        "انتظر ليلة قبل أي إنفاق غير قابل للرجوع",
      ],
      responseMoves: [
        "افصل الرغبة والخوف والمسؤولية",
        "وضح المقايضات من دون أن تخجل المستخدم",
        "حوّل الكتاب المقدس إلى عادات أمانة عملية",
      ],
      promptCue:
        "في Money mode، ركّز على الأمانة في التدبير، القناعة، الحذر من الدَّين، المخاطرة الحكيمة، المسؤولية الطويلة الأمد، الكرم، والتنظيم العاطفي حول المال. تجنب نصائح الاستثمار أو وعود النتائج.",
      prompts: [
        "كيف أبني ثروة من دون جشع؟",
        "ماذا تقول الحكمة عن الدَّين؟",
        "كيف أتوقف عن مقارنة نفسي ماليًا؟",
      ],
    },
    Work: {
      intent: "ميّز العمل والدعوة والقيادة والطموح المستدام.",
      focus: "تغييرات الوظيفة، القيادة، الأعمال، الإرهاق، الدعوة",
      useWhen: "استخدمه لقرارات العمل أو أفكار المشاريع أو ضغط القيادة أو الإرهاق أو الطموح.",
      lens: "منظور الدعوة: الاجتهاد، المشورة، حساب الكلفة، الخدمة، والإيقاع المستدام.",
      diagnosticTracks: [
        "الدعوة: أي نوع من الخدمة أو المسؤولية يتضح هنا؟",
        "القدرة: هل لدى حياة المستخدم مساحة لهذا الالتزام؟",
        "المشورة: من يمكنه اختبار الخطة من دون التحكم فيها؟",
      ],
      blindSpots: [
        "الخلط بين الاضطراب والدعوة",
        "استخدام لغة روحية لتجنب التخطيط",
        "الخلط بين التصفيق والثمر",
      ],
      maturitySignals: [
        "يستطيع المستخدم تسمية المقايضات بصدق",
        "هناك تجربة تالية قابلة للرجوع",
        "رأت المشورة الحكيمة الأرقام والدوافع",
      ],
      practices: [
        "حدد أصغر خطوة قابلة للرجوع",
        "اكتب الكلفة الحقيقية من وقت ومال وانتباه",
        "اسأل ناقدًا: أي جزء من الخطة هش؟",
      ],
      responseMoves: [
        "ميّز بين الدعوة والطموح والهروب والإرهاق",
        "انقل القرار إلى التجربة الأمينة التالية",
        "استخدم المشورة وحساب الكلفة كعوامل تثبيت",
      ],
      promptCue:
        "في Work mode، ركّز على الدعوة، الاجتهاد، المشورة الحكيمة، شخصية القيادة، حساب الكلفة، الطموح المستدام، والخدمة. ساعد المستخدم على فحص الدوافع والمقايضات قبل قرارات العمل الكبرى.",
      prompts: [
        "هل أترك عملي المستقر؟",
        "كيف أعرف إن كان طموحي صحيًا؟",
        "هل أبدأ هذا المشروع الآن؟",
      ],
    },
    Purpose: {
      intent: "أبطئ وميّز الشخص الذي يشكله هذا القرار.",
      focus: "الهوية، الاتجاه، القلق، القيم، الوضوح بعيد المدى",
      useWhen: "استخدمه عندما يكون السؤال الحقيقي عن الهوية أو الاتجاه أو السلام أو التوقيت أو القيم.",
      lens: "منظور التمييز: الهوية، السلام، الدوافع، الصبر، والخطوة الأمينة التالية.",
      diagnosticTracks: [
        "الهوية: ما الذي يحاول المستخدم إثباته أو حمايته أو أن يصير إليه؟",
        "السلام: ماذا يتغير عندما يهدأ الاستعجال؟",
        "الدوافع: أي الرغبات صالحة، وأيها مشوَّه؟",
      ],
      blindSpots: [
        "الانتظار حتى اليقين الكامل قبل الطاعة الأمينة",
        "اعتبار القلق تمييزًا",
        "السماح للنجاح بأن يعرّف الهوية",
      ],
      maturitySignals: [
        "الخطوة التالية واضحة حتى لو لم يكن الطريق كله واضحًا",
        "يستطيع المستخدم تسمية دوافعه من دون إدانة الذات",
        "يمكن حمل القرار بصبر",
      ],
      practices: [
        "سمِّ الخوف الكامن تحت القرار",
        "اكتب جملة عن الشخص الذي يشكله هذا الاختيار",
        "اختر الخطوة الأمينة التالية للـ 24 ساعة القادمة",
      ],
      responseMoves: [
        "خفف الاستعجال وأعد الوكالة",
        "افصل الهوية عن النتيجة",
        "ادعُ إلى فحص صادق للدوافع من دون خجل",
      ],
      promptCue:
        "في Purpose mode، ركّز على التمييز، الهوية، الدوافع، السلام، الصبر، القيم، التأمل المصلي، والخطوة الأمينة التالية. اجعل الإرشاد واقعيًا وغير غيبي؛ لا تدّعِ يقينًا إلهيًا.",
      prompts: [
        "كيف أقرر عندما أشعر أن الأمور غير واضحة؟",
        "ماذا لو كنت ألاحق النجاح لأسباب خاطئة؟",
        "كيف أجد السلام بشأن خطوتي التالية؟",
      ],
    },
    Generosity: {
      intent: "أعطِ بحرية من دون ذنب أو ضغط أو استعراض.",
      focus: "العطاء، دعم العائلة، الصدقة، الحدود، الاستدامة",
      useWhen: "استخدمه للعطاء أو العُشر أو مساعدة العائلة أو الحدود أو الكرم المستدام.",
      lens: "منظور الكرم: الاستعداد، الاستدامة، الفرح، الحكمة، والمحبة من دون إكراه.",
      diagnosticTracks: [
        "الحرية: هل الهدية طوعية أم تقودها مشاعر الذنب والخوف؟",
        "الاستدامة: هل يمكن لهذا الكرم أن يستمر من دون ضيق مكتوم؟",
        "الحكمة: هل المساعدة هنا تقوي المسؤولية أم تتيح الضرر؟",
      ],
      blindSpots: [
        "تسمية الذنب كرمًا",
        "العطاء أمام الناس لتبدو روحيًا",
        "إنقاذ الآخرين من العواقب التي يحتاجون أن يواجهوها",
      ],
      maturitySignals: [
        "الهدية حرة لا مفروضة",
        "الحدود واضحة ولطيفة",
        "خطة العطاء مستدامة",
      ],
      practices: [
        "قرر الهدية قبل لحظة الضغط",
        "ضع حدود العطاء بكلمات واضحة",
        "اسأل إن كان المال هو أفضل شكل للمساعدة",
      ],
      responseMoves: [
        "أزل الذنب والضغط من المركز",
        "احمِ الكرم الفَرِح والحدود الحكيمة",
        "اسأل إن كانت الهدية تساعد أم تمكّن المشكلة",
      ],
      promptCue:
        "في Generosity mode، ركّز على الاستعداد الفَرِح، الاستدامة، الحدود، عدم الإكراه، الرحمة، والعطاء المسؤول. ارفض العطاء المحرك بالذنب أو الاستعراض.",
      prompts: [
        "كيف أعطي من دون ذنب أو ضغط؟",
        "هل يجب أن أساعد عائلتي ماليًا مرة أخرى؟",
        "كم من الكرم يمكنني الاستمرار عليه؟",
      ],
    },
    Life: {
      intent: "طبّق الحكمة الكتابية على الحياة اليومية بانتباه هادئ.",
      focus: "العادات، العلاقات، العائلة، الراحة، الصحة، إيقاع البيت",
      useWhen: "استخدمه لقرارات الحياة اليومية، والروتين، والعلاقات، والعادات، والراحة، والخلاف، أو عندما لا يكون التالي واضحًا كمالٍ أو عمل.",
      lens: "منظور الحياة الكاملة: الشخصية، العلاقات، المسؤوليات، الإيقاع، والخطوة الأمينة التالية.",
      diagnosticTracks: [
        "الشخصية: أي نوع من الناس يشكله هذا العُرف أو القرار؟",
        "العلاقات: من يتأثر وكيف أحب جيدًا؟",
        "الإيقاع: هل يخلق مساحة للراحة والانتباه والإصلاح؟",
      ],
      blindSpots: [
        "اعتبار القرارات العادية بلا أهمية روحية",
        "المبالغة في الروحانية لما يحتاج حكمة عملية",
        "تجاهل الجسد أو العائلة أو الراحة أثناء السعي للمعنى",
      ],
      maturitySignals: [
        "يتوافق القرار مع إيقاع صحي، لا مع الطموح فقط",
        "يؤخذ الأقربون من التغيير بعناية",
        "الخطوة التالية سهلة الطاعة",
      ],
      practices: [
        "سمِّ أصغر عادة أمينة يمكنك تكرارها",
        "تحقق إن كان هذا الاختيار يقوي العلاقات أو يضعفها",
        "احمِ إيقاع الراحة قبل إضافة الضغط",
      ],
      responseMoves: [
        "أنزل السؤال من التجريد إلى الحياة اليومية",
        "صل الحكمة بالعادات والعلاقات وواقع البيت",
        "اجعل الخطوة التالية ملموسة ومستدامة",
      ],
      promptCue:
        "في Life mode، ركّز على الحكمة الكتابية اليومية للأسرة والعلاقات والعادات والراحة والخلاف وإيقاع البيت والصحة والخطوة الصغيرة الأمينة التالية. اجعل الإرشاد عمليًا وواضحًا ولطيفًا.",
      prompts: [
        "كيف أجعل حياتي اليومية أكثر حكمة؟",
        "كيف ينبغي أن أفكر في هذه العلاقة؟",
        "أي عادة يجب أن أغيّرها أولًا؟",
      ],
    },
  },
  hi: {
    Money: {
      intent: "सौंपे गए संसाधनों को शांति और स्पष्टता से सँभालें।",
      focus: "बजट, कर्ज़, बचत, निवेश, संतोष",
      useWhen: "खर्च, कर्ज़, बचत, निवेश, वित्तीय चिंता, या तुलना के लिए उपयोग करें।",
      lens: "अमानत की देखभाल का दृष्टिकोण: स्वतंत्रता, पर्याप्तता, धैर्य, जोखिम, और निष्ठावान ज़िम्मेदारी।",
      diagnosticTracks: [
        "स्वतंत्रता: क्या यह चुनाव आगे चलकर बुद्धिमान विकल्पों को बढ़ाएगा या घटाएगा?",
        "पर्याप्तता: क्या इच्छा स्पष्ट है, या तुलना लक्ष्य तय कर रही है?",
        "जोखिम: क्या बिगड़ सकता है, और क्या मैंने उसकी लागत गंभीरता से आँकी है?",
      ],
      blindSpots: [
        "विश्वास को वित्तीय निश्चितता समझ लेना",
        "जीवन-शैली के दबाव को ज़रूरत कहना",
        "कर्ज़ लेने की क्षमता को अनुमति मान लेना",
      ],
      maturitySignals: [
        "इंतज़ार के बाद भी योजना अर्थपूर्ण लगती है",
        "संख्याएँ स्पष्ट हैं, धुँधली नहीं",
        "सलाह ने धारणाओं को चुनौती दी है",
      ],
      practices: [
        "इस मौसम के लिए पर्याप्त क्या है, उसे नाम दीजिए",
        "चुकौती, बचत, या दान की योजना स्पष्ट लिखिए",
        "अपरिवर्तनीय खर्च से पहले एक रात रुकिए",
      ],
      responseMoves: [
        "इच्छा, भय, और ज़िम्मेदारी को अलग कीजिए",
        "उपयोगकर्ता को शर्मिंदा किए बिना tradeoffs स्पष्ट कीजिए",
        "शास्त्र को ठोस stewardship habits में बदलिए",
      ],
      promptCue:
        "Money mode में stewardship, संतोष, कर्ज़-चेतावनी, बुद्धिमान जोखिम, दीर्घकालिक ज़िम्मेदारी, उदारता, और पैसे के साथ भावनात्मक संतुलन पर ज़ोर दें। निवेश सलाह या परिणाम के वादे न दें।",
      prompts: [
        "मैं लालच के बिना संपत्ति कैसे बनाऊँ?",
        "कर्ज़ के बारे में बुद्धि क्या कहती है?",
        "मैं पैसे के मामले में तुलना करना कैसे बंद करूँ?",
      ],
    },
    Work: {
      intent: "काम, बुलाहट, नेतृत्व, और टिकाऊ महत्वाकांक्षा का विवेक करें।",
      focus: "करियर बदलाव, नेतृत्व, व्यवसाय, थकान, बुलाहट",
      useWhen: "नौकरी, व्यवसाय, नेतृत्व दबाव, थकान, या महत्वाकांक्षा से जुड़े निर्णयों के लिए उपयोग करें।",
      lens: "बुलाहट का दृष्टिकोण: परिश्रम, सलाह, लागत-गणना, सेवा, और टिकाऊ गति।",
      diagnosticTracks: [
        "बुलाहट: किस प्रकार की सेवा या ज़िम्मेदारी स्पष्ट हो रही है?",
        "क्षमता: क्या जीवन में इस प्रतिबद्धता के लिए जगह है?",
        "सलाह: कौन योजना को नियंत्रित किए बिना परख सकता है?",
      ],
      blindSpots: [
        "बेचैनी को बुलाहट समझ लेना",
        "योजना से बचने के लिए आध्यात्मिक भाषा का उपयोग",
        "तालियों को फल समझ लेना",
      ],
      maturitySignals: [
        "उपयोगकर्ता tradeoffs को ईमानदारी से बता सकता है",
        "एक अगला reversible experiment मौजूद है",
        "समझदार सलाह ने संख्या और motives देखे हैं",
      ],
      practices: [
        "सबसे छोटा reversible step तय कीजिए",
        "समय, पैसे, और ध्यान की वास्तविक लागत लिखिए",
        "किसी आलोचक से पूछिए कि योजना का कौन-सा हिस्सा नाज़ुक है",
      ],
      responseMoves: [
        "बुलाहट, महत्वाकांक्षा, escape, और थकान को अलग कीजिए",
        "निर्णय को अगले faithful experiment तक ले आइए",
        "सलाह और लागत-गणना को stabilizers की तरह उपयोग करें",
      ],
      promptCue:
        "Work mode में बुलाहट, परिश्रम, बुद्धिमान सलाह, नेतृत्व-चरित्र, लागत-गणना, टिकाऊ महत्वाकांक्षा, और सेवा पर ज़ोर दें। बड़े कार्य-निर्णयों से पहले motives और tradeoffs की जाँच में मदद करें।",
      prompts: [
        "क्या मुझे अपनी स्थिर नौकरी छोड़ देनी चाहिए?",
        "मैं कैसे जानूँ कि मेरी महत्वाकांक्षा स्वस्थ है?",
        "क्या मुझे यह व्यवसाय अभी शुरू करना चाहिए?",
      ],
    },
    Purpose: {
      intent: "धीमा होकर उस व्यक्ति को समझिए जिसे यह निर्णय गढ़ रहा है।",
      focus: "पहचान, दिशा, चिंता, मूल्य, दीर्घकालिक स्पष्टता",
      useWhen: "जब वास्तविक प्रश्न पहचान, दिशा, शांति, समय, या मूल्यों के बारे में हो।",
      lens: "विवेक का दृष्टिकोण: पहचान, शांति, motives, धैर्य, और अगला निष्ठावान कदम।",
      diagnosticTracks: [
        "पहचान: उपयोगकर्ता क्या साबित, बचाव, या बनना चाहता है?",
        "शांति: जब urgency शांत होती है, क्या बदलता है?",
        "मोटिव: कौन-सी इच्छा अच्छी है, और कौन-सी विकृत?",
      ],
      blindSpots: [
        "निष्ठावान कदम से पहले पूर्ण certainty का इंतज़ार",
        "चिंता को विवेक समझ लेना",
        "सफलता को पहचान तय करने देना",
      ],
      maturitySignals: [
        "पूरा रास्ता न भी दिखे, अगला कदम स्पष्ट है",
        "उपयोगकर्ता motives को आत्म-निंदा के बिना बता सकता है",
        "निर्णय को धैर्य के साथ रखा जा सकता है",
      ],
      practices: [
        "निर्णय के नीचे छिपे डर को नाम दीजिए",
        "उस व्यक्ति के बारे में एक वाक्य लिखिए जिसे यह चुनाव गढ़ रहा है",
        "अगले 24 घंटों के लिए अगला निष्ठावान कदम चुनिए",
      ],
      responseMoves: [
        "urgency कम करके agency लौटाइए",
        "पहचान को परिणाम से अलग कीजिए",
        "शर्म के बिना motives की ईमानदार जाँच कराइए",
      ],
      promptCue:
        "Purpose mode में विवेक, पहचान, motives, शांति, धैर्य, मूल्य, प्रार्थनापूर्ण चिंतन, और अगले निष्ठावान कदम पर ज़ोर दें। मार्गदर्शन को grounded और non-mystical रखें; दैवी निश्चितता का दावा न करें।",
      prompts: [
        "जब सब कुछ अस्पष्ट लगे, मैं कैसे निर्णय लूँ?",
        "क्या होगा अगर मैं गलत कारणों से सफलता का पीछा कर रहा हूँ?",
        "मैं अपने अगले कदम के बारे में शांति कैसे पाऊँ?",
      ],
    },
    Generosity: {
      intent: "दबाव, अपराधबोध, या दिखावे के बिना स्वतंत्र रूप से दें।",
      focus: "देना, परिवार का समर्थन, दान, सीमाएँ, स्थिरता",
      useWhen: "देने, दान, परिवार की मदद, सीमाएँ, या टिकाऊ उदारता के लिए उपयोग करें।",
      lens: "उदारता का दृष्टिकोण: तत्परता, स्थिरता, आनंद, बुद्धि, और बिना coercion के प्रेम।",
      diagnosticTracks: [
        "स्वतंत्रता: क्या उपहार स्वेच्छा से है, या अपराधबोध और भय से संचालित?",
        "स्थिरता: क्या यह उदारता छिपी कड़वाहट के बिना जारी रह सकती है?",
        "बुद्धि: यहाँ सहायता ज़िम्मेदारी को मज़बूत करती है या हानि को सक्षम करती है?",
      ],
      blindSpots: [
        "अपराधबोध को उदारता कहना",
        "सार्वजनिक रूप से देना ताकि आप आध्यात्मिक दिखें",
        "दूसरों को उन consequences से बचाना जिन्हें उन्हें सामना करना चाहिए",
      ],
      maturitySignals: [
        "उपहार मुक्त है, मजबूर नहीं",
        "सीमाएँ स्पष्ट और दयालु हैं",
        "देने की योजना टिकाऊ है",
      ],
      practices: [
        "दबाव के क्षण से पहले उपहार तय कीजिए",
        "देने की सीमा स्पष्ट शब्दों में तय कीजिए",
        "पूछिए क्या पैसा सचमुच सबसे अच्छी मदद है",
      ],
      responseMoves: [
        "अपराधबोध और दबाव को केंद्र से हटाइए",
        "आनंदपूर्ण उदारता और बुद्धिमान सीमाओं की रक्षा कीजिए",
        "पूछिए कि उपहार मदद करता है या enable करता है",
      ],
      promptCue:
        "Generosity mode में आनंदपूर्ण तत्परता, स्थिरता, सीमाएँ, non-coercion, करुणा, और ज़िम्मेदार दान पर ज़ोर दें। अपराधबोध या प्रदर्शन से प्रेरित देने को अस्वीकार करें।",
      prompts: [
        "मैं अपराधबोध या दबाव के बिना कैसे दूँ?",
        "क्या मुझे फिर से परिवार की आर्थिक मदद करनी चाहिए?",
        "मेरे लिए कितनी उदारता टिकाऊ है?",
      ],
    },
    Life: {
      intent: "सामान्य जीवन पर बाइबिल की बुद्धि को शांत ध्यान से लागू कीजिए।",
      focus: "आदतें, रिश्ते, परिवार, विश्राम, स्वास्थ्य, घर की लय",
      useWhen: "रोज़मर्रा के निर्णयों, दिनचर्या, रिश्तों, आदतों, आराम, संघर्ष, या जब अगला कदम पैसा/काम नहीं बल्कि जीवन हो।",
      lens: "सम्पूर्ण जीवन का दृष्टिकोण: चरित्र, रिश्ते, ज़िम्मेदारियाँ, लय, और अगला निष्ठावान कदम।",
      diagnosticTracks: [
        "चरित्र: यह आदत या चुनाव किस प्रकार का व्यक्ति गढ़ रहा है?",
        "रिश्ते: इससे कौन प्रभावित होगा, और मैं कैसे ठीक से प्रेम करूँ?",
        "लय: क्या यह विश्राम, ध्यान, और मरम्मत के लिए जगह बनाता है?",
      ],
      blindSpots: [
        "साधारण निर्णयों को आध्यात्मिक रूप से महत्वहीन समझना",
        "जहाँ व्यावहारिक बुद्धि चाहिए वहाँ अति-आध्यात्मिक होना",
        "अर्थ की खोज में शरीर, परिवार, या आराम को अनदेखा करना",
      ],
      maturitySignals: [
        "निर्णय स्वस्थ लय से मेल खाता है, सिर्फ महत्वाकांक्षा से नहीं",
        "बदलाव के सबसे नज़दीकी लोगों पर ध्यान दिया गया है",
        "अगला कदम पालन करने में सरल है",
      ],
      practices: [
        "सबसे छोटी निष्ठावान आदत को नाम दीजिए जिसे आप दोहरा सकते हैं",
        "जाँचिए कि यह चुनाव रिश्तों को मज़बूत करता है या कमज़ोर",
        "दबाव जोड़ने से पहले विश्राम की लय की रक्षा कीजिए",
      ],
      responseMoves: [
        "प्रश्न को abstraction से रोज़मर्रा की ज़िंदगी में लाइए",
        "बुद्धि को आदतों, रिश्तों, और घर की वास्तविकता से जोड़िए",
        "अगला कदम ठोस और टिकाऊ रखिए",
      ],
      promptCue:
        "Life mode में परिवार, रिश्ते, आदतों, विश्राम, संघर्ष, घर की लय, स्वास्थ्य, और छोटे निष्ठावान अगले कदम के लिए रोज़मर्रा की बाइबिलीय बुद्धि पर ज़ोर दें। मार्गदर्शन को ठोस, व्यावहारिक, और कोमल रखें।",
      prompts: [
        "मैं अपने रोज़मर्रा के जीवन को और बुद्धिमान कैसे बनाऊँ?",
        "मुझे इस रिश्ते के बारे में कैसे सोचना चाहिए?",
        "मुझे पहले कौन-सी आदत बदलनी चाहिए?",
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
        "¿Qué me ha sido confiado realmente ahora?",
        "¿Estoy actuando desde la responsabilidad fiel o desde la comparación?",
        "¿Qué consejo o rendición de cuentas haría esta decisión más sabia?",
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
        "¿Esta deuda sirve a un propósito claro o calma una presión momentánea?",
        "¿Qué libertad perderé mientras la pago?",
        "¿He hecho visible y realista el plan de pago?",
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
        "¿Qué estoy llamando suficiente en esta temporada?",
        "¿Dónde la comparación está distorsionando mi juicio?",
        "¿Qué práctica ayudaría a mi sistema nervioso a bajar el ritmo?",
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
        "¿Quién puede desafiar mis supuestos sin controlarme?",
        "¿Qué notaría un crítico sabio sobre este plan?",
        "¿Qué seguiría haciendo si nadie aplaudiera la decisión?",
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
        "¿Cuál es el costo real si esto tarda el doble?",
        "¿Qué parte de la decisión es reversible?",
        "¿Qué experimento podría revelar la verdad antes de que haga un compromiso mayor?",
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
        "¿Este regalo es libre, considerado y sostenible?",
        "¿Mi plan de dar protege tanto la generosidad como la responsabilidad?",
        "¿Qué necesidad se me invita a ver con amor?",
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
        "¿Qué elegiría si no hubiera urgencia?",
        "¿Sigue siendo sabia esta oportunidad después de una noche de descanso?",
        "¿Qué proceso me protege del impulso?",
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
        "¿Cuál es la siguiente acción fiel para hoy?",
        "¿Qué preocupaciones piden planificación y cuáles piden ser soltadas?",
        "¿Qué cambiaría la paz en mi ritmo?",
      ],
    },
  },
  es: {
    "Matthew 25:14-30": {
      principle: "Los recursos confiados se administran con fidelidad, valentía y responsabilidad.",
      context:
        "La parábola trata de siervos a quienes se les confía responsabilidad mientras el amo está fuera. Valora la fidelidad, no la ansiedad ni la especulación.",
      application:
        "Trata el dinero, la habilidad, el tiempo y la oportunidad como recursos confiados. El crecimiento importa, pero también el motivo, la paciencia, la diligencia y la rendición de cuentas.",
    },
    "Proverbs 22:7": {
      principle: "La deuda puede reducir la libertad y conviene abordarla con sobriedad.",
      context:
        "Los Proverbios suelen describir patrones de sabiduría más que reglas legales absolutas. Este proverbio señala el peso relacional y práctico que puede crear la deuda.",
      application:
        "Antes de asumir una deuda, revisa la necesidad, la capacidad de pago, la presión emocional y si la obligación sirve a una buena administración.",
    },
    "Philippians 4:11-13": {
      principle: "El contentamiento se aprende confiando, no cuando las circunstancias son perfectas.",
      context:
        "Pablo escribe desde la dificultad y describe el contentamiento como una dependencia aprendida, no como negación de la necesidad real.",
      application:
        "La paz financiera suele empezar al nombrar lo suficiente, resistir la comparación y cultivar hábitos que bajen la volatilidad emocional.",
    },
    "Proverbs 15:22": {
      principle: "Los planes se fortalecen cuando se examinan con consejo humilde.",
      context:
        "La literatura sapiencial valora repetidamente la docilidad, la corrección y la capacidad de buscar perspectiva antes de actuar.",
      application:
        "Para decisiones grandes de trabajo, dinero o negocio, invita a personas sabias, honestas y que no dependan financieramente de tu decisión.",
    },
    "Luke 14:28": {
      principle: "La acción sabia calcula el costo antes del compromiso.",
      context:
        "Jesús usa la imagen de construir una torre para destacar una evaluación sobria antes del compromiso público.",
      application:
        "Antes de un gran movimiento laboral o empresarial, define margen, intercambios, obligaciones, tiempos y el experimento reversible más pequeño.",
    },
    "2 Corinthians 9:6-8": {
      principle: "La generosidad es voluntaria y reflexiva, no forzada ni performativa.",
      context:
        "Pablo invita a una generosidad alegre y rechaza la imposición. La postura importa tanto como el monto.",
      application:
        "Da por convicción y con planificación, no por culpa, presión social ni por querer parecer espiritual.",
    },
    "Proverbs 21:5": {
      principle: "La planificación diligente suele conducir a la abundancia; la prisa, a la escasez.",
      context:
        "Este proverbio contrasta la diligencia constante con la acción apresurada. Advierte contra los atajos impulsivos.",
      application:
        "Evita decisiones financieras guiadas por hype, pánico o urgencia. Escribe el plan, prueba supuestos y deja tiempo para consejo.",
    },
    "Matthew 6:25-34": {
      principle: "La confianza reduce la ansiedad sin impedir la acción responsable.",
      context:
        "Jesús aborda la preocupación y el afán desordenado, llamando a sus oyentes a buscar el reino de Dios mientras viven un día a la vez.",
      application:
        "Separa la planificación responsable de los bucles de ansiedad. Haz la siguiente acción fiel y luego rechaza ensayar cada peor escenario.",
    },
    "Psalm 51:10-12": {
      principle: "Un corazón limpio y un espíritu firme pueden ser restaurados después de caer.",
      context:
        "David ora después de un colapso moral. No pide solo perdón, sino renovación interior y alegría devuelta por Dios.",
      application:
        "Cuando hayas caído, empieza con arrepentimiento honesto y no con autoprotección. Pide a Dios que renueve tu corazón y te ayude a dar el siguiente paso verdadero.",
    },
    "James 5:16": {
      principle: "La confesión y la oración abren camino a la sanidad y a la integridad restaurada.",
      context:
        "Santiago une la confesión con la oración y la sanidad, mostrando que la lucha escondida suele debilitarnos y que la honestidad puede iniciar reparación.",
      application:
        "Confiesa lo que es verdad ante Dios y, cuando sea sabio, ante una persona de confianza que pueda orar, sostenerte y ayudarte a rendir cuentas.",
    },
    "1 Thessalonians 4:3-5": {
      principle: "La santidad se aprende honrando a Dios con el cuerpo y rechazando el deseo distorsionado.",
      context:
        "Pablo llama a los creyentes hacia la santificación, el autocontrol y una manera distinta de usar el deseo frente a la cultura que los rodea.",
      application:
        "La pureza no es solo evitar; es también una forma positiva de límites, autocontrol y honra a Dios con lo que miras, tocas e imaginas.",
    },
    "1 Corinthians 10:13": {
      principle: "La tentación es real, pero Dios también provee una salida y capacidad para resistir.",
      context:
        "Pablo asegura a los creyentes que la tentación no es única, ni imposible de soportar, ni ajena a la ayuda fiel de Dios.",
      application:
        "Busca la salida, no solo la tentación. La libertad suele requerir nombrar el patrón, cambiar el entorno y tomar la salida ofrecida.",
    },
  },
  fr: {
    "Matthew 25:14-30": {
      principle: "Les ressources confiées se gèrent avec fidélité, courage et responsabilité.",
      context:
        "La parabole concerne des serviteurs à qui l’on confie une responsabilité pendant l’absence du maître. Elle valorise l’action fidèle, non l’angoisse ni la spéculation.",
      application:
        "Considère l’argent, les compétences, le temps et les occasions comme des ressources confiées. La croissance compte, mais aussi le motif, la patience, la diligence et la redevabilité.",
    },
    "Proverbs 22:7": {
      principle: "La dette peut réduire la liberté et doit être abordée avec sobriété.",
      context:
        "Les Proverbes décrivent souvent des schémas de sagesse plutôt que des règles légales absolues. Ce proverbe nomme le poids relationnel et pratique que la dette peut créer.",
      application:
        "Avant de prendre une dette, examine le besoin, la capacité de remboursement, la pression émotionnelle et si l'engagement soutient une bonne gestion.",
    },
    "Philippians 4:11-13": {
      principle: "Le contentement s'apprend dans la confiance, non dans des circonstances parfaites.",
      context:
        "Paul écrit dans l'épreuve et décrit le contentement comme une dépendance apprise, non comme le déni d'un besoin réel.",
      application:
        "La paix financière commence souvent par nommer ce qui suffit, résister à la comparaison et construire des habitudes qui réduisent la volatilité émotionnelle.",
    },
    "Proverbs 15:22": {
      principle: "Les projets deviennent plus solides quand ils sont examinés avec un conseil humble.",
      context:
        "La littérature de sagesse valorise sans cesse l'aptitude à être enseigné, la correction et la recherche d'un autre point de vue avant d'agir.",
      application:
        "Pour les grandes décisions de travail, d'argent ou d'entreprise, invite des personnes sages, honnêtes et non dépendantes financièrement de ton choix.",
    },
    "Luke 14:28": {
      principle: "L'action sage évalue le coût avant l'engagement.",
      context:
        "Jésus utilise l'image de la construction d'une tour pour souligner une évaluation sobre avant un engagement public.",
      application:
        "Avant un grand changement professionnel ou entrepreneurial, définis la marge, les arbitrages, les obligations, le calendrier et le plus petit test réversible.",
    },
    "2 Corinthians 9:6-8": {
      principle: "La générosité est volontaire et réfléchie, non forcée ni mise en scène.",
      context:
        "Paul invite à une générosité joyeuse tout en rejetant la contrainte. La posture compte autant que le montant.",
      application:
        "Donne par conviction et avec planification, non par culpabilité, pression sociale ou besoin d'avoir l'air spirituel.",
    },
    "Proverbs 21:5": {
      principle: "Une planification diligente mène souvent à l'abondance ; la précipitation mène au manque.",
      context:
        "Ce proverbe oppose la diligence régulière à l'action précipitée. Il met en garde contre les raccourcis impulsifs.",
      application:
        "Évite les décisions financières dictées par le battage, la panique ou l'urgence. Écris le plan, teste les hypothèses et laisse du temps au conseil.",
    },
    "Matthew 6:25-34": {
      principle: "La confiance réduit l'anxiété tout en laissant place à l'action responsable.",
      context:
        "Jésus traite l'inquiétude et l'agitation déplacée, appelant ses auditeurs à chercher le royaume de Dieu tout en vivant un jour à la fois.",
      application:
        "Sépare la planification responsable des boucles d'anxiété. Fais le prochain geste fidèle puis refuse de rejouer chaque pire scénario.",
    },
  },
  pt: {
    "Matthew 25:14-30": {
      principle: "Recursos confiados são administrados com fidelidade, coragem e responsabilidade.",
      context:
        "A parábola trata de servos a quem foi dada responsabilidade enquanto o mestre está ausente. Ela valoriza ação fiel, não especulação nem ansiedade.",
      application:
        "Trate dinheiro, habilidade, tempo e oportunidade como recursos confiados. Crescimento importa, mas motivo, paciência, diligência e prestação de contas também importam.",
    },
    "Proverbs 22:7": {
      principle: "A dívida pode reduzir a liberdade e deve ser tratada com sobriedade.",
      context:
        "Os Provérbios costumam descrever padrões de sabedoria, não regras legais absolutas. Este provérbio nomeia o peso relacional e prático que a dívida pode criar.",
      application:
        "Antes de assumir uma dívida, examine a necessidade, a capacidade de pagamento, a pressão emocional e se a obrigação sustenta uma boa mordomia.",
    },
    "Philippians 4:11-13": {
      principle: "O contentamento se aprende pela confiança, não por circunstâncias perfeitas.",
      context:
        "Paulo escreve em meio à dificuldade e descreve o contentamento como dependência aprendida, não como negação da necessidade real.",
      application:
        "A paz financeira costuma começar ao nomear o suficiente, resistir à comparação e construir hábitos que reduzam a volatilidade emocional.",
    },
    "Proverbs 15:22": {
      principle: "Os planos ficam mais firmes quando são examinados com conselho humilde.",
      context:
        "A literatura de sabedoria valoriza repetidamente a docilidade, a correção e a busca de perspectiva antes de agir.",
      application:
        "Para grandes decisões de trabalho, dinheiro ou negócio, convide pessoas sábias, honestas e que não dependam financeiramente da sua decisão.",
    },
    "Luke 14:28": {
      principle: "A ação sábia conta o custo antes do compromisso.",
      context:
        "Jesus usa a imagem de construir uma torre para enfatizar uma avaliação sóbria antes de um compromisso público.",
      application:
        "Antes de uma grande mudança de trabalho ou negócio, defina margem, trocas, obrigações, tempo e o menor experimento reversível.",
    },
    "2 Corinthians 9:6-8": {
      principle: "A generosidade é voluntária e cuidadosa, não forçada nem performática.",
      context:
        "Paulo convida à generosidade alegre enquanto rejeita a compulsão. A postura importa tanto quanto o valor.",
      application:
        "Dê por convicção e com planejamento, não por culpa, pressão social ou necessidade de parecer espiritual.",
    },
    "Proverbs 21:5": {
      principle: "O planejamento diligente tende à abundância; a pressa tende à escassez.",
      context:
        "Este provérbio contrasta a diligência constante com a ação apressada. Ele adverte contra atalhos impulsivos.",
      application:
        "Evite decisões financeiras guiadas por hype, pânico ou urgência. Escreva o plano, teste as suposições e dê tempo ao conselho.",
    },
    "Matthew 6:25-34": {
      principle: "A confiança reduz a ansiedade sem impedir a ação responsável.",
      context:
        "Jesus trata da preocupação e do esforço deslocado, chamando os ouvintes a buscar o reino de Deus enquanto vivem um dia de cada vez.",
      application:
        "Separe o planejamento responsável dos ciclos de ansiedade. Faça a próxima ação fiel e depois recuse ensaiar cada pior cenário.",
    },
  },
  de: {
    "Matthew 25:14-30": {
      principle: "Anvertraute Ressourcen werden mit Treue, Mut und Verantwortung verwaltet.",
      context:
        "Das Gleichnis handelt von Dienern, denen Verantwortung anvertraut wird, während der Herr abwesend ist. Es würdigt treues Handeln, nicht Spekulation oder Angst.",
      application:
        "Behandle Geld, Fähigkeiten, Zeit und Gelegenheit als anvertraute Ressourcen. Wachstum zählt, aber auch Motivation, Geduld, Fleiß und Rechenschaft.",
    },
    "Proverbs 22:7": {
      principle: "Schulden können Freiheit einschränken und sollten nüchtern angegangen werden.",
      context:
        "Die Sprüche beschreiben oft Weisheitsmuster statt absoluter Rechtsregeln. Dieses Sprichwort benennt das relationale und praktische Gewicht, das Schulden erzeugen können.",
      application:
        "Prüfe vor einer Verschuldung Bedarf, Rückzahlungsfähigkeit, emotionalen Druck und ob die Verpflichtung gute Haushalterschaft unterstützt.",
    },
    "Philippians 4:11-13": {
      principle: "Genügsamkeit lernt man durch Vertrauen, nicht durch perfekte Umstände.",
      context:
        "Paulus schreibt aus der Bedrängnis und beschreibt Genügsamkeit als erlernte Abhängigkeit, nicht als Verleugnung realer Not.",
      application:
        "Finanzieller Frieden beginnt oft damit, genug zu benennen, Vergleich zu widerstehen und Gewohnheiten aufzubauen, die emotionale Schwankungen senken.",
    },
    "Proverbs 15:22": {
      principle: "Pläne werden tragfähiger, wenn sie mit bescheidenem Rat geprüft werden.",
      context:
        "Weisheitsliteratur schätzt Belehrbarkeit, Korrektur und die Bereitschaft, vor dem Handeln Perspektive zu suchen.",
      application:
        "Bei großen Entscheidungen in Arbeit, Geld oder Geschäft lade weise, ehrliche Menschen ein, die finanziell nicht von deiner Entscheidung abhängen.",
    },
    "Luke 14:28": {
      principle: "Kluges Handeln zählt die Kosten vor der Zusage.",
      context:
        "Jesus nutzt das Bild vom Turmbau, um eine nüchterne Einschätzung vor einer öffentlichen Zusage zu betonen.",
      application:
        "Vor einem großen Berufs- oder Geschäftsschritt definiere Puffer, Abwägungen, Verpflichtungen, Timing und das kleinste reversible Experiment.",
    },
    "2 Corinthians 9:6-8": {
      principle: "Großzügigkeit ist willig und bedacht, nicht erzwungen oder zur Schau gestellt.",
      context:
        "Paulus lädt zu fröhlicher Großzügigkeit ein und lehnt Zwang ab. Die Haltung ist ebenso wichtig wie der Betrag.",
      application:
        "Gib aus Überzeugung und mit Planung, nicht aus Schuld, sozialem Druck oder dem Wunsch, geistlich beeindruckend zu wirken.",
    },
    "Proverbs 21:5": {
      principle: "Sorgfältige Planung führt oft zum Wohlstand; Hast führt zum Mangel.",
      context:
        "Dieses Sprichwort stellt beständige Sorgfalt und übereiltes Handeln gegenüber. Es warnt vor impulsiven Abkürzungen.",
      application:
        "Vermeide finanzielle Entscheidungen, die von Hype, Panik oder Dringlichkeit getrieben sind. Schreibe den Plan, prüfe Annahmen und nimm dir Zeit für Rat.",
    },
    "Matthew 6:25-34": {
      principle: "Vertrauen mindert ängstliches Streben und lässt dennoch verantwortliches Handeln zu.",
      context:
        "Jesus spricht Sorge und fehlgeleitetes Streben an und ruft die Hörer dazu auf, Gottes Reich zu suchen und gleichzeitig einen Tag nach dem anderen zu leben.",
      application:
        "Trenne verantwortliche Planung von Angstschleifen. Tu den nächsten treuen Schritt und weigere dich dann, jedes Worst-Case-Szenario durchzuspielen.",
    },
  },
  yo: {
    "Matthew 25:14-30": {
      principle: "A n tọ́jú ohun tí a fi lé wa lọ́wọ́ pẹ̀lú òtítọ́, ìgboyà, àti ojúṣe.",
      context:
        "Òwe yìí ń sọ̀rọ̀ nípa àwọn ìránṣẹ́ tí a fi ojúṣe lé ọwọ́ wọn nígbà tí olúwa kò sí. Ó gbé iṣẹ́ olóòtítọ́ ga, kì í ṣe ìfojúsùn tàbí ìbẹ̀rù.",
      application:
        "Wo owó, ọgbọ́n, àkókò, àti àǹfààní gẹ́gẹ́ bí ohun tí a fi lé ọ lọ́wọ́. Ìdàgbàsókè ṣe pàtàkì, ṣùgbọ́n ìdí, sùúrù, aápọn, àti ìjábọ̀ tún ṣe pàtàkì.",
    },
    "Proverbs 22:7": {
      principle: "Gbèsè lè dín òmìnira kù, a sì gbọ́dọ̀ dojú kọ́ ọ pẹ̀lú ìfarabalẹ̀.",
      context:
        "Òwe sábà máa ń ṣàpèjúwe àpẹẹrẹ ọgbọ́n dípò òfin gígùn tí kò yí padà. Òwe yìí ń darúkọ ẹrù ìbáṣepọ̀ àti ìṣe tí gbèsè lè dá.",
      application:
        "Kí o tó gba gbèsè, ṣàyẹ̀wò ìdí rẹ, agbára láti san padà, ìtẹ̀sí ọkàn, àti bóyá ojúṣe náà ń ṣe ìtọ́jú rere.",
    },
    "Philippians 4:11-13": {
      principle: "Ìtẹ́lọ́run a kọ́ ọ nípasẹ̀ ìgbẹ́kẹ̀lé, kì í ṣe nípasẹ̀ ipò pípé.",
      context:
        "Paulu kọ láti inú ìpọnju, ó sì ṣàpèjúwe ìtẹ́lọ́run gẹ́gẹ́ bí ìgbẹ́kẹ̀lé tí a kọ́, kì í ṣe bí ìkọ̀sílẹ̀ àìní gidi.",
      application:
        "Àlàáfíà owó sábà máa bẹ̀rẹ̀ nígbà tí a bá sọ ohun tó tó di mímọ̀, a sì kọ ìfíwéra sílẹ̀, a sì dá àwọn àṣà tó dín ìyí padà ọkàn kù sílẹ̀.",
    },
    "Proverbs 15:22": {
      principle: "Ètò máa ń lágbára síi nígbà tí a bá ṣàyẹ̀wò rẹ̀ pẹ̀lú ìmọ̀ràn onírẹ̀lẹ̀.",
      context:
        "Ìwé ọgbọ́n máa ń fi iye sí ẹ̀kọ́, ìtọ́ni, àti agbára láti wá ojú ìwòye kí a tó ṣiṣẹ́.",
      application:
        "Fún àwọn ìpinnu ńlá ní iṣẹ́, owó, tàbí òwò, pe àwọn ènìyàn ọlọ́gbọ́n, olóòtítọ́, tí kò gbẹ́kẹ̀lé owó rẹ fún ìpinnu náà.",
    },
    "Luke 14:28": {
      principle: "Ìṣe ọlọ́gbọ́n ń ka iye kí ó tó dá ara rẹ̀ mọ́ra.",
      context:
        "Jésù lo àpẹẹrẹ fífi ilé gíga kọ́ láti fi hàn pé a gbọ́dọ̀ wo ohun tó wà níwájú pẹ̀lú ìfarabalẹ̀ kí a tó fi ara mọ́ ohun kan ní gbangba.",
      application:
        "Kí o tó ṣe ìgbésẹ̀ ńlá ní iṣẹ́ tàbí òwò, ṣàlàyé àyè, ìyàtọ̀, ojúṣe, àsìkò, àti ìdánwò kékeré tí a lè yí padà.",
    },
    "2 Corinthians 9:6-8": {
      principle: "Ìfẹ́ fúnni jẹ́ ìfẹ́ ọkàn àti ìmòye, kì í ṣe ohun tí a fi ipa mú tàbí fún ìfihàn.",
      context:
        "Paulu ń pè ní fífúnni pẹ̀lú ayọ̀, ó sì kọ ìfipá. Ìpò ọkàn ṣe pàtàkì tó iye owó.",
      application:
        "Fúnni látinú ìdánilójú àti ètò, kì í ṣe láti inú ẹ̀bi, titẹ awujọ, tàbí ìfẹ́ láti dà bí ẹni ẹ̀mí.",
    },
    "Proverbs 21:5": {
      principle: "Ìṣètò tó fara balẹ̀ máa ń yọrí sí ọ̀pọ̀; ìkánjú máa ń yọrí sí àìní.",
      context:
        "Òwe yìí fi àfiyèsí pípẹ́ hàn sí aápọn tó dúró ṣinṣin àti ìṣe tó yara jù. Ó ń kìlọ̀ lòdì sí àkókò kékèké tí kò rò.",
      application:
        "Yago fún ìpinnu owó tí hype, ìbànújẹ, tàbí ìkánjú ń darí. Kọ ètò náà, dán àwọn ìròyìn inú wò, kí o sì fún ìmọ̀ràn ní àkókò.",
    },
    "Matthew 6:25-34": {
      principle: "Ìgbẹ́kẹ̀lé dín ìbẹ̀rù kù, ṣùgbọ́n ó tún jẹ́ kí a ṣe ohun tó yẹ.",
      context:
        "Jésù ń bá ìbànújẹ àti ìfọkànsìn tí kò tọ́ sọrọ, ó sì ń pè àwọn olùgbọ́ rẹ̀ láti wá ìjọba Ọlọ́run nígbà tí wọ́n ń gbé ọjọ́ kan lọ́ọ̀kan.",
      application:
        "Ya ìṣètò tó yẹ sọ́tọ̀ kúrò nínú kíkààkiri ìbẹ̀rù. Ṣe ìgbésẹ̀ olóòtítọ́ tó kàn, lẹ́yìn náà kọ̀ láti tún gbogbo àbájáde burúkú ṣe nínú ọkàn rẹ.",
    },
  },
  ig: {
    "Matthew 25:14-30": {
      principle: "A na-elekọta ihe e nyere anyị n'aka site n'ịbụ ndị kwesịrị ntụkwasị obi, obi ike, na ibu ọrụ.",
      context:
        "Akụkọ a na-ekwu maka ndị ohu e nyere ibu ọrụ mgbe nna ha ukwu nọ n'ebe ọzọ. Ọ na-akwado omume kwesịrị ntụkwasị obi, ọ bụghị egwu ma ọ bụ ịkọwapụta ihe n'ike.",
      application:
        "Were ego, nkà, oge, na ohere dịka ihe e nyere gị n'aka. Ito uto dị mkpa, ma ebumnuche, ndidi, ịdị uchu, na ịza ajụjụ dịkwa mkpa.",
    },
    "Proverbs 22:7": {
      principle: "Ụgwọ nwere ike belata nnwere onwe, a ga-abịaru ya nso n'uche zuru.",
      context:
        "Akwụkwọ Ilu na-akọkarị ụkpụrụ amamihe karịa iwu zuru oke. Ilu a na-akọ ihe ibu mmekọrịta na nke bara uru ụgwọ nwere ike ịkpata.",
      application:
        "Tupu iwere ụgwọ, nyochaa mkpa ya, ike ịkwụghachi ya, nrụgide nke mmetụta, na ma ọrụ ahụ na-akwado ezigbo nlekọta.",
    },
    "Philippians 4:11-13": {
      principle: "Afọ ojuju a na-amụta site n'ịtụkwasị obi, ọ bụghị site n'ọnọdụ zuru oke.",
      context:
        "Pọl na-ede site n'ime ihe isi ike ma kọwaa afọ ojuju dịka ntụkwasị obi a mụtara, ọ bụghị ịgọnahụ mkpa dị adị.",
      application:
        "Udo n'ihe gbasara ego na-amalitekarị mgbe a kpọrọ ihe zuru ezu aha, a jụrụ ịtụnyere onwe onye, a na-ewu kwa omume na-eme ka mmetụta ghara ịgbanwe nke ukwuu.",
    },
    "Proverbs 15:22": {
      principle: "Atụmatụ na-adịkwu sie ike mgbe e nyochara ya n'okpuru ndụmọdụ dị umeala n'obi.",
      context:
        "Akwụkwọ amamihe na-akwanyere ịdị njikere ịmụ ihe, mmezi, na ịchọ echiche ndị ọzọ tupu omume.",
      application:
        "Maka mkpebi ukwu n'ọrụ, ego, ma ọ bụ azụmahịa, kpọọ ndị maara ihe, ndị na-ekwu eziokwu, ndị na-adabereghị na ego gị maka mkpebi ahụ.",
    },
    "Luke 14:28": {
      principle: "Omume amamihe na-agụ ụgwọ tupu nkwekọrịta.",
      context:
        "Jisọs jiri ihe atụ ụlọ elu rụọ ka o doo anya na e kwesịrị ịtụle ihe nwayọọ tupu e mee nkwekọrịta n'ihu ọha.",
      application:
        "Tupu nnukwu mgbanwe ọrụ ma ọ bụ azụmahịa, kọwaa ohere, mgbanwe, ibu ọrụ, oge, na nnwale pere mpe a pụrụ ịtụgharị azụ.",
    },
    "2 Corinthians 9:6-8": {
      principle: "Mmesapụ aka bụ ihe e ji obi dị njikere na echiche ọma mee, ọ bụghị nke a manyere ma ọ bụ egosipụtara.",
      context:
        "Pọl na-akpọ ka e nye n'ọṅụ ma na-ajụ ịmanye mmadụ. Ọnọdụ obi dị mkpa dịka oke onyinye.",
      application:
        "Nye site n'ịkwenye n'ime obi ma hazie ya, ọ bụghị site n'ikpe ọmụma, nrụgide obodo, ma ọ bụ ịchọ ka a hụ gị dịka onye mmụọ.",
    },
    "Proverbs 21:5": {
      principle: "Nhazi nke ọma na-eduba n'ụba; ọsọ ọsọ na-eduba n'ụkọ.",
      context:
        "Ilu a na-atụnyere ịdị uchu na-adịgide adịgide na omume ọsọ ọsọ. Ọ na-adọ aka ná ntị megide ụzọ mkpirisi na-enweghị echiche.",
      application:
        "Ka ị ghara isoro hype, egwu, ma ọ bụ ọsọ ọsọ mee mkpebi ego. Dee atụmatụ ahụ, nwalee echiche, ma hapụ oge maka ndụmọdụ.",
    },
    "Matthew 6:25-34": {
      principle: "Ntụkwasị obi na-ebelata ịchụso ihe na-akpata nchekasị, ma ọ ka na-enye ohere maka omume kwesịrị ntụkwasị obi.",
      context:
        "Jisọs na-ekwu banyere nchekasị na ịchụso ihe n'ụzọ na-ezighị ezi, na-akpọ ndị na-ege ntị ka ha chọọ alaeze Chineke mgbe ha na-ebi otu ụbọchị n'otu ụbọchị.",
      application:
        "Kewapụ atụmatụ kwesịrị ntụkwasị obi pụọ na okirikiri nchekasị. Mee nzọụkwụ kwesịrị ntụkwasị obi sochirinụ, wee jụ ịmegharị ọnọdụ kacha njọ niile n'uche.",
    },
  },
  ha: {
    "Matthew 25:14-30": {
      principle: "Abubuwan da aka ba wa amana ana sarrafa su da aminci, jarumtaka, da alhaki.",
      context:
        "Misalin yana magana ne game da bayin da aka damka wa alhaki yayin da maigida ya tafi. Yana yaba aiki mai aminci, ba zato ko tsoro ba.",
      application:
        "Ka ɗauki kuɗi, fasaha, lokaci, da dama a matsayin abubuwan da aka ba ka amana. Girma yana da muhimmanci, amma niyya, haƙuri, ƙwazo, da bayar da lissafi suna da muhimmanci ma.",
    },
    "Proverbs 22:7": {
      principle: "Bashi na iya rage 'yanci kuma ya kamata a tunkare shi cikin natsuwa.",
      context:
        "Littafin Karin Magana yakan bayyana al'amuran hikima maimakon ƙa'idoji na doka kai tsaye. Wannan karin magana yana nuna nauyin dangantaka da na aiki da bashi zai iya haifarwa.",
      application:
        "Kafin ka ɗauki bashi, ka binciki buƙata, ikon biyan sa, matsin zuciya, da ko wajibcin yana goyon bayan kyakkyawan kula da abin da aka damka.",
    },
    "Philippians 4:11-13": {
      principle: "Ana koyon gamsuwa ta hanyar dogaro, ba ta hanyar yanayi cikakke ba.",
      context:
        "Bulus yana rubutu daga wahala kuma yana bayyana gamsuwa a matsayin dogaro da aka koya, ba musun bukata ta gaske ba.",
      application:
        "Salamar kuɗi sau da yawa tana farawa ne da bayyana abin da ya isa, kin kwatantawa, da gina halaye da ke rage tashin hankali na zuciya.",
    },
    "Proverbs 15:22": {
      principle: "Shirye-shirye suna ƙara ƙarfi idan an bincika su da tawali'u.",
      context:
        "Littafin hikima yana daraja koyuwa, gyara, da kuma neman hangen nesa kafin a yi aiki.",
      application:
        "Don manyan shawarwarin aiki, kuɗi, ko kasuwanci, gayyaci mutane masu hikima, masu gaskiya, kuma ba su dogara da kuɗin ku ba wajen yanke shawarar.",
    },
    "Luke 14:28": {
      principle: "Aikin hikima yana ƙididdige farashi kafin amincewa.",
      context:
        "Yesu ya yi amfani da hoton gina hasumiya don nuna auna abin da zai zo kafin a ɗauki alƙawari a fili.",
      application:
        "Kafin babban motsi na aiki ko kasuwanci, ka fayyace sarari, musayar da za a yi, wajibai, lokaci, da ƙaramin gwaji da za a iya juyawa.",
    },
    "2 Corinthians 9:6-8": {
      principle: "Karimci abu ne da aka yi da niyya da tunani, ba da tilas ba kuma ba don nuna kai ba.",
      context:
        "Bulus yana gayyatar bayarwa da farin ciki kuma yana ƙin tilas. Yanayin zuciya yana da muhimmanci kamar adadin.",
      application:
        "Ba da tabbaci da tsari, ba saboda laifi, matsin lamba na jama'a, ko son a ɗauke ka a matsayin mai tsarki ba.",
    },
    "Proverbs 21:5": {
      principle: "Tsari mai ƙwazo yana kaiwa zuwa yalwa; gaggawa kuma tana kaiwa ga rashi.",
      context:
        "Wannan karin magana ya kwatanta ƙwazo mai ɗorewa da aiki cikin gaggawa. Yana gargadi game da hanyoyin gajerun da ba su da tunani.",
      application:
        "Ka guji shawarwarin kuɗi da hype, firgici, ko gaggawa ke tuka su. Ka rubuta tsarin, ka gwada zato, kuma ka ba da lokaci don shawara.",
    },
    "Matthew 6:25-34": {
      principle: "Dogaro yana rage damuwar gaggawa, amma har yanzu yana barin aiki mai alhaki.",
      context:
        "Yesu yana magana ne game da damuwa da biye wa abin da bai dace ba, yana kiran masu sauraro su nemi mulkin Allah yayin da suke rayuwa rana ɗaya a lokaci ɗaya.",
      application:
        "Ka raba shiri mai alhaki daga zagayen damuwa. Yi mataki na gaba mai aminci, sannan ka ƙi sake kunna kowanne mummunan al'amari a kai.",
    },
  },
  tl: {
    "Matthew 25:14-30": {
      principle: "Ang mga pinagkakatiwalaang yaman ay pinamamahalaan nang may katapatan, tapang, at pananagutan.",
      context:
        "Ang talinghaga ay tungkol sa mga alipin na pinagkatiwalaan ng responsibilidad habang wala ang panginoon. Pinupuri nito ang tapat na gawa, hindi ang pagkukunwari o pagkabalisa.",
      application:
        "Ituring ang pera, kakayahan, oras, at pagkakataon bilang mga pinagkakatiwalaang yaman. Mahalaga ang paglago, ngunit mahalaga rin ang motibo, pasensya, kasipagan, at pananagutan.",
    },
    "Proverbs 22:7": {
      principle: "Ang utang ay maaaring magbawas ng kalayaan at dapat harapin nang may tamang pag-iisip.",
      context:
        "Ang mga Kawikaan ay kadalasang naglalarawan ng mga pattern ng karunungan kaysa sa ganap na mga legal na tuntunin. Binabanggit ng kawikaan na ito ang relasyon at praktikal na bigat na maaaring likhain ng utang.",
      application:
        "Bago mangutang, suriin ang pangangailangan, kakayahang magbayad, emosyonal na presyon, at kung ang obligasyon ba ay sumusuporta sa matalinong pamamahala.",
    },
    "Philippians 4:11-13": {
      principle: "Ang kasiyahan ay natututo sa pamamagitan ng tiwala, hindi nakamit sa pamamagitan ng perpektong kalagayan.",
      context:
        "Si Pablo ay sumulat mula sa kahirapan at inilalarawan ang kasiyahan bilang natutunan na pag-asa, hindi pagtanggi sa tunay na pangangailangan.",
      application:
        "Ang kapayapaan sa pera ay kadalasang nagsisimula sa pagtukoy ng sapat, paglaban sa paghahambing, at pagbuo ng mga gawi na nagpapababa ng emosyonal na pagbabago.",
    },
    "Proverbs 15:22": {
      principle: "Ang mga plano ay nagiging mas matibay kapag sinuri ng may mapagpakumbabang payo.",
      context:
        "Ang panitikan ng karunungan ay paulit-ulit na pinahahalagahan ang pagiging turuan, pagwawasto, at kakayahang humingi ng pananaw bago kumilos.",
      application:
        "Para sa malalaking desisyon sa trabaho, pera, o negosyo, anyayahan ang mga taong matalino, tapat, at hindi pinansyal na umaasa sa iyong desisyon.",
    },
    "Luke 14:28": {
      principle: "Ang matalinong gawa ay tinatasa ang halaga bago ang pangako.",
      context:
        "Ginamit ni Jesus ang larawan ng pagtatayo ng tore upang bigyang-diin ang maingat na pagtasa bago ang pampublikong pangako.",
      application:
        "Bago ang isang malaking hakbang sa trabaho o negosyo, tukuyin ang kaya, mga tradeoff, obligasyon, timing, at ang pinakamaliit na reversible na eksperimento.",
    },
    "2 Corinthians 9:6-8": {
      principle: "Ang pagkamapagbigay ay kusang-loob at maingat, hindi sapilitan o paimbabaw.",
      context:
        "Inaanyayahan ni Pablo ang masayang pagkamapagbigay habang tinatanggihan ang pamimilit. Ang saloobin ay kasinghalaga ng halaga.",
      application:
        "Magbigay mula sa paninindigan at pagpaplano, hindi mula sa hiya, presyon ng lipunan, o pangangailangang magmukhang espirituwal.",
    },
    "Proverbs 21:5": {
      principle: "Ang masusing pagpaplano ay nagdudulot ng kasaganaan; ang pagmamadali ay nagdudulot ng kakulangan.",
      context:
        "Inihahambing ng kawikaan na ito ang patuloy na kasipagan sa pabigla-biglang gawa. Nagbababala ito laban sa mga padalos-dalos na shortcut.",
      application:
        "Iwasan ang mga pinansyal na hakbang na pinapatakbo ng hype, pagkabalisa, o pagkaapurahan. Isulat ang plano, subukan ang mga palagay, at bigyan ng oras ang payo.",
    },
    "Matthew 6:25-34": {
      principle: "Ang tiwala ay nagpapababa ng mapanghimasok na pagsisikap habang nagpapahintulot pa rin ng responsableng gawa.",
      context:
        "Tinutugunan ni Jesus ang pag-aalala at maling pagsisikap, tinatawag ang mga tagapakinig na hanapin ang kaharian ng Diyos habang namumuhay nang isang araw sa isang pagkakataon.",
      application:
        "Ihiwalay ang responsableng pagpaplano mula sa mga siklo ng pagkabalisa. Gawin ang susunod na tapat na gawa, pagkatapos ay tanggihan ang paulit-ulit na pag-iisip sa bawat pinakamasamang sitwasyon.",
    },
    "Psalm 51:10-12": {
      principle: "Ang isang malinis na puso at matibay na espiritu ay maaaring mapanumbalik pagkatapos ng pagbagsak.",
      context:
        "Si David ay nanalangin pagkatapos ng moral na pagbagsak. Hindi lamang siya humiling ng kapatawaran, kundi ng panloob na pagbabago at kagalakang ibinabalik ng Diyos.",
      application:
        "Kapag nahulog ka, magsimula sa tapat na pagsisisi at hindi sa pagtatanggol sa sarili. Hilingin sa Diyos na baguhin ang iyong puso at tulungan kang gawin ang susunod na tapat na hakbang.",
    },
    "James 5:16": {
      principle: "Ang kumpisal at panalangin ay nagbubukas ng landas tungo sa pagpapagaling at naibalik na integridad.",
      context:
        "Inugnay ni Santiago ang kumpisal sa panalangin at pagpapagaling, na nagpapakita na ang nakatagong pakikibaka ay kadalasang nagpapahina sa atin at ang katapatan ay maaaring magpasimulan ng pagkukumpuni.",
      application:
        "Ipahayag ang katotohanan sa Diyos at, kapag matalino, sa isang pinagkakatiwalaang tao na maaaring manalangin, suportahan ka, at tumulong sa iyo na maging mapanagutan.",
    },
    "1 Thessalonians 4:3-5": {
      principle: "Ang kabanalan ay natututo sa pamamagitan ng pagpaparangal sa Diyos sa katawan at pagtanggi sa nababago ng pagnanasa.",
      context:
        "Tinatawagan ni Pablo ang mga mananampalataya tungo sa kabanalan, pagpipigil sa sarili, at isang naiibang paraan ng paggamit ng pagnanasa kumpara sa kulturang nakapaligid sa kanila.",
      application:
        "Ang kadalisayan ay hindi lamang pag-iwas; ito rin ay isang positibong anyo ng mga hangganan, pagpipigil sa sarili, at pagpaparangal sa Diyos sa iyong nakikita, nahahawakan, at iniisip.",
    },
    "1 Corinthians 10:13": {
      principle: "Ang tukso ay tunay, ngunit nagbibigay rin ang Diyos ng paraan ng pagtakas at kakayahang lumaban.",
      context:
        "Tinitiyak ni Pablo sa mga mananampalataya na ang tukso ay hindi natatangi, hindi imposibleng tiisin, at hindi hiwalay sa tapat na tulong ng Diyos.",
      application:
        "Hanapin ang paraan ng pagtakas, hindi lamang ang tukso. Ang kalayaan ay kadalasang nangangailangan ng pagbibigay-pangalan sa pattern, pagbabago ng kapaligiran, at pagtanggap ng ibinigay na paraan ng pagtakas.",
    },
  },
  ar: {
    "Matthew 25:14-30": {
      principle: "تُدار الموارد الموكولة بأمانة وشجاعة ومسؤولية.",
      context:
        "تتحدث هذه المثل عن خدام أُوكلت إليهم مسؤولية في غياب السيد، وتُكرّم العمل الأمين لا التخمين أو القلق.",
      application:
        "تعامل مع المال والمهارة والوقت والفرصة باعتبارها موارد موكولة. النمو مهم، وكذلك النية والصبر والاجتهاد والمساءلة.",
    },
    "Proverbs 22:7": {
      principle: "الدَّين يُقلّص الحرية وينبغي التعامل معه بواقعية.",
      context:
        "غالبًا ما تصف الأمثال أنماط الحكمة بدلًا من القواعد القانونية المطلقة. يُسمّي هذا المثل الثقل العلائقي والعملي الذي يمكن أن يخلقه الدَّين.",
      application:
        "قبل الاستدانة، افحص الضرورة وقدرة السداد والضغط النفسي وما إذا كان الالتزام يدعم حسن التدبير.",
    },
    "Philippians 4:11-13": {
      principle: "القناعة تُتعلَّم من خلال التوكل لا من خلال الظروف المثالية.",
      context:
        "يكتب بولس من وسط المشقة ويصف القناعة بوصفها اتكالًا مكتسبًا لا إنكارًا للحاجة الحقيقية.",
      application:
        "يبدأ الاستقرار المالي كثيرًا بتسمية ما يكفي، ومقاومة المقارنة، وبناء عادات تُخفف من التقلبات العاطفية.",
    },
    "Proverbs 15:22": {
      principle: "تصير الخطط أكثر رسوخًا حين تُفحص بمشورة متواضعة.",
      context:
        "تُقدّر أدبيات الحكمة مرارًا القابلية للتعليم والتصحيح والقدرة على طلب وجهات النظر قبل التصرف.",
      application:
        "في القرارات الكبرى المتعلقة بالعمل أو المال أو الأعمال، استعن بأشخاص حكماء وصادقين وغير مرتبطين ماليًا بقرارك.",
    },
    "Luke 14:28": {
      principle: "الفعل الحكيم يحسب الكلفة قبل الالتزام.",
      context:
        "استخدم يسوع صورة بناء برج للتأكيد على التقييم الرصين قبل الالتزام العلني.",
      application:
        "قبل اتخاذ خطوة كبرى في العمل أو الأعمال، حدد الهامش والمقايضات والالتزامات والتوقيت وأصغر تجربة قابلة للرجوع.",
    },
    "2 Corinthians 9:6-8": {
      principle: "العطاء طوعي ومدروس لا مُكرَه ولا مُتكلَّف.",
      context:
        "يدعو بولس إلى العطاء بفرح مع رفض الإلزام. السلوك مهم بقدر ما يُعطى.",
      application:
        "أعطِ عن قناعة وتخطيط لا عن ذنب أو ضغط اجتماعي أو حاجة للتظاهر بالتقوى.",
    },
    "Proverbs 21:5": {
      principle: "التخطيط الدؤوب يؤدي إلى الوفرة؛ والتسرع يؤدي إلى الشُّح.",
      context:
        "يُقابل هذا المثل الاجتهاد الثابت بالتصرف المتسرع ويُحذّر من الاختصارات الاندفاعية.",
      application:
        "تجنب الخطوات المالية التي يقودها الضجيج أو الهلع أو الإلحاح. اكتب الخطة، واختبر الافتراضات، وأعطِ وقتًا للمشورة.",
    },
    "Matthew 6:25-34": {
      principle: "التوكل يُقلّص القلق مع إبقاء العمل المسؤول ممكنًا.",
      context:
        "يتناول يسوع القلق والسعي الخاطئ، داعيًا المستمعين إلى طلب ملكوت الله مع العيش يومًا بيوم.",
      application:
        "افصل التخطيط المسؤول عن حلقات القلق. قم بالفعل الأمين التالي ثم ارفض استعراض كل سيناريو بالغ السوء.",
    },
    "Psalm 51:10-12": {
      principle: "يمكن استعادة قلب طاهر وروح راسخة بعد السقوط.",
      context:
        "يصلي داود بعد الانهيار الأخلاقي. لا يطلب الغفران فحسب، بل التجديد الداخلي والفرح الذي يُعيده الله.",
      application:
        "حين تسقط، ابدأ بالتوبة الصادقة لا بالتبرير. اطلب من الله أن يجدد قلبك ويساعدك على اتخاذ الخطوة الصادقة التالية.",
    },
    "James 5:16": {
      principle: "الاعتراف والصلاة يفتحان الطريق نحو الشفاء وعودة الأمانة.",
      context:
        "يربط يعقوب الاعتراف بالصلاة والشفاء، مُظهرًا أن الكفاح الخفي كثيرًا ما يُضعفنا وأن الصدق يمكن أن يبدأ الترميم.",
      application:
        "اعترف بالحق أمام الله، وحين يكون ذلك حكيمًا، أمام شخص موثوق يمكنه الصلاة والدعم والمساعدة في المحاسبة.",
    },
    "1 Thessalonians 4:3-5": {
      principle: "تُكتسب القداسة بتكريم الله بالجسد ورفض الرغبة المنحرفة.",
      context:
        "يدعو بولس المؤمنين إلى التقديس والضبط الذاتي وطريقة مختلفة في استخدام الرغبة أمام الثقافة المحيطة بهم.",
      application:
        "الطهارة ليست مجرد تجنب؛ إنها أيضًا شكل إيجابي من الحدود والضبط الذاتي وتكريم الله فيما تنظر إليه وتلمسه وتتخيله.",
    },
    "1 Corinthians 10:13": {
      principle: "التجربة حقيقية، لكن الله يوفر أيضًا مخرجًا وقدرة على المقاومة.",
      context:
        "يطمئن بولس المؤمنين بأن التجربة ليست فريدة ولا مستحيلة التحمل ولا منفصلة عن عون الله الأمين.",
      application:
        "ابحث عن المخرج لا عن التجربة فحسب. الحرية تتطلب غالبًا تسمية النمط وتغيير البيئة وقبول المخرج المُقدَّم.",
    },
  },
  hi: {
    "Matthew 25:14-30": {
      principle: "सौंपे गए संसाधनों को विश्वासयोग्यता, साहस और जवाबदेही के साथ सँभाला जाता है।",
      context:
        "यह दृष्टांत उन सेवकों के बारे में है जिन्हें मालिक की अनुपस्थिति में ज़िम्मेदारी सौंपी गई। यह विश्वासयोग्य कार्य की प्रशंसा करता है, न कि अटकलों या चिंता की।",
      application:
        "पैसे, कौशल, समय और अवसर को सौंपे गए संसाधन मानें। विकास महत्वपूर्ण है, लेकिन उद्देश्य, धैर्य, परिश्रम और जवाबदेही भी उतने ही महत्वपूर्ण हैं।",
    },
    "Proverbs 22:7": {
      principle: "कर्ज़ स्वतंत्रता को कम कर सकता है और इसे गंभीरता से लेना चाहिए।",
      context:
        "नीतिवचन अक्सर पूर्ण कानूनी नियमों के बजाय बुद्धि के पैटर्न का वर्णन करते हैं। यह नीतिवचन कर्ज़ के संबंधात्मक और व्यावहारिक बोझ को नाम देता है।",
      application:
        "कर्ज़ लेने से पहले, आवश्यकता, चुकौती क्षमता, भावनात्मक दबाव और यह जाँचें कि क्या दायित्व बुद्धिमान प्रबंधन का समर्थन करता है।",
    },
    "Philippians 4:11-13": {
      principle: "संतोष विश्वास के द्वारा सीखा जाता है, सही परिस्थितियों से नहीं।",
      context:
        "पौलुस कठिनाई में से लिखता है और संतोष को सीखी हुई निर्भरता के रूप में वर्णित करता है, न कि वास्तविक जरूरत के इनकार के रूप में।",
      application:
        "आर्थिक शांति अक्सर पर्याप्त को नाम देने, तुलना का विरोध करने और ऐसी आदतें बनाने से शुरू होती है जो भावनात्मक उतार-चढ़ाव को कम करती हैं।",
    },
    "Proverbs 15:22": {
      principle: "योजनाएँ मज़बूत होती हैं जब उन्हें विनम्र परामर्श से जाँचा जाता है।",
      context:
        "ज्ञान साहित्य बार-बार सिखाने योग्य होने, सुधार और कार्य करने से पहले दृष्टिकोण खोजने की क्षमता को महत्व देता है।",
      application:
        "काम, पैसे या व्यवसाय के बड़े निर्णयों के लिए, ऐसे लोगों को आमंत्रित करें जो बुद्धिमान, ईमानदार हों और आपके निर्णय पर आर्थिक रूप से निर्भर न हों।",
    },
    "Luke 14:28": {
      principle: "बुद्धिमान कार्य प्रतिबद्धता से पहले लागत की गणना करता है।",
      context:
        "यीशु ने सार्वजनिक प्रतिबद्धता से पहले गंभीर मूल्यांकन पर ज़ोर देने के लिए एक मीनार बनाने की छवि का उपयोग किया।",
      application:
        "काम या व्यवसाय में बड़ा कदम उठाने से पहले, मार्जिन, tradeoffs, दायित्व, समय और सबसे छोटा reversible प्रयोग तय करें।",
    },
    "2 Corinthians 9:6-8": {
      principle: "उदारता स्वेच्छा से और सोच-समझकर की जाती है, न कि दबाव में या दिखावे के लिए।",
      context:
        "पौलुस खुशी से देने के लिए आमंत्रित करता है और दबाव को अस्वीकार करता है। रवैया उतना ही महत्वपूर्ण है जितनी राशि।",
      application:
        "दृढ़ विश्वास और योजना के साथ दें, न कि अपराधबोध, सामाजिक दबाव या आध्यात्मिक दिखने की ज़रूरत से।",
    },
    "Proverbs 21:5": {
      principle: "परिश्रमी योजना प्रचुरता की ओर ले जाती है; जल्दबाज़ी कमी की ओर।",
      context:
        "यह नीतिवचन निरंतर परिश्रम और जल्दबाज़ी में किए गए कार्य को आमने-सामने रखता है और आवेगशील shortcuts के विरुद्ध चेतावनी देता है।",
      application:
        "hype, घबराहट या जल्दबाज़ी से प्रेरित वित्तीय कदमों से बचें। योजना लिखें, अनुमानों को परखें और परामर्श के लिए समय दें।",
    },
    "Matthew 6:25-34": {
      principle: "विश्वास चिंताजनक प्रयास को कम करता है पर जिम्मेदार कार्य की अनुमति देता है।",
      context:
        "यीशु चिंता और गलत दिशा में लगाए गए प्रयास को संबोधित करते हैं, श्रोताओं को एक दिन में जीते हुए परमेश्वर के राज्य की खोज करने के लिए बुलाते हैं।",
      application:
        "जिम्मेदार योजना को चिंता के चक्रों से अलग करें। अगला विश्वासयोग्य कदम उठाएँ, फिर हर सबसे बुरे परिदृश्य को बार-बार सोचने से इनकार करें।",
    },
    "Psalm 51:10-12": {
      principle: "गिरने के बाद शुद्ध हृदय और स्थिर आत्मा को पुनर्स्थापित किया जा सकता है।",
      context:
        "दाऊद नैतिक पतन के बाद प्रार्थना करता है। वह केवल क्षमा नहीं माँगता, बल्कि परमेश्वर द्वारा लौटाई गई आंतरिक नवीनता और आनंद माँगता है।",
      application:
        "जब आप गिरें, तो आत्म-बचाव नहीं बल्कि ईमानदार पश्चाताप से शुरू करें। परमेश्वर से माँगें कि वे आपके हृदय को नवीनीकृत करें और आपको अगला सच्चा कदम उठाने में मदद करें।",
    },
    "James 5:16": {
      principle: "पाप स्वीकार करना और प्रार्थना चंगाई और पुनर्स्थापित ईमानदारी का मार्ग खोलती है।",
      context:
        "याकूब पाप स्वीकार को प्रार्थना और चंगाई से जोड़ता है, यह दिखाते हुए कि छिपा हुआ संघर्ष अक्सर हमें कमज़ोर करता है और ईमानदारी मरम्मत शुरू कर सकती है।",
      application:
        "परमेश्वर के सामने सत्य स्वीकार करें और, जब बुद्धिमानी हो, किसी विश्वासयोग्य व्यक्ति के सामने जो प्रार्थना कर सके, सहारा दे सके और जवाबदेही में मदद कर सके।",
    },
    "1 Thessalonians 4:3-5": {
      principle: "पवित्रता शरीर से परमेश्वर का सम्मान करके और विकृत इच्छा को अस्वीकार करके सीखी जाती है।",
      context:
        "पौलुस विश्वासियों को पवित्रता, आत्म-संयम और उनके आस-पास की संस्कृति के विपरीत इच्छा का उपयोग करने के एक अलग तरीके की ओर बुलाता है।",
      application:
        "पवित्रता केवल बचने के बारे में नहीं है; यह सीमाओं, आत्म-संयम और परमेश्वर का उस में सम्मान करने का एक सकारात्मक रूप भी है जो आप देखते, छूते और कल्पना करते हैं।",
    },
    "1 Corinthians 10:13": {
      principle: "परीक्षा वास्तविक है, लेकिन परमेश्वर निकास का रास्ता और प्रतिरोध की क्षमता भी प्रदान करता है।",
      context:
        "पौलुस विश्वासियों को आश्वस्त करता है कि परीक्षा अनोखी नहीं है, सहन करना असंभव नहीं है, और परमेश्वर की विश्वासयोग्य सहायता से परे नहीं है।",
      application:
        "केवल परीक्षा नहीं, निकास का रास्ता खोजें। स्वतंत्रता के लिए अक्सर पैटर्न को नाम देना, वातावरण बदलना और दिए गए निकास को लेना आवश्यक होता है।",
    },
  },
};

const localizedWisdomQuestions: Partial<Record<LanguageCode, Partial<Record<string, string[]>>>> = {
  es: {
    "Matthew 25:14-30": [
      "¿Qué me ha sido confiado realmente ahora?",
      "¿Estoy actuando desde la responsabilidad fiel o desde la comparación?",
      "¿Qué consejo o rendición de cuentas haría esta decisión más sabia?",
    ],
    "Proverbs 22:7": [
      "¿Esta deuda sirve a un propósito claro o calma una presión momentánea?",
      "¿Qué libertad perderé mientras la pago?",
      "¿He hecho visible y realista el plan de pago?",
    ],
    "Philippians 4:11-13": [
      "¿Qué estoy llamando suficiente en esta temporada?",
      "¿Dónde la comparación está distorsionando mi juicio?",
      "¿Qué práctica ayudaría a mi sistema nervioso a bajar el ritmo?",
    ],
    "Proverbs 15:22": [
      "¿Quién puede desafiar mis supuestos sin controlarme?",
      "¿Qué notaría un crítico sabio sobre este plan?",
      "¿Qué seguiría haciendo si nadie aplaudiera la decisión?",
    ],
    "Luke 14:28": [
      "¿Cuál es el costo real si esto tarda el doble?",
      "¿Qué parte de la decisión es reversible?",
      "¿Qué experimento podría revelar la verdad antes de que haga un compromiso mayor?",
    ],
    "2 Corinthians 9:6-8": [
      "¿Este regalo es libre, considerado y sostenible?",
      "¿Mi plan de dar protege tanto la generosidad como la responsabilidad?",
      "¿Qué necesidad se me invita a ver con amor?",
    ],
    "Proverbs 21:5": [
      "¿Qué elegiría si no hubiera urgencia?",
      "¿Sigue siendo sabia esta oportunidad después de una noche de descanso?",
      "¿Qué proceso me protege del impulso?",
    ],
    "Matthew 6:25-34": [
      "¿Cuál es la siguiente acción fiel para hoy?",
      "¿Qué preocupaciones piden planificación y cuáles piden ser soltadas?",
      "¿Qué cambiaría la paz en mi ritmo?",
    ],
    "Psalm 51:10-12": [
      "¿Qué necesito que Dios limpie y renueve en mí?",
      "¿Qué estaría ocultando en vez de confesar?",
      "¿Qué paso honesto abriría la puerta a la restauración?",
    ],
    "James 5:16": [
      "¿Qué verdad necesito sacar a la luz?",
      "¿Quién es suficientemente seguro para escucharme y orar conmigo?",
      "¿Cómo cambiaría mi carga si dejara de cargar esto solo?",
    ],
    "1 Thessalonians 4:3-5": [
      "¿Qué límite haría más concreta mi obediencia hoy?",
      "¿Qué hábito alimenta este deseo desordenado?",
      "¿Cómo puedo honrar a Dios con mi cuerpo y mi atención?",
    ],
    "1 Corinthians 10:13": [
      "¿Dónde está la salida en este momento?",
      "¿Qué cambio de entorno reduciría la tentación?",
      "¿Quién puede ayudarme a ver la puerta de escape antes de quedar abrumado?",
    ],
  },
  fr: {
    "Matthew 25:14-30": [
      "Qu'est-ce qui m'a réellement été confié en ce moment ?",
      "Est-ce que j'agis par responsabilité fidèle ou par comparaison ?",
      "Quel conseil ou quelle redevabilité rendrait cette décision plus sage ?",
    ],
    "Proverbs 22:7": [
      "Cette dette sert-elle un objectif clair ou apaise-t-elle une pression passagère ?",
      "Quelle liberté vais-je perdre pendant le remboursement ?",
      "Ai-je rendu le plan de remboursement visible et réaliste ?",
    ],
    "Philippians 4:11-13": [
      "Qu'est-ce que j'appelle assez en cette saison ?",
      "Où la comparaison déforme-t-elle mon jugement ?",
      "Quelle pratique aiderait mon système nerveux à ralentir ?",
    ],
    "Proverbs 15:22": [
      "Qui peut challenger mes hypothèses sans me contrôler ?",
      "Qu'est-ce qu'un critique sage remarquerait dans ce plan ?",
      "Que ferais-je encore si personne n'applaudissait la décision ?",
    ],
    "Luke 14:28": [
      "Quel est le coût réel si cela prend deux fois plus de temps ?",
      "Quelle partie de la décision est réversible ?",
      "Quelle expérience pourrait révéler la vérité avant un engagement plus grand ?",
    ],
    "2 Corinthians 9:6-8": [
      "Ce don est-il libre, réfléchi et durable ?",
      "Mon plan de don protège-t-il à la fois la générosité et la responsabilité ?",
      "Quel besoin suis-je invité à voir avec amour ?",
    ],
    "Proverbs 21:5": [
      "Que choisirais-je s'il n'y avait aucune urgence ?",
      "Cette opportunité reste-t-elle sage après une nuit de sommeil calme ?",
      "Quel processus me protège de l'impulsivité ?",
    ],
    "Matthew 6:25-34": [
      "Quelle est l'action fidèle à poser aujourd'hui ?",
      "Quelles inquiétudes demandent un plan, et lesquelles demandent d'être relâchées ?",
      "Qu'est-ce que la paix changerait à mon rythme ?",
    ],
    "Psalm 51:10-12": [
      "Qu'est-ce que j'ai besoin que Dieu purifie et renouvelle en moi ?",
      "Qu'est-ce que je cacherais au lieu de confesser ?",
      "Quel pas honnête ouvrirait la porte à la restauration ?",
    ],
    "James 5:16": [
      "Quelle vérité ai-je besoin de mettre en lumière ?",
      "Qui est suffisamment sûr pour m'écouter et prier avec moi ?",
      "Comment ma charge changerait-elle si je ne portais plus cela seul ?",
    ],
    "1 Thessalonians 4:3-5": [
      "Quelle limite rendrait mon obéissance plus concrète aujourd'hui ?",
      "Quelle habitude nourrit ce désir désordonné ?",
      "Comment puis-je honorer Dieu avec mon corps et mon attention ?",
    ],
    "1 Corinthians 10:13": [
      "Où est la porte de sortie, ici et maintenant ?",
      "Quel changement d'environnement réduirait la tentation ?",
      "Qui peut m'aider à voir l'issue avant que je sois submergé ?",
    ],
  },
  pt: {
    "Matthew 25:14-30": [
      "O que realmente me foi confiado agora?",
      "Estou agindo por responsabilidade fiel ou por comparação?",
      "Que conselho ou prestação de contas tornaria esta decisão mais sábia?",
    ],
    "Proverbs 22:7": [
      "Esta dívida serve a um propósito claro ou apenas alivia uma pressão momentânea?",
      "Que liberdade eu perderei enquanto a pago?",
      "Tornei o plano de pagamento visível e realista?",
    ],
    "Philippians 4:11-13": [
      "O que estou chamando de suficiente nesta temporada?",
      "Onde a comparação está distorcendo meu julgamento?",
      "Que prática ajudaria meu sistema nervoso a desacelerar?",
    ],
    "Proverbs 15:22": [
      "Quem pode desafiar meus pressupostos sem me controlar?",
      "O que um crítico sábio notaria sobre este plano?",
      "O que eu ainda faria se ninguém aplaudisse a decisão?",
    ],
    "Luke 14:28": [
      "Qual é o custo real se isso demorar o dobro?",
      "Que parte da decisão é reversível?",
      "Que experimento poderia revelar a verdade antes de eu assumir um compromisso maior?",
    ],
    "2 Corinthians 9:6-8": [
      "Este presente é livre, cuidadoso e sustentável?",
      "Meu plano de doar protege tanto a generosidade quanto a responsabilidade?",
      "Que necessidade estou sendo convidado a notar com amor?",
    ],
    "Proverbs 21:5": [
      "O que eu escolheria se não houvesse urgência?",
      "Esta oportunidade continua sábia depois de uma noite de descanso?",
      "Que processo me protege do impulso?",
    ],
    "Matthew 6:25-34": [
      "Qual é a próxima ação fiel para hoje?",
      "Quais preocupações pedem planejamento e quais pedem liberação?",
      "O que a paz mudaria no meu ritmo?",
    ],
    "Psalm 51:10-12": [
      "O que preciso que Deus limpe e renove em mim?",
      "O que eu estaria escondendo em vez de confessar?",
      "Que passo honesto abriria espaço para restauração?",
    ],
    "James 5:16": [
      "Que verdade eu preciso trazer à luz?",
      "Quem é seguro o suficiente para me ouvir e orar comigo?",
      "Como meu peso mudaria se eu parasse de carregar isso sozinho?",
    ],
    "1 Thessalonians 4:3-5": [
      "Que limite tornaria minha obediência mais concreta hoje?",
      "Que hábito alimenta esse desejo desordenado?",
      "Como posso honrar a Deus com meu corpo e minha atenção?",
    ],
    "1 Corinthians 10:13": [
      "Onde está a saída neste momento?",
      "Que mudança de ambiente reduziria a tentação?",
      "Quem pode me ajudar a enxergar a saída antes de eu ficar sobrecarregado?",
    ],
  },
  de: {
    "Matthew 25:14-30": [
      "Was ist mir gerade tatsächlich anvertraut worden?",
      "Handle ich aus treuer Verantwortung oder aus Vergleich?",
      "Welcher Rat oder welche Rechenschaft würde diese Entscheidung weiser machen?",
    ],
    "Proverbs 22:7": [
      "Dient diese Schuld einem klaren Zweck oder beruhigt sie nur einen kurzfristigen Druck?",
      "Welche Freiheit verliere ich während der Rückzahlung?",
      "Habe ich den Rückzahlungsplan sichtbar und realistisch gemacht?",
    ],
    "Philippians 4:11-13": [
      "Was nenne ich in dieser Saison genug?",
      "Wo verzerrt der Vergleich mein Urteil?",
      "Welche Praxis würde meinem Nervensystem helfen, langsamer zu werden?",
    ],
    "Proverbs 15:22": [
      "Wer kann meine Annahmen herausfordern, ohne mich zu kontrollieren?",
      "Was würde ein weiser Kritiker an diesem Plan bemerken?",
      "Was würde ich noch tun, wenn niemand die Entscheidung beklatschte?",
    ],
    "Luke 14:28": [
      "Was sind die echten Kosten, wenn das doppelt so lange dauert?",
      "Welcher Teil der Entscheidung ist reversibel?",
      "Welches Experiment könnte die Wahrheit zeigen, bevor ich mich größer verpflichte?",
    ],
    "2 Corinthians 9:6-8": [
      "Ist dieses Geschenk frei, bedacht und tragfähig?",
      "Schützt mein Gebeplan sowohl Großzügigkeit als auch Verantwortung?",
      "Welches Bedürfnis werde ich eingeladen, in Liebe zu sehen?",
    ],
    "Proverbs 21:5": [
      "Wofür würde ich mich entscheiden, wenn es keinen Druck gäbe?",
      "Ist diese Gelegenheit nach einer ruhigen Nacht immer noch weise?",
      "Welcher Prozess schützt mich vor Impuls?",
    ],
    "Matthew 6:25-34": [
      "Was ist heute der treue nächste Schritt?",
      "Welche Sorgen brauchen Planung und welche brauchen Loslassen?",
      "Was würde Frieden an meinem Tempo ändern?",
    ],
    "Psalm 51:10-12": [
      "Was muss Gott in mir reinigen und erneuern?",
      "Was würde ich eher verbergen als bekennen?",
      "Welcher ehrliche Schritt würde Wiederherstellung ermöglichen?",
    ],
    "James 5:16": [
      "Welche Wahrheit muss ans Licht kommen?",
      "Wer ist sicher genug, um mir zuzuhören und mit mir zu beten?",
      "Wie würde sich meine Last ändern, wenn ich das nicht mehr allein trüge?",
    ],
    "1 Thessalonians 4:3-5": [
      "Welche Grenze würde meinen Gehorsam heute konkreter machen?",
      "Welche Gewohnheit nährt dieses ungeordnete Verlangen?",
      "Wie kann ich Gott mit meinem Körper und meiner Aufmerksamkeit ehren?",
    ],
    "1 Corinthians 10:13": [
      "Wo ist hier der Ausweg?",
      "Welche Veränderung der Umgebung würde die Versuchung verringern?",
      "Wer kann mir helfen, den Ausweg zu sehen, bevor ich überfordert bin?",
    ],
  },
  yo: {
    "Matthew 25:14-30": [
      "Kí ni a fi lé mi lọwọ gidi ní báyìí?",
      "Ṣé mo ń ṣiṣẹ́ láti inú ojúṣe olóòtítọ́ tàbí láti inú fífi ara wé ẹlòmíì?",
      "Ìmọ̀ràn tàbí ìjábọ̀ wo ni yóò mú ipinnu yìí jẹ́ ọgbọ́n síi?",
    ],
    "Proverbs 22:7": [
      "Ṣé gbèsè yìí ń ṣiṣẹ́ fún ìdí tó mọ́ tàbí ó kan ń tù mí nínú ní asiko kúkúrú?",
      "Òmìnira wo ni mo máa padanu nígbà tí mo ń san án?",
      "Ṣé mo ti fi ètò sísan hàn gbangba, ó sì dáa?",
    ],
    "Philippians 4:11-13": [
      "Kí ni mo ń pè ní ohun tó tó ní àkókò yìí?",
      "Níbo ni fífi ara wé ẹlòmíì ń yí ìdájọ́ mi padà?",
      "Ìṣe wo ni yóò ràn ara mi lọ́wọ́ kí ó dákẹ́?",
    ],
    "Proverbs 15:22": [
      "Ta ni lè pe àwọn àròjinlẹ̀ mi ní ìbéèrè láì ṣàkóso mi?",
      "Kí ni alátìlẹ́yìn ọlọ́gbọ́n yóò rí nínú ètò yìí?",
      "Kí ni màá ṣi ṣe tí kò bá sí ẹni tó yìn ìpinnu náà?",
    ],
    "Luke 14:28": [
      "Kí ni iye gidi rẹ bí èyí bá gba ìgbà méjì?",
      "Apá wo ni ìpinnu yìí lè yí padà?",
      "Ìdánwò wo lè fi òtítọ́ hàn kí n tó ṣe àlùmọ́nì ńlá?",
    ],
    "2 Corinthians 9:6-8": [
      "Ṣé ẹ̀bùn yìí jẹ́ ọ̀fẹ́, tí a ronú lé e lórí, tí ó sì lè tẹ̀síwájú?",
      "Ṣé ètò fífúnni mi ń dáàbò bo ìfẹ́ fúnni àti ojúṣe pọ̀?",
      "Àìní wo ni wọ́n ń pè mí láti rí pẹ̀lú ìfẹ́?",
    ],
    "Proverbs 21:5": [
      "Kí ni màá yan tí kò bá sí ìkánjú?",
      "Ṣé àǹfààní yìí ṣi jẹ́ ọlọ́gbọ́n lẹ́yìn òru ìsinmi?",
      "Ìlànà wo ni yóò dá mi lọ́wọ́ kúrò ní inú kíkankíkan?",
    ],
    "Matthew 6:25-34": [
      "Kí ni ìgbésẹ̀ olóòtítọ́ tó kàn fún òní?",
      "Àníyàn wo ni ń béèrè fún ìṣètò, èwo sì ń béèrè fún ìtú silẹ?",
      "Kí ni àlàáfíà yóò yí padà nínú ìyára mi?",
    ],
    "Psalm 51:10-12": [
      "Kí ni mo nílò kí Ọlọ́run wẹ́, kí ó sì tún ṣe nínú mi?",
      "Kí ni màá ń fi pamọ́ dípò kí n jẹ́wọ́?",
      "Ìgbésẹ̀ olóòtítọ́ wo ló máa ṣí ọ̀nà sí ìmúpadàbọ̀sípò?",
    ],
    "James 5:16": [
      "Òtítọ́ wo ni mo nílò láti mú wá sí ìmọ́lẹ̀?",
      "Ta ni ó dáa tó láti gbọ́ mi, kí ó sì gbàdúrà pẹ̀lú mi?",
      "Báwo ni ẹrù mi ṣe máa yí padà tí mo bá dáwọ́ ríru rẹ̀ nìkan?",
    ],
    "1 Thessalonians 4:3-5": [
      "Ààlà wo ló máa jẹ́ kí ìgbọràn mi túbọ̀ dájú lónìí?",
      "Àṣà wo ni ń fún ìfẹ́ tí kò tọ́ yìí ní agbára?",
      "Báwo ni mo ṣe lè bọlá fún Ọlọ́run pẹ̀lú ara mi àti àfiyèsí mi?",
    ],
    "1 Corinthians 10:13": [
      "Níbo ni ọ̀nà àbáyọ wà ní àsìkò yìí?",
      "Ìyípadà ayíká wo ló máa dín ìdánwò kù?",
      "Ta ni lè ràn mí lọ́wọ́ láti rí àbáyọ kí ìwọ̀n má tó lá mi?",
    ],
  },
  ig: {
    "Matthew 25:14-30": [
      "Gịnị ka e nyere m n'aka n'ezie ugbu a?",
      "Ọ bụ site n'ibu ọrụ kwesiri ntụkwasị obi ka m na-eme ma ọ bụ site n'ịtụnyere onwe m?",
      "Ndụmọdụ ma ọ bụ ịza ajụjụ gịnị ga-eme ka mkpebi a bụrụ nke amamihe karịa?",
    ],
    "Proverbs 22:7": [
      "Ụgwọ a ọ na-arụ ọrụ maka ebumnuche doro anya ma ọ bụ na-agwọ nrụgide obere oge?",
      "Nnwere onwe gịnị ka m ga-atụfu mgbe m na-akwụ ya?",
      "Emela ka usoro ịkwụ ụgwọ pụta ìhè ma nwee ezi uche?",
    ],
    "Philippians 4:11-13": [
      "Gịnị ka m na-akpọ izu oke n'oge a?",
      "Ebee ka ntụnyere na-agbagọ ikpe m?",
      "Omume gịnị ga-enyere ahụ m na uche m belata ọsọ?",
    ],
    "Proverbs 15:22": [
      "Onye nwere ike ịjụ echiche m n'enweghị ịchịkwa m?",
      "Kedu ihe onye na-akatọ nwere amamihe ga-ahụ n'usoro a?",
      "Gịnị ka m ka ga-eme ma ọ bụrụ na ọ dịghị onye kụrụ aka?",
    ],
    "Luke 14:28": [
      "Gịnị bụ ezigbo ọnụ ahịa ma ọ bụrụ na nke a were ugboro abụọ ogologo oge?",
      "Kedu akụkụ nke mkpebi a ka a pụrụ ịtụgharị azụ?",
      "Nnwale gịnị ga-egosi eziokwu tupu m akwe nnukwu nkwekọrịta?",
    ],
    "2 Corinthians 9:6-8": [
      "Onyinye a ọ bụ nke n'efu, nke e chere echiche, ma na-adịgide?",
      "Atụmatụ inye m ọ na-echebe ma mmesapụ aka na ibu ọrụ?",
      "Mkpa gịnị ka a na-akpọ m ka m hụ n'anya?",
    ],
    "Proverbs 21:5": [
      "Kedu ihe m ga-ahọrọ ma ọ bụrụ na enweghi nrụgide?",
      "O kwesiri ihe omume a ka ọ bụrụ amamihe mgbe abalị izuike gasịrị?",
      "Usoro gịnị ga-echebe m pụọ na mkpali?",
    ],
    "Matthew 6:25-34": [
      "Gịnị bụ nzọụkwụ kwesịrị ntụkwasị obi nke taa?",
      "Nchegbu gịnị chọrọ atụmatụ, gịnị kwa chọrọ ka e hapụ?",
      "Kedu ihe udo ga-agbanwe na ọsọ m?",
    ],
    "Psalm 51:10-12": [
      "Kedu ihe m chọrọ ka Chineke sachapụ ma megharịa n’ime m?",
      "Gịnị ka m ga-ezobe kama ikwupụta ya?",
      "Kedu nzọụkwụ eziokwu ga-emeghe ụzọ maka nlaghachi?",
    ],
    "James 5:16": [
      "Kedu eziokwu m kwesịrị iweta n’ìhè?",
      "Ònye ka m na-echekwa nke ọma ka ọ nụ m ma kpee ekpere m?",
      "Kedu ka ibu m ga-esi gbanwee ma ọ bụrụ na m kwụsịrị ibu nke a naanị m?",
    ],
    "1 Thessalonians 4:3-5": [
      "Kedu ókè ga-eme ka nrubeisi m bụrụ nke a na-ahụ anya taa?",
      "Kedu omume na-azụ agụụ a na-adịghị edozi?",
      "Kedu ka m ga-esi sọpụrụ Chineke n’ahụ m na n’echiche m?",
    ],
    "1 Corinthians 10:13": [
      "Ebee ka ụzọ mgbapụ dị ugbu a?",
      "Kedu mgbanwe gburugburu ebe obibi ga-eme ka ọnwụnwa belata?",
      "Ònye nwere ike inyere m hụ ụzọ mgbapụ tupu ibu arọ emeri m?",
    ],
  },
  ha: {
    "Matthew 25:14-30": [
      "Me aka damka mani a mini gare yanzu?",
      "Ina aiki daga aminci ne ko daga kwatantawa ne?",
      "Wane shawara ko lissafi zai sa wannan hukunci ya fi hikima?",
    ],
    "Proverbs 22:7": [
      "Bashin nan yana hidima ga manufa mai ma'ana ne ko yana rage matsa lamba ne na lokaci kaɗan?",
      "Wace 'yanci zan rasa yayin biyan sa?",
      "Shin na bayyana tsarin biyan a fili kuma da gaske?",
    ],
    "Philippians 4:11-13": [
      "Me nake kira isa a wannan lokaci?",
      "Ina kwatantawa yake gurɓata hukunci na?",
      "Wace hanya za ta taimaka wa jikina da zuciyata su rage sauri?",
    ],
    "Proverbs 15:22": [
      "Wa zai iya kalubalantar zato na ba tare da sarrafa ni ba?",
      "Mene ne mai hikima zai lura da shi a cikin wannan shiri?",
      "Me zan ci gaba da yi ko da babu wanda ya tafa wa shawarar?",
    ],
    "Luke 14:28": [
      "Menene ainihin kudin idan wannan ya ɗauki ninki biyu?",
      "Wanne ɓangare na shawarar za a iya juyawa?",
      "Wane gwaji zai iya bayyana gaskiya kafin in ɗauki babban alƙawari?",
    ],
    "2 Corinthians 9:6-8": [
      "Shin wannan kyauta tana da 'yanci, tunani, kuma tana dorewa?",
      "Shirin bayarwa na yana kare karimci da alhaki tare?",
      "Wace bukata ake kirana in lura da ita cikin ƙauna?",
    ],
    "Proverbs 21:5": [
      "Me zan zaɓa idan babu gaggawa?",
      "Shin wannan dama har yanzu hikima ce bayan dare mai natsuwa?",
      "Wane tsari ne zai kare ni daga saurin zuciya?",
    ],
    "Matthew 6:25-34": [
      "Wane ne mataki na aminci na yau?",
      "Wadanne damuwa ne ke bukatar shiri, wadanne kuma suna bukatar a sake su?",
      "Menene salama za ta canza a saurin tafiyata?",
    ],
    "Psalm 51:10-12": [
      "Me nake bukata Allah ya tsarkake kuma ya sabunta a cikina?",
      "Me nake ɓoye maimakon in furta?",
      "Wane mataki na gaskiya zai buɗe hanya zuwa warkewa?",
    ],
    "James 5:16": [
      "Wace gaskiya nake bukata in fito da ita fili?",
      "Wa ne ya isa ya saurare ni ya kuma yi addu’a tare da ni?",
      "Ta yaya nauyina zai sauya idan na daina ɗaukar wannan ni kaɗai?",
    ],
    "1 Thessalonians 4:3-5": [
      "Wace iyaka za ta sa biyayyata ta fi bayyane yau?",
      "Wane hali ne ke ciyar da wannan son da bai da tsari?",
      "Ta yaya zan girmama Allah da jikina da hankalina?",
    ],
    "1 Corinthians 10:13": [
      "Ina hanyar fita take a wannan lokacin?",
      "Wane canjin muhalli zai rage gwaji?",
      "Wa zai iya taimaka mini ganin hanyar fita kafin in yi nauyi sosai?",
    ],
  },
  tl: {
    "Matthew 25:14-30": [
      "Ano talaga ang ipinagkatiwala sa akin ngayon?",
      "Kumikilos ba ako mula sa tapat na pananagutan o mula sa paghahambing?",
      "Anong payo o pananagutan ang magpapatalino sa desisyong ito?",
    ],
    "Proverbs 22:7": [
      "Naglilingkod ba ang utang na ito sa malinaw na layunin o pansamantalang ginhawa lang?",
      "Anong kalayaan ang mawawala habang binabayaran ko ito?",
      "Naging malinaw at makatotohanan ba ang plano sa pagbabayad?",
    ],
    "Philippians 4:11-13": [
      "Ano ang tinatawag kong sapat sa panahong ito?",
      "Saan binabaluktot ng paghahambing ang aking paghatol?",
      "Anong gawain ang makakatulong sa aking katawan at isip na bumagal?",
    ],
    "Proverbs 15:22": [
      "Sino ang puwedeng maghamon sa aking palagay nang hindi ako kinokontrol?",
      "Ano ang mapapansin ng isang matalinong kritiko sa planong ito?",
      "Ano ang ipagpapatuloy ko kahit walang pumalakpak sa desisyon?",
    ],
    "Luke 14:28": [
      "Ano ang totoong halaga kung doble ang tagal nito?",
      "Aling bahagi ng desisyon ang puwedeng balikan?",
      "Anong eksperimento ang puwedeng magpakita ng totoo bago ako pumirma sa mas malaking pangako?",
    ],
    "2 Corinthians 9:6-8": [
      "Malaya ba, pinag-isipan ba, at kaya bang panindigan ang regalong ito?",
      "Pinoprotektahan ba ng plano ko sa pagbibigay ang pagkamapagbigay at pananagutan?",
      "Anong pangangailangan ang inaanyayahan akong makita nang may pag-ibig?",
    ],
    "Proverbs 21:5": [
      "Ano ang pipiliin ko kung walang apura?",
      "Matalino pa rin ba ang pagkakataong ito matapos ang isang tahimik na gabi?",
      "Anong proseso ang nagpoprotekta sa akin laban sa padalos-dalos?",
    ],
    "Matthew 6:25-34": [
      "Ano ang susunod na tapat na kilos para sa araw na ito?",
      "Aling mga alalahanin ang humihingi ng plano, at alin ang humihingi ng pagpapakawala?",
      "Ano ang mababago ng kapayapaan sa aking bilis?",
    ],
    "Psalm 51:10-12": [
      "Ano ang gusto kong linisin at baguhin ng Diyos sa akin?",
      "Ano ang tinatago ko sa halip na ikumpisal?",
      "Anong tapat na hakbang ang magbubukas ng daan sa pagpapanumbalik?",
    ],
    "James 5:16": [
      "Anong katotohanan ang iniiwasan kong sabihin?",
      "Sino ang ligtas na makikinig sa akin nang tapat?",
      "Paano bubagaan ang dinadala ko kung itigil kong akuin ito nang mag-isa?",
    ],
    "1 Thessalonians 4:3-5": [
      "Anong hangganan ang magpapalinaw sa pagsunod ko ngayon?",
      "Anong pattern ang nagpapakain sa pagnanasang ito?",
      "Paano ko mapaparangalan ang Diyos sa aking katawan at atensyon?",
    ],
    "1 Corinthians 10:13": [
      "Nasaan ang daan palabas sa sandaling ito?",
      "Anong pagbabago sa kapaligiran ang makababawas sa hatak?",
      "Sino ang makatutulong sa akin na makita ang labasan bago ako lamunin ng bigat?",
    ],
  },
  ar: {
    "Matthew 25:14-30": [
      "ما الذي أُوكل إليّ حقًا الآن؟",
      "هل أتحرك من مسؤولية أمينة أم من مقارنة؟",
      "أي مشورة أو مساءلة ستجعل هذا القرار أكثر حكمة؟",
    ],
    "Proverbs 22:7": [
      "هل يخدم هذا الدَّين غرضًا واضحًا أم يهدئ ضغطًا مؤقتًا؟",
      "ما الحرية التي سأفقدها أثناء سداده؟",
      "هل جعلت خطة السداد واضحة وواقعية؟",
    ],
    "Philippians 4:11-13": [
      "ما الذي أسميه كافيًا في هذه المرحلة؟",
      "أين تشوّه المقارنة حكمي؟",
      "أي ممارسة تساعد جهازَي العصبي على التمهل؟",
    ],
    "Proverbs 15:22": [
      "من يستطيع تحدي افتراضاتي من دون أن يتحكم بي؟",
      "ماذا سيلحظ ناقد حكيم في هذه الخطة؟",
      "ماذا سأواصل فعله لو لم يصفق أحد للقرار؟",
    ],
    "Luke 14:28": [
      "ما الكلفة الحقيقية إذا استغرق الأمر ضعف الوقت؟",
      "أي جزء من القرار قابل للرجوع؟",
      "أي تجربة قد تكشف الحقيقة قبل أن ألتزم أكثر؟",
    ],
    "2 Corinthians 9:6-8": [
      "هل هذه الهدية حرة، مدروسة، وقابلة للاستمرار؟",
      "هل تحمي خطة عطائي الكرم والمسؤولية معًا؟",
      "أي حاجة يُدعوني هذا الموقف إلى ملاحظتها بمحبة؟",
    ],
    "Proverbs 21:5": [
      "ماذا سأختار لو لم توجد عجلة؟",
      "هل ما يزال هذا الخيار حكيمًا بعد ليلة هادئة؟",
      "أي عملية تحميني من الاندفاع؟",
    ],
    "Matthew 6:25-34": [
      "ما الفعل الأمين التالي لهذا اليوم؟",
      "أي هموم تحتاج إلى تخطيط، وأيها تحتاج إلى إطلاق؟",
      "ما الذي سيغيره السلام في وتيرتي؟",
    ],
    "Psalm 51:10-12": [
      "ما الذي أحتاج أن ينقيه الله ويجددّه فيّ؟",
      "ما الذي أخفيه بدل أن أعترف به؟",
      "أي خطوة صادقة تفتح باب الاستعادة؟",
    ],
    "James 5:16": [
      "أي حقيقة أحتاج أن أقولها؟",
      "من الآمن بما يكفي أن يسمعني بصدق؟",
      "كيف ستتغير حملي لو توقفت عن حمل هذا وحدي؟",
    ],
    "1 Thessalonians 4:3-5": [
      "أي حدّ يجعل طاعتي أكثر واقعية اليوم؟",
      "أي نمط يغذي هذه الرغبة؟",
      "كيف أكرم الله بجسدي وانتباهي؟",
    ],
    "1 Corinthians 10:13": [
      "أين المخرج في هذه اللحظة؟",
      "أي تغيير في البيئة يخفف الجذب؟",
      "من يساعدني على رؤية المخرج قبل أن أنهك؟",
    ],
  },
  hi: {
    "Matthew 25:14-30": [
      "अभी वास्तव में मुझे क्या सौंपा गया है?",
      "क्या मैं निष्ठावान ज़िम्मेदारी से काम कर रहा हूँ या तुलना से?",
      "कौन-सी सलाह या जवाबदेही इस निर्णय को और बुद्धिमान बनाएगी?",
    ],
    "Proverbs 22:7": [
      "क्या यह कर्ज़ किसी स्पष्ट उद्देश्य की सेवा कर रहा है या केवल तात्कालिक दबाव कम कर रहा है?",
      "इसे चुकाते समय मैं कौन-सी स्वतंत्रता खोऊँगा?",
      "क्या मैंने चुकौती योजना को स्पष्ट और यथार्थवादी बनाया है?",
    ],
    "Philippians 4:11-13": [
      "इस मौसम में मैं किसे पर्याप्त कह रहा हूँ?",
      "कहाँ तुलना मेरे निर्णय को बिगाड़ रही है?",
      "कौन-सी practice मेरे nervous system को धीमा करने में मदद करेगी?",
    ],
    "Proverbs 15:22": [
      "कौन मेरी धारणाओं को बिना मुझे नियंत्रित किए चुनौती दे सकता है?",
      "इस योजना में एक बुद्धिमान आलोचक क्या देखेगा?",
      "अगर कोई इस निर्णय पर ताली न भी बजाए, तो मैं क्या करता रहूँगा?",
    ],
    "Luke 14:28": [
      "अगर इसमें दोगुना समय लगे तो वास्तविक लागत क्या होगी?",
      "निर्णय का कौन-सा हिस्सा reversible है?",
      "बड़ी प्रतिबद्धता से पहले कौन-सा experiment सत्य उजागर कर सकता है?",
    ],
    "2 Corinthians 9:6-8": [
      "क्या यह भेंट स्वतंत्र, सोची-समझी, और टिकाऊ है?",
      "क्या मेरी देने की योजना उदारता और ज़िम्मेदारी दोनों की रक्षा करती है?",
      "किस ज़रूरत को मुझे प्रेम से देखने के लिए बुलाया जा रहा है?",
    ],
    "Proverbs 21:5": [
      "अगर urgency न हो तो मैं क्या चुनूँगा?",
      "क्या यह अवसर एक शांत रात के बाद भी बुद्धिमान लगता है?",
      "कौन-सी प्रक्रिया मुझे impulsiveness से बचाती है?",
    ],
    "Matthew 6:25-34": [
      "आज के लिए अगला निष्ठावान कदम क्या है?",
      "कौन-सी चिंताएँ योजना माँगती हैं, और कौन-सी छोड़ने की?",
      "शांति मेरी गति में क्या बदल देगी?",
    ],
    "Psalm 51:10-12": [
      "मेरे भीतर परमेश्वर क्या शुद्ध और नया करना चाहते हैं?",
      "मैं क्या छिपा रहा हूँ, स्वीकार करने के बजाय?",
      "कौन-सा ईमानदार कदम पुनर्स्थापन का द्वार खोलेगा?",
    ],
    "James 5:16": [
      "कौन-सा सत्य मुझे बाहर लाना चाहिए?",
      "कौन सुनने और मेरे साथ प्रार्थना करने के लिए सुरक्षित है?",
      "अगर मैं यह भार अकेले उठाना बंद कर दूँ तो मेरा बोझ कैसे बदलेगा?",
    ],
    "1 Thessalonians 4:3-5": [
      "कौन-सी सीमा आज मेरी आज्ञाकारिता को अधिक ठोस बनाएगी?",
      "कौन-सा pattern इस विकृत इच्छा को खिलाता है?",
      "मैं अपने शरीर और ध्यान से परमेश्वर का सम्मान कैसे करूँ?",
    ],
    "1 Corinthians 10:13": [
      "इस क्षण निकास कहाँ है?",
      "कौन-सा वातावरण-परिवर्तन खिंचाव को कम करेगा?",
      "मुझे भारी होने से पहले exit देखने में कौन मदद कर सकता है?",
    ],
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
  const theme = localizedWisdomThemes[preferences.language]?.[entry.theme] ?? entry.theme;
  const questions =
    localized?.questions ??
    localizedWisdomQuestions[preferences.language]?.[canonical] ??
    entry.questions;

  return {
    ...entry,
    theme,
    principle: localized?.principle ?? entry.principle,
    context: localized?.context ?? entry.context,
    application: localized?.application ?? entry.application,
    keywords: localized?.keywords ?? entry.keywords,
    emotions: localized?.emotions ?? entry.emotions,
    questions,
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
  const copy = languageCopy[preferences.language] ?? languageCopy.en!;
  const localizedEntry = localizedWisdomEntry(entry, preferences);
  const practice =
    localizedDailyPractices[preferences.language]?.[mode] ??
    localizedDailyPractices.en?.[mode] ??
    localizedEntry.questions[0];

  return {
    label: copy.dailyLabel,
    theme: localizedEntry.theme,
    scripture: `${localizedScriptureReference(entry.scripture, preferences.language)} (${scriptureDisplayLabel(entry.scripture, preferences)})`,
    principle: localizedEntry.principle,
    practice,
    translationNote: copy.translationFallback,
  };
}

export function localizedWisdomLibraryNote(entry: WisdomEntryData, preferences: UserPreferences) {
  const regionLabel = localizedRegionLabel(preferences.region, preferences.language);
  const translation = scriptureDisplayLabel(entry.scripture, preferences);

  const notes: Partial<Record<LanguageCode, string>> = {
    en: `Use ${entry.scripture} with the ${translation} reference label, then apply it with ${regionLabel} realities in view.`,
    es: `Usa ${entry.scripture} con la referencia ${translation}, y aplica el principio considerando la realidad de ${regionLabel}.`,
    fr: `Utilise ${entry.scripture} avec la référence ${translation}, puis applique le principe dans le contexte de ${regionLabel}.`,
    pt: `Use ${entry.scripture} com a referência ${translation}, aplicando o princípio à realidade de ${regionLabel}.`,
    de: `Nutze ${entry.scripture} mit der Referenz ${translation} und wende das Prinzip im Kontext von ${regionLabel} an.`,
    yo: `Lo ${entry.scripture} pẹ̀lú ìtọ́kasí ${translation}, kí o sì fi sí ìṣe ní agbègbè ${regionLabel}.`,
    ig: `Jiri ${entry.scripture} na ntụaka ${translation}, tinye ụkpụrụ ya n'ọrụ n'ọnọdụ ${regionLabel}.`,
    ha: `Yi amfani da ${entry.scripture} tare da alamar ${translation}, sannan ka aiwatar da ƙa'idar a yanayin ${regionLabel}.`,
  };

  return notes[preferences.language] ?? notes.en ?? `${entry.scripture} (${translation})`;
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
