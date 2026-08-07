"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, Book, Search, Info, Sparkles, Plus, Bookmark, BookmarkCheck, Highlighter, Copy, Share2, Check } from "lucide-react";
import type { BibleTranslation, LanguageCode } from "@/lib/localization";
import { languages, localizedBibleBookName, localizedBookChapterReference, localizedScriptureReference } from "@/lib/localization";
import { buildBibleStudyGuide, type BibleStudyData } from "@/lib/bible-study";
import type { ThemeColors } from "@/lib/themes";

// ──────────────────────────────────────────────
// Book metadata (OT / NT grouping)
// ──────────────────────────────────────────────

const OT_BOOKS = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra",
  "Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon",
  "Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
];

const NT_BOOKS = [
  "Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians",
  "Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians",
  "1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter",
  "1 John","2 John","3 John","Jude","Revelation",
];

const CHAPTER_COUNTS: Record<string, number> = {
  Genesis:50,Exodus:40,Leviticus:27,Numbers:36,Deuteronomy:34,Joshua:24,Judges:21,
  Ruth:4,"1 Samuel":31,"2 Samuel":24,"1 Kings":22,"2 Kings":25,"1 Chronicles":29,
  "2 Chronicles":36,Ezra:10,Nehemiah:13,Esther:10,Job:42,Psalms:150,Proverbs:31,
  Ecclesiastes:12,"Song of Solomon":8,Isaiah:66,Jeremiah:52,Lamentations:5,
  Ezekiel:48,Daniel:12,Hosea:14,Joel:3,Amos:9,Obadiah:1,Jonah:4,Micah:7,
  Nahum:3,Habakkuk:3,Zephaniah:3,Haggai:2,Zechariah:14,Malachi:4,
  Matthew:28,Mark:16,Luke:24,John:21,Acts:28,Romans:16,"1 Corinthians":16,
  "2 Corinthians":13,Galatians:6,Ephesians:6,Philippians:4,Colossians:4,
  "1 Thessalonians":5,"2 Thessalonians":3,"1 Timothy":6,"2 Timothy":4,Titus:3,
  Philemon:1,Hebrews:13,James:5,"1 Peter":5,"2 Peter":3,"1 John":5,"2 John":1,
  "3 John":1,Jude:1,Revelation:22,
};

// ──────────────────────────────────────────────
// Localized labels (minimal, using runtime copy)
// ──────────────────────────────────────────────

type BibleReaderCopy = {
  ot: string;
  nt: string;
  selectBook: string;
  chapter: string;
  verses: string;
  loading: string;
  error: string;
  noChapter: string;
  search: string;
  bookSelectorHelp: string;
  readTab: string;
  studyTab: string;
  studyLoading: string;
  studyError: string;
  studySummary: string;
  studyThemes: string;
  studyRelatedVerses: string;
  studyQuestions: string;
  studyActions: string;
  saveToRuleOfLife: string;
  saved: string;
  closeEquivalentEdition: string;
  via: string;
  tapToChangeBook: string;
  jumpToVerses: string;
  tapToChangePassage: string;
};

