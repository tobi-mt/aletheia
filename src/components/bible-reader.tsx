"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Book, Search, Info, Sparkles, Plus } from "lucide-react";
import type { BibleTranslation, LanguageCode } from "@/lib/localization";
import { localizedScriptureReference } from "@/lib/localization";
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
  loading: string;
  error: string;
  noChapter: string;
  search: string;
  readTab: string;
  studyTab: string;
  studyLoading: string;
  studyError: string;
  studySummary: string;
  studyThemes: string;
  studyQuestions: string;
  studyActions: string;
  saveToRuleOfLife: string;
  saved: string;
  closeEquivalentEdition: string;
  via: string;
}>> = {
  en: { ot: "Old Testament", nt: "New Testament", selectBook: "Select a book", chapter: "Chapter", loading: "Loading…", error: "Could not load this passage. Please try again.", noChapter: "Chapter not available in this translation.", search: "Search books…", readTab: "Read", studyTab: "Study", studyLoading: "Preparing study notes…", studyError: "Could not load study notes. Please try again.", studySummary: "Summary", studyThemes: "Themes", studyQuestions: "Reflection questions", studyActions: "Practice actions", saveToRuleOfLife: "Save to Rule of Life", saved: "Saved", closeEquivalentEdition: "close equivalent edition", via: "via" },
  es: { ot: "Antiguo Testamento", nt: "Nuevo Testamento", selectBook: "Selecciona un libro", chapter: "Capítulo", loading: "Cargando…", error: "No se pudo cargar el pasaje. Inténtalo de nuevo.", noChapter: "Capítulo no disponible en esta traducción.", search: "Buscar libros…", readTab: "Lectura", studyTab: "Estudio", studyLoading: "Preparando notas de estudio…", studyError: "No se pudieron cargar las notas de estudio.", studySummary: "Resumen", studyThemes: "Temas", studyQuestions: "Preguntas de reflexión", studyActions: "Acciones prácticas", saveToRuleOfLife: "Guardar en mi regla de vida", saved: "Guardado", closeEquivalentEdition: "edición equivalente cercana", via: "vía" },
  fr: { ot: "Ancien Testament", nt: "Nouveau Testament", selectBook: "Choisir un livre", chapter: "Chapitre", loading: "Chargement…", error: "Impossible de charger ce passage. Réessaie.", noChapter: "Chapitre non disponible dans cette traduction.", search: "Rechercher un livre…", readTab: "Lecture", studyTab: "Étude", studyLoading: "Préparation des notes d’étude…", studyError: "Impossible de charger les notes d’étude.", studySummary: "Résumé", studyThemes: "Thèmes", studyQuestions: "Questions de réflexion", studyActions: "Actions pratiques", saveToRuleOfLife: "L’ajouter à ma règle de vie", saved: "Enregistré", closeEquivalentEdition: "édition équivalente proche", via: "via" },
  pt: { ot: "Antigo Testamento", nt: "Novo Testamento", selectBook: "Selecione um livro", chapter: "Capítulo", loading: "Carregando…", error: "Não foi possível carregar esta passagem. Tente novamente.", noChapter: "Capítulo não disponível nesta tradução.", search: "Pesquisar livros…", readTab: "Leitura", studyTab: "Estudo", studyLoading: "Preparando notas de estudo…", studyError: "Não foi possível carregar as notas de estudo.", studySummary: "Resumo", studyThemes: "Temas", studyQuestions: "Perguntas de reflexão", studyActions: "Ações práticas", saveToRuleOfLife: "Adicionar à minha regra de vida", saved: "Salvo", closeEquivalentEdition: "edição equivalente próxima", via: "via" },
  de: { ot: "Altes Testament", nt: "Neues Testament", selectBook: "Buch wählen", chapter: "Kapitel", loading: "Laden…", error: "Dieser Abschnitt konnte nicht geladen werden. Bitte versuche es erneut.", noChapter: "Kapitel in dieser Übersetzung nicht verfügbar.", search: "Bücher suchen…", readTab: "Lesen", studyTab: "Studium", studyLoading: "Studiennotizen werden vorbereitet…", studyError: "Studiennotizen konnten nicht geladen werden.", studySummary: "Zusammenfassung", studyThemes: "Themen", studyQuestions: "Reflexionsfragen", studyActions: "Praktische Schritte", saveToRuleOfLife: "Zur Lebensregel hinzufügen", saved: "Gespeichert", closeEquivalentEdition: "nahezu gleichwertige Ausgabe", via: "über" },
  yo: { ot: "Majẹmu Laelae", nt: "Majẹmu Tuntun", selectBook: "Yan ìwé kan", chapter: "Ìpíndọ̀", loading: "Ń gbé eré…", error: "A kò le gba ìpín yìí. Ẹ jọ̀wọ́ gbìyànjú lẹ́ẹ̀kan síi.", noChapter: "Ìpíndọ̀ kò wà nínú ìtumọ̀ yìí.", search: "Wá àwọn ìwé…", readTab: "Kà", studyTab: "Ìkẹ́kọ̀ọ́", studyLoading: "Ń pèsè àkọsílẹ̀ ìkẹ́kọ̀ọ́…", studyError: "A kò le gba àkọsílẹ̀ ìkẹ́kọ̀ọ́.", studySummary: "Àkótán", studyThemes: "Àwọn kókó", studyQuestions: "Àwọn ìbéèrè ìronú", studyActions: "Àwọn ìgbésẹ̀ ìṣe", saveToRuleOfLife: "Fi kún ìlànà ìgbésí ayé", saved: "Ti fipamọ́", closeEquivalentEdition: "ẹ̀dà tó sún mọ́ ìbámu", via: "nípasẹ̀" },
  ig: { ot: "Akwụkwọ Ochie", nt: "Akwụkwọ Ọhụrụ", selectBook: "Họrọ akwụkwọ", chapter: "Isi", loading: "Na-ebu…", error: "Enweghị ike ibufe isiakwụkwọ a. Nwaa ọzọ.", noChapter: "Isi ahụ adịghị n'ntụgharị a.", search: "Chọọ akwụkwọ…", readTab: "Gụọ", studyTab: "Nyocha", studyLoading: "Na-akwadebe ndetu ọmụmụ…", studyError: "Enweghị ike ibufe ndetu ọmụmụ.", studySummary: "Nchịkọta", studyThemes: "Isiokwu", studyQuestions: "Ajụjụ ntụgharị uche", studyActions: "Omume bara uru", saveToRuleOfLife: "Tinye ya n’Iwu Ndụ", saved: "Echekwara", closeEquivalentEdition: "mbipụta nso kwekọrọ", via: "site na" },
  ha: { ot: "Tsohon Alkawari", nt: "Sabon Alkawari", selectBook: "Zaɓi littafi", chapter: "Sura", loading: "Ana lodawa…", error: "Ba a iya loda wannan ɗan littafin. Da fatan za a sake gwadawa.", noChapter: "Sura ba ta da wannan fassarar.", search: "Bincika littattafai…", readTab: "Karatu", studyTab: "Nazari", studyLoading: "Ana shirya bayanan nazari…", studyError: "Ba a iya loda bayanan nazari ba.", studySummary: "Taƙaitawa", studyThemes: "Jigo", studyQuestions: "Tambayoyin tunani", studyActions: "Ayyukan aiwatarwa", saveToRuleOfLife: "Ajiye a ka'idar rayuwa", saved: "An ajiye", closeEquivalentEdition: "bugu mai kusan daidaito", via: "ta" },
  tl: { ot: "Lumang Tipan", nt: "Bagong Tipan", selectBook: "Pumili ng aklat", chapter: "Kabanata", loading: "Naglo-load…", error: "Hindi ma-load ang talatang ito. Pakisubukang muli.", noChapter: "Kabanata ay hindi available sa salin na ito.", search: "Maghanap ng aklat…", readTab: "Basa", studyTab: "Pag-aaral", studyLoading: "Inihahanda ang study notes…", studyError: "Hindi ma-load ang study notes.", studySummary: "Buod", studyThemes: "Mga Tema", studyQuestions: "Mga tanong sa pagninilay", studyActions: "Praktikal na hakbang", saveToRuleOfLife: "I-save sa tuntunin ng buhay", saved: "Na-save", closeEquivalentEdition: "malapit na katumbas na edisyon", via: "sa pamamagitan ng" },
  ar: { ot: "العهد القديم", nt: "العهد الجديد", selectBook: "اختر كتابًا", chapter: "الإصحاح", loading: "جارٍ التحميل…", error: "تعذّر تحميل هذه الفقرة. يرجى المحاولة مرة أخرى.", noChapter: "هذا الإصحاح غير متوفر في هذه الترجمة.", search: "ابحث في الكتب…", readTab: "قراءة", studyTab: "دراسة", studyLoading: "جارٍ إعداد ملاحظات الدراسة…", studyError: "تعذّر تحميل ملاحظات الدراسة.", studySummary: "ملخص", studyThemes: "الموضوعات", studyQuestions: "أسئلة للتأمل", studyActions: "خطوات عملية", saveToRuleOfLife: "حفظ في قاعدة الحياة", saved: "تم الحفظ", closeEquivalentEdition: "نسخة مكافئة قريبة", via: "عبر" },
  hi: { ot: "पुराना नियम", nt: "नया नियम", selectBook: "एक पुस्तक चुनें", chapter: "अध्याय", loading: "लोड हो रहा है…", error: "यह अनुच्छेद लोड नहीं हो सका। कृपया पुनः प्रयास करें।", noChapter: "यह अध्याय इस अनुवाद में उपलब्ध नहीं है।", search: "पुस्तकें खोजें…", readTab: "पढ़ें", studyTab: "अध्ययन", studyLoading: "अध्ययन नोट तैयार हो रहे हैं…", studyError: "अध्ययन नोट लोड नहीं हो सके।", studySummary: "सार", studyThemes: "विषय", studyQuestions: "चिंतन प्रश्न", studyActions: "व्यावहारिक कदम", saveToRuleOfLife: "जीवन नियम में सहेजें", saved: "सहेजा गया", closeEquivalentEdition: "निकट समतुल्य संस्करण", via: "के माध्यम से" },
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

interface StudyTheme {
  title: string;
  explanation: string;
  verseCitations: string[];
}

interface StudyAction {
  id: string;
  text: string;
  verseCitations: string[];
}

interface ChapterStudyData {
  reference: string;
  translation: string;
  fallbackTranslation?: string;
  summary: string;
  themes: StudyTheme[];
  reflectionQuestions: string[];
  practiceActions: StudyAction[];
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
  const [studyData, setStudyData] = useState<ChapterStudyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [studyLoading, setStudyLoading] = useState(false);
  const [error, setError] = useState<"load" | "notfound" | null>(null);
  const [studyError, setStudyError] = useState(false);
  const [savedActionId, setSavedActionId] = useState<string | null>(null);
  const [showBookSelector, setShowBookSelector] = useState(!initialBook);
  const abortRef = useRef<AbortController | null>(null);
  const studyAbortRef = useRef<AbortController | null>(null);

  const chapterCount = selectedBook ? (CHAPTER_COUNTS[selectedBook] ?? 1) : 1;

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
      const data: ChapterStudyData = await res.json();
      setStudyData(data);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setStudyError(true);
    } finally {
      if (!ctrl.signal.aborted) setStudyLoading(false);
    }
  }, [preferences.bibleTranslation, preferences.language]);

  useEffect(() => {
    if (selectedBook) loadChapter(selectedBook, selectedChapter);
  }, [selectedBook, selectedChapter, loadChapter]);

  useEffect(() => {
    if (selectedBook && activeTab === "study") {
      loadStudy(selectedBook, selectedChapter);
    }
  }, [selectedBook, selectedChapter, activeTab, loadStudy]);

  function selectBook(book: string) {
    setSelectedBook(book);
    setSelectedChapter(1);
    setSavedActionId(null);
    setShowBookSelector(false);
    setBookSearch("");
  }

  const normalizedBookSearch = bookSearch.toLowerCase();
  const matchesBookSearch = (book: string) => {
    const localized = localizedBookName(book, preferences.language).toLowerCase();
    return book.toLowerCase().includes(normalizedBookSearch) || localized.includes(normalizedBookSearch);
  };
  const filteredOT = OT_BOOKS.filter(matchesBookSearch);
  const filteredNT = NT_BOOKS.filter(matchesBookSearch);

  // ── Book selector pane ──────────────────────
  if (showBookSelector) {
    return (
      <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}
        >
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
          <section>
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-widest" style={{ color: theme.textSecondary }}>{ui.ot}</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {filteredOT.map((book) => (
                <button
                  key={book}
                  onClick={() => selectBook(book)}
                  className="rounded-lg border px-2.5 py-2 text-left text-sm transition hover:opacity-80 active:scale-95"
                  style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textPrimary }}
                >
                  {localizedBookName(book, preferences.language)}
                </button>
              ))}
            </div>
          </section>
        )}

        {filteredNT.length > 0 && (
          <section>
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-widest" style={{ color: theme.textSecondary }}>{ui.nt}</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {filteredNT.map((book) => (
                <button
                  key={book}
                  onClick={() => selectBook(book)}
                  className="rounded-lg border px-2.5 py-2 text-left text-sm transition hover:opacity-80 active:scale-95"
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
      {/* Header: book selector button + chapter navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowBookSelector(true)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition hover:opacity-80"
          style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textPrimary }}
        >
          <Book size={15} aria-hidden="true" style={{ flexShrink: 0, color: theme.accentGold }} />
          <span className="truncate">{localizedBookName(selectedBook, preferences.language)}</span>
        </button>

        {/* Chapter selector */}
        <div
          className="flex shrink-0 items-center gap-1 rounded-xl border px-1.5 py-1"
          style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}
        >
          <button
            disabled={selectedChapter <= 1}
            onClick={() => setSelectedChapter((c) => Math.max(1, c - 1))}
            className="rounded-lg p-1.5 transition hover:opacity-70 disabled:opacity-30"
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
              <option key={ch} value={ch}>{ui.chapter} {ch}</option>
            ))}
          </select>
          <button
            disabled={selectedChapter >= chapterCount}
            onClick={() => setSelectedChapter((c) => Math.min(chapterCount, c + 1))}
            className="rounded-lg p-1.5 transition hover:opacity-70 disabled:opacity-30"
            aria-label={chapterUi.next}
          >
            <ChevronRight size={15} style={{ color: theme.textPrimary }} />
          </button>
        </div>
      </div>

      {/* Translation badge */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-widest"
          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
        >
          {preferences.bibleTranslation}
        </span>
        {showCloseEquivalentEditionNote ? (
          <span
            className="inline-flex items-center justify-center rounded-full border p-1"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
            title={ui.closeEquivalentEdition}
            aria-label={ui.closeEquivalentEdition}
          >
            <Info size={12} aria-hidden="true" />
          </span>
        ) : null}
        {chapterData?.fallbackTranslation ? (
          <span
            className="inline-flex items-center rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-widest"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
            title={`${ui.via} ${chapterData.fallbackTranslation}`}
          >
            {ui.via} {chapterData.fallbackTranslation}
          </span>
        ) : null}
      </div>

      {/* Reader/Study tabs */}
      <div className="inline-flex items-center gap-1 rounded-xl border p-1" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
        <button
          onClick={() => setActiveTab("read")}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
          style={{
            backgroundColor: activeTab === "read" ? theme.bgCard : "transparent",
            color: activeTab === "read" ? theme.textPrimary : theme.textSecondary,
          }}
        >
          {ui.readTab}
        </button>
        <button
          onClick={() => setActiveTab("study")}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
          style={{
            backgroundColor: activeTab === "study" ? theme.bgCard : "transparent",
            color: activeTab === "study" ? theme.textPrimary : theme.textSecondary,
          }}
        >
          {ui.studyTab}
        </button>
      </div>

      {/* Content */}
      {activeTab === "read" ? loading ? (
        <div className="py-10 text-center text-sm" style={{ color: theme.textSecondary }}>
          {ui.loading}
        </div>
      ) : error === "notfound" ? (
        <div
          className="rounded-xl border p-5 text-sm leading-6"
          style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textSecondary }}
        >
          {ui.noChapter}
        </div>
      ) : error === "load" ? (
        <div
          className="rounded-xl border p-5 text-sm leading-6"
          style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textSecondary }}
        >
          {ui.error}
        </div>
      ) : chapterData ? (
        <div className="divide-y" style={{ borderColor: theme.borderLight }}>
          {chapterData.verses.map((v) => (
            <div
              key={v.verse}
              className="grid gap-3 py-3.5 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-4 sm:py-4"
            >
              <div
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-semibold"
                style={{ borderColor: theme.borderMedium, color: theme.accentGold }}
              >
                {v.verse}
              </div>
              <p
                className="leading-7 sm:text-[1.01rem] sm:leading-8"
                style={{ color: theme.textPrimary }}
              >
                {v.text}
              </p>
            </div>
          ))}
        </div>
      ) : null : studyLoading ? (
        <div className="py-10 text-center text-sm" style={{ color: theme.textSecondary }}>
          {ui.studyLoading}
        </div>
      ) : studyError ? (
        <div
          className="rounded-xl border p-5 text-sm leading-6"
          style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textSecondary }}
        >
          {ui.studyError}
        </div>
      ) : studyData ? (
        <div className="space-y-4">
          {studyData.fallbackTranslation ? (
            <div className="flex items-center justify-end">
              <span
                className="inline-flex items-center justify-center rounded-full border p-1"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
                title={`${ui.via} ${studyData.fallbackTranslation}`}
                aria-label={`${ui.via} ${studyData.fallbackTranslation}`}
              >
                <Info size={12} aria-hidden="true" />
              </span>
            </div>
          ) : null}

          <section className="rounded-xl border p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-widest" style={{ color: theme.accentGold }}>{ui.studySummary}</p>
            <p className="text-sm leading-7" style={{ color: theme.textPrimary }}>{studyData.summary}</p>
          </section>

          <section className="rounded-xl border p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-widest" style={{ color: theme.accentGold }}>{ui.studyThemes}</p>
            <div className="space-y-3">
              {studyData.themes.map((themeItem, index) => (
                <div key={`${themeItem.title}-${index}`} className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
                  <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{themeItem.title}</p>
                  <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>{themeItem.explanation}</p>
                  {themeItem.verseCitations.length ? (
                    <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>{themeItem.verseCitations.join(" · ")}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-widest" style={{ color: theme.accentGold }}>{ui.studyQuestions}</p>
            <div className="space-y-2">
              {studyData.reflectionQuestions.map((question, index) => (
                <p key={`${question}-${index}`} className="text-sm leading-6" style={{ color: theme.textPrimary }}>{index + 1}. {question}</p>
              ))}
            </div>
          </section>

          <section className="rounded-xl border p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-widest" style={{ color: theme.accentGold }}>{ui.studyActions}</p>
            <div className="space-y-2.5">
              {studyData.practiceActions.map((action) => (
                <div key={action.id} className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
                  <p className="text-sm leading-6" style={{ color: theme.textPrimary }}>{action.text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {action.verseCitations.length ? (
                      <span className="text-xs" style={{ color: theme.textMuted }}>{action.verseCitations.join(" · ")}</span>
                    ) : null}
                    {onSaveStudyAction ? (
                      <button
                        onClick={() => {
                          onSaveStudyAction(action.text);
                          setSavedActionId(action.id);
                        }}
                        className="ml-auto inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold"
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

          <div className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
            <Sparkles size={13} />
            {studyData.reference}
          </div>
        </div>
      ) : null}
    </div>
  );
}
