"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Book, Search, Info, Sparkles, Plus } from "lucide-react";
import type { BibleTranslation, LanguageCode } from "@/lib/localization";
import { languages, localizedBookChapterReference, localizedScriptureReference } from "@/lib/localization";
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

const UI: Partial<Record<LanguageCode, {
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
}>> = {
  en: { ot: "Old Testament", nt: "New Testament", selectBook: "Select a book", chapter: "Chapter", verses: "verses", loading: "Loading…", error: "Could not load this passage. Please try again.", noChapter: "Chapter not available in this translation.", search: "Search books…", bookSelectorHelp: "Search by English or localized book name, then move between reading and study without losing your place.", readTab: "Read", studyTab: "Study", studyLoading: "Preparing study notes…", studyError: "Could not load study notes. Please try again.", studySummary: "Summary", studyThemes: "Themes", studyRelatedVerses: "Related verses", studyQuestions: "Reflection questions", studyActions: "Practice actions", saveToRuleOfLife: "Save to Rule of Life", saved: "Saved", closeEquivalentEdition: "close equivalent edition", via: "via" },
  es: { ot: "Antiguo Testamento", nt: "Nuevo Testamento", selectBook: "Selecciona un libro", chapter: "Capítulo", verses: "versículos", loading: "Cargando…", error: "No se pudo cargar el pasaje. Inténtalo de nuevo.", noChapter: "Capítulo no disponible en esta traducción.", search: "Buscar libros…", bookSelectorHelp: "Busca por el nombre en inglés o en la forma local, y luego cambia entre lectura y estudio sin perder tu lugar.", readTab: "Lectura", studyTab: "Estudio", studyLoading: "Preparando notas de estudio…", studyError: "No se pudieron cargar las notas de estudio.", studySummary: "Resumen", studyThemes: "Temas", studyRelatedVerses: "Versículos relacionados", studyQuestions: "Preguntas de reflexión", studyActions: "Acciones prácticas", saveToRuleOfLife: "Guardar en mi regla de vida", saved: "Guardado", closeEquivalentEdition: "edición equivalente cercana", via: "vía" },
  fr: { ot: "Ancien Testament", nt: "Nouveau Testament", selectBook: "Choisir un livre", chapter: "Chapitre", verses: "versets", loading: "Chargement…", error: "Impossible de charger ce passage. Réessaie.", noChapter: "Chapitre non disponible dans cette traduction.", search: "Rechercher un livre…", bookSelectorHelp: "Recherche le nom anglais ou localisé du livre, puis passe entre lecture et étude sans perdre ta place.", readTab: "Lecture", studyTab: "Étude", studyLoading: "Préparation des notes d’étude…", studyError: "Impossible de charger les notes d’étude.", studySummary: "Résumé", studyThemes: "Thèmes", studyRelatedVerses: "Versets liés", studyQuestions: "Questions de réflexion", studyActions: "Actions pratiques", saveToRuleOfLife: "L’ajouter à ma règle de vie", saved: "Enregistré", closeEquivalentEdition: "édition équivalente proche", via: "via" },
  pt: { ot: "Antigo Testamento", nt: "Novo Testamento", selectBook: "Selecione um livro", chapter: "Capítulo", verses: "versículos", loading: "Carregando…", error: "Não foi possível carregar esta passagem. Tente novamente.", noChapter: "Capítulo não disponível nesta tradução.", search: "Pesquisar livros…", bookSelectorHelp: "Pesquise pelo nome em inglês ou na forma local e alterne entre leitura e estudo sem perder o ponto em que estava.", readTab: "Leitura", studyTab: "Estudo", studyLoading: "Preparando notas de estudo…", studyError: "Não foi possível carregar as notas de estudo.", studySummary: "Resumo", studyThemes: "Temas", studyRelatedVerses: "Versículos relacionados", studyQuestions: "Perguntas de reflexão", studyActions: "Ações práticas", saveToRuleOfLife: "Adicionar à minha regra de vida", saved: "Salvo", closeEquivalentEdition: "edição equivalente próxima", via: "via" },
  de: { ot: "Altes Testament", nt: "Neues Testament", selectBook: "Buch wählen", chapter: "Kapitel", verses: "Verse", loading: "Laden…", error: "Dieser Abschnitt konnte nicht geladen werden. Bitte versuche es erneut.", noChapter: "Kapitel in dieser Übersetzung nicht verfügbar.", search: "Bücher suchen…", bookSelectorHelp: "Suche nach dem englischen oder lokalisierten Buchnamen und wechsle dann zwischen Lesen und Studium, ohne die Stelle zu verlieren.", readTab: "Lesen", studyTab: "Studium", studyLoading: "Studiennotizen werden vorbereitet…", studyError: "Studiennotizen konnten nicht geladen werden.", studySummary: "Zusammenfassung", studyThemes: "Themen", studyRelatedVerses: "Verwandte Verse", studyQuestions: "Reflexionsfragen", studyActions: "Praktische Schritte", saveToRuleOfLife: "Zur Lebensregel hinzufügen", saved: "Gespeichert", closeEquivalentEdition: "nahezu gleichwertige Ausgabe", via: "über" },
  yo: { ot: "Majẹmu Laelae", nt: "Majẹmu Tuntun", selectBook: "Yan ìwé kan", chapter: "Ìpíndọ̀", verses: "àwọn ẹsẹ", loading: "Ń gbé eré…", error: "A kò le gba ìpín yìí. Ẹ jọ̀wọ́ gbìyànjú lẹ́ẹ̀kan síi.", noChapter: "Ìpíndọ̀ kò wà nínú ìtumọ̀ yìí.", search: "Wá àwọn ìwé…", bookSelectorHelp: "Wá orúkọ ìwé náà ní èdè Gẹ̀ẹ́sì tàbí nínú fọ́ọ̀mù agbègbè, lẹ́yìn náà yípadà láàárín kíkà àti ìkẹ́kọ̀ọ́ láì pàdánù ibi tí o wà.", readTab: "Kà", studyTab: "Ìkẹ́kọ̀ọ́", studyLoading: "Ń pèsè àkọsílẹ̀ ìkẹ́kọ̀ọ́…", studyError: "A kò le gba àkọsílẹ̀ ìkẹ́kọ̀ọ́.", studySummary: "Àkótán", studyThemes: "Àwọn kókó", studyRelatedVerses: "Àwọn ẹsẹ tó jọra", studyQuestions: "Àwọn ìbéèrè ìronú", studyActions: "Àwọn ìgbésẹ̀ ìṣe", saveToRuleOfLife: "Fi kún ìlànà ìgbésí ayé", saved: "Ti fipamọ́", closeEquivalentEdition: "ẹ̀dà tó sún mọ́ ìbámu", via: "nípasẹ̀" },
  ig: { ot: "Akwụkwọ Ochie", nt: "Akwụkwọ Ọhụrụ", selectBook: "Họrọ akwụkwọ", chapter: "Isi", verses: "amaokwu", loading: "Na-ebu…", error: "Enweghị ike ibufe isiakwụkwọ a. Nwaa ọzọ.", noChapter: "Isi ahụ adịghị n'ntụgharị a.", search: "Chọọ akwụkwọ…", bookSelectorHelp: "Chọọ aha akwụkwọ n’asụsụ Bekee ma ọ bụ n’ụdị mpaghara, mgbe ahụ gbanwee n’etiti ịgụ na ọmụmụ n’enweghị mfu ebe ị nọ.", readTab: "Gụọ", studyTab: "Nyocha", studyLoading: "Na-akwadebe ndetu ọmụmụ…", studyError: "Enweghị ike ibufe ndetu ọmụmụ.", studySummary: "Nchịkọta", studyThemes: "Isiokwu", studyRelatedVerses: "Amaokwu metụtara ya", studyQuestions: "Ajụjụ ntụgharị uche", studyActions: "Omume bara uru", saveToRuleOfLife: "Tinye ya n’Iwu Ndụ", saved: "Echekwara", closeEquivalentEdition: "mbipụta nso kwekọrọ", via: "site na" },
  ha: { ot: "Tsohon Alkawari", nt: "Sabon Alkawari", selectBook: "Zaɓi littafi", chapter: "Sura", verses: "ayoyi", loading: "Ana lodawa…", error: "Ba a iya loda wannan ɗan littafin. Da fatan za a sake gwadawa.", noChapter: "Sura ba ta da wannan fassarar.", search: "Bincika littattafai…", bookSelectorHelp: "Bincika sunan littafin a Turanci ko a sigar yankin, sannan ka sauya tsakanin karatu da nazari ba tare da rasa inda kake ba.", readTab: "Karatu", studyTab: "Nazari", studyLoading: "Ana shirya bayanan nazari…", studyError: "Ba a iya loda bayanan nazari ba.", studySummary: "Taƙaitawa", studyThemes: "Jigo", studyRelatedVerses: "Ayoyi masu alaƙa", studyQuestions: "Tambayoyin tunani", studyActions: "Ayyukan aiwatarwa", saveToRuleOfLife: "Ajiye a ka'idar rayuwa", saved: "An ajiye", closeEquivalentEdition: "bugu mai kusan daidaito", via: "ta" },
  tl: { ot: "Lumang Tipan", nt: "Bagong Tipan", selectBook: "Pumili ng aklat", chapter: "Kabanata", verses: "mga talata", loading: "Naglo-load…", error: "Hindi ma-load ang talatang ito. Pakisubukang muli.", noChapter: "Kabanata ay hindi available sa salin na ito.", search: "Maghanap ng aklat…", bookSelectorHelp: "Maghanap gamit ang pangalan sa Ingles o sa lokal na anyo, pagkatapos ay lumipat sa pagbabasa at pag-aaral nang hindi nawawala ang iyong lugar.", readTab: "Basa", studyTab: "Pag-aaral", studyLoading: "Inihahanda ang study notes…", studyError: "Hindi ma-load ang study notes.", studySummary: "Buod", studyThemes: "Mga Tema", studyRelatedVerses: "Mga kaugnay na talata", studyQuestions: "Mga tanong sa pagninilay", studyActions: "Praktikal na hakbang", saveToRuleOfLife: "I-save sa tuntunin ng buhay", saved: "Na-save", closeEquivalentEdition: "malapit na katumbas na edisyon", via: "sa pamamagitan ng" },
  ar: { ot: "العهد القديم", nt: "العهد الجديد", selectBook: "اختر كتابًا", chapter: "الإصحاح", verses: "آيات", loading: "جارٍ التحميل…", error: "تعذّر تحميل هذه الفقرة. يرجى المحاولة مرة أخرى.", noChapter: "هذا الإصحاح غير متوفر في هذه الترجمة.", search: "ابحث في الكتب…", bookSelectorHelp: "ابحث باسم الكتاب بالإنجليزية أو بالصيغة المحلية، ثم انتقل بين القراءة والدراسة دون أن تفقد موضعك.", readTab: "قراءة", studyTab: "دراسة", studyLoading: "جارٍ إعداد ملاحظات الدراسة…", studyError: "تعذّر تحميل ملاحظات الدراسة.", studySummary: "ملخص", studyThemes: "الموضوعات", studyRelatedVerses: "آيات ذات صلة", studyQuestions: "أسئلة للتأمل", studyActions: "خطوات عملية", saveToRuleOfLife: "حفظ في قاعدة الحياة", saved: "تم الحفظ", closeEquivalentEdition: "نسخة مكافئة قريبة", via: "عبر" },
  hi: { ot: "पुराना नियम", nt: "नया नियम", selectBook: "एक पुस्तक चुनें", chapter: "अध्याय", verses: "पद", loading: "लोड हो रहा है…", error: "यह अनुच्छेद लोड नहीं हो सका। कृपया पुनः प्रयास करें।", noChapter: "यह अध्याय इस अनुवाद में उपलब्ध नहीं है।", search: "पुस्तकें खोजें…", bookSelectorHelp: "पुस्तक का नाम अंग्रेज़ी या स्थानीय रूप में खोजें, फिर अपनी जगह खोए बिना पढ़ने और अध्ययन के बीच बदलें।", readTab: "पढ़ें", studyTab: "अध्ययन", studyLoading: "अध्ययन नोट तैयार हो रहे हैं…", studyError: "अध्ययन नोट लोड नहीं हो सके।", studySummary: "सार", studyThemes: "विषय", studyRelatedVerses: "संबंधित पद", studyQuestions: "चिंतन प्रश्न", studyActions: "व्यावहारिक कदम", saveToRuleOfLife: "जीवन नियम में सहेजें", saved: "सहेजा गया", closeEquivalentEdition: "निकट समतुल्य संस्करण", via: "के माध्यम से" },
};

