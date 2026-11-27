"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ChevronDown, Search, Info, Sparkles, Plus, Bookmark, BookmarkCheck, Highlighter, Copy, Share2, Check, X, Volume2, Square, ALargeSmall, BookOpen, StickyNote, NotebookPen, Eraser, RotateCcw, Trash2 } from "lucide-react";
import type { BibleTranslation, LanguageCode } from "@/lib/localization";
import { bibleTranslations, localizedBibleBookName, localizedBookChapterReference, localizedScriptureReference } from "@/lib/localization";
import { buildBibleStudyGuide, type BibleStudyData } from "@/lib/bible-study";
import { groupVersesIntoParagraphs } from "@/lib/bible-paragraphs";
import { accessibleAccentText, type ThemeColors } from "@/lib/themes";
import {
  BIBLE_LAST_POSITION_STORAGE_KEY,
  BIBLE_READER_SETTINGS_STORAGE_KEY,
  BIBLE_SELECTION_HINT_STORAGE_KEY,
  MAX_SCRIPTURE_NOTE_LENGTH,
  scriptureHighlightKey,
  type SavedScripture,
  type ScriptureHighlightColor,
  type ScriptureHighlights,
  type ScriptureNote,
} from "@/lib/saved-scripture";

export type { SavedScripture, ScriptureHighlightColor, ScriptureHighlights, ScriptureNote } from "@/lib/saved-scripture";
export { scriptureHighlightKey } from "@/lib/saved-scripture";

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
// Reading experience copy (navigator, settings, selection, notes)
// ──────────────────────────────────────────────

type ReaderExperienceCopy = {
  books: string;
  chapters: string;
  continueReading: string;
  goTo: string;
  backToReading: string;
  noBooksFound: string;
  readingSettings: string;
  textSize: string;
  smallerText: string;
  largerText: string;
  font: string;
  fontModern: string;
  fontClassic: string;
  lineSpacing: string;
  spacingCompact: string;
  spacingComfortable: string;
  spacingAiry: string;
  layout: string;
  layoutParagraphs: string;
  layoutVerses: string;
  verseNumbers: string;
  addNote: string;
  editNote: string;
  notePlaceholder: string;
  saveNote: string;
  deleteNote: string;
  cancel: string;
  noteSaved: string;
  noteDeleted: string;
  highlighted: string;
  highlightRemoved: string;
  removeHighlight: string;
  colorGold: string;
  colorRose: string;
  colorSky: string;
  colorMint: string;
  clearSelection: string;
  openNote: string;
  savedVerse: string;
  removedFromSaved: string;
  listen: string;
  stopListening: string;
  selectionHint: string;
  retry: string;
  noteShort: string;
  saveShort: string;
  copyShort: string;
  shareShort: string;
};