const UI: Record<LanguageCode, BibleReaderCopy> = {
  en: { ot: "Old Testament", nt: "New Testament", selectBook: "Select a book", chapter: "Chapter", verses: "verses", loading: "Loading…", error: "Could not load this passage. Please try again.", noChapter: "Chapter not available in this translation.", search: "Search books…", bookSelectorHelp: "Search by English or localized book name, then move between reading and study without losing your place.", readTab: "Read", studyTab: "Study", studyLoading: "Preparing study notes…", studyError: "Could not load study notes. Please try again.", studySummary: "Summary", studyThemes: "Themes", studyRelatedVerses: "Related verses", studyQuestions: "Reflection questions", studyActions: "Practice actions", saveToRuleOfLife: "Save to Rule of Life", saved: "Saved", closeEquivalentEdition: "close equivalent edition", via: "via", tapToChangeBook: "Tap to change book", jumpToVerses: "Jump to verses", tapToChangePassage: "Tap to change passage" },
  es: { ot: "Antiguo Testamento", nt: "Nuevo Testamento", selectBook: "Selecciona un libro", chapter: "Capítulo", verses: "versículos", loading: "Cargando…", error: "No se pudo cargar el pasaje. Inténtalo de nuevo.", noChapter: "Capítulo no disponible en esta traducción.", search: "Buscar libros…", bookSelectorHelp: "Busca por el nombre en inglés o en la forma local, y luego cambia entre lectura y estudio sin perder tu lugar.", readTab: "Lectura", studyTab: "Estudio", studyLoading: "Preparando notas de estudio…", studyError: "No se pudieron cargar las notas de estudio.", studySummary: "Resumen", studyThemes: "Temas", studyRelatedVerses: "Versículos relacionados", studyQuestions: "Preguntas de reflexión", studyActions: "Acciones prácticas", saveToRuleOfLife: "Guardar en mi regla de vida", saved: "Guardado", closeEquivalentEdition: "edición equivalente cercana", via: "vía", tapToChangeBook: "Toca para cambiar de libro", jumpToVerses: "Ir a los versículos", tapToChangePassage: "Toca para cambiar de pasaje" },
  fr: { ot: "Ancien Testament", nt: "Nouveau Testament", selectBook: "Choisir un livre", chapter: "Chapitre", verses: "versets", loading: "Chargement…", error: "Impossible de charger ce passage. Réessaie.", noChapter: "Chapitre non disponible dans cette traduction.", search: "Rechercher un livre…", bookSelectorHelp: "Recherche le nom anglais ou localisé du livre, puis passe entre lecture et étude sans perdre ta place.", readTab: "Lecture", studyTab: "Étude", studyLoading: "Préparation des notes d’étude…", studyError: "Impossible de charger les notes d’étude.", studySummary: "Résumé", studyThemes: "Thèmes", studyRelatedVerses: "Versets liés", studyQuestions: "Questions de réflexion", studyActions: "Actions pratiques", saveToRuleOfLife: "L’ajouter à ma règle de vie", saved: "Enregistré", closeEquivalentEdition: "édition équivalente proche", via: "via", tapToChangeBook: "Touchez pour changer de livre", jumpToVerses: "Aller aux versets", tapToChangePassage: "Touchez pour changer de passage" },
  pt: { ot: "Antigo Testamento", nt: "Novo Testamento", selectBook: "Selecione um livro", chapter: "Capítulo", verses: "versículos", loading: "Carregando…", error: "Não foi possível carregar esta passagem. Tente novamente.", noChapter: "Capítulo não disponível nesta tradução.", search: "Pesquisar livros…", bookSelectorHelp: "Pesquise pelo nome em inglês ou na forma local e alterne entre leitura e estudo sem perder o ponto em que estava.", readTab: "Leitura", studyTab: "Estudo", studyLoading: "Preparando notas de estudo…", studyError: "Não foi possível carregar as notas de estudo.", studySummary: "Resumo", studyThemes: "Temas", studyRelatedVerses: "Versículos relacionados", studyQuestions: "Perguntas de reflexão", studyActions: "Ações práticas", saveToRuleOfLife: "Adicionar à minha regra de vida", saved: "Salvo", closeEquivalentEdition: "edição equivalente próxima", via: "via", tapToChangeBook: "Toque para trocar de livro", jumpToVerses: "Ir para os versículos", tapToChangePassage: "Toque para trocar de passagem" },
  de: { ot: "Altes Testament", nt: "Neues Testament", selectBook: "Buch wählen", chapter: "Kapitel", verses: "Verse", loading: "Laden…", error: "Dieser Abschnitt konnte nicht geladen werden. Bitte versuche es erneut.", noChapter: "Kapitel in dieser Übersetzung nicht verfügbar.", search: "Bücher suchen…", bookSelectorHelp: "Suche nach dem englischen oder lokalisierten Buchnamen und wechsle dann zwischen Lesen und Studium, ohne die Stelle zu verlieren.", readTab: "Lesen", studyTab: "Studium", studyLoading: "Studiennotizen werden vorbereitet…", studyError: "Studiennotizen konnten nicht geladen werden.", studySummary: "Zusammenfassung", studyThemes: "Themen", studyRelatedVerses: "Verwandte Verse", studyQuestions: "Reflexionsfragen", studyActions: "Praktische Schritte", saveToRuleOfLife: "Zur Lebensregel hinzufügen", saved: "Gespeichert", closeEquivalentEdition: "nahezu gleichwertige Ausgabe", via: "über", tapToChangeBook: "Zum Buchwechsel tippen", jumpToVerses: "Zu den Versen springen", tapToChangePassage: "Zum Abschnitt wechseln" },
  yo: { ot: "Majẹmu Laelae", nt: "Majẹmu Tuntun", selectBook: "Yan ìwé kan", chapter: "Ìpíndọ̀", verses: "àwọn ẹsẹ", loading: "Ń gbé eré…", error: "A kò le gba ìpín yìí. Ẹ jọ̀wọ́ gbìyànjú lẹ́ẹ̀kan síi.", noChapter: "Ìpíndọ̀ kò wà nínú ìtumọ̀ yìí.", search: "Wá àwọn ìwé…", bookSelectorHelp: "Wá orúkọ ìwé náà ní èdè Gẹ̀ẹ́sì tàbí nínú fọ́ọ̀mù agbègbè, lẹ́yìn náà yípadà láàárín kíkà àti ìkẹ́kọ̀ọ́ láì pàdánù ibi tí o wà.", readTab: "Kà", studyTab: "Ìkẹ́kọ̀ọ́", studyLoading: "Ń pèsè àkọsílẹ̀ ìkẹ́kọ̀ọ́…", studyError: "A kò le gba àkọsílẹ̀ ìkẹ́kọ̀ọ́.", studySummary: "Àkótán", studyThemes: "Àwọn kókó", studyRelatedVerses: "Àwọn ẹsẹ tó jọra", studyQuestions: "Àwọn ìbéèrè ìronú", studyActions: "Àwọn ìgbésẹ̀ ìṣe", saveToRuleOfLife: "Fi kún ìlànà ìgbésí ayé", saved: "Ti fipamọ́", closeEquivalentEdition: "ẹ̀dà tó sún mọ́ ìbámu", via: "nípasẹ̀", tapToChangeBook: "Fọwọ́ kan láti yí ìwé padà", jumpToVerses: "Lọ sí àwọn ẹsẹ", tapToChangePassage: "Fọwọ́ kan láti yí ìpín padà" },
  ig: { ot: "Akwụkwọ Ochie", nt: "Akwụkwọ Ọhụrụ", selectBook: "Họrọ akwụkwọ", chapter: "Isi", verses: "amaokwu", loading: "Na-ebu…", error: "Enweghị ike ibufe isiakwụkwọ a. Nwaa ọzọ.", noChapter: "Isi ahụ adịghị n'ntụgharị a.", search: "Chọọ akwụkwọ…", bookSelectorHelp: "Chọọ aha akwụkwọ n’asụsụ Bekee ma ọ bụ n’ụdị mpaghara, mgbe ahụ gbanwee n’etiti ịgụ na ọmụmụ n’enweghị mfu ebe ị nọ.", readTab: "Gụọ", studyTab: "Nyocha", studyLoading: "Na-akwadebe ndetu ọmụmụ…", studyError: "Enweghị ike ibufe ndetu ọmụmụ.", studySummary: "Nchịkọta", studyThemes: "Isiokwu", studyRelatedVerses: "Amaokwu metụtara ya", studyQuestions: "Ajụjụ ntụgharị uche", studyActions: "Omume bara uru", saveToRuleOfLife: "Tinye ya n’Iwu Ndụ", saved: "Echekwara", closeEquivalentEdition: "mbipụta nso kwekọrọ", via: "site na", tapToChangeBook: "Pịa ka ị gbanwee akwụkwọ", jumpToVerses: "Laa na amaokwu", tapToChangePassage: "Pịa ka ị gbanwee akụkụ" },
  ha: { ot: "Tsohon Alkawari", nt: "Sabon Alkawari", selectBook: "Zaɓi littafi", chapter: "Sura", verses: "ayoyi", loading: "Ana lodawa…", error: "Ba a iya loda wannan ɗan littafin. Da fatan za a sake gwadawa.", noChapter: "Sura ba ta da wannan fassarar.", search: "Bincika littattafai…", bookSelectorHelp: "Bincika sunan littafin a Turanci ko a sigar yankin, sannan ka sauya tsakanin karatu da nazari ba tare da rasa inda kake ba.", readTab: "Karatu", studyTab: "Nazari", studyLoading: "Ana shirya bayanan nazari…", studyError: "Ba a iya loda bayanan nazari ba.", studySummary: "Taƙaitawa", studyThemes: "Jigo", studyRelatedVerses: "Ayoyi masu alaƙa", studyQuestions: "Tambayoyin tunani", studyActions: "Ayyukan aiwatarwa", saveToRuleOfLife: "Ajiye a ka'idar rayuwa", saved: "An ajiye", closeEquivalentEdition: "bugu mai kusan daidaito", via: "ta", tapToChangeBook: "Taɓa don canza littafi", jumpToVerses: "Tsallaka zuwa ayoyi", tapToChangePassage: "Taɓa don canza nassi" },
  tl: { ot: "Lumang Tipan", nt: "Bagong Tipan", selectBook: "Pumili ng aklat", chapter: "Kabanata", verses: "mga talata", loading: "Naglo-load…", error: "Hindi ma-load ang talatang ito. Pakisubukang muli.", noChapter: "Kabanata ay hindi available sa salin na ito.", search: "Maghanap ng aklat…", bookSelectorHelp: "Maghanap gamit ang pangalan sa Ingles o sa lokal na anyo, pagkatapos ay lumipat sa pagbabasa at pag-aaral nang hindi nawawala ang iyong lugar.", readTab: "Basa", studyTab: "Pag-aaral", studyLoading: "Inihahanda ang study notes…", studyError: "Hindi ma-load ang study notes.", studySummary: "Buod", studyThemes: "Mga Tema", studyRelatedVerses: "Mga kaugnay na talata", studyQuestions: "Mga tanong sa pagninilay", studyActions: "Praktikal na hakbang", saveToRuleOfLife: "I-save sa tuntunin ng buhay", saved: "Na-save", closeEquivalentEdition: "malapit na katumbas na edisyon", via: "sa pamamagitan ng", tapToChangeBook: "I-tap para palitan ang aklat", jumpToVerses: "Lumundag sa mga talata", tapToChangePassage: "I-tap para palitan ang bahagi" },
  ar: { ot: "العهد القديم", nt: "العهد الجديد", selectBook: "اختر كتابًا", chapter: "الإصحاح", verses: "آيات", loading: "جارٍ التحميل…", error: "تعذّر تحميل هذه الفقرة. يرجى المحاولة مرة أخرى.", noChapter: "هذا الإصحاح غير متوفر في هذه الترجمة.", search: "ابحث في الكتب…", bookSelectorHelp: "ابحث باسم الكتاب بالإنجليزية أو بالصيغة المحلية، ثم انتقل بين القراءة والدراسة دون أن تفقد موضعك.", readTab: "قراءة", studyTab: "دراسة", studyLoading: "جارٍ إعداد ملاحظات الدراسة…", studyError: "تعذّر تحميل ملاحظات الدراسة.", studySummary: "ملخص", studyThemes: "الموضوعات", studyRelatedVerses: "آيات ذات صلة", studyQuestions: "أسئلة للتأمل", studyActions: "خطوات عملية", saveToRuleOfLife: "حفظ في قاعدة الحياة", saved: "تم الحفظ", closeEquivalentEdition: "نسخة مكافئة قريبة", via: "عبر", tapToChangeBook: "انقر لتغيير السفر", jumpToVerses: "انتقل إلى الآيات", tapToChangePassage: "انقر لتغيير المقطع" },
  hi: { ot: "पुराना नियम", nt: "नया नियम", selectBook: "एक पुस्तक चुनें", chapter: "अध्याय", verses: "पद", loading: "लोड हो रहा है…", error: "यह अनुच्छेद लोड नहीं हो सका। कृपया पुनः प्रयास करें।", noChapter: "यह अध्याय इस अनुवाद में उपलब्ध नहीं है।", search: "पुस्तकें खोजें…", bookSelectorHelp: "पुस्तक का नाम अंग्रेज़ी या स्थानीय रूप में खोजें, फिर अपनी जगह खोए बिना पढ़ने और अध्ययन के बीच बदलें।", readTab: "पढ़ें", studyTab: "अध्ययन", studyLoading: "अध्ययन नोट तैयार हो रहे हैं…", studyError: "अध्ययन नोट लोड नहीं हो सके।", studySummary: "सार", studyThemes: "विषय", studyRelatedVerses: "संबंधित पद", studyQuestions: "चिंतन प्रश्न", studyActions: "व्यावहारिक कदम", saveToRuleOfLife: "जीवन नियम में सहेजें", saved: "सहेजा गया", closeEquivalentEdition: "निकट समतुल्य संस्करण", via: "के माध्यम से", tapToChangeBook: "पुस्तक बदलने के लिए टैप करें", jumpToVerses: "पदों पर जाएँ", tapToChangePassage: "अनुच्छेद बदलने के लिए टैप करें" },
};