function getUI(language: LanguageCode) {
  return UI[language] ?? UI.en!;
}

const chapterNavLabels: Partial<Record<LanguageCode, { previous: string; next: string }>> = {
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
  return chapterNavLabels[language] ?? chapterNavLabels.en!;
}

function localizedBookName(book: string, language: LanguageCode) {
  const localizedReference = localizedScriptureReference(`${book} 1:1`, language);
  const match = localizedReference.match(/^(.+?)\s+1:1$/);
  return match ? match[1] : book;
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface BibleVerse {
  verse: number;
  text: string;
}

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
}

export default function BibleReader({ preferences, theme, initialBook, initialChapter, onSaveStudyAction }: BibleReaderProps) {
  const ui = getUI(preferences.language);
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
  const abortRef = useRef<AbortController | null>(null);
  const studyAbortRef = useRef<AbortController | null>(null);

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
          <div className="flex items-start justify-between gap-3">
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
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl border" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.primary }}>
              <Book size={18} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {languageLabel}
            </span>
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {preferences.bibleTranslation}
            </span>
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {ui.studyRelatedVerses}
            </span>
          </div>
        </section>

        <div className="flex items-center gap-2 rounded-2xl border px-3 py-2.5 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
          <Search size={15} style={{ color: theme.textSecondary }} aria-hidden="true" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-60"
            style={{ color: theme.textPrimary }}
            placeholder={ui.search}
            value={bookSearch}
            onChange={(e) => setBookSearch(e.target.value)}
            autoFocus
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
      <section className="rounded-2xl border p-4 shadow-sm sm:p-5" style={{ borderColor: theme.borderLight, background: `linear-gradient(180deg, ${theme.bgCardElevated}, ${theme.bgCard})` }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em]" style={{ color: theme.accentGold }}>
              {ui.chapter}
            </p>
            <h2 className="mt-2 truncate text-2xl font-semibold sm:text-[2rem]" style={{ color: theme.textPrimary }}>
              {chapterTitle || ui.selectBook}
            </h2>
              <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                {chapterData ? `${chapterData.verses.length} ${ui.verses} · ${languageLabel}` : ui.loading}
              </p>
          </div>
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl border" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.primary }}>
            <Book size={18} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
          >
            {preferences.bibleTranslation}
          </span>
          <span
            className="inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
          >
            {languageLabel}
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
              className="inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
              title={`${ui.via} ${chapterData.fallbackTranslation}`}
            >
              {ui.via} {chapterData.fallbackTranslation}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowBookSelector(true)}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition hover:-translate-y-px hover:shadow-sm"
            style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textPrimary }}
          >
            <Book size={15} aria-hidden="true" style={{ flexShrink: 0, color: theme.accentGold }} />
            <span className="truncate">{localizedBookName(selectedBook, preferences.language)}</span>
          </button>

          <div className="inline-flex items-center gap-1 rounded-full border p-1" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
            <button
              disabled={selectedChapter <= 1}
              onClick={() => setSelectedChapter((c) => Math.max(1, c - 1))}
              className="rounded-full p-1.5 transition hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={chapterUi.previous}
            >
              <ChevronLeft size={15} style={{ color: theme.textPrimary }} />
            </button>
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(Number(e.target.value))}
              className="bg-transparent text-sm outline-none"
              style={{ color: theme.textPrimary }}
              aria-label={ui.chapter}
            >
              {Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => (
                <option key={ch} value={ch}>
                  {ui.chapter} {ch}
                </option>
              ))}
            </select>
            <button
              disabled={selectedChapter >= chapterCount}
              onClick={() => setSelectedChapter((c) => Math.min(chapterCount, c + 1))}
              className="rounded-full p-1.5 transition hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label={chapterUi.next}
            >
              <ChevronRight size={15} style={{ color: theme.textPrimary }} />
            </button>
          </div>
        </div>
      </section>

      <div className="inline-flex items-center gap-1 rounded-2xl border p-1 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
        <button
          onClick={() => setActiveTab("read")}
          className="rounded-xl px-4 py-2 text-xs font-semibold transition"
          style={{
            backgroundColor: activeTab === "read" ? theme.bgCard : "transparent",
            color: activeTab === "read" ? theme.textPrimary : theme.textSecondary,
          }}
        >
          {ui.readTab}
        </button>
        <button
          onClick={() => setActiveTab("study")}
          className="rounded-xl px-4 py-2 text-xs font-semibold transition"
          style={{
            backgroundColor: activeTab === "study" ? theme.bgCard : "transparent",
            color: activeTab === "study" ? theme.textPrimary : theme.textSecondary,
          }}
        >
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
          <div className="space-y-3">
            {chapterData.verses.map((v, index) => (
              <article
                key={v.verse}
                className="rounded-2xl border p-4 shadow-sm"
                style={{
                  borderColor: theme.borderLight,
                  backgroundColor: index % 2 === 0 ? theme.bgCard : theme.bgCardElevated,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[0.7rem] font-semibold"
                    style={{ borderColor: theme.borderMedium, color: theme.accentGold, backgroundColor: theme.bgInput }}
                  >
                    {v.verse}
                  </div>
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
                    {ui.readTab}
                  </span>
                </div>
                <p className="mt-3 text-[1.02rem] leading-8 sm:text-[1.06rem] sm:leading-9" style={{ color: theme.textPrimary }}>
                  {v.text}
                </p>
              </article>
            ))}
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.accentGold }}>{ui.studySummary}</p>
                <p className="mt-2 text-sm leading-7" style={{ color: theme.textPrimary }}>{displayedStudyData.summary}</p>
              </div>
              {displayedStudyData.fallbackTranslation ? (
                <span
                  className="inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em]"
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
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold group-hover:underline group-hover:underline-offset-4" style={{ color: theme.textPrimary }}>
                      {related.reference}
                    </p>
                    <span className="shrink-0 rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard, color: theme.textSecondary }}>
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