const READER_COPY: Record<LanguageCode, ReaderExperienceCopy> = {
  en: { books: "Books", chapters: "Chapters", continueReading: "Continue reading", goTo: "Go to", backToReading: "Back to reading", noBooksFound: "No books match your search.", readingSettings: "Reading settings", textSize: "Text size", smallerText: "Smaller text", largerText: "Larger text", font: "Font", fontModern: "Modern", fontClassic: "Classic", lineSpacing: "Line spacing", spacingCompact: "Compact", spacingComfortable: "Comfortable", spacingAiry: "Airy", layout: "Layout", layoutParagraphs: "Paragraphs", layoutVerses: "Verse by verse", verseNumbers: "Verse numbers", addNote: "Add note", editNote: "Edit note", notePlaceholder: "What stands out to you in this passage?", saveNote: "Save note", deleteNote: "Delete note", cancel: "Cancel", noteSaved: "Note saved", noteDeleted: "Note deleted", highlighted: "Highlighted", highlightRemoved: "Highlight removed", removeHighlight: "Remove highlight", colorGold: "Yellow", colorRose: "Pink", colorSky: "Blue", colorMint: "Green", clearSelection: "Clear selection", openNote: "Open note", savedVerse: "Saved verse", removedFromSaved: "Removed from saved", listen: "Listen", stopListening: "Stop listening", selectionHint: "Tap any verse to highlight it, save it, or add a note.", retry: "Try again", noteShort: "Note", saveShort: "Save", copyShort: "Copy", shareShort: "Share" },
  es: { books: "Libros", chapters: "Capítulos", continueReading: "Seguir leyendo", goTo: "Ir a", backToReading: "Volver a la lectura", noBooksFound: "Ningún libro coincide con tu búsqueda.", readingSettings: "Ajustes de lectura", textSize: "Tamaño del texto", smallerText: "Texto más pequeño", largerText: "Texto más grande", font: "Fuente", fontModern: "Moderna", fontClassic: "Clásica", lineSpacing: "Interlineado", spacingCompact: "Compacto", spacingComfortable: "Cómodo", spacingAiry: "Amplio", layout: "Diseño", layoutParagraphs: "Párrafos", layoutVerses: "Versículo por versículo", verseNumbers: "Números de versículo", addNote: "Añadir nota", editNote: "Editar nota", notePlaceholder: "¿Qué te llama la atención en este pasaje?", saveNote: "Guardar nota", deleteNote: "Eliminar nota", cancel: "Cancelar", noteSaved: "Nota guardada", noteDeleted: "Nota eliminada", highlighted: "Resaltado", highlightRemoved: "Resaltado eliminado", removeHighlight: "Quitar resaltado", colorGold: "Amarillo", colorRose: "Rosa", colorSky: "Azul", colorMint: "Verde", clearSelection: "Quitar selección", openNote: "Abrir nota", savedVerse: "Versículo guardado", removedFromSaved: "Quitado de guardados", listen: "Escuchar", stopListening: "Dejar de escuchar", selectionHint: "Toca cualquier versículo para resaltarlo, guardarlo o añadir una nota.", retry: "Intentar de nuevo", noteShort: "Nota", saveShort: "Guardar", copyShort: "Copiar", shareShort: "Compartir" },
  fr: { books: "Livres", chapters: "Chapitres", continueReading: "Reprendre la lecture", goTo: "Aller à", backToReading: "Retour à la lecture", noBooksFound: "Aucun livre ne correspond à ta recherche.", readingSettings: "Réglages de lecture", textSize: "Taille du texte", smallerText: "Texte plus petit", largerText: "Texte plus grand", font: "Police", fontModern: "Moderne", fontClassic: "Classique", lineSpacing: "Interligne", spacingCompact: "Serré", spacingComfortable: "Confortable", spacingAiry: "Aéré", layout: "Mise en page", layoutParagraphs: "Paragraphes", layoutVerses: "Verset par verset", verseNumbers: "Numéros de versets", addNote: "Ajouter une note", editNote: "Modifier la note", notePlaceholder: "Qu’est-ce qui te frappe dans ce passage ?", saveNote: "Enregistrer la note", deleteNote: "Supprimer la note", cancel: "Annuler", noteSaved: "Note enregistrée", noteDeleted: "Note supprimée", highlighted: "Surligné", highlightRemoved: "Surlignage retiré", removeHighlight: "Retirer le surlignage", colorGold: "Jaune", colorRose: "Rose", colorSky: "Bleu", colorMint: "Vert", clearSelection: "Effacer la sélection", openNote: "Ouvrir la note", savedVerse: "Verset enregistré", removedFromSaved: "Retiré des enregistrements", listen: "Écouter", stopListening: "Arrêter l’écoute", selectionHint: "Touche un verset pour le surligner, l’enregistrer ou ajouter une note.", retry: "Réessayer", noteShort: "Note", saveShort: "Enregistrer", copyShort: "Copier", shareShort: "Partager" },
  pt: { books: "Livros", chapters: "Capítulos", continueReading: "Continuar lendo", goTo: "Ir para", backToReading: "Voltar à leitura", noBooksFound: "Nenhum livro corresponde à sua busca.", readingSettings: "Ajustes de leitura", textSize: "Tamanho do texto", smallerText: "Texto menor", largerText: "Texto maior", font: "Fonte", fontModern: "Moderna", fontClassic: "Clássica", lineSpacing: "Espaçamento", spacingCompact: "Compacto", spacingComfortable: "Confortável", spacingAiry: "Amplo", layout: "Layout", layoutParagraphs: "Parágrafos", layoutVerses: "Versículo por versículo", verseNumbers: "Números dos versículos", addNote: "Adicionar nota", editNote: "Editar nota", notePlaceholder: "O que chama sua atenção nesta passagem?", saveNote: "Salvar nota", deleteNote: "Excluir nota", cancel: "Cancelar", noteSaved: "Nota salva", noteDeleted: "Nota excluída", highlighted: "Destacado", highlightRemoved: "Destaque removido", removeHighlight: "Remover destaque", colorGold: "Amarelo", colorRose: "Rosa", colorSky: "Azul", colorMint: "Verde", clearSelection: "Limpar seleção", openNote: "Abrir nota", savedVerse: "Versículo salvo", removedFromSaved: "Removido dos salvos", listen: "Ouvir", stopListening: "Parar de ouvir", selectionHint: "Toque em qualquer versículo para destacá-lo, salvá-lo ou adicionar uma nota.", retry: "Tentar novamente", noteShort: "Nota", saveShort: "Salvar", copyShort: "Copiar", shareShort: "Compartilhar" },
  de: { books: "Bücher", chapters: "Kapitel", continueReading: "Weiterlesen", goTo: "Gehe zu", backToReading: "Zurück zum Lesen", noBooksFound: "Kein Buch passt zu deiner Suche.", readingSettings: "Leseeinstellungen", textSize: "Textgröße", smallerText: "Kleinerer Text", largerText: "Größerer Text", font: "Schrift", fontModern: "Modern", fontClassic: "Klassisch", lineSpacing: "Zeilenabstand", spacingCompact: "Kompakt", spacingComfortable: "Angenehm", spacingAiry: "Luftig", layout: "Darstellung", layoutParagraphs: "Absätze", layoutVerses: "Vers für Vers", verseNumbers: "Versnummern", addNote: "Notiz hinzufügen", editNote: "Notiz bearbeiten", notePlaceholder: "Was spricht dich in diesem Abschnitt an?", saveNote: "Notiz speichern", deleteNote: "Notiz löschen", cancel: "Abbrechen", noteSaved: "Notiz gespeichert", noteDeleted: "Notiz gelöscht", highlighted: "Markiert", highlightRemoved: "Markierung entfernt", removeHighlight: "Markierung entfernen", colorGold: "Gelb", colorRose: "Rosa", colorSky: "Blau", colorMint: "Grün", clearSelection: "Auswahl aufheben", openNote: "Notiz öffnen", savedVerse: "Gespeicherter Vers", removedFromSaved: "Aus Gespeichert entfernt", listen: "Anhören", stopListening: "Anhören beenden", selectionHint: "Tippe auf einen Vers, um ihn zu markieren, zu speichern oder eine Notiz hinzuzufügen.", retry: "Erneut versuchen", noteShort: "Notiz", saveShort: "Speichern", copyShort: "Kopieren", shareShort: "Teilen" },
  yo: { books: "Àwọn ìwé", chapters: "Àwọn orí", continueReading: "Tẹ̀síwájú kíkà", goTo: "Lọ sí", backToReading: "Padà sí kíkà", noBooksFound: "Kò sí ìwé tó bá ìwádìí rẹ mu.", readingSettings: "Ètò kíkà", textSize: "Ìtóbi ọ̀rọ̀", smallerText: "Ọ̀rọ̀ kékeré", largerText: "Ọ̀rọ̀ ńlá", font: "Irú lẹ́tà", fontModern: "Òde òní", fontClassic: "Àtijọ́", lineSpacing: "Àyè láàárín ìlà", spacingCompact: "Pẹ̀kípẹ̀kí", spacingComfortable: "Ìrọ̀rùn", spacingAiry: "Gbòòrò", layout: "Ìtò", layoutParagraphs: "Ìpínrọ̀", layoutVerses: "Ẹsẹ ní ẹsẹ", verseNumbers: "Nọ́ńbà ẹsẹ", addNote: "Fi àkọsílẹ̀ kún", editNote: "Ṣàtúnṣe àkọsílẹ̀", notePlaceholder: "Kí ló dúró ṣinṣin sí ọ nínú ìpín yìí?", saveNote: "Fi àkọsílẹ̀ pamọ́", deleteNote: "Pa àkọsílẹ̀ rẹ́", cancel: "Fagilé", noteSaved: "A ti fi àkọsílẹ̀ pamọ́", noteDeleted: "A ti pa àkọsílẹ̀ rẹ́", highlighted: "A ti ṣe àfihàn", highlightRemoved: "A ti yọ àfihàn kúrò", removeHighlight: "Yọ àfihàn kúrò", colorGold: "Òféèfé", colorRose: "Pínkì", colorSky: "Búlúù", colorMint: "Àwọ̀ ewé", clearSelection: "Yọ ìyàn kúrò", openNote: "Ṣí àkọsílẹ̀", savedVerse: "Ẹsẹ tí a fipamọ́", removedFromSaved: "A ti yọ ọ́ kúrò nínú àwọn tí a fipamọ́", listen: "Gbọ́", stopListening: "Dá gbígbọ́ dúró", selectionHint: "Fọwọ́ kan ẹsẹ èyíkéyìí láti ṣe àfihàn rẹ̀, fi pamọ́, tàbí fi àkọsílẹ̀ kún un.", retry: "Gbìyànjú lẹ́ẹ̀kan síi", noteShort: "Àkọsílẹ̀", saveShort: "Fipamọ́", copyShort: "Dà kọ", shareShort: "Pín" },
  ig: { books: "Akwụkwọ", chapters: "Isi", continueReading: "Gaa n'ihu ịgụ", goTo: "Gaa na", backToReading: "Laghachi n'ịgụ", noBooksFound: "Ọ nweghị akwụkwọ dabara na nchọta gị.", readingSettings: "Ntọala ịgụ", textSize: "Nha mkpụrụedemede", smallerText: "Mkpụrụedemede pere mpe", largerText: "Mkpụrụedemede buru ibu", font: "Ụdị mkpụrụedemede", fontModern: "Nke ọgbara ọhụrụ", fontClassic: "Nke ochie", lineSpacing: "Oghere n'etiti ahịrị", spacingCompact: "Mkpakọ", spacingComfortable: "Ahụ iru ala", spacingAiry: "Sara mbara", layout: "Nhazi", layoutParagraphs: "Paragraf", layoutVerses: "Amaokwu n'amaokwu", verseNumbers: "Nọmba amaokwu", addNote: "Tinye ndetu", editNote: "Dezie ndetu", notePlaceholder: "Gịnị pụtara ìhè nye gị n'akụkụ a?", saveNote: "Chekwaa ndetu", deleteNote: "Hichapụ ndetu", cancel: "Kagbuo", noteSaved: "Echekwara ndetu", noteDeleted: "Ehichapụla ndetu", highlighted: "Emere ka ọ pụta ìhè", highlightRemoved: "Ewepụla agba", removeHighlight: "Wepụ agba", colorGold: "Odo", colorRose: "Pinki", colorSky: "Acha anụnụ", colorMint: "Akwụkwọ ndụ", clearSelection: "Kpochapụ nhọrọ", openNote: "Mepee ndetu", savedVerse: "Amaokwu echekwara", removedFromSaved: "Ewepụrụ ya na ndị echekwara", listen: "Gee ntị", stopListening: "Kwụsị ige ntị", selectionHint: "Pịa amaokwu ọ bụla ka i mee ka ọ pụta ìhè, chekwaa ya, ma ọ bụ tinye ndetu.", retry: "Nwaa ọzọ", noteShort: "Ndetu", saveShort: "Chekwaa", copyShort: "Detuo", shareShort: "Kekọrịta" },
  ha: { books: "Littattafai", chapters: "Surori", continueReading: "Ci gaba da karatu", goTo: "Je zuwa", backToReading: "Koma karatu", noBooksFound: "Babu littafin da ya dace da bincikenka.", readingSettings: "Saitunan karatu", textSize: "Girman rubutu", smallerText: "Ƙaramin rubutu", largerText: "Babban rubutu", font: "Nau'in rubutu", fontModern: "Na zamani", fontClassic: "Na gargajiya", lineSpacing: "Tazarar layi", spacingCompact: "Matse", spacingComfortable: "Mai daɗi", spacingAiry: "Faɗi", layout: "Tsari", layoutParagraphs: "Sakin layi", layoutVerses: "Aya bayan aya", verseNumbers: "Lambobin ayoyi", addNote: "Ƙara bayani", editNote: "Gyara bayani", notePlaceholder: "Me ya fi ɗaukar hankalinka a wannan nassi?", saveNote: "Ajiye bayani", deleteNote: "Share bayani", cancel: "Soke", noteSaved: "An ajiye bayani", noteDeleted: "An share bayani", highlighted: "An haskaka", highlightRemoved: "An cire haskakawa", removeHighlight: "Cire haskakawa", colorGold: "Rawaya", colorRose: "Ruwan hoda", colorSky: "Shuɗi", colorMint: "Kore", clearSelection: "Share zaɓi", openNote: "Buɗe bayani", savedVerse: "Ayar da aka ajiye", removedFromSaved: "An cire daga abubuwan da aka ajiye", listen: "Saurara", stopListening: "Daina sauraro", selectionHint: "Taɓa kowace aya don haskaka ta, ajiye ta, ko ƙara bayani.", retry: "Sake gwadawa", noteShort: "Bayani", saveShort: "Ajiye", copyShort: "Kwafi", shareShort: "Raba" },
  tl: { books: "Mga Aklat", chapters: "Mga Kabanata", continueReading: "Ituloy ang pagbasa", goTo: "Pumunta sa", backToReading: "Bumalik sa pagbasa", noBooksFound: "Walang aklat na tugma sa iyong hinanap.", readingSettings: "Mga setting sa pagbasa", textSize: "Laki ng teksto", smallerText: "Mas maliit na teksto", largerText: "Mas malaking teksto", font: "Font", fontModern: "Moderno", fontClassic: "Klasiko", lineSpacing: "Pagitan ng linya", spacingCompact: "Siksik", spacingComfortable: "Komportable", spacingAiry: "Maluwag", layout: "Ayos", layoutParagraphs: "Mga parapo", layoutVerses: "Bawat talata", verseNumbers: "Numero ng talata", addNote: "Magdagdag ng tala", editNote: "I-edit ang tala", notePlaceholder: "Ano ang tumatak sa iyo sa bahaging ito?", saveNote: "I-save ang tala", deleteNote: "Burahin ang tala", cancel: "Kanselahin", noteSaved: "Na-save ang tala", noteDeleted: "Nabura ang tala", highlighted: "Na-highlight", highlightRemoved: "Inalis ang highlight", removeHighlight: "Alisin ang highlight", colorGold: "Dilaw", colorRose: "Rosas", colorSky: "Asul", colorMint: "Berde", clearSelection: "Alisin ang pagpili", openNote: "Buksan ang tala", savedVerse: "Na-save na talata", removedFromSaved: "Inalis sa mga na-save", listen: "Makinig", stopListening: "Itigil ang pakikinig", selectionHint: "I-tap ang anumang talata para i-highlight, i-save, o lagyan ng tala.", retry: "Subukang muli", noteShort: "Tala", saveShort: "I-save", copyShort: "Kopyahin", shareShort: "Ibahagi" },
  ar: { books: "الأسفار", chapters: "الإصحاحات", continueReading: "متابعة القراءة", goTo: "انتقل إلى", backToReading: "العودة إلى القراءة", noBooksFound: "لا توجد أسفار تطابق بحثك.", readingSettings: "إعدادات القراءة", textSize: "حجم النص", smallerText: "نص أصغر", largerText: "نص أكبر", font: "الخط", fontModern: "حديث", fontClassic: "كلاسيكي", lineSpacing: "تباعد الأسطر", spacingCompact: "مضغوط", spacingComfortable: "مريح", spacingAiry: "واسع", layout: "التخطيط", layoutParagraphs: "فقرات", layoutVerses: "آية آية", verseNumbers: "أرقام الآيات", addNote: "إضافة ملاحظة", editNote: "تعديل الملاحظة", notePlaceholder: "ما الذي يلفت انتباهك في هذا المقطع؟", saveNote: "حفظ الملاحظة", deleteNote: "حذف الملاحظة", cancel: "إلغاء", noteSaved: "تم حفظ الملاحظة", noteDeleted: "تم حذف الملاحظة", highlighted: "تم التمييز", highlightRemoved: "تمت إزالة التمييز", removeHighlight: "إزالة التمييز", colorGold: "أصفر", colorRose: "وردي", colorSky: "أزرق", colorMint: "أخضر", clearSelection: "إلغاء التحديد", openNote: "فتح الملاحظة", savedVerse: "آية محفوظة", removedFromSaved: "تمت الإزالة من المحفوظات", listen: "استماع", stopListening: "إيقاف الاستماع", selectionHint: "انقر على أي آية لتمييزها أو حفظها أو إضافة ملاحظة.", retry: "إعادة المحاولة", noteShort: "ملاحظة", saveShort: "حفظ", copyShort: "نسخ", shareShort: "مشاركة" },
  hi: { books: "पुस्तकें", chapters: "अध्याय", continueReading: "पढ़ना जारी रखें", goTo: "यहाँ जाएँ", backToReading: "पढ़ने पर लौटें", noBooksFound: "आपकी खोज से कोई पुस्तक मेल नहीं खाती।", readingSettings: "पढ़ने की सेटिंग", textSize: "पाठ का आकार", smallerText: "छोटा पाठ", largerText: "बड़ा पाठ", font: "फ़ॉन्ट", fontModern: "आधुनिक", fontClassic: "पारंपरिक", lineSpacing: "पंक्तियों के बीच दूरी", spacingCompact: "सघन", spacingComfortable: "आरामदायक", spacingAiry: "खुला", layout: "लेआउट", layoutParagraphs: "अनुच्छेद", layoutVerses: "पद दर पद", verseNumbers: "पद संख्या", addNote: "नोट जोड़ें", editNote: "नोट संपादित करें", notePlaceholder: "इस अंश में आपको क्या खास लगता है?", saveNote: "नोट सहेजें", deleteNote: "नोट हटाएँ", cancel: "रद्द करें", noteSaved: "नोट सहेजा गया", noteDeleted: "नोट हटाया गया", highlighted: "हाइलाइट किया गया", highlightRemoved: "हाइलाइट हटाया गया", removeHighlight: "हाइलाइट हटाएँ", colorGold: "पीला", colorRose: "गुलाबी", colorSky: "नीला", colorMint: "हरा", clearSelection: "चयन हटाएँ", openNote: "नोट खोलें", savedVerse: "सहेजा गया पद", removedFromSaved: "सहेजे गए से हटाया गया", listen: "सुनें", stopListening: "सुनना बंद करें", selectionHint: "किसी भी पद को हाइलाइट करने, सहेजने या नोट जोड़ने के लिए उस पर टैप करें।", retry: "फिर से प्रयास करें", noteShort: "नोट", saveShort: "सहेजें", copyShort: "कॉपी", shareShort: "साझा करें" },
};