function getUI(language: LanguageCode) {
  return UI[language];
}

const chapterNavLabels: Record<LanguageCode, { previous: string; next: string }> = {
  en: { previous: "Previous chapter", next: "Next chapter" },
  es: { previous: "Capítulo anterior", next: "Capítulo siguiente" },
  fr: { previous: "Chapitre précédent", next: "Chapitre suivant" },
  pt: { previous: "Capítulo anterior", next: "Próximo capítulo" },
  de: { previous: "Vorheriges Kapitel", next: "Nächstes Kapitel" },
  yo: { previous: "Orí kẹ̀hìn", next: "Orí tó kàn" },
  ig: { previous: "Isi gara aga", next: "Isi sochirinụ" },
  ha: { previous: "Sura ta baya", next: "Sura ta gaba" },
  tl: { previous: "Nakaraang kabanata", next: "Susunod na kabanata" },
  ar: { previous: "الإصحاح السابق", next: "الإصحاح التالي" },
  hi: { previous: "पिछला अध्याय", next: "अगला अध्याय" },
};

function chapterNavUi(language: LanguageCode) {
  return chapterNavLabels[language];
}

function localizedBookName(book: string, language: LanguageCode) {
  return localizedBibleBookName(book, language);
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface BibleVerse {
  verse: number;
  text: string;
}

export type ScriptureHighlightColor = "gold" | "rose" | "sky" | "mint";

export type SavedScripture = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  highlight: ScriptureHighlightColor | null;
  savedAt: string;
};

export type ScriptureHighlights = Record<string, ScriptureHighlightColor>;

export function scriptureHighlightKey(book: string, chapter: number, verse: number) {
  return `${book}:${chapter}:${verse}`;
}

const highlightStyles: Record<ScriptureHighlightColor, { color: string }> = {
  gold: { color: "#F6D365" },
  rose: { color: "#F5B7B1" },
  sky: { color: "#AED6F1" },
  mint: { color: "#A9DFBF" },
};

const annotationUi: Record<LanguageCode, { saveVerse: string; highlight: string; copyVerse: string; shareVerse: string; copied: string; shared: string }> = {
  en: { saveVerse: "Save verse", highlight: "Highlight", copyVerse: "Copy verse", shareVerse: "Share verse", copied: "Copied", shared: "Shared" }, es: { saveVerse: "Guardar versículo", highlight: "Resaltar", copyVerse: "Copiar versículo", shareVerse: "Compartir versículo", copied: "Copiado", shared: "Compartido" }, fr: { saveVerse: "Enregistrer le verset", highlight: "Surligner", copyVerse: "Copier le verset", shareVerse: "Partager le verset", copied: "Copié", shared: "Partagé" }, de: { saveVerse: "Vers speichern", highlight: "Markieren", copyVerse: "Vers kopieren", shareVerse: "Vers teilen", copied: "Kopiert", shared: "Geteilt" }, pt: { saveVerse: "Salvar versículo", highlight: "Destacar", copyVerse: "Copiar versículo", shareVerse: "Compartilhar versículo", copied: "Copiado", shared: "Compartilhado" }, yo: { saveVerse: "Fi ẹsẹ pamọ", highlight: "Ṣe afihan", copyVerse: "Da ẹsẹ kọ", shareVerse: "Pin ẹsẹ", copied: "Ti dáakọ", shared: "Ti pín" }, ig: { saveVerse: "Chekwa amaokwu", highlight: "Mee ka ọ pụta ìhè", copyVerse: "Detuo amaokwu", shareVerse: "Kekọrịta amaokwu", copied: "Edetụla", shared: "Ekekọrịtala" }, ha: { saveVerse: "Ajiye aya", highlight: "Haskaka", copyVerse: "Kwafi aya", shareVerse: "Raba aya", copied: "An kwafa", shared: "An raba" }, tl: { saveVerse: "I-save ang talata", highlight: "I-highlight", copyVerse: "Kopyahin ang talata", shareVerse: "Ibahagi ang talata", copied: "Nakopya", shared: "Naibahagi" }, ar: { saveVerse: "حفظ الآية", highlight: "تمييز", copyVerse: "نسخ الآية", shareVerse: "مشاركة الآية", copied: "تم النسخ", shared: "تمت المشاركة" }, hi: { saveVerse: "पद सहेजें", highlight: "हाइलाइट करें", copyVerse: "पद कॉपी करें", shareVerse: "पद साझा करें", copied: "कॉपी किया गया", shared: "साझा किया गया" },
};