// ──────────────────────────────────────────────
// Reader settings, canon navigation and helpers
// ──────────────────────────────────────────────

type ReaderSettings = {
  size: number;
  font: "modern" | "classic";
  spacing: "compact" | "comfortable" | "airy";
  layout: "paragraphs" | "verses";
  verseNumbers: boolean;
};

const TEXT_SIZES = [16, 17.5, 19, 21, 23.5, 26];
const LINE_HEIGHTS: Record<ReaderSettings["spacing"], number> = { compact: 1.55, comfortable: 1.8, airy: 2.05 };
const DEFAULT_READER_SETTINGS: ReaderSettings = { size: 2, font: "classic", spacing: "comfortable", layout: "verses", verseNumbers: true };
const CLASSIC_FONT_STACK = 'ui-serif, "New York", "Iowan Old Style", "Palatino Linotype", Georgia, "Noto Serif", serif';
const MODERN_FONT_STACK = 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", sans-serif';
const CANON = [...OT_BOOKS, ...NT_BOOKS];
const HIGHLIGHT_COLORS = Object.keys(highlightStyles) as ScriptureHighlightColor[];

type BiblePosition = { book: string; chapter: number };

function readStoredJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStoredJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode); the reader keeps working in memory.
  }
}

function storedReaderSettings(): ReaderSettings {
  const stored = readStoredJson<Partial<ReaderSettings>>(BIBLE_READER_SETTINGS_STORAGE_KEY) ?? {};
  return {
    size: Number.isInteger(stored.size) && stored.size! >= 0 && stored.size! < TEXT_SIZES.length ? stored.size! : DEFAULT_READER_SETTINGS.size,
    font: stored.font === "modern" || stored.font === "classic" ? stored.font : DEFAULT_READER_SETTINGS.font,
    spacing: stored.spacing && stored.spacing in LINE_HEIGHTS ? stored.spacing : DEFAULT_READER_SETTINGS.spacing,
    layout: stored.layout === "paragraphs" || stored.layout === "verses" ? stored.layout : DEFAULT_READER_SETTINGS.layout,
    verseNumbers: typeof stored.verseNumbers === "boolean" ? stored.verseNumbers : DEFAULT_READER_SETTINGS.verseNumbers,
  };
}

function storedLastPosition(): BiblePosition | null {
  const stored = readStoredJson<Partial<BiblePosition>>(BIBLE_LAST_POSITION_STORAGE_KEY);
  if (!stored || typeof stored.book !== "string" || !CHAPTER_COUNTS[stored.book]) return null;
  const chapter = Number(stored.chapter);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > CHAPTER_COUNTS[stored.book]) return null;
  return { book: stored.book, chapter };
}

function adjacentChapter(book: string, chapter: number, direction: 1 | -1): BiblePosition | null {
  const count = CHAPTER_COUNTS[book] ?? 1;
  const target = chapter + direction;
  if (target >= 1 && target <= count) return { book, chapter: target };
  const bookIndex = CANON.indexOf(book);
  const nextBook = CANON[bookIndex + direction];
  if (bookIndex < 0 || !nextBook) return null;
  return { book: nextBook, chapter: direction === 1 ? 1 : CHAPTER_COUNTS[nextBook] ?? 1 };
}

function normalizeSearch(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function findBookByName(query: string, language: LanguageCode) {
  const needle = normalizeSearch(query);
  if (!needle) return null;
  const names = CANON.map((book) => ({ book, english: normalizeSearch(book), localized: normalizeSearch(localizedBookName(book, language)) }));
  return names.find((entry) => entry.english === needle || entry.localized === needle)?.book
    ?? names.find((entry) => entry.english.startsWith(needle) || entry.localized.startsWith(needle))?.book
    ?? null;
}

// Supports "John 3", "jn 3:16", "1 Corinthians 13.4" and localized book names.
function parsePassageQuery(query: string, language: LanguageCode): (BiblePosition & { verse?: number }) | null {
  const match = query.trim().match(/^(.+?)\s*(\d+)(?:\s*[:.,]\s*(\d+))?$/);
  if (!match) return null;
  const book = findBookByName(match[1], language);
  const chapter = Number(match[2]);
  if (!book || chapter < 1 || chapter > (CHAPTER_COUNTS[book] ?? 1)) return null;
  const verse = match[3] ? Number(match[3]) : undefined;
  return { book, chapter, verse: verse && verse > 0 ? verse : undefined };
}

function selectionReference(book: string, chapter: number, verses: number[], language: LanguageCode) {
  const base = localizedBookChapterReference(book, chapter, language);
  if (!verses.length) return base;
  const isContiguous = verses.every((verse, index) => index === 0 || verse === verses[index - 1] + 1);
  const first = verses[0];
  const last = verses[verses.length - 1];
  const range = verses.length === 1 ? `${first}` : isContiguous ? `${first}–${last}` : verses.join(", ");
  return `${base}:${range}`;
}

function isDarkSurface(color: string) {
  const hex = color.trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return false;
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

type ScriptureNoteInput = Omit<ScriptureNote, "id" | "updatedAt"> & { id?: string };

interface BibleReaderProps {
  preferences: { language: LanguageCode; bibleTranslation: BibleTranslation };
  theme: ThemeColors;
  initialBook?: string;
  initialChapter?: number;
  initialVerse?: number;
  onSaveStudyAction?: (action: string) => void;
  savedScriptures?: SavedScripture[];
  scriptureHighlights?: ScriptureHighlights;
  scriptureNotes?: ScriptureNote[];
  onSaveScripture?: (scripture: Omit<SavedScripture, "id" | "savedAt">) => void;
  onRemoveSavedScripture?: (id: string) => void;
  onSetScriptureHighlight?: (book: string, chapter: number, verse: number, highlight: ScriptureHighlightColor | null) => void;
  onSaveScriptureNote?: (note: ScriptureNoteInput) => void;
  onDeleteScriptureNote?: (id: string) => void;
  onCopyScripture?: (book: string, chapter: number, verse: number, text: string, endVerse?: number) => Promise<boolean>;
  onShareScripture?: (book: string, chapter: number, verse: number, text: string, endVerse?: number) => Promise<boolean>;
  onListen?: (text: string, label: string) => void;
  onStopListening?: () => void;
  isListening?: boolean;
}

type NoteDraft = { id?: string; verse: number; endVerse: number; passage: string; draft: string };

export default function BibleReader({
  preferences,
  theme,
  initialBook,
  initialChapter,
  initialVerse,
  onSaveStudyAction,
  savedScriptures = [],
  scriptureHighlights = {},
  scriptureNotes = [],
  onSaveScripture,
  onRemoveSavedScripture,
  onSetScriptureHighlight,
  onSaveScriptureNote,
  onDeleteScriptureNote,
  onCopyScripture,
  onShareScripture,
  onListen,
  onStopListening,
  isListening = false,
}: BibleReaderProps) {
  const language = preferences.language;
  const ui = getUI(language);
  const copy = READER_COPY[language];
  const annotations = annotationUi[language];
  const chapterUi = chapterNavUi(language);
  const isRtl = language === "ar";
  // Scripture text follows the translation's language, which can differ from the UI language.
  const textLanguage = bibleTranslations[preferences.bibleTranslation]?.language ?? language;
  const textDir = textLanguage === "ar" ? "rtl" : "ltr";
  const darkSurface = isDarkSurface(theme.bgMain);
  const accent = accessibleAccentText(theme);
  const showCloseEquivalentEditionNote = ["YOR1900", "IGB1913", "HAU1932"].includes(preferences.bibleTranslation);

  const [startPosition] = useState<BiblePosition | null>(() => (
    initialBook && CHAPTER_COUNTS[initialBook] ? { book: initialBook, chapter: initialChapter ?? 1 } : storedLastPosition()
  ));
  const [selectedBook, setSelectedBook] = useState<string>(startPosition?.book ?? "");
  const [selectedChapter, setSelectedChapter] = useState<number>(startPosition?.chapter ?? 1);
  const [showNavigator, setShowNavigator] = useState(!startPosition);
  const [activeTab, setActiveTab] = useState<"read" | "study">("read");
  const [settings, setSettings] = useState<ReaderSettings>(storedReaderSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [lastPosition] = useState<BiblePosition | null>(storedLastPosition);
  const [hintSeen, setHintSeen] = useState(() => readStoredJson<boolean>(BIBLE_SELECTION_HINT_STORAGE_KEY) === true);

  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [studyData, setStudyData] = useState<BibleStudyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [studyLoading, setStudyLoading] = useState(false);
  const [error, setError] = useState<"load" | "notfound" | null>(null);
  const [studyError, setStudyError] = useState(false);
  const [savedActionId, setSavedActionId] = useState<string | null>(null);

  const [selection, setSelection] = useState<number[]>([]);
  const [noteDraft, setNoteDraft] = useState<NoteDraft | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [focusedVerse, setFocusedVerse] = useState<number | null>(null);
  const [toolbarVisible, setToolbarVisible] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const studyAbortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const verseRefs = useRef<Record<number, HTMLElement | null>>({});
  const pendingVerseRef = useRef<number | null>(startPosition && initialBook ? initialVerse ?? null : null);
  const scrollOnLoadRef = useRef(false);
  const flashTimerRef = useRef<number | null>(null);

  const bookLabel = selectedBook ? localizedBookName(selectedBook, language) : "";
  const chapterTitle = selectedBook ? localizedBookChapterReference(selectedBook, selectedChapter, language) : "";
  const previousPosition = selectedBook ? adjacentChapter(selectedBook, selectedChapter, -1) : null;
  const nextPosition = selectedBook ? adjacentChapter(selectedBook, selectedChapter, 1) : null;

  const localStudyData = useMemo(() => {
    if (!chapterData) return null;
    return buildBibleStudyGuide(chapterData, { language, bibleTranslation: preferences.bibleTranslation });
  }, [chapterData, language, preferences.bibleTranslation]);
  const displayedStudyData = studyData ?? localStudyData;

  const savedByVerse = useMemo(() => {
    const map = new Map<number, SavedScripture>();
    for (const item of savedScriptures) {
      if (item.book === selectedBook && item.chapter === selectedChapter) map.set(item.verse, item);
    }
    return map;
  }, [savedScriptures, selectedBook, selectedChapter]);

  const notesByEndVerse = useMemo(() => {
    const map = new Map<number, ScriptureNote>();
    for (const note of scriptureNotes) {
      if (note.book === selectedBook && note.chapter === selectedChapter) map.set(note.endVerse, note);
    }
    return map;
  }, [scriptureNotes, selectedBook, selectedChapter]);

  const highlightFor = useCallback((verse: number): ScriptureHighlightColor | null => (
    savedByVerse.get(verse)?.highlight ?? scriptureHighlights[scriptureHighlightKey(selectedBook, selectedChapter, verse)] ?? null
  ), [savedByVerse, scriptureHighlights, selectedBook, selectedChapter]);

  const showFlash = useCallback((message: string) => {
    setFlash(message);
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlash(null), 1800);
  }, []);

  useEffect(() => () => {
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
  }, []);

  const updateSettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      writeStoredJson(BIBLE_READER_SETTINGS_STORAGE_KEY, next);
      return next;
    });
  }, []);

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
      writeStoredJson(BIBLE_LAST_POSITION_STORAGE_KEY, { book, chapter });
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
        `/api/bible-study?translation=${encodeURIComponent(preferences.bibleTranslation)}&book=${encodeURIComponent(book)}&chapter=${chapter}&language=${encodeURIComponent(language)}`,
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
  }, [preferences.bibleTranslation, language]);

  useEffect(() => {
    if (!selectedBook) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadChapter(selectedBook, selectedChapter);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedBook, selectedChapter, loadChapter]);

  useEffect(() => {
    if (!selectedBook || activeTab !== "study") return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadStudy(selectedBook, selectedChapter);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedBook, selectedChapter, activeTab, loadStudy]);

  // After a chapter loads, land on the requested verse or at the top of the new chapter.
  useEffect(() => {
    if (!chapterData || activeTab !== "read" || showNavigator) return;
    const verse = pendingVerseRef.current;
    const shouldScrollTop = scrollOnLoadRef.current;
    pendingVerseRef.current = null;
    scrollOnLoadRef.current = false;
    const handle = window.requestAnimationFrame(() => {
      if (verse && verseRefs.current[verse]) {
        verseRefs.current[verse]?.scrollIntoView({ behavior: "smooth", block: "center" });
        setFocusedVerse(verse);
        window.setTimeout(() => setFocusedVerse((current) => (current === verse ? null : current)), 2200);
      } else if (shouldScrollTop) {
        rootRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
      }
    });
    return () => window.cancelAnimationFrame(handle);
  }, [chapterData, activeTab, showNavigator]);

  useEffect(() => {
    const node = toolbarRef.current;
    if (!node || showNavigator) {
      setToolbarVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setToolbarVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [showNavigator, selectedBook]);

  const goTo = useCallback((position: BiblePosition & { verse?: number }) => {
    setSelection([]);
    setNoteDraft(null);
    setSavedActionId(null);
    setShowNavigator(false);
    pendingVerseRef.current = position.verse ?? null;
    scrollOnLoadRef.current = true;
    if (position.book === selectedBook && position.chapter === selectedChapter) {
      if (position.verse && verseRefs.current[position.verse]) {
        pendingVerseRef.current = null;
        verseRefs.current[position.verse]?.scrollIntoView({ behavior: "smooth", block: "center" });
        setFocusedVerse(position.verse);
      }
      return;
    }
    setSelectedBook(position.book);
    setSelectedChapter(position.chapter);
  }, [selectedBook, selectedChapter]);

  const toggleVerse = useCallback((verse: number) => {
    setSelection((current) => (
      current.includes(verse) ? current.filter((item) => item !== verse) : [...current, verse].sort((left, right) => left - right)
    ));
    if (!hintSeen) {
      setHintSeen(true);
      writeStoredJson(BIBLE_SELECTION_HINT_STORAGE_KEY, true);
    }
  }, [hintSeen]);

  const sheetOpen = Boolean(noteDraft) || showSettings;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (noteDraft) setNoteDraft(null);
        else if (showSettings) setShowSettings(false);
        else if (selection.length) setSelection([]);
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      if (showNavigator || sheetOpen || activeTab !== "read" || event.metaKey || event.ctrlKey || event.altKey) return;
      const forward = isRtl ? "ArrowLeft" : "ArrowRight";
      const backward = isRtl ? "ArrowRight" : "ArrowLeft";
      if (event.key === forward && nextPosition) goTo(nextPosition);
      if (event.key === backward && previousPosition) goTo(previousPosition);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, goTo, isRtl, nextPosition, noteDraft, previousPosition, selection.length, sheetOpen, showNavigator, showSettings]);

  const selectedVerses = useMemo(
    () => (chapterData?.verses ?? []).filter((verse) => selection.includes(verse.verse)),
    [chapterData, selection]
  );
  const selectedText = selectedVerses.map((verse) => verse.text).join(" ");
  const selectionLabel = selectionReference(selectedBook, selectedChapter, selection, language);
  const allSelectedSaved = selectedVerses.length > 0 && selectedVerses.every((verse) => savedByVerse.has(verse.verse));
  const selectionHasHighlight = selectedVerses.some((verse) => highlightFor(verse.verse));
  const selectionNote = selection.length ? scriptureNotes.find((note) => note.book === selectedBook && note.chapter === selectedChapter && note.verse === selection[0]) ?? null : null;

  function applyHighlight(color: ScriptureHighlightColor | null) {
    if (!onSetScriptureHighlight) return;
    for (const verse of selectedVerses) onSetScriptureHighlight(selectedBook, selectedChapter, verse.verse, color);
    setSelection([]);
    showFlash(color ? copy.highlighted : copy.highlightRemoved);
  }

  function toggleSaveSelection() {
    if (allSelectedSaved) {
      for (const verse of selectedVerses) {
        const saved = savedByVerse.get(verse.verse);
        if (saved) onRemoveSavedScripture?.(saved.id);
      }
      showFlash(copy.removedFromSaved);
    } else {
      for (const verse of selectedVerses) {
        if (!savedByVerse.has(verse.verse)) {
          onSaveScripture?.({ book: selectedBook, chapter: selectedChapter, verse: verse.verse, text: verse.text, highlight: highlightFor(verse.verse) });
        }
      }
      showFlash(ui.saved);
    }
    setSelection([]);
  }

  async function copyOrShareSelection(kind: "copy" | "share") {
    const handler = kind === "copy" ? onCopyScripture : onShareScripture;
    if (!handler || !selection.length) return;
    const success = await handler(selectedBook, selectedChapter, selection[0], selectedText, selection[selection.length - 1]);
    if (success) {
      setSelection([]);
      showFlash(kind === "copy" ? annotations.copied : annotations.shared);
    }
  }

  function openNoteEditor(note: ScriptureNote | null) {
    if (note) {
      setNoteDraft({ id: note.id, verse: note.verse, endVerse: note.endVerse, passage: note.passage, draft: note.note });
      return;
    }
    if (!selection.length) return;
    setNoteDraft({ verse: selection[0], endVerse: selection[selection.length - 1], passage: selectedText, draft: "" });
  }

  function saveNote() {
    if (!noteDraft || !onSaveScriptureNote) return;
    const text = noteDraft.draft.trim();
    if (!text) return;
    onSaveScriptureNote({ id: noteDraft.id, book: selectedBook, chapter: selectedChapter, verse: noteDraft.verse, endVerse: noteDraft.endVerse, passage: noteDraft.passage, note: text });
    setNoteDraft(null);
    setSelection([]);
    showFlash(copy.noteSaved);
  }

  function deleteNote() {
    if (!noteDraft?.id || !onDeleteScriptureNote) return;
    onDeleteScriptureNote(noteDraft.id);
    setNoteDraft(null);
    setSelection([]);
    showFlash(copy.noteDeleted);
  }

  function listenToChapter() {
    if (isListening) {
      onStopListening?.();
      return;
    }
    if (!chapterData || !onListen) return;
    onListen(`${chapterTitle}. ${chapterData.verses.map((verse) => verse.text).join(" ")}`, chapterTitle);
  }

  const localizeStudyCitation = (reference: string) => localizedScriptureReference(reference, language);
  const showStudyLoadingState = studyLoading && !displayedStudyData;
  const showStudyErrorState = studyError && !displayedStudyData;
  const bottomOffset = "calc(5.75rem + var(--aletheia-safe-area-bottom, env(safe-area-inset-bottom, 0px)))";
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  if (showNavigator || !selectedBook) {
    return (
      <div ref={rootRef} className="scroll-mt-24" dir={isRtl ? "rtl" : "ltr"}>
        <BibleNavigator
          theme={theme}
          language={language}
          ui={ui}
          copy={copy}
          currentBook={selectedBook}
          currentChapter={selectedChapter}
          lastPosition={lastPosition && (lastPosition.book !== selectedBook || lastPosition.chapter !== selectedChapter) ? lastPosition : null}
          translation={preferences.bibleTranslation}
          onClose={selectedBook ? () => setShowNavigator(false) : undefined}
          onSelect={goTo}
        />
      </div>
    );
  }

  const fontFamily = settings.font === "classic" ? CLASSIC_FONT_STACK : MODERN_FONT_STACK;
  const fontSize = TEXT_SIZES[settings.size];
  const lineHeight = LINE_HEIGHTS[settings.spacing];
  const highlightAlpha = darkSurface ? 34 : 52;

  function renderVerse(verse: BibleVerse, poetryLine = false) {
    const highlight = highlightFor(verse.verse);
    const selected = selection.includes(verse.verse);
    const note = notesByEndVerse.get(verse.verse);
    const saved = savedByVerse.has(verse.verse);
    const focused = focusedVerse === verse.verse;
    const background = highlight
      ? `color-mix(in srgb, ${highlightStyles[highlight].color} ${highlightAlpha}%, transparent)`
      : focused
        ? `color-mix(in srgb, ${theme.accentGold} 22%, transparent)`
        : undefined;
    return (
      <span key={verse.verse} className={poetryLine ? "block ps-[1.5em] -indent-[1.5em]" : "inline"}>
        <span
          ref={(node) => { verseRefs.current[verse.verse] = node; }}
          id={`verse-${verse.verse}`}
          role="button"
          tabIndex={0}
          aria-pressed={selected}
          onClick={() => toggleVerse(verse.verse)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleVerse(verse.verse);
            }
          }}
          className="scroll-mt-28 cursor-pointer rounded-[0.2em] outline-none transition-colors duration-300 [-webkit-tap-highlight-color:transparent] [box-decoration-break:clone] [-webkit-box-decoration-break:clone] focus-visible:ring-2"
          style={{
            backgroundColor: background,
            padding: background ? "0.06em 0.12em" : undefined,
            textDecorationLine: selected ? "underline" : undefined,
            textDecorationStyle: selected ? "dotted" : undefined,
            textDecorationThickness: selected ? "2px" : undefined,
            textUnderlineOffset: selected ? "0.28em" : undefined,
            textDecorationColor: selected ? accent : undefined,
          }}
        >
          {settings.verseNumbers ? (
            <sup className="me-[0.3em] select-none font-sans text-[0.6em] font-semibold tabular-nums" style={{ color: accent, letterSpacing: "0.02em" }}>
              {verse.verse}
            </sup>
          ) : null}
          {verse.text}
        </span>
        {saved ? (
          <Bookmark size={Math.round(fontSize * 0.62)} className="ms-1 inline-block -translate-y-[0.1em] align-middle" style={{ color: theme.textMuted }} aria-label={copy.savedVerse} />
        ) : null}
        {note ? (
          <button
            type="button"
            onClick={() => openNoteEditor(note)}
            className="ms-1 inline-grid size-7 -translate-y-[0.08em] place-items-center rounded-full align-middle"
            style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)` }}
            aria-label={`${copy.openNote}: ${selectionReference(selectedBook, selectedChapter, note.endVerse > note.verse ? [note.verse, note.endVerse] : [note.verse], language)}`}
          >
            <StickyNote size={13} aria-hidden="true" />
          </button>
        ) : null}{" "}
      </span>
    );
  }

  const verseBlocks = chapterData?.verses ?? [];
  const paragraphs = chapterData && settings.layout === "paragraphs" ? groupVersesIntoParagraphs(chapterData.book, chapterData.chapter, verseBlocks) : [];
  const blockSpacing = `${(lineHeight - 1) * 0.9}em`;
  const pillStyle = { borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textPrimary };

  return (
    <div ref={rootRef} className="scroll-mt-24" dir={isRtl ? "rtl" : "ltr"}>
      <div ref={toolbarRef} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowNavigator(true)}
          className="inline-flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full border px-4 text-start transition active:scale-[0.99]"
          style={pillStyle}
          aria-label={`${ui.selectBook}: ${chapterTitle}`}
        >
          <span className="truncate text-[1.02rem] font-semibold tracking-[-0.01em]">{chapterTitle}</span>
          <ChevronDown size={16} aria-hidden="true" className="shrink-0" style={{ color: theme.textMuted }} />
        </button>
        <span
          className="inline-flex h-12 shrink-0 items-center rounded-full border px-3.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em]"
          style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}
          title={showCloseEquivalentEditionNote ? ui.closeEquivalentEdition : undefined}
        >
          {preferences.bibleTranslation}
        </span>
        {onListen ? (
          <button
            type="button"
            onClick={listenToChapter}
            disabled={!chapterData && !isListening}
            className="grid size-12 shrink-0 place-items-center rounded-full border transition active:scale-95 disabled:opacity-40"
            style={isListening ? { borderColor: theme.primary, backgroundColor: theme.primary, color: theme.textOnPrimary } : pillStyle}
            aria-label={isListening ? copy.stopListening : copy.listen}
            title={isListening ? copy.stopListening : copy.listen}
          >
            {isListening ? <Square size={15} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="grid size-12 shrink-0 place-items-center rounded-full border transition active:scale-95"
          style={pillStyle}
          aria-label={copy.readingSettings}
          aria-haspopup="dialog"
          title={copy.readingSettings}
        >
          <ALargeSmall size={20} aria-hidden="true" />
        </button>
      </div>

      <div role="tablist" aria-label={`${ui.readTab} · ${ui.studyTab}`} className="mt-3 grid grid-cols-2 gap-1 rounded-full border p-1" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
        {(["read", "study"] as const).map((tab) => {
          const active = activeTab === tab;
          const Icon = tab === "read" ? BookOpen : Sparkles;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { setActiveTab(tab); setSelection([]); }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full text-[0.82rem] font-semibold transition"
              style={{ backgroundColor: active ? theme.bgCard : "transparent", color: active ? theme.textPrimary : theme.textSecondary, boxShadow: active ? "0 4px 12px rgba(7,10,8,0.10)" : "none" }}
            >
              <Icon size={15} aria-hidden="true" />
              {tab === "read" ? ui.readTab : ui.studyTab}
            </button>
          );
        })}
      </div>

      {activeTab === "read" ? (
        <article className="mx-auto max-w-[40rem] px-1 pb-44 sm:px-2" aria-busy={loading} lang={language}>
          <header className="pb-6 pt-9 text-center">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em]" style={{ color: theme.textSecondary }}>{bookLabel}</p>
            <h2 className="mt-1 text-[3.6rem] font-light leading-none tracking-[-0.03em]" style={{ color: theme.textPrimary, fontFamily }}>
              <span className="sr-only">{chapterTitle}</span>
              <span aria-hidden="true">{selectedChapter}</span>
            </h2>
            {chapterData?.fallbackTranslation ? (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs" style={{ color: theme.textMuted }}>
                <Info size={12} aria-hidden="true" />
                {ui.via} {chapterData.fallbackTranslation}
              </p>
            ) : showCloseEquivalentEditionNote ? (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs" style={{ color: theme.textMuted }}>
                <Info size={12} aria-hidden="true" />
                {ui.closeEquivalentEdition}
              </p>
            ) : null}
          </header>

          {loading && !chapterData ? (
            <div className="space-y-4 pt-2" aria-label={ui.loading}>
              {[92, 100, 84, 96, 70, 100, 88].map((width, index) => (
                <div key={index} className="h-4 animate-pulse rounded-full motion-reduce:animate-none" style={{ width: `${width}%`, backgroundColor: theme.bgInput }} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border p-5 text-center text-sm leading-6" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textSecondary }}>
              <p>{error === "notfound" ? ui.noChapter : ui.error}</p>
              {error === "load" ? (
                <button type="button" onClick={() => loadChapter(selectedBook, selectedChapter)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                  <RotateCcw size={14} aria-hidden="true" />
                  {copy.retry}
                </button>
              ) : null}
            </div>
          ) : chapterData ? (
            <>
              {!hintSeen && onSetScriptureHighlight ? (
                <p className="mb-6 flex items-center justify-center gap-2 text-center text-xs leading-5" style={{ color: theme.textMuted }}>
                  <Highlighter size={13} aria-hidden="true" />
                  {copy.selectionHint}
                </p>
              ) : null}
              <div lang={textLanguage} dir={textDir} style={{ fontFamily, fontSize: `${fontSize}px`, lineHeight, color: theme.textPrimary }} className="[overflow-wrap:anywhere]">
                {settings.layout === "paragraphs" ? (
                  paragraphs.map((paragraph) => (
                    <p key={paragraph.verses[0].verse} className="text-pretty" style={{ marginBottom: `calc(${blockSpacing} + 0.5em)` }}>
                      {paragraph.verses.map((verse) => renderVerse(verse, paragraph.poetry.has(verse.verse)))}
                    </p>
                  ))
                ) : (
                  verseBlocks.map((verse) => (
                    <p key={verse.verse} className="text-pretty" style={{ marginBottom: blockSpacing }}>
                      {renderVerse(verse)}
                    </p>
                  ))
                )}
              </div>

              <nav className="mt-12 grid grid-cols-2 gap-3 border-t pt-6" style={{ borderColor: theme.borderLight }} aria-label={`${chapterUi.previous} · ${chapterUi.next}`}>
                {previousPosition ? (
                  <button type="button" onClick={() => goTo(previousPosition)} className="flex min-h-16 items-center gap-2 rounded-2xl border px-3 text-start transition active:scale-[0.99]" style={pillStyle}>
                    <ChevronLeft size={18} aria-hidden="true" className="shrink-0 rtl:rotate-180" style={{ color: theme.textMuted }} />
                    <span className="min-w-0">
                      <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>{chapterUi.previous}</span>
                      <span className="block truncate text-sm font-semibold">{localizedBookChapterReference(previousPosition.book, previousPosition.chapter, language)}</span>
                    </span>
                  </button>
                ) : <span />}
                {nextPosition ? (
                  <button type="button" onClick={() => goTo(nextPosition)} className="flex min-h-16 items-center justify-end gap-2 rounded-2xl px-3 text-end transition active:scale-[0.99]" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                    <span className="min-w-0">
                      <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.14em] opacity-80">{chapterUi.next}</span>
                      <span className="block truncate text-sm font-semibold">{localizedBookChapterReference(nextPosition.book, nextPosition.chapter, language)}</span>
                    </span>
                    <ChevronRight size={18} aria-hidden="true" className="shrink-0 rtl:rotate-180" />
                  </button>
                ) : null}
              </nav>
            </>
          ) : null}
        </article>
      ) : (
        <BibleStudyView
          theme={theme}
          ui={ui}
          chapterTitle={chapterTitle}
          loading={showStudyLoadingState}
          error={showStudyErrorState}
          data={displayedStudyData}
          savedActionId={savedActionId}
          localizeCitation={localizeStudyCitation}
          onOpenRelated={(scripture) => {
            const match = scripture.match(/^(.+?)\s+(\d+):(\d+)(?:-\d+)?$/);
            if (!match || !CHAPTER_COUNTS[match[1]]) return;
            setActiveTab("read");
            goTo({ book: match[1], chapter: Number(match[2]), verse: Number(match[3]) });
          }}
          onSaveAction={onSaveStudyAction ? (action) => { onSaveStudyAction(action.text); setSavedActionId(action.id); } : undefined}
        />
      )}

      {portalTarget && activeTab === "read" && chapterData ? createPortal(
        <div dir={isRtl ? "rtl" : "ltr"} className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-3" style={{ bottom: bottomOffset }}>
          {flash ? (
            <p role="status" className="pointer-events-auto rounded-full px-4 py-2 text-sm font-semibold shadow-lg" style={{ backgroundColor: theme.textPrimary, color: theme.bgMain }}>
              {flash}
            </p>
          ) : null}
          {selection.length ? (
            <section
              role="region"
              aria-label={selectionLabel}
              className="pointer-events-auto w-full max-w-xl rounded-[1.75rem] border p-3 shadow-[0_18px_48px_rgba(0,0,0,0.28)]"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}
            >
              <div className="flex items-center justify-between gap-2 ps-2">
                <p className="truncate text-sm font-semibold" style={{ color: theme.textPrimary }}>{selectionLabel}</p>
                <button type="button" onClick={() => setSelection([])} className="grid size-10 shrink-0 place-items-center rounded-full" style={{ color: theme.textSecondary, backgroundColor: theme.bgInput }} aria-label={copy.clearSelection}>
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              {onSetScriptureHighlight ? (
                <div className="mt-2 flex items-center gap-1" role="group" aria-label={annotations.highlight}>
                  {HIGHLIGHT_COLORS.map((color) => {
                    const active = selectedVerses.length > 0 && selectedVerses.every((verse) => highlightFor(verse.verse) === color);
                    const colorName = copy[`color${color[0].toUpperCase()}${color.slice(1)}` as "colorGold"];
                    return (
                      <button key={color} type="button" onClick={() => applyHighlight(active ? null : color)} className="grid size-11 place-items-center rounded-full" aria-pressed={active} aria-label={`${annotations.highlight}: ${colorName}`} title={colorName}>
                        <span className="grid size-8 place-items-center rounded-full border-2" style={{ backgroundColor: highlightStyles[color].color, borderColor: active ? theme.textPrimary : "transparent" }}>
                          {active ? <Check size={14} aria-hidden="true" style={{ color: "#1c1c1c" }} /> : null}
                        </span>
                      </button>
                    );
                  })}
                  {selectionHasHighlight ? (
                    <button type="button" onClick={() => applyHighlight(null)} className="ms-auto grid size-11 place-items-center rounded-full" style={{ color: theme.textSecondary }} aria-label={copy.removeHighlight} title={copy.removeHighlight}>
                      <Eraser size={18} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {onSaveScriptureNote ? (
                  <SelectionAction theme={theme} label={copy.noteShort} aria={selectionNote ? copy.editNote : copy.addNote} onClick={() => openNoteEditor(selectionNote)} icon={<NotebookPen size={18} aria-hidden="true" />} />
                ) : null}
                {onSaveScripture ? (
                  <SelectionAction theme={theme} label={allSelectedSaved ? ui.saved : copy.saveShort} aria={annotations.saveVerse} pressed={allSelectedSaved} onClick={toggleSaveSelection} icon={allSelectedSaved ? <BookmarkCheck size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />} />
                ) : null}
                {onCopyScripture ? (
                  <SelectionAction theme={theme} label={copy.copyShort} aria={annotations.copyVerse} onClick={() => void copyOrShareSelection("copy")} icon={<Copy size={18} aria-hidden="true" />} />
                ) : null}
                {onShareScripture ? (
                  <SelectionAction theme={theme} label={copy.shareShort} aria={annotations.shareVerse} onClick={() => void copyOrShareSelection("share")} icon={<Share2 size={18} aria-hidden="true" />} />
                ) : null}
              </div>
            </section>
          ) : !toolbarVisible && !sheetOpen ? (
            <div className="pointer-events-auto flex items-center gap-1 rounded-full border p-1 shadow-[0_12px_32px_rgba(0,0,0,0.22)] backdrop-blur-md" style={{ borderColor: theme.borderMedium, backgroundColor: `color-mix(in srgb, ${theme.bgCardElevated} 92%, transparent)` }}>
              <button type="button" disabled={!previousPosition} onClick={() => previousPosition && goTo(previousPosition)} className="grid size-11 place-items-center rounded-full disabled:opacity-30" style={{ color: theme.textPrimary }} aria-label={chapterUi.previous}>
                <ChevronLeft size={18} aria-hidden="true" className="rtl:rotate-180" />
              </button>
              <button type="button" onClick={() => setShowNavigator(true)} className="h-11 max-w-[11rem] truncate rounded-full px-3 text-sm font-semibold" style={{ color: theme.textPrimary }} aria-label={`${ui.selectBook}: ${chapterTitle}`}>
                {chapterTitle}
              </button>
              <button type="button" disabled={!nextPosition} onClick={() => nextPosition && goTo(nextPosition)} className="grid size-11 place-items-center rounded-full disabled:opacity-30" style={{ color: theme.textPrimary }} aria-label={chapterUi.next}>
                <ChevronRight size={18} aria-hidden="true" className="rtl:rotate-180" />
              </button>
              <span className="mx-0.5 h-6 w-px" style={{ backgroundColor: theme.borderMedium }} aria-hidden="true" />
              <button type="button" onClick={() => setShowSettings(true)} className="grid size-11 place-items-center rounded-full" style={{ color: theme.textPrimary }} aria-label={copy.readingSettings}>
                <ALargeSmall size={19} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>,
        portalTarget
      ) : null}

      {portalTarget && showSettings ? createPortal(
        <ReaderSettingsSheet theme={theme} copy={copy} settings={settings} isRtl={isRtl} bottomOffset={bottomOffset} onChange={updateSettings} onClose={() => setShowSettings(false)} />,
        portalTarget
      ) : null}

      {portalTarget && noteDraft ? createPortal(
        <NoteEditorSheet
          theme={theme}
          copy={copy}
          isRtl={isRtl}
          reference={selectionReference(selectedBook, selectedChapter, noteDraft.endVerse > noteDraft.verse ? [noteDraft.verse, noteDraft.endVerse] : [noteDraft.verse], language)}
          passage={noteDraft.passage}
          draft={noteDraft.draft}
          canDelete={Boolean(noteDraft.id && onDeleteScriptureNote)}
          onChange={(draft) => setNoteDraft((current) => (current ? { ...current, draft } : current))}
          onSave={saveNote}
          onDelete={deleteNote}
          onClose={() => setNoteDraft(null)}
        />,
        portalTarget
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────
// Navigator: testament → book → chapter, plus "John 3:16" jumps
// ──────────────────────────────────────────────

function BibleNavigator({
  theme,
  language,
  ui,
  copy,
  currentBook,
  currentChapter,
  lastPosition,
  translation,
  onClose,
  onSelect,
}: {
  theme: ThemeColors;
  language: LanguageCode;
  ui: BibleReaderCopy;
  copy: ReaderExperienceCopy;
  currentBook: string;
  currentChapter: number;
  lastPosition: BiblePosition | null;
  translation: string;
  onClose?: () => void;
  onSelect: (position: BiblePosition & { verse?: number }) => void;
}) {
  const [query, setQuery] = useState("");
  const [testament, setTestament] = useState<"ot" | "nt">(currentBook && NT_BOOKS.includes(currentBook) ? "nt" : "ot");
  const [expandedBook, setExpandedBook] = useState<string | null>(currentBook || null);
  const accent = accessibleAccentText(theme);
  const searching = query.trim().length > 0;
  const jump = searching ? parsePassageQuery(query, language) : null;
  const normalizedQuery = normalizeSearch(query.replace(/\s*\d+(?:\s*[:.,]\s*\d+)?\s*$/, "")) || normalizeSearch(query);
  const books = (searching ? CANON : testament === "ot" ? OT_BOOKS : NT_BOOKS).filter((book) => (
    !searching
    || normalizeSearch(book).includes(normalizedQuery)
    || normalizeSearch(localizedBookName(book, language)).includes(normalizedQuery)
  ));
  const effectiveExpanded = searching && books.length === 1 ? books[0] : expandedBook;

  return (
    <section aria-labelledby="bible-navigator-title">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="bible-navigator-title" className="text-[1.6rem] font-semibold tracking-[-0.02em]" style={{ color: theme.textPrimary }}>{copy.books}</h2>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>{translation}</p>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-full border" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textPrimary }} aria-label={copy.backToReading} title={copy.backToReading}>
            <X size={18} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {lastPosition && !searching ? (
        <button
          type="button"
          onClick={() => onSelect(lastPosition)}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition active:scale-[0.99]"
          style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textPrimary }}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: theme.bgInput, color: accent }}>
            <BookOpen size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>{copy.continueReading}</span>
            <span className="block truncate text-base font-semibold">{localizedBookChapterReference(lastPosition.book, lastPosition.chapter, language)}</span>
          </span>
          <ChevronRight size={18} aria-hidden="true" className="shrink-0 rtl:rotate-180" style={{ color: theme.textMuted }} />
        </button>
      ) : null}

      <label className="mt-4 flex items-center gap-2 rounded-2xl border px-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
        <Search size={16} style={{ color: theme.textSecondary }} aria-hidden="true" />
        <input
          className="bible-reader-field min-h-12 min-w-0 flex-1 appearance-none bg-transparent text-base outline-none"
          style={{ color: theme.textPrimary, backgroundColor: "transparent" }}
          aria-label={ui.search}
          placeholder={ui.search}
          value={query}
          type="search"
          enterKeyHint="go"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && jump) onSelect(jump);
          }}
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")} className="grid size-9 place-items-center rounded-full" style={{ color: theme.textSecondary }} aria-label={copy.cancel}>
            <X size={15} aria-hidden="true" />
          </button>
        ) : null}
      </label>

      {jump ? (
        <button
          type="button"
          onClick={() => onSelect(jump)}
          className="mt-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 text-start text-sm font-semibold"
          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
        >
          <span className="truncate">
            {copy.goTo} {jump.verse ? localizedScriptureReference(`${jump.book} ${jump.chapter}:${jump.verse}`, language) : localizedBookChapterReference(jump.book, jump.chapter, language)}
          </span>
          <ChevronRight size={17} aria-hidden="true" className="shrink-0 rtl:rotate-180" />
        </button>
      ) : null}

      {!searching ? (
        <div role="tablist" aria-label={copy.books} className="mt-4 grid grid-cols-2 gap-1 rounded-full border p-1" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
          {(["ot", "nt"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={testament === key}
              onClick={() => setTestament(key)}
              className="h-10 truncate rounded-full px-2 text-[0.8rem] font-semibold transition"
              style={{ backgroundColor: testament === key ? theme.bgCard : "transparent", color: testament === key ? theme.textPrimary : theme.textSecondary, boxShadow: testament === key ? "0 4px 12px rgba(7,10,8,0.10)" : "none" }}
            >
              {key === "ot" ? ui.ot : ui.nt}
            </button>
          ))}
        </div>
      ) : null}

      <ul className="mt-3 divide-y overflow-hidden rounded-2xl border" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
        {books.map((book) => {
          const expanded = effectiveExpanded === book;
          const count = CHAPTER_COUNTS[book] ?? 1;
          const isCurrent = book === currentBook;
          return (
            <li key={book} style={{ borderColor: theme.borderLight }}>
              <button
                type="button"
                onClick={() => (count === 1 ? onSelect({ book, chapter: 1 }) : setExpandedBook(expanded ? null : book))}
                aria-expanded={count === 1 ? undefined : expanded}
                className="flex min-h-[3.25rem] w-full items-center justify-between gap-3 px-4 text-start"
                style={{ color: theme.textPrimary }}
              >
                <span className="min-w-0 truncate text-[0.98rem]" style={{ fontWeight: isCurrent ? 650 : 500, color: isCurrent ? accent : theme.textPrimary }}>
                  {localizedBookName(book, language)}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs tabular-nums" style={{ color: theme.textMuted }}>
                  {count}
                  {count === 1 ? <ChevronRight size={16} aria-hidden="true" className="rtl:rotate-180" /> : <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${expanded ? "rotate-180" : ""}`} />}
                </span>
              </button>
              {expanded && count > 1 ? (
                <div className="grid grid-cols-6 gap-1.5 px-3 pb-4 pt-1 min-[420px]:grid-cols-7 sm:grid-cols-10" role="group" aria-label={`${localizedBookName(book, language)} · ${copy.chapters}`}>
                  {Array.from({ length: count }, (_, index) => index + 1).map((chapter) => {
                    const active = isCurrent && chapter === currentChapter;
                    return (
                      <button
                        key={chapter}
                        type="button"
                        onClick={() => onSelect({ book, chapter })}
                        aria-current={active ? "page" : undefined}
                        aria-label={localizedBookChapterReference(book, chapter, language)}
                        className="grid aspect-square min-h-11 place-items-center rounded-xl text-sm font-semibold tabular-nums transition active:scale-95"
                        style={{ backgroundColor: active ? theme.primary : theme.bgInput, color: active ? theme.textOnPrimary : theme.textPrimary }}
                      >
                        {chapter}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </li>
          );
        })}
        {!books.length ? (
          <li className="px-4 py-8 text-center text-sm" style={{ color: theme.textSecondary }}>{copy.noBooksFound}</li>
        ) : null}
      </ul>
    </section>
  );
}