interface ChapterData {
  translation: string;
  book: string;
  chapter: number;
  verses: BibleVerse[];
  fallbackTranslation?: string;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

interface BibleReaderProps {
  preferences: { language: LanguageCode; bibleTranslation: BibleTranslation };
  theme: ThemeColors;
  initialBook?: string;
  initialChapter?: number;
  onSaveStudyAction?: (action: string) => void;
  savedScriptures?: SavedScripture[];
  scriptureHighlights?: ScriptureHighlights;
  onSaveScripture?: (scripture: Omit<SavedScripture, "id" | "savedAt">) => void;
  onRemoveSavedScripture?: (id: string) => void;
  onSetScriptureHighlight?: (book: string, chapter: number, verse: number, highlight: ScriptureHighlightColor | null) => void;
  onCopyScripture?: (book: string, chapter: number, verse: number, text: string) => Promise<boolean>;
  onShareScripture?: (book: string, chapter: number, verse: number, text: string) => Promise<boolean>;
}

export default function BibleReader({ preferences, theme, initialBook, initialChapter, onSaveStudyAction, savedScriptures = [], scriptureHighlights = {}, onSaveScripture, onRemoveSavedScripture, onSetScriptureHighlight, onCopyScripture, onShareScripture }: BibleReaderProps) {
  const ui = getUI(preferences.language);
  const annotations = annotationUi[preferences.language];
  const chapterUi = chapterNavUi(preferences.language);
  const isRtl = preferences.language === "ar";
  const showCloseEquivalentEditionNote = ["YOR1900", "IGB1913", "HAU1932"].includes(preferences.bibleTranslation);
  const [activeTab, setActiveTab] = useState<"read" | "study">("read");

  const [bookSearch, setBookSearch] = useState("");
  const [selectedBook, setSelectedBook] = useState<string>(initialBook ?? "");
  const [selectedChapter, setSelectedChapter] = useState<number>(initialChapter ?? 1);
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [studyData, setStudyData] = useState<BibleStudyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [studyLoading, setStudyLoading] = useState(false);
  const [error, setError] = useState<"load" | "notfound" | null>(null);
  const [studyError, setStudyError] = useState(false);
  const [savedActionId, setSavedActionId] = useState<string | null>(null);
  const [showBookSelector, setShowBookSelector] = useState(!initialBook);
  const [showQuickNav, setShowQuickNav] = useState(false);
  const [verseActionFeedback, setVerseActionFeedback] = useState<{ key: string; kind: "copy" | "share" } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const studyAbortRef = useRef<AbortController | null>(null);
  const verseRefs = useRef<Record<string, HTMLElement | null>>({});
  const chapterControlsRef = useRef<HTMLDivElement | null>(null);
  const verseSelectorRef = useRef<HTMLDivElement | null>(null);
  const verseRailRef = useRef<HTMLDivElement | null>(null);

  const chapterCount = selectedBook ? (CHAPTER_COUNTS[selectedBook] ?? 1) : 1;
  const chapterTitle = selectedBook ? `${localizedBookName(selectedBook, preferences.language)} ${selectedChapter}` : "";
  const languageLabel = languages[preferences.language]?.nativeName ?? preferences.language;
  const localStudyData = useMemo(() => {
    if (!chapterData) {
      return null;
    }

    return buildBibleStudyGuide(chapterData, {
      language: preferences.language,
      bibleTranslation: preferences.bibleTranslation,
    });
  }, [chapterData, preferences.language, preferences.bibleTranslation]);
  const displayedStudyData = studyData ?? localStudyData;
  const verseCountLabel = chapterData ? `${chapterData.verses.length} ${ui.verses}` : ui.loading;
  const tapToChangeBook = ui.tapToChangeBook;
  const jumpToVerses = ui.jumpToVerses;
  const tapToChangePassage = ui.tapToChangePassage;

  const loadChapter = useCallback(async (book: string, chapter: number) => {
    if (!book) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    setChapterData(null);

    try {
      const res = await fetch(
        `/api/bible?translation=${encodeURIComponent(preferences.bibleTranslation)}&book=${encodeURIComponent(book)}&chapter=${chapter}`,
        { signal: ctrl.signal }
      );
      if (ctrl.signal.aborted) return;
      if (res.status === 404) { setError("notfound"); setLoading(false); return; }
      if (!res.ok) { setError("load"); setLoading(false); return; }
      const data: ChapterData = await res.json();
      setChapterData(data);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError("load");
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [preferences.bibleTranslation]);

  const loadStudy = useCallback(async (book: string, chapter: number) => {
    if (!book) return;
    studyAbortRef.current?.abort();
    const ctrl = new AbortController();
    studyAbortRef.current = ctrl;

    setStudyLoading(true);
    setStudyError(false);
    setStudyData(null);

    try {
      const res = await fetch(
        `/api/bible-study?translation=${encodeURIComponent(preferences.bibleTranslation)}&book=${encodeURIComponent(book)}&chapter=${chapter}&language=${encodeURIComponent(preferences.language)}`,
        { signal: ctrl.signal }
      );
      if (ctrl.signal.aborted) return;
      if (!res.ok) {
        setStudyError(true);
        setStudyLoading(false);
        return;
      }
      const data: BibleStudyData = await res.json();
      setStudyData(data);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setStudyError(true);
    } finally {
      if (!ctrl.signal.aborted) setStudyLoading(false);
    }
  }, [preferences.bibleTranslation, preferences.language]);

  useEffect(() => {
    if (!selectedBook) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        loadChapter(selectedBook, selectedChapter);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedBook, selectedChapter, loadChapter]);

  useEffect(() => {
    if (!selectedBook || activeTab !== "study") {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        loadStudy(selectedBook, selectedChapter);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedBook, selectedChapter, activeTab, loadStudy]);

  function selectBook(book: string) {
    setSelectedBook(book);
    setSelectedChapter(1);
    setSavedActionId(null);
    setShowBookSelector(false);
    setBookSearch("");
    setActiveTab("read");
  }

  function openRelatedVerse(scripture: string) {
    const match = scripture.match(/^(.+?)\s+(\d+):\d+(?:-\d+)?$/);
    if (!match) {
      return;
    }

    setSelectedBook(match[1]);
    setSelectedChapter(Number(match[2]));
    setSavedActionId(null);
    setShowBookSelector(false);
    setActiveTab("read");
  }

  const scrollToVerse = useCallback((verse: number) => {
    const target = verseRefs.current[String(verse)];
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const scrollToVerseRail = useCallback(() => {
    verseSelectorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
  const setVerseRef = useCallback((verse: number, node: HTMLElement | null) => {
    if (node) {
      verseRefs.current[String(verse)] = node;
      return;
    }
    delete verseRefs.current[String(verse)];
  }, []);

  useEffect(() => {
    if (!chapterControlsRef.current || showBookSelector || !chapterData || activeTab !== "read") {
      setShowQuickNav(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowQuickNav(!entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    observer.observe(chapterControlsRef.current);
    return () => observer.disconnect();
  }, [activeTab, chapterData, showBookSelector, selectedBook, selectedChapter]);

  const normalizedBookSearch = bookSearch.toLowerCase();
  const matchesBookSearch = (book: string) => {
    const localized = localizedBookName(book, preferences.language).toLowerCase();
    return book.toLowerCase().includes(normalizedBookSearch) || localized.includes(normalizedBookSearch);
  };
  const filteredOT = OT_BOOKS.filter(matchesBookSearch);
  const filteredNT = NT_BOOKS.filter(matchesBookSearch);
  const localizeStudyCitation = (reference: string) => localizedScriptureReference(reference, preferences.language);

  const showStudyLoadingState = studyLoading && !displayedStudyData;
  const showStudyErrorState = studyError && !displayedStudyData;

  // ── Book selector pane ──────────────────────
  if (showBookSelector) {
    return (
      <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
        <section className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: theme.borderLight, background: `linear-gradient(180deg, ${theme.bgCardElevated}, ${theme.bgCard})` }}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em]" style={{ color: theme.accentGold }}>
                {ui.readTab} · {ui.studyTab}
              </p>
              <h2 className="mt-2 text-xl font-semibold sm:text-2xl" style={{ color: theme.textPrimary }}>
                {ui.selectBook}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: theme.textSecondary }}>
                {ui.bookSelectorHelp}
              </p>
            </div>
            <div className="grid size-9 shrink-0 place-items-center self-start rounded-xl border sm:size-11 sm:rounded-2xl" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.primary }}>
              <Book size={16} className="sm:hidden" />
              <Book size={18} className="hidden sm:block" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {languageLabel}
            </span>
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {preferences.bibleTranslation}
            </span>
          </div>
        </section>

        <div className="flex items-center gap-2 rounded-2xl border px-3 py-2.5 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
          <Search size={15} style={{ color: theme.textSecondary }} aria-hidden="true" />
          <input
            className="bible-reader-field flex-1 appearance-none bg-transparent text-sm outline-none placeholder:opacity-60"
            style={{ color: theme.textPrimary, backgroundColor: "transparent" }}
            placeholder={ui.search}
            value={bookSearch}
            onChange={(e) => setBookSearch(e.target.value)}
          />
        </div>

        {filteredOT.length > 0 && (
          <section className="space-y-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textSecondary }}>{ui.ot}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filteredOT.map((book) => (
                <button
                  key={book}
                  onClick={() => selectBook(book)}
                  className="rounded-2xl border px-3 py-3 text-left text-sm leading-5 transition hover:-translate-y-px hover:shadow-sm active:scale-[0.99]"
                  style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textPrimary }}
                >
                  {localizedBookName(book, preferences.language)}
                </button>
              ))}
            </div>
          </section>
        )}

        {filteredNT.length > 0 && (
          <section className="space-y-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textSecondary }}>{ui.nt}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filteredNT.map((book) => (
                <button
                  key={book}
                  onClick={() => selectBook(book)}
                  className="rounded-2xl border px-3 py-3 text-left text-sm leading-5 transition hover:-translate-y-px hover:shadow-sm active:scale-[0.99]"
                  style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textPrimary }}
                >
                  {localizedBookName(book, preferences.language)}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ── Chapter reader pane ─────────────────────
  return (
    <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <section className="rounded-[1.5rem] border p-4 shadow-sm sm:p-6" style={{ borderColor: theme.borderLight, background: `linear-gradient(180deg, ${theme.bgCardElevated}, ${theme.bgCard})` }}>
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[1.35rem] font-semibold tracking-[-0.03em] leading-tight sm:text-[1.85rem]" style={{ color: theme.textPrimary }}>
              {chapterTitle || ui.selectBook}
            </h2>
            <p className="mt-1 text-[0.72rem] font-medium uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
              {tapToChangeBook}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.15em]">
              <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                {verseCountLabel}
              </span>
              <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                {languageLabel}
              </span>
              <span className="inline-flex items-center rounded-full border px-2.5 py-1" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                {preferences.bibleTranslation}
              </span>
              {showCloseEquivalentEditionNote ? (
                <span
                  className="inline-flex items-center justify-center rounded-full border p-1"
                  style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
                  title={ui.closeEquivalentEdition}
                  aria-label={ui.closeEquivalentEdition}
                >
                  <Info size={10} aria-hidden="true" />
                </span>
              ) : null}
              {chapterData?.fallbackTranslation ? (
                <span
                  className="inline-flex items-center rounded-full border px-3 py-1"
                  style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
                  title={`${ui.via} ${chapterData.fallbackTranslation}`}
                >
                  {ui.via} {chapterData.fallbackTranslation}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div ref={chapterControlsRef} className="mt-4 rounded-[1.45rem] border p-2.5 shadow-[0_14px_28px_rgba(7,10,8,0.10)] backdrop-blur-md sm:mt-5" style={{ borderColor: theme.borderLight, backgroundColor: `color-mix(in srgb, ${theme.bgCardElevated} 92%, transparent)` }}>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)] sm:items-stretch">
            <button
              onClick={() => setShowBookSelector(true)}
              className="inline-flex min-h-14 items-center justify-between gap-3 rounded-[1.35rem] border px-4 py-3 text-left transition duration-200 hover:-translate-y-px hover:shadow-sm active:scale-[0.99]"
              style={{
                borderColor: theme.borderLight,
                backgroundColor: theme.bgCard,
                color: theme.textPrimary,
                boxShadow: `0 10px 20px color-mix(in srgb, ${theme.bgMain} 8%, transparent)`,
              }}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-[0.95rem] border" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.accentGold }}>
                  <Book size={16} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textSecondary }}>
                    {ui.selectBook}
                  </span>
                  <span className="block truncate text-[0.99rem] font-semibold tracking-[-0.01em]" style={{ color: theme.textPrimary }}>
                    {localizedBookName(selectedBook, preferences.language)}
                  </span>
                </span>
              </span>
              <ChevronRight size={16} aria-hidden="true" style={{ flexShrink: 0, color: theme.textMuted }} />
            </button>

            <div
              className="inline-flex min-h-14 items-center gap-1.5 rounded-[1.35rem] border p-1.5 shadow-[0_8px_18px_rgba(7,10,8,0.05)]"
              style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}
            >
              <button
                disabled={selectedChapter <= 1}
                onClick={() => setSelectedChapter((c) => Math.max(1, c - 1))}
                className="grid size-11 place-items-center rounded-[1rem] transition duration-200 hover:-translate-y-px hover:shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={chapterUi.previous}
              >
                <ChevronLeft size={15} style={{ color: theme.textPrimary }} />
              </button>
              <div className="flex min-w-0 flex-1 flex-col px-1">
                <span className="text-[0.64rem] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textSecondary }}>
                  {tapToChangePassage}
                </span>
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(Number(e.target.value))}
                  className="bible-reader-field min-h-8 appearance-none bg-transparent px-0.5 text-[0.96rem] font-semibold outline-none"
                  style={{ color: theme.textPrimary, backgroundColor: "transparent" }}
                  aria-label={ui.chapter}
                >
                  {Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => (
                    <option key={ch} value={ch}>
                      {ui.chapter} {ch}
                    </option>
                  ))}
                </select>
              </div>
              <button
                disabled={selectedChapter >= chapterCount}
                onClick={() => setSelectedChapter((c) => Math.min(chapterCount, c + 1))}
                className="grid size-11 place-items-center rounded-[1rem] transition duration-200 hover:-translate-y-px hover:shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={chapterUi.next}
              >
                <ChevronRight size={15} style={{ color: theme.textPrimary }} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 rounded-[1.4rem] border p-1.5 shadow-[0_10px_24px_rgba(7,10,8,0.06)]" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
        <button
          onClick={() => setActiveTab("read")}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[1.05rem] px-4 py-3 text-[0.75rem] font-semibold tracking-[0.13em] transition duration-200 hover:-translate-y-px active:scale-[0.99]"
          style={{
            backgroundColor: activeTab === "read" ? theme.bgCard : "transparent",
            color: activeTab === "read" ? theme.textPrimary : theme.textSecondary,
            boxShadow: activeTab === "read" ? "0 8px 18px rgba(7,10,8,0.08)" : "none",
          }}
        >
          <Book size={14} aria-hidden="true" />
          {ui.readTab}
        </button>
        <button
          onClick={() => setActiveTab("study")}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[1.05rem] px-4 py-3 text-[0.75rem] font-semibold tracking-[0.13em] transition duration-200 hover:-translate-y-px active:scale-[0.99]"
          style={{
            backgroundColor: activeTab === "study" ? theme.bgCard : "transparent",
            color: activeTab === "study" ? theme.textPrimary : theme.textSecondary,
            boxShadow: activeTab === "study" ? "0 8px 18px rgba(7,10,8,0.08)" : "none",
          }}
        >
          <Sparkles size={14} aria-hidden="true" />
          {ui.studyTab}
        </button>
      </div>

      {activeTab === "read" ? (
        loading && !chapterData ? (
          <div className="rounded-2xl border px-5 py-12 text-center text-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textSecondary }}>
            {ui.loading}
          </div>
        ) : error === "notfound" ? (
          <div
            className="rounded-2xl border p-5 text-sm leading-6"
            style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textSecondary }}
          >
            {ui.noChapter}
          </div>
        ) : error === "load" ? (
          <div
            className="rounded-2xl border p-5 text-sm leading-6"
            style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textSecondary }}
          >
            {ui.error}
          </div>
        ) : chapterData ? (
          <div className="space-y-3.5 pb-36">
            <section ref={verseRailRef} className="rounded-[1.35rem] border p-3.5 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.24em]" style={{ color: theme.accentGold }}>
                  {ui.verses}
                </p>
                <p className="text-[0.68rem] font-medium tracking-[0.04em]" style={{ color: theme.textMuted }}>
                  {localizedBookChapterReference(selectedBook, selectedChapter, preferences.language)}
                </p>
              </div>
              <div ref={verseSelectorRef} className="mt-3.5 flex min-w-0 items-center gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                {chapterData.verses.map((v) => (
                  <button
                    key={v.verse}
                    type="button"
                    onClick={() => scrollToVerse(v.verse)}
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border px-3 text-[0.82rem] font-semibold tracking-[0.02em] transition hover:-translate-y-px hover:shadow-sm"
                    style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                    aria-label={`${ui.chapter} ${selectedChapter}, ${ui.verses} ${v.verse}`}
                  >
                    {v.verse}
                  </button>
                ))}
              </div>
            </section>

            {showQuickNav ? (
              <div className="fixed left-3 bottom-[6.25rem] z-40 sm:left-4 sm:bottom-5">
              <div className="flex flex-col gap-2 rounded-[1.35rem] border p-2 shadow-[0_14px_32px_rgba(7,10,8,0.12)] backdrop-blur-md" style={{ borderColor: theme.borderLight, backgroundColor: `color-mix(in srgb, ${theme.bgCardElevated} 88%, transparent)` }}>
                <button
                  type="button"
                  onClick={() => setShowBookSelector(true)}
                  className="inline-flex size-11 items-center justify-center rounded-[1rem] border transition duration-200 hover:-translate-y-px active:scale-[0.99]"
                  style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard, color: theme.textPrimary }}
                  aria-label={ui.selectBook}
                  title={ui.selectBook}
                >
                  <Book size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={scrollToVerseRail}
                  className="inline-flex size-11 items-center justify-center rounded-[1rem] transition duration-200 hover:-translate-y-px active:scale-[0.99]"
                  style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                  aria-label={jumpToVerses}
                  title={jumpToVerses}
                >
                  <ChevronUp size={15} aria-hidden="true" />
                </button>
              </div>
              </div>
            ) : null}

            {chapterData.verses.map((v, index) => {
                const saved = savedScriptures.find((item) => item.book === selectedBook && item.chapter === selectedChapter && item.verse === v.verse);
                const highlightColor = saved?.highlight ?? scriptureHighlights[scriptureHighlightKey(selectedBook, selectedChapter, v.verse)] ?? null;
                const highlight = highlightColor ? highlightStyles[highlightColor] : null;
                return <article
                  key={v.verse}
                  ref={(node) => setVerseRef(v.verse, node)}
                  id={`verse-${v.verse}`}
                  tabIndex={-1}
                  className="scroll-mt-24 rounded-[1.55rem] border px-4 py-[1.05rem] shadow-[0_10px_22px_rgba(7,10,8,0.05)] sm:px-5 sm:py-5"
                  style={{
                    borderColor: theme.borderLight,
                    background: highlight ? `linear-gradient(180deg, color-mix(in srgb, ${highlight.color} 38%, ${theme.bgCard}), ${theme.bgCard})` : index % 2 === 0
                      ? `linear-gradient(180deg, color-mix(in srgb, ${theme.bgCard} 97%, white 3%), ${theme.bgCard})`
                      : `linear-gradient(180deg, color-mix(in srgb, ${theme.bgCardElevated} 95%, white 5%), ${theme.bgCardElevated})`,
                  }}
                >
                <div className="flex items-start gap-3.5 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => scrollToVerse(v.verse)}
                    className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[0.95rem] border px-3 text-[0.78rem] font-semibold tracking-[0.06em] transition duration-200 hover:-translate-y-px hover:shadow-sm active:scale-[0.98] sm:min-h-12 sm:min-w-12 sm:px-3.5 sm:text-[0.82rem]"
                    style={{
                      borderColor: theme.borderMedium,
                      color: theme.accentGold,
                      backgroundColor: theme.bgInput,
                      boxShadow: `inset 0 1px 0 color-mix(in srgb, white 10%, transparent)`,
                    }}
                    aria-label={`${ui.chapter} ${selectedChapter}, ${ui.verses} ${v.verse}`}
                  >
                    {v.verse}
                  </button>
                  <p className="min-w-0 flex-1 pt-0.5 text-[1rem] leading-[1.9] tracking-[-0.01em] sm:max-w-[38rem] sm:text-[1.06rem] sm:leading-[1.95]" style={{ color: theme.textPrimary }}>
                    {v.text}
                  </p>
                </div>
                {(onSaveScripture || saved || onSetScriptureHighlight || onCopyScripture || onShareScripture) ? <div className="mt-3 flex min-w-0 items-center gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                  {onCopyScripture ? <button type="button" onClick={() => { void onCopyScripture(selectedBook, selectedChapter, v.verse, v.text).then((success) => success && setVerseActionFeedback({ key: scriptureHighlightKey(selectedBook, selectedChapter, v.verse), kind: "copy" })); }} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }} aria-label={annotations.copyVerse} title={annotations.copyVerse}>{verseActionFeedback?.key === scriptureHighlightKey(selectedBook, selectedChapter, v.verse) && verseActionFeedback.kind === "copy" ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}</button> : null}
                  {onShareScripture ? <button type="button" onClick={() => { void onShareScripture(selectedBook, selectedChapter, v.verse, v.text).then((success) => success && setVerseActionFeedback({ key: scriptureHighlightKey(selectedBook, selectedChapter, v.verse), kind: "share" })); }} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }} aria-label={annotations.shareVerse} title={annotations.shareVerse}>{verseActionFeedback?.key === scriptureHighlightKey(selectedBook, selectedChapter, v.verse) && verseActionFeedback.kind === "share" ? <Check size={14} aria-hidden="true" /> : <Share2 size={14} aria-hidden="true" />}</button> : null}
                  {verseActionFeedback?.key === scriptureHighlightKey(selectedBook, selectedChapter, v.verse) ? <span role="status" className="shrink-0 text-xs font-semibold" style={{ color: theme.primary }}>{verseActionFeedback.kind === "copy" ? annotations.copied : annotations.shared}</span> : null}
                  <button type="button" onClick={() => saved ? onRemoveSavedScripture?.(saved.id) : onSaveScripture?.({ book: selectedBook, chapter: selectedChapter, verse: v.verse, text: v.text, highlight: highlightColor })} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}>
                    {saved ? <BookmarkCheck size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}
                    {saved ? ui.saved : annotations.saveVerse}
                  </button>
                  {onSetScriptureHighlight ? <>
                    <span className="inline-flex h-9 shrink-0 items-center gap-1 text-xs" style={{ color: theme.textSecondary }}><Highlighter size={14} aria-hidden="true" /> {annotations.highlight}</span>
                    {(Object.keys(highlightStyles) as ScriptureHighlightColor[]).map((color) => <button key={color} type="button" onClick={() => onSetScriptureHighlight(selectedBook, selectedChapter, v.verse, highlightColor === color ? null : color)} className="size-8 shrink-0 rounded-full border-2" style={{ backgroundColor: highlightStyles[color].color, borderColor: highlightColor === color ? theme.textPrimary : "transparent" }} aria-label={annotations.highlight} title={annotations.highlight} />)}
                  </> : null}
                </div> : null}
              </article>;
            })}
          </div>
        ) : null
      ) : showStudyLoadingState ? (
        <div className="rounded-2xl border px-5 py-12 text-center text-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textSecondary }}>
          {ui.studyLoading}
        </div>
      ) : showStudyErrorState ? (
        <div
          className="rounded-2xl border p-5 text-sm leading-6"
          style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textSecondary }}
        >
          {ui.studyError}
        </div>
      ) : displayedStudyData ? (
        <div className="space-y-4">
          <section className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.accentGold }}>{ui.studySummary}</p>
                <p className="mt-2 text-sm leading-7" style={{ color: theme.textPrimary }}>{displayedStudyData.summary}</p>
              </div>
              {displayedStudyData.fallbackTranslation ? (
                <span
                  className="inline-flex w-fit max-w-full items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] leading-4 sm:ml-2"
                  style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
                  title={`${ui.via} ${displayedStudyData.fallbackTranslation}`}
                >
                  {ui.via} {displayedStudyData.fallbackTranslation}
                </span>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
            <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.accentGold }}>
              {ui.studyRelatedVerses}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {displayedStudyData.relatedVerses.map((related) => (
                <button
                  key={related.canonicalScripture}
                  type="button"
                  onClick={() => openRelatedVerse(related.canonicalScripture)}
                  className="group rounded-2xl border p-3 text-left transition hover:-translate-y-px hover:shadow-sm"
                  style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="min-w-0 break-words text-sm font-semibold leading-6 group-hover:underline group-hover:underline-offset-4" style={{ color: theme.textPrimary }}>
                      {related.reference}
                    </p>
                    <span className="inline-flex w-fit max-w-full shrink-0 rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] leading-4 sm:ml-2" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard, color: theme.textSecondary }}>
                      {related.theme}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                    {related.principle}
                  </p>
                  <p className="mt-2 text-xs leading-5" style={{ color: theme.textMuted }}>
                    {related.application}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
            <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.accentGold }}>
              {ui.studyThemes}
            </p>
            <div className="grid gap-3">
              {displayedStudyData.themes.map((themeItem, index) => (
                <div key={`${themeItem.title}-${index}`} className="rounded-2xl border p-3.5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{themeItem.title}</p>
                    {themeItem.verseCitations.length ? (
                      <p className="text-xs font-medium" style={{ color: theme.textMuted }}>
                        {themeItem.verseCitations.map(localizeStudyCitation).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>{themeItem.explanation}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
            <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.accentGold }}>
              {ui.studyQuestions}
            </p>
            <div className="space-y-2.5">
              {displayedStudyData.reflectionQuestions.map((question, index) => (
                <div key={`${question}-${index}`} className="rounded-2xl border p-3.5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
                  <p className="text-sm leading-6" style={{ color: theme.textPrimary }}>
                    {index + 1}. {question}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
            <p className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.accentGold }}>
              {ui.studyActions}
            </p>
            <div className="space-y-2.5">
              {displayedStudyData.practiceActions.map((action) => (
                <div key={action.id} className="rounded-2xl border p-3.5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
                  <p className="text-sm leading-6" style={{ color: theme.textPrimary }}>{action.text}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {action.verseCitations.length ? (
                      <span className="text-xs" style={{ color: theme.textMuted }}>{action.verseCitations.map(localizeStudyCitation).join(" · ")}</span>
                    ) : null}
                    {onSaveStudyAction ? (
                      <button
                        onClick={() => {
                          onSaveStudyAction(action.text);
                          setSavedActionId(action.id);
                        }}
                        className="ml-auto inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-px"
                        style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard, color: theme.textPrimary }}
                      >
                        <Plus size={13} />
                        {savedActionId === action.id ? ui.saved : ui.saveToRuleOfLife}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
            <Sparkles size={13} />
            {localizedBookChapterReference(selectedBook, selectedChapter, preferences.language)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