// ──────────────────────────────────────────────
// Reading settings sheet (live preview: no dimming backdrop)
// ──────────────────────────────────────────────

function ReaderSettingsSheet({
  theme,
  copy,
  settings,
  isRtl,
  bottomOffset,
  onChange,
  onClose,
}: {
  theme: ThemeColors;
  copy: ReaderExperienceCopy;
  settings: ReaderSettings;
  isRtl: boolean;
  bottomOffset: string;
  onChange: (patch: Partial<ReaderSettings>) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const segmented = <T extends string>(label: string, value: T, options: Array<{ value: T; label: string }>, onPick: (value: T) => void) => (
    <div>
      <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>{label}</p>
      <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-full border p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onPick(option.value)}
            className="h-10 truncate rounded-full px-2 text-[0.8rem] font-semibold"
            style={{ backgroundColor: value === option.value ? theme.bgCard : "transparent", color: value === option.value ? theme.textPrimary : theme.textSecondary, boxShadow: value === option.value ? "0 4px 12px rgba(7,10,8,0.10)" : "none" }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="fixed inset-0 z-[70]" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="bible-reader-settings-title"
        onClick={(event) => event.stopPropagation()}
        className="absolute inset-x-3 mx-auto max-w-md rounded-[1.75rem] border p-4 shadow-[0_18px_48px_rgba(0,0,0,0.32)]"
        style={{ bottom: bottomOffset, borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="bible-reader-settings-title" className="text-base font-semibold" style={{ color: theme.textPrimary }}>{copy.readingSettings}</h2>
          <button ref={closeRef} type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }} aria-label={copy.cancel}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>{copy.textSize}</p>
            <div className="flex items-center gap-2 rounded-full border p-1" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
              <button type="button" disabled={settings.size <= 0} onClick={() => onChange({ size: settings.size - 1 })} className="grid h-10 w-14 place-items-center rounded-full text-sm font-semibold disabled:opacity-30" style={{ backgroundColor: theme.bgCard, color: theme.textPrimary }} aria-label={copy.smallerText}>
                A
              </button>
              <div className="flex flex-1 items-center justify-center gap-1.5" aria-hidden="true">
                {TEXT_SIZES.map((_, index) => (
                  <span key={index} className="size-1.5 rounded-full" style={{ backgroundColor: index <= settings.size ? theme.textPrimary : theme.borderMedium }} />
                ))}
              </div>
              <button type="button" disabled={settings.size >= TEXT_SIZES.length - 1} onClick={() => onChange({ size: settings.size + 1 })} className="grid h-10 w-14 place-items-center rounded-full text-xl font-semibold disabled:opacity-30" style={{ backgroundColor: theme.bgCard, color: theme.textPrimary }} aria-label={copy.largerText}>
                A
              </button>
            </div>
          </div>
          {segmented(copy.font, settings.font, [{ value: "classic", label: copy.fontClassic }, { value: "modern", label: copy.fontModern }], (font) => onChange({ font }))}
          {segmented(copy.lineSpacing, settings.spacing, [{ value: "compact", label: copy.spacingCompact }, { value: "comfortable", label: copy.spacingComfortable }, { value: "airy", label: copy.spacingAiry }], (spacing) => onChange({ spacing }))}
          {segmented(copy.layout, settings.layout, [{ value: "verses", label: copy.layoutVerses }, { value: "paragraphs", label: copy.layoutParagraphs }], (layout) => onChange({ layout }))}
          <button
            type="button"
            role="switch"
            aria-checked={settings.verseNumbers}
            onClick={() => onChange({ verseNumbers: !settings.verseNumbers })}
            className="flex min-h-12 w-full items-center justify-between gap-3 text-start text-sm font-semibold"
            style={{ color: theme.textPrimary }}
          >
            {copy.verseNumbers}
            <span className="relative h-7 w-12 shrink-0 rounded-full transition-colors" style={{ backgroundColor: settings.verseNumbers ? theme.primary : theme.borderMedium }}>
              <span className="absolute top-0.5 size-6 rounded-full bg-white shadow transition-all" style={{ insetInlineStart: settings.verseNumbers ? "1.375rem" : "0.125rem" }} />
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────
// Note editor
// ──────────────────────────────────────────────

function NoteEditorSheet({
  theme,
  copy,
  isRtl,
  reference,
  passage,
  draft,
  canDelete,
  onChange,
  onSave,
  onDelete,
  onClose,
}: {
  theme: ThemeColors;
  copy: ReaderExperienceCopy;
  isRtl: boolean;
  reference: string;
  passage: string;
  draft: string;
  canDelete: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);
  const remaining = MAX_SCRIPTURE_NOTE_LENGTH - draft.length;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="fixed inset-0 z-[85] grid place-items-end bg-black/45 px-3 backdrop-blur-[2px] sm:place-items-center"
      style={{ paddingTop: "calc(var(--aletheia-safe-area-top, env(safe-area-inset-top, 0px)) + 0.75rem)", paddingBottom: "calc(var(--aletheia-safe-area-bottom, env(safe-area-inset-bottom, 0px)) + 0.75rem)" }}
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="bible-note-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border shadow-2xl"
        style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: theme.borderLight }}>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>{canDelete ? copy.editNote : copy.addNote}</p>
            <h2 id="bible-note-title" className="truncate text-base font-semibold" style={{ color: theme.textPrimary }}>{reference}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }} aria-label={copy.cancel}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {passage ? (
            <blockquote dir="auto" className="max-h-28 overflow-y-auto border-s-2 ps-3 text-sm leading-6" style={{ borderColor: theme.accentGold, color: theme.textSecondary, fontFamily: CLASSIC_FONT_STACK }}>
              {passage}
            </blockquote>
          ) : null}
          <textarea
            ref={textareaRef}
            value={draft}
            maxLength={MAX_SCRIPTURE_NOTE_LENGTH}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) onSave();
            }}
            rows={6}
            placeholder={copy.notePlaceholder}
            aria-label={copy.notePlaceholder}
            className="bible-reader-field mt-3 w-full resize-none rounded-2xl border p-3 text-base leading-7 outline-none"
            style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }}
          />
          {remaining < 400 ? (
            <p className="mt-1 text-end text-xs tabular-nums" style={{ color: theme.textMuted }}>{remaining}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 border-t px-4 py-3" style={{ borderColor: theme.borderLight }}>
          {canDelete ? (
            <button type="button" onClick={onDelete} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold" style={{ color: theme.textSecondary }}>
              <Trash2 size={15} aria-hidden="true" />
              {copy.deleteNote}
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="ms-auto min-h-11 rounded-full px-4 text-sm font-semibold" style={{ color: theme.textSecondary }}>
            {copy.cancel}
          </button>
          <button type="button" onClick={onSave} disabled={!draft.trim()} className="min-h-11 rounded-full px-5 text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
            {copy.saveNote}
          </button>
        </div>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────
// Study view: one flat surface with divided sections
// ──────────────────────────────────────────────

function BibleStudyView({
  theme,
  ui,
  chapterTitle,
  loading,
  error,
  data,
  savedActionId,
  localizeCitation,
  onOpenRelated,
  onSaveAction,
}: {
  theme: ThemeColors;
  ui: BibleReaderCopy;
  chapterTitle: string;
  loading: boolean;
  error: boolean;
  data: BibleStudyData | null;
  savedActionId: string | null;
  localizeCitation: (reference: string) => string;
  onOpenRelated: (scripture: string) => void;
  onSaveAction?: (action: BibleStudyData["practiceActions"][number]) => void;
}) {
  const accent = accessibleAccentText(theme);
  if (loading) {
    return (
      <div className="mt-6 space-y-3" aria-label={ui.studyLoading}>
        <p className="text-sm" style={{ color: theme.textSecondary }}>{ui.studyLoading}</p>
        {[100, 90, 96, 72].map((width, index) => (
          <div key={index} className="h-4 animate-pulse rounded-full motion-reduce:animate-none" style={{ width: `${width}%`, backgroundColor: theme.bgInput }} />
        ))}
      </div>
    );
  }
  if (error || !data) {
    return error ? (
      <p className="mt-6 rounded-2xl border p-5 text-sm leading-6" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textSecondary }}>{ui.studyError}</p>
    ) : null;
  }

  const heading = (label: string) => (
    <h3 className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em]" style={{ color: accent }}>{label}</h3>
  );

  return (
    <article className="mx-auto mt-4 max-w-[40rem] divide-y overflow-hidden rounded-[1.5rem] border pb-2" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
      <section className="p-4 sm:p-5" style={{ borderColor: theme.borderLight }}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>{chapterTitle}{data.fallbackTranslation ? ` · ${ui.via} ${data.fallbackTranslation}` : ""}</p>
        <div className="mt-3">{heading(ui.studySummary)}</div>
        <p className="text-[0.98rem] leading-7" style={{ color: theme.textPrimary }}>{data.summary}</p>
      </section>

      {data.themes.length ? (
        <section className="p-4 sm:p-5" style={{ borderColor: theme.borderLight }}>
          {heading(ui.studyThemes)}
          <ul className="space-y-4">
            {data.themes.map((item, index) => (
              <li key={`${item.title}-${index}`}>
                <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{item.title}</p>
                <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>{item.explanation}</p>
                {item.verseCitations.length ? (
                  <p className="mt-1 text-xs font-medium" style={{ color: theme.textMuted }}>{item.verseCitations.map(localizeCitation).join(" · ")}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.relatedVerses.length ? (
        <section className="p-4 sm:p-5" style={{ borderColor: theme.borderLight }}>
          {heading(ui.studyRelatedVerses)}
          <ul className="-mx-2">
            {data.relatedVerses.map((related) => (
              <li key={related.canonicalScripture}>
                <button type="button" onClick={() => onOpenRelated(related.canonicalScripture)} className="flex w-full items-start gap-3 rounded-xl px-2 py-3 text-start transition hover:opacity-90">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold underline decoration-1 underline-offset-4" style={{ color: theme.textPrimary, textDecorationColor: theme.borderStrong }}>{related.reference}</span>
                      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>{related.theme}</span>
                    </span>
                    <span className="mt-1 block text-sm leading-6" style={{ color: theme.textSecondary }}>{related.principle}</span>
                    <span className="mt-1 block text-xs leading-5" style={{ color: theme.textMuted }}>{related.application}</span>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" className="mt-0.5 shrink-0 rtl:rotate-180" style={{ color: theme.textMuted }} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.reflectionQuestions.length ? (
        <section className="p-4 sm:p-5" style={{ borderColor: theme.borderLight }}>
          {heading(ui.studyQuestions)}
          <ol className="space-y-3">
            {data.reflectionQuestions.map((question, index) => (
              <li key={`${question}-${index}`} className="flex gap-3 text-sm leading-6" style={{ color: theme.textPrimary }}>
                <span className="grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums" style={{ backgroundColor: theme.bgInput, color: accent }}>{index + 1}</span>
                <span className="min-w-0">{question}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {data.practiceActions.length ? (
        <section className="p-4 sm:p-5" style={{ borderColor: theme.borderLight }}>
          {heading(ui.studyActions)}
          <ul className="space-y-4">
            {data.practiceActions.map((action) => (
              <li key={action.id}>
                <p className="text-sm leading-6" style={{ color: theme.textPrimary }}>{action.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {action.verseCitations.length ? (
                    <span className="text-xs" style={{ color: theme.textMuted }}>{action.verseCitations.map(localizeCitation).join(" · ")}</span>
                  ) : null}
                  {onSaveAction ? (
                    <button
                      type="button"
                      onClick={() => onSaveAction(action)}
                      className="ms-auto inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold"
                      style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                    >
                      {savedActionId === action.id ? <Check size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
                      {savedActionId === action.id ? ui.saved : ui.saveToRuleOfLife}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function SelectionAction({ theme, label, aria, icon, onClick, pressed }: { theme: ThemeColors; label: string; aria: string; icon: React.ReactNode; onClick: () => void; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      aria-pressed={pressed}
      className="flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.72rem] font-semibold leading-tight transition active:scale-95"
      style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
    >
      {icon}
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}
