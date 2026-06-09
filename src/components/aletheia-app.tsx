"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { signIn as authSignIn, signOut as authSignOut } from "next-auth/react";
import { ChangeEvent, FormEvent, type Dispatch, type KeyboardEvent, type ReactNode, type RefObject, type SetStateAction, type TouchEvent, type WheelEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  BriefcaseBusiness,
  Camera,
  Check,
  Compass,
  Copy,
  ChevronDown,
  Download,
  Feather,
  HandHeart,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Pause,
  Play,
  Sun,
  Monitor,
  PiggyBank,
  Plus,
  Scale,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Trash2,
  WifiOff,
  Bell,
  Clock3,
  ExternalLink,
  FileText,
  Globe2,
  Languages,
  Mic,
  MicOff,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { buildDecisionSummary, detectPatterns, scoreDecision } from "@/lib/decision-intelligence";
import {
  bibleTranslations,
  bibleTranslationOptionsForLanguage,
  canonicalScriptureReference,
  curatedScriptureReferences,
  defaultPreferences,
  defaultBibleTranslationForLanguage,
  languageCopy,
  languages,
  localizedDailyWisdom,
  localizedScriptureRead,
  localizedModeProfile as sharedLocalizedModeProfile,
  localizedWisdomLibraryEntry,
  localizedWisdomLibraryNote,
  localizedWisdomEntry,
  normalizePreferences,
  regions,
  type BibleTranslation,
  type LanguageCode,
  type RegionCode,
  type UserPreferences,
} from "@/lib/localization";
import { modeProfiles, type ModeProfile } from "@/lib/mode-profiles";
import { wisdomEntries as baseWisdomEntries } from "@/lib/wisdom-data";
import { defaultManualContext, manualContextCounselSignals, manualContextHasContent, normalizeManualContext, type ManualContextProfile } from "@/lib/manual-context";
import type { Mode } from "@/lib/wisdom-data";
import { analyticsQuestionMetadata } from "@/lib/analytics-taxonomy";
import { curatedAvatarOptions, defaultAvatarDataUrl, normalizeAvatarUrl } from "@/lib/avatars";
import { loadTranslationsWithFallbackSync, getTranslation, type TranslationData } from "@/lib/translations";

type View = "companion" | "decisions" | "reflect" | "library" | "account";
type HomeSection = "today" | "ask";
type ViewIdentity = HomeSection | "decisions" | "reflect" | "library" | "account";
type AuthMode = "login" | "register";
type AuthStatus = "checking" | "guest" | "signing-in" | "signed-in" | "signing-out";
type AnalyticsMetadata = Record<string, string | number | boolean | null>;
type ShareChannel = "native" | "copy" | "whatsapp" | "facebook" | "x" | "linkedin" | "email" | "sms";
type SupportMissionChannel = "stripe" | "paypal" | "bank" | "general" | "contact";
type WorkflowTone = "info" | "success" | "warning" | "error";
type ThemePreference = "classic" | "dark" | "black" | "warm" | "ocean" | "forest" | "sunset" | "system";
type ResolvedTheme = "classic" | "dark" | "black" | "warm" | "ocean" | "forest" | "sunset";
type ThemeColors = {
  // Primary action colors
  primary: string;
  primaryHover: string;
  primaryText: string;
  
  // Background colors
  bgMain: string;
  bgGradient: string;
  bgCard: string;
  bgCardElevated: string;
  bgInput: string;
  bgNav: string;
  bgNavBorder: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  
  // Border colors
  borderLight: string;
  borderMedium: string;
  borderStrong: string;
  
  // Accent colors
  accentGold: string;
  accentLight: string;
  
  // Interactive states
  hoverBg: string;
  activeBg: string;
};

const themeColors: Record<ResolvedTheme, ThemeColors> = {
  classic: {
    primary: "#203a35",
    primaryHover: "#2e564d",
    primaryText: "#f8f5e8",
    bgMain: "#eef2ef",
    bgGradient: "bg-[radial-gradient(circle_at_18%_0%,rgba(201,177,123,0.16),transparent_24%),radial-gradient(circle_at_92%_16%,rgba(64,101,96,0.14),transparent_24%),linear-gradient(180deg,#f4f6f2_0%,#e4ebe6_100%)]",
    bgCard: "#fbfcf8",
    bgCardElevated: "#f4f7f2",
    bgInput: "#ffffff",
    bgNav: "rgba(238, 242, 239, 0.88)",
    bgNavBorder: "rgba(201, 213, 205, 0.7)",
    textPrimary: "#203a35",
    textSecondary: "#55645b",
    textMuted: "#718077",
    textOnPrimary: "#f8f5e8",
    borderLight: "#d8e1db",
    borderMedium: "#c9d5cd",
    borderStrong: "#b8c9bf",
    accentGold: "#866a24",
    accentLight: "#d0ad55",
    hoverBg: "#edf2ee",
    activeBg: "rgba(32, 58, 53, 0.08)",
  },
  dark: {
    primary: "#28473f",
    primaryHover: "#335f54",
    primaryText: "#f8f5e8",
    bgMain: "#0e1514",
    bgGradient: "bg-[radial-gradient(circle_at_18%_0%,rgba(194,162,88,0.18),transparent_26%),radial-gradient(circle_at_92%_14%,rgba(73,122,107,0.22),transparent_25%),linear-gradient(180deg,#0e1514_0%,#090f0e_100%)]",
    bgCard: "#1a2622",
    bgCardElevated: "#20302c",
    bgInput: "#14211e",
    bgNav: "rgba(14, 21, 20, 0.88)",
    bgNavBorder: "rgba(157, 126, 56, 0.42)",
    textPrimary: "#f8f5e8",
    textSecondary: "#cddbd1",
    textMuted: "#99aba1",
    textOnPrimary: "#f8f5e8",
    borderLight: "#4a4027",
    borderMedium: "#6a5529",
    borderStrong: "#8a6b2f",
    accentGold: "#d0ad55",
    accentLight: "#e0bd65",
    hoverBg: "rgba(208, 173, 85, 0.12)",
    activeBg: "rgba(208, 173, 85, 0.18)",
  },
  black: {
    primary: "#d0ad55",
    primaryHover: "#e0bd65",
    primaryText: "#0a0b0a",
    bgMain: "#050605",
    bgGradient: "bg-[radial-gradient(circle_at_18%_0%,rgba(208,173,85,0.12),transparent_24%),radial-gradient(circle_at_92%_16%,rgba(47,79,70,0.16),transparent_25%),linear-gradient(180deg,#050605_0%,#000000_100%)]",
    bgCard: "#0b0f0d",
    bgCardElevated: "#101713",
    bgInput: "#070a08",
    bgNav: "rgba(5, 6, 5, 0.92)",
    bgNavBorder: "rgba(208, 173, 85, 0.34)",
    textPrimary: "#fbf7e9",
    textSecondary: "#d8d0bd",
    textMuted: "#a89f8d",
    textOnPrimary: "#0a0b0a",
    borderLight: "#3c321c",
    borderMedium: "#5d4922",
    borderStrong: "#8a6b2f",
    accentGold: "#d6b45d",
    accentLight: "#f0d58b",
    hoverBg: "rgba(214, 180, 93, 0.12)",
    activeBg: "rgba(214, 180, 93, 0.2)",
  },
  warm: {
    primary: "#a65a3a",
    primaryHover: "#b66a4a",
    primaryText: "#fef8f4",
    bgMain: "#faf6f1",
    bgGradient: "bg-[radial-gradient(circle_at_18%_0%,rgba(220,180,140,0.20),transparent_26%),radial-gradient(circle_at_92%_14%,rgba(200,160,120,0.18),transparent_25%),linear-gradient(180deg,#faf6f1_0%,#f4ede4_100%)]",
    bgCard: "#fef9f5",
    bgCardElevated: "#f8eee6",
    bgInput: "#fffaf5",
    bgNav: "rgba(250, 246, 241, 0.88)",
    bgNavBorder: "rgba(217, 196, 181, 0.7)",
    textPrimary: "#4a2818",
    textSecondary: "#6b4830",
    textMuted: "#8b6850",
    textOnPrimary: "#fef8f4",
    borderLight: "#e8d5c5",
    borderMedium: "#d9c4b5",
    borderStrong: "#c9b4a5",
    accentGold: "#b8763a",
    accentLight: "#d0946e",
    hoverBg: "#f5ebe1",
    activeBg: "rgba(166, 90, 58, 0.08)",
  },
  ocean: {
    primary: "#2a5a7a",
    primaryHover: "#3a6a8a",
    primaryText: "#f4f8fa",
    bgMain: "#f1f6fa",
    bgGradient: "bg-[radial-gradient(circle_at_18%_0%,rgba(140,180,220,0.18),transparent_26%),radial-gradient(circle_at_92%_14%,rgba(100,140,180,0.20),transparent_25%),linear-gradient(180deg,#f1f6fa_0%,#e4ecf4_100%)]",
    bgCard: "#f8fbfd",
    bgCardElevated: "#eef6fb",
    bgInput: "#ffffff",
    bgNav: "rgba(241, 246, 250, 0.88)",
    bgNavBorder: "rgba(181, 201, 217, 0.7)",
    textPrimary: "#1a3a4a",
    textSecondary: "#3a5a6a",
    textMuted: "#5a7a8a",
    textOnPrimary: "#f4f8fa",
    borderLight: "#d5e5ed",
    borderMedium: "#b5c9d9",
    borderStrong: "#95b9c9",
    accentGold: "#4a7a9a",
    accentLight: "#6e94d0",
    hoverBg: "#e8f2f8",
    activeBg: "rgba(42, 90, 122, 0.08)",
  },
  forest: {
    primary: "#2a5a3a",
    primaryHover: "#3a6a4a",
    primaryText: "#f4f8f4",
    bgMain: "#f1f6f1",
    bgGradient: "bg-[radial-gradient(circle_at_18%_0%,rgba(140,180,140,0.20),transparent_26%),radial-gradient(circle_at_92%_14%,rgba(100,140,100,0.18),transparent_25%),linear-gradient(180deg,#f1f6f1_0%,#e4ede4_100%)]",
    bgCard: "#f8fbf8",
    bgCardElevated: "#eef8ef",
    bgInput: "#ffffff",
    bgNav: "rgba(241, 246, 241, 0.88)",
    bgNavBorder: "rgba(184, 201, 181, 0.7)",
    textPrimary: "#1a3a2a",
    textSecondary: "#3a5a4a",
    textMuted: "#5a7a6a",
    textOnPrimary: "#f4f8f4",
    borderLight: "#d5e5d5",
    borderMedium: "#b8c9b5",
    borderStrong: "#98b995",
    accentGold: "#4a7a5a",
    accentLight: "#6ed094",
    hoverBg: "#e8f2e8",
    activeBg: "rgba(42, 90, 58, 0.08)",
  },
  sunset: {
    primary: "#8a3a5a",
    primaryHover: "#9a4a6a",
    primaryText: "#fef4f8",
    bgMain: "#faf1f6",
    bgGradient: "bg-[radial-gradient(circle_at_18%_0%,rgba(220,140,180,0.20),transparent_26%),radial-gradient(circle_at_92%_14%,rgba(200,120,160,0.18),transparent_25%),linear-gradient(180deg,#faf1f6_0%,#f4e4ec_100%)]",
    bgCard: "#fef5f9",
    bgCardElevated: "#f9eaf2",
    bgInput: "#fffafd",
    bgNav: "rgba(250, 241, 246, 0.88)",
    bgNavBorder: "rgba(217, 181, 201, 0.7)",
    textPrimary: "#4a1a3a",
    textSecondary: "#6a3a5a",
    textMuted: "#8a5a7a",
    textOnPrimary: "#fef4f8",
    borderLight: "#e8d5e5",
    borderMedium: "#d9b5c9",
    borderStrong: "#c995b9",
    accentGold: "#a85a7a",
    accentLight: "#d06e94",
    hoverBg: "#f5e8f2",
    activeBg: "rgba(138, 58, 90, 0.08)",
  },
};
type WorkflowNoticeState = {
  id: string;
  title: string;
  body: string;
  tone: WorkflowTone;
  action?: {
    label: string;
    onClick: () => void;
  };
};
type NotificationTiming = {
  preferredLocalHour: number;
  preferredTimezone: string;
  timezoneMode: "auto" | "manual";
  deliveryStrategy: "morning" | "midday" | "evening" | "custom";
};

const ALETHEIA_SHARE_URL = "https://aletheia.mirrortalkpodcast.com?ref=share";
const ALETHEIA_SHARE_TEXT = "Aletheia is a calm AI-powered biblical wisdom companion for money, work, and stewardship.";
const MANUAL_CONTEXT_STORAGE_KEY = "aletheia_manual_context";
const THEME_STORAGE_KEY = "aletheia_theme_preference";
const VOICE_STORAGE_KEY = "aletheia_selected_voice";
const NOTIFICATION_TIMING_STORAGE_KEY = "aletheia_notification_timing";
const COUNSEL_STATUS_TRACKING_KEY = "aletheia_counsel_status_tracking";
const CARRY_TODAY_STORAGE_KEY = "aletheia_carry_today";
const SCRIPTURE_MEMORY_STORAGE_KEY = "aletheia_scripture_memory";
const UPDATE_REFRESH_PENDING_KEY = "aletheia_update_refresh_pending";
const FOCUS_INTENTIONS_STORAGE_KEY = "aletheia_focus_intentions";
const GRATITUDE_LENS_STORAGE_KEY = "aletheia_gratitude_lens";
const MAX_GRATITUDE_ENTRIES = 12;
const GRATITUDE_REFLECTION_DEFAULT_HOUR = 19;
const SUPPORT_MISSION_LINKS: Array<{ channel: SupportMissionChannel; href: string; labelKey: string; fallback: string }> = [
  {
    channel: "stripe",
    href: process.env.NEXT_PUBLIC_ALETHEIA_STRIPE_DONATION_URL || "",
    labelKey: "supportMission.cardWallet",
    fallback: "Card, Apple Pay, or Google Pay",
  },
  {
    channel: "paypal",
    href: process.env.NEXT_PUBLIC_ALETHEIA_PAYPAL_DONATION_URL || "",
    labelKey: "supportMission.paypal",
    fallback: "PayPal",
  },
  {
    channel: "bank",
    href: process.env.NEXT_PUBLIC_ALETHEIA_BANK_SUPPORT_URL || "",
    labelKey: "supportMission.bankTransfer",
    fallback: "Bank transfer",
  },
  {
    channel: "general",
    href: process.env.NEXT_PUBLIC_ALETHEIA_SUPPORT_URL || "",
    labelKey: "supportMission.supportPage",
    fallback: "Support page",
  },
  {
    channel: "contact",
    href: process.env.NEXT_PUBLIC_ALETHEIA_SUPPORT_CONTACT_EMAIL
      ? `mailto:${process.env.NEXT_PUBLIC_ALETHEIA_SUPPORT_CONTACT_EMAIL}?subject=Aletheia%20mission%20support`
      : "",
    labelKey: "supportMission.contactUs",
    fallback: "Contact us",
  },
];
const DEFAULT_NOTIFICATION_TIMING: NotificationTiming = {
  preferredLocalHour: 8,
  preferredTimezone: "UTC",
  timezoneMode: "auto",
  deliveryStrategy: "morning",
};

const languageFlags: Record<LanguageCode, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  fr: "🇫🇷",
  pt: "🇧🇷",
  de: "🇩🇪",
  yo: "🇳🇬",
  ig: "🇳🇬",
  ha: "🇳🇬",
};

type FocusIntentionKey =
  | "reduce_anxiety"
  | "improve_stewardship"
  | "wait_with_peace"
  | "build_consistency"
  | "seek_counsel";

const focusIntentionLibrary: Array<{
  key: FocusIntentionKey;
  label: string;
  companionPrompt: string;
  decisionsPrompt: string;
}> = [
  {
    key: "reduce_anxiety",
    label: "Reduce anxiety",
    companionPrompt: "Help me move from anxiety to steady trust in this situation.",
    decisionsPrompt: "What is one calmer next step I can take before making this decision?",
  },
  {
    key: "improve_stewardship",
    label: "Improve stewardship",
    companionPrompt: "How can I practice faithful stewardship with today's money and work choices?",
    decisionsPrompt: "Which option best reflects faithful stewardship over comfort or image?",
  },
  {
    key: "wait_with_peace",
    label: "Wait with peace",
    companionPrompt: "Guide me to wait with peace instead of urgency in this pressure.",
    decisionsPrompt: "How long should I wait before acting so I can discern with peace?",
  },
  {
    key: "build_consistency",
    label: "Build consistency",
    companionPrompt: "Give me one small daily rhythm to stay consistent this week.",
    decisionsPrompt: "What repeatable step can keep this decision process consistent over time?",
  },
  {
    key: "seek_counsel",
    label: "Seek counsel wisely",
    companionPrompt: "Who should I invite into counsel for this decision, and what should I ask them?",
    decisionsPrompt: "What counsel checkpoint should I set before finalizing this decision?",
  },
];

function focusIntentionLabels(keys: string[] | undefined | null) {
  const safeKeys = Array.isArray(keys) ? keys : [];
  const lookup = new Map(focusIntentionLibrary.map((item) => [item.key, item.label]));
  return safeKeys.map((key) => lookup.get(key as FocusIntentionKey)).filter(Boolean) as string[];
}

function focusIntentionPrompt(keys: string[] | undefined | null, surface: "companion" | "decisions") {
  const safeKeys = Array.isArray(keys) ? keys : [];
  for (const key of safeKeys) {
    const found = focusIntentionLibrary.find((item) => item.key === key);
    if (!found) {
      continue;
    }
    return surface === "companion" ? found.companionPrompt : found.decisionsPrompt;
  }
  return "";
}

function localizedFocusIntentions(ts: (key: string, fallback?: string) => string) {
  return focusIntentionLibrary.map((item) => ({
    ...item,
    label: ts(`focusIntentions.${item.key}.label`, item.label),
    body: ts(`focusIntentions.${item.key}.body`, item.companionPrompt),
  }));
}

const uiText: Record<
  LanguageCode,
  {
    nav: Record<View, string>;
    decideShort: string;
    guardrails: string;
    guardrailItems: string[];
    wisdomMode: string;
    currentLens: string;
    offline: string;
    languageSelect: string;
    bibleSelect: string;
    account: string;
    askTitle: string;
    askIntro: string;
    yourQuestion: string;
    askButton: string;
    startHere: string;
    ready: string;
    whatModeFor: string;
    deepChecks: string;
    blindSpots: string;
    maturitySignals: string;
    modeGuidance: string;
    change: string;
    showDetails: string;
    hideDetails: string;
    modeGuidancePreview: string;
    trustLayer: string;
    preferencesTitle: string;
    language: string;
    region: string;
    bible: string;
    voiceControls: string;
    available: string;
    englishFallback: string;
    greetingMorning?: string;
    greetingAfternoon?: string;
    greetingEvening?: string;
    greetingFallback?: string;
    greetingIntent?: string;
    personalizedPriority?: string;
    whatNext?: string;
    whatNextBody?: string;
    personalizationNudgeTitle?: string;
    personalizationNudgeBody?: string;
    continueDecision?: string;
    askOneQuestion?: string;
    askOneQuestionBody?: string;
    askNewQuestion?: string;
    askNewQuestionBody?: string;
    reflectToday?: string;
    reviewPattern?: string;
    enableNotifications?: string;
    enableSync?: string;
    notificationPromptBody?: string;
    syncDevicesBody?: string;
    startDecision?: string;
    startDecisionBody?: string;
    tinyPractice?: string;
    todaysCompanion?: string;
    todayPrefix?: string;
    wisdomPrinciple?: string;
    reflectionQuestion?: string;
    carryThisToday?: string;
    carryWithMe?: string;
    carryCard?: string;
    createCard?: string;
    createWisdomPostcard?: string;
    carryScriptureForWeek?: string;
    scriptureMemory?: string;
    clearScriptureMemory?: string;
    weeklyWisdomReview?: string;
    weeklyReviewTitle?: string;
    weeklyReviewBody?: string;
    questionsThisWeek?: string;
    reflectionsThisWeek?: string;
    gratitudeThisWeek?: string;
    decisionsThisWeek?: string;
    nextFaithfulStep?: string;
    askAboutThis?: string;
    saveToRuleOfLife?: string;
    carryingToday?: string;
    currentCounsel?: string;
    modeShapesCounsel?: string;
    trackThisDecision?: string;
    saveAsReflection?: string;
    createCounselSummary?: string;
    goDeeper?: string;
    waitThreeDays?: string;
    shareAnswerPrompt?: string;
    sharePrivacyNote?: string;
    shareAletheia?: string;
    feedbackQuestion?: string;
    feedbackHelpful?: string;
    feedbackMildlyHelpful?: string;
    feedbackTooVague?: string;
    feedbackTooPreachy?: string;
    feedbackNotRelevant?: string;
    badgesFormation?: string;
    firstReflectionSaved?: string;
    firstDecisionTracked?: string;
    soughtCounsel?: string;
    waitingModeUsed?: string;
    ruleOfLifeCreated?: string;
    notificationsEnabled?: string;
    sevenDaysPractice?: string;
    formationNote?: string;
    milestoneShareTitle?: string;
    milestoneShareBody?: string;
    welcomeCounsel?: string;
    trustScriptureBody?: string;
    trustBoundaryBody?: string;
    trustMemoryBody?: string;
    trustConnectedDataBody?: string;
    accountNextEyebrow?: string;
    accountNextReviewSyncFormation?: string;
    accountNextSignInPortable?: string;
    accountNextActiveBody?: string;
    accountNextSyncBody?: string;
    accountNextGuestBody?: string;
    accountManageSummary?: string;
    accountSignedInAs?: string;
    accountSignInOrGuest?: string;
    accountSyncActive?: string;
    accountNotificationsNotEnabled?: string;
    accountGuestSummary?: string;
    accountPreferencesEyebrow?: string;
    accountPreferencesSummary?: string;
    accountContextActive?: string;
    accountContextPaused?: string;
    accountArea?: string;
    accountAreas?: string;
    accountAdded?: string;
    accountManualContextSummary?: string;
    accountDailyWisdomEnabled?: string;
    accountNotificationsSummaryEnabled?: string;
    accountNotificationsSummaryDisabled?: string;
    accountInstallTitle?: string;
    accountInstallSummary?: string;
    accountInstallEyebrow?: string;
    accountInviteTitle?: string;
    accountInviteSummary?: string;
    accountInviteEyebrow?: string;
    accountHistoryConversations?: string;
    accountHistoryDecisions?: string;
    accountHistoryReflections?: string;
    accountHistorySummary?: string;
    accountStatConversations?: string;
    accountStatDecisions?: string;
    accountStatJournalEntries?: string;
    accountHistoryEmptyBody?: string;
    accountTrustPostureTitle?: string;
    accountTrustPostureSummary?: string;
    accountBoundariesTitle?: string;
    accountBoundariesSummary?: string;
    accountBoundariesBody?: string;
    accountFormationPrefix?: string;
    accountQuietMilestoneSingular?: string;
    accountQuietMilestonePlural?: string;
    accountFormationSummary?: string;
  }
> = {
  en: {
    nav: { companion: "Home", decisions: "Decisions", reflect: "Reflect", library: "Library", account: "Account" },
    decideShort: "Decide",
    guardrails: "Guardrails",
    guardrailItems: ["Never predicts financial outcomes.", "Never invents scripture references.", "Encourages counsel for high-stakes choices."],
    wisdomMode: "Wisdom mode",
    currentLens: "Current lens",
    offline: "Offline",
    languageSelect: "Change language",
    bibleSelect: "Change Bible translation",
    account: "Account",
    askTitle: "Ask Aletheia",
    askIntro: "Start with one honest question. Aletheia will slow the moment down and help you discern clearly.",
    yourQuestion: "Your question",
    askButton: "Ask",
    startHere: "Start here",
    ready: "Ready",
    whatModeFor: "What this mode is for",
    deepChecks: "Deep checks",
    blindSpots: "Blind spots",
    maturitySignals: "Maturity signals",
    modeGuidance: "Mode guidance",
    change: "Change",
    showDetails: "Show details",
    hideDetails: "Hide details",
    modeGuidancePreview: "Keep this view focused. Expand when you want deeper checks, blind spots, and maturity signals.",
    trustLayer: "Trust layer",
    preferencesTitle: "Language and region",
    language: "Language",
    region: "Region",
    bible: "Bible",
    voiceControls: "Voice controls",
    available: "Available",
    englishFallback: "English fallback",
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    greetingFallback: "Welcome back",
    greetingIntent: "Let's choose one wise next step today.",
    personalizedPriority: "Personalized priority",
    whatNext: "What should I do next?",
    whatNextBody: "Aletheia is choosing one wise next action first. Ask and mode controls stay easy to reach when you want to begin something new.",
    personalizationNudgeTitle: "Want more personal counsel?",
    personalizationNudgeBody: "Add one detail about money, work, or rhythm.",
    continueDecision: "Continue this decision",
    askOneQuestion: "Ask one question",
    askOneQuestionBody: "Start with the pressure or decision you are carrying right now.",
    askNewQuestion: "Ask a new question",
    askNewQuestionBody: "The Companion input and wisdom modes stay close at hand.",
    reflectToday: "Reflect on today",
    reviewPattern: "Review a pattern",
    enableNotifications: "Enable notifications",
    enableSync: "Enable sync",
    notificationPromptBody: "Receive one quiet daily wisdom prompt.",
    syncDevicesBody: "Keep decisions and reflections across devices.",
    startDecision: "Start a decision",
    startDecisionBody: "Track a high-stakes choice over time.",
    tinyPractice: "Tiny practice",
    todaysCompanion: "Today's companion",
    todayPrefix: "Today",
    wisdomPrinciple: "Wisdom principle",
    reflectionQuestion: "Question",
    carryThisToday: "Carry this today",
    carryWithMe: "Carry with me",
    carryCard: "Carry Card",
    createCard: "Create card",
    createWisdomPostcard: "Create wisdom card",
    carryScriptureForWeek: "Carry scripture",
    scriptureMemory: "Scripture memory",
    clearScriptureMemory: "Stop carrying scripture",
    weeklyWisdomReview: "Weekly Wisdom Review",
    weeklyReviewTitle: "A quiet look at your week",
    weeklyReviewBody: "No streaks or pressure. Just notice how {pattern} has been shaping your discernment.",
    questionsThisWeek: "Questions",
    reflectionsThisWeek: "Reflections",
    gratitudeThisWeek: "Gratitude",
    decisionsThisWeek: "Decisions",
    nextFaithfulStep: "Next faithful step",
    askAboutThis: "Ask about this",
    saveToRuleOfLife: "Save to Rule of Life",
    carryingToday: "Carrying today",
    currentCounsel: "Current counsel",
    modeShapesCounsel: "mode is shaping this counsel around",
    trackThisDecision: "Track this decision",
    saveAsReflection: "Save as reflection",
    createCounselSummary: "Create counsel summary",
    goDeeper: "Go deeper",
    waitThreeDays: "Wait 3 days",
    shareAnswerPrompt: "Share Aletheia with someone who may benefit from this kind of counsel.",
    sharePrivacyNote: "This shares the app link only, not your question or Aletheia’s private answer.",
    shareAletheia: "Share Aletheia",
    feedbackQuestion: "Was this counsel useful?",
    feedbackHelpful: "Helpful",
    feedbackMildlyHelpful: "Mildly helpful",
    feedbackTooVague: "Too vague",
    feedbackTooPreachy: "Too preachy",
    feedbackNotRelevant: "Not relevant",
    badgesFormation: "Badges / Formation",
    firstReflectionSaved: "First reflection saved",
    firstDecisionTracked: "First decision tracked",
    soughtCounsel: "Sought counsel",
    waitingModeUsed: "Waiting mode used",
    ruleOfLifeCreated: "Rule of life created",
    notificationsEnabled: "Notifications enabled",
    sevenDaysPractice: "7 days of wisdom practice",
    formationNote: "These are quiet signs of formation, not points to chase. The first milestone usually begins with saving one reflection.",
    milestoneShareTitle: "Know someone making a major decision?",
    milestoneShareBody: "You can invite them to Aletheia without sharing anything private from your account.",
    welcomeCounsel:
      "Bring a real decision, pressure, or money question. I will answer from the curated wisdom library, with emotional clarity and no financial promises.",
    trustScriptureBody:
      "Scripture references come from Aletheia’s curated wisdom library. If a verse appears, you can tap it to see context and why it matters.",
    trustBoundaryBody:
      "Aletheia will not promise outcomes, predict markets, claim divine certainty, or replace qualified financial, legal, tax, medical, or pastoral counsel.",
    trustMemoryBody:
      "Signed-in memory helps continuity across decisions, reflections, counsel, and rules of life. It should make guidance more personal without exposing private details unnecessarily.",
    trustConnectedDataBody:
      "Future health, finance, or device integrations should be permission-by-permission, off by default, and limited to the exact data the user chooses to connect.",
    accountNextEyebrow: "Next in Account",
    accountNextReviewSyncFormation: "Review sync and formation",
    accountNextSignInPortable: "Sign in to make Aletheia portable",
    accountNextActiveBody: "Your account is active. Review preferences, history, and formation milestones when you need to.",
    accountNextSyncBody: "Sync is active. Turn on one quiet daily wisdom prompt if this device should receive it.",
    accountNextGuestBody: "Use Google or email to sync decisions, reflections, preferences, counsel, and notifications across devices.",
    accountManageSummary: "Manage sign-in, sync, language, notifications, history, and formation milestones without crowding the wisdom companion.",
    accountSignedInAs: "Signed in as",
    accountSignInOrGuest: "Sign in or continue as guest",
    accountSyncActive: "Sync active.",
    accountNotificationsNotEnabled: "Notifications not enabled yet.",
    accountGuestSummary: "Google and email sign-in keep history, preferences, decisions, and notifications portable.",
    accountPreferencesEyebrow: "Preferences",
    accountPreferencesSummary: "Language, Bible translation, appearance, region, and voice stay here so the Companion stays calm.",
    accountContextActive: "Context active",
    accountContextPaused: "Context paused",
    accountArea: "area",
    accountAreas: "areas",
    accountAdded: "added",
    accountManualContextSummary: "Manual context is optional and private. Add only what should shape Aletheia's counsel.",
    accountDailyWisdomEnabled: "Daily wisdom enabled",
    accountNotificationsSummaryEnabled: "Aletheia will use your saved local timing preference.",
    accountNotificationsSummaryDisabled: "Turn on one quiet daily prompt when this device is ready.",
    accountInstallTitle: "Add Aletheia to your home screen",
    accountInstallSummary: "Install instructions are tucked away until someone needs the app-like setup.",
    accountInstallEyebrow: "Install Aletheia",
    accountInviteTitle: "Invite someone privately",
    accountInviteSummary: "Share only the Aletheia link, never private questions, journals, or counsel by default.",
    accountInviteEyebrow: "Invite Someone",
    accountHistoryConversations: "conversations",
    accountHistoryDecisions: "decisions",
    accountHistoryReflections: "reflections",
    accountHistorySummary: "History stays collapsed until you want to review what has been saved.",
    accountStatConversations: "Conversations",
    accountStatDecisions: "Decisions",
    accountStatJournalEntries: "Journal entries",
    accountHistoryEmptyBody: "Start with one honest question or one decision under pressure. Aletheia will keep the record quiet and useful.",
    accountTrustPostureTitle: "Trust and privacy posture",
    accountTrustPostureSummary: "Boundaries, scripture sourcing, saved data, and sharing posture are available without flooding the page.",
    accountBoundariesTitle: "Aletheia's guardrails",
    accountBoundariesSummary: "The app's safety boundaries remain visible when needed, not constantly in the way.",
    accountBoundariesBody: "These constraints protect you from harmful AI advice and keep Aletheia faithful to its purpose.",
    accountFormationPrefix: "Formation",
    accountQuietMilestoneSingular: "quiet milestone",
    accountQuietMilestonePlural: "quiet milestones",
    accountFormationSummary: "Formation is a calm record of practice, not a scoreboard.",
  },
  es: {
    nav: { companion: "Inicio", decisions: "Decisiones", reflect: "Reflexión", library: "Biblioteca", account: "Cuenta" },
    decideShort: "Decidir",
    guardrails: "Límites",
    guardrailItems: ["Nunca predice resultados financieros.", "Nunca inventa referencias bíblicas.", "Anima a buscar consejo en decisiones importantes."],
    wisdomMode: "Modo de sabiduría",
    currentLens: "Enfoque actual",
    offline: "Sin conexión",
    languageSelect: "Cambiar idioma",
    bibleSelect: "Cambiar traducción bíblica",
    account: "Cuenta",
    askTitle: "Pregunta a Aletheia",
    askIntro: "Empieza con una pregunta honesta. Aletheia ayuda a bajar la prisa y discernir con claridad.",
    yourQuestion: "Tu pregunta",
    askButton: "Preguntar",
    startHere: "Empieza aquí",
    ready: "Listo",
    whatModeFor: "Para qué sirve este modo",
    deepChecks: "Revisiones profundas",
    blindSpots: "Puntos ciegos",
    maturitySignals: "Señales de madurez",
    modeGuidance: "Guía del modo",
    change: "Cambiar",
    showDetails: "Mostrar detalles",
    hideDetails: "Ocultar detalles",
    modeGuidancePreview: "Mantén esta vista enfocada. Expande cuando quieras revisar señales profundas, puntos ciegos y madurez.",
    trustLayer: "Capa de confianza",
    preferencesTitle: "Idioma y región",
    language: "Idioma",
    region: "Región",
    bible: "Biblia",
    voiceControls: "Controles de voz",
    available: "Disponible",
    englishFallback: "Recurso en inglés",
    todaysCompanion: "Compañero de hoy",
    todayPrefix: "Hoy",
    wisdomPrinciple: "Principio de sabiduría",
    tinyPractice: "Práctica breve",
    reflectionQuestion: "Pregunta",
    carryThisToday: "Lleva esto hoy",
    carryWithMe: "Llevar conmigo",
    askAboutThis: "Preguntar sobre esto",
    saveToRuleOfLife: "Guardar como regla de vida",
    carryingToday: "Llevando hoy",
    accountNextEyebrow: "Siguiente en Cuenta",
    accountNextReviewSyncFormation: "Revisar sincronización y formación",
    accountNextSignInPortable: "Inicia sesión para hacer Aletheia portátil",
    accountNextActiveBody: "Tu cuenta está activa. Revisa preferencias, historial y formación cuando lo necesites.",
    accountNextSyncBody: "La sincronización está activa. Activa una notificación diaria tranquila si este dispositivo debe recibirla.",
    accountNextGuestBody: "Usa Google o correo para sincronizar decisiones, reflexiones, preferencias, consejería y notificaciones entre dispositivos.",
    accountManageSummary: "Gestiona inicio de sesión, sincronización, idioma, notificaciones, historial y formación sin saturar al acompañante de sabiduría.",
    accountSignedInAs: "Sesión iniciada como",
    accountSignInOrGuest: "Inicia sesión o continúa como invitado",
    accountSyncActive: "Sincronización activa.",
    accountNotificationsNotEnabled: "Notificaciones aún no activadas.",
    accountGuestSummary: "El inicio de sesión con Google y correo mantiene portátil tu historial, preferencias, decisiones y notificaciones.",
    accountPreferencesEyebrow: "Preferencias",
    accountPreferencesSummary: "Idioma, traducción bíblica, apariencia, región y voz se quedan aquí para que el Acompañante se mantenga sereno.",
    accountContextActive: "Contexto activo",
    accountContextPaused: "Contexto en pausa",
    accountArea: "área",
    accountAreas: "áreas",
    accountAdded: "agregadas",
    accountManualContextSummary: "El contexto manual es opcional y privado. Agrega solo lo que deba moldear el consejo de Aletheia.",
    accountDailyWisdomEnabled: "Sabiduría diaria activada",
    accountNotificationsSummaryEnabled: "Aletheia usará tu preferencia de horario local guardada.",
    accountNotificationsSummaryDisabled: "Activa un aviso diario tranquilo cuando este dispositivo esté listo.",
    accountInstallTitle: "Agrega Aletheia a tu pantalla de inicio",
    accountInstallSummary: "Las instrucciones de instalación quedan ocultas hasta que alguien necesite la configuración tipo app.",
    accountInstallEyebrow: "Instalar Aletheia",
    accountInviteTitle: "Invita a alguien en privado",
    accountInviteSummary: "Comparte solo el enlace de Aletheia; nunca preguntas privadas, diarios o consejos por defecto.",
    accountInviteEyebrow: "Invitar a alguien",
    accountHistoryConversations: "conversaciones",
    accountHistoryDecisions: "decisiones",
    accountHistoryReflections: "reflexiones",
    accountHistorySummary: "El historial se mantiene plegado hasta que quieras revisar lo guardado.",
    accountStatConversations: "Conversaciones",
    accountStatDecisions: "Decisiones",
    accountStatJournalEntries: "Entradas de diario",
    accountHistoryEmptyBody: "Empieza con una pregunta honesta o una decisión bajo presión. Aletheia mantendrá el registro sobrio y útil.",
    accountTrustPostureTitle: "Postura de confianza y privacidad",
    accountTrustPostureSummary: "Límites, fuentes bíblicas, datos guardados y postura de compartición están disponibles sin saturar la página.",
    accountBoundariesTitle: "Límites de Aletheia",
    accountBoundariesSummary: "Los límites de seguridad de la app se mantienen visibles cuando hacen falta, sin estorbar constantemente.",
    accountBoundariesBody: "Estas restricciones te protegen de consejos dañinos de IA y mantienen a Aletheia fiel a su propósito.",
    accountFormationPrefix: "Formación",
    accountQuietMilestoneSingular: "hito sereno",
    accountQuietMilestonePlural: "hitos serenos",
    accountFormationSummary: "La formación es un registro sereno de práctica, no un marcador.",
  },
  fr: {
    nav: { companion: "Accueil", decisions: "Décisions", reflect: "Réflexion", library: "Bibliothèque", account: "Compte" },
    decideShort: "Décider",
    guardrails: "Garde-fous",
    guardrailItems: ["Ne prédit jamais les résultats financiers.", "N’invente jamais de références bibliques.", "Encourage le conseil pour les choix importants."],
    wisdomMode: "Mode sagesse",
    currentLens: "Angle actuel",
    offline: "Hors ligne",
    languageSelect: "Changer de langue",
    bibleSelect: "Changer de traduction biblique",
    account: "Compte",
    askTitle: "Demander à Aletheia",
    askIntro: "Commence par une question honnête. Aletheia ralentit le moment et aide à discerner clairement.",
    yourQuestion: "Ta question",
    askButton: "Demander",
    startHere: "Commencer ici",
    ready: "Prêt",
    whatModeFor: "À quoi sert ce mode",
    deepChecks: "Vérifications profondes",
    blindSpots: "Angles morts",
    maturitySignals: "Signes de maturité",
    modeGuidance: "Repères du mode",
    change: "Changer",
    showDetails: "Afficher les détails",
    hideDetails: "Masquer les détails",
    modeGuidancePreview: "Garde cette vue concentrée. Déploie-la pour voir les vérifications profondes, angles morts et signes de maturité.",
    trustLayer: "Couche de confiance",
    preferencesTitle: "Langue et région",
    language: "Langue",
    region: "Région",
    bible: "Bible",
    voiceControls: "Commandes vocales",
    available: "Disponible",
    englishFallback: "Repli anglais",
    todaysCompanion: "Compagnon du jour",
    todayPrefix: "Aujourd'hui",
    wisdomPrinciple: "Principe de sagesse",
    tinyPractice: "Petite pratique",
    reflectionQuestion: "Question",
    carryThisToday: "À porter aujourd'hui",
    carryWithMe: "Porter avec moi",
    askAboutThis: "Questionner cela",
    saveToRuleOfLife: "Ajouter à ma règle de vie",
    carryingToday: "Porté aujourd'hui",
    accountNextEyebrow: "À venir dans Compte",
    accountNextReviewSyncFormation: "Vérifier la synchronisation et la formation",
    accountNextSignInPortable: "Connectez-vous pour rendre Aletheia portable",
    accountNextActiveBody: "Votre compte est actif. Consultez préférences, historique et jalons de formation quand nécessaire.",
    accountNextSyncBody: "La synchronisation est active. Activez une invite quotidienne discrète si cet appareil doit la recevoir.",
    accountNextGuestBody: "Utilisez Google ou l'e-mail pour synchroniser décisions, réflexions, préférences, conseil et notifications entre appareils.",
    accountManageSummary: "Gérez connexion, synchronisation, langue, notifications, historique et jalons de formation sans encombrer le compagnon de sagesse.",
    accountSignedInAs: "Connecté en tant que",
    accountSignInOrGuest: "Se connecter ou continuer en invité",
    accountSyncActive: "Synchronisation active.",
    accountNotificationsNotEnabled: "Notifications pas encore activées.",
    accountGuestSummary: "La connexion Google et e-mail garde votre historique, vos préférences, vos décisions et notifications portables.",
    accountPreferencesEyebrow: "Préférences",
    accountPreferencesSummary: "Langue, traduction biblique, apparence, région et voix restent ici pour garder le Compagnon apaisé.",
    accountContextActive: "Contexte actif",
    accountContextPaused: "Contexte en pause",
    accountArea: "zone",
    accountAreas: "zones",
    accountAdded: "ajoutées",
    accountManualContextSummary: "Le contexte manuel est optionnel et privé. Ajoutez seulement ce qui doit façonner le conseil d'Aletheia.",
    accountDailyWisdomEnabled: "Sagesse quotidienne activée",
    accountNotificationsSummaryEnabled: "Aletheia utilisera votre préférence horaire locale enregistrée.",
    accountNotificationsSummaryDisabled: "Activez une invite quotidienne discrète quand cet appareil est prêt.",
    accountInstallTitle: "Ajouter Aletheia à l'écran d'accueil",
    accountInstallSummary: "Les instructions d'installation restent discrètes jusqu'au moment où elles sont utiles.",
    accountInstallEyebrow: "Installer Aletheia",
    accountInviteTitle: "Inviter quelqu'un en privé",
    accountInviteSummary: "Partagez uniquement le lien Aletheia, jamais les questions privées, journaux ou conseils par défaut.",
    accountInviteEyebrow: "Inviter quelqu'un",
    accountHistoryConversations: "conversations",
    accountHistoryDecisions: "décisions",
    accountHistoryReflections: "réflexions",
    accountHistorySummary: "L'historique reste replié jusqu'au moment où vous voulez revoir ce qui est enregistré.",
    accountStatConversations: "Conversations",
    accountStatDecisions: "Décisions",
    accountStatJournalEntries: "Entrées de journal",
    accountHistoryEmptyBody: "Commencez par une question honnête ou une décision sous pression. Aletheia gardera l'historique sobre et utile.",
    accountTrustPostureTitle: "Posture confiance et confidentialité",
    accountTrustPostureSummary: "Limites, sources scripturaires, données enregistrées et posture de partage restent accessibles sans surcharger la page.",
    accountBoundariesTitle: "Garde-fous d'Aletheia",
    accountBoundariesSummary: "Les limites de sécurité de l'app restent visibles au besoin, sans gêner en permanence.",
    accountBoundariesBody: "Ces limites vous protègent des conseils IA nuisibles et gardent Aletheia fidèle à sa mission.",
    accountFormationPrefix: "Formation",
    accountQuietMilestoneSingular: "jalon discret",
    accountQuietMilestonePlural: "jalons discrets",
    accountFormationSummary: "La formation est un suivi serein de la pratique, pas un tableau de score.",
  },
  pt: {
    nav: { companion: "Início", decisions: "Decisões", reflect: "Refletir", library: "Biblioteca", account: "Conta" },
    decideShort: "Decidir",
    guardrails: "Limites",
    guardrailItems: ["Nunca prevê resultados financeiros.", "Nunca inventa referências bíblicas.", "Incentiva conselho em escolhas importantes."],
    wisdomMode: "Modo de sabedoria",
    currentLens: "Lente atual",
    offline: "Offline",
    languageSelect: "Mudar idioma",
    bibleSelect: "Mudar tradução bíblica",
    account: "Conta",
    askTitle: "Pergunte à Aletheia",
    askIntro: "Comece com uma pergunta honesta. Aletheia ajuda a desacelerar e discernir com clareza.",
    yourQuestion: "Sua pergunta",
    askButton: "Perguntar",
    startHere: "Comece aqui",
    ready: "Pronto",
    whatModeFor: "Para que serve este modo",
    deepChecks: "Verificações profundas",
    blindSpots: "Pontos cegos",
    maturitySignals: "Sinais de maturidade",
    modeGuidance: "Guia do modo",
    change: "Alterar",
    showDetails: "Mostrar detalhes",
    hideDetails: "Ocultar detalhes",
    modeGuidancePreview: "Mantenha esta visão focada. Expanda quando quiser ver verificações profundas, pontos cegos e sinais de maturidade.",
    trustLayer: "Camada de confiança",
    preferencesTitle: "Idioma e região",
    language: "Idioma",
    region: "Região",
    bible: "Bíblia",
    voiceControls: "Controles de voz",
    available: "Disponível",
    englishFallback: "Recurso em inglês",
    greetingMorning: "Bom dia",
    greetingAfternoon: "Boa tarde",
    greetingEvening: "Boa noite",
    greetingFallback: "Bem-vindo de volta",
    greetingIntent: "Vamos escolher um próximo passo sábio hoje.",
    personalizedPriority: "Prioridade personalizada",
    whatNext: "O que devo fazer a seguir?",
    whatNextBody: "Aletheia escolhe primeiro uma ação sábia. O campo de pergunta e os controles de modo ficam logo abaixo quando você quiser começar algo novo.",
    continueDecision: "Continuar com esta decisão",
    askOneQuestion: "Fazer uma pergunta",
    askOneQuestionBody: "Comece com a pressão ou decisão que você está carregando agora.",
    askNewQuestion: "Fazer uma nova pergunta",
    askNewQuestionBody: "O campo Companion e os modos de sabedoria estão logo abaixo.",
    reflectToday: "Refletir sobre hoje",
    reviewPattern: "Revisar um padrão",
    enableNotifications: "Ativar notificações",
    enableSync: "Ativar sincronização",
    notificationPromptBody: "Receba um lembrete diário de sabedoria em silêncio.",
    syncDevicesBody: "Mantenha decisões e reflexões em todos os dispositivos.",
    startDecision: "Iniciar uma decisão",
    startDecisionBody: "Rastreie uma escolha importante ao longo do tempo.",
    todaysCompanion: "Companheiro de hoje",
    todayPrefix: "Hoje",
    wisdomPrinciple: "Princípio de sabedoria",
    tinyPractice: "Pequena prática",
    reflectionQuestion: "Pergunta",
    carryThisToday: "Leve isto hoje",
    carryWithMe: "Levar comigo",
    askAboutThis: "Perguntar sobre isto",
    saveToRuleOfLife: "Salvar como regra de vida",
    carryingToday: "Levando hoje",
    currentCounsel: "Conselho atual",
    modeShapesCounsel: "está moldando este conselho em torno de",
    trackThisDecision: "Rastrear esta decisão",
    saveAsReflection: "Salvar como reflexão",
    createCounselSummary: "Criar resumo para conselheiro",
    goDeeper: "Aprofundar mais",
    waitThreeDays: "Esperar 3 dias",
    shareAnswerPrompt: "Compartilhe Aletheia com alguém que possa se beneficiar deste tipo de conselho.",
    sharePrivacyNote: "Isso compartilha apenas o link do app, não sua pergunta nem a resposta privada de Aletheia.",
    shareAletheia: "Compartilhar Aletheia",
    feedbackQuestion: "Este conselho foi útil?",
    feedbackHelpful: "Útil",
    feedbackMildlyHelpful: "Um pouco útil",
    feedbackTooVague: "Muito vago",
    feedbackTooPreachy: "Muito pregador",
    feedbackNotRelevant: "Não relevante",
    badgesFormation: "Distintivos / Formação",
    firstReflectionSaved: "Primeira reflexão salva",
    firstDecisionTracked: "Primeira decisão rastreada",
    soughtCounsel: "Buscou conselho",
    waitingModeUsed: "Modo de espera usado",
    ruleOfLifeCreated: "Regra de vida criada",
    notificationsEnabled: "Notificações ativadas",
    sevenDaysPractice: "7 dias de prática de sabedoria",
    formationNote: "Estes são sinais silenciosos de formação, não pontos a perseguir. O primeiro marco geralmente começa salvando uma reflexão.",
    milestoneShareTitle: "Conhece alguém tomando uma decisão importante?",
    milestoneShareBody: "Você pode convidá-los para Aletheia sem compartilhar nada privado de sua conta.",
    welcomeCounsel:
      "Traga uma decisão real, pressão ou pergunta sobre dinheiro. Responderei da biblioteca de sabedoria curada, com clareza emocional e sem promessas financeiras.",
    trustScriptureBody:
      "As referências bíblicas vêm da biblioteca de sabedoria curada de Aletheia. Se um versículo aparecer, você pode tocá-lo para ver o contexto e por que importa.",
    trustBoundaryBody:
      "Aletheia não prometerá resultados, não preverá mercados, não afirmará certeza divina, nem substituirá o conselho qualificado financeiro, legal, fiscal, médico ou pastoral.",
    trustMemoryBody:
      "A memória conectada ajuda na continuidade entre decisões, reflexões, conselho e regras de vida. Deve tornar a orientação mais pessoal sem expor detalhes privados desnecessariamente.",
    trustConnectedDataBody:
      "Futuras integrações de saúde, finanças ou dispositivos devem ser permissão por permissão, desativadas por padrão e limitadas aos dados exatos que o usuário escolher conectar.",
    accountNextEyebrow: "A seguir na Conta",
    accountNextReviewSyncFormation: "Rever sincronização e formação",
    accountNextSignInPortable: "Entre para levar Aletheia com você",
    accountNextActiveBody: "Sua conta está ativa. Revise preferências, histórico e marcos de formação quando precisar.",
    accountNextSyncBody: "A sincronização está ativa. Ative um lembrete diário discreto de sabedoria se este dispositivo deve recebê-lo.",
    accountNextGuestBody: "Use Google ou email para sincronizar decisões, reflexões, preferências, conselhos e notificações entre dispositivos.",
    accountManageSummary: "Gerencie login, sincronização, idioma, notificações, histórico e marcos de formação sem lotar o companheiro de sabedoria.",
    accountSignedInAs: "Conectado como",
    accountSignInOrGuest: "Entrar ou continuar como convidado",
    accountSyncActive: "Sincronização ativa.",
    accountNotificationsNotEnabled: "Notificações ainda não ativadas.",
    accountGuestSummary: "O login por Google e email mantém histórico, preferências, decisões e notificações portáteis.",
    accountPreferencesEyebrow: "Preferências",
    accountPreferencesSummary: "Idioma, tradução bíblica, aparência, região e voz ficam aqui para que o Companheiro permaneça sereno.",
    accountContextActive: "Contexto ativo",
    accountContextPaused: "Contexto pausado",
    accountArea: "área",
    accountAreas: "áreas",
    accountAdded: "adicionadas",
    accountManualContextSummary: "O contexto manual é opcional e privado. Adicione apenas o que deve moldar o conselho da Aletheia.",
    accountDailyWisdomEnabled: "Sabedoria diária ativada",
    accountNotificationsSummaryEnabled: "Aletheia usará sua preferência local de horário já salva.",
    accountNotificationsSummaryDisabled: "Ative um lembrete diário discreto quando este dispositivo estiver pronto.",
    accountInstallTitle: "Adicione Aletheia à tela inicial",
    accountInstallSummary: "As instruções de instalação ficam discretas até alguém precisar da experiência de app.",
    accountInstallEyebrow: "Instalar Aletheia",
    accountInviteTitle: "Convide alguém em privado",
    accountInviteSummary: "Compartilhe apenas o link da Aletheia, nunca perguntas privadas, diários ou conselhos por padrão.",
    accountInviteEyebrow: "Convidar alguém",
    accountHistoryConversations: "conversas",
    accountHistoryDecisions: "decisões",
    accountHistoryReflections: "reflexões",
    accountHistorySummary: "O histórico permanece recolhido até você querer revisar o que foi salvo.",
    accountStatConversations: "Conversas",
    accountStatDecisions: "Decisões",
    accountStatJournalEntries: "Entradas de diário",
    accountHistoryEmptyBody: "Comece com uma pergunta honesta ou uma decisão sob pressão. Aletheia manterá o registro sóbrio e útil.",
    accountTrustPostureTitle: "Postura de confiança e privacidade",
    accountTrustPostureSummary: "Limites, origem das escrituras, dados salvos e postura de compartilhamento ficam disponíveis sem sobrecarregar a página.",
    accountBoundariesTitle: "Limites de proteção da Aletheia",
    accountBoundariesSummary: "Os limites de segurança do app ficam visíveis quando necessários, sem atrapalhar o tempo todo.",
    accountBoundariesBody: "Essas restrições protegem você de conselhos nocivos de IA e mantêm Aletheia fiel ao seu propósito.",
    accountFormationPrefix: "Formação",
    accountQuietMilestoneSingular: "marco silencioso",
    accountQuietMilestonePlural: "marcos silenciosos",
    accountFormationSummary: "A formação é um registro calmo de prática, não um placar.",
  },
  de: {
    nav: { companion: "Start", decisions: "Entscheidungen", reflect: "Reflektieren", library: "Bibliothek", account: "Konto" },
    decideShort: "Entscheiden",
    guardrails: "Leitplanken",
    guardrailItems: ["Sagt keine finanziellen Ergebnisse voraus.", "Erfindet keine Bibelstellen.", "Ermutigt bei wichtigen Entscheidungen zu Rat."],
    wisdomMode: "Weisheitsmodus",
    currentLens: "Aktuelle Perspektive",
    offline: "Offline",
    languageSelect: "Sprache ändern",
    bibleSelect: "Bibelübersetzung ändern",
    account: "Konto",
    askTitle: "Aletheia fragen",
    askIntro: "Beginne mit einer ehrlichen Frage. Aletheia verlangsamt den Moment und hilft dir klarer zu prüfen.",
    yourQuestion: "Deine Frage",
    askButton: "Fragen",
    startHere: "Hier beginnen",
    ready: "Bereit",
    whatModeFor: "Wofür dieser Modus ist",
    deepChecks: "Tiefe Prüfungen",
    blindSpots: "Blinde Flecken",
    maturitySignals: "Reifezeichen",
    modeGuidance: "Modus-Hinweise",
    change: "Ändern",
    showDetails: "Details zeigen",
    hideDetails: "Details ausblenden",
    modeGuidancePreview: "Halte diese Ansicht fokussiert. Erweitere sie, wenn du tiefere Prüfungen, blinde Flecken und Reifezeichen sehen möchtest.",
    trustLayer: "Vertrauensebene",
    preferencesTitle: "Sprache und Region",
    language: "Sprache",
    region: "Region",
    bible: "Bibel",
    voiceControls: "Sprachsteuerung",
    available: "Verfügbar",
    englishFallback: "Englischer Rückgriff",
    personalizedPriority: "Persönliche Priorität",
    whatNext: "Was sollte ich als Nächstes tun?",
    whatNextBody: "Aletheia zeigt zuerst einen weisen nächsten Schritt. Das Fragefeld und die Modi bleiben direkt darunter erreichbar.",
    continueDecision: "Diese Entscheidung fortsetzen",
    askOneQuestion: "Eine Frage stellen",
    askOneQuestionBody: "Beginne mit dem Druck oder der Entscheidung, die du gerade trägst.",
    askNewQuestion: "Neue Frage stellen",
    askNewQuestionBody: "Das Fragefeld und die Weisheitsmodi sind direkt darunter.",
    reflectToday: "Heute reflektieren",
    reviewPattern: "Muster prüfen",
    enableNotifications: "Benachrichtigungen aktivieren",
    enableSync: "Synchronisierung aktivieren",
    startDecision: "Entscheidung beginnen",
    startDecisionBody: "Verfolge eine wichtige Entscheidung über Zeit.",
    tinyPractice: "Kleine Übung",
    todaysCompanion: "Begleiter für heute",
    todayPrefix: "Heute",
    wisdomPrinciple: "Weisheitsprinzip",
    reflectionQuestion: "Frage",
    carryThisToday: "Heute mitnehmen",
    carryWithMe: "Mitnehmen",
    askAboutThis: "Dazu fragen",
    saveToRuleOfLife: "Als Lebensregel speichern",
    carryingToday: "Heute trägst du",
    currentCounsel: "Aktueller Rat",
    modeShapesCounsel: "Modus prägt diesen Rat mit der Perspektive",
    trackThisDecision: "Diese Entscheidung verfolgen",
    saveAsReflection: "Als Reflexion speichern",
    createCounselSummary: "Zusammenfassung für Ratgeber erstellen",
    goDeeper: "Tiefer gehen",
    waitThreeDays: "3 Tage warten",
    shareAnswerPrompt: "Teile Aletheia mit jemandem, dem diese Art von Rat helfen könnte.",
    sharePrivacyNote: "Dabei wird nur der App-Link geteilt, nicht deine Frage oder private Antwort.",
    shareAletheia: "Aletheia teilen",
    feedbackQuestion: "War dieser Rat hilfreich?",
    feedbackHelpful: "Hilfreich",
    feedbackMildlyHelpful: "Etwas hilfreich",
    feedbackTooVague: "Zu vage",
    feedbackTooPreachy: "Zu predigend",
    feedbackNotRelevant: "Nicht passend",
    badgesFormation: "Meilensteine / Formung",
    firstReflectionSaved: "Erste Reflexion gespeichert",
    firstDecisionTracked: "Erste Entscheidung verfolgt",
    soughtCounsel: "Rat gesucht",
    waitingModeUsed: "Wartemodus genutzt",
    ruleOfLifeCreated: "Lebensregel erstellt",
    notificationsEnabled: "Benachrichtigungen aktiviert",
    sevenDaysPractice: "7 Tage Weisheitspraxis",
    formationNote: "Das sind ruhige Zeichen von Formung, keine Punktejagd. Der erste Meilenstein beginnt meist mit einer gespeicherten Reflexion.",
    milestoneShareTitle: "Kennst du jemanden vor einer wichtigen Entscheidung?",
    milestoneShareBody: "Du kannst Aletheia empfehlen, ohne private Inhalte aus deinem Konto zu teilen.",
    accountNextEyebrow: "Als Nächstes im Konto",
    accountNextReviewSyncFormation: "Synchronisierung und Formung prüfen",
    accountNextSignInPortable: "Melde dich an, um Aletheia mobil mitzunehmen",
    accountNextActiveBody: "Dein Konto ist aktiv. Prüfe bei Bedarf Einstellungen, Verlauf und Formungs-Meilensteine.",
    accountNextSyncBody: "Synchronisierung ist aktiv. Aktiviere einen ruhigen täglichen Impuls, wenn dieses Gerät ihn erhalten soll.",
    accountNextGuestBody: "Nutze Google oder E-Mail, um Entscheidungen, Reflexionen, Einstellungen, Beratung und Benachrichtigungen geräteübergreifend zu synchronisieren.",
    accountManageSummary: "Verwalte Anmeldung, Synchronisierung, Sprache, Benachrichtigungen, Verlauf und Formungs-Meilensteine, ohne den Weisheitsbegleiter zu überladen.",
    accountSignedInAs: "Angemeldet als",
    accountSignInOrGuest: "Anmelden oder als Gast fortfahren",
    accountSyncActive: "Synchronisierung aktiv.",
    accountNotificationsNotEnabled: "Benachrichtigungen noch nicht aktiviert.",
    accountGuestSummary: "Google- und E-Mail-Anmeldung halten Verlauf, Einstellungen, Entscheidungen und Benachrichtigungen portabel.",
    accountPreferencesEyebrow: "Einstellungen",
    accountPreferencesSummary: "Sprache, Bibelübersetzung, Erscheinungsbild, Region und Stimme bleiben hier, damit der Begleiter ruhig bleibt.",
    accountContextActive: "Kontext aktiv",
    accountContextPaused: "Kontext pausiert",
    accountArea: "Bereich",
    accountAreas: "Bereiche",
    accountAdded: "hinzugefügt",
    accountManualContextSummary: "Manueller Kontext ist optional und privat. Füge nur hinzu, was Aletheias Beratung prägen soll.",
    accountDailyWisdomEnabled: "Tägliche Weisheit aktiviert",
    accountNotificationsSummaryEnabled: "Aletheia verwendet deine gespeicherte lokale Zeitpräferenz.",
    accountNotificationsSummaryDisabled: "Aktiviere einen ruhigen täglichen Impuls, wenn dieses Gerät bereit ist.",
    accountInstallTitle: "Aletheia zum Startbildschirm hinzufügen",
    accountInstallSummary: "Installationshinweise bleiben kompakt, bis jemand die app-ähnliche Einrichtung braucht.",
    accountInstallEyebrow: "Aletheia installieren",
    accountInviteTitle: "Jemanden privat einladen",
    accountInviteSummary: "Teile nur den Aletheia-Link, niemals standardmäßig private Fragen, Journale oder Beratung.",
    accountInviteEyebrow: "Jemanden einladen",
    accountHistoryConversations: "Gespräche",
    accountHistoryDecisions: "Entscheidungen",
    accountHistoryReflections: "Reflexionen",
    accountHistorySummary: "Der Verlauf bleibt eingeklappt, bis du Gespeichertes ansehen willst.",
    accountStatConversations: "Gespräche",
    accountStatDecisions: "Entscheidungen",
    accountStatJournalEntries: "Journaleinträge",
    accountHistoryEmptyBody: "Starte mit einer ehrlichen Frage oder einer Entscheidung unter Druck. Aletheia hält den Verlauf ruhig und nützlich.",
    accountTrustPostureTitle: "Vertrauens- und Datenschutzhaltung",
    accountTrustPostureSummary: "Grenzen, Schriftquellen, gespeicherte Daten und Freigabehaltung sind verfügbar, ohne die Seite zu überladen.",
    accountBoundariesTitle: "Aletheias Leitplanken",
    accountBoundariesSummary: "Die Sicherheitsgrenzen der App bleiben sichtbar, wenn sie gebraucht werden, ohne ständig im Weg zu sein.",
    accountBoundariesBody: "Diese Grenzen schützen dich vor schädlichen KI-Ratschlägen und halten Aletheia seiner Aufgabe treu.",
    accountFormationPrefix: "Formung",
    accountQuietMilestoneSingular: "ruhiger Meilenstein",
    accountQuietMilestonePlural: "ruhige Meilensteine",
    accountFormationSummary: "Formung ist ein ruhiger Praxisverlauf, keine Punktetafel.",
  },
  yo: {
    nav: { companion: "Ilé", decisions: "Ìpinnu", reflect: "Ìrònú", library: "Ilé ìkàwé", account: "Àkọọlẹ" },
    decideShort: "Pinnu",
    guardrails: "Ààlà",
    guardrailItems: ["Kì í sọ abajade owó di àsọtẹ́lẹ̀.", "Kì í dá ìtọ́kasí Bíbélì sílẹ̀.", "Ó gba níyànjú láti wá ìmọ̀ràn fún ìpinnu ńlá."],
    wisdomMode: "Ipo ọgbọ́n",
    currentLens: "Ìwòye lọwọlọwọ",
    offline: "Ko si nẹ́tíwọ́ọ̀kì",
    languageSelect: "Yí èdè padà",
    bibleSelect: "Yí ìtumọ̀ Bíbélì padà",
    account: "Àkọọlẹ",
    askTitle: "Béèrè lọ́wọ́ Aletheia",
    askIntro: "Bẹrẹ pẹ̀lú ìbéèrè olóòtítọ́ kan. Aletheia máa ràn ọ́ lọ́wọ́ láti dákẹ́ kí o sì mọ̀ ìtọnisọna.",
    yourQuestion: "Ìbéèrè rẹ",
    askButton: "Béèrè",
    startHere: "Bẹrẹ níbí",
    ready: "Ṣetán",
    whatModeFor: "Ohun tí ipo yìí wúlò fún",
    deepChecks: "Àyẹ̀wò jinlẹ̀",
    blindSpots: "Àwọn ibi tí a lè má rí",
    maturitySignals: "Àmì ìdagbasoke",
    modeGuidance: "Ìtọ́nisọ́nà ipo",
    change: "Yí padà",
    showDetails: "Fi àlàyé hàn",
    hideDetails: "Pa àlàyé mọ́",
    modeGuidancePreview: "Jẹ́ kí ojú-ìwòye yìí dojú kọ ohun pàtàkì. Ṣí i síi nígbà tí o bá fẹ́ àyẹ̀wò jinlẹ̀, ibi tí a lè má rí, àti àmì ìdagbasoke.",
    trustLayer: "Ìpele ìgbẹ́kẹ̀lé",
    preferencesTitle: "Èdè àti agbègbè",
    language: "Èdè",
    region: "Agbègbè",
    bible: "Bíbélì",
    voiceControls: "Ìṣàkóso ohùn",
    available: "Wà",
    englishFallback: "Ìpadà sí Gẹ̀ẹ́sì",
    greetingMorning: "Ẹ káàrọ̀",
    greetingAfternoon: "Ẹ káàsán",
    greetingEvening: "Ẹ káalẹ́",
    greetingFallback: "Ẹ ku àbọ̀",
    greetingIntent: "Ẹ jẹ́ ká yan ìgbésẹ̀ ọgbọ́n tó tẹ̀lé lónìí.",
    personalizedPriority: "Ohun pàtàkì fún ọ",
    whatNext: "Kí ni mo yẹ kí n ṣe lẹ́yìn èyí?",
    whatNextBody: "Aletheia ń yan ìgbésẹ̀ ọgbọ́n kan kọ́kọ́. Apoti ìbéèrè àti àwọn ipo ọgbọ́n wà ní isalẹ nígbà tí o bá fẹ́ bẹ̀rẹ̀ ohun tuntun.",
    continueDecision: "Tẹ̀síwájú pẹ̀lú ìpinnu yìí",
    askOneQuestion: "Béèrè ìbéèrè kan",
    askOneQuestionBody: "Bẹrẹ pẹ̀lú ìpinnu tàbí ìrù tí o ń gbé báyìí.",
    askNewQuestion: "Béèrè ìbéèrè tuntun",
    askNewQuestionBody: "Apoti Companion àti àwọn ipo ọgbọ́n wà ní isalẹ.",
    reflectToday: "Ronú lónìí",
    reviewPattern: "Ṣàyẹ̀wò àwòṣe kan",
    enableNotifications: "Tan ìfitónilétí sí",
    enableSync: "Tan ìmúpọ̀ sí",
    notificationPromptBody: "Gba ìrántí ọgbọ́n ojoojúmọ́ kan ní ìdákẹ́jẹ.",
    syncDevicesBody: "Jẹ́ kí àwọn ìpinnu àti ìrònú rẹ wà lórí gbogbo ẹrọ rẹ.",
    startDecision: "Bẹrẹ ìpinnu kan",
    startDecisionBody: "Tọ́pa ìpinnu pàtàkì kan nípasẹ̀ àkókò.",
    tinyPractice: "Ìṣe kékeré",
    todaysCompanion: "Alábàákẹ́gbẹ́ oni",
    todayPrefix: "Lónìí",
    wisdomPrinciple: "Ìlànà ọgbọ́n",
    reflectionQuestion: "Ìbéèrè",
    carryThisToday: "Gbé èyí lọ lónìí",
    carryWithMe: "Gbé e pẹ̀lú mi",
    askAboutThis: "Béèrè nípa èyí",
    saveToRuleOfLife: "Fi sí Ofin ìgbé-ayé",
    carryingToday: "Ohun tí o ń gbé lónìí",
    currentCounsel: "Ìmọ̀ràn lọwọlọwọ",
    modeShapesCounsel: "ń wo ìmọ̀ràn yìí láti",
    trackThisDecision: "Tọ́pa ìpinnu yìí",
    saveAsReflection: "Fi pamọ́ gẹ́gẹ́ bí ìrònú",
    createCounselSummary: "Ṣẹ̀dá àkótán fún olùdámọ̀ràn",
    goDeeper: "Lọ jinlẹ̀ síi",
    waitThreeDays: "Dúró ọjọ́ mẹ́ta",
    shareAnswerPrompt: "Pin Aletheia pẹ̀lú ẹni tí irú ìmọ̀ràn yìí lè ràn lọ́wọ́.",
    sharePrivacyNote: "Èyí máa pin ọna asopọ app nìkan, kì í ṣe ìbéèrè rẹ tàbí ìdáhùn ikọ̀kọ̀.",
    shareAletheia: "Pin Aletheia",
    feedbackQuestion: "Ṣé ìmọ̀ràn yìí wúlò?",
    feedbackHelpful: "Ó wúlò",
    feedbackMildlyHelpful: "Ó wúlò díẹ̀",
    feedbackTooVague: "Ó ṣòro láti lóye",
    feedbackTooPreachy: "Ó dà bí ìwàásù jù",
    feedbackNotRelevant: "Kò bá a mu",
    badgesFormation: "Àwọn àmì ìdagbasoke",
    firstReflectionSaved: "Ìrònú àkọ́kọ́ ti fipamọ́",
    firstDecisionTracked: "Ìpinnu àkọ́kọ́ ti tọ́pa",
    soughtCounsel: "Wá ìmọ̀ràn",
    waitingModeUsed: "Ipo ìdúró ti lo",
    ruleOfLifeCreated: "Ofin ìgbé-ayé ti dá",
    notificationsEnabled: "Ìfitónilétí ti tan",
    sevenDaysPractice: "Ọjọ́ méje ti ìṣe ọgbọ́n",
    formationNote: "Ìwọ̀nyí jẹ́ àmì ìdagbasoke pẹ̀lẹ́, kì í ṣe àmì ìdíje. Ìgbésẹ̀ àkọ́kọ́ sábà máa ń bẹ̀rẹ̀ pẹ̀lú fífi ìrònú kan pamọ́.",
    milestoneShareTitle: "Ṣé o mọ ẹni tí ó ń ṣe ìpinnu pàtàkì?",
    milestoneShareBody: "O lè pè é sí Aletheia láì pin ohunkóhun ikọ̀kọ̀ láti àkọọlẹ rẹ.",
    welcomeCounsel:
      "Mú ìpinnu gidi, ìrù, tàbí ìbéèrè owó wá. Èmi yóò dáhùn láti inú ilé ìkàwé ọgbọ́n tí a ṣètò, pẹ̀lú ìmọ̀lára tó mọ́ àti láì ṣe ìlérí owó.",
    trustScriptureBody:
      "Àwọn ìtọ́kasí Bíbélì wá láti inú ilé ìkàwé ọgbọ́n Aletheia. Bí ẹsẹ kan bá hàn, o lè tẹ̀ ẹ́ láti rí àyíká rẹ àti ìdí tí ó fi ṣe pàtàkì.",
    trustBoundaryBody:
      "Aletheia kì í ṣe ìlérí abajade, kì í sọ ọjà di àsọtẹ́lẹ̀, kì í sọ ìdánilójú Ọlọ́run tí kò sí, kì í sì rọ́pò ìmọ̀ràn amọ̀ja nípa owó, òfin, owó-orí, ìlera, tàbí ìtọ́sọ́nà olùṣọ́.",
    trustMemoryBody:
      "Ìrántí fún ẹni tí ó wọlé ń ran ìpinnu, ìrònú, ìmọ̀ràn, àti òfin ìgbé-ayé lọwọ láti tẹ̀síwájú. Ó yẹ kí ìtọ́sọ́nà jẹ́ ti ara ẹni láì ṣí ìkọ̀kọ̀ sílẹ̀ láìnídí.",
    trustConnectedDataBody:
      "Ìsopọ̀ ọjọ́ iwájú sí ìlera, owó, tàbí ẹrọ gbọdọ̀ jẹ́ pẹ̀lú àṣẹ kọọkan, pa a sílẹ̀ ní ìbẹ̀rẹ̀, kí ó sì lo data gangan tí olumulo yan nìkan.",
    accountNextEyebrow: "Ohun tó tẹ̀lé nínú Àkọọ́lẹ̀",
    accountNextReviewSyncFormation: "Ṣàyẹ̀wò ìmúpọ̀ àti ìdàgbàsókè",
    accountNextSignInPortable: "Wọlé láti mú Aletheia bá ọ lọ",
    accountNextActiveBody: "Àkọọ́lẹ̀ rẹ ti ṣiṣẹ́. Ṣàyẹ̀wò àwọn ìfẹ́ràn, ìtàn àti àwọn àmì ìdàgbàsókè nígbà tí o bá nílò rẹ.",
    accountNextSyncBody: "Ìmúpọ̀ ti ṣiṣẹ́. Tan ìrántí ọgbọ́n ojoojúmọ́ pẹ̀lẹ́ sílẹ̀ bí ẹ̀rọ yìí yẹ kí ó máa gba a.",
    accountNextGuestBody: "Lo Google tàbí ímẹ̀ìlì láti mú àwọn ìpinnu, ìrònú, àwọn ìfẹ́ràn, ìmọ̀ràn àti ìfitónilétí pọ̀ láàárín àwọn ẹ̀rọ.",
    accountManageSummary: "Ṣàkóso ìwọlé, ìmúpọ̀, èdè, ìfitónilétí, ìtàn àti àwọn àmì ìdàgbàsókè láì kó ìdàrúdàpọ̀ bá alábàákẹ́gbẹ́ ọgbọ́n.",
    accountSignedInAs: "Ti wọlé gẹ́gẹ́ bí",
    accountSignInOrGuest: "Wọlé tàbí tẹ̀síwájú gẹ́gẹ́ bí àlejò",
    accountSyncActive: "Ìmúpọ̀ ti ṣiṣẹ́.",
    accountNotificationsNotEnabled: "Ìfitónilétí kò tíì ṣiṣẹ́.",
    accountGuestSummary: "Ìwọlé Google àti ímẹ̀ìlì ń jẹ́ kí ìtàn, àwọn ìfẹ́ràn, àwọn ìpinnu àti ìfitónilétí rẹ rọrùn láti mú lọ sí ibòmíì.",
    accountPreferencesEyebrow: "Àwọn ìfẹ́ràn",
    accountPreferencesSummary: "Èdè, ìtumọ̀ Bíbélì, ìrísí, agbègbè àti ohùn wà níbí kí Alábàákẹ́gbẹ́ lè dúró ní ìdákẹ́jẹ.",
    accountContextActive: "Àyíká ti ṣiṣẹ́",
    accountContextPaused: "Àyíká ti dúró",
    accountArea: "àgbègbè",
    accountAreas: "àwọn àgbègbè",
    accountAdded: "tí a fikún",
    accountManualContextSummary: "Àyíká ọwọ́ jẹ́ àṣàyàn àti ìkọ̀kọ̀. Ṣàfikún ohun tí ó yẹ kó ṣàkóso ìmọ̀ràn Aletheia nìkan.",
    accountDailyWisdomEnabled: "Ọgbọ́n ojoojúmọ́ ti ṣiṣẹ́",
    accountNotificationsSummaryEnabled: "Aletheia yóò lo àṣàyàn àkókò ìbílẹ̀ tí o ti fipamọ́.",
    accountNotificationsSummaryDisabled: "Tan ìrántí ojoojúmọ́ pẹ̀lẹ́ sílẹ̀ nígbà tí ẹ̀rọ yìí bá ti ṣetán.",
    accountInstallTitle: "Ṣàfikún Aletheia sí ojú ìbẹ̀rẹ̀ rẹ",
    accountInstallSummary: "Àwọn ìtọ́nisọ́nà fifi sori ẹrọ wà ní ìdákẹ́jẹ títí ẹnikan fi nílò ìrírí bí app.",
    accountInstallEyebrow: "Fi Aletheia sori ẹrọ",
    accountInviteTitle: "Pe ẹnikan ní ìkọ̀kọ̀",
    accountInviteSummary: "Pin ọna asopọ Aletheia nìkan, kì í ṣe àwọn ìbéèrè ìkọ̀kọ̀, ìwé ìrònú tàbí ìmọ̀ràn ní àìtẹ̀sí.",
    accountInviteEyebrow: "Pe ẹnikan",
    accountHistoryConversations: "àwọn ìjíròrò",
    accountHistoryDecisions: "àwọn ìpinnu",
    accountHistoryReflections: "àwọn ìrònú",
    accountHistorySummary: "Ìtàn máa ń dúró ní fífi pa mọ́ títí o fi fẹ́ wo ohun tí a ti fipamọ́.",
    accountStatConversations: "Àwọn ìjíròrò",
    accountStatDecisions: "Àwọn ìpinnu",
    accountStatJournalEntries: "Àwọn ìforúkọsílẹ̀ ìwé ìrònú",
    accountHistoryEmptyBody: "Bẹ̀rẹ̀ pẹ̀lú ìbéèrè olóòtítọ́ kan tàbí ìpinnu kan lábẹ́ títẹ. Aletheia yóò jẹ́ kí àkọọ́lẹ̀ náà dájú, ṣinṣin, kí ó sì wúlò.",
    accountTrustPostureTitle: "Ìpo ìgbẹ́kẹ̀lé àti ìkọ̀kọ̀",
    accountTrustPostureSummary: "Àwọn ààlà, ibi tí ìtọọ́kasí mímọ́ ti wá, data tí a fipamọ́ àti ìlànà pínpín wà ní mímọ̀ láì kó àkúnya bá ojú-ìwé.",
    accountBoundariesTitle: "Àwọn ààlà Aletheia",
    accountBoundariesSummary: "Àwọn ààlà ààbò app náà wà ní mímọ̀ nígbà tí a bá nílò wọn, kì í sì í di ọ lójú ní gbogbo ìgbà.",
    accountBoundariesBody: "Àwọn ìdènà wọ̀nyí ń dáàbò bo ọ kúrò nínú ìmọ̀ràn AI tó lè ṣàkóbá, wọ́n sì ń jẹ́ kí Aletheia dúró ṣinṣin sí ìdí rẹ.",
    accountFormationPrefix: "Ìdàgbàsókè",
    accountQuietMilestoneSingular: "àmì ìdàgbàsókè pẹ̀lẹ́ kan",
    accountQuietMilestonePlural: "àwọn àmì ìdàgbàsókè pẹ̀lẹ́",
    accountFormationSummary: "Ìdàgbàsókè jẹ́ àkọọ́lẹ̀ ìdákẹ́jẹ ti ìṣe, kì í ṣe pátákó amì-ẹ̀yẹ.",
  },
  ig: {
    nav: { companion: "Ụlọ", decisions: "Mkpebi", reflect: "Tụgharịa uche", library: "Ọba akwụkwọ", account: "Akaụntụ" },
    decideShort: "Kpebie",
    guardrails: "Oke nche",
    guardrailItems: ["Anaghị ebu amụma nsonaazụ ego.", "Anaghị emepụta ntụaka Baịbụl.", "Na-agba ume ịchọ ndụmọdụ maka mkpebi dị mkpa."],
    wisdomMode: "Ụdị amamihe",
    currentLens: "Anya ugbu a",
    offline: "Enweghị njikọ",
    languageSelect: "Gbanwee asụsụ",
    bibleSelect: "Gbanwee ntụgharị Baịbụl",
    account: "Akaụntụ",
    askTitle: "Jụọ Aletheia",
    askIntro: "Malite na otu ajụjụ eziokwu. Aletheia na-enyere gị belata ngwa ngwa ma ghọta nke ọma.",
    yourQuestion: "Ajụjụ gị",
    askButton: "Jụọ",
    startHere: "Bido ebe a",
    ready: "Njikere",
    whatModeFor: "Ihe ụdị a bara uru",
    deepChecks: "Nlele miri emi",
    blindSpots: "Ihe nwere ike ifu anya",
    maturitySignals: "Ihe ngosi ntozu",
    modeGuidance: "Nduzi ụdị",
    change: "Gbanwee",
    showDetails: "Gosi nkọwa",
    hideDetails: "Zoo nkọwa",
    modeGuidancePreview: "Debe echiche a ka ọ dị mfe. Mepee ya mgbe ịchọrọ nlele miri emi, ihe nwere ike ifu anya, na ihe ngosi ntozu.",
    trustLayer: "Ogo ntụkwasị obi",
    preferencesTitle: "Asụsụ na mpaghara",
    language: "Asụsụ",
    region: "Mpaghara",
    bible: "Baịbụl",
    voiceControls: "Njikwa olu",
    available: "Dị",
    englishFallback: "Laghachi n'Bekee",
    greetingMorning: "Ụtụtụ ọma",
    greetingAfternoon: "Ehihie ọma",
    greetingEvening: "Mgbede ọma",
    greetingFallback: "Nnọọ ọzọ",
    greetingIntent: "Ka anyị họrọ otu nzọụkwụ amamihe ọzọ taa.",
    personalizedPriority: "Ihe kacha mkpa nye gị",
    whatNext: "Gịnị ka m kwesịrị ime ugbu a?",
    whatNextBody: "Aletheia na-ahọrọ ihe amamihe ka ọ bụrụ nke mbụ. Ebe ajụjụ na njikwa ụdị dị n'okpuru mgbe ịchọrọ ịmalite ihe ọhụrụ.",
    continueDecision: "Gaa n'ihu na mkpebi a",
    askOneQuestion: "Jụọ otu ajụjụ",
    askOneQuestionBody: "Malite site n'ọnọdụ nsogbu ma ọ bụ mkpebi ị na-ebu ugbu a.",
    askNewQuestion: "Jụọ ajụjụ ọhụrụ",
    askNewQuestionBody: "Ebe ntinye ajụjụ na ụdị amamihe dị n'okpuru.",
    reflectToday: "Tụgharịa uche na taa",
    reviewPattern: "Lelee usoro",
    enableNotifications: "Gbanye ọkwa ozi",
    enableSync: "Gbanye mmekọrịta",
    notificationPromptBody: "Nata otu ụbọchị niile mgbasa ozi amamihe dị jụụ.",
    syncDevicesBody: "Jide mkpebi na ntụgharị uche gị n'ụdị ngwaọrụ niile.",
    startDecision: "Malite mkpebi",
    startDecisionBody: "Soro nhọrọ dị mkpa n'oge.",
    todaysCompanion: "Enyi nke taa",
    todayPrefix: "Taa",
    wisdomPrinciple: "Ụkpụrụ amamihe",
    tinyPractice: "Omume nta",
    reflectionQuestion: "Ajụjụ",
    carryThisToday: "Buru nke a taa",
    carryWithMe: "Buru ya na m",
    askAboutThis: "Jụọ maka nke a",
    saveToRuleOfLife: "Chekwaa dị ka iwu ndụ",
    carryingToday: "Ihe ị na-ebu taa",
    currentCounsel: "Ndụmọdụ ugbu a",
    modeShapesCounsel: "na-akpụ ndụmọdụ a gburugburu",
    trackThisDecision: "Soro mkpebi a",
    saveAsReflection: "Chekwaa dịka ntụgharị uche",
    createCounselSummary: "Mepụta nchịkọta ndụmọdụ",
    goDeeper: "Gaa n'ime",
    waitThreeDays: "Chere ụbọchị 3",
    shareAnswerPrompt: "Kekọrịta Aletheia na onye nwere ike irite uru site n'ụdị ndụmọdụ a.",
    sharePrivacyNote: "Nke a na-ekekọrịta naanị njikọ ngwa ahụ, ọ bụghị ajụjụ gị ma ọ bụ azịza nzuzo Aletheia.",
    shareAletheia: "Kekọrịta Aletheia",
    feedbackQuestion: "Ndụmọdụ a ọ bara uru?",
    feedbackHelpful: "Bara uru",
    feedbackMildlyHelpful: "Bara uru ntakịrị",
    feedbackTooVague: "Adịghị doro anya",
    feedbackTooPreachy: "Na-akụzi nke ukwuu",
    feedbackNotRelevant: "Adịghị mkpa",
    badgesFormation: "Akara / Nhazi",
    firstReflectionSaved: "Ntụgharị uche mbụ echekwara",
    firstDecisionTracked: "Mkpebi mbụ esochiri",
    soughtCounsel: "Chọrọ ndụmọdụ",
    waitingModeUsed: "Jiri ụdị ichere",
    ruleOfLifeCreated: "Iwu ndụ emepụtara",
    notificationsEnabled: "Gbanyere ọkwa ozi",
    sevenDaysPractice: "Ụbọchị 7 nke omume amamihe",
    formationNote: "Ndị a bụ akara nhazi dị jụụ, ọ bụghị isi ihe ị ga-achụ. Nkume njedebe mbụ na-amalitekarị site na ịchekwa otu ntụgharị uche.",
    milestoneShareTitle: "Ị maara onye na-eme mkpebi dị mkpa?",
    milestoneShareBody: "Ị nwere ike ịkpọ ha ka ha bịa Aletheia n'ekekọtaghị ihe ọ bụla nzuzo site na akaụntụ gị.",
    welcomeCounsel:
      "Weta mkpebi n'ezie, nrụgide ma ọ bụ ajụjụ ego. Aga m aza site n'ọba akwụkwọ amamihe ahaziri ahazi, na-enwe nkọwa mmetụta uche ma ọ bụghị nkwa ego.",
    trustScriptureBody:
      "Nrụtụ aka Akwụkwọ Nsọ sitere n'ọba akwụkwọ amamihe ahaziri ahazi Aletheia. Ọ bụrụ na amaokwu apụta, ị nwere ike ịmetụ ya aka ka ị hụ ọnọdụ yana ihe kpatara o ji dị mkpa.",
    trustBoundaryBody:
      "Aletheia agaghị ekwe nkwa nsonaazụ, amachaghị ahịa, kwupụta ijide n'aka Chineke, ma ọ bụ dochie ndụmọdụ ọkachamara ego, iwu, ụtụ isi, ahụike ma ọ bụ ndị ụkọchukwu.",
    trustMemoryBody:
      "Ebe nchekwa ejikọtara na-enyere aka na nkwụsi ike n'etiti mkpebi, ntụgharị uche, ndụmọdụ na iwu ndụ. O kwesịrị ime ka ntụzịaka bụrụ nke onwe karịa n'ekpugheghị nkọwa nzuzo n'efu.",
    trustConnectedDataBody:
      "Njikọta ahụike, ego ma ọ bụ ngwaọrụ n'ọdịnihu kwesịrị ịbụ ikike site na ikike, gbanyụọ na ndabere ma bụrụ naanị data ọ bụla onye ọrụ ahọrọ ịjikọ.",
    accountNextEyebrow: "Ihe na-esote n'Akaụntụ",
    accountNextReviewSyncFormation: "Lelee mmekọrịta na nhazi",
    accountNextSignInPortable: "Banye ka Aletheia nwee ike iso gị gafee ngwaọrụ",
    accountNextActiveBody: "Akaụntụ gị na-arụ ọrụ. Lelee mmasị, akụkọ na nkume nhazi mgbe ịchọrọ ya.",
    accountNextSyncBody: "Mmekọrịta na-arụ ọrụ. Gbanwuo otu mkpali amamihe dị jụụ kwa ụbọchị ma ọ bụrụ na ngwaọrụ a kwesịrị ịnata ya.",
    accountNextGuestBody: "Jiri Google ma ọ bụ email mekọrịta mkpebi, ntụgharị uche, mmasị, ndụmọdụ na ọkwa ozi n'ofe ngwaọrụ.",
    accountManageSummary: "Jikwaa nbanye, mmekọrịta, asụsụ, ọkwa ozi, akụkọ na nkume nhazi na-enweghị imeju Onye Amamihe.",
    accountSignedInAs: "Ị banyere dị ka",
    accountSignInOrGuest: "Banye ma ọ bụ gaa n'ihu dịka ọbịa",
    accountSyncActive: "Mmekọrịta na-arụ ọrụ.",
    accountNotificationsNotEnabled: "Ọkwa ozi agbanyebeghị.",
    accountGuestSummary: "Nbanye Google na email na-eme ka akụkọ, mmasị, mkpebi na ọkwa ozi bụrụ ihe a na-eburu n'ebe ọ bụla.",
    accountPreferencesEyebrow: "Mmasị",
    accountPreferencesSummary: "Asụsụ, ntụgharị Baịbụl, ọdịdị, mpaghara na olu nọ ebe a ka Enyi wee dị jụụ.",
    accountContextActive: "Ọnọdụ na-arụ ọrụ",
    accountContextPaused: "Ọnọdụ kwụsịrị nwa oge",
    accountArea: "mpaghara",
    accountAreas: "mpaghara",
    accountAdded: "agbakwunyere",
    accountManualContextSummary: "Ọnọdụ aka bụ nhọrọ ma bụrụ nke nzuzo. Tinye naanị ihe kwesịrị ịkpụzi ndụmọdụ Aletheia.",
    accountDailyWisdomEnabled: "Amamihe kwa ụbọchị agbanyere",
    accountNotificationsSummaryEnabled: "Aletheia ga-eji mmasị oge obodo ị chekwara.",
    accountNotificationsSummaryDisabled: "Gbanwuo otu mkpali dị jụụ kwa ụbọchị mgbe ngwaọrụ a dị njikere.",
    accountInstallTitle: "Tinye Aletheia na ihuenyo ụlọ gị",
    accountInstallSummary: "Ntuziaka itinye na-anọ nwayọọ ruo mgbe mmadụ chọrọ ahụmịhe dịka app.",
    accountInstallEyebrow: "Tinye Aletheia",
    accountInviteTitle: "Kpọọ mmadụ na nzuzo",
    accountInviteSummary: "Kekọrịta naanị njikọ Aletheia, ọ bụghị ajụjụ nzuzo, akwụkwọ ncheta ma ọ bụ ndụmọdụ n'usoro ndabara.",
    accountInviteEyebrow: "Kpọọ mmadụ",
    accountHistoryConversations: "mkparịta ụka",
    accountHistoryDecisions: "mkpebi",
    accountHistoryReflections: "ntụgharị uche",
    accountHistorySummary: "Akụkọ ihe mere eme na-anọ mechiri emechi ruo mgbe ịchọrọ ilegharị ihe echekwara anya.",
    accountStatConversations: "Mkparịta ụka",
    accountStatDecisions: "Mkpebi",
    accountStatJournalEntries: "Ndenye akwụkwọ ncheta",
    accountHistoryEmptyBody: "Malite na otu ajụjụ eziokwu ma ọ bụ otu mkpebi dị n'okpuru nrụgide. Aletheia ga-eme ka ndekọ ahụ dị jụụ ma baa uru.",
    accountTrustPostureTitle: "Ọnọdụ ntụkwasị obi na nzuzo",
    accountTrustPostureSummary: "Ókè, ebe Akwụkwọ Nsọ si bịa, data echekwara na ụzọ e si ekekọrịta dị ebe a n'enweghị ibu arọ n'ahụ ibe ahụ.",
    accountBoundariesTitle: "Ókè nche Aletheia",
    accountBoundariesSummary: "Ókè nche nchekwa app ahụ na-anọ na anya mgbe achọrọ ha, ọ bụghị igbochi mgbe niile.",
    accountBoundariesBody: "Mgbochi ndị a na-echebe gị pụọ na ndụmọdụ AI nwere ike imerụ ahụ ma na-edobe Aletheia n'ikwesị ntụkwasị obi nye ebumnuche ya.",
    accountFormationPrefix: "Nhazi",
    accountQuietMilestoneSingular: "nkume nhazi dị jụụ",
    accountQuietMilestonePlural: "nkume nhazi dị jụụ",
    accountFormationSummary: "Nhazi bụ ndekọ dị jụụ nke omume, ọ bụghị tebụl akara.",
  },
  ha: {
    nav: { companion: "Gida", decisions: "Shawara", reflect: "Tunani", library: "Laburare", account: "Asusu" },
    decideShort: "Yanke",
    guardrails: "Iyakoki",
    guardrailItems: ["Ba ya hango sakamakon kudi.", "Ba ya kirkirar nassoshin Littafi Mai Tsarki.", "Yana karfafa neman shawara a manyan zabi."],
    wisdomMode: "Yanayin hikima",
    currentLens: "Duban yanzu",
    offline: "Babu intanet",
    languageSelect: "Canza harshe",
    bibleSelect: "Canza fassarar Littafi",
    account: "Asusu",
    askTitle: "Tambayi Aletheia",
    askIntro: "Fara da tambaya ta gaskiya. Aletheia za ta rage gaggawa ta taimaka maka fahimta.",
    yourQuestion: "Tambayarka",
    askButton: "Tambaya",
    startHere: "Fara a nan",
    ready: "Shirye",
    whatModeFor: "Amfanin wannan yanayi",
    deepChecks: "Bincike mai zurfi",
    blindSpots: "Abubuwan da ka iya boye",
    maturitySignals: "Alamun balaga",
    modeGuidance: "Jagorar yanayi",
    change: "Canza",
    showDetails: "Nuna bayani",
    hideDetails: "Boyar da bayani",
    modeGuidancePreview: "Ka wannan kallo ya kasance mai sauki. Bude shi idan kana son bincike mai zurfi, abubuwan da ka iya boye, da alamun balaga.",
    trustLayer: "Matakin amincewa",
    preferencesTitle: "Harshe da yanki",
    language: "Harshe",
    region: "Yanki",
    bible: "Littafi",
    voiceControls: "Sarrafa murya",
    available: "Akwai",
    englishFallback: "Komawa Turanci",
    greetingMorning: "Ina kwana",
    greetingAfternoon: "Ina wuni",
    greetingEvening: "Barka da yamma",
    greetingFallback: "Barka da dawowa",
    greetingIntent: "Mu zabi mataki na hikima na gaba yau.",
    personalizedPriority: "Fifikon ku",
    whatNext: "Me zan yi a yanzu?",
    whatNextBody: "Aletheia tana zaɓar aiki na hikima da farko. Filin tambaya da sarrafa yanayi suna a ƙasa lokacin da kuke son fara sabon abu.",
    continueDecision: "Ci gaba da wannan shawarar",
    askOneQuestion: "Yi tambaya ɗaya",
    askOneQuestionBody: "Fara da matsin lamba ko shawarar da kuke ɗauka a yanzu.",
    askNewQuestion: "Yi sabuwar tambaya",
    askNewQuestionBody: "Filin Companion da salon hikima suna a ƙasa.",
    reflectToday: "Yi tunani a yau",
    reviewPattern: "Bincika tsari",
    enableNotifications: "Kunna sanarwa",
    enableSync: "Kunna haɗin kai",
    notificationPromptBody: "Karɓi ƙarfafawa na hikima na yau da kullun a hankali.",
    syncDevicesBody: "Ajiye shawara da tunani a dukkan na'urori.",
    startDecision: "Fara shawara",
    startDecisionBody: "Bi zaɓi mai mahimmanci a lokaci.",
    todaysCompanion: "Abokin yau",
    todayPrefix: "Yau",
    wisdomPrinciple: "Ka'idar hikima",
    tinyPractice: "Karamin aiki",
    reflectionQuestion: "Tambaya",
    carryThisToday: "Rike wannan yau",
    carryWithMe: "Rike tare da ni",
    askAboutThis: "Tambaya game da wannan",
    saveToRuleOfLife: "Ajiye a matsayin ka'idar rayuwa",
    carryingToday: "Abin da kake rike da shi yau",
    currentCounsel: "Shawarar yanzu",
    modeShapesCounsel: "yana tsara wannan shawarar dangane da",
    trackThisDecision: "Bi wannan shawarar",
    saveAsReflection: "Adana azaman tunani",
    createCounselSummary: "Ƙirƙiri taƙaitaccen shawara",
    goDeeper: "Je mai zurfi",
    waitThreeDays: "Jira kwanaki 3",
    shareAnswerPrompt: "Raba Aletheia da wanda zai iya amfana da irin wannan shawarar.",
    sharePrivacyNote: "Wannan yana raba mahaɗin app kawai, ba tambayar ku ko amsar sirri ta Aletheia ba.",
    shareAletheia: "Raba Aletheia",
    feedbackQuestion: "Wannan shawarar ta taimaka?",
    feedbackHelpful: "Mai taimako",
    feedbackMildlyHelpful: "Yana taimakawa kaɗan",
    feedbackTooVague: "Ba a fayyace ba",
    feedbackTooPreachy: "Wa'azi da yawa",
    feedbackNotRelevant: "Ba ya dacewa",
    badgesFormation: "Tambari / Tsarawa",
    firstReflectionSaved: "Tunani na farko an adana",
    firstDecisionTracked: "Shawara ta farko an bi",
    soughtCounsel: "Neman shawara",
    waitingModeUsed: "An yi amfani da yanayin jira",
    ruleOfLifeCreated: "An ƙirƙiri ƙa'idar rayuwa",
    notificationsEnabled: "An kunna sanarwa",
    sevenDaysPractice: "Kwanaki 7 na aikin hikima",
    formationNote: "Waɗannan alamomi ne na hankali na tsarawa, ba maki da za a bi ba. Alamar farko yawanci tana farawa da adana tunani ɗaya.",
    milestoneShareTitle: "Kun san wanda ke yin muhimmiyar shawara?",
    milestoneShareBody: "Kuna iya gayyatonsu zuwa Aletheia ba tare da raba wani abu mai sirri daga asusunku ba.",
    welcomeCounsel:
      "Kawo shawara ta gaske, matsin lamba ko tambayar kuɗi. Zan amsa daga ɗakin karatu na hikima da aka tsara, tare da fayyace motsin rai kuma ba tare da alkawuran kuɗi ba.",
    trustScriptureBody:
      "Nassoshi na Littafi Mai Tsarki sun fito ne daga ɗakin karatu na hikima na Aletheia. Idan aya ta bayyana, zaku iya danna ta don ganin mahallin da dalilin da ya sa yake da muhimmanci.",
    trustBoundaryBody:
      "Aletheia ba zai yi alkawarin sakamako ba, ba zai yi hasashen kasuwanni ba, ba zai yi iƙirarin tabbacin Allah ba, ko kuma ya maye gurbin shawara ta ƙwararru na kuɗi, doka, haraji, likita ko na limamin coci.",
    trustMemoryBody:
      "Ƙwaƙwalwar ajiya da aka haɗa tana taimakawa daidaituwa tsakanin shawara, tunani, shawara da ƙa'idodin rayuwa. Ya kamata ya sanya jagora ta zama ta sirri fiye ba tare da fallasa cikakkun bayanai na sirri ba tare da buƙata ba.",
    trustConnectedDataBody:
      "Haɗin lafiya, kuɗi ko na'ura na gaba yakamata su kasance izini-zuwa-izini, kashe a tsohuwa kuma iyakance ga ainihin bayanan da mai amfani ya zaɓa don haɗawa.",
    accountNextEyebrow: "Na gaba a Asusu",
    accountNextReviewSyncFormation: "Duba daidaitawa da tsarawa",
    accountNextSignInPortable: "Shiga domin ka rika daukar Aletheia tare da kai",
    accountNextActiveBody: "Asusunka yana aiki. Duba abubuwan da ka fi so, tarihi da matakan tsarawa idan kana bukata.",
    accountNextSyncBody: "Daidaitawa tana aiki. Kunna dan karamin tunasarwar hikima ta yau idan wannan na'ura ya kamata ta karbe ta.",
    accountNextGuestBody: "Yi amfani da Google ko imel don daidaita shawarwari, tunani, abubuwan da ka fi so, nasiha da sanarwa a tsakanin na'urori.",
    accountManageSummary: "Sarrafa shiga, daidaitawa, harshe, sanarwa, tarihi da matakan tsarawa ba tare da cunkushe abokin hikima ba.",
    accountSignedInAs: "An shiga a matsayin",
    accountSignInOrGuest: "Shiga ko ci gaba a matsayin bako",
    accountSyncActive: "Daidaitawa tana aiki.",
    accountNotificationsNotEnabled: "Ba a kunna sanarwa ba tukuna.",
    accountGuestSummary: "Shiga da Google da imel yana sa tarihinka, abubuwan da ka fi so, shawarwari da sanarwa su kasance masu saukin dauka a ko'ina.",
    accountPreferencesEyebrow: "Abubuwan da aka fi so",
    accountPreferencesSummary: "Harshe, fassarar Littafi, bayyanar fuska, yanki da murya suna nan domin Aboki ya zauna cikin natsuwa.",
    accountContextActive: "Mahalli yana aiki",
    accountContextPaused: "An dakatar da mahalli",
    accountArea: "fanni",
    accountAreas: "fannoni",
    accountAdded: "an kara",
    accountManualContextSummary: "Mahallin hannu na zabi ne kuma na sirri ne. Kara kawai abin da ya kamata ya tsara nasihohin Aletheia.",
    accountDailyWisdomEnabled: "An kunna hikimar yau da kullum",
    accountNotificationsSummaryEnabled: "Aletheia za ta yi amfani da zabin lokacinka na gida da aka riga aka ajiye.",
    accountNotificationsSummaryDisabled: "Kunna dan karamin tunasarwar yau da kullum idan wannan na'ura ta shirya.",
    accountInstallTitle: "Saka Aletheia a allon gida",
    accountInstallSummary: "Umarnin shigarwa suna zaune a hankali har sai wani ya bukaci tsarin kama da app.",
    accountInstallEyebrow: "Saka Aletheia",
    accountInviteTitle: "Gayyaci wani a boye",
    accountInviteSummary: "Raba hanyar Aletheia kadai, ba tambayoyin sirri ba, ba rubutun tunani ba, ba kuma nasiha ta tsohuwa ba.",
    accountInviteEyebrow: "Gayyaci wani",
    accountHistoryConversations: "tattaunawa",
    accountHistoryDecisions: "shawarwari",
    accountHistoryReflections: "tunani",
    accountHistorySummary: "Tarihi yana nan a dunkule har sai kana son duba abin da aka ajiye.",
    accountStatConversations: "Tattaunawa",
    accountStatDecisions: "Shawarwari",
    accountStatJournalEntries: "Rubuce-rubucen tunani",
    accountHistoryEmptyBody: "Fara da tambaya ta gaskiya daya ko shawara daya a karkashin matsin lamba. Aletheia za ta sa bayanin ya kasance cikin natsuwa kuma mai amfani.",
    accountTrustPostureTitle: "Matsayin amincewa da sirri",
    accountTrustPostureSummary: "Iyakoki, tushen nassosi, bayanan da aka ajiye da yadda ake rabawa suna samuwa ba tare da cika shafin da yawa ba.",
    accountBoundariesTitle: "Iyakokin kariyar Aletheia",
    accountBoundariesSummary: "Iyakokin tsaron app suna nan a bayyane idan an bukace su, ba tare da zama cikas kullum ba.",
    accountBoundariesBody: "Wadannan takurawa suna kare ka daga nasihohin AI masu cutarwa kuma suna sa Aletheia ta kasance mai aminci ga manufarta.",
    accountFormationPrefix: "Tsarawa",
    accountQuietMilestoneSingular: "matakin tsarawa mai nutsuwa",
    accountQuietMilestonePlural: "matakan tsarawa masu nutsuwa",
    accountFormationSummary: "Tsarawa rikodi ne mai natsuwa na aiki, ba allon maki ba.",
  },
};

function preferencePatchForLanguage(language: LanguageCode): Partial<UserPreferences> {
  return {
    language,
    bibleTranslation: defaultBibleTranslationForLanguage(language),
  };
}

type User = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  loginCount?: number;
  lastSeenAt?: string | null;
  createdAt?: string;
};

function AvatarCircle({
  avatarUrl,
  seed,
  label,
  size,
  className,
}: {
  avatarUrl?: string | null;
  seed: string;
  label: string;
  size: number;
  className?: string;
}) {
  const fallback = defaultAvatarDataUrl(seed, label);
  const src = normalizeAvatarUrl(avatarUrl ?? "") ?? fallback;

  return (
    <div
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${className ?? ""}`.trim()}
      style={{ width: size, height: size, minWidth: size, minHeight: size, borderRadius: "9999px" }}
    >
      <Image
        src={src}
        alt={label}
        fill
        sizes={`${size}px`}
        className="h-full w-full object-cover"
        unoptimized
        onError={(event) => {
          const currentTarget = event.currentTarget;
          if (currentTarget.src !== fallback) {
            currentTarget.src = fallback;
          }
        }}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

function languageFromBrowserLocale(locale: string | undefined): LanguageCode | null {
  const primary = locale?.trim().toLowerCase().split(/[-_]/)[0];
  return primary && primary in languages ? primary as LanguageCode : null;
}

function deviceDefaultPreferences(): UserPreferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  const language = [
    ...(Array.isArray(window.navigator.languages) ? window.navigator.languages : []),
    window.navigator.language,
  ]
    .map(languageFromBrowserLocale)
    .find((value): value is LanguageCode => Boolean(value));

  return language ? normalizePreferences(preferencePatchForLanguage(language)) : defaultPreferences;
}

function storedPreferences() {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  try {
    const saved = window.localStorage.getItem("aletheia_preferences");
    return saved ? normalizePreferences(JSON.parse(saved) as Partial<UserPreferences>) : deviceDefaultPreferences();
  } catch {
    return deviceDefaultPreferences();
  }
}

function storedManualContext() {
  if (typeof window === "undefined") {
    return defaultManualContext;
  }

  try {
    const saved = window.localStorage.getItem(MANUAL_CONTEXT_STORAGE_KEY);
    return saved ? normalizeManualContext(JSON.parse(saved) as Partial<ManualContextProfile>) : defaultManualContext;
  } catch {
    return defaultManualContext;
  }
}

function storedThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === "classic" || value === "dark" || value === "black" || value === "warm" || value === "ocean" || value === "forest" || value === "sunset" || value === "system") {
      return value;
    }
  } catch {
    // Fall through to system.
  }
  return "system";
}

function storedVoicePreference() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(VOICE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storedGratitudeEntries(): GratitudeEntry[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const saved = window.localStorage.getItem(GRATITUDE_LENS_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((entry): entry is GratitudeEntry =>
        Boolean(
          entry &&
            typeof entry.id === "string" &&
            typeof entry.imageDataUrl === "string" &&
            typeof entry.note === "string" &&
            typeof entry.createdAt === "string"
        )
      )
      .map((entry) => ({
        ...entry,
        place: typeof entry.place === "string" ? entry.place : "",
        formation: normalizeGratitudeFormation(entry.formation),
        visual: normalizeGratitudeVisual(entry.visual),
        postcardCreatedAt: typeof entry.postcardCreatedAt === "string" ? entry.postcardCreatedAt : undefined,
        reflectedAt: typeof entry.reflectedAt === "string" ? entry.reflectedAt : undefined,
      }))
      .slice(0, MAX_GRATITUDE_ENTRIES);
  } catch {
    return [];
  }
}

function persistGratitudeEntries(entries: GratitudeEntry[]) {
  window.localStorage.setItem(GRATITUDE_LENS_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_GRATITUDE_ENTRIES)));
}

function gratitudeContextSummary(entries: GratitudeEntry[]): GratitudeContextSummary | null {
  const recentEntries = entries
    .slice(0, MAX_GRATITUDE_ENTRIES)
    .filter((entry) => entry.note.trim() || entry.place.trim() || entry.formation);
  if (!recentEntries.length) {
    return null;
  }

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentCount = recentEntries.filter((entry) => {
    const createdAt = Date.parse(entry.createdAt);
    return Number.isFinite(createdAt) && createdAt >= thirtyDaysAgo;
  }).length;
  const formationThemes = Array.from(
    new Set(recentEntries.map((entry) => GRATITUDE_FORMATION_LABELS[normalizeGratitudeFormation(entry.formation)]))
  ).slice(0, 4);
  const latest = recentEntries[0];

  return {
    totalEntries: entries.length,
    recentEntries: recentCount,
    formationThemes,
    latestNote: latest.note.trim().slice(0, 180) || undefined,
    latestPlace: latest.place.trim().slice(0, 80) || undefined,
    latestCreatedAt: latest.createdAt,
  };
}

function imageFileToLocalDataUrl(file: File, maxDimension = 1400, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Selected file is not an image."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement("img");
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Could not prepare the image."));
          return;
        }
        context.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Could not read the selected image."));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function drawWrappedCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (context.measureText(nextLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) {
        break;
      }
    } else {
      line = nextLine;
    }
  }
  if (line && lines.length < maxLines) {
    lines.push(line);
  }
  lines.slice(0, maxLines).forEach((lineText, index) => {
    const suffix = index === maxLines - 1 && words.join(" ").length > lines.join(" ").length ? "..." : "";
    context.fillText(`${lineText}${suffix}`, x, y + index * lineHeight);
  });
  return y + lines.length * lineHeight;
}

function drawGratitudeStickerChips(context: CanvasRenderingContext2D, visual: GratitudeVisualSettings) {
  const items = [...visual.stickers.map((sticker) => GRATITUDE_STICKER_MARK[sticker]), visual.emoji].filter(Boolean).slice(0, 5);
  if (!items.length) {
    return;
  }
  context.save();
  context.font = "700 28px system-ui, sans-serif";
  let x = 80;
  const y = 902;
  for (const item of items) {
    const isWord = item.length > 2;
    const width = Math.min(240, Math.max(isWord ? 154 : 76, context.measureText(item).width + 46));
    if (x + width > 1120) {
      break;
    }
    context.shadowColor = "rgba(0, 0, 0, 0.28)";
    context.shadowBlur = 18;
    context.shadowOffsetY = 8;
    context.fillStyle = "rgba(13, 23, 20, 0.64)";
    context.strokeStyle = "rgba(248, 245, 232, 0.32)";
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(x, y, width, 60, 22);
    context.fill();
    context.stroke();
    context.shadowColor = "rgba(0, 0, 0, 0)";
    context.fillStyle = "#f8f5e8";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(item, x + width / 2, y + 32);
    x += width + 16;
  }
  context.restore();
}

function createGratitudePostcardBlob(entry: GratitudeEntry, theme: ThemeColors, label: string, inviteText: string, locale: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("Could not prepare postcard."));
      return;
    }
    const img = document.createElement("img");
    img.onload = () => {
      const render = (logo?: HTMLImageElement) => {
      const visual = normalizeGratitudeVisual(entry.visual);
      context.fillStyle = theme.bgMain;
      context.fillRect(0, 0, canvas.width, canvas.height);
      const imageHeight = 1000;
      const scale = Math.max(canvas.width / img.naturalWidth, imageHeight / img.naturalHeight);
      const drawWidth = img.naturalWidth * scale;
      const drawHeight = img.naturalHeight * scale;
      context.save();
      context.filter = GRATITUDE_FILTER_STYLE[visual.filter];
      context.drawImage(img, (canvas.width - drawWidth) / 2, (imageHeight - drawHeight) / 2, drawWidth, drawHeight);
      context.restore();
      if (visual.filter !== "none") {
        context.fillStyle = GRATITUDE_FILTER_OVERLAY[visual.filter];
        context.fillRect(0, 0, canvas.width, imageHeight);
      }
      const gradient = context.createLinearGradient(0, 680, 0, 1600);
      gradient.addColorStop(0, "rgba(13, 23, 20, 0)");
      gradient.addColorStop(0.38, "rgba(13, 23, 20, 0.72)");
      gradient.addColorStop(1, "rgba(13, 23, 20, 0.96)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawGratitudeStickerChips(context, visual);

      if (logo && visual.showSignature) {
        context.save();
        context.beginPath();
        context.roundRect(80, 1050, 74, 74, 14);
        context.clip();
        context.drawImage(logo, 80, 1050, 74, 74);
        context.restore();
      }
      if (visual.showSignature) {
        context.fillStyle = "#f8f5e8";
        context.font = "700 46px Georgia, serif";
        context.fillText("Aletheia", logo ? 176 : 80, 1110);
        context.fillStyle = "rgba(248, 245, 232, 0.76)";
        context.font = "400 26px system-ui, sans-serif";
        context.fillText("Wisdom for stewards", logo ? 176 : 80, 1148);
      }
      context.fillStyle = theme.accentLight;
      context.font = "700 30px system-ui, sans-serif";
      context.fillText(label.toLocaleUpperCase(locale), 80, visual.showSignature ? 1210 : 1112);

      let afterNoteY = visual.showSignature ? 1260 : 1162;
      if (visual.showNote) {
        context.fillStyle = "#f8f5e8";
        context.font = "600 60px Georgia, serif";
        afterNoteY = drawWrappedCanvasText(context, entry.note, 80, visual.showSignature ? 1300 : 1210, 1040, 76, visual.showSignature ? 4 : 5);
      }

      context.fillStyle = "rgba(248, 245, 232, 0.78)";
      context.font = "400 30px system-ui, sans-serif";
      const details = [
        visual.showDate ? new Date(entry.createdAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "",
        visual.showPlace ? entry.place.trim() : "",
      ].filter(Boolean).join(" · ");
      if (details) {
        drawWrappedCanvasText(context, details, 80, Math.min(afterNoteY + 46, visual.showSignature ? 1488 : 1520), 1040, 42, 2);
      }

      if (visual.showSignature) {
        context.fillStyle = "rgba(248, 245, 232, 0.66)";
        context.font = "500 24px system-ui, sans-serif";
        drawWrappedCanvasText(context, inviteText, 80, 1536, 1040, 30, 2);
      }
      context.strokeStyle = theme.accentLight;
      context.lineWidth = 4;
      context.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not export postcard."));
        }
      }, "image/png", 0.95);
      };

      const logo = document.createElement("img");
      logo.onload = () => render(logo);
      logo.onerror = () => render();
      logo.src = "/brand/aletheia-app-icon-192.png";
    };
    img.onerror = () => reject(new Error("Could not load gratitude image."));
    img.src = entry.imageDataUrl;
  });
}

function createWisdomPostcardBlob(payload: WisdomPostcardPayload, theme: ThemeColors, locale: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    const context = canvas.getContext("2d");
    if (!context) {
      reject(new Error("Could not prepare wisdom card."));
      return;
    }

    const render = (logo?: HTMLImageElement) => {
      const bg = context.createLinearGradient(0, 0, 1200, 1600);
      bg.addColorStop(0, theme.bgMain);
      bg.addColorStop(0.5, theme.bgCard);
      bg.addColorStop(1, theme.bgCardElevated);
      context.fillStyle = bg;
      context.fillRect(0, 0, canvas.width, canvas.height);

      const glow = context.createRadialGradient(1040, 120, 40, 1040, 120, 640);
      glow.addColorStop(0, `${theme.accentGold}55`);
      glow.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.strokeStyle = theme.accentGold;
      context.lineWidth = 4;
      context.strokeRect(54, 54, canvas.width - 108, canvas.height - 108);

      if (logo) {
        context.save();
        context.beginPath();
        context.roundRect(86, 86, 92, 92, 18);
        context.clip();
        context.drawImage(logo, 86, 86, 92, 92);
        context.restore();
      }

      context.fillStyle = theme.textPrimary;
      context.font = "700 44px system-ui, sans-serif";
      context.fillText("Aletheia", logo ? 206 : 86, 142);
      context.fillStyle = theme.accentGold;
      context.font = "700 30px system-ui, sans-serif";
      const eyebrow = payload.eyebrow || payload.kind;
      context.fillText(eyebrow.toLocaleUpperCase(locale), 86, 270);

      context.fillStyle = theme.textPrimary;
      context.font = "700 72px Georgia, serif";
      const titleEndY = drawWrappedCanvasText(context, cleanDisplayText(payload.title), 86, 370, 1028, 88, 4);

      const bodyStartY = Math.max(payload.kind === "scripture" ? 610 : 650, titleEndY + 78);
      if (payload.sections?.length) {
        let sectionY = bodyStartY;
        payload.sections.slice(0, 4).forEach((section, index) => {
          if (sectionY > 1320) {
            return;
          }
          if (section.label) {
            context.fillStyle = theme.accentGold;
            context.font = "700 24px system-ui, sans-serif";
            context.fillText(section.label.toLocaleUpperCase(locale), 86, sectionY);
            sectionY += 44;
          }
          context.fillStyle = theme.textSecondary;
          context.font = index === 0 && payload.kind === "scripture" ? "400 38px Georgia, serif" : "400 36px system-ui, sans-serif";
          const maxLines = payload.kind === "scripture" && index === 0 ? 5 : 3;
          sectionY = drawWrappedCanvasText(context, cleanDisplayText(section.text), 86, sectionY, 1028, 52, maxLines) + 38;
        });
      } else {
        context.fillStyle = theme.textSecondary;
        context.font = "400 42px system-ui, sans-serif";
        drawWrappedCanvasText(context, cleanDisplayText(payload.body), 86, 760, 1028, 62, 8);
      }

      context.fillStyle = theme.accentGold;
      context.font = "600 30px system-ui, sans-serif";
      drawWrappedCanvasText(
        context,
        payload.footer || "Share the principle, not the private story.",
        86,
        1420,
        1028,
        40,
        3
      );

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not export wisdom card."));
        }
      }, "image/png", 0.95);
    };

    const logo = document.createElement("img");
    logo.onload = () => render(logo);
    logo.onerror = () => render();
    logo.src = "/brand/aletheia-app-icon-192.png";
  });
}

function voiceQualityScore(voice: SpeechSynthesisVoice, languagePrefix: string) {
  const name = voice.name.toLowerCase();
  const noveltyVoicePattern =
    /novelty|bells|bad news|bubbles|cellos|good news|hysterical|organ|trinoids|whisper|zarvox|boing|bahh|pipe|jester|superstar|wobble|grandma|grandpa|grandmother|grandfather|shelley|sandy|rocko|shelley|seifenblasen|schlechte neuigkeiten|gute neuigkeiten|flüstern|fluestern|hysterisch|orgel|glocken|blasen|celli|oma|opa|grossmutter|großmutter|grossvater|großvater/i;
  if (noveltyVoicePattern.test(voice.name)) {
    return -999;
  }
  let score = voice.lang.toLowerCase().startsWith(languagePrefix) ? 90 : 0;
  if (voice.default) score += 45;
  if (voice.localService) score += 20;
  if (name.includes("enhanced") || name.includes("neural") || name.includes("natural") || name.includes("premium") || name.includes("high quality")) score += 50;
  if (/(samantha|alex|ava|daniel|karen|moira|fiona|tessa|arthur|martha|susan|serena|siri|anna|markus|yannick|amelie|thomas|paulina|jorge|mónica|monica|luciana|felipe|zoe|victoria|allison|tom|diego|paul|luca|camila)/i.test(voice.name)) score += 28;
  if (name.includes("compact") || name.includes("desktop") || name.includes("espeak") || name.includes("festival") || name.includes("legacy")) score -= 55;
  return score;
}

function curatedVoicesForLanguage(voices: SpeechSynthesisVoice[], speechCode: string) {
  const languagePrefix = speechCode.slice(0, 2).toLowerCase();
  const deduped = Array.from(new Map(voices.map((voice) => [`${voice.voiceURI}|${voice.name}|${voice.lang}`, voice])).values());
  const scored = deduped
    .map((voice) => ({ voice, score: voiceQualityScore(voice, languagePrefix) }))
    .filter(({ score }) => score >= 35)
    .sort((a, b) => b.score - a.score);
  const languageMatches = scored.filter(({ voice }) => voice.lang.toLowerCase().startsWith(languagePrefix));
  return (languageMatches.length ? languageMatches : scored).slice(0, 8).map(({ voice }) => voice);
}

function voiceLabel(voice: SpeechSynthesisVoice) {
  return `${voice.name} · ${voice.lang}`;
}

const speechPacingProfiles: Record<LanguageCode, { rate: number; pitch: number }> = {
  en: { rate: 0.9, pitch: 1 },
  es: { rate: 0.92, pitch: 0.98 },
  fr: { rate: 0.9, pitch: 0.96 },
  pt: { rate: 0.94, pitch: 0.98 },
  de: { rate: 0.88, pitch: 0.95 },
  yo: { rate: 0.82, pitch: 1.02 },
  ig: { rate: 0.84, pitch: 1.02 },
  ha: { rate: 0.86, pitch: 1 },
};

function speechPacingForLanguage(languageCode: LanguageCode) {
  return speechPacingProfiles[languageCode] ?? speechPacingProfiles.en;
}

function shouldShowOnboarding() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const completed = window.localStorage.getItem("aletheia_onboarding_complete") === "yes";
    const hasPreferences = Boolean(window.localStorage.getItem("aletheia_preferences"));
    // Don't check hasAnonId - it's auto-created by analytics, not user-initiated
    // Don't check sessionStorage - it's cleared on hard refresh, causing onboarding to disappear
    return !completed && !hasPreferences;
  } catch {
    return false;
  }
}

function analyticsId(storage: Storage, key: string) {
  try {
    const existing = storage.getItem(key);
    if (existing) {
      return existing;
    }
    const next = crypto.randomUUID();
    storage.setItem(key, next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
}

function trackClientEvent(eventName: string, metadata: AnalyticsMetadata = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    eventName,
    anonId: analyticsId(window.localStorage, "aletheia_anon_id"),
    sessionId: analyticsId(window.sessionStorage, "aletheia_session_id"),
    path: window.location.pathname,
    referrer: document.referrer || null,
    source: new URLSearchParams(window.location.search).get("utm_source"),
    metadata,
  };

  fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

function trackAuthFailure(metadata: AnalyticsMetadata) {
  trackClientEvent("auth_failure", metadata);
}

async function getReliableServiceWorkerRegistration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  const registration =
    existing ??
    (await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    }));
  registration.update().catch(() => undefined);
  return navigator.serviceWorker.ready;
}

function sharePlatformUrl(channel: ShareChannel) {
  const encodedUrl = encodeURIComponent(ALETHEIA_SHARE_URL);
  const encodedText = encodeURIComponent(ALETHEIA_SHARE_TEXT);
  const encodedTitle = encodeURIComponent("Aletheia");

  switch (channel) {
    case "whatsapp":
      return `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case "x":
      return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case "email":
      return `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`;
    case "sms":
      return `sms:?&body=${encodedText}%20${encodedUrl}`;
    default:
      return ALETHEIA_SHARE_URL;
  }
}

function cleanDisplayText(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatNextDecisionTitle(title: string, maxLength = 112) {
  const cleaned = cleanDisplayText(title).replace(/\s+/g, " ");
  if (!cleaned) {
    return "Continue";
  }
  if (cleaned.length <= maxLength) {
    return `Continue: ${cleaned}`;
  }
  const minLength = Math.max(56, Math.floor(maxLength * 0.58));
  const previewWindow = cleaned.slice(0, maxLength + 1);

  let sentenceBreak = -1;
  for (const mark of [".", "?", "!", ";", ":"]) {
    sentenceBreak = Math.max(sentenceBreak, previewWindow.lastIndexOf(mark));
  }
  if (sentenceBreak >= minLength - 1) {
    return `Continue: ${previewWindow.slice(0, sentenceBreak + 1).trimEnd()}`;
  }

  const phraseBreak = previewWindow.lastIndexOf(",");
  if (phraseBreak >= Math.floor(maxLength * 0.72)) {
    return `Continue: ${previewWindow.slice(0, phraseBreak).trimEnd()}...`;
  }

  const wordBreak = previewWindow.lastIndexOf(" ");
  const cutoff = wordBreak >= minLength ? wordBreak : maxLength;
  return `Continue: ${cleaned.slice(0, cutoff).trimEnd()}...`;
}

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function localHourToUtcHour(localHour: number) {
  const timezoneOffsetHours = Math.round(new Date().getTimezoneOffset() / 60);
  return (localHour + timezoneOffsetHours + 24) % 24;
}

function notificationHourForStrategy(strategy: NotificationTiming["deliveryStrategy"], fallback: number) {
  if (strategy === "morning") return 8;
  if (strategy === "midday") return 12;
  if (strategy === "evening") return 19;
  return fallback;
}

function notificationTimeLabel(hour: number, locale: string = "en") {
  const normalized = Math.min(23, Math.max(0, hour));
  const date = new Date(2026, 0, 1, normalized, 0, 0);
  try {
    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(date);
  } catch {
    const suffix = normalized >= 12 ? "PM" : "AM";
    const hour12 = normalized % 12 || 12;
    return `${hour12}:00 ${suffix}`;
  }
}

function notificationTimezoneOptions(currentTimezone?: string) {
  const fallbackZones = [
    "UTC",
    "Europe/Berlin",
    "Europe/London",
    "Europe/Paris",
    "Europe/Madrid",
    "Europe/Rome",
    "Europe/Lisbon",
    "Europe/Amsterdam",
    "Europe/Warsaw",
    "Europe/Kiev",
    "Africa/Lagos",
    "Africa/Johannesburg",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Toronto",
    "America/Sao_Paulo",
    "Asia/Jerusalem",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Australia/Sydney",
    "Pacific/Auckland",
  ];

  const intlWithSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };
  const knownTimezones = typeof intlWithSupportedValues.supportedValuesOf === "function"
    ? intlWithSupportedValues.supportedValuesOf("timeZone")
    : fallbackZones;

  const preferred = currentTimezone?.trim() || "";
  const detected = browserTimezone();
  const topChoices = [preferred, detected, "UTC", "Europe/Berlin"].filter(Boolean);

  return Array.from(new Set([...topChoices, ...knownTimezones]));
}

function shouldFallbackToBrowserTimezone(
  preferredTimezone: string | undefined,
  hasExplicitTiming: boolean | undefined,
  timezoneMode: string | undefined
) {
  if (timezoneMode === "auto") {
    return true;
  }
  if (timezoneMode === "manual") {
    return false;
  }
  if (hasExplicitTiming) {
    return false;
  }
  const normalized = preferredTimezone?.trim().toUpperCase();
  return !normalized || normalized === "UTC";
}

function normalizeNotificationTiming(value?: Partial<NotificationTiming> | null): NotificationTiming {
  const strategy = value?.deliveryStrategy;
  const deliveryStrategy: NotificationTiming["deliveryStrategy"] =
    strategy === "morning" || strategy === "midday" || strategy === "evening" || strategy === "custom"
      ? strategy
      : DEFAULT_NOTIFICATION_TIMING.deliveryStrategy;
  const rawHour = Number.isInteger(value?.preferredLocalHour)
    ? Number(value?.preferredLocalHour)
    : notificationHourForStrategy(deliveryStrategy, DEFAULT_NOTIFICATION_TIMING.preferredLocalHour);
  const timezoneMode: NotificationTiming["timezoneMode"] = value?.timezoneMode === "manual" ? "manual" : "auto";
  const preferredTimezone = timezoneMode === "auto"
    ? (typeof window === "undefined" ? "UTC" : browserTimezone())
    : value?.preferredTimezone || (typeof window === "undefined" ? "UTC" : browserTimezone());
  return {
    preferredLocalHour: Math.min(23, Math.max(0, rawHour)),
    preferredTimezone,
    timezoneMode,
    deliveryStrategy,
  };
}

function storedNotificationTiming(): NotificationTiming {
  if (typeof window === "undefined") {
    return DEFAULT_NOTIFICATION_TIMING;
  }
  try {
    const saved = window.localStorage.getItem(NOTIFICATION_TIMING_STORAGE_KEY);
    return normalizeNotificationTiming(saved ? (JSON.parse(saved) as Partial<NotificationTiming>) : { preferredTimezone: browserTimezone() });
  } catch {
    return normalizeNotificationTiming({ preferredTimezone: browserTimezone() });
  }
}

function persistNotificationTiming(timing: NotificationTiming) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(NOTIFICATION_TIMING_STORAGE_KEY, JSON.stringify(timing));
  } catch {
    // Timing remains active for this session if storage is unavailable.
  }
}

function conversationExchanges(messages: ChatMessage[]) {
  const exchanges: ConversationExchange[] = [];
  let pendingQuestion: ChatMessage | null = null;

  for (const message of messages) {
    if (message.role === "user") {
      pendingQuestion = message;
      continue;
    }

    exchanges.push({
      id: `${pendingQuestion?.id ?? "welcome"}-${message.id}`,
      question: pendingQuestion,
      answer: message,
      mode: resolveExchangeMode(pendingQuestion, message),
      createdLabel: pendingQuestion ? "Earlier counsel" : "Welcome",
    });
    pendingQuestion = null;
  }

  return exchanges;
}

function resolveExchangeMode(question: ChatMessage | null, answer: ChatMessage): Mode {
  return question?.mode ?? answer.mode ?? "Money";
}

type WisdomEntry = {
  theme: string;
  scripture: string;
  principle: string;
  context: string;
  application: string;
  keywords: string[];
  emotions: string[];
  questions: string[];
};

type ChatMessage = {
  id: string;
  role: "user" | "aletheia";
  mode?: Mode;
  text: string;
  sources?: WisdomEntry[];
};

type ConversationExchange = {
  id: string;
  question: ChatMessage | null;
  answer: ChatMessage;
  mode: Mode;
  createdLabel: string;
};

type CounselSummaryDraft = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

type CarryToday = {
  date: string;
  phrase: string;
};

type ScriptureMemory = {
  scripture: string;
  principle: string;
  savedAt: string;
  weekKey: string;
};

type TodayCompanionCard = {
  title: string;
  opening: string;
  principle: string;
  practice: string;
  question: string;
  carryPhrase: string;
};

type WeeklyWisdomReview = {
  questions: number;
  reflections: number;
  gratitudeMoments: number;
  decisions: number;
  pattern: string;
  scripture: string;
  nextStep: string;
};

type JournalEntry = {
  id: string;
  title: string;
  body: string;
  mode: Mode;
  createdAt: string;
};

type GratitudeEntry = {
  id: string;
  imageDataUrl: string;
  note: string;
  place: string;
  createdAt: string;
  formation?: GratitudeFormation;
  visual?: GratitudeVisualSettings;
  postcardCreatedAt?: string;
  reflectedAt?: string;
};

type GratitudeContextSummary = {
  totalEntries: number;
  recentEntries: number;
  formationThemes: string[];
  latestNote?: string;
  latestPlace?: string;
  latestCreatedAt?: string;
};

type GratitudeFormation = "provision" | "beauty" | "enoughness" | "answeredPrayer" | "ordinaryMercy";
type GratitudeFilter = "none" | "warm" | "soft" | "mono" | "forest" | "golden" | "calm";
type GratitudeSticker = "leaf" | "cross" | "heart" | "spark" | "book" | "seedling" | "sun" | "thankful" | "enough" | "grace";

type GratitudeVisualSettings = {
  filter: GratitudeFilter;
  showDate: boolean;
  showPlace: boolean;
  showNote: boolean;
  showSignature: boolean;
  stickers: GratitudeSticker[];
  emoji: string;
};

const GRATITUDE_FILTERS: GratitudeFilter[] = ["none", "warm", "soft", "mono", "forest", "golden", "calm"];
const GRATITUDE_FORMATIONS: GratitudeFormation[] = ["provision", "beauty", "enoughness", "answeredPrayer", "ordinaryMercy"];
const GRATITUDE_FORMATION_LABELS: Record<GratitudeFormation, string> = {
  provision: "provision",
  beauty: "beauty",
  enoughness: "enoughness",
  answeredPrayer: "answered prayer",
  ordinaryMercy: "ordinary mercy",
};
const GRATITUDE_STICKERS: GratitudeSticker[] = ["leaf", "cross", "heart", "spark", "book", "seedling", "sun", "thankful", "enough", "grace"];
const GRATITUDE_EMOJIS = ["", "🙏", "✨", "🌿", "☀️", "💛", "🕊️"];
const MAX_GRATITUDE_STICKERS = 4;
const DEFAULT_GRATITUDE_FORMATION: GratitudeFormation = "ordinaryMercy";

const DEFAULT_GRATITUDE_VISUAL: GratitudeVisualSettings = {
  filter: "none",
  showDate: true,
  showPlace: true,
  showNote: true,
  showSignature: true,
  stickers: [],
  emoji: "",
};

const GRATITUDE_FILTER_STYLE: Record<GratitudeFilter, string> = {
  none: "none",
  warm: "sepia(0.2) saturate(1.08) contrast(1.03)",
  soft: "brightness(1.06) contrast(0.94) saturate(0.92)",
  mono: "grayscale(1) contrast(1.08)",
  forest: "sepia(0.12) hue-rotate(50deg) saturate(1.12) contrast(1.02)",
  golden: "sepia(0.3) saturate(1.18) brightness(1.04) contrast(1.02)",
  calm: "contrast(1.07) saturate(0.86) brightness(0.98)",
};

const GRATITUDE_FILTER_OVERLAY: Record<GratitudeFilter, string> = {
  none: "rgba(0, 0, 0, 0)",
  warm: "rgba(176, 104, 52, 0.12)",
  soft: "rgba(255, 246, 232, 0.16)",
  mono: "rgba(18, 18, 18, 0.1)",
  forest: "rgba(44, 91, 58, 0.12)",
  golden: "rgba(213, 163, 69, 0.16)",
  calm: "rgba(82, 112, 124, 0.12)",
};

const GRATITUDE_STICKER_MARK: Record<GratitudeSticker, string> = {
  leaf: "🍃",
  cross: "✝",
  heart: "♡",
  spark: "✦",
  book: "📖",
  seedling: "🌱",
  sun: "☀",
  thankful: "thankful",
  enough: "enough",
  grace: "grace",
};

const GRATITUDE_FORMATION_ICON: Record<GratitudeFormation, string> = {
  provision: "☕",
  beauty: "✦",
  enoughness: "enough",
  answeredPrayer: "amen",
  ordinaryMercy: "mercy",
};

function normalizeGratitudeFormation(value: unknown): GratitudeFormation {
  return typeof value === "string" && GRATITUDE_FORMATIONS.includes(value as GratitudeFormation)
    ? value as GratitudeFormation
    : DEFAULT_GRATITUDE_FORMATION;
}

function normalizeGratitudeVisual(value: unknown): GratitudeVisualSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_GRATITUDE_VISUAL;
  }
  const input = value as Partial<GratitudeVisualSettings>;
  const filter = input.filter && GRATITUDE_FILTERS.includes(input.filter) ? input.filter : DEFAULT_GRATITUDE_VISUAL.filter;
  const stickers = Array.isArray(input.stickers)
    ? input.stickers.filter((sticker): sticker is GratitudeSticker => GRATITUDE_STICKERS.includes(sticker as GratitudeSticker)).slice(0, MAX_GRATITUDE_STICKERS)
    : [];
  const emoji = typeof input.emoji === "string" && GRATITUDE_EMOJIS.includes(input.emoji) ? input.emoji : "";
  return {
    filter,
    showDate: typeof input.showDate === "boolean" ? input.showDate : true,
    showPlace: typeof input.showPlace === "boolean" ? input.showPlace : true,
    showNote: typeof input.showNote === "boolean" ? input.showNote : true,
    showSignature: typeof input.showSignature === "boolean" ? input.showSignature : true,
    stickers,
    emoji,
  };
}

type WisdomDecision = {
  id: string;
  title: string;
  mode: Mode;
  pressure: string;
  initialEmotion: string;
  status: string;
  readiness: number;
  counselSought: boolean;
  costCounted: boolean;
  alignmentClear: boolean;
  reversibleStep: boolean;
  peaceOverUrgency: boolean;
  waitingUntil: string | null;
  revisitAt?: string | null;
  outcomeReviewAt?: string | null;
  summary: string | null;
  finalDecision: string | null;
  learning: string | null;
  createdAt: string;
  updatedAt: string;
};

type DecisionEvent = {
  id: string;
  decisionId: string | null;
  eventType: string;
  body: string;
  mode: Mode | null;
  createdAt: string;
};

type TimelineInsight = {
  activeCount: number;
  daysDiscerning: number;
  patterns: string[];
  gentleObservation: string;
};

type WisdomPostcardPayload = {
  title: string;
  eyebrow?: string;
  body: string;
  sections?: Array<{ label?: string; text: string }>;
  footer?: string;
  kind: "answer" | "reflection" | "daily" | "decision" | "scripture" | "carry" | "blessing";
};

type CounselContact = {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  contact: string | null;
  notes: string | null;
  inviteStatus: "pending" | "accepted" | "not_sent";
  canViewSummaries: boolean;
  canCommentOnDecisions: boolean;
  canReceiveCheckins: boolean;
  acceptedAt: string | null;
  emailSent?: boolean;
  emailError?: string | null;
  createdAt: string;
};

type CounselInvitePreview = {
  invite: {
    name: string;
    role: string;
    avatarUrl?: string | null;
    status: "pending" | "accepted";
    acceptedAt: string | null;
    permissions: {
      canViewSummaries: boolean;
      canCommentOnDecisions: boolean;
      canReceiveCheckins: boolean;
    };
  };
  sharedDecisions: Array<{
    id: string;
    title: string;
    mode: string;
    status: string;
    readiness: number;
    summary: string | null;
    waitingUntil: string | null;
    sharedAt: string;
    comments: Array<{ id: string; body: string; createdAt: string }>;
  }>;
};

type CounselRemovalConfirmationState = {
  contactId: string;
  contactName: string;
};

function isCounselInvitePreview(value: CounselInvitePreview | { error?: string }): value is CounselInvitePreview {
  return "invite" in value && "sharedDecisions" in value;
}

type RuleOfLife = {
  id: string;
  mode: Mode;
  principle: string;
  createdAt: string;
};

const wisdomEntries: WisdomEntry[] = baseWisdomEntries;

type ModeCard = { label: Mode; icon: typeof PiggyBank; copy: string; displayLabel?: string };
type DisplayModeProfile = ModeProfile & { displayLabel?: string };

const modes: ModeCard[] = [
  { label: "Money", icon: PiggyBank, copy: modeProfiles.Money.focus },
  { label: "Work", icon: BriefcaseBusiness, copy: modeProfiles.Work.focus },
  { label: "Purpose", icon: Compass, copy: modeProfiles.Purpose.focus },
  { label: "Generosity", icon: HandHeart, copy: modeProfiles.Generosity.focus },
  { label: "Life", icon: Home, copy: modeProfiles.Life.focus },
];

const modeDisplayLabels: Partial<Record<LanguageCode, Record<Mode, string>>> = {
  pt: {
    Money: "Dinheiro",
    Work: "Trabalho",
    Purpose: "Propósito",
    Generosity: "Generosidade",
    Life: "Vida",
  },
  yo: {
    Money: "Owó",
    Work: "Iṣẹ́",
    Purpose: "Ìdí",
    Generosity: "Ọ̀fẹ́",
    Life: "Ayé",
  },
  ig: {
    Money: "Ego",
    Work: "Ọrụ",
    Purpose: "Nzube",
    Generosity: "Mmesapụ aka",
    Life: "Ndụ",
  },
  ha: {
    Money: "Kuɗi",
    Work: "Aiki",
    Purpose: "Manufa",
    Generosity: "Karimci",
    Life: "Rayuwa",
  },
  de: {
    Money: "Geld",
    Work: "Arbeit",
    Purpose: "Sinn",
    Generosity: "Großzügigkeit",
    Life: "Leben",
  },
  es: {
    Money: "Dinero",
    Work: "Trabajo",
    Purpose: "Propósito",
    Generosity: "Generosidad",
    Life: "Vida",
  },
  fr: {
    Money: "Argent",
    Work: "Travail",
    Purpose: "Sens",
    Generosity: "Générosité",
    Life: "Vie",
  },
  en: {
    Money: "Money",
    Work: "Work",
    Purpose: "Purpose",
    Generosity: "Generosity",
    Life: "Life",
  },
};

const localizedModeProfiles: Partial<Record<LanguageCode, Partial<Record<Mode, Partial<ModeProfile>>>>> = {
  yo: {
    Money: {
      intent: "Ṣe ìtọ́jú ohun tí a fi lé ọ lọ́wọ́ pẹ̀lú àlàáfíà àti ìmọ̀.",
      focus: "Ìṣètò owó, gbèsè, ìfipamọ́, ìdókòwò, ìtẹ́lọ́run",
      useWhen: "Lo fún ináwó, gbèsè, ìfipamọ́, ìdókòwò, àníyàn owó, tàbí fífi ara wé ẹlòmíì.",
      lens: "Ìwòye ìtọ́jú: òmìnira, ohun tó tó, sùúrù, ewu, àti ojúṣe olóòtítọ́.",
      diagnosticTracks: [
        "Òmìnira: ṣé yíyàn yìí máa pọ̀ síi tàbí dín àwọn àṣàyàn ọgbọ́n lọ́la kù?",
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
      prompts: ["Ṣé kí n fi iṣẹ́ mi tó dúró ṣinṣin sílẹ̀?", "Báwo ni mo ṣe mọ̀ pé ìfẹ́ṣọ́nà mi dára?", "Ṣé kí n bẹ̀rẹ̀ òwò yìí báyìí?"],
    },
    Purpose: {
      intent: "Dákẹ́ kí o ṣàyẹ̀wò ẹni tí ìpinnu yìí ń dá sílẹ̀.",
      focus: "Ìdánimọ̀, ìtọ́sọ́nà, àníyàn, iye, ìmọ̀ pípẹ́",
      useWhen: "Lo nígbà tí ìbéèrè gidi jẹ́ ìdánimọ̀, ìtọ́sọ́nà, àlàáfíà, àsìkò, tàbí iye.",
      lens: "Ìwòye ìmòye: ìdánimọ̀, àlàáfíà, ìdí inú, sùúrù, àti ìgbésẹ̀ olóòtítọ́ tó kàn.",
      prompts: ["Báwo ni mo ṣe lè pinnu nígbà tí kò yé mi?", "Bí mo bá ń lé aṣeyọrí fún ìdí tí kò dára ńkọ?", "Báwo ni mo ṣe lè rí àlàáfíà nípa ìgbésẹ̀ tó kàn?"],
    },
    Generosity: {
      intent: "Fúnni ní òmìnira láì jẹ́ ẹ̀bi, ìfọkànsìn, tàbí ìṣeré.",
      focus: "Fífúnni, ìrànwọ́ ẹbí, iṣẹ́ àánú, ààlà, ìtẹ̀síwájú",
      useWhen: "Lo fún fífúnni, ìrànwọ́ ẹbí, ààlà, tàbí ìfẹ́ fúnni tó lè tẹ̀síwájú.",
      lens: "Ìwòye ìfẹ́ fúnni: ìfẹ́ ọkàn, ìtẹ̀síwájú, ayọ̀, ọgbọ́n, àti ìfẹ́ láì fi ipa múni.",
      prompts: ["Báwo ni mo ṣe lè fúnni láì jẹ́ ẹ̀bi tàbí ìfọkànsìn?", "Ṣé kí n tún ran ẹbí lọ́wọ́ nípa owó?", "Ìfẹ́ fúnni mélòó ni ó le tẹ̀síwájú fún mi?"],
    },
    Life: {
      intent: "Ṣe ìtọ́nisọ́nà ìgbésí ayé ojoojúmọ́ pẹ̀lú ọgbọ́n tí ó dákẹ́.",
      focus: "Àṣà, ìbáṣepọ̀, ẹbí, ìsinmi, ìlera, ìrìnàjò ilé",
      useWhen: "Lo fún àwọn ìpinnu ìgbésí ayé ojoojúmọ́, àṣà, ìbáṣepọ̀, ìsinmi, ìjà, tàbí nígbà tí ìgbésẹ̀ tó tẹ̀lé kò dájú pé ó jẹ́ ìbéèrè owó tàbí iṣẹ́.",
      lens: "Ìwòye gbogbo ìgbésí ayé: ìhuwasi, ìbáṣepọ̀, ojúṣe, ìlànà, àti ìgbésẹ̀ olóòtítọ́ tó kàn.",
      prompts: ["Báwo ni mo ṣe lè sọ ìgbésí ayé ojoojúmọ́ mi di ọgbọ́n síi?", "Kí ni mo yẹ kí n ṣe nípa ìbáṣepọ̀ yìí?", "Àṣà wo ni mo yẹ kí n yí padà kíákíá?"],
    },
  },
};

function modeDisplayLabel(mode: Mode, language: LanguageCode) {
  return modeDisplayLabels[language]?.[mode] ?? mode;
}

const wisdomThemeDisplayLabels: Partial<Record<LanguageCode, Record<string, string>>> = {
  pt: {
    Stewardship: "Mordomia",
    Debt: "Dívida",
    Contentment: "Contentamento",
    Counsel: "Conselho",
    "Cost Counting": "Cálculo do custo",
    Generosity: "Generosidade",
    Diligence: "Diligência",
    "Provision and Anxiety": "Provisão e ansiedade",
  },
  yo: {
    Stewardship: "Ìtọ́jú",
    Debt: "Gbèsè",
    Contentment: "Ìtẹ́lọ́rùn",
    Counsel: "Ìmọ̀ràn",
    "Cost Counting": "Kíka iye owó",
    Generosity: "Ọ̀fẹ́",
    Diligence: "Ìsapá",
    "Provision and Anxiety": "Ipèsè àti àníyàn",
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
  },
  ha: {
    Stewardship: "Kulawa",
    Debt: "Bashi",
    Contentment: "Gamsuwa",
    Counsel: "Shawara",
    "Cost Counting": "Lissafin kuɗi",
    Generosity: "Karimci",
    Diligence: "Naci",
    "Provision and Anxiety": "Tanadi da damuwa",
  },
};

function isMode(value: string): value is Mode {
  return value === "Money" || value === "Work" || value === "Purpose" || value === "Generosity" || value === "Life";
}

function modeTranslationKey(mode: Mode) {
  return `modes.${mode.toLowerCase()}.label`;
}

function localizedModeLabel(mode: Mode, language: LanguageCode, translations?: TranslationData): string {
  const fallback = modeDisplayLabel(mode, language);
  if (!translations) {
    return fallback;
  }

  const translated = getTranslation(translations, modeTranslationKey(mode), fallback);
  return Array.isArray(translated) ? translated.join(', ') : translated;
}

function localizedWisdomThemeLabel(theme: string, language: LanguageCode) {
  if (isMode(theme)) {
    return modeDisplayLabel(theme, language);
  }
  return wisdomThemeDisplayLabels[language]?.[theme] ?? theme;
}

type RuntimePanelCopy = {
  timelineReady: string;
  nextInDecisions: string;
  decisionNextTitleDefault: string;
  decisionNextBodyActive: string;
  decisionNextBodyEmpty: string;
  decisionCompanionHeading: string;
  decisionCompanionSub: string;
  ruleOfLife: string;
  ruleOfLifePrincipleSingular: string;
  ruleOfLifePrinciplePlural: string;
  ruleOfLifeSummary: string;
  decisionPracticeLine: string;
  nextInReflect: string;
  reflectNextTitleDefault: string;
  reflectNextTitleActive: string;
  reflectNextBodyDefault: string;
  reflectNextBodyActive: string;
  reflectIntro: string;
  wisdomCheck: string;
  wisdomCheckSummaryDefault: string;
  wisdomCheckUrgency: string;
  wisdomCheckSlower: string;
  decisionScan: string;
  reflectionHistory: string;
  savedReflectionSingular: string;
  savedReflectionPlural: string;
  reflectionHistorySummaryActive: string;
  reflectionHistorySummaryDefault: string;
  nextInLibrary: string;
  libraryNextTitleDefault: string;
  libraryNextBodySearch: string;
  libraryTryPrefix: string;
  libraryDescription: string;
  fullWisdomLibrary: string;
  moreAnchors: string;
};

const runtimePanelCopy: Record<LanguageCode, RuntimePanelCopy> = {
  en: {
    timelineReady: "Your timeline is ready to track decisions, patterns, counsel, and learning.",
    nextInDecisions: "Next in Decisions",
    decisionNextTitleDefault: "Name the decision under pressure",
    decisionNextBodyActive: "Update counsel, cost, waiting, and peace signals so the decision has a real timeline.",
    decisionNextBodyEmpty: "Start with one decision and the pressure attached to it. Aletheia will track wisdom, counsel, and readiness over time.",
    decisionCompanionHeading: "Track the decision until wisdom has had time to work.",
    decisionCompanionSub: "Memory, counsel, waiting, summary export, and a calm readiness signal for major choices.",
    ruleOfLife: "Rule of Life",
    ruleOfLifePrincipleSingular: "principle",
    ruleOfLifePrinciplePlural: "principles",
    ruleOfLifeSummary: "Personal principles stay close, but collapsed until you are shaping a decision.",
    decisionPracticeLine: "Name what is enough for this season",
    nextInReflect: "Next in Reflect",
    reflectNextTitleDefault: "Begin with one honest sentence",
    reflectNextTitleActive: "Finish the reflection in front of you",
    reflectNextBodyDefault: "Use Wisdom Check for a quick discernment scan, or write what you notice about money, work, fear, generosity, or pace.",
    reflectNextBodyActive: "Save what you are noticing while the insight is still fresh.",
    reflectIntro: "Use Wisdom Check to slow a decision down, then save what you notice before the moment passes.",
    wisdomCheck: "Wisdom Check",
    wisdomCheckSummaryDefault: "Open when a decision needs a quick discernment scan.",
    wisdomCheckUrgency: "urgency noticed",
    wisdomCheckSlower: "pressure looks slower",
    decisionScan: "Decision scan",
    reflectionHistory: "Reflection history",
    savedReflectionSingular: "saved reflection",
    savedReflectionPlural: "saved reflections",
    reflectionHistorySummaryActive: "Open your past reflections when you want to review growth.",
    reflectionHistorySummaryDefault: "Past reflections will stay here once saved.",
    nextInLibrary: "Next in Library",
    libraryNextTitleDefault: "Search one wisdom theme",
    libraryNextBodySearch: "Open a scripture reference to read the passage context and why it matters here.",
    libraryTryPrefix: "Try",
    libraryDescription: "A curated wisdom base with language-aware application notes and public-domain translation labels.",
    fullWisdomLibrary: "Full wisdom library",
    moreAnchors: "more anchors",
  },
  es: {
    timelineReady: "Tu linea de tiempo esta lista para seguir decisiones, patrones, consejo y aprendizaje.",
    nextInDecisions: "Siguiente en Decisiones",
    decisionNextTitleDefault: "Nombra la decision bajo presion",
    decisionNextBodyActive: "Actualiza consejo, costo, espera y paz para que la decision tenga una linea de tiempo real.",
    decisionNextBodyEmpty: "Empieza con una decision y la presion asociada. Aletheia seguira sabiduria, consejo y preparacion con el tiempo.",
    decisionCompanionHeading: "Sigue la decision hasta que la sabiduria tenga tiempo de obrar.",
    decisionCompanionSub: "Memoria, consejo, espera, exportacion de resumen y una senal tranquila de preparacion para decisiones importantes.",
    ruleOfLife: "Regla de vida",
    ruleOfLifePrincipleSingular: "principio",
    ruleOfLifePrinciplePlural: "principios",
    ruleOfLifeSummary: "Los principios personales quedan cerca, pero colapsados hasta que estes moldeando una decision.",
    decisionPracticeLine: "Nombra lo que es suficiente para esta temporada",
    nextInReflect: "Siguiente en Reflexion",
    reflectNextTitleDefault: "Comienza con una frase honesta",
    reflectNextTitleActive: "Termina la reflexion frente a ti",
    reflectNextBodyDefault: "Usa Chequeo de sabiduria para un escaneo rapido de discernimiento, o escribe lo que notas sobre dinero, trabajo, temor, generosidad o ritmo.",
    reflectNextBodyActive: "Guarda lo que estas notando mientras la intuicion aun esta fresca.",
    reflectIntro: "Usa Chequeo de sabiduria para bajar el ritmo de una decision, luego guarda lo que notas antes de que pase el momento.",
    wisdomCheck: "Chequeo de sabiduria",
    wisdomCheckSummaryDefault: "Abre cuando una decision necesite un escaneo rapido de discernimiento.",
    wisdomCheckUrgency: "urgencia detectada",
    wisdomCheckSlower: "la presion parece mas calmada",
    decisionScan: "Escaneo de decision",
    reflectionHistory: "Historial de reflexion",
    savedReflectionSingular: "reflexion guardada",
    savedReflectionPlural: "reflexiones guardadas",
    reflectionHistorySummaryActive: "Abre tus reflexiones pasadas cuando quieras revisar crecimiento.",
    reflectionHistorySummaryDefault: "Las reflexiones pasadas quedaran aqui una vez guardadas.",
    nextInLibrary: "Siguiente en Biblioteca",
    libraryNextTitleDefault: "Busca un tema de sabiduria",
    libraryNextBodySearch: "Abre una referencia biblica para leer el contexto del pasaje y por que importa aqui.",
    libraryTryPrefix: "Prueba",
    libraryDescription: "Una base de sabiduria curada con notas de aplicacion segun idioma y etiquetas de traduccion de dominio publico.",
    fullWisdomLibrary: "Biblioteca completa de sabiduria",
    moreAnchors: "anclas mas",
  },
  fr: {
    timelineReady: "Votre chronologie est prete a suivre decisions, motifs, conseil et apprentissage.",
    nextInDecisions: "Suite dans Decisions",
    decisionNextTitleDefault: "Nommez la decision sous pression",
    decisionNextBodyActive: "Mettez a jour conseil, cout, attente et paix pour donner une vraie chronologie a la decision.",
    decisionNextBodyEmpty: "Commencez avec une decision et la pression associee. Aletheia suivra sagesse, conseil et preparation dans le temps.",
    decisionCompanionHeading: "Suivez la decision jusqu'a ce que la sagesse ait le temps d'agir.",
    decisionCompanionSub: "Memoire, conseil, attente, export de resume et signal calme de preparation pour les grands choix.",
    ruleOfLife: "Regle de vie",
    ruleOfLifePrincipleSingular: "principe",
    ruleOfLifePrinciplePlural: "principes",
    ruleOfLifeSummary: "Les principes personnels restent proches, mais reduits tant que vous ne faconnez pas une decision.",
    decisionPracticeLine: "Nomme ce qui est suffisant pour cette saison",
    nextInReflect: "Suite dans Reflexion",
    reflectNextTitleDefault: "Commencez par une phrase honnete",
    reflectNextTitleActive: "Terminez la reflexion devant vous",
    reflectNextBodyDefault: "Utilisez Verification de sagesse pour un scan rapide de discernement, ou ecrivez ce que vous remarquez sur l'argent, le travail, la peur, la generosite ou le rythme.",
    reflectNextBodyActive: "Enregistrez ce que vous remarquez pendant que l'intuition est encore fraiche.",
    reflectIntro: "Utilisez Verification de sagesse pour ralentir une decision, puis enregistrez ce que vous remarquez avant que le moment ne passe.",
    wisdomCheck: "Verification de sagesse",
    wisdomCheckSummaryDefault: "Ouvrez quand une decision a besoin d'un scan rapide de discernement.",
    wisdomCheckUrgency: "urgence detectee",
    wisdomCheckSlower: "la pression semble plus calme",
    decisionScan: "Scan de decision",
    reflectionHistory: "Historique de reflexion",
    savedReflectionSingular: "reflexion enregistree",
    savedReflectionPlural: "reflexions enregistrees",
    reflectionHistorySummaryActive: "Ouvrez vos reflexions passees quand vous voulez revoir la croissance.",
    reflectionHistorySummaryDefault: "Les reflexions passees resteront ici une fois enregistrees.",
    nextInLibrary: "Suite dans Bibliotheque",
    libraryNextTitleDefault: "Recherchez un theme de sagesse",
    libraryNextBodySearch: "Ouvrez une reference biblique pour lire le contexte du passage et pourquoi cela compte ici.",
    libraryTryPrefix: "Essayez",
    libraryDescription: "Une base de sagesse choisie avec des notes d'application selon la langue et des etiquettes de traduction du domaine public.",
    fullWisdomLibrary: "Bibliotheque complete de sagesse",
    moreAnchors: "ancrages de plus",
  },
  pt: {
    timelineReady: "Sua linha do tempo esta pronta para acompanhar decisoes, padroes, conselho e aprendizado.",
    nextInDecisions: "Proximo em Decisoes",
    decisionNextTitleDefault: "Nomeie a decisao sob pressao",
    decisionNextBodyActive: "Atualize conselho, custo, espera e paz para que a decisao tenha uma linha do tempo real.",
    decisionNextBodyEmpty: "Comece com uma decisao e a pressao ligada a ela. Aletheia vai acompanhar sabedoria, conselho e prontidao ao longo do tempo.",
    decisionCompanionHeading: "Acompanhe a decisao ate que a sabedoria tenha tempo para agir.",
    decisionCompanionSub: "Memoria, conselho, espera, exportacao de resumo e um sinal calmo de prontidao para escolhas importantes.",
    ruleOfLife: "Regra de vida",
    ruleOfLifePrincipleSingular: "principio",
    ruleOfLifePrinciplePlural: "principios",
    ruleOfLifeSummary: "Principios pessoais ficam por perto, mas recolhidos ate voce estar moldando uma decisao.",
    decisionPracticeLine: "Nomeie o que e suficiente para esta temporada",
    nextInReflect: "Proximo em Reflexao",
    reflectNextTitleDefault: "Comece com uma frase honesta",
    reflectNextTitleActive: "Conclua a reflexao diante de voce",
    reflectNextBodyDefault: "Use Verificacao de sabedoria para um exame rapido de discernimento, ou escreva o que voce percebe sobre dinheiro, trabalho, medo, generosidade ou ritmo.",
    reflectNextBodyActive: "Salve o que voce esta percebendo enquanto o insight ainda esta fresco.",
    reflectIntro: "Use Verificacao de sabedoria para desacelerar uma decisao e salve o que voce percebe antes que o momento passe.",
    wisdomCheck: "Verificacao de sabedoria",
    wisdomCheckSummaryDefault: "Abra quando uma decisao precisar de um exame rapido de discernimento.",
    wisdomCheckUrgency: "urgencia percebida",
    wisdomCheckSlower: "a pressao parece mais calma",
    decisionScan: "Exame de decisao",
    reflectionHistory: "Historico de reflexao",
    savedReflectionSingular: "reflexao salva",
    savedReflectionPlural: "reflexoes salvas",
    reflectionHistorySummaryActive: "Abra reflexoes passadas quando quiser revisar crescimento.",
    reflectionHistorySummaryDefault: "Reflexoes passadas ficarao aqui apos salvar.",
    nextInLibrary: "Proximo na Biblioteca",
    libraryNextTitleDefault: "Pesquise um tema de sabedoria",
    libraryNextBodySearch: "Abra uma referencia biblica para ler o contexto da passagem e por que ela importa aqui.",
    libraryTryPrefix: "Tente",
    libraryDescription: "Uma base de sabedoria curada com notas de aplicacao por idioma e rotulos de traducoes em dominio publico.",
    fullWisdomLibrary: "Biblioteca completa de sabedoria",
    moreAnchors: "ancoras a mais",
  },
  de: {
    timelineReady: "Deine Zeitleiste ist bereit, Entscheidungen, Muster, Rat und Lernen zu verfolgen.",
    nextInDecisions: "Als Nächstes in Entscheidungen",
    decisionNextTitleDefault: "Benenne die Entscheidung unter Druck",
    decisionNextBodyActive: "Aktualisiere Rat, Kosten, Warten und Frieden, damit die Entscheidung eine echte Zeitleiste hat.",
    decisionNextBodyEmpty: "Beginne mit einer Entscheidung und dem dazugehörigen Druck. Aletheia verfolgt Weisheit, Rat und Bereitschaft über die Zeit.",
    decisionCompanionHeading: "Verfolge die Entscheidung, bis Weisheit Zeit hatte zu wirken.",
    decisionCompanionSub: "Speicher, Rat, Warten, Zusammenfassungsexport und ein ruhiges Bereitschaftssignal für große Entscheidungen.",
    ruleOfLife: "Lebensregel",
    ruleOfLifePrincipleSingular: "Prinzip",
    ruleOfLifePrinciplePlural: "Prinzipien",
    ruleOfLifeSummary: "Persönliche Prinzipien bleiben nah, aber eingeklappt, bis du eine Entscheidung formst.",
    decisionPracticeLine: "Benenne, was fur diese Saison genug ist",
    nextInReflect: "Als Nächstes in Reflexion",
    reflectNextTitleDefault: "Beginne mit einem ehrlichen Satz",
    reflectNextTitleActive: "Beende die Reflexion vor dir",
    reflectNextBodyDefault: "Nutze Weisheitscheck fur einen schnellen Unterscheidungs-Scan oder schreibe auf, was du uber Geld, Arbeit, Angst, Großzugigkeit oder Tempo bemerkst.",
    reflectNextBodyActive: "Speichere, was du bemerkst, solange die Einsicht noch frisch ist.",
    reflectIntro: "Nutze Weisheitscheck, um eine Entscheidung zu verlangsamen, und speichere dann, was du bemerkst, bevor der Moment vergeht.",
    wisdomCheck: "Weisheitscheck",
    wisdomCheckSummaryDefault: "Öffne es, wenn eine Entscheidung einen schnellen Unterscheidungs-Scan braucht.",
    wisdomCheckUrgency: "Dringlichkeit erkannt",
    wisdomCheckSlower: "Druck wirkt ruhiger",
    decisionScan: "Entscheidungs-Scan",
    reflectionHistory: "Reflexionsverlauf",
    savedReflectionSingular: "gespeicherte Reflexion",
    savedReflectionPlural: "gespeicherte Reflexionen",
    reflectionHistorySummaryActive: "Öffne vergangene Reflexionen, wenn du Wachstum prüfen willst.",
    reflectionHistorySummaryDefault: "Vergangene Reflexionen bleiben hier, sobald sie gespeichert sind.",
    nextInLibrary: "Als Nächstes in Bibliothek",
    libraryNextTitleDefault: "Suche ein Weisheitsthema",
    libraryNextBodySearch: "Öffne eine Bibelstelle, um den Kontext der Passage und ihre Bedeutung hier zu sehen.",
    libraryTryPrefix: "Versuche",
    libraryDescription: "Eine kuratierte Weisheitsbasis mit sprachsensiblen Anwendungshinweisen und Labels für gemeinfreie Übersetzungen.",
    fullWisdomLibrary: "Vollständige Weisheitsbibliothek",
    moreAnchors: "weitere Anker",
  },
  yo: {
    timelineReady: "Ago-akoko re ti setan lati tele ipinnu, ilana, imooran ati eko.",
    nextInDecisions: "Eto to nbo ninu Ipinnu",
    decisionNextTitleDefault: "So ipinnu to wa labẹ titẹ",
    decisionNextBodyActive: "Tun imoaran, iye owo, idaduro ati alaafia se ki ipinnu naa ni itan-akoko gidi.",
    decisionNextBodyEmpty: "Bere pelu ipinnu kan ati titẹ to so mọ ọ. Aletheia yoo maa tele ogbon, imoaran ati imurasile lori akoko.",
    decisionCompanionHeading: "Tele ipinnu naa titi ogbon yoo fi ni akoko lati sise.",
    decisionCompanionSub: "Irántí, imoaran, idaduro, gbigbejade akosile ati ami imurasile idakẹjẹ fun awon yiyan pataki.",
    ruleOfLife: "Ofin Igbesiaye",
    ruleOfLifePrincipleSingular: "ilana",
    ruleOfLifePrinciplePlural: "awon ilana",
    ruleOfLifeSummary: "Awon ilana ara eni wa nitosi, sugbon won wa ni pipade titi ti o fi n se agbekale ipinnu.",
    decisionPracticeLine: "So ohun to to fun asiko yi",
    nextInReflect: "Eto to nbo ninu Ironu",
    reflectNextTitleDefault: "Bere pelu gbolohun otito kan",
    reflectNextTitleActive: "Pari ironu to wa niwaju re",
    reflectNextBodyDefault: "Lo Ayewo ogbon fun ayewo iyara, tabi ko ohun ti o n ri nipa owo, ise, iberu, ofe ati iyara.",
    reflectNextBodyActive: "Fi ohun ti o n ri pamọ nigba ti imo naa tun n gbona.",
    reflectIntro: "Lo Ayewo ogbon lati din iyara ipinnu ku, ki o si fi ohun ti o n ri pamọ ki akoko naa to lo.",
    wisdomCheck: "Ayewo ogbon",
    wisdomCheckSummaryDefault: "Si i nigba ti ipinnu ba nilo ayewo iyara.",
    wisdomCheckUrgency: "a ti ri ijakule iyara",
    wisdomCheckSlower: "titẹ naa dabi pe o rọra",
    decisionScan: "Ayewo ipinnu",
    reflectionHistory: "Itan ironu",
    savedReflectionSingular: "ironu ti a fipamo",
    savedReflectionPlural: "awon ironu ti a fipamo",
    reflectionHistorySummaryActive: "Si awon ironu tele nigba ti o ba fe tun wo idagbasoke.",
    reflectionHistorySummaryDefault: "Awon ironu tele yoo wa nibi nigbati a ba fipamo won.",
    nextInLibrary: "Eto to nbo ninu Ile-ikawe",
    libraryNextTitleDefault: "Wa koko-oro ogbon kan",
    libraryNextBodySearch: "Si itọkasi iwe-mimo kan lati ka ayika gbolohun ati idi to fi se pataki nibi.",
    libraryTryPrefix: "Gbiyanju",
    libraryDescription: "Ibi-ipamọ ogbon ti a yan pẹlu awon alaye ohun elo to ba ede mu ati awon aami itumọ agbegbe gbangba.",
    fullWisdomLibrary: "Ile-ikawe ogbon kikun",
    moreAnchors: "awon oran afikun",
  },
  ig: {
    timelineReady: "Usoro oge gi di njikere iso mkpebi, usoro, nduzi na omumu.",
    nextInDecisions: "Ihe na-esote na Mkpebi",
    decisionNextTitleDefault: "Kowa mkpebi di n'okpuru nrụgide",
    decisionNextBodyActive: "Megharia nduzi, onu ahia, ichere na udo ka mkpebi nwee usoro oge eziokwu.",
    decisionNextBodyEmpty: "Bido na mkpebi otu na nrụgide ya. Aletheia ga-eso amamihe, nduzi na njikere n'oge.",
    decisionCompanionHeading: "Soro mkpebi ahu ruo mgbe amamihe nwere oge isoro oru.",
    decisionCompanionSub: "Ncheta, nduzi, ichere, ibupu nchikota, na akara njikere di juru nwayoo maka nhọrọ di mkpa.",
    ruleOfLife: "Iwu Ndụ",
    ruleOfLifePrincipleSingular: "usoro",
    ruleOfLifePrinciplePlural: "usoro",
    ruleOfLifeSummary: "Uzo ndu onwe onye na-anọ nso, mana a na-emechi ha ruo mgbe i na-akpụ mkpebi.",
    decisionPracticeLine: "Kowa ihe zuru ezu maka oge a",
    nextInReflect: "Ihe na-esote na Ntụgharị uche",
    reflectNextTitleDefault: "Bido na ahiriokwu eziokwu otu",
    reflectNextTitleActive: "Mechaa ntughari uche di n'ihu gi",
    reflectNextBodyDefault: "Jiri Nyocha amamihe maka nyocha ngwa ngwa, ma obu dee ihe i na-ahuta gbasara ego, oru, egwu, mmesa aka, ma obu ije.",
    reflectNextBodyActive: "Chekwaa ihe i na-ahuta mgbe nghota ka di ohuru.",
    reflectIntro: "Jiri Nyocha amamihe mee ka mkpebi jupụta nwayoo, wee chekwaa ihe i na-ahuta tupu oge gafee.",
    wisdomCheck: "Nyocha amamihe",
    wisdomCheckSummaryDefault: "Mepee ya mgbe mkpebi choro nyocha ngwa ngwa.",
    wisdomCheckUrgency: "a huru ngwa ngwa",
    wisdomCheckSlower: "nrụgide yiri ka o na-ala nwayoo",
    decisionScan: "Nyocha mkpebi",
    reflectionHistory: "Akuko ntughari uche",
    savedReflectionSingular: "ntughari uche echekwara",
    savedReflectionPlural: "ntughari uche echekwara",
    reflectionHistorySummaryActive: "Meghee ntughari uche gara aga mgbe ichoro ilele uto.",
    reflectionHistorySummaryDefault: "Ntughari uche gara aga ga-anoro ebe a mgbe echekwara ya.",
    nextInLibrary: "Ihe na-esote na Oba Akwukwo",
    libraryNextTitleDefault: "Chọọ isiokwu amamihe otu",
    libraryNextBodySearch: "Meghee akwukwo nso bibul ka i gụọ gburugburu amaokwu na ihe kpatara o ji di mkpa n'ebe a.",
    libraryTryPrefix: "Gbalịa",
    libraryDescription: "Ogige amamihe ahọpụtara nwere ihe omume dabere na asusu na akara ntughari nke ndi mmadu nile.",
    fullWisdomLibrary: "Oba akwukwo amamihe zuru oke",
    moreAnchors: "mkporo ozo",
  },
  ha: {
    timelineReady: "Jadawalin lokacinka ya shirya don bin shawarwari, tsari, shawara da koyo.",
    nextInDecisions: "Na gaba a Shawara",
    decisionNextTitleDefault: "Sanya sunan shawarar da ke karkashin matsin lamba",
    decisionNextBodyActive: "Sabunta shawara, kudi, jira da salama domin shawarar ta samu jadawalin lokaci na gaskiya.",
    decisionNextBodyEmpty: "Fara da shawara daya da matsin da ke tattare da ita. Aletheia za ta bi hikima, shawara da shirye-shirye a tsawon lokaci.",
    decisionCompanionHeading: "Bi shawarar har sai hikima ta samu lokacin aiki.",
    decisionCompanionSub: "Ƙwaƙwalwa, shawara, jira, fitar da takaitawa, da alamar shirye-shirye mai nutsuwa don manyan zaɓuɓɓuka.",
    ruleOfLife: "Ka'idar Rayuwa",
    ruleOfLifePrincipleSingular: "ka'ida",
    ruleOfLifePrinciplePlural: "ka'idoji",
    ruleOfLifeSummary: "Ka'idojin mutum suna nan kusa, amma a rufe suke har sai kana tsara shawara.",
    decisionPracticeLine: "Sanya sunan abin da ya isa ga wannan kakar",
    nextInReflect: "Na gaba a Tunani",
    reflectNextTitleDefault: "Fara da jimla guda daya mai gaskiya",
    reflectNextTitleActive: "Kammala tunanin da ke gabanka",
    reflectNextBodyDefault: "Yi amfani da Duba hikima don duba gaggawa, ko rubuta abin da kake lura da shi game da kuɗi, aiki, tsoro, karimci ko sauri.",
    reflectNextBodyActive: "Ajiye abin da kake lura da shi yayin da fahimtar ke sabo.",
    reflectIntro: "Yi amfani da Duba hikima don rage saurin shawara, sannan ka ajiye abin da ka lura da shi kafin lokacin ya wuce.",
    wisdomCheck: "Duba hikima",
    wisdomCheckSummaryDefault: "Buɗe shi idan shawara na bukatar dubawa cikin sauri.",
    wisdomCheckUrgency: "an lura da gaggawa",
    wisdomCheckSlower: "matsin lamba ya yi sanyi",
    decisionScan: "Duba shawara",
    reflectionHistory: "Tarihin tunani",
    savedReflectionSingular: "tunanin da aka ajiye",
    savedReflectionPlural: "tunanin da aka ajiye",
    reflectionHistorySummaryActive: "Buɗe tunanin da suka gabata idan kana son duba ci gaba.",
    reflectionHistorySummaryDefault: "Tunanin da suka gabata za su tsaya a nan bayan an ajiye su.",
    nextInLibrary: "Na gaba a Laburare",
    libraryNextTitleDefault: "Nemi jigon hikima guda",
    libraryNextBodySearch: "Buɗe nassin Littafi Mai Tsarki don karanta mahallin ayar da dalilin muhimmancinsa a nan.",
    libraryTryPrefix: "Gwada",
    libraryDescription: "Tarin hikima da aka tace tare da bayanan amfani masu la'akari da harshe da alamun fassarar yankin jama'a.",
    fullWisdomLibrary: "Cikakken laburaren hikima",
    moreAnchors: "ƙarin ginshiƙai",
  },
};

function runtimeCopyFor(language: LanguageCode): RuntimePanelCopy {
  return runtimePanelCopy[language] ?? runtimePanelCopy.en;
}

function localizedModeProfile(mode: Mode, language: LanguageCode): DisplayModeProfile {
  return {
    ...sharedLocalizedModeProfile(mode, language),
    ...localizedModeProfiles[language]?.[mode],
    displayLabel: localizedModeLabel(mode, language),
  };
}

function localizedModeCards(language: LanguageCode, translations: TranslationData): ModeCard[] {
  return modes.map((item) => {
    const profile = localizedModeProfile(item.label, language);
    const modeKey = item.label.toLowerCase();
    const translatedFocus = getTranslation(translations, `modes.${modeKey}.focus`, profile.focus);
    const focusString = Array.isArray(translatedFocus) ? translatedFocus.join(', ') : translatedFocus;
    
    return {
      ...item,
      copy: focusString,
      displayLabel: profile.displayLabel,
    };
  });
}

const modeTerms: Record<Mode, string[]> = {
  Money: ["money", "debt", "stewardship", "contentment", "saving", "investing", "risk", "wealth"],
  Work: ["work", "job", "career", "business", "counsel", "diligence", "cost", "planning"],
  Purpose: ["purpose", "identity", "direction", "discernment", "peace", "anxiety", "motives", "calling"],
  Generosity: ["generosity", "give", "giving", "charity", "willing", "sustainable", "stewardship", "guilt"],
  Life: ["life", "home", "family", "relationships", "habits", "rest", "health", "everyday"],
};

const defaultMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "aletheia",
    text:
      "Bring a real decision, pressure, or money question. I will answer from the curated wisdom library, with emotional clarity and no financial promises.",
    sources: [wisdomEntries[0], wisdomEntries[2]],
  },
];

function searchWisdom(query: string, mode: Mode, limit = 3, preferences: UserPreferences = defaultPreferences) {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return wisdomEntries
    .map((entry) => {
      const localizedEntry = localizedWisdomEntry(entry, preferences);
      const profile = localizedModeProfile(mode, preferences.language);
      const haystack = [
        localizedEntry.scripture,
        localizedEntry.principle,
        localizedEntry.context,
        localizedEntry.application,
        localizedEntry.theme,
        ...localizedEntry.keywords,
        ...localizedEntry.emotions,
        profile.focus,
        profile.lens,
      ]
        .join(" ")
        .toLowerCase();
      const themeScore = words.includes(localizedEntry.theme.toLowerCase()) ? 8 : 0;
      const exactKeywordScore = localizedEntry.keywords.reduce(
        (score, keyword) => score + (words.includes(keyword) ? 6 : 0),
        0
      );
      const keywordScore = words.reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0);
      const modeScore = modeTerms[mode].reduce(
        (score, term) => score + (haystack.includes(term) ? 2 : 0),
        haystack.includes(mode.toLowerCase()) ? 2 : 0
      );
      return { entry: localizedEntry, score: themeScore + exactKeywordScore + keywordScore + modeScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((result) => result.entry);
}

function composeResponse(question: string, mode: Mode, preferences: UserPreferences = defaultPreferences) {
  const sources = searchWisdom(question, mode, 3, preferences);
  const primary = sources[0] ?? localizedWisdomEntry(wisdomEntries[0], preferences);
  const secondary = sources[1] ?? localizedWisdomEntry(wisdomEntries[2], preferences);

  return {
    sources,
    text: [
      "Reflection",
      `It makes sense to bring care to this. Your question touches ${primary.theme.toLowerCase()}, and it deserves more than a rushed answer or a fear-driven reaction.`,
      "",
      "Biblical Wisdom",
      `${primary.scripture} points toward this principle: ${primary.principle} ${secondary.scripture} adds a second guardrail: ${secondary.principle}`,
      "",
      "Practical Perspective",
      `${primary.application} This is wisdom support, not financial, legal, or investment advice, so any high-stakes decision should also be reviewed with qualified counsel.`,
      "",
      "Reflection Questions",
      `1. ${primary.questions[0]}`,
      `2. ${primary.questions[1]}`,
      `3. ${secondary.questions[0]}`,
      "",
      "Gentle Reminder",
      "You do not need to force clarity through urgency. Slow, honest, well-counseled obedience is often the most fruitful path.",
    ].join("\n"),
  };
}

const STATIC_TODAY_DAY_NUMBER = 0;

function todayWisdom(dayNumber = STATIC_TODAY_DAY_NUMBER) {
  const index = dayNumber % wisdomEntries.length;
  return wisdomEntries[index];
}

type PersonalizedCarryPhraseKey =
  | "financialPressure"
  | "burnout"
  | "isolation"
  | "urgency"
  | "values"
  | "futureState"
  | "activeDecision"
  | FocusIntentionKey;

const personalizedCarryPhrases: Record<PersonalizedCarryPhraseKey, Record<LanguageCode, string>> = {
  financialPressure: {
    en: "Count the cost before pressure gets a vote.",
    es: "Cuenta el costo antes de que la presión vote.",
    fr: "Compte le coût avant que la pression ait voix au chapitre.",
    pt: "Conte o custo antes que a pressão decida.",
    de: "Zähle die Kosten, bevor der Druck mitentscheidet.",
    yo: "Ka iye owo naa ṣaaju ki titẹ to sọ ipinnu.",
    ig: "Gụọ ụgwọ tupu nrụgide ekwuo okwu.",
    ha: "Lissafa farashin kafin matsin lamba ya yi tasiri.",
  },
  burnout: {
    en: "Let sustainability shape the next faithful step.",
    es: "Deja que lo sostenible moldee el siguiente paso fiel.",
    fr: "Laisse la durabilité façonner la prochaine étape fidèle.",
    pt: "Deixe a sustentabilidade moldar o próximo passo fiel.",
    de: "Lass Tragfähigkeit den nächsten treuen Schritt formen.",
    yo: "Jẹ́ kí ohun tó le tẹ̀síwájú ṣe amọ̀nà ìgbésẹ̀ olóòtítọ́ tó kàn.",
    ig: "Ka ịdịgide mee ka nzọụkwụ kwesịrị ntụkwasị obi sochirinụ dịrị.",
    ha: "Bari dorewa ta tsara mataki na aminci na gaba.",
  },
  isolation: {
    en: "Invite one trusted voice before carrying this alone.",
    es: "Invita una voz confiable antes de cargar esto solo.",
    fr: "Invite une voix de confiance avant de porter cela seul.",
    pt: "Convide uma voz confiável antes de carregar isso sozinho.",
    de: "Lade eine vertraute Stimme ein, bevor du das allein trägst.",
    yo: "Pe ohùn ẹni tí o gbẹ́kẹ̀lé kí o tó gbe e nikan.",
    ig: "Kpọọ olu ị tụkwasịrị obi tupu ibu nke a naanị gị.",
    ha: "Gayyaci murya da ka amince da ita kafin ka ɗauki wannan kai kaɗai.",
  },
  urgency: {
    en: "Separate courage from pressure before you move.",
    es: "Distingue el valor de la presión antes de moverte.",
    fr: "Distingue le courage de la pression avant d'agir.",
    pt: "Separe coragem de pressão antes de agir.",
    de: "Trenne Mut von Druck, bevor du handelst.",
    yo: "Ya ìgboyà sọ́tọ̀ kúrò ní titẹ ṣaaju ki o to gbe igbese.",
    ig: "Kewaa obi ike na nrụgide tupu ịga n'ihu.",
    ha: "Raba jarumtaka da matsin lamba kafin ka motsa.",
  },
  values: {
    en: "Let enough, integrity, and your boundaries stay in the room.",
    es: "Deja que lo suficiente, la integridad y tus límites permanezcan presentes.",
    fr: "Laisse le suffisant, l'intégrité et tes limites rester présents.",
    pt: "Deixe o suficiente, a integridade e seus limites permanecerem presentes.",
    de: "Lass Genug, Integrität und deine Grenzen im Raum bleiben.",
    yo: "Jẹ́ kí ohun tó tó, ìwà pípé, àti ààlà rẹ wà níbẹ̀.",
    ig: "Ka ihe zuru ezu, ezi omume, na oke gị nọgide ebe ahụ.",
    ha: "Bari isasshe, gaskiya, da iyakokinka su kasance a wurin.",
  },
  futureState: {
    en: "Choose the step that agrees with the future you named.",
    es: "Elige el paso que coincide con el futuro que nombraste.",
    fr: "Choisis l'étape qui s'accorde avec l'avenir que tu as nommé.",
    pt: "Escolha o passo que combina com o futuro que você nomeou.",
    de: "Wähle den Schritt, der zu der Zukunft passt, die du benannt hast.",
    yo: "Yan ìgbésẹ̀ tó bá ọjọ́ iwájú tí o darukọ mu.",
    ig: "Họrọ nzọụkwụ kwekọrọ n'ọdịnihu ị kpọrọ aha.",
    ha: "Zaɓi matakin da ya dace da makomar da ka ambata.",
  },
  activeDecision: {
    en: "Keep the next step small enough for peace to stay visible.",
    es: "Mantén el siguiente paso lo bastante pequeño para que la paz siga visible.",
    fr: "Garde la prochaine étape assez petite pour que la paix reste visible.",
    pt: "Mantenha o próximo passo pequeno o bastante para que a paz permaneça visível.",
    de: "Halte den nächsten Schritt klein genug, damit Frieden sichtbar bleibt.",
    yo: "Jẹ́ kí ìgbésẹ̀ tó kàn kere tó kí àlàáfíà lè hàn.",
    ig: "Mee ka nzọụkwụ ọzọ dị nta nke udo ga-anọgide pụta ìhè.",
    ha: "Ka mataki na gaba ya kasance ƙanana har salama ta kasance a fili.",
  },
  reduce_anxiety: {
    en: "Practice steady trust before you rehearse the fear.",
    es: "Practica una confianza firme antes de ensayar el temor.",
    fr: "Pratique une confiance stable avant de répéter la peur.",
    pt: "Pratique confiança firme antes de ensaiar o medo.",
    de: "Übe ruhiges Vertrauen, bevor du die Angst wiederholst.",
    yo: "Ṣe ìgbẹ́kẹ̀lé tó dúró ṣinṣin ṣaaju ki o to tún ibẹru ṣe.",
    ig: "Mụta ntụkwasị obi kwụsie ike tupu ịmegharị egwu.",
    ha: "Yi aikin dogaro mai ƙarfi kafin ka maimaita tsoro.",
  },
  improve_stewardship: {
    en: "Treat today's choice as something entrusted, not owned.",
    es: "Trata la elección de hoy como algo confiado, no poseído.",
    fr: "Traite le choix d'aujourd'hui comme confié, non possédé.",
    pt: "Trate a escolha de hoje como algo confiado, não possuído.",
    de: "Behandle die heutige Wahl als anvertraut, nicht besessen.",
    yo: "Wo yiyan oni bi ohun ti a fi le ọ lọwọ, kii ṣe ohun ini rẹ.",
    ig: "Were nhọrọ taa dị ka ihe e nyere gị, ọ bụghị nke i ji nwe.",
    ha: "Dauki zaɓin yau a matsayin abin da aka ba ka amana, ba mallaka ba.",
  },
  wait_with_peace: {
    en: "Let waiting protect what urgency would rush.",
    es: "Deja que la espera proteja lo que la urgencia apresuraría.",
    fr: "Laisse l'attente protéger ce que l'urgence précipiterait.",
    pt: "Deixe a espera proteger o que a urgência apressaria.",
    de: "Lass Warten schützen, was Dringlichkeit übereilen würde.",
    yo: "Jẹ́ kí ìdúró dáàbò bo ohun tí ìkánjú fẹ́ yara.",
    ig: "Ka ichere chebe ihe ngwa ngwa ga-eme ọsọ ọsọ.",
    ha: "Bari jira ya kare abin da gaggawa za ta hanzarta.",
  },
  build_consistency: {
    en: "Choose one repeatable step over a dramatic push.",
    es: "Elige un paso repetible antes que un impulso dramático.",
    fr: "Choisis une étape répétable plutôt qu'un élan spectaculaire.",
    pt: "Escolha um passo repetível em vez de um impulso dramático.",
    de: "Wähle einen wiederholbaren Schritt statt eines dramatischen Schubs.",
    yo: "Yan ìgbésẹ̀ kan tí o le tún ṣe ju ìfọkànsìn ńlá lọ.",
    ig: "Họrọ otu nzọụkwụ a pụrụ imegharị kama mkpali dị egwu.",
    ha: "Zaɓi mataki guda da za a iya maimaitawa maimakon turawa mai girma.",
  },
  seek_counsel: {
    en: "Ask a wise voice before the pressure gets louder.",
    es: "Pregunta a una voz sabia antes de que la presión suba.",
    fr: "Demande à une voix sage avant que la pression augmente.",
    pt: "Pergunte a uma voz sábia antes que a pressão aumente.",
    de: "Frage eine weise Stimme, bevor der Druck lauter wird.",
    yo: "Beere lọwọ ohun ọlọgbọn ṣaaju ki titẹ to pọ si.",
    ig: "Jụọ olu maara ihe tupu nrụgide abawanye.",
    ha: "Tambayi murya mai hikima kafin matsin lamba ya ƙaru.",
  },
};

function personalizedCarryPhrase({
  language,
  manualContext,
  focusIntentions,
  activeDecision,
}: {
  language: LanguageCode;
  manualContext: ManualContextProfile;
  focusIntentions: string[];
  activeDecision: WisdomDecision | null;
}) {
  const signals = manualContextCounselSignals(manualContext).join(" ").toLowerCase();
  if (signals.includes("financial pressure")) {
    return personalizedCarryPhrases.financialPressure[language];
  }
  if (signals.includes("burnout")) {
    return personalizedCarryPhrases.burnout[language];
  }
  if (signals.includes("isolation")) {
    return personalizedCarryPhrases.isolation[language];
  }
  if (signals.includes("urgency")) {
    return personalizedCarryPhrases.urgency[language];
  }
  if (signals.includes("values")) {
    return personalizedCarryPhrases.values[language];
  }
  if (signals.includes("future-state")) {
    return personalizedCarryPhrases.futureState[language];
  }

  if (activeDecision) {
    return personalizedCarryPhrases.activeDecision[language];
  }

  const focusKey = focusIntentions.find((value): value is FocusIntentionKey =>
    focusIntentionLibrary.some((item) => item.key === value)
  );
  return focusKey ? personalizedCarryPhrases[focusKey][language] : "";
}

function localTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function storedCarryToday(): CarryToday | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CARRY_TODAY_STORAGE_KEY) || "null") as CarryToday | null;
    return parsed?.date === localTodayKey() && parsed.phrase ? parsed : null;
  } catch {
    return null;
  }
}

function currentWeekKey(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return localTodayKeyFromDate(start);
}

function localTodayKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function storedScriptureMemory(): ScriptureMemory | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SCRIPTURE_MEMORY_STORAGE_KEY) || "null") as ScriptureMemory | null;
    return parsed?.scripture && parsed.weekKey === currentWeekKey() ? parsed : null;
  } catch {
    return null;
  }
}

function buildDecisionBlessing(decision: WisdomDecision, ts: (key: string, fallback?: string) => string) {
  return [
    ts('labels.decisionBlessingOpening', 'Lord, help me choose without fear, greed, haste, or pressure.'),
    ts('labels.decisionBlessingClarity', 'Give me clarity about what is true, courage for the faithful step, and humility to seek wise counsel.'),
    ts('labels.decisionBlessingDecision', 'For this decision: {decision}').replace("{decision}", decision.title),
    ts('labels.decisionBlessingEnding', 'Let peace, integrity, and love guide what I do next. Amen.'),
  ].join("\n\n");
}

function companionCardFromDaily({
  daily,
  entry,
  pattern,
  language,
  manualContext,
  focusIntentions,
  activeDecision,
}: {
  daily: ReturnType<typeof localizedDailyWisdom>;
  entry: WisdomEntry;
  pattern: string;
  language: LanguageCode;
  manualContext: ManualContextProfile;
  focusIntentions: string[];
  activeDecision: WisdomDecision | null;
}): TodayCompanionCard {
  const theme = daily.theme || entry.theme;
  const questions: Partial<Record<LanguageCode, string>> = {
    en: entry.questions[0] || "Where is wisdom asking me to slow down today?",
    de: "Wo lädt Weisheit mich heute ein, langsamer zu werden?",
    yo: "Níbo ni ọgbọ́n ń pè mí láti dákẹ́ lónìí?",
    ig: "Ebee ka amamihe na-akpọ m ka m belata ọsọ taa?",
    ha: "Ina hikima ke kiran ni in rage gaggawa yau?",
    fr: "Où la sagesse m'invite-t-elle à ralentir aujourd'hui ?",
    es: "¿Dónde me invita la sabiduría a bajar el ritmo hoy?",
    pt: "Onde a sabedoria me convida a desacelerar hoje?",
  };
  const shortQuestion = questions[language] ?? questions.en!;
  const openings: Partial<Record<LanguageCode, string>> = {
    en: "You do not have to decide from pressure today.",
    de: "Du musst heute nicht aus Druck heraus entscheiden.",
    yo: "O ko ni lati pinnu lati inu titẹ loni.",
    ig: "I gaghị eme mkpebi site n'ike nrụgide taa.",
    ha: "Ba lallai ne ka yanke shawara daga matsin lamba yau ba.",
    fr: "Tu n'as pas besoin de décider sous pression aujourd'hui.",
    es: "No tienes que decidir desde la presión hoy.",
    pt: "Hoje, você não precisa decidir sob pressão.",
  };
  const personalizedPhrase = personalizedCarryPhrase({ language, manualContext, focusIntentions, activeDecision });
  const carryPhrase = personalizedPhrase || (language === "en" && pattern && pattern.length < 72
      ? `Notice ${pattern.toLowerCase()} before it drives the decision.`
      : daily.practice.replace(/\.$/, "."));
  return {
    title: theme,
    opening: openings[language] ?? openings.en!,
    principle: daily.principle,
    practice: daily.practice,
    question: shortQuestion,
    carryPhrase,
  };
}

export function AletheiaApp() {
  const [activeView, setActiveViewState] = useState<View>("companion");
  const [homeSection, setHomeSectionState] = useState<HomeSection>("today");
  
  // Wrapper to persist active view and track navigation usage.
  const setActiveView = useCallback((view: View, source = "navigation") => {
    setActiveViewState((current) => {
      if (current !== view) {
        trackClientEvent("app_view_changed", { from_view: current, to_view: view, source });
      }
      return view;
    });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("aletheia-active-view", view);
    }
  }, []);

  const setHomeSection = useCallback((section: HomeSection, source = "home_tabs") => {
    setHomeSectionState((current) => {
      if (current !== section) {
        trackClientEvent("home_section_changed", { from_section: current, to_section: section, source });
      }
      return section;
    });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("aletheia-home-section", section);
    }
  }, []);
  
  const [mode, setMode] = useState<Mode>("Money");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [librarySearch, setLibrarySearch] = useState("");
  const [decision, setDecision] = useState("");
  const [emotion, setEmotion] = useState("uncertain");
  const [timeframe, setTimeframe] = useState("Long-term");
  const [journalTitle, setJournalTitle] = useState("");
  const [journalBody, setJournalBody] = useState("");
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [gratitudeEntries, setGratitudeEntries] = useState<GratitudeEntry[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [googleAuthAvailable, setGoogleAuthAvailable] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [preferencesStatus, setPreferencesStatus] = useState("");
  const [manualContext, setManualContext] = useState<ManualContextProfile>(defaultManualContext);
  const [manualContextStatus, setManualContextStatus] = useState("Manual context is private and optional.");
  const [clientStateRestored, setClientStateRestored] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("classic");
  const theme = themeColors[resolvedTheme];
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingConcern, setOnboardingConcern] = useState("");
  const [onboardingTone, setOnboardingTone] = useState("gentle");
  const [faithFamiliarity, setFaithFamiliarity] = useState("familiar");
  const [onboardingPrivacyLevel, setOnboardingPrivacyLevel] = useState("minimal");
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscriptPreview, setVoiceTranscriptPreview] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechPaused, setSpeechPaused] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(0);
  const [readingLabel, setReadingLabel] = useState("Aletheia reading");
  const [carryToday, setCarryToday] = useState<CarryToday | null>(null);
  const [scriptureMemory, setScriptureMemory] = useState<ScriptureMemory | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [voiceRecognition, setVoiceRecognition] = useState<{ stop: () => void } | null>(null);
  const [selectedScripture, setSelectedScripture] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Checking your sign-in status...");
  const [workflowNotice, setWorkflowNotice] = useState<WorkflowNoticeState | null>(null);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showReportIssueModal, setShowReportIssueModal] = useState(false);
  const [accountActionBusy, setAccountActionBusy] = useState<"export" | "delete" | "report" | null>(null);
  const [notificationStatus, setNotificationStatus] = useState("Checking notification support...");
  const [notificationAccountEnabled, setNotificationAccountEnabled] = useState(false);
  const [notificationDeviceSubscribed, setNotificationDeviceSubscribed] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsConfigured, setNotificationsConfigured] = useState(false);
  const [isRefreshingForUpdate, setIsRefreshingForUpdate] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationTiming, setNotificationTiming] = useState<NotificationTiming>(DEFAULT_NOTIFICATION_TIMING);
  const [wisdomDecisions, setWisdomDecisions] = useState<WisdomDecision[]>([]);
  const [decisionEvents, setDecisionEvents] = useState<DecisionEvent[]>([]);
  const [timelineInsight, setTimelineInsight] = useState<TimelineInsight>({
    activeCount: 0,
    daysDiscerning: 0,
    patterns: [],
    gentleObservation: runtimeCopyFor(defaultPreferences.language).timelineReady,
  });
  const [counselContacts, setCounselContacts] = useState<CounselContact[]>([]);
  const [rulesOfLife, setRulesOfLife] = useState<RuleOfLife[]>([]);
  const [decisionTitle, setDecisionTitle] = useState("");
  const [decisionPressure, setDecisionPressure] = useState("");
  const [decisionEmotion, setDecisionEmotion] = useState("uncertain");
  const [focusIntentions, setFocusIntentions] = useState<string[]>([]);
  const [counselName, setCounselName] = useState("");
  const [counselRole, setCounselRole] = useState("mentor");
  const [counselAvatarUrl, setCounselAvatarUrl] = useState("");
  const [counselContactValue, setCounselContactValue] = useState("");
  const [counselCanViewSummaries, setCounselCanViewSummaries] = useState(true);
  const [counselCanComment, setCounselCanComment] = useState(false);
  const [counselCanReceiveCheckins, setCounselCanReceiveCheckins] = useState(false);
  const [latestCounselInvite, setLatestCounselInvite] = useState<{ name: string; url: string } | null>(null);
  const [counselInviteToken, setCounselInviteToken] = useState<string | null>(null);
  const [counselInvitePreview, setCounselInvitePreview] = useState<CounselInvitePreview | null>(null);
  const [counselInviteStatus, setCounselInviteStatus] = useState("");
  const [counselRemovalPrompt, setCounselRemovalPrompt] = useState<CounselRemovalConfirmationState | null>(null);
  const [isRemovingCounselContact, setIsRemovingCounselContact] = useState(false);
  const [currentLocalDayNumber, setCurrentLocalDayNumber] = useState<number | null>(null);
  const [currentLocalHour, setCurrentLocalHour] = useState<number | null>(null);
  
  const [counselSummaryDraft, setCounselSummaryDraftState] = useState<CounselSummaryDraft | null>(null);
  
  // Wrapper function that persists to localStorage
  const setCounselSummaryDraft = (value: CounselSummaryDraft | null) => {
    setCounselSummaryDraftState(value);
    if (typeof window !== "undefined") {
      if (value) {
        window.localStorage.setItem("aletheia-counsel-summary-draft", JSON.stringify(value));
      } else {
        window.localStorage.removeItem("aletheia-counsel-summary-draft");
      }
    }
  };
  
  const [answerFocusId, setAnswerFocusId] = useState<string | null>(null);
  const [ruleText, setRuleText] = useState("");
  const [pendingNotificationFocus, setPendingNotificationFocus] = useState(false);
  const [pendingGratitudeNotificationFocus, setPendingGratitudeNotificationFocus] = useState(false);
  const [pendingDecisionNotificationFocus, setPendingDecisionNotificationFocus] = useState<string | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      try {
        const saved = JSON.parse(window.localStorage.getItem(FOCUS_INTENTIONS_STORAGE_KEY) || "[]") as string[];
        if (Array.isArray(saved)) {
          setFocusIntentions(saved.filter((value) => typeof value === "string").slice(0, 3));
        }
      } catch {
        // Personalization defaults to empty when stored value is invalid.
      }
    }, 0);
  }, []);
  
  // Load translations synchronously using useMemo to ensure they're available immediately
  const translations = useMemo(() => {
    return loadTranslationsWithFallbackSync(preferences.language);
  }, [preferences.language]);
  
  const workspaceRef = useRef<HTMLElement | null>(null);
  const bottomNavRef = useRef<HTMLDivElement | null>(null);
  const updateRefreshTimeoutRef = useRef<number | null>(null);
  const notificationFocusHandledRef = useRef(false);

  // Hydration-safe restore of client-only persisted state.
  useEffect(() => {
    const restoreId = window.requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const shouldHonorNotificationFocus = params.get("source") === "notification";
      setPreferences(storedPreferences());
      setManualContext(storedManualContext());
      setThemePreference(storedThemePreference());
      setShowOnboarding(shouldShowOnboarding());
      setCarryToday(storedCarryToday());
      setScriptureMemory(storedScriptureMemory());
      setGratitudeEntries(storedGratitudeEntries());
      setSelectedVoice(storedVoicePreference());
      setNotificationTiming(storedNotificationTiming());
      setCurrentLocalDayNumber(Math.floor(Date.now() / 86400000));
      setCurrentLocalHour(new Date().getHours());
      setClientStateRestored(true);

      try {
        const storedView = window.localStorage.getItem("aletheia-active-view") as View | null;
        const storedHomeSection = window.localStorage.getItem("aletheia-home-section") as HomeSection | null;
        if (!shouldHonorNotificationFocus && storedView && ["companion", "decisions", "reflect", "library", "account"].includes(storedView)) {
          setActiveViewState(storedView);
        }
        if (!shouldHonorNotificationFocus && storedHomeSection && ["today", "ask"].includes(storedHomeSection)) {
          setHomeSectionState(storedHomeSection);
        }
      } catch {
        // Keep deterministic defaults if storage is unavailable.
      }
    });
    return () => window.cancelAnimationFrame(restoreId);
  }, []);

  const translationHelpers = useMemo(() => {
    const t = (key: string, fallback?: string): string | string[] => getTranslation(translations, key, fallback || key);
    const ts = (key: string, fallback?: string): string => {
      const result = t(key, fallback || key);
      return Array.isArray(result) ? result.join(', ') : result;
    };
    return { t, ts };
  }, [translations]);
  const { ts } = translationHelpers;

  // Build ui object from translations for backward compatibility
  const buildUiFromTranslations = (trans: TranslationData) => {
    const languageFallback = {
      ...uiText.en,
      ...(uiText[preferences.language] ?? {}),
    };
    if (!trans || Object.keys(trans).length === 0) {
      // Return fallback to uiText.en if translations not loaded yet
      return languageFallback;
    }
    
    // Helper to ensure string type
    const getString = (key: string, fallback: string): string => {
      const result = getTranslation(trans, key, fallback);
      return Array.isArray(result) ? result.join(', ') : result;
    };
    
    return {
      nav: {
        companion: getString('nav.companion', 'Home'),
        decisions: getString('nav.decisions', 'Decisions'),
        reflect: getString('nav.reflect', 'Reflect'),
        library: getString('nav.library', 'Library'),
        account: getString('nav.account', 'Account'),
      },
      decideShort: getString('decideShort', 'Decide'),
      guardrails: getString('guardrails', 'Guardrails'),
      guardrailItems: (getTranslation(trans, 'guardrailItems', '') || []) as string[],
      wisdomMode: getString('wisdomMode', 'Wisdom mode'),
      currentLens: getString('currentLens', 'Current lens'),
      offline: getString('offline', 'Offline'),
      languageSelect: getString('languageSelect', 'Change language'),
      bibleSelect: getString('bibleSelect', 'Change Bible translation'),
      account: getString('account', 'Account'),
      askTitle: getString('askTitle', 'Ask Aletheia'),
      askIntro: getString('askIntro', 'Start with one honest question.'),
      yourQuestion: getString('yourQuestion', 'Your question'),
      askButton: getString('askButton', 'Ask'),
      startHere: getString('startHere', 'Start here'),
      ready: getString('ready', 'Ready'),
      whatModeFor: getString('whatModeFor', 'What this mode is for'),
      deepChecks: getString('deepChecks', 'Deep checks'),
      blindSpots: getString('blindSpots', 'Blind spots'),
      maturitySignals: getString('maturitySignals', 'Maturity signals'),
      modeGuidance: getString('modeGuidance', 'Mode guidance'),
      change: getString('change', languageFallback.change ?? 'Change'),
      showDetails: getString('showDetails', 'Show details'),
      hideDetails: getString('hideDetails', 'Hide details'),
      modeGuidancePreview: getString('modeGuidancePreview', ''),
      trustLayer: getString('trustLayer', 'Trust layer'),
      preferencesTitle: getString('preferencesTitle', 'Language and region'),
      language: getString('language', 'Language'),
      region: getString('region', 'Region'),
      bible: getString('bible', 'Bible'),
      voiceControls: getString('voiceControls', 'Voice controls'),
      available: getString('available', 'Available'),
      englishFallback: getString('englishFallback', 'English fallback'),
      greetingMorning: getString('greetingMorning', languageFallback.greetingMorning ?? 'Good morning'),
      greetingAfternoon: getString('greetingAfternoon', languageFallback.greetingAfternoon ?? 'Good afternoon'),
      greetingEvening: getString('greetingEvening', languageFallback.greetingEvening ?? 'Good evening'),
      greetingFallback: getString('greetingFallback', languageFallback.greetingFallback ?? 'Welcome back'),
      greetingIntent: getString('greetingIntent', languageFallback.greetingIntent ?? "Let's choose one wise next step today."),
      personalizedPriority: getString('personalizedPriority', 'Personalized priority'),
      whatNext: getString('whatNext', 'What should I do next?'),
      whatNextBody: getString('whatNextBody', ''),
      personalizationNudgeTitle: getString('personalizationNudgeTitle', languageFallback.personalizationNudgeTitle ?? 'Want more personal counsel?'),
      personalizationNudgeBody: getString('personalizationNudgeBody', languageFallback.personalizationNudgeBody ?? 'Add one detail about money, work, or rhythm.'),
      continueDecision: getString('continueDecision', 'Continue this decision'),
      askOneQuestion: getString('askOneQuestion', 'Ask one question'),
      askOneQuestionBody: getString('askOneQuestionBody', ''),
      askNewQuestion: getString('askNewQuestion', 'Ask a new question'),
      askNewQuestionBody: getString('askNewQuestionBody', ''),
      reflectToday: getString('reflectToday', 'Reflect on today'),
      reviewPattern: getString('reviewPattern', 'Review a pattern'),
      enableNotifications: getString('enableNotifications', 'Enable notifications'),
      enableSync: getString('enableSync', 'Enable sync'),
      notificationPromptBody: getString('notificationPromptBody', ''),
      syncDevicesBody: getString('syncDevicesBody', ''),
      startDecision: getString('startDecision', 'Start a decision'),
      startDecisionBody: getString('startDecisionBody', ''),
      tinyPractice: getString('tinyPractice', 'Tiny practice'),
      todaysCompanion: getString('todaysCompanion', languageFallback.todaysCompanion ?? "Today's companion"),
      todayPrefix: getString('todayPrefix', languageFallback.todayPrefix ?? 'Today'),
      wisdomPrinciple: getString('wisdomPrinciple', languageFallback.wisdomPrinciple ?? 'Wisdom principle'),
      reflectionQuestion: getString('reflectionQuestion', languageFallback.reflectionQuestion ?? 'Question'),
      carryThisToday: getString('carryThisToday', languageFallback.carryThisToday ?? 'Carry this today'),
      carryWithMe: getString('carryWithMe', languageFallback.carryWithMe ?? 'Carry with me'),
      askAboutThis: getString('askAboutThis', languageFallback.askAboutThis ?? 'Ask about this'),
      saveToRuleOfLife: getString('saveToRuleOfLife', languageFallback.saveToRuleOfLife ?? 'Save to Rule of Life'),
      carryingToday: getString('carryingToday', languageFallback.carryingToday ?? 'Carrying today'),
      currentCounsel: getString('currentCounsel', 'Current counsel'),
      modeShapesCounsel: getString('modeShapesCounsel', 'mode is shaping this counsel around'),
      trackThisDecision: getString('trackThisDecision', 'Track this decision'),
      saveAsReflection: getString('saveAsReflection', 'Save as reflection'),
      createCounselSummary: getString('createCounselSummary', 'Create counsel summary'),
      goDeeper: getString('goDeeper', 'Go deeper'),
      waitThreeDays: getString('waitThreeDays', 'Wait 3 days'),
      shareAnswerPrompt: getString('shareAnswerPrompt', ''),
      sharePrivacyNote: getString('sharePrivacyNote', ''),
      shareAletheia: getString('shareAletheia', 'Share Aletheia'),
      feedbackQuestion: getString('feedbackQuestion', 'Was this counsel useful?'),
      feedbackHelpful: getString('feedbackHelpful', 'Helpful'),
      feedbackMildlyHelpful: getString('feedbackMildlyHelpful', 'Mildly helpful'),
      feedbackTooVague: getString('feedbackTooVague', 'Too vague'),
      feedbackTooPreachy: getString('feedbackTooPreachy', 'Too preachy'),
      feedbackNotRelevant: getString('feedbackNotRelevant', 'Not relevant'),
      badgesFormation: getString('badgesFormation', 'Badges / Formation'),
      firstReflectionSaved: getString('firstReflectionSaved', 'First reflection saved'),
      firstDecisionTracked: getString('firstDecisionTracked', 'First decision tracked'),
      soughtCounsel: getString('soughtCounsel', 'Sought counsel'),
      waitingModeUsed: getString('waitingModeUsed', 'Waiting mode used'),
      ruleOfLifeCreated: getString('ruleOfLifeCreated', 'Rule of life created'),
      notificationsEnabled: getString('notificationsEnabled', 'Notifications enabled'),
      sevenDaysPractice: getString('sevenDaysPractice', '7 days of wisdom practice'),
      formationNote: getString('formationNote', ''),
      milestoneShareTitle: getString('milestoneShareTitle', ''),
      milestoneShareBody: getString('milestoneShareBody', ''),
      welcomeCounsel: getString('welcomeCounsel', ''),
      trustScriptureBody: getString('trustScriptureBody', ''),
      trustBoundaryBody: getString('trustBoundaryBody', ''),
      trustMemoryBody: getString('trustMemoryBody', ''),
      trustConnectedDataBody: getString('trustConnectedDataBody', ''),
      accountNextEyebrow: getString('accountNextEyebrow', languageFallback.accountNextEyebrow ?? 'Next in Account'),
      accountNextReviewSyncFormation: getString('accountNextReviewSyncFormation', languageFallback.accountNextReviewSyncFormation ?? 'Review sync and formation'),
      accountNextSignInPortable: getString('accountNextSignInPortable', languageFallback.accountNextSignInPortable ?? 'Sign in to make Aletheia portable'),
      accountNextActiveBody: getString('accountNextActiveBody', languageFallback.accountNextActiveBody ?? ''),
      accountNextSyncBody: getString('accountNextSyncBody', languageFallback.accountNextSyncBody ?? ''),
      accountNextGuestBody: getString('accountNextGuestBody', languageFallback.accountNextGuestBody ?? ''),
      accountManageSummary: getString('accountManageSummary', languageFallback.accountManageSummary ?? ''),
      accountSignedInAs: getString('accountSignedInAs', languageFallback.accountSignedInAs ?? 'Signed in as'),
      accountSignInOrGuest: getString('accountSignInOrGuest', languageFallback.accountSignInOrGuest ?? 'Sign in or continue as guest'),
      accountSyncActive: getString('accountSyncActive', languageFallback.accountSyncActive ?? 'Sync active.'),
      accountNotificationsNotEnabled: getString('accountNotificationsNotEnabled', languageFallback.accountNotificationsNotEnabled ?? 'Notifications not enabled yet.'),
      accountGuestSummary: getString('accountGuestSummary', languageFallback.accountGuestSummary ?? ''),
      accountPreferencesEyebrow: getString('accountPreferencesEyebrow', languageFallback.accountPreferencesEyebrow ?? 'Preferences'),
      accountPreferencesSummary: getString('accountPreferencesSummary', languageFallback.accountPreferencesSummary ?? ''),
      accountContextActive: getString('accountContextActive', languageFallback.accountContextActive ?? 'Context active'),
      accountContextPaused: getString('accountContextPaused', languageFallback.accountContextPaused ?? 'Context paused'),
      accountArea: getString('accountArea', languageFallback.accountArea ?? 'area'),
      accountAreas: getString('accountAreas', languageFallback.accountAreas ?? 'areas'),
      accountAdded: getString('accountAdded', languageFallback.accountAdded ?? 'added'),
      accountManualContextSummary: getString('accountManualContextSummary', languageFallback.accountManualContextSummary ?? ''),
      accountDailyWisdomEnabled: getString('accountDailyWisdomEnabled', languageFallback.accountDailyWisdomEnabled ?? 'Daily wisdom enabled'),
      accountNotificationsSummaryEnabled: getString('accountNotificationsSummaryEnabled', languageFallback.accountNotificationsSummaryEnabled ?? ''),
      accountNotificationsSummaryDisabled: getString('accountNotificationsSummaryDisabled', languageFallback.accountNotificationsSummaryDisabled ?? ''),
      accountInstallTitle: getString('accountInstallTitle', languageFallback.accountInstallTitle ?? 'Add Aletheia to your home screen'),
      accountInstallSummary: getString('accountInstallSummary', languageFallback.accountInstallSummary ?? ''),
      accountInstallEyebrow: getString('accountInstallEyebrow', languageFallback.accountInstallEyebrow ?? 'Install Aletheia'),
      accountInviteTitle: getString('accountInviteTitle', languageFallback.accountInviteTitle ?? 'Invite someone privately'),
      accountInviteSummary: getString('accountInviteSummary', languageFallback.accountInviteSummary ?? ''),
      accountInviteEyebrow: getString('accountInviteEyebrow', languageFallback.accountInviteEyebrow ?? 'Invite Someone'),
      accountHistoryConversations: getString('accountHistoryConversations', languageFallback.accountHistoryConversations ?? 'conversations'),
      accountHistoryDecisions: getString('accountHistoryDecisions', languageFallback.accountHistoryDecisions ?? 'decisions'),
      accountHistoryReflections: getString('accountHistoryReflections', languageFallback.accountHistoryReflections ?? 'reflections'),
      accountHistorySummary: getString('accountHistorySummary', languageFallback.accountHistorySummary ?? ''),
      accountStatConversations: getString('accountStatConversations', languageFallback.accountStatConversations ?? 'Conversations'),
      accountStatDecisions: getString('accountStatDecisions', languageFallback.accountStatDecisions ?? 'Decisions'),
      accountStatJournalEntries: getString('accountStatJournalEntries', languageFallback.accountStatJournalEntries ?? 'Journal entries'),
      accountHistoryEmptyBody: getString('accountHistoryEmptyBody', languageFallback.accountHistoryEmptyBody ?? ''),
      accountTrustPostureTitle: getString('accountTrustPostureTitle', languageFallback.accountTrustPostureTitle ?? 'Trust and privacy posture'),
      accountTrustPostureSummary: getString('accountTrustPostureSummary', languageFallback.accountTrustPostureSummary ?? ''),
      accountBoundariesTitle: getString('accountBoundariesTitle', languageFallback.accountBoundariesTitle ?? "Aletheia's guardrails"),
      accountBoundariesSummary: getString('accountBoundariesSummary', languageFallback.accountBoundariesSummary ?? ''),
      accountBoundariesBody: getString('accountBoundariesBody', languageFallback.accountBoundariesBody ?? ''),
      accountFormationPrefix: getString('accountFormationPrefix', languageFallback.accountFormationPrefix ?? 'Formation'),
      accountQuietMilestoneSingular: getString('accountQuietMilestoneSingular', languageFallback.accountQuietMilestoneSingular ?? 'quiet milestone'),
      accountQuietMilestonePlural: getString('accountQuietMilestonePlural', languageFallback.accountQuietMilestonePlural ?? 'quiet milestones'),
      accountFormationSummary: getString('accountFormationSummary', languageFallback.accountFormationSummary ?? ''),
    };
  };

  const announceWorkflow = useCallback((title: string, body: string, tone: WorkflowTone = "info", action?: { label: string; onClick: () => void }) => {
    setWorkflowNotice({
      id: crypto.randomUUID(),
      title,
      body,
      tone,
      action,
    });
  }, []);

  function getFriendlyAuthError(params: URLSearchParams) {
    const oauthReason = params.get("reason");
    const authError = params.get("error");

    if (oauthReason === "missing_profile") {
      return "Google sign-in did not return your email address. Please try again or use email below instead.";
    }
    if (oauthReason === "server_error") {
      return "Google sign-in reached Aletheia, but we could not finish it right now. Please try again in a moment or use email below instead.";
    }

    switch (authError) {
      case "OAuthSignin":
      case "OAuthCallbackError":
      case "CallbackRouteError":
        return "Google sign-in could not be completed. Please try again. If it keeps failing, use email below instead.";
      case "AccessDenied":
        return "Google sign-in was canceled before it finished. You can try again or use email below instead.";
      case "Configuration":
        return "Google sign-in is temporarily unavailable. You can still continue with email below.";
      default:
        return params.get("auth") === "oauth_failed"
          ? "Google sign-in did not finish. Please try again or use email below instead."
          : null;
    }
  }

  function getAuthFailureAnalytics(params: URLSearchParams): AnalyticsMetadata | null {
    const oauthReason = params.get("reason");
    const authError = params.get("error");

    if (oauthReason === "missing_profile") {
      return {
        method: "google",
        flow: "oauth_complete",
        category: "provider_failure",
        reason: "missing_profile",
      };
    }
    if (oauthReason === "server_error") {
      return {
        method: "google",
        flow: "oauth_complete",
        category: "backend_fault",
        reason: "server_error",
      };
    }

    switch (authError) {
      case "AccessDenied":
        return {
          method: "google",
          flow: "oauth_start",
          category: "canceled",
          reason: "access_denied",
        };
      case "OAuthSignin":
      case "OAuthCallbackError":
      case "CallbackRouteError":
        return {
          method: "google",
          flow: "oauth_start",
          category: "provider_failure",
          reason: authError,
        };
      case "Configuration":
        return {
          method: "google",
          flow: "oauth_start",
          category: "backend_fault",
          reason: "configuration",
        };
      default:
        return params.get("auth") === "oauth_failed"
          ? {
              method: "google",
              flow: "oauth_complete",
              category: "provider_failure",
              reason: oauthReason ?? authError ?? "oauth_failed",
            }
          : null;
    }
  }

  // Load and prioritize browser voices that are least likely to sound harsh.
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const currentLanguage = languages[preferences.language];
      const finalVoices = curatedVoicesForLanguage(voices, currentLanguage.speech);
      
      setAvailableVoices(finalVoices);

      setSelectedVoice((current) => {
        if (!current) {
          return null;
        }
        return finalVoices.some((voice) => voice.voiceURI === current) ? current : null;
      });
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [preferences.language]);

  useEffect(() => {
    try {
      if (selectedVoice) {
        window.localStorage.setItem(VOICE_STORAGE_KEY, selectedVoice);
      } else {
        window.localStorage.removeItem(VOICE_STORAGE_KEY);
      }
    } catch {
      // Voice selection can still work for this session.
    }
  }, [selectedVoice]);

  useEffect(() => {
    if (!workflowNotice) {
      return;
    }
    const timeout = window.setTimeout(() => setWorkflowNotice(null), 6500);
    return () => window.clearTimeout(timeout);
  }, [workflowNotice]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const next = themePreference === "system" ? (media.matches ? "dark" : "classic") : themePreference;
      setResolvedTheme(next);
      document.documentElement.dataset.theme = next;
    };

    applyTheme();
    media.addEventListener("change", applyTheme);
    if (clientStateRestored) {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
      } catch {
        // Ignore storage errors.
      }
    }
    return () => media.removeEventListener("change", applyTheme);
  }, [clientStateRestored, themePreference]);

  useLayoutEffect(() => {
    const updateViewportChrome = () => {
      const viewport = window.visualViewport;
      const viewportWidth = Math.max(0, Math.round(viewport?.width ?? window.innerWidth));
      const viewportHeight = Math.max(0, Math.round(viewport?.height ?? window.innerHeight));
      const shortestSide = Math.min(viewportWidth, viewportHeight);
      const isTablet = viewportWidth >= 768 || shortestSide >= 768;
      const isFoldClass = !isTablet && viewportWidth >= 600 && viewportWidth < 768 && viewportHeight >= 700;
      const isSmallPhone = !isTablet && !isFoldClass && viewportWidth <= 390;
      const isLargePhone = !isTablet && !isFoldClass && viewportWidth >= 400;
      const deviceFamily = isTablet ? "tablet" : isFoldClass ? "fold" : isSmallPhone ? "small-phone" : isLargePhone ? "large-phone" : "regular-phone";
      const bottomReserve = isTablet ? 0 : Math.round(Math.max(8, Math.min(14, shortestSide * 0.018)));
      const bottomNavGap = isTablet ? 0 : isSmallPhone ? 0.42 : isFoldClass ? 0.42 : isLargePhone ? 0.38 : 0.42;
      const bottomNavPadY = isTablet ? 0 : isSmallPhone ? 0.56 : isFoldClass ? 0.52 : isLargePhone ? 0.48 : 0.52;
      const bottomNavPadX = isTablet ? 0 : isSmallPhone ? 0.72 : isFoldClass ? 0.72 : isLargePhone ? 0.68 : 0.7;
      const bottomNavRadius = isTablet ? 0 : isSmallPhone ? 1.45 : isFoldClass ? 1.55 : isLargePhone ? 1.6 : 1.5;
      const bottomNavWidth = isFoldClass ? "min(calc(100vw - 1rem), 38rem)" : "min(calc(100vw - 1rem), 28rem)";
      const noticeBottomOffset = isTablet
        ? 0
        : isSmallPhone
          ? 11
          : isFoldClass
            ? 11.25
            : isLargePhone
              ? 11.5
              : 10.5;

      document.documentElement.style.setProperty("--aletheia-bottom-reserve", `${bottomReserve}px`);
      document.documentElement.style.setProperty("--aletheia-bottom-nav-gap", `${bottomNavGap}`);
      document.documentElement.style.setProperty("--aletheia-bottom-nav-pad-y", `${bottomNavPadY}`);
      document.documentElement.style.setProperty("--aletheia-bottom-nav-pad-x", `${bottomNavPadX}`);
      document.documentElement.style.setProperty("--aletheia-bottom-nav-radius", `${bottomNavRadius}`);
      document.documentElement.style.setProperty("--aletheia-bottom-nav-width", bottomNavWidth);
      document.documentElement.style.setProperty("--aletheia-notice-bottom-offset", `${noticeBottomOffset}`);
      document.documentElement.dataset.deviceFamily = deviceFamily;
    };

    updateViewportChrome();
    window.addEventListener("resize", updateViewportChrome);
    window.addEventListener("orientationchange", updateViewportChrome);
    window.visualViewport?.addEventListener("resize", updateViewportChrome);
    return () => {
      window.removeEventListener("resize", updateViewportChrome);
      window.removeEventListener("orientationchange", updateViewportChrome);
      window.visualViewport?.removeEventListener("resize", updateViewportChrome);
    };
  }, []);

  useEffect(() => {
    if (notificationFocusHandledRef.current) {
      return;
    }
    if (!clientStateRestored) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("source") !== "notification") {
      return;
    }
    const focus = params.get("focus");
    const decisionId = params.get("decisionId");
    if (focus !== "today" && focus !== "reflect" && focus !== "gratitude" && focus !== "library" && !(focus === "decision" && decisionId)) {
      return;
    }

    notificationFocusHandledRef.current = true;
    window.requestAnimationFrame(() => {
      setShowOnboarding(false);
      if (focus === "decision" && decisionId) {
        setActiveView("decisions", "notification_click");
        setStatusMessage(ts('status.decisionReminderReady', "Your decision reminder is ready."));
        announceWorkflow(
          ts('notifications.decisionReminderReady', "Decision reminder ready"),
          ts('notifications.decisionReminderReadyBody', "Aletheia opened the decision this reminder is about."),
          "success"
        );
        setPendingDecisionNotificationFocus(decisionId);
      } else if (focus === "reflect") {
        setActiveView("reflect", "notification_click");
        setStatusMessage(ts('status.reflectionReminderReady', "Your reflection prompt is ready."));
        announceWorkflow(
          ts('notifications.reflectionReminderReady', "Reflection prompt ready"),
          ts('notifications.reflectionReminderReadyBody', "Aletheia opened Reflect so you can respond quietly."),
          "success"
        );
      } else if (focus === "gratitude") {
        setActiveView("reflect", "notification_click");
        setStatusMessage(ts('status.gratitudeReminderReady', "Your gratitude moment is ready."));
        announceWorkflow(
          ts('notifications.gratitudeReminderReady', "Gratitude moment ready"),
          ts('notifications.gratitudeReminderReadyBody', "Aletheia opened the Gratitude Lens so you can close the day with attention."),
          "success"
        );
        setPendingGratitudeNotificationFocus(true);
      } else if (focus === "library") {
        setActiveView("library", "notification_click");
        setStatusMessage(ts('status.libraryWisdomReady', "A wisdom anchor is ready."));
        announceWorkflow(
          ts('notifications.libraryWisdomReady', "Wisdom anchor ready"),
          ts('notifications.libraryWisdomReadyBody', "Aletheia opened the Library so you can read the scripture context."),
          "success"
        );
      } else {
        setActiveView("companion", "notification_click");
        setHomeSection("today", "notification_click");
        setStatusMessage(ts('status.todayWisdomReady', "Today's wisdom is ready."));
        announceWorkflow(ts('notifications.todayWisdomReady', "Today's wisdom is ready"), ts('notifications.todayWisdomReadyBody', 'Aletheia opened the daily companion card for you.'), "success");
        setPendingNotificationFocus(true);
      }
      window.history.replaceState({}, "", window.location.pathname);
    });
  }, [announceWorkflow, clientStateRestored, setActiveView, setHomeSection, ts]);

  useEffect(() => {
    if (!pendingGratitudeNotificationFocus || activeView !== "reflect" || showOnboarding) {
      return;
    }

    let settled = false;
    const focusGratitudeLens = () => {
      const target = document.getElementById("gratitude-lens-card");
      if (!target) {
        return false;
      }
      const topNav = document.querySelector(".app-top-nav");
      const topOffset = topNav instanceof HTMLElement ? topNav.getBoundingClientRect().height + 18 : 112;
      const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - topOffset);
      target.focus({ preventScroll: true });
      window.scrollTo({ top, behavior: "smooth" });
      return true;
    };

    const timers = [0, 180, 720, 1400, 2600, 3600, 5200].map((delay) =>
      window.setTimeout(() => {
        if (settled) {
          return;
        }
        const focused = focusGratitudeLens();
        if (focused && delay >= 1400) {
          settled = true;
          setPendingGratitudeNotificationFocus(false);
        }
      }, delay)
    );

    return () => {
      settled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activeView, pendingGratitudeNotificationFocus, showOnboarding]);

  useEffect(() => {
    if (!pendingNotificationFocus || activeView !== "companion" || showOnboarding) {
      return;
    }

    let settled = false;
    const focusTodayCard = () => {
      const target = document.getElementById("today-companion-card");
      if (!target) {
        return false;
      }
      const topNav = document.querySelector(".app-top-nav");
      const topOffset = topNav instanceof HTMLElement ? topNav.getBoundingClientRect().height + 18 : 112;
      const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - topOffset);
      target.focus({ preventScroll: true });
      window.scrollTo({ top, behavior: "smooth" });
      return true;
    };

    const timers = [0, 180, 720, 1400, 2600, 3600, 5200].map((delay) =>
      window.setTimeout(() => {
        if (settled) {
          return;
        }
        const focused = focusTodayCard();
        if (focused && delay >= 1400) {
          settled = true;
        }
      }, delay)
    );

    return () => {
      settled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activeView, pendingNotificationFocus, showOnboarding]);

  useEffect(() => {
    if (!pendingDecisionNotificationFocus || activeView !== "decisions" || showOnboarding) {
      return;
    }

    let settled = false;
    const focusDecisionCard = () => {
      const target = document.getElementById(`decision-card-${pendingDecisionNotificationFocus}`);
      if (!target) {
        return false;
      }
      const topNav = document.querySelector(".app-top-nav");
      const topOffset = topNav instanceof HTMLElement ? topNav.getBoundingClientRect().height + 18 : 112;
      const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - topOffset);
      target.focus({ preventScroll: true });
      window.scrollTo({ top, behavior: "smooth" });
      return true;
    };

    const timers = [0, 180, 720, 1400, 2600, 3600, 5200].map((delay) =>
      window.setTimeout(() => {
        if (settled) {
          return;
        }
        const focused = focusDecisionCard();
        if (focused && delay >= 1400) {
          settled = true;
        }
      }, delay)
    );

    return () => {
      settled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activeView, pendingDecisionNotificationFocus, showOnboarding]);

  useEffect(() => {
    const nav = bottomNavRef.current;
    if (!nav) {
      return;
    }

    const updateBottomNavSpace = () => {
      const navHeight = Math.max(0, Math.ceil(nav.getBoundingClientRect().height));
      const reservedSpace = navHeight > 0 ? navHeight + 18 : 112;
      document.documentElement.style.setProperty("--aletheia-bottom-nav-space", `${reservedSpace}px`);
    };

    updateBottomNavSpace();
    const resizeObserver = new ResizeObserver(updateBottomNavSpace);
    resizeObserver.observe(nav);
    window.addEventListener("resize", updateBottomNavSpace);
    window.addEventListener("orientationchange", updateBottomNavSpace);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateBottomNavSpace);
      window.removeEventListener("orientationchange", updateBottomNavSpace);
    };
  }, []);

  // Keep iOS installed-PWA chrome transparent so our themed header owns the safe area.
  useEffect(() => {
    const statusColor = resolvedTheme === "dark" ? "#0e1514" : theme.bgMain;
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', statusColor);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = statusColor;
      document.head.appendChild(meta);
    }
    const appleStatusBars = document.querySelectorAll('meta[name="apple-mobile-web-app-status-bar-style"]');
    appleStatusBars.forEach((tag, index) => {
      if (index === 0) {
        tag.setAttribute("content", "black-translucent");
      } else {
        tag.remove();
      }
    });
    
    // Update html and body background colors for PWA safe area
    document.documentElement.style.backgroundColor = statusColor;
    document.body.style.backgroundColor = statusColor;
    document.documentElement.style.setProperty("--aletheia-glass-top", theme.bgNav);
    document.documentElement.style.setProperty("--aletheia-glass-bottom", theme.bgNav);
    document.documentElement.style.setProperty("--aletheia-glass-edge", theme.bgNavBorder);
    document.documentElement.style.setProperty("--aletheia-primary", theme.primary);
  }, [resolvedTheme, theme.bgMain, theme.bgNav, theme.bgNavBorder, theme.primary]);

  const loadSignedInWorkspace = useCallback(async () => {
    const [chatResponse, journalResponse, notificationResponse, decisionsResponse, counselResponse, rulesResponse, preferencesResponse, contextResponse] = await Promise.all([
      fetch("/api/chat"),
      fetch("/api/journal"),
      fetch("/api/notifications/status"),
      fetch("/api/decisions"),
      fetch("/api/counsel"),
      fetch("/api/rules"),
      fetch("/api/preferences"),
      fetch("/api/context"),
    ]);
    const chatData = (await chatResponse.json()) as { messages?: ChatMessage[] };
    const journalData = (await journalResponse.json()) as { entries?: JournalEntry[] };
    const notificationData = (await notificationResponse.json()) as {
      configured?: boolean;
      enabled?: boolean;
      timingConfigured?: boolean;
      hasExplicitTiming?: boolean;
      preferredLocalHour?: number;
      preferredTimezone?: string;
      timezoneMode?: NotificationTiming["timezoneMode"];
      deliveryStrategy?: NotificationTiming["deliveryStrategy"];
    };
    const decisionsData = (await decisionsResponse.json()) as {
      decisions?: WisdomDecision[];
      events?: DecisionEvent[];
      insight?: TimelineInsight;
    };
    const counselData = (await counselResponse.json()) as { contacts?: CounselContact[] };
    const rulesData = (await rulesResponse.json()) as { rules?: RuleOfLife[] };
    const preferencesData = (await preferencesResponse.json()) as { preferences?: UserPreferences };
    const contextData = (await contextResponse.json()) as { context?: ManualContextProfile };

    setAuthStatus("signed-in");
    if (chatData.messages?.length) {
      setMessages([
        defaultMessages[0],
        ...chatData.messages.map<ChatMessage>((message) => ({
          ...message,
          role: message.role === "user" ? "user" : "aletheia",
        })),
      ]);
    }
    if (journalData.entries) {
      setJournalEntries(journalData.entries);
    }
    setWisdomDecisions(decisionsData.decisions ?? []);
    setDecisionEvents(decisionsData.events ?? []);
    if (decisionsData.insight) {
      setTimelineInsight(decisionsData.insight);
    }
    setCounselContacts(counselData.contacts ?? []);
    setRulesOfLife(rulesData.rules ?? []);
    if (preferencesData.preferences) {
      setPreferences(preferencesData.preferences);
      window.localStorage.setItem("aletheia_preferences", JSON.stringify(preferencesData.preferences));
    }
    if (contextData.context) {
      const nextContext = normalizeManualContext(contextData.context);
      setManualContext(nextContext);
      window.localStorage.setItem(MANUAL_CONTEXT_STORAGE_KEY, JSON.stringify(nextContext));
    }
    setNotificationsConfigured(Boolean(notificationData.configured));
    setNotificationsEnabled(Boolean(notificationData.enabled));
    if (notificationData.enabled || notificationData.timingConfigured) {
      const useDeviceTimezone = shouldFallbackToBrowserTimezone(
        notificationData.preferredTimezone,
        notificationData.hasExplicitTiming,
        notificationData.timezoneMode
      );
      const nextTiming = normalizeNotificationTiming({
        preferredLocalHour: notificationData.preferredLocalHour,
        preferredTimezone: useDeviceTimezone ? browserTimezone() : notificationData.preferredTimezone,
        timezoneMode: useDeviceTimezone ? "auto" : (notificationData.timezoneMode ?? "manual"),
        deliveryStrategy: notificationData.deliveryStrategy,
      });
      setNotificationTiming(nextTiming);
      persistNotificationTiming(nextTiming);
      if (useDeviceTimezone) {
        void saveNotificationTimingPreference(nextTiming).catch(() => undefined);
      }
    }
  }, []);

  useEffect(() => {
    const openedKey = "aletheia_app_opened_tracked";
    try {
      if (window.sessionStorage.getItem(openedKey)) {
        return;
      }
      window.sessionStorage.setItem(openedKey, "true");
    } catch {
      // If storage is unavailable, still record the open with an ephemeral ID.
    }
    trackClientEvent("app_opened", {
      standalone: window.matchMedia("(display-mode: standalone)").matches,
    });
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = () => {
      trackClientEvent("pwa_install_prompt_available", {
        standalone: window.matchMedia("(display-mode: standalone)").matches,
      });
    };
    const onAppInstalled = () => {
      trackClientEvent("app_installed", {
        standalone: true,
      });
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    try {
      const raw = window.sessionStorage.getItem(UPDATE_REFRESH_PENDING_KEY);
      if (!raw) {
        return;
      }

      window.sessionStorage.removeItem(UPDATE_REFRESH_PENDING_KEY);
      const parsed = JSON.parse(raw) as { cycleId?: string; shownAt?: number };
      const elapsedMs =
        typeof parsed.shownAt === "number" && Number.isFinite(parsed.shownAt)
          ? Math.max(0, Date.now() - parsed.shownAt)
          : null;

      trackClientEvent("app_update_refresh_landed", {
        cycle_id: parsed.cycleId ?? "unknown",
        elapsed_ms: elapsedMs,
        overlay_seen: true,
      });
    } catch {
      // Ignore malformed storage and continue app startup.
    }
  }, []);

  useEffect(() => {
    const supportsScrollRestoration = "scrollRestoration" in window.history;
    const previousScrollRestoration = supportsScrollRestoration ? window.history.scrollRestoration : null;
    if (supportsScrollRestoration) {
      window.history.scrollRestoration = "manual";
    }

    const resetToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    // Run after layout effects/paint to avoid hydration-time jumps.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resetToTop);
    });

    return () => {
      if (supportsScrollRestoration && previousScrollRestoration) {
        window.history.scrollRestoration = previousScrollRestoration;
      }
    };
  }, []);

  useEffect(() => {
    async function loadSession() {
      // authStatus is already "checking" from initial state - no need to set it again
      const [response, providersResponse] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/auth/providers").catch(() => null),
      ]);
      if (providersResponse?.ok) {
        const providers = (await providersResponse.json()) as Record<string, unknown>;
        setGoogleAuthAvailable(Boolean(providers.google));
      }
      const data = (await response.json()) as { user: User | null };
      const params = new URLSearchParams(window.location.search);

      if (data.user) {
        setUser(data.user);
        await loadSignedInWorkspace();
        const firstName = data.user.name?.split(" ")[0] || data.user.email.split("@")[0];
        const signedInMessage =
          params.get("auth") === "google_new"
            ? `Welcome to Aletheia, ${firstName}. Your account is ready and sync is active.`
            : params.get("auth") === "google_returning" || (data.user.loginCount ?? 0) > 1
              ? `Welcome back, ${firstName}. Your Aletheia memory is ready.`
              : "Signed in. Conversations and reflections sync to the database.";
        setStatusMessage(signedInMessage);
        setAuthNotice(params.get("auth")?.startsWith("google_") ? signedInMessage : "");
        try {
          window.localStorage.setItem("aletheia_onboarding_complete", "yes");
        } catch {
          // Signed-in users should not be blocked by local onboarding storage.
        }
        setShowOnboarding(false);
        if (params.get("view") === "account" || params.get("auth")?.startsWith("google_")) {
          setActiveView("account");
          window.history.replaceState({}, "", window.location.pathname);
        }
      } else {
        setUser(null);
        setAuthStatus("guest");
        const authFailureMessage = getFriendlyAuthError(params);
        const authFailureAnalytics = getAuthFailureAnalytics(params);
        setStatusMessage(authFailureMessage ?? ts('status.guestMode'));
        if (authFailureMessage) {
          if (authFailureAnalytics) {
            trackAuthFailure(authFailureAnalytics);
          }
          setAuthError(authFailureMessage);
          setAuthNotice("");
          setActiveView("account");
          setShowOnboarding(false);
          announceWorkflow(ts('notifications.signInNotFinish'), authFailureMessage, "error");
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
    }

    loadSession().catch(() => {
      setAuthStatus("guest");
      setStatusMessage(ts('status.backendUnavailable'));
    });
  }, [announceWorkflow, loadSignedInWorkspace, setActiveView, ts]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("counselInvite");
    if (!token) {
      return;
    }
    Promise.resolve().then(() => {
      setCounselInviteToken(token);
      setCounselInviteStatus(ts('status.loadingInvite'));
      fetch(`/api/counsel/invite/${encodeURIComponent(token)}`)
        .then(async (response) => {
          const data = (await response.json()) as CounselInvitePreview | { error?: string };
          if (!response.ok || !isCounselInvitePreview(data)) {
            throw new Error("error" in data ? data.error : "Invite could not be loaded.");
          }
          setCounselInvitePreview(data);
          setCounselInviteStatus("");
          window.history.replaceState({}, "", window.location.pathname);
        })
        .catch(() => {
          setCounselInviteStatus(ts('status.inviteCouldNotOpen'));
        });
    });
  }, [ts]);

  useEffect(() => {
    let swCleanup: (() => void) | null = null;
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        let refreshing = false;
        let visibilityListener: (() => void) | null = null;
        const handleControllerChange = () => {
          if (refreshing) {
            return;
          }
          refreshing = true;
          const cycleId = crypto.randomUUID();
          try {
            window.sessionStorage.setItem(
              UPDATE_REFRESH_PENDING_KEY,
              JSON.stringify({
                cycleId,
                shownAt: Date.now(),
              })
            );
          } catch {
            // Continue even if storage is unavailable.
          }

          trackClientEvent("app_update_overlay_shown", {
            cycle_id: cycleId,
            reload_delay_ms: 1300,
            trigger: "service_worker_controllerchange",
          });
          setIsRefreshingForUpdate(true);
          if (updateRefreshTimeoutRef.current !== null) {
            window.clearTimeout(updateRefreshTimeoutRef.current);
          }
          updateRefreshTimeoutRef.current = window.setTimeout(() => {
            window.location.reload();
          }, 1300);
        };

        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
        navigator.serviceWorker
          .register("/sw.js", { updateViaCache: "none" })
          .then((registration) => {
            registration.update().catch(() => undefined);
            registration.addEventListener("updatefound", () => {
              const worker = registration.installing;
              if (!worker) {
                return;
              }
              worker.addEventListener("statechange", () => {
                if (worker.state === "installed" && navigator.serviceWorker.controller) {
                  worker.postMessage({ type: "SKIP_WAITING" });
                }
              });
            });
            const updateWhenVisible = () => {
              if (document.visibilityState === "visible") {
                registration.update().catch(() => undefined);
              }
            };
            visibilityListener = updateWhenVisible;
            document.addEventListener("visibilitychange", updateWhenVisible);
          })
          .catch(() => undefined);
        swCleanup = () => {
          navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
          if (visibilityListener) {
            document.removeEventListener("visibilitychange", visibilityListener);
          }
        };
      } else {
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(registrations.map((registration) => registration.unregister()))
          )
          .catch(() => undefined);
      }
    }
    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      if (swCleanup) {
        swCleanup();
      }
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      if (updateRefreshTimeoutRef.current !== null) {
        window.clearTimeout(updateRefreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    async function loadNotificationStatus() {
      if ("Notification" in window) {
        setNotificationPermission(Notification.permission);
      } else {
        setNotificationStatus(ts('notifications.notificationsUnavailableBody'));
      }
      const response = await fetch("/api/notifications/status");
      const data = (await response.json()) as {
        configured?: boolean;
        enabled?: boolean;
        timingConfigured?: boolean;
        hasExplicitTiming?: boolean;
        preferredLocalHour?: number;
        preferredTimezone?: string;
        timezoneMode?: NotificationTiming["timezoneMode"];
        deliveryStrategy?: NotificationTiming["deliveryStrategy"];
      };
      const localSubscription =
        "serviceWorker" in navigator && "PushManager" in window
          ? await navigator.serviceWorker
              .getRegistration("/")
              .then((registration) => registration?.pushManager.getSubscription())
              .catch(() => null)
          : null;
      let localSubscriptionUsesCurrentKey = true;
      if (localSubscription && data.configured) {
        const keyResponse = await fetch("/api/notifications/key", { cache: "no-store" }).catch(() => null);
        const keyData = keyResponse?.ok ? ((await keyResponse.json()) as { publicKey?: string }) : {};
        localSubscriptionUsesCurrentKey = keyData.publicKey
          ? pushSubscriptionUsesPublicKey(localSubscription, keyData.publicKey)
          : true;
      }
      const accountEnabled = Boolean(data.enabled);
      const deviceSubscribed = Boolean(localSubscription && localSubscriptionUsesCurrentKey);
      setNotificationsConfigured(Boolean(data.configured));
      setNotificationAccountEnabled(accountEnabled);
      setNotificationDeviceSubscribed(deviceSubscribed);
      setNotificationsEnabled(Boolean(accountEnabled && deviceSubscribed));
      setNotificationTiming((current) => {
        const useDeviceTimezone = shouldFallbackToBrowserTimezone(
          data.preferredTimezone,
          data.hasExplicitTiming,
          data.timezoneMode
        );
        const nextTiming = data.enabled || data.timingConfigured
          ? normalizeNotificationTiming({
              preferredLocalHour: data.preferredLocalHour,
              preferredTimezone: useDeviceTimezone ? browserTimezone() : data.preferredTimezone,
              timezoneMode: useDeviceTimezone ? "auto" : (data.timezoneMode ?? "manual"),
              deliveryStrategy: data.deliveryStrategy,
            })
          : normalizeNotificationTiming({ ...current, preferredTimezone: browserTimezone(), timezoneMode: "auto" });
        persistNotificationTiming(nextTiming);
        return nextTiming;
      });
      if ((data.enabled || data.timingConfigured) && shouldFallbackToBrowserTimezone(data.preferredTimezone, data.hasExplicitTiming, data.timezoneMode)) {
        const fallbackTiming = normalizeNotificationTiming({
          preferredLocalHour: data.preferredLocalHour,
          preferredTimezone: browserTimezone(),
          timezoneMode: "auto",
          deliveryStrategy: data.deliveryStrategy,
        });
        void saveNotificationTimingPreference(fallbackTiming).catch(() => undefined);
      }
      if (!data.configured) {
        setNotificationStatus(ts('notifications.notificationsNotConfiguredBody'));
      } else if (!user) {
        setNotificationStatus(ts('notifications.signInRequiredBody'));
      } else if (accountEnabled && deviceSubscribed) {
        setNotificationStatus(ts('notifications.notificationsEnabledBody'));
      } else if (accountEnabled && localSubscription && !localSubscriptionUsesCurrentKey) {
        setNotificationStatus(ts('notifications.notificationsNeedReenableDevice', 'Notifications need to be re-enabled on this device.'));
      } else if (accountEnabled) {
        setNotificationStatus(ts('notifications.accountEnabledDeviceOff', 'Notifications are enabled on your account. Enable them on this device too.'));
      } else if (data.timingConfigured || Notification.permission === "granted") {
        setNotificationStatus(ts('notifications.notificationsNeedReenableDevice', 'Notifications need to be re-enabled on this device.'));
      } else {
        setNotificationStatus(ts('notifications.notificationsOptionalWhenReady', 'Get one quiet daily wisdom reflection on this device.'));
      }
    }

    loadNotificationStatus().catch(() =>
      setNotificationStatus(ts('notifications.notificationStatusLoadFailed', 'Notification status could not be loaded.'))
    );
  }, [ts, user]);

  useEffect(() => {
    if (notificationTiming.timezoneMode !== "auto") {
      return;
    }

    const syncDeviceTimezone = () => {
      if (document.visibilityState === "hidden") {
        return;
      }
      const detectedTimezone = browserTimezone();
      if (detectedTimezone === notificationTiming.preferredTimezone) {
        return;
      }
      void updateNotificationTiming({
        timezoneMode: "auto",
        preferredTimezone: detectedTimezone,
      });
    };

    window.addEventListener("focus", syncDeviceTimezone);
    document.addEventListener("visibilitychange", syncDeviceTimezone);

    return () => {
      window.removeEventListener("focus", syncDeviceTimezone);
      document.removeEventListener("visibilitychange", syncDeviceTimezone);
    };
  // updateNotificationTiming is intentionally omitted to avoid effect churn; this effect is scoped to timezone changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationTiming.timezoneMode, notificationTiming.preferredTimezone, notificationBusy, user]);

  // Detect newly accepted counsel invites
  useEffect(() => {
    if (counselContacts.length === 0 || wisdomDecisions.length === 0) {
      return;
    }
    
    const previousStatusJson = window.localStorage.getItem(COUNSEL_STATUS_TRACKING_KEY);
    const previousStatus: Record<string, string> = previousStatusJson ? JSON.parse(previousStatusJson) : {};
    
    const newlyAccepted = counselContacts.filter(
      (contact) => contact.inviteStatus === "accepted" && previousStatus[contact.id] === "pending"
    );
    
    // Update tracked statuses
    const currentStatus: Record<string, string> = {};
    counselContacts.forEach((contact) => {
      currentStatus[contact.id] = contact.inviteStatus;
    });
    window.localStorage.setItem(COUNSEL_STATUS_TRACKING_KEY, JSON.stringify(currentStatus));
    
    // Show notification for first newly accepted contact
    if (newlyAccepted.length > 0) {
      const contact = newlyAccepted[0];
      const decisionCount = wisdomDecisions.length;
      window.setTimeout(() => {
        announceWorkflow(
          `${contact.name} accepted your invite`,
          `${contact.name} can view summaries you share. You have ${decisionCount} ${decisionCount === 1 ? "decision" : "decisions"}.`,
          "success",
          {
            label: "Share decisions",
            onClick: () => {
              setActiveView("decisions");
            },
          }
        );
      }, 0);
    }
  }, [announceWorkflow, counselContacts, setActiveView, wisdomDecisions]);

  const filteredEntries = useMemo(() => {
    if (!librarySearch.trim()) {
      return wisdomEntries;
    }
    return searchWisdom(librarySearch, mode, wisdomEntries.length, preferences);
  }, [librarySearch, mode, preferences]);

  const dailyEntry = todayWisdom(currentLocalDayNumber ?? STATIC_TODAY_DAY_NUMBER);
  const dailyMode = modes.some((item) => item.label === dailyEntry.theme)
    ? (dailyEntry.theme as Mode)
    : mode;
  const daily = localizedDailyWisdom(dailyEntry, dailyMode, preferences);
  const activeMode = localizedModeProfile(mode, preferences.language);
  const activeModeCards = localizedModeCards(preferences.language, translations);
  const activeLanguage = languages[preferences.language];
  const copy = languageCopy[preferences.language] ?? languageCopy.en;
  const ui = buildUiFromTranslations(translations);
  const topBibleOptions = bibleTranslationOptionsForLanguage(preferences.language);
  const activeDecision = wisdomDecisions.find((item) => item.status !== "closed") ?? wisdomDecisions[0] ?? null;
  const todayPattern = timelineInsight.patterns[0] ?? activeMode.blindSpots[0];
  const todayCompanionCard = companionCardFromDaily({
    daily,
    entry: dailyEntry,
    pattern: todayPattern,
    language: preferences.language,
    manualContext,
    focusIntentions,
    activeDecision,
  });
  const weeklyReview = useMemo<WeeklyWisdomReview>(() => {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const since = weekStart.getTime();
    const countSince = <T extends { createdAt?: string }>(items: T[]) =>
      items.filter((item) => item.createdAt && new Date(item.createdAt).getTime() >= since).length;
    const questions = messages.filter((message) => message.role === "user").length;
    const reflections = countSince(journalEntries);
    const gratitudeMoments = countSince(gratitudeEntries);
    const decisions = countSince(wisdomDecisions);
    const pattern = todayPattern || daily.theme;
    const nextStep = activeDecision
      ? ts('labels.weeklyReviewDecisionStep', 'Revisit one active decision and ask what has changed.')
      : reflections || gratitudeMoments
        ? ts('labels.weeklyReviewReflectStep', 'Save one sentence from this week as a Rule of Life.')
        : ts('labels.weeklyReviewAskStep', 'Ask one honest question or save one quiet reflection.');
    return {
      questions,
      reflections,
      gratitudeMoments,
      decisions,
      pattern,
      scripture: dailyEntry.scripture,
      nextStep,
    };
  }, [activeDecision, daily.theme, dailyEntry.scripture, gratitudeEntries, journalEntries, messages, todayPattern, ts, wisdomDecisions]);

  // Get translated mode-specific content
  const modeKey = mode.toLowerCase();
  const translatedMode = {
    label: ts(`modes.${modeKey}.label`, activeMode.displayLabel ?? activeMode.label),
    intent: ts(`modes.${modeKey}.intent`, activeMode.intent),
    focus: ts(`modes.${modeKey}.focus`, activeMode.focus),
    useWhen: ts(`modes.${modeKey}.useWhen`, activeMode.useWhen),
    prompts: (() => {
      const translatedPrompts = getTranslation(translations, `modes.${modeKey}.prompts`, "");
      return Array.isArray(translatedPrompts) ? translatedPrompts.filter(Boolean) : activeMode.prompts;
    })(),
  };

  // Create modeProfile that merges activeMode with translated content
  const modeProfile: DisplayModeProfile = {
    ...activeMode,
    displayLabel: translatedMode.label,
    intent: translatedMode.intent,
    focus: translatedMode.focus,
    useWhen: translatedMode.useWhen,
    prompts: translatedMode.prompts,
  };
  const decisionResult = useMemo(() => {
    if (!decision.trim()) {
      return null;
    }
    const sources = searchWisdom(`${decision} ${emotion} ${timeframe}`, mode, 2, preferences);
    const hasUrgency = /today|now|urgent|must|quick|fomo|panic|afraid/i.test(decision);
    const mentionsCounsel = /counsel|advisor|mentor|spouse|pastor|friend|team/i.test(decision);
    const negatesCounsel =
      /not (talked|spoken|asked|met|shared|consulted)|no (counsel|advisor|mentor|input)|without (counsel|advice|input)/i.test(
        decision
      );
    const hasCounsel = mentionsCounsel && !negatesCounsel;
    const readiness = Math.max(36, Math.min(92, 62 + (hasCounsel ? 14 : 0) - (hasUrgency ? 16 : 0) + (timeframe === "Long-term" ? 8 : 0)));
    return { sources, readiness, hasUrgency, hasCounsel };
  }, [decision, emotion, timeframe, mode, preferences]);

  function handleModeChange(nextMode: Mode) {
    setMode(nextMode);
    trackClientEvent("wisdom_mode_selected", { mode: nextMode });
  }

  function updateThemePreference(nextTheme: ThemePreference) {
    setThemePreference(nextTheme);
    setPreferencesStatus(ts('notifications.themeAppliedAutomatically', 'Theme applied automatically.'));
    trackClientEvent("theme_changed", {
      theme: nextTheme,
      previous_theme: themePreference,
    });
  }

  function updateVoicePreference(voiceURI: string | null) {
    setSelectedVoice(voiceURI);
    setPreferencesStatus(
      voiceURI
        ? ts('labels.voiceApplied', 'Voice selected. Use Preview to hear it.')
        : ts('labels.deviceVoiceApplied', 'Device default selected. Use Preview to hear it.')
    );
  }

  function updateFocusIntentions(nextIntentions: string[]) {
    const cleanIntentions = nextIntentions
      .filter((value): value is FocusIntentionKey => focusIntentionLibrary.some((item) => item.key === value))
      .slice(0, 3);
    setFocusIntentions(cleanIntentions);
    try {
      window.localStorage.setItem(FOCUS_INTENTIONS_STORAGE_KEY, JSON.stringify(cleanIntentions));
    } catch {
      // Focus intentions remain in memory when local storage is unavailable.
    }
    trackClientEvent("focus_intentions_updated", {
      count: cleanIntentions.length,
      intentions: cleanIntentions.join(","),
    });
    setPreferencesStatus(ts('labels.focusIntentionsSaved', 'Focus intentions applied automatically.'));
  }

  function openScripture(scripture: string) {
    setSelectedScripture(scripture);
    trackClientEvent("scripture_opened", {
      scripture: canonicalScriptureReference(scripture),
      bibleTranslation: preferences.bibleTranslation,
      language: preferences.language,
      mode,
    });
  }

  function showView(view: View) {
    setActiveView(view, "show_view");
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }

  function scrollToSection(id: string, attempt = 0) {
    window.setTimeout(() => {
      const target = document.getElementById(id);
      if (target) {
        if (id === "today-companion-card") {
          target.focus({ preventScroll: true });
        }
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        if (id === "companion-ask") {
          window.setTimeout(() => {
            const input = document.getElementById("companion-question-input") as HTMLTextAreaElement | null;
            input?.focus();
            input?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 220);
        }
        return;
      }
      if (attempt < 6) {
        scrollToSection(id, attempt + 1);
      }
    }, attempt ? 140 : 90);
  }

  function completeOnboarding() {
    try {
      window.localStorage.setItem("aletheia_onboarding_complete", "yes");
      window.localStorage.setItem("aletheia_context_privacy_level", onboardingPrivacyLevel);
    } catch {
      // Onboarding can still close if storage is unavailable.
    }
    if (onboardingConcern.trim()) {
      setQuery(
        `I am seeking wisdom for this right now: ${onboardingConcern.trim()}. Please guide me with a ${onboardingTone} tone. My faith familiarity is ${faithFamiliarity}.`
      );
      setHomeSection("ask", "onboarding_completed");
      showView("companion");
      setStatusMessage(ts('status.startingQuestionReady'));
      announceWorkflow(ts('notifications.startingPathPrepared'), ts('notifications.startingPathPreparedBody'), "success");
    } else {
      announceWorkflow(ts('notifications.setupSaved'), ts('notifications.setupSavedBody'), "success");
    }
    trackClientEvent("onboarding_completed", {
      mode,
      language: preferences.language,
      region: preferences.region,
      bibleTranslation: preferences.bibleTranslation,
      tone: onboardingTone,
      faithFamiliarity,
      privacyLevel: onboardingPrivacyLevel,
      focusIntentions: focusIntentions.join(","),
      hasConcern: Boolean(onboardingConcern.trim()),
      ...analyticsQuestionMetadata(onboardingConcern, mode),
    });
    setShowOnboarding(false);
  }

  function continueDecisionFlow() {
    showView("decisions");
    announceWorkflow(ts('notifications.decisionCompanionOpened'), ts('notifications.decisionCompanionOpenedBody'), "info");
  }

  function reflectOnToday() {
    setJournalTitle(`${localizedWisdomThemeLabel(daily.theme, preferences.language)} ${ts('labels.reflection', 'reflection')}`);
    setJournalBody(`${daily.practice}\n\nWhat I notice today:\n`);
    showView("reflect");
    announceWorkflow(ts('notifications.reflectionPrepared'), ts('notifications.reflectionPreparedBody'), "success");
  }

  function reviewPatternFlow() {
    showView("decisions");
    announceWorkflow(ts('notifications.timelineOpened'), ts('notifications.timelineOpenedBody'), "info");
  }

  function openAccountFlow() {
    showView("account");
  }

  function askOneQuestionFlow() {
    setHomeSection("ask", "ask_one_question");
    showView("companion");
    setQuery((current) => current || modeProfile.prompts[0]);
    scrollToSection("companion-ask");
    announceWorkflow(ts('notifications.questionReady'), ts('notifications.questionReadyBody'), "success");
  }

  function carryCompanionCard(card: TodayCompanionCard) {
    const next = { date: localTodayKey(), phrase: card.carryPhrase };
    setCarryToday(next);
    try {
      window.localStorage.setItem(CARRY_TODAY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // The carry phrase can still stay visible for this session.
    }
    trackClientEvent("today_card_carried", {
      mode,
      topic: daily.theme.toLowerCase(),
      language: preferences.language,
    });
    announceWorkflow(
      ts('notifications.carriedForToday', 'Carried for today'),
      ts('notifications.carriedForTodayBody', '"{phrase}" is pinned on Home for today.').replace("{phrase}", card.carryPhrase),
      "success"
    );
  }

  async function shareWisdomPostcard(payload: WisdomPostcardPayload, placement: string) {
    try {
      const blob = await createWisdomPostcardBlob(
        {
          ...payload,
          footer: payload.footer || ts('labels.sharePrincipleNotStory', 'Share the principle, not my private story.'),
        },
        theme,
        preferences.language
      );
      const file = new File([blob], `aletheia-${payload.kind}-${localTodayKey()}.png`, { type: "image/png" });
      const canShareFile =
        typeof navigator !== "undefined" &&
        "share" in navigator &&
        "canShare" in navigator &&
        navigator.canShare({ files: [file] });

      if (canShareFile) {
        await navigator.share({
          title: payload.title,
          text: ts('labels.wisdomPostcardShareText', 'A quiet wisdom card from Aletheia.'),
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }

      trackClientEvent("wisdom_postcard_shared", {
        placement,
        kind: payload.kind,
        channel: canShareFile ? "native" : "download",
        language: preferences.language,
      });
      announceWorkflow(
        canShareFile ? ts('notifications.shareSheetOpened', 'Share sheet opened') : ts('notifications.wisdomPostcardDownloaded', 'Wisdom card downloaded'),
        ts('notifications.wisdomPostcardReadyBody', 'Only the principle card was exported. Your private story stayed private.'),
        "success"
      );
    } catch (error) {
      announceWorkflow(
        ts('notifications.wisdomPostcardFailed', 'Wisdom card could not be prepared'),
        error instanceof Error ? error.message : ts('notifications.wisdomPostcardFailedBody', 'Try again in a moment.'),
        "error"
      );
    }
  }

  function shareTodayWisdomPostcard(card: TodayCompanionCard) {
    void shareWisdomPostcard({
      kind: "daily",
      eyebrow: ts('labels.todaysCompanion', 'Today’s Companion'),
      title: `${ts('todayPrefix', 'Today')}: ${card.title}`,
      body: `${card.principle}\n\n${card.practice}\n\n${card.carryPhrase}`,
      sections: [
        { label: ts('labels.principle', 'Principle'), text: card.principle },
        { label: ts('labels.tinyPractice', 'Tiny practice'), text: card.practice },
        { label: ts('labels.carryThisToday', 'Carry this today'), text: card.carryPhrase },
      ],
    }, "today_companion_card");
  }

  function shareCarryPostcard() {
    const phrase = carryToday?.phrase || todayCompanionCard.carryPhrase;
    void shareWisdomPostcard({
      kind: "carry",
      eyebrow: ts('labels.carryCard', 'Carry Card'),
      title: phrase,
      body: ts('labels.carryCardBody', 'One sentence to carry with clarity today.'),
    }, "carry_card");
  }

  function saveScriptureMemory(scripture: string, principle: string) {
    const next: ScriptureMemory = {
      scripture,
      principle,
      savedAt: new Date().toISOString(),
      weekKey: currentWeekKey(),
    };
    setScriptureMemory(next);
    try {
      window.localStorage.setItem(SCRIPTURE_MEMORY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Memory remains active for this session if local storage is unavailable.
    }
    trackClientEvent("scripture_memory_saved", {
      scripture: canonicalScriptureReference(scripture),
      language: preferences.language,
      bibleTranslation: preferences.bibleTranslation,
    });
    announceWorkflow(
      ts('notifications.scriptureMemorySaved', 'Scripture carried for the week'),
      ts('notifications.scriptureMemorySavedBody', 'Aletheia will keep this wisdom visible as a gentle weekly anchor.'),
      "success"
    );
  }

  function clearScriptureMemory() {
    setScriptureMemory(null);
    try {
      window.localStorage.removeItem(SCRIPTURE_MEMORY_STORAGE_KEY);
    } catch {
      // The visible memory is cleared for this session even if storage is unavailable.
    }
    trackClientEvent("scripture_memory_cleared", {
      language: preferences.language,
      bibleTranslation: preferences.bibleTranslation,
    });
    announceWorkflow(
      ts('notifications.scriptureMemoryCleared', 'Scripture memory cleared'),
      ts('notifications.scriptureMemoryClearedBody', 'The weekly scripture anchor was removed from Home.'),
      "info"
    );
  }

  function shareScriptureMemoryCard(memory: ScriptureMemory) {
    const read = localizedScriptureRead(memory.scripture, preferences);
    const translationCode = read.translation as BibleTranslation;
    const translation = bibleTranslations[translationCode] ?? bibleTranslations[preferences.bibleTranslation];
    const translationLabel = `${translationCode} · ${translation.label}`;
    void shareWisdomPostcard({
      kind: "scripture",
      eyebrow: `${ts('labels.scriptureMemory', 'Scripture Memory')} · ${translationCode}`,
      title: memory.scripture,
      body: `${read.text}\n\n${translationLabel}\n\n${memory.principle}`,
      sections: [
        { label: ts('labels.scriptureQuotedText', 'Quoted text'), text: read.text },
        { label: ts('labels.bibleTranslation', 'Bible translation'), text: translationLabel },
        { label: ts('labels.principle', 'Principle'), text: memory.principle },
      ],
    }, "scripture_memory");
  }

  function askAboutCompanionCard(card: TodayCompanionCard) {
    setQuery(`${ts('labels.askAboutCompanionPromptPrefix', 'Help me reflect on this today:')} ${card.question}`);
    setHomeSection("ask", "today_companion_card");
    showView("companion");
    scrollToSection("companion-ask");
    announceWorkflow(ts('notifications.questionPrepared', 'Question prepared'), ts('notifications.questionPreparedBody', 'Aletheia placed today’s question in the Companion input.'), "success");
  }

  function reflectOnCompanionCard(card: TodayCompanionCard) {
    setJournalTitle(`Today: ${card.title}`);
    setJournalBody(
      `${card.opening}\n\nPrinciple:\n${card.principle}\n\nTiny practice:\n${card.practice}\n\nQuestion:\n${card.question}\n\nWhat I notice today:\n`
    );
    showView("reflect");
    announceWorkflow(ts('notifications.reflectionPrepared', 'Reflection prepared'), ts('notifications.reflectionPreparedBody', 'Today’s card is ready in Reflect.'), "success");
  }

  function saveCompanionRule(card: TodayCompanionCard) {
    setRuleText(card.carryPhrase);
    showView("decisions");
    announceWorkflow(ts('notifications.ruleDrafted', 'Rule drafted'), ts('notifications.ruleDraftedBody', 'The carry phrase is ready as a Rule of Life. Review and save it when it feels true.'), "success");
  }

  function startVoiceReflectionMode() {
    const script = ts(
      'labels.voiceReflectionScript',
      'Take one breath. Name the pressure. Name what is true. Name the next faithful step. You do not have to solve everything in this moment.'
    );
    speakText(script, ts('notifications.voiceReflectionStarted', 'Voice reflection started'), ts('labels.voiceReflectionMode', 'Voice Reflection Mode'));
    trackClientEvent("voice_reflection_started", { mode, language: preferences.language });
  }

  function shareReflectionPostcard(entry: JournalEntry) {
    void shareWisdomPostcard({
      kind: "reflection",
      eyebrow: ts('labels.reflectionJournal', 'Reflection Journal'),
      title: entry.title,
      body: cleanDisplayText(entry.body).slice(0, 520),
    }, "reflection_entry");
  }

  function shareAnswerPostcard(exchange: ConversationExchange) {
    const source = exchange.answer.sources?.[0];
    const modeLabel = localizedModeProfile(exchange.mode, preferences.language).displayLabel ?? exchange.mode;
    void shareWisdomPostcard({
      kind: "answer",
      eyebrow: ts('labels.wisdomPostcard', 'Wisdom Postcard'),
      title: source?.principle || modeLabel,
      body: source?.application || cleanDisplayText(exchange.answer.text).slice(0, 520),
    }, "current_answer");
  }

  function shareDecisionPostcard(decision: WisdomDecision, kind: "summary" | "blessing", text?: string) {
    const body = cleanDisplayText(text || decision.summary || decision.pressure).slice(0, 620);
    void shareWisdomPostcard({
      kind: kind === "blessing" ? "blessing" : "decision",
      eyebrow: kind === "blessing" ? ts('labels.decisionBlessing', 'Decision blessing') : ts('labels.decisionSummaryExport', 'Decision Summary Export'),
      title: decision.title,
      body,
    }, kind === "blessing" ? "decision_blessing" : "decision_summary");
  }

  async function shareAletheia(channel: ShareChannel, placement: string) {
    trackClientEvent("share_started", { channel, placement });
    trackClientEvent("app_shared", { channel, placement });
    if (channel === "native" && navigator.share) {
      try {
        await navigator.share({
          title: "Aletheia",
          text: ALETHEIA_SHARE_TEXT,
          url: ALETHEIA_SHARE_URL,
        });
        setStatusMessage(ts('status.shareSheetOpened'));
        announceWorkflow(ts('notifications.shareSheetOpened'), ts('notifications.shareSheetOpenedBody'), "success");
        return;
      } catch {
        setStatusMessage(ts('status.shareCancelled'));
        announceWorkflow(ts('notifications.shareCancelled'), ts('notifications.shareCancelledBody'), "info");
        return;
      }
    }

    if (channel === "copy" || channel === "native") {
      try {
        await navigator.clipboard.writeText(ALETHEIA_SHARE_URL);
        setStatusMessage(ts('status.linkCopied'));
        announceWorkflow(ts('notifications.linkCopied'), ts('notifications.linkCopiedBody'), "success");
      } catch {
        setStatusMessage(ALETHEIA_SHARE_URL);
        announceWorkflow(ts('notifications.copyUnavailable'), ts('notifications.copyUnavailableBody'), "warning");
      }
      return;
    }

    window.open(sharePlatformUrl(channel), "_blank", "noopener,noreferrer");
    setStatusMessage(ts('status.shareSheetOpened'));
    announceWorkflow(ts('notifications.shareSheetOpened'), ts('notifications.shareSheetOpenedBody'), "success");
  }

  function recordAnswerFeedback(value: string, placement: string) {
    const latestQuestion = [...messages].reverse().find((message) => message.role === "user")?.text ?? "";
    const feedbackMetadata = {
      value,
      placement,
      mode,
      language: preferences.language,
      ...analyticsQuestionMetadata(latestQuestion, mode),
    };
    if (!user) {
      trackClientEvent("answer_feedback", feedbackMetadata);
    }
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedbackMetadata),
    }).catch(() => undefined);
    setStatusMessage(ts('status.feedbackReceived'));
    if (value === "too_vague" && !manualContextHasContent(manualContext)) {
      announceWorkflow(
        ts('personalization.tooVagueTitle', 'Make future answers more specific'),
        ts('personalization.tooVagueBody', 'Add one detail about your current pressure, savings buffer, work rhythm, or support level.'),
        "info",
        { label: ts('personalization.addOneDetail', 'Add one detail'), onClick: openAccountFlow }
      );
      return;
    }
    announceWorkflow(ts('notifications.feedbackSaved'), ts('notifications.feedbackSavedBody'), "success");
  }

  function trackDecisionFromExchange(exchange: ConversationExchange) {
    const question = cleanDisplayText(exchange.question?.text ?? "");
    if (!question) {
      showView("decisions");
      return;
    }
    setDecisionTitle(question);
    setDecisionPressure(question);
    setDecisionEmotion("uncertain");
    trackClientEvent("answer_saved_or_acted", { action: "track_decision", mode, ...analyticsQuestionMetadata(question, mode) });
    showView("decisions");
    announceWorkflow(ts('notifications.decisionDraftStarted'), ts('notifications.decisionDraftStartedBody'), "success");
  }

  function draftReflectionFromExchange(exchange: ConversationExchange) {
    const question = cleanDisplayText(exchange.question?.text ?? "Recent counsel");
    const answer = cleanDisplayText(exchange.answer.text);
    setJournalTitle(`Reflection: ${question.slice(0, 70)}`);
    setJournalBody(`Question:\n${question}\n\nAletheia counsel:\n${answer}\n\nWhat I notice:\n`);
    trackClientEvent("answer_saved_or_acted", { action: "draft_reflection", mode, ...analyticsQuestionMetadata(question, mode) });
    showView("reflect");
    announceWorkflow(ts('notifications.reflectionDraftPrepared'), ts('notifications.reflectionDraftPreparedBody'), "success");
  }

  function draftCounselSummaryFromExchange(exchange: ConversationExchange) {
    // Check if a summary draft already exists for this exchange
    if (counselSummaryDraft) {
      trackClientEvent("counsel_summary_created", { mode, duplicate: true });
      announceWorkflow(
        ts('notifications.counselSummaryExists'),
        ts('notifications.counselSummaryExistsBody'),
        "info"
      );
      showView("decisions");
      scrollToSection("counsel-circle");
      return;
    }

    const question = cleanDisplayText(exchange.question?.text ?? "Recent counsel");
    const answer = cleanDisplayText(exchange.answer.text);
    const sources = (exchange.answer.sources ?? []).map((source) => ({
      ...source,
      modern_application: source.application,
      emotional_context: source.emotions,
    }));
    const signals = scoreDecision({
      pressure: `${question}\n\n${answer}`,
      emotion: "uncertain",
      counselSought: counselContacts.length > 0,
      costCounted: /cost|budget|risk|time|debt|income|expense/i.test(`${question} ${answer}`),
      alignmentClear: /values|calling|steward|wisdom|faithful|peace/i.test(`${question} ${answer}`),
      reversibleStep: /small|next step|test|wait|pause|experiment/i.test(answer),
      peaceOverUrgency: !/urgent|rush|panic|asap|immediately/i.test(question),
    });
    const body = buildDecisionSummary({
      title: question,
      mode,
      pressure: question,
      emotion: "uncertain",
      sources,
      signals,
      preferences,
    });
    setCounselSummaryDraft({
      id: crypto.randomUUID(),
      title: question,
      body,
      createdAt: new Date().toISOString(),
    });
    setDecisionTitle((current) => current || question);
    setDecisionPressure((current) => current || question);
    trackClientEvent("counsel_summary_created", { mode, ...analyticsQuestionMetadata(question, mode) });
    trackClientEvent("answer_saved_or_acted", { action: "create_counsel_summary", mode, ...analyticsQuestionMetadata(question, mode) });
    showView("decisions");
    scrollToSection("counsel-circle");
    announceWorkflow(ts('notifications.counselSummaryCreated'), ts('notifications.counselSummaryCreatedBody'), "success");
  }

  function goDeeperFromExchange(exchange: ConversationExchange) {
    const question = cleanDisplayText(exchange.question?.text ?? "this counsel");
    setQuery(
      `Please go deeper on this in a practical, understandable way. Add more context, examples, blind spots, scripture context, and one next faithful step: ${question}`
    );
    trackClientEvent("answer_followup_asked", { mode, kind: "go_deeper", ...analyticsQuestionMetadata(question, mode) });
    setHomeSection("ask", "answer_followup");
    showView("companion");
    scrollToSection("companion-ask");
    announceWorkflow(ts('notifications.deeperFollowUpReady'), ts('notifications.deeperFollowUpReadyBody'), "success");
  }

  function waitFromExchange(exchange: ConversationExchange) {
    const question = cleanDisplayText(exchange.question?.text ?? "");
    setDecisionTitle(question ? question : "Decision waiting period");
    setDecisionPressure(`${question}\n\nSuggested waiting rhythm: wait 3 days, seek counsel, count the cost, and revisit with less urgency.`);
    setDecisionEmotion("pressured");
    trackClientEvent("answer_saved_or_acted", { action: "waiting_mode", mode, ...analyticsQuestionMetadata(question, mode) });
    showView("decisions");
    announceWorkflow(ts('notifications.waitingRhythmPrepared'), ts('notifications.waitingRhythmPreparedBody'), "success");
  }

  async function updatePreferences(patch: Partial<UserPreferences>) {
    const next = { ...preferences, ...patch };
    if (patch.language && patch.language !== preferences.language) {
      trackClientEvent("language_changed", {
        language: patch.language,
        previous_language: preferences.language,
        bibleTranslation: next.bibleTranslation,
      });
    }
    if (patch.bibleTranslation && patch.bibleTranslation !== preferences.bibleTranslation) {
      trackClientEvent("bible_translation_changed", {
        bibleTranslation: patch.bibleTranslation,
        previous_bibleTranslation: preferences.bibleTranslation,
        language: next.language,
      });
    }
    setPreferences(next);
    setPreferencesStatus(user ? ts('notifications.preferencesSaving', 'Saving language settings...') : ts('notifications.preferencesSavedBody', 'Your language preferences are saved on this device.'));
    try {
      window.localStorage.setItem("aletheia_preferences", JSON.stringify(next));
    } catch {
      // Preferences still work in memory if local storage is unavailable.
    }

    // Load translations with the new preferences for notification
    const nextTranslations = loadTranslationsWithFallbackSync(next.language);
    const getNextTranslation = (key: string, fallback: string) => {
      const result = getTranslation(nextTranslations, key, fallback);
      return Array.isArray(result) ? result.join(', ') : result;
    };

    if (user) {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const saved = response.ok;
      setPreferencesStatus(saved ? ts('notifications.preferencesReady', 'Language settings are ready.') : ts('notifications.preferencesSavedLocallyBody', 'The app kept the setting on this device, but sync did not complete.'));
      announceWorkflow(
        saved ? getNextTranslation('notifications.preferencesSynced', 'Language settings synced') : getNextTranslation('notifications.preferencesSavedLocally', 'Language settings saved locally'),
        saved ? getNextTranslation('notifications.preferencesSyncedBody', 'Your language preferences are now synced across devices.') : getNextTranslation('notifications.preferencesSavedLocallyBody', 'Your language preferences are saved on this device.'),
        saved ? "success" : "warning"
      );
    } else {
      announceWorkflow(getNextTranslation('notifications.preferencesSaved', 'Language settings saved'), getNextTranslation('notifications.preferencesSavedBody', 'Your language preferences are saved on this device.'), "success");
    }
  }

  async function updateManualContext(patch: Partial<ManualContextProfile>) {
    const next = normalizeManualContext({ ...manualContext, ...patch });
    setManualContext(next);
    setManualContextStatus(user ? "Saving manual context..." : "Saved on this device. Sign in to sync it.");
    try {
      window.localStorage.setItem(MANUAL_CONTEXT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Manual context still works in memory if local storage is unavailable.
    }

    if (user) {
      try {
        const response = await fetch("/api/context", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        const data = (await response.json()) as { context?: ManualContextProfile; persisted?: boolean };
        if (data.context) {
          const savedContext = normalizeManualContext(data.context);
          setManualContext(savedContext);
          window.localStorage.setItem(MANUAL_CONTEXT_STORAGE_KEY, JSON.stringify(savedContext));
        }
        setManualContextStatus(data.persisted ? "Manual context is synced to your account." : "Manual context stayed on this device.");
        announceWorkflow(
          data.persisted ? ts('notifications.contextSynced') : ts('notifications.contextSavedLocally'),
          data.persisted
            ? ts('notifications.contextSyncedBody')
            : ts('notifications.contextSavedLocallyBodyAccount'),
          data.persisted ? "success" : "warning"
        );
      } catch {
        setManualContextStatus("Manual context stayed on this device, but sync did not complete.");
        announceWorkflow(ts('notifications.contextSavedLocally'), ts('notifications.contextSavedLocallyBodySync'), "warning");
      }
    } else {
      announceWorkflow(ts('notifications.contextSavedLocally'), ts('notifications.contextSavedLocallyBodySignIn'), "success");
    }
  }

  function clearLocalPersonalization() {
    setFocusIntentions([]);
    setSelectedVoice(null);
    setThemePreference("system");
    setNotificationTiming(DEFAULT_NOTIFICATION_TIMING);
    setCarryToday(null);
    setScriptureMemory(null);
    setManualContext(defaultManualContext);
    setCounselSummaryDraft(null);
    try {
      window.localStorage.removeItem(FOCUS_INTENTIONS_STORAGE_KEY);
      window.localStorage.removeItem(VOICE_STORAGE_KEY);
      window.localStorage.removeItem(THEME_STORAGE_KEY);
      window.localStorage.removeItem(NOTIFICATION_TIMING_STORAGE_KEY);
      window.localStorage.removeItem(CARRY_TODAY_STORAGE_KEY);
      window.localStorage.removeItem(SCRIPTURE_MEMORY_STORAGE_KEY);
      window.localStorage.removeItem(MANUAL_CONTEXT_STORAGE_KEY);
      window.localStorage.removeItem("aletheia-counsel-summary-draft");
    } catch {
      // In-memory reset still gives immediate safety.
    }
    announceWorkflow(ts('notifications.localSettingsCleared', 'Local settings cleared'), ts('notifications.localSettingsClearedBody', 'Theme, voice, local context, timing, and focus intentions were reset on this device.'), "success");
  }

  function clearLocalPrivateWorkspace() {
    setMessages(defaultMessages);
    setJournalEntries([]);
    setWisdomDecisions([]);
    setDecisionEvents([]);
    setCounselContacts([]);
    setRulesOfLife([]);
    setCounselSummaryDraft(null);
    try {
      window.localStorage.removeItem("aletheia-counsel-summary-draft");
    } catch {
      // In-memory reset is the privacy-critical part.
    }
  }

  function clearGuestWorkspace() {
    const confirmed = window.confirm(
      ts(
        'confirm.clearGuestWorkspace',
        'Clear local guest conversations, decisions, reflections, counsel contacts, and rules from this device? This does not delete any signed-in account data.'
      )
    );
    if (!confirmed) {
      return;
    }
    clearLocalPrivateWorkspace();
    announceWorkflow(
      ts('notifications.guestWorkspaceCleared', 'Guest workspace cleared'),
      ts('notifications.guestWorkspaceClearedBody', 'Local guest conversations, decisions, reflections, counsel contacts, and rules were cleared from this device.'),
      "success"
    );
  }

  async function exportAccountData() {
    if (!user) {
      announceWorkflow("Sign in required", "Sign in before exporting account data.", "warning");
      return;
    }
    setAccountActionBusy("export");
    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Export could not be prepared.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const filename = `aletheia-export-${new Date().toISOString().slice(0, 10)}.json`;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      announceWorkflow("Export ready", "Your Aletheia data export has been downloaded as JSON.", "success");
    } catch (error) {
      announceWorkflow("Export failed", error instanceof Error ? error.message : "Could not export your data.", "error");
    } finally {
      setAccountActionBusy(null);
    }
  }

  async function deleteAccount(confirmation: string) {
    if (!user) {
      announceWorkflow("Sign in required", "Sign in before deleting an account.", "warning");
      return;
    }
    setAccountActionBusy("delete");
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Account could not be deleted.");
      }
      await authSignOut({ redirect: false }).catch(() => undefined);
      setShowDeleteAccountModal(false);
      setUser(null);
      setAuthStatus("guest");
      setMessages(defaultMessages);
      setJournalEntries([]);
      setWisdomDecisions([]);
      setDecisionEvents([]);
      setCounselContacts([]);
      setRulesOfLife([]);
      setNotificationsEnabled(false);
      setNotificationAccountEnabled(false);
      setNotificationDeviceSubscribed(false);
      clearLocalPersonalization();
      setActiveView("companion", "account_deleted");
      announceWorkflow("Account deleted", "Your Aletheia account and synced private data have been deleted.", "success");
    } catch (error) {
      announceWorkflow("Delete failed", error instanceof Error ? error.message : "Could not delete your account.", "error");
    } finally {
      setAccountActionBusy(null);
    }
  }

  async function reportIssue(category: string, message: string) {
    setAccountActionBusy("report");
    try {
      const response = await fetch("/api/support/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message,
          path: window.location.pathname + window.location.search,
          appView: activeView,
          theme: resolvedTheme,
          language: preferences.language,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Report could not be sent.");
      }
      setShowReportIssueModal(false);
      announceWorkflow("Report sent", "Thank you. Your issue report has been emailed to the Aletheia team.", "success");
    } catch (error) {
      announceWorkflow("Report failed", error instanceof Error ? error.message : "Could not send the report.", "error");
    } finally {
      setAccountActionBusy(null);
    }
  }

  function startVoiceInput() {
    // If already listening, stop it
    if (isListening && voiceRecognition) {
      voiceRecognition.stop();
      setIsListening(false);
      setVoiceRecognition(null);
      announceWorkflow(ts('notifications.voiceStopped'), ts('notifications.voiceStoppedBody'), "info");
      return;
    }
    
    const browserWindow = window as typeof window & {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        maxAlternatives: number;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        maxAlternatives: number;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
    };
    const SpeechRecognition =
      browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPreferencesStatus(ts('notifications.voiceInputUnavailableBody', 'Voice input is not supported in this browser yet.'));
      announceWorkflow(ts('notifications.voiceInputUnavailable'), ts('notifications.voiceInputUnavailableBody'), "warning");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = activeLanguage.speech;
    recognition.interimResults = true; // Enable progressive text display
    recognition.continuous = true; // Keep listening until stopped
    recognition.maxAlternatives = 1;
    setIsListening(true);
    setVoiceTranscriptPreview("");
    announceWorkflow(
      ts('notifications.voiceInputListening', 'Voice input active'),
      ts('notifications.voiceInputListeningBody', 'Speak now. Your words will appear here before you insert them.'),
      "info"
    );
    
    // Auto-stop after 1 minute of inactivity
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        recognition.stop();
        announceWorkflow(ts('notifications.voiceInputStopped'), ts('notifications.voiceInputStoppedBody', 'Voice input stopped before Aletheia could hear clearly.'), "info");
      }, 60000); // 1 minute
    };
    
    resetInactivityTimer();
    
    recognition.onresult = (event) => {
      resetInactivityTimer(); // Reset timer on each result
      
      let combinedTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || "";
        combinedTranscript += `${transcript} `;
      }
      
      setVoiceTranscriptPreview(combinedTranscript.trim());
    };
    recognition.onerror = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      setPreferencesStatus(ts('notifications.voiceInputStoppedBody', 'Voice input stopped before Aletheia could hear clearly.'));
      announceWorkflow(ts('notifications.voiceInputStopped'), ts('notifications.voiceInputStoppedBody'), "warning");
    };
    recognition.onend = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      setIsListening(false);
      setVoiceRecognition(null);
    };
    recognition.start();
    setVoiceRecognition(recognition);
  }

  function speakLatestAletheiaReply() {
    if (!("speechSynthesis" in window)) {
      setPreferencesStatus(ts('notifications.voiceOutputUnavailableBody', 'Voice output is not supported in this browser yet.'));
      announceWorkflow(ts('notifications.voiceOutputUnavailable'), ts('notifications.voiceOutputUnavailableBody'), "warning");
      return;
    }
    if (isSpeaking) {
      stopSpeech();
      return;
    }
    const latest = [...messages].reverse().find((message) => message.role === "aletheia");
    if (!latest) {
      return;
    }
    speakText(latest.text, "Aletheia is reading the latest response in your selected language voice when available.", "Current counsel");
  }

  function toggleSpeechPause() {
    if (!("speechSynthesis" in window)) return;
    
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setSpeechPaused(false);
    } else if (isSpeaking) {
      window.speechSynthesis.pause();
      setSpeechPaused(true);
    }
  }

  function stopSpeech() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeechPaused(false);
    setSpeechProgress(0);
    setCurrentUtterance(null);
    announceWorkflow(ts('notifications.voiceStopped'), ts('notifications.voiceStoppedBody'), "info");
  }

  function speakText(
    text: string,
    notice = "Aletheia is reading this aloud in your selected language voice when available.",
    label = "Aletheia reading"
  ) {
    if (!("speechSynthesis" in window)) {
      setPreferencesStatus(ts('notifications.voiceOutputUnavailableBody', 'Voice output is not supported in this browser yet.'));
      announceWorkflow(ts('notifications.voiceOutputUnavailable'), ts('notifications.voiceOutputUnavailableBody'), "warning");
      return;
    }
    if (isSpeaking) {
      stopSpeech();
      return;
    }
    
    const cleanText = cleanDisplayText(text);
    trackClientEvent("read_aloud_started", {
      label,
      mode,
      language: preferences.language,
      voiceSelected: Boolean(selectedVoice),
      textLength: cleanText.length,
    });
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = activeLanguage.speech;

    const pacing = speechPacingForLanguage(preferences.language);
    utterance.rate = pacing.rate;
    utterance.pitch = pacing.pitch;
    utterance.volume = 1;

    // Apply selected voice
    if (selectedVoice && availableVoices.length > 0) {
      const voice = availableVoices.find(v => v.voiceURI === selectedVoice);
      if (voice) {
        utterance.voice = voice;
        if (/(compact|desktop|espeak|festival|legacy)/i.test(voice.name)) {
          utterance.rate = Math.max(0.72, pacing.rate - 0.06);
          utterance.pitch = Math.max(0.85, pacing.pitch - 0.02);
        }
      }
    }
    
    // Track progress
    utterance.onboundary = (event) => {
      if (event.charIndex !== undefined) {
        const progress = Math.floor((event.charIndex / cleanText.length) * 100);
        setSpeechProgress(progress);
      }
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeechPaused(false);
      setSpeechProgress(0);
      setCurrentUtterance(null);
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeechPaused(false);
      setSpeechProgress(0);
      setCurrentUtterance(null);
    };
    
    setCurrentUtterance(utterance);
    setIsSpeaking(true);
    setReadingLabel(label);
    setSpeechProgress(0);
    setStatusMessage(notice);
    window.speechSynthesis.speak(utterance);
    
    // Wake lock to prevent screen sleep during reading (if supported)
    if ('wakeLock' in navigator) {
      (navigator as Navigator & { wakeLock: { request: (type: string) => Promise<{ release: () => void }> } })
        .wakeLock.request('screen').catch(() => {
          // Wake lock not supported or denied, continue anyway
        });
    }
  }

  async function askAletheia(rawQuestion: string) {
    if (isWorking) {
      return;
    }
    const trimmed = rawQuestion.trim();
    if (!trimmed) {
      announceWorkflow(ts('notifications.askQuestionFirst'), ts('notifications.askQuestionFirstBody'), "warning");
      return;
    }

    const questionAnalytics = {
      mode,
      language: preferences.language,
      region: preferences.region,
      persisted: Boolean(user),
      followup: messages.some((message) => message.role === "aletheia"),
      ...analyticsQuestionMetadata(trimmed, mode),
    };
    trackClientEvent("question_asked", questionAnalytics);
    if (questionAnalytics.followup) {
      trackClientEvent("answer_followup_asked", { ...questionAnalytics, kind: "typed_followup" });
    }

    if (!user) {
      trackClientEvent("chat_question_sent", questionAnalytics);
    }

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", mode, text: trimmed };
    setIsWorking(true);
    announceWorkflow(ts('notifications.questionSent'), ts('notifications.questionSentBody'), "info");
    setMessages((current) => [
      ...current,
      userMessage,
      { id: "thinking", role: "aletheia", mode, text: "Retrieving grounded wisdom..." },
    ]);
    setQuery("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          mode,
          preferences,
          manualContext,
          focusIntentions,
          gratitudeContext: gratitudeContextSummary(gratitudeEntries),
        }),
      });
      const data = (await response.json()) as {
        reply?: ChatMessage;
        error?: string;
        persisted?: boolean;
        usedOpenAI?: boolean;
      };
      if (!response.ok || !data.reply) {
        throw new Error(data.error ?? "Aletheia could not answer right now.");
      }
      setMessages((current) =>
        current.map((message) => (message.id === "thinking" ? data.reply! : message))
      );
      setAnswerFocusId(data.reply.id);
      const responseMessage =
        data.persisted
          ? data.usedOpenAI
            ? "Answered with server-side OpenAI/RAG and saved to your account."
            : "Answered with server-side retrieval fallback and saved to your account."
          : data.usedOpenAI
            ? "Answered with server-side OpenAI/RAG. Sign in to save history."
            : "Answered with server-side retrieval fallback. Add OPENAI_API_KEY for generated AI responses.";
      setStatusMessage(responseMessage);
      announceWorkflow(ts('notifications.answerReady'), responseMessage, "success");
    } catch {
      trackClientEvent("error_seen", {
        area: "chat",
        kind: "answer_generation_failed",
        mode,
        ...analyticsQuestionMetadata(trimmed, mode),
      });
      const fallback = composeResponse(trimmed, mode, preferences);
      setMessages((current) =>
        current.map((message) =>
          message.id === "thinking"
            ? { id: crypto.randomUUID(), role: "aletheia", mode, text: fallback.text, sources: fallback.sources }
            : message
        )
      );
      setAnswerFocusId("offline-fallback");
      setStatusMessage(ts('status.offlineFallback'));
      announceWorkflow(ts('notifications.offlineAnswerReady'), ts('notifications.offlineAnswerReadyBody'), "warning");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await askAletheia(query);
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    trackClientEvent("auth_signin_started", { method: "email", flow: authMode });
    setIsWorking(true);
    setAuthStatus("signing-in");
    setAuthError("");
    setAuthNotice(authMode === "register" ? "Creating your Aletheia account..." : "Signing you in...");

    try {
      const response = await fetch(`/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authName,
          email: authEmail,
          password: authPassword,
        }),
      });
      const data = (await response.json()) as { user?: User; error?: string; isNewUser?: boolean; welcomeMessage?: string };
      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "Authentication failed.");
      }
      setAuthPassword("");
      setUser(data.user);
      await loadSignedInWorkspace();
      const firstName = data.user.name?.split(" ")[0] || data.user.email.split("@")[0];
      const successMessage =
        data.welcomeMessage ??
        (authMode === "register"
          ? `Welcome to Aletheia, ${firstName}. Your account is ready and sync is active.`
          : `Welcome back, ${firstName}. Your Aletheia memory is ready.`);
      setStatusMessage(successMessage);
      setAuthNotice(successMessage);
      announceWorkflow(authMode === "register" ? ts('notifications.accountCreated') : ts('notifications.signedIn'), successMessage, "success");
      try {
        window.localStorage.setItem("aletheia_onboarding_complete", "yes");
      } catch {
        // Auth still succeeds if local onboarding storage is unavailable.
      }
      setActiveView("account");
      setShowOnboarding(false);
    } catch (error) {
      setAuthStatus("guest");
      const message = error instanceof Error ? error.message : "Authentication failed.";
      const failureMetadata: AnalyticsMetadata = {
        method: "email",
        flow: authMode,
        category: "backend_fault",
        reason: "client_fetch_failed",
      };
      setAuthError(message);
      setAuthNotice("");
      setStatusMessage(message);
      if (message.toLowerCase().includes("already exists")) {
        failureMetadata.category = "validation";
        failureMetadata.reason = "account_exists";
        setAuthMode("login");
        setAuthNotice("That email already has an Aletheia account. Sign in below to continue.");
        setStatusMessage(ts('status.accountAlreadyExistsSignIn', 'That account already exists. Sign in below to continue.'));
      } else if (message.toLowerCase().includes("invalid email or password")) {
        failureMetadata.category = "bad_credentials";
        failureMetadata.reason = "invalid_credentials";
      } else if (message.toLowerCase().includes("too many")) {
        failureMetadata.category = "rate_limit";
        failureMetadata.reason = "too_many_attempts";
      } else if (message.toLowerCase().includes("temporarily unavailable")) {
        failureMetadata.category = "backend_fault";
        failureMetadata.reason = "server_error";
      } else if (message.toLowerCase().includes("valid email") || message.toLowerCase().includes("required")) {
        failureMetadata.category = "validation";
        failureMetadata.reason = authMode === "register" ? "invalid_input" : "missing_credentials";
      }
      trackAuthFailure(failureMetadata);
      announceWorkflow(ts('notifications.signInNotFinish'), message, "error");
    } finally {
      setIsWorking(false);
    }
  }

  async function logout() {
    if (!window.confirm(ts('confirm.signOut', 'Sign out? Private account data will be hidden from this device. Your synced account data stays safe and returns when you sign back in.'))) {
      return;
    }
    setAuthStatus("signing-out");
    trackClientEvent("auth_logout", { hadUser: Boolean(user) });
    setAuthNotice("Signing out...");
    await fetch("/api/auth/logout", { method: "POST" });
    await authSignOut({ redirect: false }).catch(() => undefined);
    setUser(null);
    setAuthStatus("guest");
    setAuthNotice("Signed out. Guest mode is active.");
    clearLocalPrivateWorkspace();
    setNotificationsEnabled(false);
    setNotificationAccountEnabled(false);
    setNotificationDeviceSubscribed(false);
    setStatusMessage(ts('status.signedOutGuest'));
    announceWorkflow(ts('notifications.signedOut'), ts('notifications.signedOutBody'), "info");
  }

  async function handleGoogleSignIn() {
    if (!googleAuthAvailable) {
      setAuthError("Google sign-in is not configured yet. You can still sign in with email.");
      setAuthNotice("");
      announceWorkflow(ts('notifications.googleUnavailable'), ts('notifications.googleUnavailableBody'), "warning");
      return;
    }
    setAuthStatus("signing-in");
    trackClientEvent("auth_signin_started", { method: "google", flow: "oauth_start" });
    setAuthError("");
    setAuthNotice("Opening Google sign-in. You will return to Account when it finishes.");
    setStatusMessage(ts('status.openingGoogleSignIn'));
    announceWorkflow(ts('notifications.openingGoogle'), ts('notifications.openingGoogleBody'), "info");
    try {
      await authSignIn("google", {
        redirectTo: "/api/auth/oauth/complete?next=%2F%3Fauth%3Dgoogle_success%26view%3Daccount",
      });
    } catch (error) {
      const message = error instanceof Error
        ? "Google sign-in could not be started. Please try again or use email below instead."
        : "Google sign-in could not be started. Please try again or use email below instead.";
      trackAuthFailure({
        method: "google",
        flow: "oauth_start",
        category: "provider_failure",
        reason: "start_failed",
      });
      setAuthStatus("guest");
      setAuthError(message);
      setAuthNotice("");
      setStatusMessage(message);
      announceWorkflow(ts('notifications.signInNotFinish'), message, "error");
    }
  }

  async function updateProfileAvatar(avatarUrl: string) {
    if (!user) {
      announceWorkflow(ts('notifications.signInRequired'), ts('notifications.signInRequiredBody'), "warning");
      return false;
    }

    const rawAvatarUrl = avatarUrl.trim();
    if (rawAvatarUrl && !normalizeAvatarUrl(rawAvatarUrl)) {
      announceWorkflow(
        "Profile update",
        "Use a valid image. You can upload from your gallery or keep the default avatar.",
        "warning"
      );
      return false;
    }

    const response = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: rawAvatarUrl || null }),
    });
    const data = (await response.json()) as { user?: User; error?: string };
    if (!response.ok) {
      announceWorkflow("Profile update failed", data.error || "Could not update profile image.", "error");
      return false;
    }
    if (!data.user) {
      announceWorkflow("Profile update failed", "Could not update profile image.", "error");
      return false;
    }

    const updatedUser: User = data.user;
    setUser((current) => (current ? { ...current, ...updatedUser, avatarUrl: updatedUser.avatarUrl ?? null } : updatedUser));

    // Refresh from authoritative session state so all cards reflect the same avatar immediately.
    try {
      const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
      if (meResponse.ok) {
        const meData = (await meResponse.json()) as { user?: User | null };
        if (meData.user) {
          const refreshedUser = meData.user;
          setUser((current) =>
            current
              ? { ...current, ...refreshedUser, avatarUrl: refreshedUser.avatarUrl ?? null }
              : refreshedUser
          );
        }
      }
    } catch {
      // Keep optimistic avatar update if refresh fails.
    }

    announceWorkflow(ts('notifications.profileUpdated', 'Profile updated'), ts('notifications.profileUpdatedBody', 'Profile picture updated.'), "success");
    return true;
  }

  async function enableNotifications() {
    if (notificationBusy) {
      return;
    }
    if (!user) {
      setNotificationStatus(ts('notifications.signInRequiredBody'));
      announceWorkflow(ts('notifications.signInRequired'), ts('notifications.signInRequiredBody'), "warning");
      return;
    }
    if (!notificationsConfigured) {
      setNotificationStatus(ts('notifications.notificationsNotConfiguredBody'));
      announceWorkflow(ts('notifications.notificationsNotConfigured'), ts('notifications.notificationsNotConfiguredBody'), "warning");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setNotificationStatus(ts('notifications.notificationsUnavailableBody'));
      announceWorkflow(ts('notifications.notificationsUnavailable'), ts('notifications.notificationsUnavailableBody'), "warning");
      return;
    }

    setNotificationBusy(true);
    setNotificationStatus(ts('notifications.preparingDeviceNotifications', 'Preparing this device for daily wisdom notifications...'));
    try {
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== "granted") {
        trackClientEvent("notification_enable_failed", { reason: "permission_denied", permission });
        setNotificationStatus("Notifications were not enabled. You can allow them later in browser settings.");
        announceWorkflow(ts('notifications.notificationsNotEnabled'), ts('notifications.notificationsNotEnabledBody'), "warning");
        return;
      }

      const keyResponse = await fetch("/api/notifications/key", { cache: "no-store" });
      const keyData = (await keyResponse.json()) as { publicKey?: string };
      if (!keyData.publicKey) {
        trackClientEvent("notification_enable_failed", { reason: "missing_public_key" });
        setNotificationStatus("Notifications are missing a public key.");
        announceWorkflow(ts('notifications.notificationKeyMissing'), ts('notifications.notificationKeyMissingBody'), "error");
        return;
      }

      const registration = await getReliableServiceWorkerRegistration();
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !pushSubscriptionUsesPublicKey(subscription, keyData.publicKey)) {
        await subscription.unsubscribe();
        subscription = null;
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        });
      }
      const preferredLocalHour = notificationTiming.preferredLocalHour;
      const preferredTimezone = notificationTiming.timezoneMode === "auto"
        ? browserTimezone()
        : (notificationTiming.preferredTimezone || browserTimezone());
      const preferredHour = localHourToUtcHour(preferredLocalHour);
      const response = await saveNotificationSubscription(subscription, {
        ...notificationTiming,
        preferredLocalHour,
        preferredTimezone,
      }, preferredHour);
      if (!response.ok) {
        trackClientEvent("notification_enable_failed", { reason: "subscription_save_failed" });
        setNotificationStatus("Could not save notification preference.");
        announceWorkflow(ts('notifications.notificationSyncFailed'), ts('notifications.notificationSyncFailedBody'), "error");
        return;
      }

      setNotificationsEnabled(true);
      setNotificationAccountEnabled(true);
      setNotificationDeviceSubscribed(true);
      const nextTiming = normalizeNotificationTiming({
        ...notificationTiming,
        preferredLocalHour,
        preferredTimezone,
      });
      setNotificationTiming(nextTiming);
      persistNotificationTiming(nextTiming);
      setNotificationStatus(ts('notifications.notificationsEnabledBody'));
      announceWorkflow(ts('notifications.notificationsEnabled'), ts('notifications.notificationsEnabledBodyTime').replace('{time}', notificationTimeLabel(preferredLocalHour, preferences.language)), "success");
    } catch {
      trackClientEvent("notification_enable_failed", { reason: "client_exception" });
      setNotificationsEnabled(false);
      setNotificationDeviceSubscribed(false);
      setNotificationStatus("Notifications could not be enabled on this device. Please try again.");
      announceWorkflow(ts('notifications.notificationSetupFailed'), ts('notifications.notificationSetupFailedBody'), "error");
    } finally {
      setNotificationBusy(false);
    }
  }

  async function disableNotifications() {
    if (notificationBusy) {
      return;
    }
    if (!window.confirm('Are you sure you want to turn off daily wisdom notifications? You will no longer receive gentle reminders for reflection.')) {
      return;
    }
    setNotificationBusy(true);
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        await subscription?.unsubscribe();
        await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription?.endpoint }),
        });
      } else {
        await fetch("/api/notifications/unsubscribe", { method: "POST" });
      }
    } finally {
      setNotificationBusy(false);
    }
    setNotificationsEnabled(false);
    setNotificationAccountEnabled(false);
    setNotificationDeviceSubscribed(false);
    trackClientEvent("notification_disabled", {
      hadPermission: notificationPermission === "granted",
      wasEnabled: true,
    });
    setNotificationStatus(ts('notifications.notificationsOffBody'));
    announceWorkflow(ts('notifications.notificationsOff'), ts('notifications.notificationsOffBody'), "info");
  }

  async function saveNotificationSubscription(
    subscription: PushSubscription,
    timing: NotificationTiming,
    preferredHour = localHourToUtcHour(timing.preferredLocalHour)
  ) {
    return fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription,
        preferredHour,
        preferredLocalHour: timing.preferredLocalHour,
        preferredTimezone: timing.preferredTimezone,
        timezoneMode: timing.timezoneMode,
        deliveryStrategy: timing.deliveryStrategy,
      }),
    });
  }

  async function saveNotificationTimingPreference(timing: NotificationTiming) {
    return fetch("/api/notifications/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferredLocalHour: timing.preferredLocalHour,
        preferredTimezone: timing.preferredTimezone,
        timezoneMode: timing.timezoneMode,
        deliveryStrategy: timing.deliveryStrategy,
      }),
    });
  }

  async function updateNotificationTiming(patch: Partial<NotificationTiming>) {
    if (notificationBusy) {
      setNotificationStatus("Still saving your previous timing change. Please wait a moment and try again.");
      return;
    }

    const nextStrategy = patch.deliveryStrategy ?? notificationTiming.deliveryStrategy;
    const nextHour = patch.preferredLocalHour ?? notificationHourForStrategy(nextStrategy, notificationTiming.preferredLocalHour);
    const nextTimezoneMode: NotificationTiming["timezoneMode"] = patch.timezoneMode ?? notificationTiming.timezoneMode;
    const nextTiming: NotificationTiming = {
      preferredLocalHour: Math.min(23, Math.max(0, nextHour)),
      preferredTimezone:
        nextTimezoneMode === "auto"
          ? browserTimezone()
          : (patch.preferredTimezone ?? notificationTiming.preferredTimezone ?? browserTimezone()),
      timezoneMode: nextTimezoneMode,
      deliveryStrategy: nextStrategy,
    };
    setNotificationTiming(nextTiming);
    persistNotificationTiming(nextTiming);
    trackClientEvent("notification_timing_updated", {
      strategy: nextTiming.deliveryStrategy,
      localHour: nextTiming.preferredLocalHour,
      timezone: nextTiming.preferredTimezone,
      timezoneMode: nextTiming.timezoneMode,
      notificationsEnabled,
    });
    setNotificationStatus("Daily wisdom time saved on this device.");
    if (!user) {
      return;
    }
    try {
      setNotificationBusy(true);
      const timingResponse = await saveNotificationTimingPreference(nextTiming);
      if (!timingResponse.ok) {
        setNotificationStatus("Timing changed here, but could not sync to the server yet.");
        return;
      }
      if (!notificationsEnabled) {
        setNotificationStatus("Daily wisdom timing synced. Enable notifications when this device is ready.");
        announceWorkflow(ts('notifications.notificationTimingSaved'), ts('notifications.notificationTimingSavedBody').replace('{time}', notificationTimeLabel(nextTiming.preferredLocalHour, preferences.language)), "success");
        return;
      }
      const registration = await getReliableServiceWorkerRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setNotificationsEnabled(false);
        setNotificationStatus("This device needs to enable notifications again before timing can sync.");
        return;
      }
      const response = await saveNotificationSubscription(subscription, nextTiming);
      if (!response.ok) {
        setNotificationStatus("Timing changed here, but could not sync to the server yet.");
        return;
      }
      setNotificationStatus("Daily wisdom timing synced.");
      announceWorkflow(ts('notifications.notificationTimingSaved'), ts('notifications.notificationTimingSavedBody').replace('{time}', notificationTimeLabel(nextTiming.preferredLocalHour, preferences.language)), "success");
    } catch {
      setNotificationStatus("Timing changed here, but could not sync to the server yet.");
    } finally {
      setNotificationBusy(false);
    }
  }

  async function saveReflection() {
    const title = journalTitle.trim() || `${mode} reflection`;
    const body = journalBody.trim();
    if (!body) {
      announceWorkflow(ts('notifications.writeReflectionFirst'), ts('notifications.writeReflectionFirstBody'), "warning");
      return;
    }
    const isFirstReflection = journalEntries.length === 0;

    if (user) {
      const response = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, mode }),
      });
      const data = (await response.json()) as { entry?: JournalEntry };
      if (data.entry) {
        setJournalEntries((current) => [data.entry!, ...current]);
        trackClientEvent("journal_entry_created", { mode, source: "reflect_tab" });
        announceWorkflow(
          isFirstReflection ? ts('notifications.firstReflectionMilestone', 'You practiced reflection before speed') : ts('notifications.reflectionSaved'),
          isFirstReflection ? ts('notifications.firstReflectionMilestoneBody', 'A quiet formation moment has begun. One honest reflection is enough for today.') : ts('notifications.reflectionSavedBody'),
          "success"
        );
      }
    } else {
      trackClientEvent("journal_entry_created_local", { mode });
      setJournalEntries((current) => [
        {
          id: crypto.randomUUID(),
          title,
          body,
          mode,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setStatusMessage(ts('status.reflectionSavedSession'));
      announceWorkflow(
        isFirstReflection ? ts('notifications.firstReflectionMilestone', 'You practiced reflection before speed') : ts('notifications.reflectionSavedLocally'),
        isFirstReflection ? ts('notifications.firstReflectionMilestoneBody', 'A quiet formation moment has begun. One honest reflection is enough for today.') : ts('notifications.reflectionSavedLocallyBody'),
        "success"
      );
    }

    setJournalTitle("");
    setJournalBody("");
  }

  async function deleteJournalEntry(id: string) {
    if (user) {
      await fetch(`/api/journal/${id}`, { method: "DELETE" });
    }
    setJournalEntries((current) => current.filter((entry) => entry.id !== id));
    announceWorkflow(ts('notifications.reflectionDeleted'), ts('notifications.reflectionDeletedBody'), "info");
  }

  async function saveGratitudeEntry(file: File | null, note: string, place: string, visual?: GratitudeVisualSettings, formation?: GratitudeFormation) {
    const cleanNote = note.trim();
    const cleanPlace = place.trim();
    if (!file || !cleanNote) {
      announceWorkflow(
        ts('notifications.gratitudeNeedsPhotoAndNote', 'Add a photo and one grateful sentence'),
        ts('notifications.gratitudeNeedsPhotoAndNoteBody', 'Gratitude Lens works best with one image and one honest line of thanks.'),
        "warning"
      );
      return;
    }
    try {
      const imageDataUrl = await imageFileToLocalDataUrl(file);
      const entry: GratitudeEntry = {
        id: crypto.randomUUID(),
        imageDataUrl,
        note: cleanNote.slice(0, 280),
        place: cleanPlace.slice(0, 120),
        createdAt: new Date().toISOString(),
        formation: normalizeGratitudeFormation(formation),
        visual: normalizeGratitudeVisual(visual),
      };
      const nextEntries = [entry, ...gratitudeEntries].slice(0, MAX_GRATITUDE_ENTRIES);
      persistGratitudeEntries(nextEntries);
      setGratitudeEntries(nextEntries);
      trackClientEvent("gratitude_entry_created", {
        has_place: Boolean(cleanPlace),
        source: "reflect_tab",
        formation: entry.formation ?? DEFAULT_GRATITUDE_FORMATION,
        filter: entry.visual?.filter ?? "none",
        sticker_count: entry.visual?.stickers.length ?? 0,
        has_emoji: Boolean(entry.visual?.emoji),
      });
      announceWorkflow(
        ts('notifications.gratitudeSavedLocally', 'Gratitude saved locally'),
        ts('notifications.gratitudeSavedLocallyBody', 'The image stayed on this device. Export or share only when you choose.'),
        "success"
      );
    } catch (error) {
      announceWorkflow(
        ts('notifications.gratitudeSaveFailed', 'Gratitude could not be saved'),
        error instanceof Error ? error.message : ts('notifications.gratitudeSaveFailedBody', 'Try a smaller image or a different photo.'),
        "error"
      );
    }
  }

  function updateGratitudeEntry(id: string, patch: Partial<GratitudeEntry>) {
    setGratitudeEntries((current) => {
      const nextEntries = current.map((entry) => entry.id === id ? { ...entry, ...patch } : entry);
      try {
        persistGratitudeEntries(nextEntries);
      } catch {
        // The in-memory timeline remains updated if local storage is briefly unavailable.
      }
      return nextEntries;
    });
  }

  function useGratitudeAsReflectionPrompt(entry: GratitudeEntry) {
    const created = new Date(entry.createdAt).toLocaleString(preferences.language, { dateStyle: "medium", timeStyle: "short" });
    const entryFormation = normalizeGratitudeFormation(entry.formation);
    const formationLine = `${ts('labels.gratitudeNoticedAs', 'Noticed as')}: ${ts(`labels.gratitudeFormation_${entryFormation}`, entryFormation)}\n`;
    const placeLine = entry.place.trim()
      ? `${ts('labels.placeOptional', 'Place (optional)')}: ${entry.place.trim()}\n`
      : "";
    setJournalTitle(ts('labels.gratitudeReflectionTitle', 'Gratitude reflection'));
    setJournalBody(
      `${ts('labels.gratitudeMoment', 'gratitude moment')}: ${entry.note}\n${formationLine}${placeLine}${ts('labels.date', 'Date')}: ${created}\n\n${ts('labels.gratitudeReflectionQuestion', 'What does this moment reveal about provision, contentment, or enough?')}\n\n`
    );
    updateGratitudeEntry(entry.id, { reflectedAt: new Date().toISOString() });
    trackClientEvent("gratitude_reflection_prompt_used", {
      has_place: Boolean(entry.place.trim()),
      formation: entryFormation,
      source: "reflect_tab",
    });
    announceWorkflow(
      ts('notifications.gratitudeReflectionDrafted', 'Reflection prompt prepared'),
      ts('notifications.gratitudeReflectionDraftedBody', 'The photo moment is ready in your journal. Add what you are noticing.'),
      "success"
    );
  }

  function deleteGratitudeEntry(id: string) {
    const nextEntries = gratitudeEntries.filter((entry) => entry.id !== id);
    setGratitudeEntries(nextEntries);
    try {
      persistGratitudeEntries(nextEntries);
    } catch {
      // The UI still reflects the deletion even if storage is temporarily unavailable.
    }
    trackClientEvent("gratitude_entry_deleted", { source: "reflect_tab" });
    announceWorkflow(
      ts('notifications.gratitudeDeleted', 'Gratitude removed'),
      ts('notifications.gratitudeDeletedBody', 'The local gratitude image was removed from this device.'),
      "info"
    );
  }

  async function shareGratitudePostcard(entry: GratitudeEntry) {
    try {
      const blob = await createGratitudePostcardBlob(
        entry,
        theme,
        ts('labels.gratitudeLens', 'Gratitude Lens'),
        ts('labels.gratitudePostcardInvite', 'Begin your own gratitude rhythm with Aletheia.'),
        preferences.language
      );
      const filename = `aletheia-gratitude-${entry.createdAt.slice(0, 10)}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      const canShareFile =
        typeof navigator !== "undefined" &&
        "share" in navigator &&
        "canShare" in navigator &&
        navigator.canShare({ files: [file] });
      if (canShareFile) {
        await navigator.share({
          title: ts('labels.gratitudePostcard', 'Gratitude postcard'),
          text: ts('labels.gratitudePostcardShareText', 'A quiet gratitude moment from Aletheia.'),
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }
      trackClientEvent("gratitude_postcard_shared", { channel: canShareFile ? "native" : "download", source: "reflect_tab" });
      updateGratitudeEntry(entry.id, { postcardCreatedAt: new Date().toISOString() });
      announceWorkflow(
        canShareFile ? ts('notifications.shareSheetOpened', 'Share sheet opened') : ts('notifications.gratitudePostcardDownloaded', 'Postcard downloaded'),
        ts('notifications.gratitudePostcardReadyBody', 'Only the postcard image you chose was exported. Your other reflections stayed private. A copy is marked in your Gratitude Timeline.'),
        "success"
      );
    } catch (error) {
      announceWorkflow(
        ts('notifications.gratitudePostcardFailed', 'Postcard could not be prepared'),
        error instanceof Error ? error.message : ts('notifications.gratitudePostcardFailedBody', 'Try again with a different image.'),
        "error"
      );
    }
  }

  function refreshLocalTimeline(decisions: WisdomDecision[], events: DecisionEvent[]) {
    const runtime = runtimeCopyFor(preferences.language);
    const combined = [
      ...decisions.map((item) => `${item.title} ${item.pressure} ${item.initialEmotion}`),
      ...events.map((event) => event.body),
    ].join(" ");
    const patterns = detectPatterns(combined);
    const active = decisions.filter((item) => item.status === "discerning");
    setTimelineInsight({
      activeCount: active.length,
      daysDiscerning: active.length ? 1 : 0,
      patterns,
      gentleObservation: patterns.includes("urgency")
        ? "Urgency appears in your recent decisions. That does not make the desire wrong, but speed may be clouding wisdom."
        : patterns.includes("comparison")
          ? "Comparison appears in your recent reflections. It may help to define enough before choosing more."
          : active.length
            ? `You are carrying ${active.length} active decision${active.length === 1 ? "" : "s"}. Keep the next faithful step small and visible.`
            : runtime.timelineReady,
    });
  }

  async function createDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = decisionTitle.trim();
    const pressure = decisionPressure.trim();
    if (!title || !pressure) {
      announceWorkflow(ts('notifications.nameDecisionPressure'), ts('notifications.nameDecisionPressureBody'), "warning");
      return;
    }
    const isFirstDecision = wisdomDecisions.length === 0;

    if (user) {
      const response = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, pressure, emotion: decisionEmotion, mode }),
      });
      const data = (await response.json()) as { decision?: WisdomDecision };
      if (data.decision) {
        setWisdomDecisions((current) => [data.decision!, ...current]);
        trackClientEvent("decision_created", { mode, emotion: decisionEmotion, source: "decision_tab" });
        setDecisionEvents((current) => [
          {
            id: crypto.randomUUID(),
            decisionId: data.decision!.id,
            eventType: "created",
            body: `Started discerning: ${title}`,
            mode,
            createdAt: new Date().toISOString(),
          },
          ...current,
        ]);
        announceWorkflow(
          isFirstDecision ? ts('notifications.firstDecisionMilestone', 'You practiced wisdom before speed') : ts('notifications.decisionTracked'),
          isFirstDecision ? ts('notifications.firstDecisionMilestoneBody', 'This decision now has memory, counsel space, and room to mature over time.') : ts('notifications.decisionTrackedBody'),
          "success"
        );
      }
    } else {
      trackClientEvent("decision_created_local", { mode, emotion: decisionEmotion });
      const sources = searchWisdom(`${title} ${pressure} ${decisionEmotion}`, mode, 3, preferences);
      const signals = scoreDecision({
        pressure,
        emotion: decisionEmotion,
        counselSought: false,
        costCounted: false,
        alignmentClear: false,
        reversibleStep: false,
        peaceOverUrgency: false,
      });
      const now = new Date().toISOString();
      const localDecision: WisdomDecision = {
        id: crypto.randomUUID(),
        title,
        mode,
        pressure,
        initialEmotion: decisionEmotion,
        status: "discerning",
        readiness: signals.readiness,
        counselSought: false,
        costCounted: false,
        alignmentClear: false,
        reversibleStep: false,
        peaceOverUrgency: false,
        waitingUntil: null,
        revisitAt: null,
        outcomeReviewAt: null,
        summary: buildDecisionSummary({ title, mode, pressure, emotion: decisionEmotion, sources, signals, preferences }),
        finalDecision: null,
        learning: null,
        createdAt: now,
        updatedAt: now,
      };
      const localEvent = {
        id: crypto.randomUUID(),
        decisionId: localDecision.id,
        eventType: "created",
        body: `Started discerning: ${title}`,
        mode,
        createdAt: now,
      };
      const nextDecisions = [localDecision, ...wisdomDecisions];
      const nextEvents = [localEvent, ...decisionEvents];
      setWisdomDecisions(nextDecisions);
      setDecisionEvents(nextEvents);
      refreshLocalTimeline(nextDecisions, nextEvents);
      setStatusMessage(ts('status.decisionSavedSession'));
      announceWorkflow(
        isFirstDecision ? ts('notifications.firstDecisionMilestone', 'You practiced wisdom before speed') : ts('notifications.decisionTrackedLocally'),
        isFirstDecision ? ts('notifications.firstDecisionMilestoneBody', 'This decision now has memory, counsel space, and room to mature over time.') : ts('notifications.decisionTrackedLocallyBody'),
        "success"
      );
    }

    setDecisionTitle("");
    setDecisionPressure("");
  }

  async function updateDecision(
    id: string,
    patch: Partial<WisdomDecision> & {
      waitingDays?: number | null;
      revisitDays?: number | null;
      outcomeReviewDays?: number | null;
      event?: string;
    }
  ) {
    const current = wisdomDecisions.find((item) => item.id === id);
    if (!current) {
      return;
    }

    if (user) {
      const response = await fetch(`/api/decisions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        announceWorkflow(ts('notifications.decisionUpdateFailed'), ts('notifications.decisionUpdateFailedBody'), "error");
        return;
      }
      if (patch.revisitDays || patch.outcomeReviewDays || patch.waitingDays) {
        trackClientEvent("decision_revisited", {
          mode: current.mode,
          waitingDays: patch.waitingDays ?? null,
          revisitDays: patch.revisitDays ?? null,
          outcomeReviewDays: patch.outcomeReviewDays ?? null,
        });
      }
    }

    const waitingUntil =
      typeof patch.waitingDays === "number" && patch.waitingDays > 0
        ? new Date(Date.now() + patch.waitingDays * 86400000).toISOString()
        : patch.waitingDays === null
          ? null
          : current.waitingUntil;
    const revisitAt =
      typeof patch.revisitDays === "number" && patch.revisitDays > 0
        ? new Date(Date.now() + patch.revisitDays * 86400000).toISOString()
        : patch.revisitDays === null
          ? null
          : current.revisitAt;
    const outcomeReviewAt =
      typeof patch.outcomeReviewDays === "number" && patch.outcomeReviewDays > 0
        ? new Date(Date.now() + patch.outcomeReviewDays * 86400000).toISOString()
        : patch.outcomeReviewDays === null
          ? null
          : current.outcomeReviewAt;
    const updated = wisdomDecisions.map((item) => {
      if (item.id !== id) {
        return item;
      }
      const next = { ...item, ...patch, waitingUntil, revisitAt, outcomeReviewAt, updatedAt: new Date().toISOString() };
      const sources = searchWisdom(`${next.title} ${next.pressure} ${next.initialEmotion}`, next.mode, 3, preferences);
      const signals = scoreDecision({
        pressure: next.pressure,
        emotion: next.initialEmotion,
        counselSought: Boolean(next.counselSought),
        costCounted: Boolean(next.costCounted),
        alignmentClear: Boolean(next.alignmentClear),
        reversibleStep: Boolean(next.reversibleStep),
        peaceOverUrgency: Boolean(next.peaceOverUrgency),
      });
      return {
        ...next,
        readiness: signals.readiness,
        summary: buildDecisionSummary({
          title: next.title,
          mode: next.mode,
          pressure: next.pressure,
          emotion: next.initialEmotion,
          sources,
          signals,
          preferences,
        }),
      };
    });
    const eventBody =
      patch.event ??
      (patch.waitingDays
        ? `Entered waiting mode for ${patch.waitingDays} day${patch.waitingDays === 1 ? "" : "s"}.`
        : patch.revisitDays
          ? `Scheduled a decision revisit for ${patch.revisitDays} day${patch.revisitDays === 1 ? "" : "s"} from now.`
          : patch.outcomeReviewDays
            ? `Scheduled an outcome review for ${patch.outcomeReviewDays} days from now.`
            : "");
    const events = eventBody
      ? [
          {
            id: crypto.randomUUID(),
            decisionId: id,
            eventType: "update",
            body: eventBody,
            mode: current.mode,
            createdAt: new Date().toISOString(),
          },
          ...decisionEvents,
        ]
      : decisionEvents;
    setWisdomDecisions(updated);
    setDecisionEvents(events);
    refreshLocalTimeline(updated, events);
    announceWorkflow(ts('notifications.decisionUpdated'), eventBody || "The decision signals were updated.", "success");
  }

  async function deleteDecision(id: string) {
    const decision = wisdomDecisions.find((d) => d.id === id);
    if (!decision) return;
    
    if (!window.confirm(`Delete "${decision.title}"?\n\nThis will permanently remove this decision and all its timeline events. This cannot be undone.`)) {
      return;
    }
    
    if (user) {
      const response = await fetch(`/api/decisions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        announceWorkflow(ts('notifications.decisionUpdateFailed'), "Could not delete decision.", "error");
        return;
      }
    }
    
    setWisdomDecisions((current) => current.filter((d) => d.id !== id));
    setDecisionEvents((current) => current.filter((e) => e.decisionId !== id));
    announceWorkflow(ts('notifications.decisionDeleted'), ts('notifications.decisionDeletedBody'), "info");
  }

  async function addCounselContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = counselName.trim();
    if (!name) {
      announceWorkflow(ts('notifications.addNameFirst'), ts('notifications.addNameFirstBody'), "warning");
      return;
    }
    if (user) {
      const response = await fetch("/api/counsel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role: counselRole,
          avatarUrl: counselAvatarUrl,
          contact: counselContactValue,
          canViewSummaries: counselCanViewSummaries,
          canCommentOnDecisions: counselCanComment,
          canReceiveCheckins: counselCanReceiveCheckins,
        }),
      });
      const data = (await response.json()) as { contact?: CounselContact; inviteUrl?: string; error?: string };
      if (data.contact) {
        setCounselContacts((current) => [data.contact!, ...current]);
        if (data.inviteUrl) {
          setLatestCounselInvite({ name: data.contact.name, url: data.inviteUrl });
        }
        announceWorkflow(
          data.contact.emailSent ? ts('notifications.privateInviteEmailed') : ts('notifications.privateInviteCreated'),
          data.contact.emailSent
            ? ts('notifications.privateInviteEmailedBody').replace('{name}', data.contact.name)
            : data.contact.emailError
              ? ts('notifications.privateInviteCreatedBodyEmailError').replace('{error}', data.contact.emailError)
              : ts('notifications.privateInviteCreatedBody').replace('{name}', data.contact.name),
          data.contact.emailError ? "warning" : "success"
        );
      } else if (data.error) {
        announceWorkflow(ts('notifications.counselInviteNotCreated'), data.error, "error");
      }
    } else {
      trackClientEvent("counsel_contact_added_local", { role: counselRole });
      setCounselContacts((current) => [
        {
          id: crypto.randomUUID(),
          name,
          role: counselRole,
          avatarUrl: normalizeAvatarUrl(counselAvatarUrl) ?? null,
          contact: counselContactValue.trim() || null,
          notes: null,
          inviteStatus: "not_sent",
          canViewSummaries: counselCanViewSummaries,
          canCommentOnDecisions: counselCanComment,
          canReceiveCheckins: counselCanReceiveCheckins,
          acceptedAt: null,
          emailSent: false,
          emailError: null,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      announceWorkflow(ts('notifications.counselAddedLocally'), ts('notifications.counselAddedLocallyBody'), "success");
    }
    setCounselName("");
    setCounselAvatarUrl("");
    setCounselContactValue("");
    setCounselCanViewSummaries(true);
    setCounselCanComment(false);
    setCounselCanReceiveCheckins(false);
  }

  async function shareCounselInvite(channel: ShareChannel = "native") {
    if (!latestCounselInvite) {
      return;
    }
    const text = `${latestCounselInvite.name}, I would value your counsel through Aletheia. This private link only shows what I explicitly share: ${latestCounselInvite.url}`;
    if (channel === "native" && navigator.share) {
      await navigator.share({ title: "Aletheia counsel invite", text, url: latestCounselInvite.url }).catch(() => undefined);
      return;
    }
    if (channel === "copy" || channel === "native") {
      await navigator.clipboard.writeText(latestCounselInvite.url).catch(() => undefined);
      announceWorkflow(ts('notifications.inviteLinkCopied'), ts('notifications.inviteLinkCopiedBody'), "success");
      return;
    }
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(latestCounselInvite.url);
    const hrefs: Record<Exclude<ShareChannel, "native" | "copy">, string> = {
      whatsapp: `https://wa.me/?text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?text=${encodedText}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      email: `mailto:?subject=${encodeURIComponent("Aletheia counsel invite")}&body=${encodedText}`,
      sms: `sms:?&body=${encodedText}`,
    };
    window.open(hrefs[channel], "_blank", "noopener,noreferrer");
  }

  async function shareDecisionWithCounsel(contactId: string, decisionId: string) {
    const contact = counselContacts.find((c) => c.id === contactId);
    const contactName = contact?.name || "this contact";
    const decision = wisdomDecisions.find((d) => d.id === decisionId);
    const decisionTitle = decision?.title || "this decision";
    
    if (!window.confirm(`Share "${decisionTitle}" with ${contactName}?\n\nThey will be able to view the decision summary you've created. Your private journal entries and chats remain private.`)) {
      return;
    }
    
    const response = await fetch("/api/counsel/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, decisionId }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (response.ok && data.ok) {
      setWisdomDecisions((current) =>
        current.map((decision) =>
          decision.id === decisionId ? { ...decision, counselSought: true, updatedAt: new Date().toISOString() } : decision
        )
      );
      
      const totalDecisions = wisdomDecisions.length;
      const hasMoreDecisions = totalDecisions > 1;
      const bodyMessage = hasMoreDecisions
        ? `${contactName} can now view this decision summary. You have ${totalDecisions - 1} more ${totalDecisions === 2 ? "decision" : "decisions"} that can be shared.`
        : `${contactName} can now view this decision summary. Chats and journal entries remain private.`;
      
      announceWorkflow(
        ts('notifications.summaryShared'),
        bodyMessage,
        "success",
        hasMoreDecisions
          ? {
              label: "Share more",
              onClick: () => {
                // Keep user on decisions view
                setActiveView("decisions");
              },
            }
          : undefined
      );
    } else {
      announceWorkflow(ts('notifications.summariesNotShared'), data.error || "The summary could not be shared.", "error");
    }
  }

  async function bulkShareDecisionsWithCounsel(contactId: string, decisionIds: string[]) {
    const contact = counselContacts.find((c) => c.id === contactId);
    const contactName = contact?.name || "this contact";
    
    if (decisionIds.length === 0) {
      announceWorkflow(ts('notifications.noDecisionsToShare'), ts('notifications.noDecisionsToShareBody'), "warning");
      return;
    }
    
    const count = decisionIds.length;
    if (!window.confirm(`Share ${count} ${count === 1 ? "decision" : "decisions"} with ${contactName}?\n\nThey will be able to view decision summaries. Your private journal entries and chats remain private.`)) {
      return;
    }
    
    const response = await fetch("/api/counsel/share/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, decisionIds }),
    });
    const data = (await response.json()) as { ok?: boolean; sharedCount?: number; error?: string };
    
    if (response.ok && data.ok) {
      // Mark all shared decisions as counselSought
      setWisdomDecisions((current) =>
        current.map((decision) =>
          decisionIds.includes(decision.id) ? { ...decision, counselSought: true, updatedAt: new Date().toISOString() } : decision
        )
      );
      
      const count = data.sharedCount ?? decisionIds.length;
      announceWorkflow(
        `${count} ${count === 1 ? "summary" : ts('notifications.summariesShared')}`,
        `${contactName} can now view ${count} decision ${count === 1 ? "summary" : "summaries"}. Chats and journal entries remain private.`,
        "success"
      );
    } else {
      announceWorkflow(ts('notifications.summariesNotShared'), data.error || "The summaries could not be shared.", "error");
    }
  }

  async function finalizeCounselContactRemoval(contactId: string, contactName: string) {
    if (user) {
      const response = await fetch(`/api/counsel?contactId=${encodeURIComponent(contactId)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        revokedSharedCount?: number;
        revokedCommentCount?: number;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        announceWorkflow(
          ts("notifications.counselNotRemoved", "Could not remove contact"),
          data.error || ts("notifications.counselNotRemovedBody", "Please try again."),
          "error"
        );
        return;
      }

      setCounselContacts((current) => current.filter((item) => item.id !== contactId));
      if (latestCounselInvite?.name === contactName) {
        setLatestCounselInvite(null);
      }
      announceWorkflow(
        ts("notifications.counselRemoved", "Counsel contact removed"),
        `${contactName} was removed. ${data.revokedSharedCount ?? 0} shared ${data.revokedSharedCount === 1 ? "decision" : "decisions"} and ${data.revokedCommentCount ?? 0} counsel ${data.revokedCommentCount === 1 ? "comment" : "comments"} were revoked.`,
        "success"
      );
      return;
    }

    setCounselContacts((current) => current.filter((item) => item.id !== contactId));
    if (latestCounselInvite?.name === contactName) {
      setLatestCounselInvite(null);
    }
    announceWorkflow(
      ts("notifications.counselRemovedLocally", "Counsel contact removed locally"),
      ts("notifications.counselRemovedLocallyBody", "The contact was removed from this device."),
      "success"
    );
  }

  async function confirmCounselContactRemoval(typedValue: string) {
    if (!counselRemovalPrompt) {
      return;
    }

    const matchesConfirmation = typedValue.trim().toUpperCase() === "REMOVE";
    if (!matchesConfirmation) {
      setCounselRemovalPrompt(null);
      announceWorkflow(
        ts("notifications.counselRemovalCancelled", "Removal cancelled"),
        ts("notifications.counselRemovalCancelledBody", "Final confirmation did not match. No changes were made."),
        "info"
      );
      return;
    }

    const pending = counselRemovalPrompt;
    setIsRemovingCounselContact(true);
    setCounselRemovalPrompt(null);
    try {
      await finalizeCounselContactRemoval(pending.contactId, pending.contactName);
    } finally {
      setIsRemovingCounselContact(false);
    }
  }

  async function removeCounselContact(contactId: string) {
    if (isRemovingCounselContact) {
      return;
    }
    const contact = counselContacts.find((item) => item.id === contactId);
    if (!contact) {
      return;
    }

    if (!window.confirm(`Remove ${contact.name} from your Counsel Circle?\n\nThey will no longer be able to view future shared summaries.`)) {
      return;
    }

    setCounselRemovalPrompt({ contactId: contact.id, contactName: contact.name });
  }

  async function acceptCounselInvite() {
    if (!counselInviteToken) {
      return;
    }
    setCounselInviteStatus(ts('status.acceptingInvite'));
    const response = await fetch(`/api/counsel/invite/${encodeURIComponent(counselInviteToken)}`, {
      method: "POST",
    });
    const data = (await response.json()) as CounselInvitePreview | { error?: string };
    if (response.ok && isCounselInvitePreview(data)) {
      setCounselInvitePreview(data);
      setCounselInviteStatus(ts('status.inviteAccepted'));
    } else {
      setCounselInviteStatus(ts('status.inviteNotAccepted'));
    }
  }

  async function addCounselInviteComment(decisionId: string, body: string) {
    if (!counselInviteToken) {
      return;
    }
    const response = await fetch(`/api/counsel/invite/${encodeURIComponent(counselInviteToken)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decisionId, body }),
    });
    const data = (await response.json()) as { comment?: { id: string; body: string; createdAt: string }; error?: string };
    if (response.ok && data.comment) {
      setCounselInvitePreview((current) =>
        current
          ? {
              ...current,
              sharedDecisions: current.sharedDecisions.map((decision) =>
                decision.id === decisionId
                  ? { ...decision, comments: [data.comment!, ...decision.comments] }
                  : decision
              ),
            }
          : current
      );
      setCounselInviteStatus(ts('status.commentShared'));
    } else {
      setCounselInviteStatus(data.error || "Comment could not be shared.");
    }
  }

  async function addRuleOfLife(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const principle = ruleText.trim();
    if (!principle) {
      announceWorkflow(ts('notifications.writePrincipleFirst'), ts('notifications.writePrincipleFirstBody'), "warning");
      return;
    }
    if (user) {
      const response = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ principle, mode }),
      });
      const data = (await response.json()) as { rule?: RuleOfLife };
      if (data.rule) {
        setRulesOfLife((current) => [data.rule!, ...current]);
        trackClientEvent("rule_created", { mode });
        announceWorkflow(ts('notifications.ruleOfLifeSaved'), ts('notifications.ruleOfLifeSavedBody'), "success");
      }
    } else {
      trackClientEvent("rule_created_local", { mode });
      setRulesOfLife((current) => [
        { id: crypto.randomUUID(), mode, principle, createdAt: new Date().toISOString() },
        ...current,
      ]);
      announceWorkflow(ts('notifications.ruleSavedLocally'), ts('notifications.ruleSavedLocallyBody'), "success");
    }
    setRuleText("");
  }

  return (
    <main className={`app-shell min-h-screen overflow-x-hidden ${resolvedTheme === "dark" || resolvedTheme === "black" ? "theme-dark-root" : ""}`} style={{ backgroundColor: theme.bgMain, color: theme.textPrimary, minHeight: '100dvh' }}>
      <div
        className={`fixed inset-0 -z-10 ${theme.bgGradient}`}
        style={{ backgroundColor: theme.bgMain }}
      />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[22] backdrop-blur-2xl backdrop-saturate-200 md:hidden"
        style={{
          height: "calc(var(--aletheia-top-glass-height, calc(max(env(safe-area-inset-top, 0px), var(--aletheia-top-reserve, 0px)) + 4.85rem)) + 0.2rem)",
          backgroundColor: resolvedTheme === "black"
            ? "rgba(7, 10, 8, 0.18)"
            : resolvedTheme === "dark"
              ? "rgba(14, 21, 20, 0.16)"
              : resolvedTheme === "warm"
                ? "rgba(250, 246, 241, 0.2)"
                : resolvedTheme === "ocean"
                  ? "rgba(241, 246, 250, 0.2)"
                  : resolvedTheme === "forest"
                    ? "rgba(241, 246, 241, 0.2)"
                    : resolvedTheme === "sunset"
                      ? "rgba(250, 241, 246, 0.2)"
                      : "rgba(238, 242, 239, 0.2)",
          backgroundImage: resolvedTheme === "black"
            ? "linear-gradient(180deg, rgba(214, 180, 93, 0.1) 0%, rgba(214, 180, 93, 0.02) 55%, rgba(0, 0, 0, 0) 100%)"
            : resolvedTheme === "dark"
              ? "linear-gradient(180deg, rgba(208, 173, 85, 0.08) 0%, rgba(255, 255, 255, 0.03) 55%, rgba(0, 0, 0, 0) 100%)"
              : "linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.08) 55%, rgba(0, 0, 0, 0) 100%)",
          boxShadow: `inset 0 -1px 0 color-mix(in srgb, ${theme.bgNavBorder} 88%, transparent)`,
          WebkitBackdropFilter: "blur(34px) saturate(190%)",
          backdropFilter: "blur(34px) saturate(190%)",
        }}
      />
      <WorkflowNotice
        notice={workflowNotice}
        onClose={() => setWorkflowNotice(null)}
        theme={theme}
        readerOpen={isSpeaking || speechPaused}
      />

      <nav className="app-top-nav fixed inset-x-0 z-50 border-b px-3 pb-3 backdrop-blur-2xl sm:px-4" style={{ borderColor: theme.bgNavBorder, backgroundColor: resolvedTheme === "black"
        ? "rgba(7, 10, 8, 0.28)"
        : resolvedTheme === "dark"
          ? "rgba(14, 21, 20, 0.24)"
          : resolvedTheme === "warm"
            ? "rgba(250, 246, 241, 0.28)"
            : resolvedTheme === "ocean"
              ? "rgba(241, 246, 250, 0.28)"
              : resolvedTheme === "forest"
                ? "rgba(241, 246, 241, 0.28)"
                : resolvedTheme === "sunset"
                  ? "rgba(250, 241, 246, 0.28)"
                  : "rgba(238, 242, 239, 0.28)", top: 0 }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <button
            className="app-brand-button flex min-w-0 items-center gap-3 text-left"
            onClick={() => showView("companion")}
            aria-label={ts('labels.goToAletheiaHome', 'Go to Aletheia home')}
          >
            <div className="app-brand-logo relative size-11 shrink-0 overflow-hidden rounded-lg border shadow-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}>
              <Image
                src="/brand/aletheia-app-icon-192.png"
                alt=""
                fill
                sizes="44px"
                priority
                className="object-cover"
              />
            </div>
            <div className="app-brand-copy min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] sm:tracking-[0.22em]" style={{ color: theme.textPrimary }}>{ts('labels.appName', 'Aletheia')}</p>
              <p className="truncate text-xs" style={{ color: theme.textSecondary }}>{ts('labels.appTagline', 'Wisdom for stewardship')}</p>
            </div>
          </button>

          <div className="editorial-surface hidden items-center gap-1 rounded-lg border p-1 shadow-sm md:flex" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
            <NavButton active={activeView === "companion"} icon={Home} label={ui.nav.companion} onClick={() => showView("companion")} theme={theme} />
            <NavButton active={activeView === "decisions"} icon={FileText} label={ui.nav.decisions} onClick={() => showView("decisions")} theme={theme} />
            <NavButton active={activeView === "reflect"} icon={Feather} label={ui.nav.reflect} onClick={() => showView("reflect")} theme={theme} />
            <NavButton active={activeView === "library"} icon={BookOpen} label={ui.nav.library} onClick={() => showView("library")} theme={theme} />
            <NavButton active={activeView === "account"} icon={Users} label={ui.nav.account} onClick={() => showView("account")} theme={theme} avatarUrl={user?.avatarUrl} avatarLabel={user?.name ?? user?.email ?? ui.nav.account} />
          </div>

          <div className="flex items-center gap-2">
            {!isOnline ? (
              <span className="hidden items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium sm:inline-flex" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}>
                <WifiOff size={14} />
                {ui.offline}
              </span>
            ) : null}
            <label
              className="app-chrome-control premium-tap-card relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md border shadow-sm transition"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard, color: theme.textPrimary }}
              title={`${ui.languageSelect}: ${languages[preferences.language].nativeName}`}
              suppressHydrationWarning
            >
              <span aria-hidden="true" className="text-lg leading-none" suppressHydrationWarning>{languageFlags[preferences.language]}</span>
              <span className="sr-only">{ui.languageSelect}</span>
              <select
                value={preferences.language}
                aria-label={ui.languageSelect}
                onChange={(event) => updatePreferences(preferencePatchForLanguage(event.target.value as LanguageCode))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              >
                {Object.entries(languages).map(([code, language]) => (
                  <option key={code} value={code}>
                    {language.nativeName}
                  </option>
                ))}
              </select>
            </label>
            <label
              className="app-chrome-control premium-tap-card relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md border shadow-sm transition"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard, color: theme.textPrimary }}
              title={`${ui.bibleSelect}: ${preferences.bibleTranslation}`}
              suppressHydrationWarning
            >
              <BookOpen size={18} aria-hidden="true" />
              <span className="sr-only">{ui.bibleSelect}</span>
              <select
                value={preferences.bibleTranslation}
                aria-label={ui.bibleSelect}
                onChange={(event) => updatePreferences({ bibleTranslation: event.target.value as BibleTranslation })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              >
                {topBibleOptions.map((code) => {
                  const translation = bibleTranslations[code];
                  const languageName = languages[translation.language].nativeName;
                  return (
                    <option key={code} value={code}>
                      {languageName} · {translation.label}
                    </option>
                  );
                })}
              </select>
            </label>
            <button
              className="app-chrome-control premium-tap-card grid h-11 w-11 place-items-center rounded-md border shadow-sm transition"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard, color: theme.textPrimary }}
              aria-label={user ? ts('labels.openAccount', 'Open account') : ts('labels.openGuestDashboard', 'Open guest dashboard')}
              onClick={() => showView("companion")}
            >
              <Home size={18} />
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-5 px-3 pt-4 sm:px-4 sm:pt-5 xl:grid-cols-[280px_minmax(0,1fr)] xl:py-6" style={{ paddingBottom: "calc(var(--aletheia-bottom-nav-space, 8.5rem) + env(safe-area-inset-bottom))" }}>
        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-4">
            <section className="rounded-lg border p-4 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accentGold }}>
                <ShieldCheck size={14} />
                {ui.guardrails}
              </div>
              <ul className="space-y-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                {ui.guardrailItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border p-4 shadow-sm" style={{ borderColor: theme.borderStrong, backgroundColor: theme.primary, color: theme.textOnPrimary }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">{ui.wisdomMode}</h2>
                <Moon size={17} style={{ color: theme.textOnPrimary }} />
              </div>
              <div className="space-y-2">
                {activeModeCards.map((item) => (
                  <ModeButton key={item.label} item={item} active={mode === item.label} onClick={() => handleModeChange(item.label)} theme={theme} />
                ))}
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.borderMedium + '33', backgroundColor: theme.bgCardElevated }}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textOnPrimary }}>{ui.currentLens}</p>
                <p className="mt-2 text-sm leading-6" style={{ color: theme.textOnPrimary }}>{activeMode.intent}</p>
              </div>
            </section>
          </div>
        </aside>

        <section className="min-w-0">
          <section ref={workspaceRef} className="scroll-mt-24">
            <>
              {activeView === "companion" ? (
                <Screen key="companion">
                  <ViewIdentityFrame identity={homeSection} theme={theme}>
                    <HomeSectionTabs section={homeSection} onChange={(section) => setHomeSection(section)} ts={ts} theme={theme} />
                    {homeSection === "today" ? (
                      <HomeDashboard
                      daily={daily}
                      dailyEntry={dailyEntry}
                      currentLocalHour={currentLocalHour}
                      activeDecision={activeDecision}
                      user={user}
                      ts={ts}
                      ui={ui}
                      notificationsEnabled={notificationsEnabled}
                        todayPattern={todayPattern}
                        companionCard={todayCompanionCard}
                        carryToday={carryToday}
                        scriptureMemory={scriptureMemory}
                        weeklyReview={weeklyReview}
                        personalizationContextEmpty={!manualContextHasContent(manualContext)}
                        prioritizeToday={pendingNotificationFocus}
                        onScriptureOpen={openScripture}
                        onContinueDecision={continueDecisionFlow}
                        onReflectToday={reflectOnToday}
                        onReviewPattern={reviewPatternFlow}
                        onOpenAccount={openAccountFlow}
                        onAskOneQuestion={askOneQuestionFlow}
                        onCarryToday={carryCompanionCard}
                        onReflectCard={reflectOnCompanionCard}
                        onAskAboutCard={askAboutCompanionCard}
                        onSaveCardAsRule={saveCompanionRule}
                        onShareCard={() => shareTodayWisdomPostcard(todayCompanionCard)}
                        onShareCarryCard={shareCarryPostcard}
                        onSaveScriptureMemory={() => saveScriptureMemory(dailyEntry.scripture, dailyEntry.principle)}
                        onClearScriptureMemory={clearScriptureMemory}
                        onShareScriptureMemory={shareScriptureMemoryCard}
                        theme={theme}
                      />
                    ) : (
                      <CompanionPanel
                        ts={ts}
                        messages={messages}
                        mode={mode}
                        modeProfile={modeProfile}
                        modeCards={activeModeCards}
                        preferences={preferences}
                        copy={copy}
                        ui={ui}
                        query={query}
                        focusIntentions={focusIntentions}
                        setQuery={setQuery}
                        onAsk={handleAsk}
                        onDraftPrompt={setQuery}
                        onModeChange={handleModeChange}
                        onListen={startVoiceInput}
                        onAskQuestion={askAletheia}
                        onClearVoiceTranscript={() => setVoiceTranscriptPreview("")}
                        onSpeak={speakLatestAletheiaReply}
                        onTogglePause={toggleSpeechPause}
                        isWorking={isWorking}
                        isListening={isListening}
                        isSpeaking={isSpeaking}
                        speechPaused={speechPaused}
                        speechProgress={speechProgress}
                        answerFocusId={answerFocusId}
                        onAnswerFocused={() => setAnswerFocusId(null)}
                        onScriptureOpen={openScripture}
                        onTrackDecision={trackDecisionFromExchange}
                        onDraftReflection={draftReflectionFromExchange}
                        onCreateCounselSummary={draftCounselSummaryFromExchange}
                        onGoDeeper={goDeeperFromExchange}
                        onWait={waitFromExchange}
                        onSharePostcard={shareAnswerPostcard}
                        onShare={(channel) => shareAletheia(channel, "answer")}
                        onFeedback={(value) => recordAnswerFeedback(value, "answer")}
                        voiceTranscriptPreview={voiceTranscriptPreview}
                        theme={theme}
                      />
                    )}
                  </ViewIdentityFrame>
                </Screen>
              ) : activeView === "decisions" ? (
                <Screen key="decisions">
                  <ViewIdentityFrame identity="decisions" theme={theme}>
                    <DecisionCompanionPanel
                      language={preferences.language}
                      mode={mode}
                      modeProfile={activeMode}
                      decisions={wisdomDecisions}
                      focusedDecisionId={pendingDecisionNotificationFocus}
                      events={decisionEvents}
                      insight={timelineInsight}
                      counselContacts={counselContacts}
                      counselSummaryDraft={counselSummaryDraft}
                      setCounselSummaryDraft={setCounselSummaryDraft}
                      announceWorkflow={announceWorkflow}
                      ts={ts}
                      rules={rulesOfLife}
                      title={decisionTitle}
                      pressure={decisionPressure}
                      emotion={decisionEmotion}
                      focusIntentions={focusIntentions}
                      counselName={counselName}
                      counselRole={counselRole}
                      counselAvatarUrl={counselAvatarUrl}
                      counselContactValue={counselContactValue}
                      counselCanViewSummaries={counselCanViewSummaries}
                      counselCanComment={counselCanComment}
                      counselCanReceiveCheckins={counselCanReceiveCheckins}
                      latestCounselInvite={latestCounselInvite}
                      userSignedIn={Boolean(user)}
                      ruleText={ruleText}
                      setTitle={setDecisionTitle}
                      setPressure={setDecisionPressure}
                      setEmotion={setDecisionEmotion}
                      setCounselName={setCounselName}
                      setCounselRole={setCounselRole}
                      setCounselAvatarUrl={setCounselAvatarUrl}
                      setCounselContactValue={setCounselContactValue}
                      setCounselCanViewSummaries={setCounselCanViewSummaries}
                      setCounselCanComment={setCounselCanComment}
                      setCounselCanReceiveCheckins={setCounselCanReceiveCheckins}
                      setRuleText={setRuleText}
                      onCreateDecision={createDecision}
                      onUpdateDecision={updateDecision}
                      onDeleteDecision={deleteDecision}
                      onAddCounsel={addCounselContact}
                      onShareCounselInvite={shareCounselInvite}
                      onShareDecisionWithCounsel={shareDecisionWithCounsel}
                      onBulkShareDecisionsWithCounsel={bulkShareDecisionsWithCounsel}
                      onRemoveCounselContact={removeCounselContact}
                      onSpeakText={speakText}
                      onShareDecisionPostcard={shareDecisionPostcard}
                      isSpeaking={isSpeaking}
                      onAddRule={addRuleOfLife}
                      onScriptureOpen={openScripture}
                      theme={theme}
                    />
                  </ViewIdentityFrame>
                </Screen>
              ) : activeView === "reflect" ? (
                <Screen key="reflect">
                  <ViewIdentityFrame identity="reflect" theme={theme}>
                    <ReflectPanel
                      language={preferences.language}
                      decision={decision}
                      setDecision={setDecision}
                      emotion={emotion}
                      setEmotion={setEmotion}
                      timeframe={timeframe}
                      setTimeframe={setTimeframe}
                      result={decisionResult}
                      mode={mode}
                      modeProfile={activeMode}
                      ts={ts}
                      entries={journalEntries}
                      gratitudeEntries={gratitudeEntries}
                      title={journalTitle}
                      body={journalBody}
                      setTitle={setJournalTitle}
                      setBody={setJournalBody}
                      onSave={saveReflection}
                      onDelete={deleteJournalEntry}
                      onSaveGratitude={saveGratitudeEntry}
                      onDeleteGratitude={deleteGratitudeEntry}
                      onShareGratitudePostcard={shareGratitudePostcard}
                      onUseGratitudeAsReflection={useGratitudeAsReflectionPrompt}
                      onVoiceReflection={startVoiceReflectionMode}
                      onShareReflectionPostcard={shareReflectionPostcard}
                      todayCompanionCard={todayCompanionCard}
                      theme={theme}
                    />
                  </ViewIdentityFrame>
                </Screen>
              ) : activeView === "library" ? (
                <Screen key="library">
                  <ViewIdentityFrame identity="library" theme={theme}>
                    <LibraryPanel
                      entries={filteredEntries}
                      search={librarySearch}
                      setSearch={setLibrarySearch}
                      mode={mode}
                      preferences={preferences}
                      ts={ts}
                      onScriptureOpen={openScripture}
                      scriptureMemory={scriptureMemory}
                      onSaveScriptureMemory={saveScriptureMemory}
                      onShareScriptureMemory={shareScriptureMemoryCard}
                      theme={theme}
                    />
                  </ViewIdentityFrame>
                </Screen>
              ) : activeView === "account" ? (
                <Screen key="account">
                  <ViewIdentityFrame identity="account" theme={theme}>
                    <AccountPanel
                      ts={ts}
                      user={user}
                      authMode={authMode}
                      setAuthMode={(value) => {
                        setAuthMode(value);
                        setAuthError("");
                        setAuthNotice("");
                      }}
                      name={authName}
                      setName={setAuthName}
                      email={authEmail}
                      setEmail={setAuthEmail}
                      password={authPassword}
                      setPassword={setAuthPassword}
                      error={authError}
                      notice={authNotice}
                      authStatus={authStatus}
                      googleAuthAvailable={googleAuthAvailable}
                      status={statusMessage}
                      isWorking={isWorking}
                      onSubmit={handleAuth}
                      onGoogleSignIn={handleGoogleSignIn}
                      onLogout={logout}
                      onUpdateProfileAvatar={updateProfileAvatar}
                      preferences={preferences}
                      preferencesStatus={preferencesStatus}
                      ui={ui}
                      manualContext={manualContext}
                      manualContextStatus={manualContextStatus}
                      themePreference={themePreference}
                      onPreferenceChange={updatePreferences}
                      onThemePreferenceChange={updateThemePreference}
                      onManualContextChange={updateManualContext}
                      notificationsEnabled={notificationsEnabled}
                      notificationsConfigured={notificationsConfigured}
                      notificationAccountEnabled={notificationAccountEnabled}
                      notificationDeviceSubscribed={notificationDeviceSubscribed}
                      notificationStatus={notificationStatus}
                      notificationBusy={notificationBusy}
                      notificationTiming={notificationTiming}
                      onNotificationTimingChange={updateNotificationTiming}
                      onEnableNotifications={enableNotifications}
                      onDisableNotifications={disableNotifications}
                      messages={messages}
                      decisions={wisdomDecisions}
                      journalEntries={journalEntries}
                      counselContacts={counselContacts}
                      rulesOfLife={rulesOfLife}
                      availableVoices={availableVoices}
                      selectedVoice={selectedVoice}
                      onVoiceChange={updateVoicePreference}
                      focusIntentions={focusIntentions}
                      onFocusIntentionsChange={updateFocusIntentions}
                      onClearLocalPersonalization={clearLocalPersonalization}
                      onClearGuestWorkspace={clearGuestWorkspace}
                      onExportData={exportAccountData}
                      onRequestDeleteAccount={() => setShowDeleteAccountModal(true)}
                      onReportIssue={() => setShowReportIssueModal(true)}
                      onShare={(channel, placement) => shareAletheia(channel, placement)}
                      accountActionBusy={accountActionBusy}
                      theme={theme}
                    />
                  </ViewIdentityFrame>
                </Screen>
              ) : null}
            </>
          </section>
        </section>
      </div>

      {(isSpeaking || speechPaused) ? (
        <ReadingPlayer
          theme={theme}
          label={readingLabel}
          progress={speechProgress}
          paused={speechPaused}
          voiceName={availableVoices.find((voice) => voice.voiceURI === selectedVoice)?.name}
          onTogglePause={toggleSpeechPause}
          onStop={stopSpeech}
        />
      ) : null}

      <div ref={bottomNavRef} className="app-bottom-nav fixed left-1/2 z-40 -translate-x-1/2 overflow-hidden border shadow-[0_18px_48px_rgba(7,10,8,0.26)] md:hidden" style={{
        borderColor: theme.bgNavBorder,
        backgroundColor: resolvedTheme === "black"
          ? "rgba(7, 10, 8, 0.68)"
          : resolvedTheme === "dark"
            ? "rgba(14, 21, 20, 0.66)"
            : resolvedTheme === "warm"
              ? "rgba(250, 246, 241, 0.62)"
              : resolvedTheme === "ocean"
                ? "rgba(241, 246, 250, 0.62)"
                : resolvedTheme === "forest"
                  ? "rgba(241, 246, 241, 0.62)"
                  : resolvedTheme === "sunset"
                    ? "rgba(250, 241, 246, 0.62)"
                    : "rgba(238, 242, 239, 0.62)",
        width: "var(--aletheia-bottom-nav-width, min(calc(100vw - 1.5rem), 28rem))",
        bottom: "calc(var(--aletheia-bottom-nav-gap, 0.75) * 1rem + env(safe-area-inset-bottom))",
        borderRadius: "calc(var(--aletheia-bottom-nav-radius, 1.75) * 1rem)",
        padding: "calc(var(--aletheia-bottom-nav-pad-y, 0.6) * 1rem) calc(var(--aletheia-bottom-nav-pad-x, 0.85) * 1rem)",
      }}>
        <div className="grid grid-cols-5 gap-1">
          <MobileNav active={activeView === "companion"} icon={Home} label={ui.nav.companion} onClick={() => showView("companion")} theme={theme} />
          <MobileNav active={activeView === "decisions"} icon={FileText} label={ui.decideShort} onClick={() => showView("decisions")} theme={theme} />
          <MobileNav active={activeView === "reflect"} icon={Feather} label={ui.nav.reflect} onClick={() => showView("reflect")} theme={theme} />
          <MobileNav active={activeView === "library"} icon={BookOpen} label={ui.nav.library} onClick={() => showView("library")} theme={theme} />
          <MobileNav active={activeView === "account"} icon={Users} label={ui.nav.account} onClick={() => showView("account")} theme={theme} avatarUrl={user?.avatarUrl} avatarLabel={user?.name ?? user?.email ?? ui.nav.account} />
        </div>
      </div>

      <OnboardingModal
        open={showOnboarding}
        mode={mode}
        modeCards={activeModeCards}
        preferences={preferences}
        ts={ts}
        concern={onboardingConcern}
        setConcern={setOnboardingConcern}
        tone={onboardingTone}
        setTone={setOnboardingTone}
        faithFamiliarity={faithFamiliarity}
        setFaithFamiliarity={setFaithFamiliarity}
        privacyLevel={onboardingPrivacyLevel}
        setPrivacyLevel={setOnboardingPrivacyLevel}
        focusIntentions={focusIntentions}
        onFocusIntentionsChange={updateFocusIntentions}
        notificationsEnabled={notificationsEnabled}
        onModeChange={handleModeChange}
        onPreferenceChange={updatePreferences}
        onComplete={completeOnboarding}
        theme={theme}
      />
      <CounselInviteModal
        theme={theme}
        token={counselInviteToken}
        preview={counselInvitePreview}
        status={counselInviteStatus}
        ts={ts}
        onAccept={acceptCounselInvite}
        onComment={addCounselInviteComment}
        onClose={() => {
          setCounselInviteToken(null);
          setCounselInvitePreview(null);
          setCounselInviteStatus("");
        }}
      />
      <CounselRemovalConfirmModal
        key={counselRemovalPrompt?.contactId ?? "none"}
        theme={theme}
        ts={ts}
        pending={counselRemovalPrompt}
        isWorking={isRemovingCounselContact}
        onCancel={() => setCounselRemovalPrompt(null)}
        onConfirm={confirmCounselContactRemoval}
      />
      <ScriptureModal
        theme={theme}
        scripture={selectedScripture}
        preferences={preferences}
        ts={ts}
        onReadAloud={() => {
          if (!selectedScripture) {
            return;
          }
          const quickRead = localizedScriptureRead(selectedScripture, preferences);
          speakText(
            `${selectedScripture}. ${cleanDisplayText(quickRead.text)}`,
            ts('labels.readingScriptureQuickRead', 'Aletheia is reading the scripture quick read aloud.'),
            quickRead.label
          );
        }}
        onClose={() => setSelectedScripture(null)}
      />
      <DeleteAccountModal
        open={showDeleteAccountModal}
        theme={theme}
        ts={ts}
        user={user}
        isWorking={accountActionBusy === "delete"}
        onCancel={() => setShowDeleteAccountModal(false)}
        onConfirm={deleteAccount}
      />
      <ReportIssueModal
        open={showReportIssueModal}
        theme={theme}
        ts={ts}
        isWorking={accountActionBusy === "report"}
        onCancel={() => setShowReportIssueModal(false)}
        onSubmit={reportIssue}
      />

      <AnimatePresence>
        {isRefreshingForUpdate ? (
          <motion.div
            key="app-update-refresh-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[120]"
            style={{
              background: resolvedTheme === "black"
                ? "radial-gradient(circle at 20% 10%, rgba(214, 180, 93, 0.24), rgba(0, 0, 0, 0) 52%), linear-gradient(140deg, rgba(7, 10, 8, 0.96), rgba(10, 15, 12, 0.94))"
                : resolvedTheme === "dark"
                  ? "radial-gradient(circle at 20% 10%, rgba(208, 173, 85, 0.24), rgba(0, 0, 0, 0) 52%), linear-gradient(140deg, rgba(14, 21, 20, 0.95), rgba(18, 28, 25, 0.92))"
                  : "radial-gradient(circle at 20% 10%, rgba(74, 118, 105, 0.25), rgba(238, 242, 239, 0) 52%), linear-gradient(140deg, rgba(238, 242, 239, 0.95), rgba(226, 236, 231, 0.92))",
              backdropFilter: "blur(14px) saturate(130%)",
              WebkitBackdropFilter: "blur(14px) saturate(130%)",
            }}
            role="status"
            aria-live="polite"
          >
            <div className="flex h-full items-center justify-center px-6">
              <motion.div
                initial={{ y: 10, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className="w-full max-w-sm rounded-3xl border px-7 py-8 text-center shadow-[0_28px_80px_rgba(12,20,16,0.26)]"
                style={{
                  borderColor: theme.borderStrong,
                  backgroundColor: resolvedTheme === "black"
                    ? "rgba(8, 12, 10, 0.86)"
                    : resolvedTheme === "dark"
                      ? "rgba(17, 27, 24, 0.84)"
                      : "rgba(245, 250, 247, 0.84)",
                }}
              >
                <motion.div
                  className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border"
                  style={{ borderColor: theme.borderStrong, backgroundColor: theme.bgCardElevated }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.6, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
                >
                  <div className="relative h-14 w-14 overflow-hidden rounded-xl">
                    <Image
                      src="/brand/aletheia-app-icon-192.png"
                      alt="Aletheia"
                      fill
                      sizes="56px"
                      className="object-cover"
                      priority
                    />
                  </div>
                </motion.div>
                <p className="text-[0.69rem] font-semibold uppercase tracking-[0.24em]" style={{ color: theme.textSecondary }}>
                  Aletheia
                </p>
                <p className="mt-1 text-sm" style={{ color: theme.textSecondary }}>
                  Wisdom for stewardship
                </p>
                <p className="mt-4 text-base font-semibold" style={{ color: theme.textPrimary }}>
                  App updated, refreshing...
                </p>
                <motion.div
                  className="mx-auto mt-4 h-1.5 w-28 overflow-hidden rounded-full"
                  style={{ backgroundColor: theme.borderMedium }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: theme.borderStrong }}
                    animate={{ x: ["-100%", "120%"] }}
                    transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  />
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function MobileNav({
  active,
  icon: Icon,
  label,
  onClick,
  theme,
  avatarUrl,
  avatarLabel,
}: {
  active: boolean;
  icon: typeof Home;
  label: string;
  onClick: () => void;
  theme: ThemeColors;
  avatarUrl?: string | null;
  avatarLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-[1.1rem] px-1 text-[10px] font-semibold transition duration-200 sm:text-[11px]"
      style={{
        backgroundColor: active ? theme.primary : "transparent",
        color: active ? theme.textOnPrimary : theme.textSecondary,
      }}
      aria-current={active ? "page" : undefined}
    >
      {avatarUrl ? (
        <AvatarCircle
          avatarUrl={avatarUrl}
          seed={avatarLabel ?? label}
          label={avatarLabel ?? label}
          size={18}
          className="size-[18px] rounded-full border object-cover"
        />
      ) : (
        <Icon size={17} />
      )}
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

function ViewIdentityFrame({ identity, theme, children }: { identity: ViewIdentity; theme: ThemeColors; children: React.ReactNode }) {
  const accent = viewIdentityAccent(identity, theme);
  const isQuiet = identity === "reflect";
  const isStructured = identity === "decisions" || identity === "account";

  return (
    <div
      className={`relative min-w-0 overflow-hidden rounded-2xl border p-2 shadow-[0_20px_60px_rgba(14,21,20,0.08)] sm:p-3 ${isStructured ? "lg:p-4" : ""}`}
      style={{
        borderColor: `color-mix(in srgb, ${accent} 38%, ${theme.borderLight})`,
        backgroundColor: `color-mix(in srgb, ${theme.bgCard} ${isQuiet ? "78%" : "84%"}, ${accent} ${isQuiet ? "22%" : "16%"})`,
        backgroundImage: viewIdentityBackground(identity, theme, accent),
      }}
      data-view-personality={identity}
    >
      <div
        className="pointer-events-none absolute inset-x-4 top-0 h-px opacity-80"
        style={{ backgroundColor: `color-mix(in srgb, ${accent} 58%, transparent)` }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-4 left-0 top-4 hidden w-1 rounded-r-full sm:block"
        style={{ backgroundColor: `color-mix(in srgb, ${accent} 68%, transparent)` }}
        aria-hidden="true"
      />
      <ViewIdentityMark identity={identity} theme={theme} accent={accent} />
      <div className="relative z-10 min-w-0">{children}</div>
    </div>
  );
}

function viewIdentityAccent(identity: ViewIdentity, theme: ThemeColors) {
  switch (identity) {
    case "ask":
      return theme.primary;
    case "decisions":
      return "#7a6234";
    case "reflect":
      return "#7b8c78";
    case "library":
      return "#4f7188";
    case "account":
      return "#6f6a78";
    default:
      return theme.accentGold;
  }
}

function viewIdentityBackground(identity: ViewIdentity, theme: ThemeColors, accent: string) {
  const softAccent = `color-mix(in srgb, ${accent} 18%, transparent)`;
  const lineAccent = `color-mix(in srgb, ${accent} 13%, transparent)`;

  switch (identity) {
    case "ask":
      return `radial-gradient(circle at 6% 8%, ${softAccent}, transparent 34%), linear-gradient(135deg, transparent 0 64%, ${lineAccent} 64% 65%, transparent 65% 100%)`;
    case "decisions":
      return `linear-gradient(90deg, ${lineAccent} 0 1px, transparent 1px 100%), linear-gradient(180deg, ${lineAccent} 0 1px, transparent 1px 100%)`;
    case "reflect":
      return `radial-gradient(circle at 12% 12%, ${softAccent}, transparent 38%), radial-gradient(circle at 88% 0%, color-mix(in srgb, ${theme.bgInput} 56%, transparent), transparent 30%)`;
    case "library":
      return `repeating-linear-gradient(0deg, transparent 0 28px, ${lineAccent} 28px 29px), radial-gradient(circle at 92% 12%, ${softAccent}, transparent 34%)`;
    case "account":
      return `linear-gradient(90deg, ${lineAccent} 0 1px, transparent 1px 100%), radial-gradient(circle at 92% 10%, ${softAccent}, transparent 34%)`;
    default:
      return `radial-gradient(circle at 9% 6%, ${softAccent}, transparent 36%), linear-gradient(180deg, color-mix(in srgb, ${theme.bgInput} 42%, transparent), transparent 42%)`;
  }
}

function ViewIdentityMark({ identity, theme, accent }: { identity: ViewIdentity; theme: ThemeColors; accent: string }) {
  const commonStyle = {
    borderColor: `color-mix(in srgb, ${accent} 36%, ${theme.borderLight})`,
    backgroundColor: `color-mix(in srgb, ${theme.bgInput} 76%, ${accent} 24%)`,
  };

  if (identity === "ask") {
    return (
      <div className="pointer-events-none absolute right-4 top-4 hidden items-end gap-1 opacity-70 sm:flex" aria-hidden="true">
        <span className="h-7 w-12 rounded-lg border" style={commonStyle} />
        <span className="h-10 w-10 rounded-full border" style={commonStyle} />
      </div>
    );
  }

  if (identity === "decisions") {
    return (
      <div className="pointer-events-none absolute right-5 top-4 hidden h-20 w-20 opacity-70 sm:block" aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <span key={item} className="absolute left-1/2 size-3 -translate-x-1/2 rounded-full border" style={{ ...commonStyle, top: `${item * 1.75}rem` }} />
        ))}
        <span className="absolute bottom-2 left-1/2 top-1 w-px -translate-x-1/2" style={{ backgroundColor: `color-mix(in srgb, ${accent} 42%, transparent)` }} />
      </div>
    );
  }

  if (identity === "reflect") {
    return (
      <div className="pointer-events-none absolute right-4 top-4 hidden size-20 rounded-full border opacity-60 sm:block" style={commonStyle} aria-hidden="true">
        <span className="absolute inset-4 rounded-full border" style={{ borderColor: `color-mix(in srgb, ${accent} 28%, transparent)` }} />
      </div>
    );
  }

  if (identity === "library") {
    return (
      <div className="pointer-events-none absolute right-4 top-4 hidden w-24 space-y-2 opacity-70 sm:block" aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <span key={item} className="block h-3 rounded-sm border" style={commonStyle} />
        ))}
      </div>
    );
  }

  if (identity === "account") {
    return (
      <div className="pointer-events-none absolute right-4 top-4 hidden grid-cols-2 gap-1 opacity-70 sm:grid" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <span key={item} className="size-5 rounded-sm border" style={commonStyle} />
        ))}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute right-4 top-4 hidden items-center gap-1 opacity-70 sm:flex" aria-hidden="true">
      <span className="h-12 w-4 rounded-full border" style={commonStyle} />
      <span className="h-16 w-4 rounded-full border" style={commonStyle} />
      <span className="h-9 w-4 rounded-full border" style={commonStyle} />
    </div>
  );
}

function NavButton({
  active,
  icon: Icon,
  label,
  onClick,
  theme,
  avatarUrl,
  avatarLabel,
}: {
  active: boolean;
  icon: typeof Home;
  label: string;
  onClick: () => void;
  theme: ThemeColors;
  avatarUrl?: string | null;
  avatarLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="premium-tap-card inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold transition"
      style={{
        backgroundColor: active ? theme.primary : 'transparent',
        color: active ? theme.textOnPrimary : theme.textSecondary,
      }}
      onMouseEnter={(e) => !active && (e.currentTarget.style.backgroundColor = theme.hoverBg)}
      onMouseLeave={(e) => !active && (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {avatarUrl ? (
        <AvatarCircle
          avatarUrl={avatarUrl}
          seed={avatarLabel ?? label}
          label={avatarLabel ?? label}
          size={18}
          className="size-[18px] rounded-full border object-cover"
        />
      ) : (
        <Icon size={15} />
      )}
      {label}
    </button>
  );
}

function ReadingPlayer({
  theme,
  label,
  progress,
  paused,
  voiceName,
  onTogglePause,
  onStop,
}: {
  theme: ThemeColors;
  label: string;
  progress: number;
  paused: boolean;
  voiceName?: string;
  onTogglePause: () => void;
  onStop: () => void;
}) {
  const safeProgress = Math.min(100, Math.max(0, progress || 0));
  return (
    <section
      className="fixed inset-x-3 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-[55] mx-auto max-w-2xl rounded-xl border p-3 shadow-2xl backdrop-blur-xl md:bottom-5"
      style={{
        borderColor: theme.borderStrong,
        backgroundColor: theme.bgCard,
        color: theme.textPrimary,
      }}
      aria-label="Reading player"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-md" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
          <Volume2 size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{label}</p>
              <p className="truncate text-xs" style={{ color: theme.textSecondary }}>
                {voiceName ? `Reading with ${voiceName}` : "Reading with device voice"}
              </p>
            </div>
            <span className="text-xs font-semibold" style={{ color: theme.textMuted }}>
              {safeProgress}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: theme.borderLight }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${safeProgress}%`, backgroundColor: theme.accentGold }} />
          </div>
        </div>
        <button
          type="button"
          onClick={onTogglePause}
          className="grid size-10 shrink-0 place-items-center rounded-md border transition"
          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
          aria-label={paused ? "Resume reading" : "Pause reading"}
        >
          {paused ? <Play size={17} /> : <Pause size={17} />}
        </button>
        <button
          type="button"
          onClick={onStop}
          className="grid size-10 shrink-0 place-items-center rounded-md border transition"
          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
          aria-label="Stop reading"
        >
          <X size={17} />
        </button>
      </div>
      <p className="mt-2 text-xs leading-5" style={{ color: theme.textMuted }}>
        Browser reading may pause if the app is minimized. A future generated-audio mode can use this same player for background playback.
      </p>
    </section>
  );
}

function ModeButton({ item, active, onClick, theme }: { item: (typeof modes)[number]; active: boolean; onClick: () => void; theme: ThemeColors }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-md border p-3 text-left transition"
      style={{
        borderColor: active ? theme.accentLight : theme.borderMedium + '40',
        backgroundColor: active ? theme.bgCardElevated : theme.borderMedium + '15',
        color: active ? theme.textPrimary : theme.textOnPrimary,
      }}
      onMouseEnter={(e) => !active && (e.currentTarget.style.backgroundColor = theme.hoverBg)}
      onMouseLeave={(e) => !active && (e.currentTarget.style.backgroundColor = theme.borderMedium + '15')}
    >
      <item.icon className="mt-0.5 shrink-0" size={17} style={{ color: active ? theme.accentGold : theme.textOnPrimary }} />
      <span>
        <span className="block text-sm font-semibold">{item.displayLabel ?? item.label}</span>
        <span className="mt-1 block text-xs leading-5" style={{ color: active ? theme.textSecondary : theme.textOnPrimary, opacity: active ? 1 : 0.88 }}>{item.copy}</span>
      </span>
    </button>
  );
}

function ModeLensCard({ item, active, onClick, theme }: { item: (typeof modes)[number]; active: boolean; onClick: () => void; theme: ThemeColors }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="premium-tap-card flex min-h-24 w-[12.75rem] shrink-0 snap-start flex-col justify-between rounded-xl border p-2.5 text-left shadow-sm transition hover:-translate-y-0.5 sm:w-[13.5rem]"
      style={{
        borderColor: active ? theme.primary : theme.borderLight,
        backgroundColor: active ? theme.primary : theme.bgCard,
        color: active ? theme.textOnPrimary : theme.textPrimary,
        boxShadow: active ? "0 12px 26px rgba(7, 10, 8, 0.16)" : "0 6px 14px rgba(7, 10, 8, 0.05)",
      }}
      onMouseEnter={(e) => !active && (e.currentTarget.style.borderColor = theme.primary) && (e.currentTarget.style.backgroundColor = theme.bgCardElevated)}
      onMouseLeave={(e) => !active && (e.currentTarget.style.borderColor = theme.borderLight) && (e.currentTarget.style.backgroundColor = theme.bgCard)}
    >
      <span className="flex items-start justify-between gap-3">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-md"
          style={{
            backgroundColor: active ? 'rgba(255,255,255,0.14)' : theme.bgInput,
            color: active ? theme.textOnPrimary : theme.textPrimary,
          }}
        >
          <item.icon size={16} />
        </span>
        <span className="grid size-7 place-items-center rounded-full border" style={{ borderColor: active ? 'rgba(255,255,255,0.32)' : theme.borderLight, color: active ? theme.textOnPrimary : theme.textMuted, backgroundColor: active ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
          {active ? <Check size={14} /> : <span className="size-1.5 rounded-full" style={{ backgroundColor: theme.borderMedium }} />}
        </span>
      </span>
      <span className="mt-2 min-w-0">
        <span className="block text-sm font-semibold">{item.displayLabel ?? item.label}</span>
        <span className="mt-1 block line-clamp-2 text-[11px] leading-4" style={{ color: active ? theme.textOnPrimary : theme.textSecondary, opacity: active ? 0.92 : 1 }}>{item.copy}</span>
      </span>
    </button>
  );
}

function WorkflowNotice({
  notice,
  onClose,
  theme,
  readerOpen,
}: {
  notice: WorkflowNoticeState | null;
  onClose: () => void;
  theme: ThemeColors;
  readerOpen: boolean;
}) {
  if (!notice) {
    return null;
  }

  const getToneColors = (tone: WorkflowTone) => {
    switch (tone) {
      case "success":
        return { border: theme.primary, bg: theme.bgCard, text: theme.textPrimary };
      case "warning":
        return { border: theme.accentGold, bg: theme.bgCard, text: theme.textPrimary };
      case "error":
        return { border: "#b85d45", bg: theme.bgCard, text: theme.textPrimary };
      default: // info
        return { border: theme.borderMedium, bg: theme.bgCard, text: theme.textPrimary };
    }
  };

  const colors = getToneColors(notice.tone);

  return (
    <div
      className="fixed inset-x-3 z-50 md:bottom-auto md:left-auto md:right-4 md:top-24 md:w-[360px]"
      style={{
        top: `calc(max(env(safe-area-inset-top, 0px), var(--aletheia-top-reserve, 0px)) + ${readerOpen ? "6.5rem" : "5rem"})`,
      }}
      role="status"
      aria-live="polite"
    >
      <div className="rounded-xl border p-4 shadow-xl backdrop-blur" style={{ borderColor: colors.border, backgroundColor: colors.bg, color: colors.text }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{notice.title}</p>
            <p className="mt-1 text-sm leading-6 opacity-85">{notice.body}</p>
            {notice.action ? (
              <button
                type="button"
                onClick={() => {
                  notice.action!.onClick();
                  onClose();
                }}
                className="mt-3 h-11 rounded-md px-4 text-xs font-semibold transition"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                {notice.action.label}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-md border transition"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            aria-label="Dismiss workflow notice"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function uint8ArrayToUrlBase64(value: ArrayBuffer | Uint8Array | null | undefined) {
  if (!value) {
    return "";
  }
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pushSubscriptionUsesPublicKey(subscription: PushSubscription, publicKey: string) {
  const options = subscription.options as PushSubscriptionOptions & { applicationServerKey?: ArrayBuffer | null };
  return uint8ArrayToUrlBase64(options.applicationServerKey) === publicKey.replace(/=+$/, "");
}

function OnboardingModal({
  open,
  mode,
  modeCards,
  preferences,
  ts,
  concern,
  setConcern,
  tone,
  setTone,
  faithFamiliarity,
  setFaithFamiliarity,
  privacyLevel,
  setPrivacyLevel,
  focusIntentions,
  onFocusIntentionsChange,
  notificationsEnabled,
  onModeChange,
  onPreferenceChange,
  onComplete,
  theme,
}: {
  open: boolean;
  mode: Mode;
  modeCards: ModeCard[];
  preferences: UserPreferences;
  ts: (key: string, fallback?: string) => string;
  concern: string;
  setConcern: (value: string) => void;
  tone: string;
  setTone: (value: string) => void;
  faithFamiliarity: string;
  setFaithFamiliarity: (value: string) => void;
  privacyLevel: string;
  setPrivacyLevel: (value: string) => void;
  focusIntentions: string[];
  onFocusIntentionsChange: (intentions: string[]) => void;
  notificationsEnabled: boolean;
  onModeChange: (mode: Mode) => void;
  onPreferenceChange: (patch: Partial<UserPreferences>) => void;
  onComplete: () => void;
  theme: ThemeColors;
}) {
  const [activeSetupStep, setActiveSetupStep] = useState("mode");
  const modalScrollRef = useRef<HTMLElement | null>(null);
  const onboardingTouchRef = useRef<{ x: number; y: number } | null>(null);
  const modeSectionRef = useRef<HTMLElement | null>(null);
  const toneSectionRef = useRef<HTMLElement | null>(null);
  const languageSectionRef = useRef<HTMLElement | null>(null);
  const focusSectionRef = useRef<HTMLElement | null>(null);
  const privacySectionRef = useRef<HTMLElement | null>(null);
  const scrollToSetupStep = useCallback((key: string, ref: RefObject<HTMLElement | null>) => {
    setActiveSetupStep(key);
    const target = ref.current;
    const container = modalScrollRef.current;
    if (!target || !container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    container.scrollTo({
      top: Math.max(0, container.scrollTop + targetRect.top - containerRect.top - 76),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, []);
  const routeOnboardingWheel = useCallback((event: WheelEvent<HTMLElement>) => {
    const container = modalScrollRef.current;
    if (!container) {
      return;
    }
    event.preventDefault();
    container.scrollBy({ left: event.deltaX, top: event.deltaY, behavior: "auto" });
  }, []);
  const rememberOnboardingTouch = useCallback((event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    onboardingTouchRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }, []);
  const routeOnboardingTouch = useCallback((event: TouchEvent<HTMLElement>) => {
    const container = modalScrollRef.current;
    const previous = onboardingTouchRef.current;
    const touch = event.touches[0];
    if (!container || !previous || !touch) {
      return;
    }

    const deltaX = previous.x - touch.clientX;
    const deltaY = previous.y - touch.clientY;
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      event.preventDefault();
      container.scrollBy({ left: deltaX, top: deltaY, behavior: "auto" });
    }
    onboardingTouchRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);
  const clearOnboardingTouch = useCallback(() => {
    onboardingTouchRef.current = null;
  }, []);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyTouchAction = body.style.touchAction;
    const previousHtmlOverscroll = documentElement.style.overscrollBehavior;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyLeft = body.style.left;
    const previousBodyRight = body.style.right;
    const previousBodyWidth = body.style.width;
    const scrollY = window.scrollY;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    body.style.touchAction = "none";
    documentElement.style.overscrollBehavior = "none";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.touchAction = previousBodyTouchAction;
      documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.left = previousBodyLeft;
      body.style.right = previousBodyRight;
      body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const bibleOptions = bibleTranslationOptionsForLanguage(preferences.language);
  const selectedTranslation = bibleTranslations[preferences.bibleTranslation];
  const setupSteps = [
    { key: "mode", label: ts('labels.setupStepMode', 'Mode'), ref: modeSectionRef },
    { key: "tone", label: ts('labels.setupStepTone', 'Tone'), ref: toneSectionRef },
    { key: "language", label: ts('labels.setupStepLanguage', 'Language'), ref: languageSectionRef },
    { key: "focus", label: ts('labels.setupStepFocus', 'Focus'), ref: focusSectionRef },
    { key: "privacy", label: ts('labels.setupStepPrivacy', 'Privacy'), ref: privacySectionRef },
  ];
  const privacyOptions = [
    {
      key: "minimal",
      label: ts('labels.privacyLevelMinimal', 'Minimal'),
      body: ts('labels.privacyLevelMinimalBody', 'Use only your language, Bible translation, and selected wisdom mode.'),
    },
    {
      key: "guided",
      label: ts('labels.privacyLevelGuided', 'Guided'),
      body: ts('labels.privacyLevelGuidedBody', 'Let Aletheia nudge you to add one helpful detail when it would improve counsel.'),
    },
    {
      key: "contextual",
      label: ts('labels.privacyLevelContextual', 'Contextual'),
      body: ts('labels.privacyLevelContextualBody', 'Use the Manual Context Vault later for more personalized guidance.'),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 grid min-w-0 place-items-end overflow-hidden overscroll-none p-3 backdrop-blur-sm sm:place-items-center"
      style={{
        backgroundColor: theme.primary + '75',
        paddingTop: "calc(max(env(safe-area-inset-top, 0px), var(--aletheia-top-reserve, 20px)) + 0.75rem)",
        paddingBottom: "calc(max(env(safe-area-inset-bottom, 0px), var(--aletheia-bottom-reserve, 12px)) + 0.75rem)",
      }}
    >
      <section
        ref={modalScrollRef}
        onWheel={routeOnboardingWheel}
        onTouchStart={rememberOnboardingTouch}
        onTouchMove={routeOnboardingTouch}
        onTouchEnd={clearOnboardingTouch}
        onTouchCancel={clearOnboardingTouch}
        className="editorial-surface box-border max-h-[92vh] min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain rounded-xl border p-4 shadow-2xl [touch-action:pan-y] sm:p-5"
        style={{
          borderColor: theme.borderLight,
          backgroundColor: theme.bgCard,
          maxHeight: "calc(100dvh - max(env(safe-area-inset-top, 0px), var(--aletheia-top-reserve, 20px)) - max(env(safe-area-inset-bottom, 0px), var(--aletheia-bottom-reserve, 12px)) - 1.5rem)",
          width: "min(100%, calc(100vw - 1.5rem), 42rem)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="max-w-2xl rounded-xl border p-4 shadow-sm" style={{ borderColor: theme.borderLight, background: `linear-gradient(180deg, ${theme.bgCardElevated}, ${theme.bgCard})` }}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.beginQuietly', 'Begin quietly')}</p>
            <h2 className="mt-2 text-2xl font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.onboardingTitle', 'Make Aletheia feel like it knows your context.')}</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
              {ts('labels.chooseLensAndSettings', 'Choose the lens and settings for your first few sessions. You can change everything later in Account.')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}>
                5 {ts('labels.setupSteps', 'steps')}
              </span>
              <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                {ts('labels.appLikeSetup', 'App-like setup')}
              </span>
              <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                {ts('labels.changeLaterInAccount', 'Change later in Account')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onComplete}
            className="grid size-9 shrink-0 place-items-center rounded-md border transition"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}
            aria-label={ts('labels.closeOnboarding', 'Close onboarding')}
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <nav
            aria-label={ts('labels.onboardingSetupNav', 'Onboarding setup steps')}
            className="sticky top-0 z-20 -mx-4 overflow-x-auto px-4 pb-2 pt-2 backdrop-blur-xl sm:-mx-5 sm:px-5"
            style={{ backgroundColor: theme.bgCard }}
          >
            <div className="flex min-w-max gap-1 rounded-xl border p-1 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
              {setupSteps.map((step) => {
                const active = activeSetupStep === step.key;
                return (
              <button
                key={step.key}
                type="button"
                onClick={() => scrollToSetupStep(step.key, step.ref)}
                className="min-h-10 rounded-md px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] transition sm:text-xs"
                style={{
                  backgroundColor: active ? theme.activeBg : "transparent",
                  color: active ? theme.textPrimary : theme.textSecondary,
                }}
                aria-current={active ? "step" : undefined}
              >
                <span className="whitespace-nowrap">{step.label}</span>
              </button>
                );
              })}
            </div>
          </nav>

          <section ref={modeSectionRef} tabIndex={-1} className="scroll-mt-4 outline-none">
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{ts('labels.setupStepMode', 'Mode')}</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.whatBringsYou', 'What brings you here?')}</p>
            <div className="mt-2 grid min-w-0 grid-cols-2 gap-2">
              {modeCards.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => onModeChange(item.label)}
                  className="premium-tap-card flex min-w-0 items-start gap-2 rounded-lg border p-3 text-left transition"
                  style={mode === item.label
                    ? { borderColor: theme.primary, backgroundColor: theme.primary, color: theme.textOnPrimary }
                    : { borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}
                >
                  <item.icon className="mt-0.5 shrink-0" size={16} style={{ color: mode === item.label ? 'rgba(255, 255, 255, 0.95)' : theme.textPrimary }} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.displayLabel ?? item.label}</span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-5 opacity-85 break-words">{item.copy}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section ref={toneSectionRef} tabIndex={-1} className="scroll-mt-4 rounded-lg border p-3 outline-none" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{ts('labels.setupStepTone', 'Tone')}</p>
            <label className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
              {ts('labels.seekingWisdomFor', 'What are you seeking wisdom for?')}
              <textarea
                value={concern}
                onChange={(event) => setConcern(event.target.value)}
                className="mt-2 min-h-20 w-full resize-none rounded-md border px-3 py-2 text-sm leading-6 outline-none"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                placeholder={ts('placeholders.decisionExample', 'Money stress, a career decision, generosity pressure...')}
              />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>
                {ts('labels.tone', 'Tone')}
                <select
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  className="mt-2 h-10 w-full rounded-md border px-3 text-sm normal-case tracking-normal outline-none"
                  style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                >
                  <option value="gentle">{ts('labels.toneGentle', 'Gentle')}</option>
                  <option value="direct">{ts('labels.toneDirect', 'Direct')}</option>
                  <option value="strategic">{ts('labels.toneStrategic', 'Strategic')}</option>
                  <option value="reflective">{ts('labels.toneReflective', 'Reflective')}</option>
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>
                {ts('labels.faithFamiliarity', 'Faith familiarity')}
                <select
                  value={faithFamiliarity}
                  onChange={(event) => setFaithFamiliarity(event.target.value)}
                  className="mt-2 h-10 w-full rounded-md border px-3 text-sm normal-case tracking-normal outline-none"
                  style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                >
                  <option value="new">{ts('labels.familiarityNew', 'New to biblical wisdom')}</option>
                  <option value="familiar">{ts('labels.familiarityFamiliar', 'Familiar')}</option>
                  <option value="deep">{ts('labels.familiarityDeep', 'Deeply familiar')}</option>
                </select>
              </label>
            </div>
          </section>

          <section ref={languageSectionRef} tabIndex={-1} className="scroll-mt-4 grid gap-3 rounded-lg border p-3 outline-none sm:grid-cols-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
            <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>
              {ts('language', 'Language')}
              <select
                value={preferences.language}
                onChange={(event) => onPreferenceChange(preferencePatchForLanguage(event.target.value as LanguageCode))}
                className="mt-2 h-10 w-full rounded-md border px-3 text-sm normal-case tracking-normal outline-none"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              >
                {Object.entries(languages).map(([code, language]) => (
                  <option key={code} value={code}>
                    {language.nativeName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>
              {ts('bible', 'Bible')}
              <select
                value={preferences.bibleTranslation}
                onChange={(event) => onPreferenceChange({ bibleTranslation: event.target.value as BibleTranslation })}
                className="mt-2 h-10 w-full rounded-md border px-3 text-sm normal-case tracking-normal outline-none"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              >
                {bibleOptions.map((code) => {
                  const translation = bibleTranslations[code];
                  const languageName = languages[translation.language].nativeName;
                  return (
                  <option key={code} value={code}>
                    {languageName} · {translation.label}
                  </option>
                  );  
                })}
              </select>
              <span className="mt-1 block text-[11px] normal-case leading-4 tracking-normal" style={{ color: theme.textSecondary }}>
                {selectedTranslation?.note}
              </span>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>
              {ts('region', 'Region')}
              <select
                value={preferences.region}
                onChange={(event) => onPreferenceChange({ region: event.target.value as RegionCode })}
                className="mt-2 h-10 w-full rounded-md border px-3 text-sm normal-case tracking-normal outline-none"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              >
                {Object.entries(regions).map(([code, region]) => (
                  <option key={code} value={code}>
                    {region.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section ref={focusSectionRef} tabIndex={-1} className="scroll-mt-4 outline-none">
            <FocusIntentionsCard
              theme={theme}
              ts={ts}
              selected={focusIntentions}
              onChange={onFocusIntentionsChange}
            />
          </section>

          <section ref={privacySectionRef} tabIndex={-1} className="scroll-mt-4 rounded-lg border p-3 outline-none" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{ts('labels.setupStepPrivacy', 'Privacy')}</p>
            <h3 className="mt-1 text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.privacyLevelTitle', 'Choose how personal Aletheia should feel at first.')}</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {privacyOptions.map((option) => {
                const active = privacyLevel === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setPrivacyLevel(option.key)}
                    className="rounded-md border p-3 text-left transition"
                    style={{
                      borderColor: active ? theme.accentGold : theme.borderMedium,
                      backgroundColor: active ? theme.activeBg : theme.bgInput,
                      color: theme.textPrimary,
                    }}
                    aria-pressed={active}
                  >
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="mt-1 block text-xs leading-5" style={{ color: theme.textSecondary }}>{option.body}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
            <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.accountNotice', 'Account and notifications live in Account tab.')}</p>
            <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>
              {ts('labels.accountNoticeBody', 'After you enter Aletheia, use the Account tab to sign in, sync your history, and turn on daily wisdom notifications.')}
            </p>
            <p className="mt-2 text-xs leading-5" style={{ color: theme.textSecondary }}>
              {notificationsEnabled ? ts('labels.notificationsAlreadyEnabledDevice', 'Notifications are already enabled on this device.') : ts('labels.notificationsOptionalAfterSignIn', 'Notifications are optional and can be enabled only after sign-in.')}
            </p>
          </section>

          <InstallGuideCard theme={theme} compact />
        </div>

        <button
          type="button"
          onClick={onComplete}
          className="mt-5 h-11 w-full rounded-md px-4 text-sm font-semibold shadow-lg"
          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
        >
          {ts('labels.enterAletheia', 'Enter Aletheia')}
        </button>
      </section>
    </div>
  );
}

function HomeDashboard({
  ts,
  daily,
  dailyEntry,
  currentLocalHour,
  activeDecision,
  user,
  ui,
  notificationsEnabled,
  todayPattern,
  companionCard,
  carryToday,
  scriptureMemory,
  weeklyReview,
  personalizationContextEmpty,
  prioritizeToday,
  onScriptureOpen,
  onContinueDecision,
  onReflectToday,
  onReviewPattern,
  onOpenAccount,
  onAskOneQuestion,
  onCarryToday,
  onReflectCard,
  onAskAboutCard,
  onSaveCardAsRule,
  onShareCard,
  onShareCarryCard,
  onSaveScriptureMemory,
  onClearScriptureMemory,
  onShareScriptureMemory,
  theme,
}: {
  ts: (key: string, fallback?: string) => string;
  daily: ReturnType<typeof localizedDailyWisdom>;
  dailyEntry: WisdomEntry;
  currentLocalHour: number | null;
  activeDecision: WisdomDecision | null;
  user: User | null;
  ui: (typeof uiText)[LanguageCode];
  notificationsEnabled: boolean;
  todayPattern: string;
  companionCard: TodayCompanionCard;
  carryToday: CarryToday | null;
  scriptureMemory: ScriptureMemory | null;
  weeklyReview: WeeklyWisdomReview;
  personalizationContextEmpty: boolean;
  prioritizeToday: boolean;
  onScriptureOpen: (scripture: string) => void;
  onContinueDecision: () => void;
  onReflectToday: () => void;
  onReviewPattern: () => void;
  onOpenAccount: () => void;
  onAskOneQuestion: () => void;
  onCarryToday: (card: TodayCompanionCard) => void;
  onReflectCard: (card: TodayCompanionCard) => void;
  onAskAboutCard: (card: TodayCompanionCard) => void;
  onSaveCardAsRule: (card: TodayCompanionCard) => void;
  onShareCard: () => void;
  onShareCarryCard: () => void;
  onSaveScriptureMemory: () => void;
  onClearScriptureMemory: () => void;
  onShareScriptureMemory: (memory: ScriptureMemory) => void;
  theme: ThemeColors;
}) {
  const text = { ...uiText.en, ...ui };
  const [secondaryActionsOpen, setSecondaryActionsOpen] = useState(false);
  const [weeklyReviewOpen, setWeeklyReviewOpen] = useState(false);
  const greeting = useMemo(() => {
    if (currentLocalHour === null) {
      return text.greetingFallback || "Welcome back";
    }

    const hour = currentLocalHour;
    const baseGreeting =
      hour < 12
        ? text.greetingMorning || "Good morning"
        : hour < 18
          ? text.greetingAfternoon || "Good afternoon"
          : text.greetingEvening || "Good evening";

    const firstName = user?.name?.trim().split(/\s+/)[0] || "";
    return firstName ? `${baseGreeting}, ${firstName}` : baseGreeting;
  }, [currentLocalHour, text.greetingAfternoon, text.greetingEvening, text.greetingFallback, text.greetingMorning, user?.name]);

  const primaryAction = activeDecision
    ? { label: text.continueDecision!, body: activeDecision.title, onClick: onContinueDecision, icon: Compass }
    : { label: text.askOneQuestion!, body: text.askOneQuestionBody!, onClick: onAskOneQuestion, icon: MessageCircle };

  const secondaryActions = [
    { label: text.reflectToday!, body: daily.practice, onClick: onReflectToday, icon: Feather },
    user && notificationsEnabled
      ? { label: text.reviewPattern!, body: todayPattern, onClick: onReviewPattern, icon: ShieldCheck }
      : { label: user ? text.enableNotifications! : text.enableSync!, body: user ? text.notificationPromptBody! : text.syncDevicesBody!, onClick: onOpenAccount, icon: Bell },
    activeDecision
      ? { label: text.askNewQuestion!, body: text.askNewQuestionBody!, onClick: onAskOneQuestion, icon: MessageCircle }
      : { label: text.startDecision!, body: text.startDecisionBody!, onClick: onContinueDecision, icon: Compass },
  ];
  const featuredInsightIsDuplicate = companionCard.principle.trim().toLowerCase() === companionCard.practice.trim().toLowerCase();
  const featuredInsightLabel = featuredInsightIsDuplicate ? text.reflectionQuestion : text.wisdomPrinciple;
  const featuredInsight = featuredInsightIsDuplicate ? companionCard.question : companionCard.principle;
  const visibleSecondaryActions = secondaryActions.slice(0, 2);
  const finalSecondaryAction = secondaryActions[2];
  const visibleTodayActions = [
    { icon: Check, label: text.carryWithMe!, onClick: () => onCarryToday(companionCard), primary: true },
    { icon: Feather, label: text.reflectToday!, onClick: () => onReflectCard(companionCard) },
    { icon: MessageCircle, label: text.askAboutThis!, onClick: () => onAskAboutCard(companionCard) },
    { icon: Plus, label: text.saveToRuleOfLife!, onClick: () => onSaveCardAsRule(companionCard) },
  ];
  const hiddenTodayActions = [
    { icon: BookOpen, label: text.carryScriptureForWeek || "Carry scripture", onClick: onSaveScriptureMemory },
    { icon: Share2, label: text.createWisdomPostcard || "Create wisdom card", onClick: onShareCard },
  ];

  return (
    <div className="grid gap-3 sm:gap-4 xl:grid-cols-[minmax(0,0.98fr)_minmax(300px,1.02fr)]">
      <section className={`editorial-surface min-w-0 rounded-xl border p-4 shadow-sm sm:p-5 ${prioritizeToday ? "order-2" : "order-1"}`} style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
        {carryToday ? (
          <div className="mb-4 flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm leading-6 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}>
            <span>
              <span className="font-semibold" style={{ color: theme.accentGold }}>{text.carryingToday}:</span>{" "}
              <span suppressHydrationWarning>&ldquo;{carryToday.phrase}&rdquo;</span>
            </span>
            <button
              type="button"
              onClick={onShareCarryCard}
              className="premium-tap-card w-fit rounded-md border px-2 py-1 text-xs font-semibold"
              style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            >
              {text.createCard || "Create card"}
            </button>
          </div>
        ) : null}
        <div className="mb-3">
          <p className="text-base font-semibold tracking-tight sm:text-lg" style={{ color: theme.textPrimary }} suppressHydrationWarning>
            {greeting}
          </p>
          <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }} suppressHydrationWarning>
            {text.greetingIntent || "Let's choose one wise next step today."}
          </p>
        </div>
        <div className="mb-4 inline-flex w-fit max-w-full items-center gap-2 rounded-md border px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em] sm:text-xs sm:tracking-[0.18em]" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.accentGold }}>
          <Sparkles size={14} />
          {text.personalizedPriority}
        </div>
        <h1 className="max-w-3xl text-2xl font-semibold leading-tight tracking-normal sm:text-3xl" style={{ color: theme.textPrimary }}>
          {text.whatNext}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7" style={{ color: theme.textSecondary }}>
          {text.whatNextBody}
        </p>
        {personalizationContextEmpty ? (
          <button
            type="button"
            onClick={onOpenAccount}
            className="mt-3 rounded-md border px-3 py-2 text-left text-xs font-semibold leading-5 transition"
            style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}
          >
            <span style={{ color: theme.textPrimary }}>{text.personalizationNudgeTitle}</span>{" "}
            {text.personalizationNudgeBody}
          </button>
        ) : null}

        <div className="mt-5">
          <DashboardAction icon={primaryAction.icon} label={primaryAction.label} body={primaryAction.body} primary onClick={primaryAction.onClick} theme={theme} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
          {visibleSecondaryActions.map((action) => (
            <div key={action.label}>
              <DashboardAction icon={action.icon} label={action.label} body={action.body} onClick={action.onClick} compact theme={theme} />
            </div>
          ))}
        </div>
        <DisclosureSection
          title={ts('labels.moreHomeActions', 'More home actions')}
          summary={ts('labels.moreHomeActionsSummary', 'Keep the remaining home action tucked away until you need a different next step.')}
          eyebrow={ts('labels.moreHomeOptions', 'More options')}
          isOpen={secondaryActionsOpen}
          onOpenChange={setSecondaryActionsOpen}
          compactCollapsed
          showDetailsLabel={ts('showDetails', 'Show details')}
          hideDetailsLabel={ts('hideDetails', 'Hide details')}
          className="mt-3"
          theme={theme}
        >
          <DashboardAction icon={finalSecondaryAction.icon} label={finalSecondaryAction.label} body={finalSecondaryAction.body} onClick={finalSecondaryAction.onClick} compact theme={theme} />
        </DisclosureSection>
      </section>

      <section
        id="today-companion-card"
        tabIndex={-1}
        className={`editorial-surface min-w-0 scroll-mt-28 rounded-xl border p-0 shadow-sm outline-none ${prioritizeToday ? "order-1" : "order-2"}`}
        style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textPrimary }}
      >
        <div className="border-b p-4 sm:p-5" style={{ borderColor: theme.borderLight, background: `linear-gradient(180deg, ${theme.bgCardElevated}, ${theme.bgCard})` }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accentGold }} suppressHydrationWarning>{text.todaysCompanion}</p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl" suppressHydrationWarning>{text.todayPrefix}: {companionCard.title}</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8" style={{ color: theme.textSecondary }} suppressHydrationWarning>{companionCard.opening}</p>
            </div>
            <span className="grid size-12 shrink-0 place-items-center rounded-xl border shadow-sm" style={{ borderColor: theme.primary, backgroundColor: theme.primary, color: theme.textOnPrimary }}>
              <Sprout size={24} />
            </span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <button
              type="button"
              onClick={() => onScriptureOpen(dailyEntry.scripture)}
              className="premium-tap-card inline-flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition"
              style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}
              suppressHydrationWarning
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: theme.bgInput, color: theme.accentGold }}>
                <BookOpen size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>
                  {ts('labels.scripture', 'Scripture')}
                </span>
                <span className="mt-1 block truncate text-sm leading-6" style={{ color: theme.textPrimary }}>
                  {daily.scripture}
                </span>
              </span>
            </button>

            <div className="rounded-xl border p-4 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.primary, color: theme.textOnPrimary }}>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textOnPrimary }}>
                {text.carryThisToday}
              </p>
              <p className="mt-2 text-base font-semibold leading-7" suppressHydrationWarning>&ldquo;{companionCard.carryPhrase}&rdquo;</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{featuredInsightLabel}</p>
            <p className="mt-2 text-sm leading-6 sm:text-base sm:leading-7" style={{ color: theme.textPrimary }} suppressHydrationWarning>{featuredInsight}</p>
          </div>

          <details className="mt-3 rounded-md border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>
              {text.showDetails}
            </summary>
            <div className="mt-3 grid gap-3">
              {featuredInsightIsDuplicate ? null : (
                <div className="rounded-md border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{text.reflectionQuestion}</p>
                  <p className="mt-2 text-sm leading-6" style={{ color: theme.textPrimary }} suppressHydrationWarning>{companionCard.question}</p>
                </div>
              )}
              <div className="rounded-md border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{text.tinyPractice}</p>
                <p className="mt-2 text-sm leading-6" style={{ color: theme.textPrimary }} suppressHydrationWarning>{companionCard.practice}</p>
              </div>
            </div>
          </details>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t p-4 sm:p-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
          {visibleTodayActions.map((action) => (
            <CompanionCardAction
              key={action.label}
              icon={action.icon}
              label={action.label}
              onClick={action.onClick}
              theme={theme}
              primary={action.primary}
            />
          ))}
          <DisclosureSection
            title={ts('labels.moreTodayActions', 'More today actions')}
            summary={ts('labels.moreTodayActionsSummary', 'Keep the utility actions nearby without showing them all at once.')}
            eyebrow={ts('labels.today', 'Today')}
            compactCollapsed
            showDetailsLabel={ts('showDetails', 'Show details')}
            hideDetailsLabel={ts('hideDetails', 'Hide details')}
            className="col-span-2"
            theme={theme}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {hiddenTodayActions.map((action) => (
                <CompanionCardAction
                  key={action.label}
                  icon={action.icon}
                  label={action.label}
                  onClick={action.onClick}
                  theme={theme}
                />
              ))}
            </div>
          </DisclosureSection>
        </div>
      </section>

      <section className="editorial-surface order-3 rounded-xl border p-4 shadow-sm xl:col-span-2" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{text.weeklyWisdomReview || "Weekly Wisdom Review"}</p>
            <h2 className="mt-2 text-xl font-semibold" style={{ color: theme.textPrimary }}>{text.weeklyReviewTitle || "A quiet look at your week"}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: theme.textSecondary }}>
              {(text.weeklyReviewBody || "No streaks or pressure. Just notice what Aletheia is helping you carry.").replace("{pattern}", weeklyReview.pattern)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onScriptureOpen(weeklyReview.scripture)}
            className="premium-tap-card inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold"
            style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}
          >
            <BookOpen size={15} />
            {weeklyReview.scripture}
          </button>
        </div>
        <DisclosureSection
          title={ts('labels.weeklySignals', 'Weekly signals')}
          summary={scriptureMemory
            ? ts('labels.weeklySignalsSummaryWithMemory', 'Questions, reflections, gratitude, and scripture memory stay available without crowding the page.')
            : ts('labels.weeklySignalsSummary', 'Questions, reflections, and gratitude stay available without crowding the page.')}
          eyebrow={text.weeklyWisdomReview || "Weekly Wisdom Review"}
          isOpen={weeklyReviewOpen}
          onOpenChange={setWeeklyReviewOpen}
          compactCollapsed
          showDetailsLabel={ts('showDetails', 'Show details')}
          hideDetailsLabel={ts('hideDetails', 'Hide details')}
          className="mt-4"
          theme={theme}
        >
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniReviewStat label={text.questionsThisWeek || "Questions"} value={weeklyReview.questions} theme={theme} />
            <MiniReviewStat label={text.reflectionsThisWeek || "Reflections"} value={weeklyReview.reflections} theme={theme} />
            <MiniReviewStat label={text.gratitudeThisWeek || "Gratitude"} value={weeklyReview.gratitudeMoments} theme={theme} />
            <MiniReviewStat label={text.decisionsThisWeek || "Decisions"} value={weeklyReview.decisions} theme={theme} />
          </div>
          {scriptureMemory ? (
            <div className="mt-4 rounded-lg border p-3 text-sm leading-6" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{text.scriptureMemory || "Scripture memory"}</span>
                  <button type="button" onClick={() => onScriptureOpen(scriptureMemory.scripture)} className="mt-1 font-semibold underline underline-offset-4">
                    {scriptureMemory.scripture}
                  </button>
                </span>
                <div className="flex w-fit shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onShareScriptureMemory(scriptureMemory)}
                    className="premium-tap-card rounded-md border px-2 py-1 text-xs font-semibold"
                    style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                  >
                    {text.createCard || "Create card"}
                  </button>
                  <button
                    type="button"
                    onClick={onClearScriptureMemory}
                    className="premium-tap-card grid size-8 place-items-center rounded-md border"
                    style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}
                    aria-label={text.clearScriptureMemory || "Stop carrying scripture"}
                    title={text.clearScriptureMemory || "Stop carrying scripture"}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs leading-5" style={{ color: theme.textSecondary }}>{scriptureMemory.principle}</p>
            </div>
          ) : null}
        </DisclosureSection>
        <p className="mt-4 rounded-lg border p-3 text-sm leading-6" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
          <span className="font-semibold" style={{ color: theme.textPrimary }}>{text.nextFaithfulStep || "Next faithful step"}:</span>{" "}
          {weeklyReview.nextStep}
        </p>
      </section>
    </div>
  );
}

function MiniReviewStat({ label, value, theme }: { label: string; value: number; theme: ThemeColors }) {
  return (
    <div className="rounded-lg border px-3 py-2" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
      <p className="text-xl font-semibold" style={{ color: theme.textPrimary }}>{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>{label}</p>
    </div>
  );
}

function HomeSectionTabs({
  section,
  onChange,
  ts,
  theme,
}: {
  section: HomeSection;
  onChange: (section: HomeSection) => void;
  ts: (key: string, fallback?: string) => string;
  theme: ThemeColors;
}) {
  const tabs: Array<{ key: HomeSection; label: string }> = [
    { key: "today", label: ts('labels.homeTodayTab', 'Today') },
    { key: "ask", label: ts('labels.homeAskTab', 'Ask Aletheia') },
  ];

  return (
    <div
      className="relative z-20 mb-5 grid min-w-0 scroll-mt-28 grid-cols-2 gap-1 rounded-xl border p-1 shadow-sm"
      role="tablist"
      aria-label={ts('labels.homeSections', 'Home sections')}
      style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}
    >
      {tabs.map((tab) => {
        const active = section === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className="premium-tap-card relative min-h-12 rounded-lg px-3 py-3 text-center text-sm font-semibold tracking-normal transition sm:text-base"
            style={{
              backgroundColor: active ? theme.primary : "transparent",
              color: active ? theme.textOnPrimary : theme.textSecondary,
              boxShadow: active ? "0 10px 24px rgba(7, 10, 8, 0.12)" : "none",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function ScreenTabs<T extends string>({
  value,
  onChange,
  tabs,
  ariaLabel,
  theme,
}: {
  value: T;
  onChange: Dispatch<SetStateAction<T>>;
  tabs: Array<{ key: T; label: string }>;
  ariaLabel: string;
  theme: ThemeColors;
}) {
  return (
    <div
      className="relative z-20 grid min-w-0 gap-1 rounded-2xl border p-1.5 shadow-sm sm:grid-cols-2"
      role="tablist"
      aria-label={ariaLabel}
      style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, gridTemplateColumns: `repeat(${Math.min(tabs.length, 2)}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className="premium-tap-card relative min-h-12 rounded-xl px-3 py-3 text-center text-sm font-semibold tracking-normal transition sm:text-base"
            style={{
              backgroundColor: active ? theme.bgCard : "transparent",
              color: active ? theme.textPrimary : theme.textSecondary,
              boxShadow: active ? `inset 0 -3px 0 ${theme.primary}, 0 10px 24px rgba(7, 10, 8, 0.12)` : "none",
              borderColor: active ? theme.primary : "transparent",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function CompanionCardAction({
  icon: Icon,
  label,
  onClick,
  theme,
  primary = false,
}: {
  icon: typeof Compass;
  label: string;
  onClick: () => void;
  theme: ThemeColors;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="premium-tap-card flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-center text-xs font-semibold shadow-sm transition sm:text-sm"
      style={primary
        ? { borderColor: theme.primary, backgroundColor: theme.primary, color: theme.textOnPrimary }
        : { borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}
    >
      <Icon size={15} />
      <span>{label}</span>
    </button>
  );
}

function DashboardAction({
  icon: Icon,
  label,
  body,
  primary = false,
  compact = false,
  onClick,
  theme,
}: {
  icon: typeof Compass;
  label: string;
  body: string;
  primary?: boolean;
  compact?: boolean;
  onClick: () => void;
  theme: ThemeColors;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`premium-tap-card group flex h-full w-full min-w-0 items-start gap-3 rounded-xl border text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${compact ? "p-3" : "p-4"}`}
      style={primary
        ? { borderColor: theme.primary, backgroundColor: theme.primary, color: theme.textOnPrimary, boxShadow: "0 12px 24px rgba(7, 10, 8, 0.14)" }
        : { borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}
    >
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg" style={primary ? { backgroundColor: theme.bgCardElevated, color: theme.accentGold } : { backgroundColor: theme.bgInput, color: theme.textPrimary }}>
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className={`${primary ? "text-base" : "text-sm"} block font-semibold`}>{label}</span>
        <span className={`${compact ? "home-secondary-action-body " : ""}mt-1 line-clamp-2 block text-xs leading-5 opacity-80`}>{body}</span>
      </span>
    </button>
  );
}

function RhythmItem({ label, body, theme }: { label: string; body: string; theme: ThemeColors }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
      <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{label}</p>
      <p className="mt-1 text-xs leading-5" style={{ color: theme.textSecondary }}>{body}</p>
    </div>
  );
}

function ContextualNextAction({
  eyebrow,
  title,
  body,
  actionLabel,
  onAction,
  theme,
}: {
  eyebrow: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  theme: ThemeColors;
}) {
  return (
    <section className="editorial-surface rounded-xl border p-4 shadow-sm sm:p-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold" style={{ color: theme.textPrimary }}>{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: theme.textSecondary }}>{body}</p>
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="premium-tap-card h-10 rounded-md px-4 text-sm font-semibold shadow-sm"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function DisclosureSection({
  title,
  summary,
  eyebrow,
  headerContent,
  sectionId,
  isOpen,
  onOpenChange,
  defaultOpen = false,
  compactCollapsed = false,
  showDetailsLabel = "Show details",
  hideDetailsLabel = "Hide details",
  className = "",
  children,
  theme,
}: {
  title: string;
  summary?: string;
  eyebrow?: string;
  headerContent?: ReactNode;
  sectionId?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  compactCollapsed?: boolean;
  showDetailsLabel?: string;
  hideDetailsLabel?: string;
  className?: string;
  children: ReactNode;
  theme: ThemeColors;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isOpen ?? internalOpen;
  const setOpen = useCallback((next: boolean) => {
    if (isOpen === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  }, [isOpen, onOpenChange]);
  const useCompactClosedState = compactCollapsed && !open;

  return (
    <section id={sectionId} className={`editorial-surface min-w-0 max-w-full overflow-hidden rounded-xl border shadow-sm ${className}`} style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={sectionId ? `${sectionId}-content` : undefined}
        onClick={() => {
          const next = !open;
          setOpen(next);
          trackClientEvent("disclosure_section_toggled", {
            section: title,
            opened: next,
            eyebrow: eyebrow ?? null,
          });
        }}
        className={useCompactClosedState
          ? "group flex w-full min-w-0 flex-wrap items-start justify-between gap-2 p-3 text-left transition sm:p-3.5"
          : "group flex w-full min-w-0 flex-wrap items-start justify-between gap-3 p-4 text-left transition sm:p-5"}
        style={{ backgroundColor: open ? theme.bgCard : "transparent" }}
      >
        <span className="min-w-0 flex-1">
          {headerContent ? headerContent : (
            <>
              {eyebrow ? (
                <span className="block text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{eyebrow}</span>
              ) : null}
              <span className={useCompactClosedState ? "mt-1 block text-base font-semibold" : "mt-1 block text-lg font-semibold"} style={{ color: theme.textPrimary }}>{title}</span>
              {summary ? (
                <span className={useCompactClosedState ? "mt-1 block text-sm leading-5" : "mt-1 block text-sm leading-6"} style={{ color: theme.textSecondary }}>{summary}</span>
              ) : null}
            </>
          )}
        </span>
        <span className={useCompactClosedState ? "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold" : "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold"} style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
          <span>{open ? hideDetailsLabel : showDetailsLabel}</span>
          <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease" }} />
        </span>
      </button>
      {open ? (
        <div id={sectionId ? `${sectionId}-content` : undefined} className="min-w-0 max-w-full overflow-x-clip border-t p-4 sm:p-5" style={{ borderColor: theme.borderLight }}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

function AccountPanel({
  ts,
  user,
  authMode,
  setAuthMode,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  error,
  notice,
  authStatus,
  googleAuthAvailable,
  status,
  isWorking,
  onSubmit,
  onGoogleSignIn,
  onLogout,
  onUpdateProfileAvatar,
  preferences,
  preferencesStatus,
  ui,
  manualContext,
  manualContextStatus,
  themePreference,
  onPreferenceChange,
  onThemePreferenceChange,
  onManualContextChange,
  notificationsEnabled,
  notificationsConfigured,
  notificationAccountEnabled,
  notificationDeviceSubscribed,
  notificationStatus,
  notificationBusy,
  notificationTiming,
  onNotificationTimingChange,
  onEnableNotifications,
  onDisableNotifications,
  messages,
  decisions,
  journalEntries,
  counselContacts,
  rulesOfLife,
  availableVoices,
  selectedVoice,
  onVoiceChange,
  focusIntentions,
  onFocusIntentionsChange,
  onClearLocalPersonalization,
  onClearGuestWorkspace,
  onExportData,
  onRequestDeleteAccount,
  onReportIssue,
  onShare,
  accountActionBusy,
  theme,
}: {
  ts: (key: string, fallback?: string) => string;
  user: User | null;
  authMode: AuthMode;
  setAuthMode: (value: AuthMode) => void;
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  error: string;
  notice: string;
  authStatus: AuthStatus;
  googleAuthAvailable: boolean;
  status: string;
  isWorking: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn: () => void;
  onLogout: () => void;
  onUpdateProfileAvatar: (avatarUrl: string) => Promise<boolean>;
  preferences: UserPreferences;
  preferencesStatus: string;
  ui: (typeof uiText)[LanguageCode];
  manualContext: ManualContextProfile;
  manualContextStatus: string;
  themePreference: ThemePreference;
  onPreferenceChange: (patch: Partial<UserPreferences>) => void;
  onThemePreferenceChange: (value: ThemePreference) => void;
  onManualContextChange: (patch: Partial<ManualContextProfile>) => void;
  notificationsEnabled: boolean;
  notificationsConfigured: boolean;
  notificationAccountEnabled: boolean;
  notificationDeviceSubscribed: boolean;
  notificationStatus: string;
  notificationBusy: boolean;
  notificationTiming: NotificationTiming;
  onNotificationTimingChange: (patch: Partial<NotificationTiming>) => void;
  onEnableNotifications: () => void;
  onDisableNotifications: () => void;
  messages: ChatMessage[];
  decisions: WisdomDecision[];
  journalEntries: JournalEntry[];
  counselContacts: CounselContact[];
  rulesOfLife: RuleOfLife[];
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: string | null;
  onVoiceChange: (voiceURI: string | null) => void;
  focusIntentions: string[];
  onFocusIntentionsChange: (intentions: string[]) => void;
  onClearLocalPersonalization: () => void;
  onClearGuestWorkspace: () => void;
  onExportData: () => void;
  onRequestDeleteAccount: () => void;
  onReportIssue: () => void;
  onShare: (channel: ShareChannel, placement: string) => void;
  accountActionBusy: "export" | "delete" | "report" | null;
  theme: ThemeColors;
}) {
  const text = { ...uiText.en, ...ui };
  const [accountSection, setAccountSection] = useState<"personalization" | "privacy" | "share" | "system">("personalization");
  const exchanges = conversationExchanges(messages).filter((exchange) => exchange.question);
  const activeDecisionCount = decisions.filter((decision) => decision.status !== "closed").length;
  const hasLocalWorkspaceData = exchanges.length > 0 || decisions.length > 0 || journalEntries.length > 0 || counselContacts.length > 0 || rulesOfLife.length > 0;
  const contextAreas = [
    manualContextHasContent(manualContext),
    Boolean(manualContext.monthlyIncome || manualContext.fixedExpenses || manualContext.debtPayments || manualContext.savingsBufferMonths),
    Boolean(manualContext.workHoursPerWeek || manualContext.workContext),
    Boolean(manualContext.sleepHours || manualContext.exerciseSessionsPerWeek || manualContext.healthContext),
  ].filter(Boolean).length;
  const profileName = user?.name || user?.email || ts('auth.guest', 'Guest');
  const profileFirstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0];
  const profileGreeting = user
    ? `${ts('auth.welcomeBack', 'Welcome back')}, ${profileFirstName}`
    : ts('labels.accountSignInOrGuest', text.accountSignInOrGuest ?? "Sign in or continue as guest");
  const profileSummary = user
    ? user.email
    : ts('labels.accountGuestSummary', text.accountGuestSummary ?? "Google and email sign-in keep history, preferences, decisions, and notifications portable.");
  const profileStats = [
    {
      icon: Feather,
      value: journalEntries.length,
      label: ts('nav.reflect', text.nav.reflect),
      detail: ts('labels.accountHistoryReflections', text.accountHistoryReflections ?? 'reflections'),
    },
    {
      icon: FileText,
      value: decisions.length,
      label: ts('nav.decisions', text.nav.decisions),
      detail: ts('labels.accountHistoryDecisions', text.accountHistoryDecisions ?? 'decisions'),
    },
    {
      icon: Users,
      value: counselContacts.length,
      label: ts('labels.counsel', 'Counsel'),
      detail: ts('labels.trustedVoices', 'trusted voices'),
    },
  ];

  return (
    <div className="mx-auto grid min-w-0 max-w-5xl gap-4">
      <section className="overflow-hidden rounded-xl border shadow-sm" style={{ borderColor: theme.borderLight, background: `linear-gradient(180deg, ${theme.bgCardElevated}, ${theme.bgCard})` }}>
        <div className="flex flex-col items-center gap-4 p-4 text-center sm:p-5">
          <div className="grid place-items-center">
            <div
              className="rounded-full p-[2px] shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${theme.accentGold}, ${theme.primary}, ${theme.borderMedium})`,
              }}
            >
              <div className="rounded-full p-[2px]" style={{ backgroundColor: theme.bgCard }}>
                <AvatarCircle
                  avatarUrl={user?.avatarUrl}
                  seed={user?.id ?? user?.email ?? "guest"}
                  label={profileName}
                  size={80}
                  className="size-20 rounded-full border object-cover"
                />
              </div>
            </div>
          </div>
          <div className="min-w-0 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>
              {ts('labels.profileTitle', 'Profile')}
            </p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight text-balance sm:text-3xl" style={{ color: theme.textPrimary }}>
              {profileGreeting}
            </h2>
            <p className="mt-2 truncate text-sm leading-6 sm:text-base sm:leading-7" style={{ color: theme.textSecondary }}>
              {user ? `${ts('labels.accountSignedInWith', 'Signed in with')} ${profileSummary}` : profileSummary}
            </p>
          </div>
          <div className="flex w-full flex-nowrap justify-center gap-2 overflow-x-auto pb-1">
            <span className="inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}>
              {user ? ts('labels.accountConnected', 'Account connected') : ts('labels.accountLocalOnly', 'Local only')}
            </span>
            <span className="inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {notificationsEnabled ? ts('notifications.deviceSubscribed', 'This device is subscribed for daily wisdom.') : ts('notifications.notificationsOptionalWhenReady', 'Notifications can be enabled when you are ready.')}
            </span>
            <span className="inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {user ? ts('labels.accountHistorySynced', 'History synced') : ts('labels.accountHistoryLocal', 'History local')}
            </span>
          </div>
        </div>
        <div className="grid gap-2 border-t px-4 py-4 sm:grid-cols-3 sm:px-5" style={{ borderColor: theme.borderLight }}>
          {profileStats.map((stat) => (
            <AccountHeaderStat key={stat.detail} icon={stat.icon} value={stat.value} label={stat.label} detail={stat.detail} theme={theme} />
          ))}
        </div>
      </section>

      <DisclosureSection
        title={user ? ts('labels.accountControls', 'Account controls') : ts('labels.accountSignInOrGuest', 'Sign in or continue as guest')}
        summary={user ? text.accountManageSummary ?? 'Manage sign-in, sync, language, notifications, history, and formation milestones without crowding the wisdom companion.' : profileSummary}
        eyebrow={ts('labels.accountTitle', 'Account')}
        compactCollapsed
        showDetailsLabel={text.showDetails}
        hideDetailsLabel={text.hideDetails}
        className="editorial-surface"
        theme={theme}
      >
          <div className="space-y-4">
            <AccountStatusCard
              theme={theme}
              user={user}
              authStatus={authStatus}
              notificationsEnabled={notificationsEnabled}
              notificationAccountEnabled={notificationAccountEnabled}
              notificationDeviceSubscribed={notificationDeviceSubscribed}
              notificationStatus={notificationStatus}
              onLogout={onLogout}
              ts={ts}
            />
            {!user ? (
              <AuthPanel
                theme={theme}
                ts={ts}
                authMode={authMode}
                setAuthMode={setAuthMode}
                name={name}
                setName={setName}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                error={error}
                notice={notice}
                authStatus={authStatus}
                googleAuthAvailable={googleAuthAvailable}
                status={status}
                isWorking={isWorking}
                onSubmit={onSubmit}
                onGoogleSignIn={onGoogleSignIn}
              />
            ) : null}
          </div>
      </DisclosureSection>

      <ScreenTabs
        value={accountSection}
        onChange={setAccountSection}
        ariaLabel={ts('labels.accountSections', 'Account sections')}
        theme={theme}
        tabs={[
          { key: "personalization", label: ts('labels.accountPersonalizationTitle', 'Personalization') },
          { key: "privacy", label: ts('labels.privacyPosture', 'Privacy posture') },
          { key: "share", label: ts('share.accountShareEyebrow', 'Share') },
          { key: "system", label: ts('labels.accountSystemEyebrow', 'System') },
        ]}
      />

      {accountSection === "personalization" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <DisclosureSection
            title={ts('labels.personalizeAletheia', 'Personalize Aletheia')}
            summary={ts('labels.accountPersonalizationSummary', 'Language, Bible translation, theme, voice, and avatar shape how Aletheia feels when you use it.')}
            eyebrow={ts('labels.accountPersonalizationTitle', 'Personalization')}
            compactCollapsed
            showDetailsLabel={text.showDetails}
            hideDetailsLabel={text.hideDetails}
            theme={theme}
          >
            <AccountPersonalizationPanel
              theme={theme}
              ts={ts}
              preferences={preferences}
              preferencesStatus={preferencesStatus}
              themePreference={themePreference}
              availableVoices={availableVoices}
              selectedVoice={selectedVoice}
              user={user}
              focusIntentions={focusIntentions}
              onPreferenceChange={onPreferenceChange}
              onThemePreferenceChange={onThemePreferenceChange}
              onVoiceChange={onVoiceChange}
              onFocusIntentionsChange={onFocusIntentionsChange}
              onUpdateProfileAvatar={onUpdateProfileAvatar}
            />
          </DisclosureSection>

          <DisclosureSection
            title={ts('labels.dailyWisdomNotifications', 'Daily wisdom notifications')}
            summary={notificationsEnabled ? ts('notifications.deviceSubscribed', 'This device is subscribed for daily wisdom.') : notificationStatus}
            eyebrow={ts('labels.notifications', 'Notifications')}
            compactCollapsed
            showDetailsLabel={text.showDetails}
            hideDetailsLabel={text.hideDetails}
            theme={theme}
          >
            <NotificationPanel
              theme={theme}
              ts={ts}
              language={preferences.language}
              user={user}
              enabled={notificationsEnabled}
              configured={notificationsConfigured}
              permission={typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"}
              status={notificationStatus}
              busy={notificationBusy}
              timing={notificationTiming}
              onTimingChange={onNotificationTimingChange}
              onEnable={onEnableNotifications}
              onDisable={onDisableNotifications}
            />
          </DisclosureSection>
        </div>
      ) : null}

      {accountSection === "privacy" ? (
        <div className="space-y-4">
          <DisclosureSection
            title={ts('labels.manualContextTitle', 'Manual Context Vault')}
            summary={manualContext.useInAnswers
              ? `${ts('labels.accountContextActive', text.accountContextActive ?? "Context active")} · ${contextAreas} ${contextAreas === 1 ? ts('labels.accountArea', text.accountArea ?? "area") : ts('labels.accountAreas', text.accountAreas ?? "areas")} ${ts('labels.accountAdded', text.accountAdded ?? "added")}`
              : ts('manualContext.intro', 'Add only the health, money, work, and life context you want Aletheia to consider. No external apps are connected.')}
            eyebrow={ts('labels.privacyPosture', 'Privacy posture')}
            compactCollapsed
            showDetailsLabel={text.showDetails}
            hideDetailsLabel={text.hideDetails}
            theme={theme}
          >
            <ManualContextPanel
              theme={theme}
              ts={ts}
              user={user}
              preferences={preferences}
              context={manualContext}
              status={manualContextStatus}
              onPreferenceChange={onPreferenceChange}
              onChange={onManualContextChange}
            />
          </DisclosureSection>

          <DisclosureSection
            title={ts('labels.accountTrustPostureTitle', 'Trust and privacy posture')}
            summary={ts('labels.accountTrustPostureSummary', 'Boundaries, scripture sourcing, saved data, and sharing posture are available without flooding the page.')}
            eyebrow={ts('labels.privacyPosture', 'Privacy posture')}
            compactCollapsed
            showDetailsLabel={text.showDetails}
            hideDetailsLabel={text.hideDetails}
            theme={theme}
          >
            <TrustCenterCard theme={theme} ts={ts} />
          </DisclosureSection>

          <DisclosureSection
            title={ts('labels.accountBoundariesTitle', "Aletheia's guardrails")}
            summary={ts('labels.accountBoundariesSummary', "The app's safety boundaries remain visible when needed, not constantly in the way.")}
            eyebrow={ts('labels.privacyPosture', 'Privacy posture')}
            compactCollapsed
            showDetailsLabel={text.showDetails}
            hideDetailsLabel={text.hideDetails}
            theme={theme}
          >
            <DataBoundariesCard
              theme={theme}
              ts={ts}
              user={user}
              hasLocalWorkspaceData={hasLocalWorkspaceData}
              onClearLocalPersonalization={onClearLocalPersonalization}
              onClearGuestWorkspace={onClearGuestWorkspace}
              onExportData={onExportData}
              onRequestDeleteAccount={onRequestDeleteAccount}
              accountActionBusy={accountActionBusy}
            />
          </DisclosureSection>
        </div>
      ) : null}

      {accountSection === "share" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <DisclosureSection
            title={ts('share.accountShareTitle', 'Invite someone to Aletheia')}
            summary={ts('share.accountShareSummary', 'Share the app link privately through the channel that fits the person.')}
            eyebrow={ts('share.accountShareEyebrow', 'Share')}
            compactCollapsed
            showDetailsLabel={text.showDetails}
            hideDetailsLabel={text.hideDetails}
            theme={theme}
          >
            <AccountShareCard
              theme={theme}
              ts={ts}
              onShare={(channel) => onShare(channel, "account")}
            />
          </DisclosureSection>

          <DisclosureSection
            title={ts('supportMission.title', 'Support the mission')}
            summary={ts('supportMission.summary', 'Help keep Aletheia free, trustworthy, multilingual, and deeply useful.')}
            eyebrow={ts('supportMission.eyebrow', 'Mission')}
            compactCollapsed
            showDetailsLabel={text.showDetails}
            hideDetailsLabel={text.hideDetails}
            theme={theme}
          >
            <SupportMissionCard theme={theme} ts={ts} />
          </DisclosureSection>
        </div>
      ) : null}

      {accountSection === "system" ? (
        <div className="space-y-4">
          <DisclosureSection
            title={ts('labels.accountSystemTitle', 'System')}
            summary={`${ts('labels.accountSystemSummary', 'Sync status, data controls, and support actions stay together.')} ${exchanges.length} ${ts('labels.accountHistoryConversations', text.accountHistoryConversations ?? "conversations")} · ${activeDecisionCount} ${ts('labels.accountHistoryDecisions', text.accountHistoryDecisions ?? "decisions")}`}
            eyebrow={ts('labels.accountSystemEyebrow', 'System')}
            compactCollapsed
            showDetailsLabel={text.showDetails}
            hideDetailsLabel={text.hideDetails}
            theme={theme}
          >
            <SystemStatusCard
              theme={theme}
              ts={ts}
              user={user}
              conversations={exchanges.length}
              decisions={decisions.length}
              reflections={journalEntries.length}
              counselContacts={counselContacts.length}
              notificationsEnabled={notificationsEnabled}
            />
          </DisclosureSection>

          <DisclosureSection
            title={ts('labels.supportReportIssue', 'Report a problem')}
            summary={ts('labels.supportReportIssueSummary', 'Share a problem without attaching private chats, journals, or manual context.')}
            eyebrow={ts('labels.support', 'Support')}
            compactCollapsed
            showDetailsLabel={text.showDetails}
            hideDetailsLabel={text.hideDetails}
            theme={theme}
          >
            <SupportReportCard theme={theme} ts={ts} onReportIssue={onReportIssue} />
          </DisclosureSection>
        </div>
      ) : null}
    </div>
  );
}

function AccountHeaderStat({
  icon: Icon,
  value,
  label,
  detail,
  theme,
}: {
  icon: typeof Feather;
  value: number;
  label: string;
  detail: string;
  theme: ThemeColors;
}) {
  const accessibleLabel = `${value} ${detail}`;
  return (
    <span
      className="flex min-h-12 min-w-0 items-center justify-center rounded-xl border px-3 py-3"
      style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}
      aria-label={accessibleLabel}
      title={accessibleLabel}
    >
      <span className="flex min-w-0 items-center justify-center gap-2 leading-none" style={{ color: theme.textPrimary }}>
        <Icon className="shrink-0" size={16} aria-hidden="true" />
        <span className="text-base font-semibold">{value}</span>
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function AccountSettingRow({
  icon: Icon,
  label,
  body,
  currentValue,
  control,
  theme,
}: {
  icon: typeof Globe2;
  label: string;
  body: string;
  currentValue: string;
  control: ReactNode;
  theme: ThemeColors;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="editorial-surface premium-tap-card rounded-xl border p-3 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 text-left"
        aria-expanded={open}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg border" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.primary }}>
          <Icon size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold" style={{ color: theme.textPrimary }}>{label}</span>
          <span className="mt-1 block text-xs leading-5" style={{ color: theme.textSecondary }}>{body}</span>
        </span>
        <span className="min-w-[5rem] shrink-0 text-right sm:min-w-[7rem]">
          <span className="block max-w-32 break-words text-xs font-semibold leading-4 sm:max-w-44" style={{ color: theme.accentGold }}>{currentValue}</span>
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: theme.textSecondary }}>
            <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 180ms ease" }} />
          </span>
        </span>
      </button>
      {open ? (
        <div className="mt-3 border-t pt-3" style={{ borderColor: theme.borderLight }}>
          {control}
        </div>
      ) : null}
    </div>
  );
}

function AccountToggleRow({
  icon: Icon,
  label,
  body,
  checked,
  onChange,
  onLabel,
  offLabel,
  theme,
}: {
  icon: typeof Globe2;
  label: string;
  body: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  onLabel: string;
  offLabel: string;
  theme: ThemeColors;
}) {
  return (
    <div className="editorial-surface premium-tap-card rounded-xl border p-3 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.primary }}>
            <Icon size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold" style={{ color: theme.textPrimary }}>{label}</span>
            <span className="mt-1 block text-xs leading-5" style={{ color: theme.textSecondary }}>{body}</span>
          </span>
        </div>
        <span className="grid grid-cols-2 rounded-full border p-1" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
          {[
            { value: false, label: offLabel },
            { value: true, label: onLabel },
          ].map((option) => {
            const active = checked === option.value;
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => onChange(option.value)}
                className="min-h-10 rounded-full px-3 text-xs font-semibold transition"
                style={{
                  backgroundColor: active ? theme.primary : "transparent",
                  color: active ? theme.textOnPrimary : theme.textSecondary,
                }}
                aria-pressed={active}
              >
                {option.label}
              </button>
            );
          })}
        </span>
      </div>
    </div>
  );
}

function AccountSelect({
  value,
  onChange,
  children,
  theme,
  ariaLabel,
}: {
  value: string | number;
  onChange: (value: string) => void;
  children: ReactNode;
  theme: ThemeColors;
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-md border px-3 text-sm outline-none"
      style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
    >
      {children}
    </select>
  );
}

function accountLabel(value: string) {
  return value ? `${value.charAt(0).toLocaleUpperCase()}${value.slice(1)}` : value;
}

function AccountShareCard({
  theme,
  ts,
  onShare,
}: {
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  onShare: (channel: ShareChannel) => void;
}) {
  const shareActions: Array<{ channel: ShareChannel; label: string; icon: typeof Share2 }> = [
    { channel: "native", label: ts('share.shareAletheia', 'Share Aletheia'), icon: Share2 },
    { channel: "copy", label: ts('share.copyLink', 'Copy link'), icon: Copy },
    { channel: "whatsapp", label: ts('share.whatsapp', 'WhatsApp'), icon: MessageCircle },
    { channel: "facebook", label: ts('share.facebook', 'Facebook'), icon: Share2 },
    { channel: "x", label: ts('share.xTwitter', 'X / Twitter'), icon: Share2 },
    { channel: "linkedin", label: ts('share.linkedin', 'LinkedIn'), icon: Share2 },
    { channel: "email", label: ts('share.email', 'Email'), icon: Mail },
    { channel: "sms", label: ts('share.sms', 'SMS'), icon: MessageCircle },
  ];

  return (
    <section className="space-y-4">
      <div className="editorial-surface rounded-lg border p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md" style={{ backgroundColor: theme.bgInput, color: theme.primary }}>
            <Share2 size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts('share.accountShareBodyTitle', 'Invite with privacy')}</p>
            <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>
              {ts('share.accountShareBody', "Only Aletheia's app link is shared by default. Private questions, journals, decisions, and counsel stay inside the user's account.")}
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {shareActions.map(({ channel, label, icon: Icon }) => (
          <button
            key={channel}
            type="button"
            onClick={() => onShare(channel)}
            className="premium-tap-card flex min-h-12 items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
            style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: theme.bgCardElevated, color: theme.primary }}>
              <Icon size={16} />
            </span>
            <span className="min-w-0 flex-1 break-words leading-5">{label}</span>
            <ChevronDown className="shrink-0 -rotate-90 opacity-50" size={14} />
          </button>
        ))}
      </div>
    </section>
  );
}

function SupportMissionCard({
  theme,
  ts,
}: {
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
}) {
  const [impactOpen, setImpactOpen] = useState(false);
  const links = SUPPORT_MISSION_LINKS.filter(({ href }) => /^https?:\/\//.test(href) || /^mailto:/i.test(href));
  const impactItems = [
    ts('supportMission.impactAi', 'AI and retrieval costs for thoughtful wisdom responses'),
    ts('supportMission.impactTranslations', 'public-domain scripture, translation polish, and language support'),
    ts('supportMission.impactAccess', 'free access for people making high-pressure decisions'),
    ts('supportMission.impactReliability', 'hosting, notifications, privacy, and reliability work'),
  ];

  function trackSupportClick(channel: SupportMissionChannel) {
    trackClientEvent("support_mission_clicked", { channel });
  }

  return (
    <section className="space-y-4">
      <div className="editorial-surface overflow-hidden rounded-xl border shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-lg border" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.primary }}>
              <HandHeart size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('supportMission.eyebrow', 'Mission')}</p>
              <h3 className="mt-2 text-xl font-semibold" style={{ color: theme.textPrimary }}>{ts('supportMission.cardTitle', 'Keep wisdom accessible')}</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                {ts('supportMission.body', 'Optional support helps us keep Aletheia calm, trustworthy, multilingual, and available to people seeking wisdom for money, work, purpose, and stewardship.')}
              </p>
            </div>
          </div>

          <DisclosureSection
            title={ts('supportMission.impactTitle', 'What support helps fund')}
            summary={ts('supportMission.impactSummary', 'Keep the funding details collapsed until you want the context.')}
            eyebrow={ts('supportMission.eyebrow', 'Mission')}
            compactCollapsed
            isOpen={impactOpen}
            onOpenChange={setImpactOpen}
            showDetailsLabel={ts('showDetails', 'Show details')}
            hideDetailsLabel={ts('hideDetails', 'Hide details')}
            theme={theme}
            className="mt-4"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {impactItems.map((item) => (
                <div key={item} className="rounded-xl border p-3 text-sm leading-5 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                  <span className="flex items-start gap-2">
                    <Check size={15} className="mt-0.5 shrink-0" style={{ color: theme.accentGold }} />
                    <span>{item}</span>
                  </span>
                </div>
              ))}
            </div>
          </DisclosureSection>
        </div>

        <div className="border-t p-4 sm:p-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
          <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts('supportMission.chooseMethod', 'Choose a support method')}</p>
          {links.length ? (
            <div className="mt-3 grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
              {links.map(({ channel, href, labelKey, fallback }) => (
                <a
                  key={channel}
                  href={href}
                  target={href.startsWith("mailto:") ? undefined : "_blank"}
                  rel={href.startsWith("mailto:") ? undefined : "noreferrer"}
                  onClick={() => trackSupportClick(channel)}
                  className="premium-tap-card flex min-h-12 items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
                  style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: theme.bgCardElevated, color: theme.primary }}>
                      {channel === "contact" ? <Mail size={16} /> : <HandHeart size={16} />}
                    </span>
                    <span className="min-w-0 break-words leading-5">{ts(labelKey, fallback)}</span>
                  </span>
                  <ExternalLink size={15} className="shrink-0 opacity-70" />
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-md border p-3 text-sm leading-6" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {ts('supportMission.notConfigured', 'Support links are being prepared. Aletheia remains fully usable while this is set up.')}
            </div>
          )}
          <p className="mt-3 text-xs leading-5" style={{ color: theme.textMuted }}>
            {ts('supportMission.trustNote', 'Giving is optional. It never changes the counsel you receive, and payment details are handled by the payment provider, not by Aletheia.')}
          </p>
        </div>
      </div>
    </section>
  );
}

function AccountPersonalizationPanel({
  theme,
  ts,
  preferences,
  preferencesStatus,
  themePreference,
  availableVoices,
  selectedVoice,
  user,
  focusIntentions,
  onPreferenceChange,
  onThemePreferenceChange,
  onVoiceChange,
  onFocusIntentionsChange,
  onUpdateProfileAvatar,
}: {
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  preferences: UserPreferences;
  preferencesStatus: string;
  themePreference: ThemePreference;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: string | null;
  user: User | null;
  focusIntentions: string[];
  onPreferenceChange: (patch: Partial<UserPreferences>) => void;
  onThemePreferenceChange: (value: ThemePreference) => void;
  onVoiceChange: (voiceURI: string | null) => void;
  onFocusIntentionsChange: (intentions: string[]) => void;
  onUpdateProfileAvatar: (avatarUrl: string) => Promise<boolean>;
}) {
  const bibleOptions = bibleTranslationOptionsForLanguage(preferences.language);
  const selectedBible = bibleTranslations[preferences.bibleTranslation];
  const selectedVoiceObject = availableVoices.find((voice) => voice.voiceURI === selectedVoice);
  const selectedVoiceLabel = selectedVoiceObject ? voiceLabel(selectedVoiceObject) : ts('labels.deviceDefault', 'Device default');
  const selectedFocusCount = focusIntentions.length;
  const selectedFocusPreview = focusIntentions.slice(0, 3).join(" · ");

  return (
    <section className="space-y-3">
      <div className="overflow-hidden rounded-xl border shadow-sm" style={{ borderColor: theme.borderLight, background: `linear-gradient(180deg, ${theme.bgCardElevated}, ${theme.bgCard})` }}>
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-full border" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.primary }}>
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>
                {ts('labels.accountPersonalizationTitle', 'Personalization')}
              </p>
              <h3 className="mt-1 text-xl font-semibold sm:text-2xl" style={{ color: theme.textPrimary }}>
                {ts('labels.personalizeAletheia', 'Personalize Aletheia')}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: theme.textSecondary }}>
                {ts('labels.accountPersonalizationSummary', 'Language, Bible translation, theme, voice, and avatar shape how Aletheia feels when you use it.')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }}>
              {languages[preferences.language]?.nativeName ?? preferences.language}
            </span>
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {selectedBible?.label ?? preferences.bibleTranslation}
            </span>
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {ts(`theme.${themePreference}`, themePreference)}
            </span>
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {preferences.voiceEnabled ? selectedVoiceLabel : ts('labels.voiceInputDisabled', 'Voice input off')}
            </span>
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: selectedFocusCount ? theme.textPrimary : theme.textSecondary }}>
              {selectedFocusCount ? `${selectedFocusCount}/3 ${ts('labels.focusIntentions', 'Focus intentions')}` : ts('labels.focusIntentionsHint', 'Focus intentions')}
            </span>
          </div>
          {selectedFocusPreview ? (
            <p className="rounded-md border px-3 py-2 text-xs leading-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {selectedFocusPreview}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="space-y-3">
          <AccountSettingRow
            icon={Languages}
            label={accountLabel(ts('labels.language', 'Language'))}
            body={ts('labels.accountLanguageBody', "Speak your heart's language.")}
            currentValue={languages[preferences.language]?.nativeName ?? preferences.language}
            theme={theme}
            control={(
              <AccountSelect
                ariaLabel={ts('languageSelect', 'Change language')}
                value={preferences.language}
                onChange={(value) => onPreferenceChange(preferencePatchForLanguage(value as LanguageCode))}
                theme={theme}
              >
                {Object.entries(languages).map(([code, language]) => (
                  <option key={code} value={code}>{language.nativeName}</option>
                ))}
              </AccountSelect>
            )}
          />
          <AccountSettingRow
            icon={BookOpen}
            label={ts('labels.bibleTranslation', 'Bible translation')}
            body={ts('labels.accountBibleBody', 'Engage scripture in words that speak to you.')}
            currentValue={selectedBible?.label ?? preferences.bibleTranslation}
            theme={theme}
            control={(
              <AccountSelect
                ariaLabel={ts('bibleSelect', 'Change Bible translation')}
                value={preferences.bibleTranslation}
                onChange={(value) => onPreferenceChange({ bibleTranslation: value as BibleTranslation })}
                theme={theme}
              >
                {bibleOptions.map((code) => {
                  const translation = bibleTranslations[code];
                  return (
                    <option key={code} value={code}>
                      {translation.language === preferences.language ? "" : `${languages[translation.language].nativeName} · `}{translation.label}
                    </option>
                  );
                })}
              </AccountSelect>
            )}
          />
          <AccountSettingRow
            icon={Sun}
            label={accountLabel(ts('labels.theme', 'Theme'))}
            body={ts('labels.accountThemeBody', 'Choose a space that feels calm and readable.')}
            currentValue={ts(`theme.${themePreference}`, themePreference)}
            theme={theme}
            control={(
              <ThemeSwatchGrid
                theme={theme}
                ts={ts}
                value={themePreference}
                onChange={onThemePreferenceChange}
              />
            )}
          />
          <AccountToggleRow
            icon={Mic}
            label={ts('labels.voiceInput', 'Voice input')}
            body={ts('labels.accountVoiceInputBody', 'Show the microphone beside Ask and enable voice controls when this device supports them.')}
            checked={preferences.voiceEnabled}
            onChange={(checked) => onPreferenceChange({ voiceEnabled: checked })}
            onLabel={ts('labels.enabled', 'Enabled')}
            offLabel={ts('labels.disabled', 'Disabled')}
            theme={theme}
          />
          {preferences.voiceEnabled ? (
            <AccountSettingRow
              icon={Volume2}
              label={ts('labels.readingVoice', 'Reading voice')}
              body={ts('labels.accountVoiceBody', 'Hear wisdom with care and clarity.')}
              currentValue={selectedVoiceLabel}
              theme={theme}
              control={(
                <VoicePreferenceSelector
                  theme={theme}
                  ts={ts}
                  voices={availableVoices}
                  selectedVoice={selectedVoice}
                  language={preferences.language}
                  onVoiceChange={onVoiceChange}
                />
              )}
            />
          ) : null}
        </div>

        <div className="space-y-3">
          <DisclosureSection
            title={ts('labels.focusIntentions', 'Focus intentions')}
            summary={selectedFocusCount
              ? `${selectedFocusCount}/3 ${ts('labels.selected', 'selected')} · ${focusIntentions.join(" · ")}`
              : ts('labels.focusIntentionsHint', 'Pick up to three intentions. Aletheia uses these to shape prompt suggestions and guidance emphasis.')}
            eyebrow={ts('labels.accountPersonalizationTitle', 'Personalization')}
            compactCollapsed
            showDetailsLabel={ts('showDetails', 'Show details')}
            hideDetailsLabel={ts('hideDetails', 'Hide details')}
            theme={theme}
          >
            <FocusIntentionsCard
              theme={theme}
              ts={ts}
              selected={focusIntentions}
              onChange={onFocusIntentionsChange}
              compact
            />
          </DisclosureSection>
          <AvatarStudioCard theme={theme} user={user} ts={ts} onUpdateProfileAvatar={onUpdateProfileAvatar} />
        </div>
      </div>
      <p className="rounded-md border px-3 py-2 text-xs leading-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
        {preferencesStatus || ts('notifications.preferencesReady', 'Language settings are ready.')}
      </p>
    </section>
  );
}

function ThemeSwatchGrid({
  theme,
  ts,
  value,
  onChange,
}: {
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}) {
  const options: Array<{ key: ThemePreference; icon: typeof Sun; colors: string[] }> = [
    { key: "system", icon: Monitor, colors: ["#f3efe4", "#1f342f", "#0b0f0d"] },
    { key: "classic", icon: Sun, colors: ["#f6f2e8", "#d8c079", "#203a35"] },
    { key: "dark", icon: Moon, colors: ["#10201c", "#d2b25c", "#f8f4e8"] },
    { key: "black", icon: Moon, colors: ["#050706", "#cdb35f", "#ffffff"] },
    { key: "warm", icon: Sun, colors: ["#fff4e8", "#b46a36", "#3f2418"] },
    { key: "ocean", icon: Sun, colors: ["#eef8fb", "#408198", "#143441"] },
    { key: "forest", icon: Sprout, colors: ["#eef7ef", "#477b55", "#173122"] },
    { key: "sunset", icon: Sun, colors: ["#fff0f4", "#c66c45", "#5b2636"] },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const active = value === option.key;
        const Icon = option.icon;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className="flex min-h-12 items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm font-semibold transition"
            style={{
              borderColor: active ? theme.accentGold : theme.borderMedium,
              backgroundColor: active ? theme.activeBg : theme.bgInput,
              color: theme.textPrimary,
              boxShadow: active ? `0 0 0 1px ${theme.accentGold}` : "none",
            }}
            aria-pressed={active}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-md" style={{ backgroundColor: theme.bgCardElevated, color: active ? theme.accentGold : theme.textSecondary }}>
                <Icon size={15} />
              </span>
              <span className="min-w-0 break-words leading-5">{ts(`theme.${option.key}`, option.key)}</span>
            </span>
            <span className="flex shrink-0 gap-1" aria-hidden="true">
              {option.colors.map((color) => (
                <span key={color} className="size-4 rounded-full border" style={{ backgroundColor: color, borderColor: active ? theme.accentGold : theme.borderLight }} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function VoicePreferenceSelector({
  theme,
  ts,
  voices,
  selectedVoice,
  language,
  onVoiceChange,
}: {
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  voices: SpeechSynthesisVoice[];
  selectedVoice: string | null;
  language: LanguageCode;
  onVoiceChange: (voiceURI: string | null) => void;
}) {
  const [previewStatus, setPreviewStatus] = useState("");
  const [previewingVoiceURI, setPreviewingVoiceURI] = useState<string | null | "default">(null);
  const [voiceListOpen, setVoiceListOpen] = useState(false);
  const selectedVoiceObject = voices.find((voice) => voice.voiceURI === selectedVoice);
  const voiceChoices = [
    ...(selectedVoiceObject ? [selectedVoiceObject] : []),
    ...voices.filter((voice) => voice.voiceURI !== selectedVoice).slice(0, 4),
  ].slice(0, 4);

  function previewVoice(voiceURI: string | null) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setPreviewStatus(ts('notifications.voiceOutputUnavailable', 'Voice output is not supported in this browser yet.'));
      return;
    }
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    const utterance = new SpeechSynthesisUtterance(ts('labels.voicePreviewText', 'Aletheia reads with calm, clarity, and care.'));
    utterance.lang = languages[language]?.speech ?? languages.en.speech;
    const voice = voiceURI ? voices.find((item) => item.voiceURI === voiceURI) : null;
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    const pacing = speechPacingForLanguage(language);
    utterance.rate = pacing.rate;
    utterance.pitch = pacing.pitch;
    utterance.volume = 1;
    setPreviewingVoiceURI(voiceURI ?? "default");
    setPreviewStatus(ts('labels.voicePreviewPlaying', 'Playing voice preview...'));
    utterance.onend = () => {
      setPreviewingVoiceURI(null);
      setPreviewStatus(ts('labels.voicePreviewDone', 'Preview finished.'));
    };
    utterance.onerror = () => {
      setPreviewingVoiceURI(null);
      setPreviewStatus(ts('labels.voicePreviewFailed', 'Preview could not play. Try another voice or your device default.'));
    };
    window.speechSynthesis.speak(utterance);
  }

  function chooseVoice(voiceURI: string | null) {
    onVoiceChange(voiceURI);
    setPreviewStatus(
      voiceURI
        ? ts('labels.voiceApplied', 'Voice selected. Use Preview to hear it.')
        : ts('labels.deviceVoiceApplied', 'Device default selected. Use Preview to hear it.')
    );
  }

  function renderVoicePreviewButton(voiceURI: string | null) {
    const isPreviewing = previewingVoiceURI === (voiceURI ?? "default");
    return (
      <button
        type="button"
        onClick={() => previewVoice(voiceURI)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold"
        style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}
      >
        {isPreviewing ? <Volume2 size={14} /> : <Play size={14} />}
        {ts('labels.preview', 'Preview')}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{ts('labels.voicePreference', 'Voice preference')}</p>
            <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>{ts('labels.voicePreferenceBody', 'Curated voices from this device. Preview before choosing.')}</p>
          </div>
          <div className="flex h-10 shrink-0 items-end gap-1" aria-hidden="true">
            {[14, 24, 18, 31, 22, 28, 16, 25].map((height, index) => (
              <span key={index} className="w-1.5 rounded-full" style={{ height, backgroundColor: index % 2 ? theme.accentGold : theme.primary }} />
            ))}
          </div>
        </div>
      </div>
      <div
        className="grid gap-3 rounded-md border p-3 text-left transition sm:grid-cols-[1fr_auto]"
        style={{
          borderColor: !selectedVoice ? theme.accentGold : theme.borderMedium,
          backgroundColor: !selectedVoice ? theme.activeBg : theme.bgInput,
          color: theme.textPrimary,
        }}
      >
        <div className="min-w-0">
          <span className="block text-sm font-semibold">{ts('labels.deviceDefaultRecommended', 'Device default (recommended)')}</span>
          <span className="mt-1 block text-xs" style={{ color: theme.textSecondary }}>{ts('labels.deviceVoiceBody', 'Uses the clearest available voice for this device.')}</span>
          {!selectedVoice ? (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ borderColor: theme.accentGold, backgroundColor: theme.activeBg, color: theme.accentGold }}>
              <Check size={12} />
              {ts('labels.selected', 'Selected')}
            </span>
          ) : null}
        </div>
        <span className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={() => chooseVoice(null)}
            className="h-10 rounded-md border px-3 text-xs font-semibold"
            style={{ borderColor: !selectedVoice ? theme.accentGold : theme.borderLight, backgroundColor: !selectedVoice ? theme.activeBg : theme.bgCardElevated, color: theme.textPrimary }}
            aria-pressed={!selectedVoice}
          >
            {ts('labels.useVoice', 'Use')}
          </button>
          {renderVoicePreviewButton(null)}
        </span>
      </div>
      {voiceChoices.length ? (
        <DisclosureSection
          title={ts('labels.curatedVoices', 'Curated voices')}
          summary={ts('labels.curatedVoicesBody', 'Browse a few device voices without filling the screen.')}
          eyebrow={ts('labels.moreVoices', 'More voices')}
          compactCollapsed
          isOpen={voiceListOpen}
          onOpenChange={setVoiceListOpen}
          showDetailsLabel={ts('showDetails', 'Show details')}
          hideDetailsLabel={ts('hideDetails', 'Hide details')}
          theme={theme}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {voiceChoices.map((voice) => {
              const active = selectedVoice === voice.voiceURI;
              return (
                <div
                  key={voice.voiceURI}
                  className="grid gap-3 rounded-md border p-3 text-left transition sm:grid-cols-[1fr_auto]"
                  style={{
                    borderColor: active ? theme.accentGold : theme.borderMedium,
                    backgroundColor: active ? theme.activeBg : theme.bgInput,
                    color: theme.textPrimary,
                  }}
                >
                  <div className="min-w-0">
                    <span className="block break-words text-sm font-semibold leading-5">{voice.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={{ color: theme.textSecondary }}>
                      <span>{voice.lang}</span>
                      <span className="rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
                        {voice.localService ? ts('labels.offlineVoice', 'Offline') : ts('labels.deviceVoice', 'Device')}
                      </span>
                    </span>
                    {active ? (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ borderColor: theme.accentGold, backgroundColor: theme.activeBg, color: theme.accentGold }}>
                        <Check size={12} />
                        {ts('labels.selected', 'Selected')}
                      </span>
                    ) : null}
                  </div>
                  <span className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                    <button
                      type="button"
                      onClick={() => chooseVoice(voice.voiceURI)}
                      className="h-10 rounded-md border px-3 text-xs font-semibold"
                      style={{ borderColor: active ? theme.accentGold : theme.borderLight, backgroundColor: active ? theme.activeBg : theme.bgCardElevated, color: theme.textPrimary }}
                      aria-pressed={active}
                    >
                      {active ? ts('labels.selected', 'Selected') : ts('labels.useVoice', 'Use')}
                    </button>
                    {renderVoicePreviewButton(voice.voiceURI)}
                  </span>
                </div>
              );
            })}
          </div>
        </DisclosureSection>
      ) : (
        <p className="rounded-md border p-3 text-sm leading-6" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
          {ts('labels.noCuratedVoices', 'No curated device voices are available yet. Device default remains available.')}
        </p>
      )}
      {previewStatus ? (
        <p className="rounded-md border px-3 py-2 text-xs leading-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }} aria-live="polite">
          {previewStatus}
        </p>
      ) : null}
    </div>
  );
}

function FocusIntentionsCard({
  theme,
  ts,
  selected,
  onChange,
  compact = false,
}: {
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  selected: string[];
  onChange: (intentions: string[]) => void;
  compact?: boolean;
}) {
  const options = localizedFocusIntentions(ts);
  const selectedSet = new Set(selected);

  function toggle(key: FocusIntentionKey) {
    const next = selectedSet.has(key)
      ? selected.filter((item) => item !== key)
      : [...selected, key].slice(0, 3);
    onChange(next);
  }

  return (
    <section className={`rounded-xl border ${compact ? "p-2.5 sm:p-3" : "p-3"}`} style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md" style={{ backgroundColor: theme.bgInput, color: theme.primary }}>
          <Sparkles size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.focusIntentions', 'Focus intentions')}</p>
              <p className="mt-1 text-xs leading-5" style={{ color: theme.textSecondary }}>{ts('labels.focusIntentionsHint', 'Pick up to three intentions. Aletheia uses these to shape prompt suggestions and guidance emphasis.')}</p>
            </div>
            <span className="shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {selected.length}/3 {ts('labels.selected', 'selected')}
            </span>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory sm:grid sm:grid-flow-row sm:grid-cols-2 sm:overflow-visible xl:grid-cols-3">
            {options.map((option) => {
              const active = selectedSet.has(option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggle(option.key)}
                  className={`flex min-h-16 min-w-[14rem] snap-start items-start gap-2 rounded-lg border ${compact ? "p-2" : "p-2.5"} text-left transition sm:min-w-0`}
                  style={{
                    borderColor: active ? theme.accentGold : theme.borderMedium,
                    backgroundColor: active ? theme.activeBg : theme.bgInput,
                    color: theme.textPrimary,
                  }}
                  aria-pressed={active}
                >
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border" style={{ borderColor: active ? theme.accentGold : theme.borderMedium, backgroundColor: active ? theme.primary : "transparent", color: active ? theme.textOnPrimary : theme.textSecondary }}>
                    {active ? <Check size={13} /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="mt-1 block text-xs leading-5" style={{ color: theme.textSecondary }}>{option.body}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function SystemStatusCard({
  theme,
  ts,
  user,
  conversations,
  decisions,
  reflections,
  counselContacts,
  notificationsEnabled,
}: {
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  user: User | null;
  conversations: number;
  decisions: number;
  reflections: number;
  counselContacts: number;
  notificationsEnabled: boolean;
}) {
  return (
    <section className="rounded-lg border p-4 shadow-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-md" style={{ backgroundColor: theme.bgInput, color: theme.primary }}>
          <WifiOff size={18} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.sync', 'Sync')}</p>
          <h3 className="mt-1 text-lg font-semibold" style={{ color: theme.textPrimary }}>
            {user ? ts('labels.accountSyncActive', 'Sync active.') : ts('auth.guestMode', 'Guest mode')}
          </h3>
          <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>
            {user ? ts('labels.whatSyncsSignedIn', 'Decisions, reflections, profile, preferences, and counsel circle sync with your account.') : ts('labels.whatSyncsGuest', 'Nothing syncs in guest mode until you sign in.')}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <AccountStat label={ts('labels.accountStatConversations', 'Conversations')} value={String(conversations)} theme={theme} />
        <AccountStat label={ts('labels.accountStatDecisions', 'Decisions')} value={String(decisions)} theme={theme} />
        <AccountStat label={ts('labels.accountStatJournalEntries', 'Journal entries')} value={String(reflections)} theme={theme} />
        <AccountStat label={ts('labels.counselContacts', 'Counsel contacts')} value={String(counselContacts)} theme={theme} />
      </div>
      <p className="mt-3 rounded-md border px-3 py-2 text-xs leading-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
        {notificationsEnabled ? ts('notifications.deviceSubscribed', 'This device is subscribed for daily wisdom.') : ts('notifications.notificationsOptionalWhenReady', 'Notifications can be enabled when you are ready.')}
      </p>
    </section>
  );
}

function DataBoundariesCard({
  theme,
  ts,
  user,
  hasLocalWorkspaceData,
  onClearLocalPersonalization,
  onClearGuestWorkspace,
  onExportData,
  onRequestDeleteAccount,
  accountActionBusy,
}: {
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  user: User | null;
  hasLocalWorkspaceData: boolean;
  onClearLocalPersonalization: () => void;
  onClearGuestWorkspace: () => void;
  onExportData: () => void;
  onRequestDeleteAccount: () => void;
  accountActionBusy: "export" | "delete" | "report" | null;
}) {
  return (
    <section className="rounded-lg border p-4 shadow-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.yourDataBoundaries', 'Your data boundaries')}</p>
      <div className="mt-3 grid gap-2">
        <div className="rounded-md border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>{ts('labels.whatSyncs', 'What syncs')}</p>
          <p className="mt-1 text-sm leading-6" style={{ color: theme.textPrimary }}>{user ? ts('labels.whatSyncsSignedIn', 'Decisions, reflections, profile, preferences, and counsel circle sync with your account.') : ts('labels.whatSyncsGuest', 'Nothing syncs in guest mode until you sign in.')}</p>
        </div>
        <div className="rounded-md border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>{ts('labels.whatStaysLocal', 'What stays local')}</p>
          <p className="mt-1 text-sm leading-6" style={{ color: theme.textPrimary }}>{ts('labels.whatStaysLocalBody', 'Device-specific voice, theme preference, local context drafts, and focus intentions stay local until changed.')}</p>
        </div>
        <div className="rounded-md border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>{ts('labels.signOutPrivacy', 'Sign-out privacy')}</p>
          <p className="mt-1 text-sm leading-6" style={{ color: theme.textPrimary }}>
            {ts('labels.signOutPrivacyBody', 'Signing out hides synced private workspace data on this device. It returns only after you sign back in.')}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="h-11 rounded-md border px-4 text-sm font-semibold"
          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
          onClick={onClearLocalPersonalization}
        >
          {ts('labels.clearLocalSettings', 'Clear local settings')}
        </button>
        {!user ? (
          <button
            type="button"
            className="h-11 rounded-md border px-4 text-sm font-semibold"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: hasLocalWorkspaceData ? theme.textPrimary : theme.textSecondary, opacity: hasLocalWorkspaceData ? 1 : 0.65 }}
            disabled={!hasLocalWorkspaceData}
            onClick={onClearGuestWorkspace}
          >
            {ts('labels.clearGuestWorkspace', 'Clear guest workspace')}
          </button>
        ) : null}
        <button
          type="button"
          className="h-11 rounded-md border px-4 text-sm font-semibold"
          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: user ? theme.textPrimary : theme.textSecondary, opacity: user ? 1 : 0.65 }}
          disabled={!user || accountActionBusy === "export"}
          onClick={onExportData}
        >
          {accountActionBusy === "export" ? ts('labels.preparingExport', 'Preparing export...') : ts('labels.exportData', 'Export data')}
        </button>
        <button
          type="button"
          className="h-11 rounded-md border px-4 text-sm font-semibold"
          style={{ borderColor: theme.borderStrong, backgroundColor: theme.bgInput, color: user ? theme.textPrimary : theme.textSecondary, opacity: user ? 1 : 0.65 }}
          disabled={!user || accountActionBusy === "delete"}
          onClick={onRequestDeleteAccount}
        >
          {ts('labels.deleteAccount', 'Delete account')}
        </button>
      </div>
      {!user ? (
        <p className="mt-3 text-xs leading-5" style={{ color: theme.textSecondary }}>
          {ts('labels.signInToExportDelete', 'Sign in to export or delete synced account data. Guest data remains on this device.')}
        </p>
      ) : null}
    </section>
  );
}

function SupportReportCard({
  theme,
  ts,
  onReportIssue,
}: {
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  onReportIssue: () => void;
}) {
  return (
    <section className="rounded-lg border p-4 shadow-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-md" style={{ backgroundColor: theme.bgInput, color: theme.primary }}>
          <MessageCircle size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.support', 'Support')}</p>
          <h3 className="mt-2 text-lg font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.reportIssueTitle', 'Report an issue')}</h3>
          <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
            {ts('labels.reportIssueBody', 'Send feedback, a bug, or a confusing workflow. Private chats, journals, decisions, and manual context are not attached.')}
          </p>
          <button
            type="button"
            className="mt-3 h-11 rounded-md border px-4 text-sm font-semibold"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            onClick={onReportIssue}
          >
            {ts('labels.openReportIssue', 'Open report form')}
          </button>
        </div>
      </div>
    </section>
  );
}

function TrustCenterCard({ theme, ts }: { theme: ThemeColors; ts: (key: string, fallback?: string) => string }) {
  const items = [
    {
      label: ts('labels.trustNeverDoTitle', 'What Aletheia will never do'),
      body: ts('labels.trustNeverDoBody', 'It will not promise financial outcomes, predict markets, claim divine certainty, pressure giving, or replace qualified financial, legal, tax, medical, or pastoral counsel.'),
    },
    {
      label: ts('labels.trustScriptureSourceTitle', 'How scripture is sourced'),
      body: ts('labels.trustScriptureSourceBody', 'References come from the curated wisdom library. If verse text is not available in the chosen public-domain translation, Aletheia clearly marks the fallback or summary.'),
    },
    {
      label: ts('labels.trustDataSavedTitle', 'What data is saved'),
      body: ts('labels.trustDataSavedBody', 'Signed-in users can sync conversations, decisions, reflections, preferences, counsel contacts, rules of life, notification status, and optional manual context.'),
    },
    {
      label: ts('labels.trustDeleteExportTitle', 'Delete and export posture'),
      body: ts('labels.trustDeleteExportBody', 'Private sharing is explicit. Decision summaries can be shared with mentors, but chats and journals are not shared by default. Full export/delete controls should be a dedicated production settings flow before scale.'),
    },
  ];

  return (
    <section className="rounded-lg border p-4 shadow-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
      <div className="flex items-center gap-2">
        <ShieldCheck size={17} style={{ color: theme.primary }} />
        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.trustCenterTitle', 'Trust Center')}</p>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <details key={item.label} className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
            <summary className="cursor-pointer text-sm font-semibold" style={{ color: theme.textPrimary }}>{item.label}</summary>
            <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>{item.body}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function AccountStat({ label, value, theme }: { label: string; value: string; theme: ThemeColors }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>{label}</p>
      <p className="mt-2 text-2xl font-semibold" style={{ color: theme.textPrimary }}>{value}</p>
    </div>
  );
}

function InstallGuideCard({ theme, compact = false }: { theme: ThemeColors; compact?: boolean }) {
  const [installState, setInstallState] = useState({
    standalone: false,
    platform: "desktop" as "ios" | "android" | "desktop",
  });
  const [stepsOpen, setStepsOpen] = useState(!compact);

  useEffect(() => {
    window.setTimeout(() => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const platform = /iphone|ipad|ipod/.test(userAgent)
        ? "ios"
        : /android/.test(userAgent)
          ? "android"
          : "desktop";
      setInstallState({ standalone: isStandalone, platform });
    }, 0);
  }, []);

  const steps =
    installState.platform === "ios"
      ? ["Open Aletheia in Safari.", "Tap Share.", "Choose Add to Home Screen."]
      : installState.platform === "android"
        ? ["Open Aletheia in Chrome.", "Tap the menu.", "Choose Install app or Add to Home screen."]
        : ["Open Aletheia in Chrome, Edge, or Safari.", "Use the install icon in the address bar or browser menu.", "Launch it from your dock, desktop, or apps folder."];

  return (
    <section className={`rounded-xl shadow-sm ${compact ? "p-3" : "p-4 sm:p-5"}`} style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md" style={{ backgroundColor: theme.bgInput, color: theme.primary }}>
          <Home size={17} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
            {installState.standalone ? "Aletheia is installed on this device" : "Install Aletheia on your home screen"}
          </p>
          <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>
            {installState.standalone
              ? "You are already using the app-like experience."
              : "Turn the website into an app icon so it opens full-screen and feels native."}
          </p>
        </div>
      </div>
      {!installState.standalone ? (
        <DisclosureSection
          title={compact ? "Install steps" : "How to install"}
          summary={compact ? "Tap to see the quick app-install path." : "Open the browser menu or share sheet and add Aletheia to your device."}
          eyebrow={compact ? "Install" : "Install guide"}
          compactCollapsed
          isOpen={stepsOpen}
          onOpenChange={setStepsOpen}
          showDetailsLabel="Show steps"
          hideDetailsLabel="Hide steps"
          theme={theme}
          className="mt-3"
        >
          <ol className={`grid gap-2 text-sm leading-6 ${compact ? "" : "sm:grid-cols-3"}`} style={{ color: theme.textSecondary }}>
            {steps.map((step, index) => (
              <li key={step} className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>Step {index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </DisclosureSection>
      ) : null}
      <p className="mt-3 text-xs leading-5" style={{ color: theme.textMuted }}>
        On iPhone and iPad, daily web push notifications are most reliable after Aletheia is added to the Home Screen.
      </p>
    </section>
  );
}

function ManualContextPanel({
  theme,
  ts,
  user,
  preferences,
  context,
  status,
  onPreferenceChange,
  onChange,
}: {
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  user: User | null;
  preferences: UserPreferences;
  context: ManualContextProfile;
  status: string;
  onPreferenceChange: (patch: Partial<UserPreferences>) => void;
  onChange: (patch: Partial<ManualContextProfile>) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(context);
  const [contextTab, setContextTab] = useState<"current" | "future">("current");
  const [currentContextFocus, setCurrentContextFocus] = useState<"money" | "work" | "health" | "relationships" | "values" | "counsel">("money");
  const [futureContextFocus, setFutureContextFocus] = useState<"money" | "rhythm" | "posture">("money");
  const [quickDetailType, setQuickDetailType] = useState<"financeContext" | "workContext" | "healthContext" | "obligations" | "boundaries" | "enoughDefinition">("financeContext");
  const [quickDetail, setQuickDetail] = useState("");
  const [manualContextFeedback, setManualContextFeedback] = useState("");
  const [manualContextSaving, setManualContextSaving] = useState(false);
  const [contextEditorOpen, setContextEditorOpen] = useState(false);
  const [quickDetailOpen, setQuickDetailOpen] = useState(false);
  const [privacyPostureOpen, setPrivacyPostureOpen] = useState(false);
  const manualCopy = {
    title: ts('labels.manualContextTitle', 'Manual Context Vault'),
    intro: ts('manualContext.intro', 'Add only the health, money, work, and life context you want Aletheia to consider. No external apps are connected.'),
    active: ts('manualContext.active', 'Context is active'),
    paused: ts('manualContext.paused', 'Context is paused'),
    areaSingular: ts('manualContext.areaSingular', 'area'),
    areaPlural: ts('manualContext.areaPlural', 'areas'),
    added: ts('manualContext.added', 'added'),
    areaSummary: ts('manualContext.areaSummary', 'Aletheia will use only the enabled areas below when shaping counsel.'),
    quickTitle: ts('manualContext.quickTitle', 'Add one helpful detail'),
    quickBody: ts('manualContext.quickBody', 'One honest detail is enough to make Aletheia’s counsel more personal.'),
    addDetail: ts('manualContext.addDetail', 'Add detail'),
    allowContextPrompt: ts('labels.allowContextPrompt', 'Allow Aletheia to use this context in answers'),
    allowContextBody: ts('manualContext.allowContextBody', 'Turn this off anytime. Saved context remains private and will not shape responses while off.'),
    useMoney: ts('labels.useMoneyContext', 'Use money context in answers'),
    useWork: ts('labels.useWorkContext', 'Use work context in answers'),
    useHealth: ts('labels.useHealthContext', 'Use health rhythm in answers'),
    useRelationships: ts('labels.useRelationshipsContext', 'Use relationships context in answers'),
    useValues: ts('manualContext.useValuesContext', 'Use values, risk, and counsel preferences in answers'),
    currentState: ts('manualContext.currentState', 'Current state'),
    futureState: ts('manualContext.futureState', 'Future state'),
    activeArea: ts('manualContext.activeArea', 'active area'),
    activeAreas: ts('manualContext.activeAreas', 'active areas'),
    directionAdded: ts('manualContext.directionAdded', 'Direction added'),
    notAddedYet: ts('manualContext.notAddedYet', 'Not added yet'),
    moneyPicture: ts('manualContext.moneyPicture', 'Money picture'),
    workRhythm: ts('manualContext.workRhythm', 'Work rhythm'),
    valuesRiskPosture: ts('manualContext.valuesRiskPosture', 'Values and risk posture'),
    counselPreferences: ts('manualContext.counselPreferences', 'Counsel preferences'),
    healthRelationships: ts('manualContext.healthRelationships', 'Health and relationships'),
    desiredFutureState: ts('manualContext.desiredFutureState', 'Desired future state'),
    desiredFutureBody: ts('manualContext.desiredFutureBody', 'Add the direction you want Aletheia to keep in view. Counsel will connect present choices to these desired rhythms without promising outcomes.'),
    privacyPosture: ts('labels.privacyPosture', 'Privacy posture'),
    privacyBody: ts('manualContext.privacyBody', 'This is manual, optional, and scoped to your account or this device. Aletheia does not connect to Apple Watch, banks, payroll, or medical systems here.'),
    signedInSync: ts('manualContext.signedInSync', 'Signed-in context can sync across devices.'),
    guestSync: ts('manualContext.guestSync', 'Guest context stays on this device until you sign in.'),
    clearFields: ts('manualContext.clearFields', 'You can delete any field by clearing it.'),
    nothingAdded: ts('manualContext.nothingAdded', 'Nothing has been added yet.'),
    saveManualContext: ts('manualContext.saveManualContext', 'Save manual context'),
    savingManualContext: ts('manualContext.savingManualContext', 'Saving context...'),
    manualContextSaved: ts('manualContext.manualContextSaved', 'Manual context saved.'),
    detailSaved: ts('manualContext.detailSaved', 'Detail added and saved.'),
    incomeAdded: ts('manualContext.incomeAdded', 'Income added'),
    incomeNotAdded: ts('manualContext.incomeNotAdded', 'Income not added'),
    savingsAdded: ts('manualContext.savingsAdded', 'savings added'),
    savingsNotAdded: ts('manualContext.savingsNotAdded', 'savings not added'),
    debtAdded: ts('manualContext.debtAdded', 'debt added'),
    debtNotAdded: ts('manualContext.debtNotAdded', 'debt not added'),
    contextAdded: ts('manualContext.contextAdded', 'context added'),
    contextNotAdded: ts('manualContext.contextNotAdded', 'context not added'),
    notAdded: ts('manualContext.notAdded', 'not added'),
    enoughDefined: ts('manualContext.enoughDefined', 'enough defined'),
    enoughNotDefined: ts('manualContext.enoughNotDefined', 'enough not defined'),
    riskAdded: ts('manualContext.riskAdded', 'risk added'),
    riskNotAdded: ts('manualContext.riskNotAdded', 'risk not added'),
    waitingAdded: ts('manualContext.waitingAdded', 'waiting added'),
    waitingNotAdded: ts('manualContext.waitingNotAdded', 'waiting not added'),
    counselAdded: ts('manualContext.counselAdded', 'counsel added'),
    counselNotAdded: ts('manualContext.counselNotAdded', 'counsel not added'),
  };
  useEffect(() => {
    window.setTimeout(() => setDraft(context), 0);
  }, [context]);
  const hasContent = manualContextHasContent(draft);
  const hasFutureMoney = draft.targetSavingsBufferMonths !== null || (draft.futureFinanceContext ?? "").trim().length > 0;
  const hasFutureRhythm = [
    draft.targetWorkHoursPerWeek,
    draft.targetSleepHours,
    draft.targetExerciseSessionsPerWeek,
    draft.targetTimeWithLovedOnesHoursPerWeek,
    draft.targetTimeWithCommunityHoursPerWeek,
    draft.futureWorkContext,
    draft.futureHealthContext,
    draft.futureRelationshipsContext,
  ].some((value) => value !== null && String(value).trim().length > 0);
  const hasFuturePosture = [
    draft.targetStressLevel,
    draft.targetUrgencyLevel,
    draft.targetSupportLevel,
    draft.futureValuesContext,
    draft.futureGoals,
    draft.futureBoundaries,
  ].some((value) => value !== null && String(value).trim().length > 0);
  const hasFutureState = hasFutureMoney || hasFutureRhythm || hasFuturePosture;
  const sectionSummary = {
    money: `${draft.monthlyIncome !== null ? manualCopy.incomeAdded : manualCopy.incomeNotAdded} · ${draft.savingsBufferMonths !== null ? manualCopy.savingsAdded : manualCopy.savingsNotAdded} · ${draft.debtPayments !== null ? manualCopy.debtAdded : manualCopy.debtNotAdded}`,
    work: `${manualCopy.workRhythm} ${draft.workHoursPerWeek !== null ? `${draft.workHoursPerWeek}h/week` : manualCopy.notAdded} · ${draft.workContext ? manualCopy.contextAdded : manualCopy.contextNotAdded}`,
    health: `${ts('manualContext.sleepSummary', 'Sleep')} ${draft.sleepHours !== null ? `${draft.sleepHours}h` : manualCopy.notAdded} · ${ts('manualContext.exerciseSummary', 'exercise')} ${draft.exerciseSessionsPerWeek !== null ? `${draft.exerciseSessionsPerWeek}/week` : manualCopy.notAdded}`,
    relationships: `${ts('manualContext.lovedOnesSummary', 'Loved ones')} ${draft.timeWithLovedOnesHoursPerWeek !== null ? `${draft.timeWithLovedOnesHoursPerWeek}h/week` : manualCopy.notAdded} · ${ts('manualContext.obligationsSummary', 'obligations')} ${draft.obligations ? manualCopy.added : manualCopy.notAdded}`,
    values: `${ts('manualContext.stressSummary', 'Stress')} ${draft.stressLevel !== null ? draft.stressLevel : manualCopy.notAdded} · ${ts('manualContext.urgencySummary', 'urgency')} ${draft.urgencyLevel !== null ? draft.urgencyLevel : manualCopy.notAdded} · ${draft.enoughDefinition ? manualCopy.enoughDefined : manualCopy.enoughNotDefined}`,
    counsel: `${draft.riskTolerance ? manualCopy.riskAdded : manualCopy.riskNotAdded} · ${draft.waitingPreference ? manualCopy.waitingAdded : manualCopy.waitingNotAdded} · ${draft.counselCadence ? manualCopy.counselAdded : manualCopy.counselNotAdded}`,
  };
  const currentContextCards: Array<{
    key: "money" | "work" | "health" | "relationships" | "values" | "counsel";
    label: string;
    summary: string;
    icon: typeof PiggyBank;
    active: boolean;
  }> = [
    { key: "money", label: manualCopy.moneyPicture, summary: sectionSummary.money, icon: PiggyBank, active: Boolean(draft.monthlyIncome !== null || draft.fixedExpenses !== null || draft.debtPayments !== null || draft.savingsBufferMonths !== null || draft.givingTargetPercent !== null || draft.financialDependents !== null || draft.financeContext.trim()) },
    { key: "work", label: manualCopy.workRhythm, summary: sectionSummary.work, icon: BriefcaseBusiness, active: Boolean(draft.workContext || draft.workHoursPerWeek !== null || draft.commuteHoursPerWeek !== null) },
    { key: "health", label: ts('manualContext.healthCard', 'Health'), summary: sectionSummary.health, icon: Sprout, active: Boolean(draft.healthContext || draft.sleepHours !== null || draft.exerciseSessionsPerWeek !== null) },
    { key: "relationships", label: ts('manualContext.relationshipsCard', 'Relationships'), summary: sectionSummary.relationships, icon: Users, active: Boolean(draft.obligations || draft.timeWithLovedOnesHoursPerWeek !== null || draft.timeWithCommunityHoursPerWeek !== null) },
    { key: "values", label: manualCopy.valuesRiskPosture, summary: sectionSummary.values, icon: ShieldCheck, active: Boolean(draft.stressLevel !== null || draft.energyDrainLevel !== null || draft.urgencyLevel !== null || draft.supportLevel !== null || draft.enoughDefinition || draft.mustNotSacrifice || draft.boundaries) },
    { key: "counsel", label: manualCopy.counselPreferences, summary: sectionSummary.counsel, icon: Compass, active: Boolean(draft.goals.trim() || draft.riskTolerance.trim() || draft.waitingPreference.trim() || draft.counselCadence.trim() || draft.successDefinition.trim()) },
  ];
  const futureContextCards: Array<{
    key: "money" | "rhythm" | "posture";
    label: string;
    summary: string;
    icon: typeof PiggyBank;
    active: boolean;
  }> = [
    {
      key: "money",
      label: ts('manualContext.futureMoneyCardTitle', 'Future money'),
      summary: hasFutureMoney ? `${draft.targetSavingsBufferMonths !== null ? `${ts('manualContext.targetSavingsBufferMonths', 'Target savings buffer')}: ${draft.targetSavingsBufferMonths}` : manualCopy.notAddedYet} · ${draft.futureFinanceContext.trim() ? manualCopy.directionAdded : manualCopy.notAddedYet}` : manualCopy.notAddedYet,
      icon: PiggyBank,
      active: hasFutureMoney,
    },
    {
      key: "rhythm",
      label: ts('manualContext.futureRhythmCardTitle', 'Future rhythm'),
      summary: hasFutureRhythm ? `${draft.targetWorkHoursPerWeek !== null ? `${ts('manualContext.targetWorkHoursPerWeek', 'Target work hours/week')}: ${draft.targetWorkHoursPerWeek}` : manualCopy.notAddedYet} · ${draft.futureWorkContext.trim() || draft.futureHealthContext.trim() || draft.futureRelationshipsContext.trim() ? manualCopy.directionAdded : manualCopy.notAddedYet}` : manualCopy.notAddedYet,
      icon: Clock3,
      active: hasFutureRhythm,
    },
    {
      key: "posture",
      label: ts('manualContext.futurePostureCardTitle', 'Future posture'),
      summary: hasFuturePosture ? `${draft.targetStressLevel !== null ? `${ts('manualContext.targetStressLevel', 'Target stress (0-10)')}: ${draft.targetStressLevel}` : manualCopy.notAddedYet} · ${draft.futureValuesContext.trim() || draft.futureGoals.trim() || draft.futureBoundaries.trim() ? manualCopy.directionAdded : manualCopy.notAddedYet}` : manualCopy.notAddedYet,
      icon: Sparkles,
      active: hasFuturePosture,
    },
  ];
  const activeContextSections = currentContextCards.filter((card) => card.active).length;
  const renderNumberFieldGrid = (fields: Array<{ key: keyof ManualContextProfile; label: string; step?: number; min: number; max: number }>) => (
    <div className="grid grid-flow-col auto-cols-[minmax(15rem,1fr)] gap-3 overflow-x-auto pb-1 snap-x snap-mandatory sm:grid sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:overflow-visible xl:grid-cols-3">
      {fields.map((field) => (
        <RangeField
          key={String(field.key)}
          label={field.label}
          value={draft[field.key] as number | null}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          onChange={(value) => updateDraft({ [field.key]: value } as Partial<ManualContextProfile>)}
          ts={ts}
          theme={theme}
        />
      ))}
    </div>
  );
  const renderTextFieldGrid = (fields: Array<{ key: keyof ManualContextProfile; label: string; placeholder: string }>) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <label key={String(field.key)} className="rounded-lg border p-3 text-xs font-semibold uppercase tracking-[0.12em]" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
          {field.label}
          <textarea
            value={String(draft[field.key] ?? "")}
            onChange={(event) => updateDraft({ [field.key]: event.target.value } as Partial<ManualContextProfile>)}
            className="mt-2 min-h-28 w-full resize-none rounded-md border px-3 py-3 text-sm normal-case leading-6 tracking-normal outline-none"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard, color: theme.textPrimary }}
            placeholder={field.placeholder}
          />
        </label>
      ))}
    </div>
  );
  const renderInputFieldGrid = (fields: Array<{ key: keyof ManualContextProfile; label: string; placeholder: string }>) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <label key={String(field.key)} className="rounded-lg border p-3 text-xs font-semibold uppercase tracking-[0.12em]" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
          {field.label}
          <input
            value={String(draft[field.key] ?? "")}
            onChange={(event) => updateDraft({ [field.key]: event.target.value } as Partial<ManualContextProfile>)}
            className="mt-2 h-11 w-full rounded-md border px-3 text-sm normal-case tracking-normal outline-none"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard, color: theme.textPrimary }}
            placeholder={field.placeholder}
          />
        </label>
      ))}
    </div>
  );
  const renderCardRail = <T extends string,>(
    cards: Array<{
      key: T;
      label: string;
      summary: string;
      icon: typeof PiggyBank;
      active: boolean;
    }>,
    activeKey: T,
    onSelect: (key: T) => void
  ) => (
    <div className="grid grid-flow-col auto-cols-[minmax(15rem,1fr)] gap-2 overflow-x-auto pb-1 snap-x snap-mandatory sm:grid sm:grid-flow-row sm:grid-cols-2 sm:auto-cols-auto sm:overflow-visible xl:grid-cols-3">
      {cards.map((card) => {
        const active = card.key === activeKey;
        const Icon = card.icon;
        return (
            <button
              key={card.key}
              type="button"
              onClick={() => onSelect(card.key)}
            className="premium-tap-card min-w-0 shrink-0 snap-start rounded-xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5"
            style={{
              borderColor: active ? theme.accentGold : theme.borderLight,
              backgroundColor: active ? theme.activeBg : theme.bgCardElevated,
              color: theme.textPrimary,
              boxShadow: active ? `0 0 0 1px ${theme.accentGold}` : "none",
            }}
            aria-pressed={active}
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border" style={{ borderColor: active ? theme.accentGold : theme.borderLight, backgroundColor: theme.bgInput, color: active ? theme.primary : theme.textSecondary }}>
                <Icon size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-5">{card.label}</span>
                <span className="mt-1 block text-xs leading-5" style={{ color: theme.textSecondary }}>{card.summary}</span>
              </span>
            </div>
            <span className="mt-3 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ borderColor: card.active ? theme.accentGold : theme.borderLight, backgroundColor: card.active ? theme.activeBg : theme.bgInput, color: card.active ? theme.accentGold : theme.textSecondary }}>
              {card.active ? <Check size={12} /> : null}
              {card.active ? manualCopy.added : manualCopy.notAddedYet}
            </span>
          </button>
        );
      })}
    </div>
  );
  const renderCurrentContextEditor = () => {
    switch (currentContextFocus) {
      case "money":
        return (
          <div className="space-y-4">
            {renderNumberFieldGrid([
              { key: "monthlyIncome", label: ts('manualContext.monthlyIncome', 'Monthly income'), step: 100, min: 0, max: 50000 },
              { key: "fixedExpenses", label: ts('manualContext.fixedExpenses', 'Fixed monthly expenses'), step: 100, min: 0, max: 50000 },
              { key: "debtPayments", label: ts('manualContext.debtPayments', 'Monthly debt payments'), step: 50, min: 0, max: 20000 },
              { key: "savingsBufferMonths", label: ts('manualContext.savingsBufferMonths', 'Savings buffer (months)'), step: 0.1, min: 0, max: 60 },
              { key: "givingTargetPercent", label: ts('manualContext.givingTargetPercent', 'Giving target (%)'), step: 0.5, min: 0, max: 100 },
              { key: "financialDependents", label: ts('manualContext.financialDependents', 'Financial dependents'), step: 1, min: 0, max: 20 },
            ])}
            {renderTextFieldGrid([
              { key: "financeContext", label: ts('manualContext.financeContextLabel', 'Money context'), placeholder: ts('manualContext.financeContextPlaceholder', 'Current pressure, obligations, giving posture, spending tension...') },
            ])}
          </div>
        );
      case "work":
        return (
          <div className="space-y-4">
            {renderNumberFieldGrid([
              { key: "workHoursPerWeek", label: ts('manualContext.workHoursPerWeek', 'Work hours per week'), step: 0.5, min: 0, max: 120 },
              { key: "commuteHoursPerWeek", label: ts('manualContext.commuteHoursPerWeek', 'Commute hours per week'), step: 0.5, min: 0, max: 60 },
            ])}
            {renderTextFieldGrid([
              { key: "workContext", label: ts('manualContext.workContextLabel', 'Work context'), placeholder: ts('manualContext.workContextPlaceholder', 'Role, workload, calling tension, business stage, leadership strain...') },
            ])}
          </div>
        );
      case "health":
        return (
          <div className="space-y-4">
            {renderNumberFieldGrid([
              { key: "sleepHours", label: ts('manualContext.sleepHours', 'Sleep hours (avg/day)'), step: 0.1, min: 0, max: 24 },
              { key: "exerciseSessionsPerWeek", label: ts('manualContext.exerciseSessionsPerWeek', 'Exercise sessions/week'), step: 1, min: 0, max: 30 },
            ])}
            {renderTextFieldGrid([
              { key: "healthContext", label: ts('manualContext.healthContextLabel', 'Health context'), placeholder: ts('manualContext.healthContextPlaceholder', 'Energy pattern, limits, sleep rhythm, recovery factors...') },
            ])}
          </div>
        );
      case "relationships":
        return (
          <div className="space-y-4">
            {renderNumberFieldGrid([
              { key: "timeWithLovedOnesHoursPerWeek", label: ts('manualContext.timeWithLovedOnesHoursPerWeek', 'Hours with loved ones/week'), step: 0.5, min: 0, max: 120 },
              { key: "timeWithCommunityHoursPerWeek", label: ts('manualContext.timeWithCommunityHoursPerWeek', 'Hours with community/week'), step: 0.5, min: 0, max: 120 },
            ])}
            {renderTextFieldGrid([
              { key: "obligations", label: ts('manualContext.obligationsLabel', 'Responsibilities'), placeholder: ts('manualContext.obligationsPlaceholder', 'Dependents, caregiving, family obligations, community load...') },
            ])}
          </div>
        );
      case "values":
        return (
          <div className="space-y-4">
            {renderNumberFieldGrid([
              { key: "stressLevel", label: ts('manualContext.stressLevel', 'Stress (0-10)'), min: 0, max: 10 },
              { key: "energyDrainLevel", label: ts('manualContext.energyDrainLevel', 'Energy drain (0-10)'), min: 0, max: 10 },
              { key: "urgencyLevel", label: ts('manualContext.urgencyLevel', 'Urgency pressure (0-10)'), min: 0, max: 10 },
              { key: "supportLevel", label: ts('manualContext.supportLevel', 'Support strength (0-10)'), min: 0, max: 10 },
            ])}
            {renderTextFieldGrid([
              { key: "enoughDefinition", label: ts('manualContext.enoughDefinitionLabel', 'Definition of enough'), placeholder: ts('manualContext.enoughDefinitionPlaceholder', "What 'enough' means in this season...") },
              { key: "mustNotSacrifice", label: ts('manualContext.mustNotSacrificeLabel', 'Must not sacrifice'), placeholder: ts('manualContext.mustNotSacrificePlaceholder', 'Peace, integrity, family time, Sabbath, health...') },
              { key: "boundaries", label: ts('manualContext.boundariesLabel', 'Guidance boundaries'), placeholder: ts('manualContext.boundariesPlaceholder', 'What Aletheia should avoid assuming or overemphasizing...') },
            ])}
          </div>
        );
      case "counsel":
        return (
          <div className="space-y-4">
            {renderTextFieldGrid([
              { key: "goals", label: ts('manualContext.goalsLabel', 'Current goals'), placeholder: ts('manualContext.goalsPlaceholder', 'What you are trying to build with money, work, and life...') },
            ])}
            {renderInputFieldGrid([
              { key: "riskTolerance", label: ts('manualContext.riskTolerance', 'Risk tolerance'), placeholder: ts('manualContext.riskTolerancePlaceholder', 'Conservative, moderate, aggressive, depends on season...') },
              { key: "waitingPreference", label: ts('manualContext.waitingPreference', 'Waiting preference'), placeholder: ts('manualContext.waitingPreferencePlaceholder', '24h, 3 days, 7 days, 30 days for major decisions...') },
              { key: "counselCadence", label: ts('manualContext.counselCadence', 'Counsel rhythm'), placeholder: ts('manualContext.counselCadencePlaceholder', 'Who I check with and how often...') },
              { key: "successDefinition", label: ts('manualContext.successDefinition', 'Definition of success'), placeholder: ts('manualContext.successDefinitionPlaceholder', 'How I measure faithful success, not just outcomes...') },
            ])}
          </div>
        );
      default:
        return null;
    }
  };
  const renderFutureContextEditor = () => {
    switch (futureContextFocus) {
      case "money":
        return (
          <div className="space-y-4">
            {renderNumberFieldGrid([
              { key: "targetSavingsBufferMonths", label: ts('manualContext.targetSavingsBufferMonths', 'Target savings buffer'), step: 0.1, min: 0, max: 60 },
            ])}
            {renderTextFieldGrid([
              { key: "futureFinanceContext", label: ts('manualContext.futureFinanceContext', 'Desired money posture'), placeholder: ts('manualContext.futureFinanceContextPlaceholder', 'What a wiser, more peaceful money life would look like...') },
            ])}
          </div>
        );
      case "rhythm":
        return (
          <div className="space-y-4">
            {renderNumberFieldGrid([
              { key: "targetWorkHoursPerWeek", label: ts('manualContext.targetWorkHoursPerWeek', 'Target work hours/week'), step: 0.5, min: 0, max: 120 },
              { key: "targetSleepHours", label: ts('manualContext.targetSleepHours', 'Target sleep hours/day'), step: 0.1, min: 0, max: 24 },
              { key: "targetExerciseSessionsPerWeek", label: ts('manualContext.targetExerciseSessionsPerWeek', 'Target exercise/week'), step: 1, min: 0, max: 30 },
              { key: "targetTimeWithLovedOnesHoursPerWeek", label: ts('manualContext.targetTimeWithLovedOnesHoursPerWeek', 'Target loved ones hours/week'), step: 0.5, min: 0, max: 120 },
              { key: "targetTimeWithCommunityHoursPerWeek", label: ts('manualContext.targetTimeWithCommunityHoursPerWeek', 'Target community hours/week'), step: 0.5, min: 0, max: 120 },
            ])}
            {renderTextFieldGrid([
              { key: "futureWorkContext", label: ts('manualContext.futureWorkContext', 'Desired work rhythm'), placeholder: ts('manualContext.futureWorkContextPlaceholder', 'What sustainable, faithful work should feel like...') },
              { key: "futureHealthContext", label: ts('manualContext.futureHealthContext', 'Desired health rhythm'), placeholder: ts('manualContext.futureHealthContextPlaceholder', 'The energy, sleep, and recovery you want to move toward...') },
              { key: "futureRelationshipsContext", label: ts('manualContext.futureRelationshipsContext', 'Desired relationships/community'), placeholder: ts('manualContext.futureRelationshipsContextPlaceholder', 'The support, family rhythm, or community connection you want...') },
            ])}
          </div>
        );
      case "posture":
        return (
          <div className="space-y-4">
            {renderNumberFieldGrid([
              { key: "targetStressLevel", label: ts('manualContext.targetStressLevel', 'Target stress (0-10)'), step: 1, min: 0, max: 10 },
              { key: "targetUrgencyLevel", label: ts('manualContext.targetUrgencyLevel', 'Target urgency (0-10)'), step: 1, min: 0, max: 10 },
              { key: "targetSupportLevel", label: ts('manualContext.targetSupportLevel', 'Target support (0-10)'), step: 1, min: 0, max: 10 },
            ])}
            {renderTextFieldGrid([
              { key: "futureValuesContext", label: ts('manualContext.futureValuesContext', 'Desired values posture'), placeholder: ts('manualContext.futureValuesContextPlaceholder', 'The kind of person your decisions should form you into...') },
              { key: "futureGoals", label: ts('manualContext.futureGoals', 'Future goals'), placeholder: ts('manualContext.futureGoalsPlaceholder', 'What you are hoping to build over time...') },
              { key: "futureBoundaries", label: ts('manualContext.futureBoundaries', 'Future boundaries'), placeholder: ts('manualContext.futureBoundariesPlaceholder', 'What should remain protected as you grow...') },
            ])}
          </div>
        );
      default:
        return null;
    }
  };
  const activeCurrentContextCard = currentContextCards.find((card) => card.key === currentContextFocus) ?? currentContextCards[0];
  const activeFutureContextCard = futureContextCards.find((card) => card.key === futureContextFocus) ?? futureContextCards[0];
  const enoughProfileItems = [
    draft.enoughDefinition ? manualCopy.enoughDefined : manualCopy.enoughNotDefined,
    draft.targetSavingsBufferMonths !== null ? `${ts('manualContext.targetSavingsBufferMonths', 'Target savings buffer')}: ${draft.targetSavingsBufferMonths}` : "",
    draft.targetWorkHoursPerWeek !== null ? `${ts('manualContext.targetWorkHoursPerWeek', 'Target work hours/week')}: ${draft.targetWorkHoursPerWeek}` : "",
    draft.targetSleepHours !== null ? `${ts('manualContext.targetSleepHours', 'Target sleep hours/day')}: ${draft.targetSleepHours}` : "",
  ].filter(Boolean);
  const quickDetailOptions: Array<{ key: typeof quickDetailType; label: string; prompt: string }> = [
    { key: "financeContext", label: manualCopy.moneyPicture, prompt: ts('manualContext.moneyPicturePrompt', 'Example: My buffer is thin and I feel pressure to take bigger risks.') },
    { key: "workContext", label: manualCopy.workRhythm, prompt: ts('manualContext.workRhythmPrompt', 'Example: I work long hours and feel called to change pace.') },
    { key: "healthContext", label: ts('manualContext.stressSleep', 'Stress/sleep'), prompt: ts('manualContext.stressSleepPrompt', 'Example: Sleep has been low, so urgency feels louder than usual.') },
    { key: "obligations", label: ts('manualContext.familyObligations', 'Family obligations'), prompt: ts('manualContext.familyObligationsPrompt', 'Example: I support family members and need counsel that honors that.') },
    { key: "boundaries", label: ts('manualContext.boundariesChip', 'Boundaries'), prompt: ts('manualContext.boundariesPrompt', 'Example: Do not encourage choices that sacrifice family peace.') },
    { key: "enoughDefinition", label: ts('manualContext.enoughDefinitionLabel', 'Definition of enough'), prompt: ts('manualContext.enoughDefinitionPrompt', 'Example: Enough means stability, generosity, and time with loved ones.') },
  ];
  const saveManualContextDraft = async (nextDraft: ManualContextProfile, feedback: string) => {
    setManualContextSaving(true);
    setManualContextFeedback(manualCopy.savingManualContext);
    try {
      await Promise.resolve(onChange(nextDraft));
      setManualContextFeedback(feedback);
    } catch {
      setManualContextFeedback(status);
    } finally {
      setManualContextSaving(false);
    }
  };
  const applyQuickDetail = async () => {
    const value = quickDetail.trim();
    if (!value) {
      return;
    }
    const nextDraft = normalizeManualContext({
      ...draft,
      [quickDetailType]: draft[quickDetailType] ? `${draft[quickDetailType]}\n${value}` : value,
    });
    setDraft(nextDraft);
    setQuickDetail("");
    setContextTab("current");
    await saveManualContextDraft(nextDraft, manualCopy.detailSaved);
  };

  const handleManualContextSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextDraft = normalizeManualContext(draft);
    setDraft(nextDraft);
    await saveManualContextDraft(nextDraft, manualCopy.manualContextSaved);
  };

  const updateQuickDetailFromEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    void applyQuickDetail();
  };

  const updateDraft = (patch: Partial<ManualContextProfile>) => {
    setDraft((current) => ({
      ...current,
      ...patch,
    }));
    setManualContextFeedback("");
  };

  return (
    <section className="rounded-xl p-4 shadow-sm sm:p-5" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
      <div className="grid gap-4 xl:grid-cols-[0.84fr_1.16fr]">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md" style={{ backgroundColor: theme.bgInput, color: theme.primary }}>
              <ShieldCheck size={17} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{manualCopy.title}</p>
              <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>
                {manualCopy.intro}
              </p>
              <p className="mt-2 text-xs leading-5" style={{ color: theme.textSecondary }}>{status}</p>
            </div>
          </div>

          <div className="rounded-lg border p-4" style={{ borderColor: theme.borderMedium, backgroundColor: draft.useInAnswers ? theme.activeBg : theme.bgCardElevated }}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>
              {draft.useInAnswers ? manualCopy.active : manualCopy.paused}
            </p>
            <p className="mt-2 text-2xl font-semibold" style={{ color: theme.textPrimary }}>
              {activeContextSections} {activeContextSections === 1 ? manualCopy.areaSingular : manualCopy.areaPlural} {manualCopy.added}
            </p>
            <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
              {manualCopy.areaSummary}
            </p>
            <p className="mt-3 rounded-md border px-3 py-2 text-xs leading-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              <span className="font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.enoughProfile', 'Enough profile')}:</span>{" "}
              {enoughProfileItems.length ? enoughProfileItems.join(" · ") : ts('labels.enoughProfileEmpty', 'Define enough for money, work, rest, and generosity when you are ready.')}
            </p>
          </div>

          <DisclosureSection
            title={ts('manualContext.quickTitle', 'Add one helpful detail')}
            summary={manualCopy.quickBody}
            eyebrow={ts('manualContext.quickTitle', 'Quick add')}
            compactCollapsed
            isOpen={quickDetailOpen}
            onOpenChange={setQuickDetailOpen}
            showDetailsLabel={ts('showDetails', 'Show details')}
            hideDetailsLabel={ts('hideDetails', 'Hide details')}
            theme={theme}
          >
            <div className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
              <div className="flex flex-wrap gap-2">
                {quickDetailOptions.map((option) => {
                  const active = quickDetailType === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      className="rounded-md border px-2.5 py-1.5 text-[11px] font-semibold"
                      style={{
                        borderColor: active ? theme.primary : theme.borderLight,
                        backgroundColor: active ? theme.activeBg : theme.bgInput,
                        color: active ? theme.textPrimary : theme.textSecondary,
                      }}
                      onClick={() => setQuickDetailType(option.key)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={quickDetail}
                  onChange={(event) => setQuickDetail(event.target.value)}
                  onKeyDown={updateQuickDetailFromEnter}
                  className="h-11 min-w-0 flex-1 rounded-md border px-3 text-sm outline-none"
                  style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                  placeholder={quickDetailOptions.find((option) => option.key === quickDetailType)?.prompt}
                />
                <button
                  type="button"
                  className="h-11 rounded-md px-4 text-sm font-semibold"
                  style={{ backgroundColor: theme.primary, color: theme.textOnPrimary, opacity: quickDetail.trim() && !manualContextSaving ? 1 : 0.65 }}
                  disabled={!quickDetail.trim() || manualContextSaving}
                  onClick={() => void applyQuickDetail()}
                >
                  {manualCopy.addDetail}
                </button>
              </div>
              {manualContextFeedback ? (
                <p className="mt-2 rounded-md border px-3 py-2 text-xs leading-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                  {manualContextFeedback}
                </p>
              ) : null}
            </div>
          </DisclosureSection>

          <DisclosureSection
            title={ts('labels.privacyPosture', 'Privacy posture')}
            summary={ts('manualContext.privacyBody', 'This is manual, optional, and scoped to your account or this device. Aletheia does not connect to Apple Watch, banks, payroll, or medical systems here.')}
            eyebrow={ts('labels.privacyPosture', 'Privacy posture')}
            compactCollapsed
            isOpen={privacyPostureOpen}
            onOpenChange={setPrivacyPostureOpen}
            showDetailsLabel={ts('showDetails', 'Show details')}
            hideDetailsLabel={ts('hideDetails', 'Hide details')}
            theme={theme}
          >
            <div className="rounded-lg border p-3 text-xs leading-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
              <p className="font-semibold" style={{ color: theme.textPrimary }}>{manualCopy.privacyPosture}</p>
              <p className="mt-1">
                {manualCopy.privacyBody}
              </p>
              <p className="mt-1">
                {user
                  ? manualCopy.signedInSync
                  : manualCopy.guestSync}{" "}
                {hasContent ? manualCopy.clearFields : manualCopy.nothingAdded}
              </p>
            </div>
          </DisclosureSection>
        </div>

        <form
          className="space-y-3"
          onSubmit={handleManualContextSubmit}
        >
          <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
            <label className="block rounded-lg border p-3 text-xs font-semibold uppercase tracking-[0.12em]" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
              {ts('labels.guidanceRegion', 'Guidance region')}
              <select
                value={preferences.region}
                onChange={(event) => onPreferenceChange({ region: event.target.value as RegionCode })}
                className="mt-2 h-10 w-full rounded-md border px-3 text-sm normal-case tracking-normal outline-none"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              >
                {Object.entries(regions).map(([code, region]) => (
                  <option key={code} value={code}>{region.label}</option>
                ))}
              </select>
              <span className="mt-2 block text-xs font-normal normal-case leading-5 tracking-normal" style={{ color: theme.textSecondary }}>
                {regions[preferences.region]?.example ?? regions.global.example}
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border p-3 text-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
              <input
                type="checkbox"
                checked={draft.useInAnswers}
                onChange={(event) => updateDraft({ useInAnswers: event.target.checked })}
                className="mt-0.5 size-5 shrink-0 rounded"
                style={{ borderColor: theme.borderMedium }}
              />
              <span>
                <span className="block font-semibold" style={{ color: theme.textPrimary }}>{manualCopy.allowContextPrompt}</span>
                <span className="mt-1 block text-xs leading-5" style={{ color: theme.textSecondary }}>
                  {manualCopy.allowContextBody}
                </span>
              </span>
            </label>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ContextUseToggle
              icon={PiggyBank}
              label={manualCopy.useMoney}
              body={sectionSummary.money}
              checked={draft.useMoneyInAnswers}
              theme={theme}
              onChange={(checked) => updateDraft({ useMoneyInAnswers: checked })}
            />
            <ContextUseToggle
              icon={BriefcaseBusiness}
              label={manualCopy.useWork}
              body={sectionSummary.work}
              checked={draft.useWorkInAnswers}
              theme={theme}
              onChange={(checked) => updateDraft({ useWorkInAnswers: checked })}
            />
            <ContextUseToggle
              icon={Sprout}
              label={manualCopy.useHealth}
              body={sectionSummary.health}
              checked={draft.useHealthInAnswers}
              theme={theme}
              onChange={(checked) => updateDraft({ useHealthInAnswers: checked })}
            />
            <ContextUseToggle
              icon={Users}
              label={manualCopy.useRelationships}
              body={sectionSummary.relationships}
              checked={draft.useRelationshipsInAnswers}
              theme={theme}
              onChange={(checked) => updateDraft({ useRelationshipsInAnswers: checked })}
            />
            <ContextUseToggle
              icon={ShieldCheck}
              label={manualCopy.useValues}
              body={sectionSummary.values}
              checked={draft.useValuesInAnswers}
              theme={theme}
              onChange={(checked) => updateDraft({ useValuesInAnswers: checked })}
              wide
            />
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-full border p-1.5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
            {[
              { key: "current" as const, label: manualCopy.currentState, body: `${activeContextSections} ${activeContextSections === 1 ? manualCopy.activeArea : manualCopy.activeAreas}` },
              { key: "future" as const, label: manualCopy.futureState, body: hasFutureState ? manualCopy.directionAdded : manualCopy.notAddedYet },
            ].map((tab) => {
              const active = contextTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className="rounded-full px-3 py-2 text-left text-xs font-semibold transition"
                  style={{
                    backgroundColor: active ? theme.bgCardElevated : "transparent",
                    color: active ? theme.textPrimary : theme.textSecondary,
                    boxShadow: active ? `0 0 0 1px ${theme.borderMedium}` : "none",
                  }}
                  onClick={() => setContextTab(tab.key)}
                >
                  <span className="block uppercase tracking-[0.12em]">{tab.label}</span>
                  <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal">{tab.body}</span>
                </button>
              );
            })}
          </div>

          <DisclosureSection
            title={ts('manualContext.editContextTitle', 'Edit current and future context')}
            summary={contextEditorOpen
              ? ts('manualContext.editContextOpenSummary', 'Choose a card, then edit the details that matter most.')
              : ts('manualContext.editContextClosedSummary', 'Current and future context stay collapsed until you want to make a deeper change.')}
            eyebrow={ts('manualContext.editContextEyebrow', 'Context editor')}
            isOpen={contextEditorOpen}
            onOpenChange={setContextEditorOpen}
            compactCollapsed
            showDetailsLabel={ts('showDetails', 'Show details')}
            hideDetailsLabel={ts('hideDetails', 'Hide details')}
            theme={theme}
          >
            {contextTab === "current" ? (
              <div className="space-y-4">
                {renderCardRail(currentContextCards, currentContextFocus, setCurrentContextFocus)}
                <div className="rounded-lg border p-3 sm:p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{manualCopy.currentState}</p>
                      <h3 className="mt-1 text-lg font-semibold" style={{ color: theme.textPrimary }}>{activeCurrentContextCard.label}</h3>
                      <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>{activeCurrentContextCard.summary}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ borderColor: activeCurrentContextCard.active ? theme.accentGold : theme.borderLight, backgroundColor: activeCurrentContextCard.active ? theme.activeBg : theme.bgInput, color: activeCurrentContextCard.active ? theme.accentGold : theme.textSecondary }}>
                      {activeCurrentContextCard.active ? <Check size={12} /> : null}
                      {activeCurrentContextCard.active ? manualCopy.added : manualCopy.notAddedYet}
                    </span>
                  </div>
                  <div className="mt-4">
                    {renderCurrentContextEditor()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {renderCardRail(futureContextCards, futureContextFocus, setFutureContextFocus)}
                <div className="rounded-lg border p-3 sm:p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{manualCopy.desiredFutureState}</p>
                      <h3 className="mt-1 text-lg font-semibold" style={{ color: theme.textPrimary }}>{activeFutureContextCard.label}</h3>
                      <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>{manualCopy.desiredFutureBody}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ borderColor: activeFutureContextCard.active ? theme.accentGold : theme.borderLight, backgroundColor: activeFutureContextCard.active ? theme.activeBg : theme.bgInput, color: activeFutureContextCard.active ? theme.accentGold : theme.textSecondary }}>
                      {activeFutureContextCard.active ? <Check size={12} /> : null}
                      {activeFutureContextCard.active ? manualCopy.added : manualCopy.notAddedYet}
                    </span>
                  </div>
                  <div className="mt-4">
                    {renderFutureContextEditor()}
                  </div>
                </div>
              </div>
            )}
          </DisclosureSection>

          <button
            type="submit"
            disabled={manualContextSaving}
            className="h-11 rounded-xl px-4 text-sm font-semibold shadow-sm"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary, opacity: manualContextSaving ? 0.68 : 1 }}
          >
            {manualContextSaving ? manualCopy.savingManualContext : manualCopy.saveManualContext}
          </button>
        </form>
      </div>
    </section>
  );
}

function ContextUseToggle({
  icon: Icon,
  label,
  body,
  checked,
  theme,
  onChange,
  wide = false,
}: {
  icon: typeof ShieldCheck;
  label: string;
  body: string;
  checked: boolean;
  theme: ThemeColors;
  onChange: (checked: boolean) => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex min-h-20 items-start gap-3 rounded-xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 ${wide ? "sm:col-span-2" : ""}`}
      style={{
        borderColor: checked ? theme.accentGold : theme.borderLight,
        backgroundColor: checked ? theme.activeBg : theme.bgCardElevated,
        color: theme.textPrimary,
      }}
      aria-pressed={checked}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: checked ? theme.accentGold : theme.textSecondary }}>
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-xs leading-5" style={{ color: theme.textSecondary }}>{body}</span>
      </span>
      <span className="grid size-7 shrink-0 place-items-center rounded-full border" style={{ borderColor: checked ? theme.accentGold : theme.borderMedium, backgroundColor: checked ? theme.primary : "transparent", color: checked ? theme.textOnPrimary : theme.textSecondary }}>
        {checked ? <Check size={14} /> : null}
      </span>
    </button>
  );
}

function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [active]);
}

function AvatarPickerModal({
  theme,
  ts,
  open,
  title,
  subtitle,
  currentAvatar,
  onClose,
  onPick,
}: {
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  open: boolean;
  title: string;
  subtitle: string;
  currentAvatar: string;
  onClose: () => void;
  onPick: (avatarSrc: string) => void;
}) {
  const canUsePortal = typeof document !== "undefined";
  useBodyScrollLock(open && canUsePortal);

  const normalizedCurrent = normalizeAvatarUrl(currentAvatar) ?? "";

  const surpriseAvatar = () => {
    if (!curatedAvatarOptions.length) {
      return;
    }
    const candidates = curatedAvatarOptions.filter((option) => (normalizeAvatarUrl(option.src) ?? option.src) !== normalizedCurrent);
    const pool = candidates.length ? candidates : curatedAvatarOptions;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    if (choice) {
      onPick(choice.src);
    }
  };

  if (!open || !canUsePortal) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] grid min-h-dvh place-items-end overflow-hidden overscroll-none px-3 backdrop-blur-sm sm:place-items-center"
      style={{
        backgroundColor: "rgba(13, 23, 20, 0.56)",
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-picker-title"
        className="w-full max-w-3xl overflow-y-auto overscroll-contain rounded-3xl border p-4 shadow-2xl sm:p-5"
        style={{
          borderColor: theme.borderMedium,
          backgroundColor: theme.bgCard,
          maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 1.5rem)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('avatar.pickerEyebrow', 'Avatar Picker')}</p>
            <h2 id="avatar-picker-title" className="mt-2 text-xl font-semibold" style={{ color: theme.textPrimary }}>{title}</h2>
            <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full border transition"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            aria-label={ts('avatar.closePicker', 'Close avatar picker')}
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={surpriseAvatar}
            className="inline-flex h-10 items-center rounded-full border px-4 text-xs font-semibold transition"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
          >
            {ts('avatar.surpriseMe', 'Surprise me')}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {curatedAvatarOptions.map((option) => {
            const selected = (normalizeAvatarUrl(option.src) ?? option.src) === normalizedCurrent;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onPick(option.src)}
                className="rounded-2xl border p-2 text-left transition"
                style={{
                  borderColor: selected ? theme.accentLight : theme.borderMedium,
                  backgroundColor: selected ? theme.activeBg : theme.bgCardElevated,
                  color: theme.textPrimary,
                }}
                aria-label={`${ts('avatar.pickAvatar', 'Pick avatar')}: ${option.name}`}
              >
                <Image
                  src={option.src}
                  alt={option.name}
                  width={72}
                  height={72}
                  className="mx-auto size-[72px] rounded-2xl border object-cover"
                />
                <p className="mt-2 truncate text-center text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: theme.textSecondary }}>
                  {option.name}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>,
    document.body
  );
}

function AvatarUploadTipsModal({
  theme,
  ts,
  open,
  optOut,
  onOptOutChange,
  onClose,
  onContinue,
}: {
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  open: boolean;
  optOut: boolean;
  onOptOutChange: (optOut: boolean) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const canUsePortal = typeof document !== "undefined";
  useBodyScrollLock(open && canUsePortal);

  if (!open || !canUsePortal) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] grid min-h-dvh place-items-end overflow-hidden overscroll-none px-3 backdrop-blur-sm sm:place-items-center"
      style={{
        backgroundColor: "rgba(13, 23, 20, 0.56)",
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-photo-tips-title"
        className="w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border p-4 shadow-2xl sm:p-5"
        style={{
          borderColor: theme.borderMedium,
          backgroundColor: theme.bgCard,
          maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 1.5rem)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('avatar.photoTipsEyebrow', 'Photo tips')}</p>
            <h2 id="avatar-photo-tips-title" className="mt-2 text-xl font-semibold" style={{ color: theme.textPrimary }}>{ts('avatar.photoTipsTitle', 'Upload a profile photo calmly')}</h2>
            <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>
              {ts('avatar.photoTipsBody', 'Aletheia keeps this simple. Use one clear photo and it applies as soon as it is ready.')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full border transition"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            aria-label={ts('avatar.closePhotoTips', 'Close photo tips')}
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
          <ul className="space-y-1.5 text-sm leading-6" style={{ color: theme.textSecondary }}>
            <li>{ts('avatar.supportedFormats', 'Supported formats: PNG, JPEG, WEBP.')}</li>
            <li>{ts('avatar.maxFileSize', 'Maximum file size: 10MB.')}</li>
            <li>{ts('avatar.autoOptimize', 'We auto-optimize to keep profile photos fast and consistent.')}</li>
            <li>{ts('avatar.autoApplyDevices', 'After choosing, Aletheia applies it across signed-in devices.')}</li>
          </ul>
        </div>

        <label className="mt-3 flex items-start gap-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
          <input
            type="checkbox"
            checked={optOut}
            onChange={(event) => onOptOutChange(event.target.checked)}
            className="mt-1"
          />
          <span>{ts('avatar.hideTips', 'Do not show these tips before choosing a photo.')}</span>
        </label>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full border px-4 text-sm font-semibold"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
          >
            {ts('labels.maybeLater', 'Maybe later')}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="h-11 rounded-full px-4 text-sm font-semibold"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            {ts('avatar.continueToPicker', 'Continue to photo picker')}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}

function AccountStatusCard({
  theme,
  user,
  authStatus,
  notificationsEnabled,
  notificationAccountEnabled,
  notificationDeviceSubscribed,
  notificationStatus,
  onLogout,
  ts,
}: {
  theme: ThemeColors;
  user: User | null;
  authStatus: AuthStatus;
  notificationsEnabled: boolean;
  notificationAccountEnabled: boolean;
  notificationDeviceSubscribed: boolean;
  notificationStatus: string;
  onLogout: () => void;
  ts: (key: string, fallback?: string) => string;
}) {
  const signedIn = Boolean(user);
  const notificationHealth = notificationsEnabled
    ? ts('notifications.deviceSubscribed', 'This device is subscribed')
    : notificationAccountEnabled && !notificationDeviceSubscribed
      ? ts('notifications.accountEnabledDeviceOff', 'Account enabled, this device not enabled')
      : notificationStatus;

  return (
    <section className="overflow-hidden rounded-xl border shadow-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}>
      <div className="border-b px-4 py-4 sm:px-5" style={{ borderColor: theme.borderLight, background: `linear-gradient(180deg, ${theme.bgCardElevated}, ${theme.bgCard})` }}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.accountDetails', 'Account details')}</p>
            <h3 className="mt-2 text-xl font-semibold sm:text-2xl" style={{ color: theme.textPrimary }}>
              {signedIn ? ts('auth.signedIn', 'Signed in') : ts('auth.guestMode', 'Guest mode')}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: theme.textSecondary }}>
              {signedIn
                ? `${user?.email}. ${ts('auth.syncActiveFull', 'Sync is active for decisions, reflections, counsel, rules, and preferences.')}`
                : ts('auth.signInSyncHistory', 'Sign in to sync your wisdom history across devices and enable daily notifications.')}
            </p>
          </div>
          {signedIn ? (
            <button
              type="button"
              onClick={onLogout}
              disabled={authStatus === "signing-out"}
              className="inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            >
              {authStatus === "signing-out" ? ts('auth.signingOut', 'Signing out...') : ts('auth.signOut', 'Sign out')}
            </button>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: signedIn ? theme.textPrimary : theme.textSecondary }}>
            {signedIn ? ts('labels.active', 'Active') : ts('auth.guestOnly', 'Guest only')}
          </span>
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
            {signedIn ? ts('labels.thisSession', 'This session') : ts('labels.notSynced', 'Not synced')}
          </span>
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: notificationsEnabled ? theme.textPrimary : theme.textSecondary }}>
            {notificationHealth}
          </span>
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
        <AccountSignal label={ts('labels.sync', 'Sync')} value={signedIn ? ts('labels.active', 'Active') : ts('auth.guestOnly', 'Guest only')} active={signedIn} theme={theme} />
        <AccountSignal label={ts('labels.lastSynced', 'Last synced')} value={signedIn ? ts('labels.thisSession', 'This session') : ts('labels.notSynced', 'Not synced')} active={signedIn} theme={theme} />
        <AccountSignal label={ts('labels.notifications', 'Notifications')} value={notificationHealth} active={notificationsEnabled} theme={theme} />
      </div>
    </section>
  );
}

function AvatarStudioCard({
  theme,
  user,
  ts,
  onUpdateProfileAvatar,
}: {
  theme: ThemeColors;
  user: User | null;
  ts: (key: string, fallback?: string) => string;
  onUpdateProfileAvatar: (avatarUrl: string) => Promise<boolean>;
}) {
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState(user?.avatarUrl ?? "");
  const [avatarDraftStatus, setAvatarDraftStatus] = useState("");
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarTipsOpen, setAvatarTipsOpen] = useState(false);
  const [avatarTipsOptOut, setAvatarTipsOptOut] = useState(false);
  const [lastChangedAt, setLastChangedAt] = useState<string | null>(null);
  const [avatarUndo, setAvatarUndo] = useState<{ previousAvatarUrl: string; label: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarUndoTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    window.setTimeout(() => {
      try {
        setAvatarTipsOptOut(window.localStorage.getItem("aletheia_avatar_tips_opt_out") === "yes");
      } catch {
        // Tips can still display during this session if storage is unavailable.
      }
    }, 0);
  }, []);

  useEffect(() => {
    window.setTimeout(() => {
      setAvatarDraft(normalizeAvatarUrl(user?.avatarUrl ?? "") ?? "");
    }, 0);
  }, [user?.avatarUrl]);

  useEffect(() => {
    return () => {
      if (avatarUndoTimeoutRef.current !== null) {
        window.clearTimeout(avatarUndoTimeoutRef.current);
      }
    };
  }, []);

  const setAvatarTipsPreference = useCallback((optOut: boolean) => {
    setAvatarTipsOptOut(optOut);
    try {
      window.localStorage.setItem("aletheia_avatar_tips_opt_out", optOut ? "yes" : "no");
    } catch {
      // Continue even if local storage is unavailable.
    }
  }, []);

  if (!user) {
    return null;
  }

  async function optimizeAvatarFile(file: File): Promise<string> {
    const imageBitmap = await createImageBitmap(file);
    const maxSize = 512;
    const scale = Math.min(1, maxSize / Math.max(imageBitmap.width, imageBitmap.height));
    const width = Math.max(1, Math.round(imageBitmap.width * scale));
    const height = Math.max(1, Math.round(imageBitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error(ts('avatar.imageProcessingFailed', 'Image processing failed.'));
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(imageBitmap, 0, 0, width, height);
    imageBitmap.close();

    const dataUrl = canvas.toDataURL("image/webp", 0.86);
    const normalized = normalizeAvatarUrl(dataUrl);
    if (!normalized) {
      throw new Error(ts('avatar.tooLargeAfterOptimization', 'The selected image is too large after optimization.'));
    }
    return normalized;
  }

  async function applyAvatarChoice(
    nextAvatarUrl: string,
    pendingMessage: string,
    successMessage = ts('avatar.profileImageUpdated', 'Profile image updated.'),
    source: "curated" | "gallery" | "surprise" | "default" = "curated",
    options: { allowUndo?: boolean } = {}
  ) {
    if (savingAvatar) {
      return;
    }

    const normalized = normalizeAvatarUrl(nextAvatarUrl ?? "") ?? "";
    const previousAvatarUrl = canonicalSaved;
    if (nextAvatarUrl && !normalized) {
      setAvatarDraftStatus(ts('avatar.useValidImage', 'Use a valid image. You can upload from your gallery or keep the default avatar.'));
      return;
    }

    setAvatarDraft(normalized);
    if (normalized === canonicalSaved) {
      setAvatarDraftStatus(normalized ? ts('avatar.alreadyActive', 'This avatar is already active.') : ts('avatar.defaultAlreadyActive', 'The default avatar is already active.'));
      return;
    }

    setSavingAvatar(true);
    setAvatarDraftStatus(pendingMessage);
    try {
      const updated = await onUpdateProfileAvatar(normalized);
      if (updated) {
        setAvatarDraftStatus(successMessage);
        setLastChangedAt(new Date().toISOString());
        if (avatarUndoTimeoutRef.current !== null) {
          window.clearTimeout(avatarUndoTimeoutRef.current);
        }
        if (options.allowUndo !== false && previousAvatarUrl !== normalized) {
          setAvatarUndo({ previousAvatarUrl, label: successMessage.replace(/\.$/, "") });
          avatarUndoTimeoutRef.current = window.setTimeout(() => {
            setAvatarUndo(null);
            avatarUndoTimeoutRef.current = null;
          }, 6500);
        }
        trackClientEvent("avatar_updated", {
          source,
          hasAvatar: Boolean(normalized),
          previousHadAvatar: Boolean(previousAvatarUrl),
        });
      } else {
        setAvatarDraftStatus(ts('avatar.updateFailed', 'Could not update the profile image. Please try again.'));
      }
    } catch {
      setAvatarDraftStatus(ts('avatar.updateFailed', 'Could not update the profile image. Please try again.'));
    } finally {
      setSavingAvatar(false);
    }
  }

  async function onAvatarFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setAvatarDraftStatus("");

    const acceptedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!acceptedTypes.has(file.type)) {
      setAvatarDraftStatus(ts('avatar.useSupportedFormats', 'Use PNG, JPEG, or WEBP images.'));
      event.target.value = "";
      return;
    }
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setAvatarDraftStatus(ts('avatar.chooseSmallerImage', 'Choose an image smaller than 10MB.'));
      event.target.value = "";
      return;
    }

    try {
      setAvatarDraftStatus(ts('avatar.preparingPhoto', 'Preparing your photo...'));
      const optimized = await optimizeAvatarFile(file);
      await applyAvatarChoice(optimized, ts('avatar.applyingPhoto', 'Applying your photo...'), ts('avatar.photoApplied', 'Photo applied to your profile.'), "gallery");
    } catch (error) {
      const message = error instanceof Error ? error.message : ts('avatar.processFailed', 'Could not process this image.');
      setAvatarDraftStatus(message);
    } finally {
      event.target.value = "";
    }
  }

  const avatarSeed = user.id ?? user.email;
  const avatarLabel = user.name || user.email;
  const canonicalDraft = normalizeAvatarUrl(avatarDraft ?? "") ?? "";
  const canonicalSaved = normalizeAvatarUrl(user.avatarUrl ?? "") ?? "";

  return (
    <section className="rounded-xl border p-4 shadow-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AvatarCircle avatarUrl={avatarDraft} seed={avatarSeed} label={avatarLabel} size={56} className="size-14 rounded-full border object-cover" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('avatar.studioEyebrow', 'Avatar Studio')}</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts('avatar.studioTitle', 'Personalize your profile identity')}</p>
            <p className="text-xs leading-5" style={{ color: theme.textSecondary }}>{ts('avatar.studioBody', 'Synced across signed-in devices. Gallery, curated picks, and Surprise me are all available.')}</p>
          </div>
        </div>
        {lastChangedAt ? (
          <span className="rounded-md border px-2 py-1 text-xs font-semibold" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
            {ts('avatar.lastChanged', 'Last changed')} {new Date(lastChangedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : null}
      </div>
      <div
        className="mt-4 rounded-lg border p-3"
        style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
            opacity: 0,
            pointerEvents: "none",
          }}
          onChange={onAvatarFileSelected}
        />
        {avatarDraftStatus ? (
          <p className="mb-2 text-xs leading-5" style={{ color: theme.textSecondary }}>
            {avatarDraftStatus}
          </p>
        ) : null}
        {avatarUndo ? (
          <div className="mb-3 flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: theme.accentLight, backgroundColor: theme.bgInput }}>
            <p className="text-sm leading-5" style={{ color: theme.textPrimary }}>
              {avatarUndo.label}. {ts('avatar.undoWindow', 'You can undo this for a moment.')}
            </p>
            <button
              type="button"
              className="h-9 rounded-md border px-3 text-sm font-semibold"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard, color: theme.textPrimary }}
              disabled={savingAvatar}
              onClick={() => {
                const previousAvatarUrl = avatarUndo.previousAvatarUrl;
                setAvatarUndo(null);
                if (avatarUndoTimeoutRef.current !== null) {
                  window.clearTimeout(avatarUndoTimeoutRef.current);
                  avatarUndoTimeoutRef.current = null;
                }
                void applyAvatarChoice(previousAvatarUrl, ts('avatar.restoringPrevious', 'Restoring previous avatar...'), ts('avatar.previousRestored', 'Previous avatar restored.'), previousAvatarUrl ? "curated" : "default", { allowUndo: false });
              }}
            >
              {ts('labels.undo', 'Undo')}
            </button>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            className="h-11 w-full rounded-md border px-4 text-sm font-semibold sm:w-auto"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            onClick={() => {
              if (avatarTipsOptOut) {
                fileInputRef.current?.click();
                return;
              }
              setAvatarTipsOpen(true);
            }}
            disabled={savingAvatar}
          >
            {ts('avatar.choosePhoto', 'Choose photo')}
          </button>
          <button type="button" className="h-11 w-full rounded-md border px-4 text-sm font-semibold sm:w-auto" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }} onClick={() => setAvatarPickerOpen(true)} disabled={savingAvatar}>{ts('avatar.pickFunAvatar', 'Pick fun avatar')}</button>
          <button
            type="button"
            className="h-11 w-full rounded-md border px-4 text-sm font-semibold sm:w-auto"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            onClick={() => {
              const available = curatedAvatarOptions.filter((option) => (normalizeAvatarUrl(option.src) ?? option.src) !== canonicalDraft);
              const pool = available.length ? available : curatedAvatarOptions;
              const picked = pool[Math.floor(Math.random() * pool.length)];
              if (picked) {
                void applyAvatarChoice(normalizeAvatarUrl(picked.src) ?? picked.src, ts('avatar.applyingSurprise', 'Applying surprise avatar...'), ts('avatar.surpriseApplied', 'Surprise avatar applied.'), "surprise");
              }
            }}
            disabled={savingAvatar}
          >
            {ts('avatar.surpriseMe', 'Surprise me')}
          </button>
          <button type="button" className="h-11 w-full rounded-md border px-4 text-sm font-semibold sm:w-auto" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }} onClick={() => {
            void applyAvatarChoice("", ts('avatar.restoringDefault', 'Restoring default avatar...'), ts('avatar.defaultApplied', 'Default avatar applied.'), "default");
          }} disabled={savingAvatar}>{ts('avatar.useDefault', 'Use default')}</button>
          {savingAvatar ? (
            <span className="col-span-2 flex h-11 items-center rounded-md px-4 text-sm font-semibold sm:col-span-1" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {ts('labels.applying', 'Applying...')}
            </span>
          ) : null}
        </div>
      </div>
      <AvatarPickerModal
        theme={theme}
        ts={ts}
        open={avatarPickerOpen}
        title={ts('avatar.chooseProfileAvatar', 'Choose a profile avatar')}
        subtitle={ts('avatar.chooseProfileAvatarBody', 'Pick from curated, app-safe avatars or keep using your gallery upload.')}
        currentAvatar={avatarDraft}
        onClose={() => setAvatarPickerOpen(false)}
        onPick={(avatarSrc) => {
          setAvatarPickerOpen(false);
          void applyAvatarChoice(normalizeAvatarUrl(avatarSrc) ?? avatarSrc, ts('avatar.applyingAvatar', 'Applying avatar...'), ts('avatar.avatarApplied', 'Avatar applied to your profile.'), "curated");
        }}
      />
      <AvatarUploadTipsModal
        theme={theme}
        ts={ts}
        open={avatarTipsOpen}
        optOut={avatarTipsOptOut}
        onOptOutChange={setAvatarTipsPreference}
        onClose={() => setAvatarTipsOpen(false)}
        onContinue={() => {
          setAvatarTipsOpen(false);
          fileInputRef.current?.click();
        }}
      />
    </section>
  );
}

function AccountSignal({ label, value, active, theme }: { label: string; value: string; active: boolean; theme: ThemeColors }) {
  return (
    <div className="rounded-lg border p-3" style={{ 
      borderColor: active ? theme.accentLight : theme.borderLight, 
      backgroundColor: active ? theme.bgCardElevated : theme.bgCard 
    }}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textSecondary }}>{label}</p>
      <p className="mt-2 text-sm font-semibold leading-5" style={{ color: theme.textPrimary }}>{value}</p>
    </div>
  );
}

function AuthPanel({
  theme,
  ts,
  authMode,
  setAuthMode,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  error,
  notice,
  authStatus,
  googleAuthAvailable,
  status,
  isWorking,
  onSubmit,
  onGoogleSignIn,
}: {
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  authMode: AuthMode;
  setAuthMode: (value: AuthMode) => void;
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  error: string;
  notice: string;
  authStatus: AuthStatus;
  googleAuthAvailable: boolean;
  status: string;
  isWorking: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn: () => void;
}) {
  const authBusy = isWorking || authStatus === "checking" || authStatus === "signing-in" || authStatus === "signing-out";
  const statusLabel =
    authStatus === "checking"
      ? ts('auth.checkingSession', 'Checking session')
      : authStatus === "signing-in"
        ? ts('auth.signingIn', 'Signing in')
        : authStatus === "signing-out"
          ? ts('auth.signingOutShort', 'Signing out')
          : ts('auth.guest', 'Guest');

  return (
    <section className="mb-5 rounded-xl border p-4 shadow-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.accountTab', 'Account')}</p>
        <span
          className="rounded-md px-2 py-1 text-xs font-semibold"
          style={{
            backgroundColor: authBusy ? theme.primary : theme.bgCardElevated,
            color: authBusy ? theme.textOnPrimary : theme.textSecondary
          }}
        >
          {statusLabel}
        </span>
      </div>
      {notice ? (
        <div
          role="status"
          className="mb-3 rounded-lg border px-3 py-2 text-sm font-medium leading-6"
          style={{ borderColor: theme.primary, backgroundColor: theme.bgCardElevated, color: theme.primary }}
        >
          {notice}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="mb-3 rounded-lg border px-3 py-2 text-sm font-medium leading-6"
          style={{ borderColor: '#e0c3b7', backgroundColor: '#fff6f1', color: '#8c3f28' }}
        >
          {error}
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
              {ts('auth.signInForSync', 'Sign in for sync')}
            </p>
            <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>
              {status} {googleAuthAvailable ? ts('auth.useGoogleOrEmail', 'Use Google or email.') : ts('auth.useEmailToContinue', 'Use email to continue.')} {ts('auth.httpOnlySessions', 'Password sessions use httpOnly cookies.')}
            </p>
          </div>
          <div className="grid gap-3">
            {googleAuthAvailable ? (
              <>
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  disabled={authBusy}
                  className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                >
                  {authStatus === "signing-in" ? ts('auth.openingGoogle', 'Opening Google...') : ts('auth.continueWithGoogle', 'Continue with Google')}
                </button>
                <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
                  <span className="h-px flex-1" style={{ backgroundColor: theme.borderLight }} />
                  {ts('placeholders.email', 'Email')}
                  <span className="h-px flex-1" style={{ backgroundColor: theme.borderLight }} />
                </div>
              </>
            ) : null}
            <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            {authMode === "register" ? (
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-10 rounded-md border px-3 text-sm outline-none"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                placeholder={ts('placeholders.name', 'Name')}
              />
            ) : null}
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 rounded-md border px-3 text-sm outline-none"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              placeholder={ts('placeholders.email', 'Email')}
              type="email"
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 rounded-md border px-3 text-sm outline-none"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              placeholder={ts('placeholders.password', 'Password')}
              type="password"
            />
            <button
              disabled={authBusy}
              className="h-10 rounded-md px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              {authStatus === "signing-in" ? ts('labels.working', 'Working...') : authMode === "register" ? ts('auth.create', 'Create') : ts('auth.signIn', 'Sign in')}
            </button>
            <div className="sm:col-span-full flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === "register" ? "login" : "register")}
                className="inline-flex min-h-10 items-center rounded-md px-2 text-sm font-semibold underline-offset-4 transition hover:underline"
                style={{ color: theme.textSecondary }}
              >
                {authMode === "register" ? ts('auth.alreadyHaveAccount', 'I already have an account') : ts('auth.createNewAccount', 'Create a new account')}
              </button>
            </div>
            </form>
          </div>
      </div>
    </section>
  );
}

function NotificationPanel({
  theme,
  ts,
  language,
  user,
  enabled,
  configured,
  permission,
  status,
  busy,
  timing,
  onTimingChange,
  onEnable,
  onDisable,
}: {
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  language: LanguageCode;
  user: User | null;
  enabled: boolean;
  configured: boolean;
  permission: NotificationPermission;
  status: string;
  busy: boolean;
  timing: NotificationTiming;
  onTimingChange: (patch: Partial<NotificationTiming>) => void;
  onEnable: () => void;
  onDisable: () => void;
}) {
  const timezoneOptions = useMemo(
    () => notificationTimezoneOptions(timing.preferredTimezone),
    [timing.preferredTimezone]
  );
  const unsupported =
    typeof window !== "undefined" &&
    (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window));
  const disabled = busy || !user || !configured || unsupported || permission === "denied";
  const displayStatus = !user
    ? ts('notifications.signInRequiredBody')
    : !configured
      ? ts('notifications.notificationsNotConfiguredBody')
      : unsupported
        ? ts('notifications.notificationsUnavailableBody')
        : permission === "denied"
          ? ts('notifications.notificationsBlockedBody', 'Notifications are blocked for this site. Enable them in your browser settings to continue.')
          : status;
  const deliveryOptions: Array<{ value: NotificationTiming["deliveryStrategy"]; label: string }> = [
    { value: "morning", label: ts('labels.morning', 'Morning') },
    { value: "midday", label: ts('labels.midday', 'Midday') },
    { value: "evening", label: ts('labels.evening', 'Evening') },
    { value: "custom", label: ts('labels.custom', 'Custom') },
  ];

  return (
    <section className="mb-5 rounded-xl border p-4 shadow-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md" style={{ backgroundColor: theme.bgInput, color: theme.primary }}>
            <Bell size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.dailyWisdomNotifications', 'Daily wisdom notifications')}</p>
            <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>
              {displayStatus}
            </p>
          </div>
        </div>
        {enabled ? (
          <button
            onClick={onDisable}
            disabled={busy}
            className="h-10 rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}
          >
            {busy ? ts('labels.updating', 'Updating...') : ts('labels.turnOff', 'Turn off')}
          </button>
        ) : (
          <button
            onClick={onEnable}
            disabled={disabled}
            className="h-10 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            {busy ? ts('notifications.enabling', 'Enabling...') : ts('labels.enable', 'Enable')}
          </button>
        )}
      </div>
      <div className="mt-4 rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
        <div className="mb-3 rounded-md border px-3 py-2 text-sm leading-6" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
          <span className="font-semibold" style={{ color: theme.textPrimary }}>
            {ts('notifications.dailyWisdomSetFor', 'Daily wisdom is set for')} {notificationTimeLabel(timing.preferredLocalHour, language)}.
          </span>{" "}
          {ts('notifications.savedLocalTimingPreference', 'Aletheia will use your saved local timing preference.')}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
          <label className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
            {ts('labels.deliveryRhythm', 'Delivery rhythm')}
            <select
              value={timing.deliveryStrategy}
              disabled={busy || !user}
              onChange={(event) => onTimingChange({ deliveryStrategy: event.target.value as NotificationTiming["deliveryStrategy"] })}
              className="mt-2 h-10 w-full rounded-md border px-3 text-sm normal-case tracking-normal outline-none disabled:cursor-not-allowed disabled:opacity-70"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}
            >
              {deliveryOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
            {ts('notifications.dailyDeliveryTime', 'Daily delivery time')}
            <select
              value={timing.preferredLocalHour}
              disabled={busy || !user}
              onChange={(event) =>
                onTimingChange({ preferredLocalHour: Number(event.target.value), deliveryStrategy: "custom" })
              }
              className="mt-2 h-10 w-full rounded-md border px-3 text-sm normal-case tracking-normal outline-none disabled:cursor-not-allowed disabled:opacity-70"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}
            >
              {Array.from({ length: 18 }, (_, index) => index + 5).map((hour) => (
                <option key={hour} value={hour}>
                  {notificationTimeLabel(hour, language)}
                </option>
              ))}
            </select>
          </label>
          {timing.timezoneMode === "auto" ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
                {ts('notifications.timezone', 'Timezone')}
              </p>
              <div className="mt-2 flex min-h-10 items-center justify-between gap-3 rounded-md border px-3 py-2" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
                <span className="min-w-0 break-words text-sm leading-5">{ts('notifications.usingDeviceTimezone', 'Using device timezone')}: {timing.preferredTimezone || browserTimezone()}</span>
                <button
                  type="button"
                  disabled={busy || !user}
                  onClick={() => onTimingChange({ timezoneMode: "manual", preferredTimezone: timing.preferredTimezone || browserTimezone() })}
                  className="ml-3 text-xs font-semibold underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ color: theme.primary }}
                >
                  {ts('labels.edit', 'Edit')}
                </button>
              </div>
            </div>
          ) : (
            <label className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
              {ts('notifications.timezone', 'Timezone')}
              <select
                value={timing.preferredTimezone || browserTimezone()}
                disabled={busy || !user}
                onChange={(event) => onTimingChange({ preferredTimezone: event.target.value, timezoneMode: "manual" })}
                className="mt-2 h-10 w-full rounded-md border px-3 text-sm normal-case tracking-normal outline-none disabled:cursor-not-allowed disabled:opacity-70"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}
              >
                {timezoneOptions.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || !user}
                onClick={() => onTimingChange({ timezoneMode: "auto", preferredTimezone: browserTimezone() })}
                className="mt-2 text-xs font-semibold underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                style={{ color: theme.primary }}
              >
                {ts('notifications.useDeviceTimezoneAutomatically', 'Use device timezone automatically')}
              </button>
            </label>
          )}
        </div>
      </div>
    </section>
  );
}

function ScriptureModal({
  theme,
  scripture,
  preferences,
  ts,
  onReadAloud,
  onClose,
}: {
  theme: ThemeColors;
  scripture: string | null;
  preferences: UserPreferences;
  ts: (key: string, fallback?: string) => string;
  onReadAloud: () => void;
  onClose: () => void;
}) {
  if (!scripture) {
    return null;
  }

  const quickRead = localizedScriptureRead(scripture, preferences);
  const canonicalScripture = canonicalScriptureReference(scripture);
  const wisdomEntry = wisdomEntries.find((entry) => entry.scripture === canonicalScripture);
  const localizedEntry = wisdomEntry ? localizedWisdomEntry(wisdomEntry, preferences) : null;
  const isLocalized = quickRead.availableLanguage === preferences.language;
  const usesCanonicalRange = canonicalScripture !== scripture;
  const isSummary = quickRead.kind === "summary";

  return (
    <div className="fixed inset-0 z-50 grid place-items-end p-3 backdrop-blur-sm sm:place-items-center" style={{ backgroundColor: 'rgba(16, 24, 20, 0.45)' }}>
      <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border p-4 shadow-2xl sm:p-5" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.scriptureQuickRead', 'Scripture quick read')}</p>
            <h2 className="mt-2 text-xl font-semibold" style={{ color: theme.textPrimary }}>{scripture}</h2>
            <p className="mt-1 text-sm" style={{ color: theme.textSecondary }}>
              {quickRead.label} · {quickRead.translation}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
              {ts('labels.verses', 'Verses')}: {canonicalScripture}
            </p>
            {usesCanonicalRange ? (
              <p className="mt-1 text-xs leading-5" style={{ color: theme.textSecondary }}>
                {ts('labels.shownFromCuratedRange', 'Shown from Aletheia’s curated range:')} {canonicalScripture}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <button
              type="button"
              onClick={onReadAloud}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}
            >
              <Volume2 size={15} />
              {ts('labels.readScriptureAloud', 'Read aloud')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 shrink-0 place-items-center rounded-full border transition"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
              aria-label={ts('labels.closeScriptureQuickRead', 'Close scripture quick read')}
            >
              <X size={17} />
            </button>
          </div>
        </div>
        <p className="mt-4 rounded-2xl border p-4 text-sm leading-7" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }}>
          {quickRead.text}
        </p>
        {isSummary ? (
          <p className="mt-3 rounded-2xl border p-3 text-xs leading-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
            {ts('labels.fullVerseNotCuratedYet', 'Full public-domain verse text is not curated for this translation here yet, so Aletheia is showing a clearly marked summary instead of switching you to another Bible translation.')}
          </p>
        ) : !isLocalized ? (
          <p className="mt-3 rounded-2xl border p-3 text-xs leading-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
            {ts('labels.publicDomainReadingNotAvailableYet', 'A public-domain reading is not available for this passage yet, so Aletheia is showing the safest curated reading available and keeping the reference exact.')}
          </p>
        ) : null}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border p-4" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.context', 'Context')}</p>
            <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
              {localizedEntry?.context ?? ts('labels.referenceShownBecauseCurated', 'This reference is shown because it belongs to Aletheia’s curated wisdom library.')}
            </p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.whyItMattersHere', 'Why it matters here')}</p>
            <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
              {localizedEntry?.application ?? ts('labels.useAsWisdomAnchor', 'Use it as a wisdom anchor, not as a prediction or pressure tactic.')}
            </p>
          </div>
        </div>
        <div className="mt-3 rounded-2xl border p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.primary, color: theme.textOnPrimary }}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textOnPrimary }}>{ts('labels.relatedPrinciple', 'Related principle')}</p>
          <p className="mt-2 text-sm leading-6" style={{ color: theme.textOnPrimary }}>
            {localizedEntry?.principle ?? ts('labels.onlyKnownReferences', 'Aletheia only surfaces known references and avoids invented verse text.')}
          </p>
        </div>
        <p className="mt-3 text-xs leading-5" style={{ color: theme.textMuted }}>
          {ts('labels.curatedReadingOrSummary', 'When Aletheia has a curated public-domain reading in your chosen translation, it shows that reading. Otherwise it uses a concise, clearly marked wisdom summary and keeps the reference exact.')}
        </p>
      </section>
    </div>
  );
}

function DeleteAccountModal({
  open,
  theme,
  ts,
  user,
  isWorking,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  user: User | null;
  isWorking: boolean;
  onCancel: () => void;
  onConfirm: (confirmation: string) => void;
}) {
  const [typedValue, setTypedValue] = useState("");

  if (!open) {
    return null;
  }

  const confirmationWord = "DELETE";
  const canConfirm = typedValue.trim().toUpperCase() === confirmationWord && !isWorking;
  const cancel = () => {
    setTypedValue("");
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-end p-3 backdrop-blur-sm sm:place-items-center" style={{ backgroundColor: "rgba(13, 23, 20, 0.48)" }}>
      <section className="w-full max-w-lg rounded-3xl border p-5 shadow-2xl" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.deleteAccount', 'Delete account')}</p>
            <h2 className="mt-2 text-xl font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.deleteAccountTitle', 'Permanently delete your Aletheia account')}</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
              {ts('labels.deleteAccountBody', 'This removes your signed-in profile and synced private data, including decisions, reflections, counsel contacts, rules, preferences, notifications, and account sessions.')}
            </p>
            {user ? (
              <p className="mt-2 text-xs leading-5" style={{ color: theme.textSecondary }}>
                {ts('labels.account', 'Account')}: <span className="font-semibold" style={{ color: theme.textPrimary }}>{user.email}</span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={cancel}
            className="grid size-10 shrink-0 place-items-center rounded-full border transition"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            aria-label={ts('labels.close', 'Close')}
          >
            <X size={17} />
          </button>
        </div>

        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (canConfirm) {
              onConfirm(typedValue);
            }
          }}
        >
          <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>
            {ts('labels.typeDeleteToConfirm', 'Type DELETE to confirm')}
            <input
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border px-3 text-sm normal-case tracking-normal outline-none"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              placeholder={confirmationWord}
              autoFocus
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={cancel}
              className="h-11 rounded-full border px-4 text-sm font-semibold"
              style={{ borderColor: theme.borderMedium, color: theme.textPrimary, backgroundColor: theme.bgInput }}
              disabled={isWorking}
            >
              {ts('labels.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="h-11 rounded-full px-4 text-sm font-semibold"
              style={{
                backgroundColor: canConfirm ? theme.primary : theme.borderMedium,
                color: theme.textOnPrimary,
                opacity: canConfirm ? 1 : 0.7,
              }}
              disabled={!canConfirm}
            >
              {isWorking ? ts('labels.deleting', 'Deleting...') : ts('labels.deleteAccount', 'Delete account')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ReportIssueModal({
  open,
  theme,
  ts,
  isWorking,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  isWorking: boolean;
  onCancel: () => void;
  onSubmit: (category: string, message: string) => void;
}) {
  const [category, setCategory] = useState("Bug or broken workflow");
  const [message, setMessage] = useState("");

  if (!open) {
    return null;
  }

  const canSubmit = message.trim().length >= 8 && !isWorking;
  const categories = [
    "Bug or broken workflow",
    "Confusing experience",
    "Incorrect scripture/context",
    "Notification issue",
    "Design/readability issue",
    "General feedback",
  ];
  const reset = () => {
    setCategory("Bug or broken workflow");
    setMessage("");
  };
  const cancel = () => {
    reset();
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-end p-3 backdrop-blur-sm sm:place-items-center" style={{ backgroundColor: "rgba(13, 23, 20, 0.48)" }}>
      <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border p-5 shadow-2xl" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.reportIssueTitle', 'Report an issue')}</p>
            <h2 className="mt-2 text-xl font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.helpImproveAletheia', 'Help improve Aletheia')}</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
              {ts('labels.reportIssuePrivacy', 'Only what you type here and basic app context are sent. Private chats, journals, decisions, and manual context are not attached.')}
            </p>
          </div>
          <button
            type="button"
            onClick={cancel}
            className="grid size-10 shrink-0 place-items-center rounded-full border transition"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            aria-label={ts('labels.close', 'Close')}
          >
            <X size={17} />
          </button>
        </div>
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) {
              reset();
              onSubmit(category, message);
            }
          }}
        >
          <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>
            {ts('labels.category', 'Category')}
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border px-3 text-sm normal-case tracking-normal outline-none"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            >
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>
            {ts('labels.message', 'Message')}
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="mt-2 min-h-36 w-full resize-none rounded-xl border px-3 py-3 text-sm normal-case leading-6 tracking-normal outline-none"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              placeholder={ts('placeholders.reportIssue', 'Tell us what happened, what you expected, and where you noticed it.')}
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={cancel}
              className="h-11 rounded-full border px-4 text-sm font-semibold"
              style={{ borderColor: theme.borderMedium, color: theme.textPrimary, backgroundColor: theme.bgInput }}
              disabled={isWorking}
            >
              {ts('labels.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="h-11 rounded-full px-4 text-sm font-semibold"
              style={{
                backgroundColor: canSubmit ? theme.primary : theme.borderMedium,
                color: theme.textOnPrimary,
                opacity: canSubmit ? 1 : 0.7,
              }}
              disabled={!canSubmit}
            >
              {isWorking ? ts('labels.sending', 'Sending...') : ts('labels.sendReport', 'Send report')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CounselInviteModal({
  theme,
  token,
  preview,
  status,
  ts,
  onAccept,
  onComment,
  onClose,
}: {
  theme: ThemeColors;
  token: string | null;
  preview: CounselInvitePreview | null;
  status: string;
  ts: (key: string, fallback?: string) => string;
  onAccept: () => void;
  onComment: (decisionId: string, body: string) => void;
  onClose: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  if (!token) {
    return null;
  }
  const accepted = preview?.invite.status === "accepted";
  const canComment = Boolean(preview?.invite.permissions.canCommentOnDecisions);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end p-3 backdrop-blur-sm sm:place-items-center" style={{ backgroundColor: 'rgba(13, 23, 20, 0.42)' }}>
      <section className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border p-5 shadow-2xl" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AvatarCircle
              avatarUrl={preview?.invite.avatarUrl}
              seed={token}
              label={preview?.invite.name ?? "Counsel contact"}
              size={44}
              className="size-11 rounded-full border object-cover"
            />
            <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accentGold }}>{ts('labels.privateCounselInvite', 'Private Counsel Invite')}</p>
            <h2 className="mt-2 text-2xl font-semibold" style={{ color: theme.textPrimary }}>
              {preview ? `${ts('labels.counselRequestFor', 'Counsel request for')} ${preview.invite.name}` : ts('status.openingInvite', 'Opening invite...')}
            </h2>
            <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
              {ts('labels.invitePrivacyNote', 'This link never gives access to private chats, journals, or unshared decisions. You only see summaries intentionally shared with you.')}
            </p>
            </div>
          </div>
          <button className="grid size-10 place-items-center rounded-full border transition" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }} onClick={onClose} aria-label="Close invite">
            <X size={17} />
          </button>
        </div>

        {status ? <p className="mt-4 rounded-2xl border p-3 text-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>{status}</p> : null}

        {preview ? (
          <>
            <div className="mt-4 grid gap-2 rounded-2xl border p-4 text-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
              <p>
                <span className="font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.role', 'Role')}:</span> {preview.invite.role}
              </p>
              <p>
                <span className="font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.status', 'Status')}:</span> {accepted ? ts('status.accepted', 'Accepted') : ts('status.waitingForAcceptance', 'Waiting for acceptance')}
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-xs font-semibold uppercase tracking-[0.08em]">
                {preview.invite.permissions.canViewSummaries ? <span className="rounded-full px-2 py-1" style={{ backgroundColor: theme.bgCard }}>{ts('labels.summariesOnly', 'summaries only')}</span> : null}
                {preview.invite.permissions.canCommentOnDecisions ? <span className="rounded-full px-2 py-1" style={{ backgroundColor: theme.bgCard }}>{ts('labels.commentsAllowed', 'comments allowed')}</span> : null}
                {preview.invite.permissions.canReceiveCheckins ? <span className="rounded-full px-2 py-1" style={{ backgroundColor: theme.bgCard }}>{ts('labels.waitingCheckins', 'waiting check-ins')}</span> : null}
              </div>
            </div>

            {!accepted ? (
              <button className="mt-4 h-11 w-full rounded-full px-4 text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} onClick={onAccept}>
                {ts('labels.acceptPrivateCounselInvite', 'Accept private counsel invite')}
              </button>
            ) : (
              <div className="mt-4 space-y-3">
                {preview.sharedDecisions.map((decision) => (
                  <article key={decision.id} className="rounded-2xl border p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{decision.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em]" style={{ color: theme.textMuted }}>
                          {(isMode(decision.mode) ? ts(modeTranslationKey(decision.mode), decision.mode) : decision.mode)} · readiness {decision.readiness}/100
                        </p>
                      </div>
                      <span className="w-fit rounded-full px-2 py-1 text-xs font-semibold" style={{ backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>{decision.status}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6" style={{ color: theme.textSecondary }}>
                      {decision.summary || "The user shared this decision, but a summary has not been generated yet."}
                    </p>
                    {decision.comments.length ? (
                      <div className="mt-3 space-y-2">
                        {decision.comments.map((comment) => (
                          <p key={comment.id} className="rounded-2xl border p-3 text-sm leading-6" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
                            {comment.body}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {canComment ? (
                      <form
                        className="mt-3 grid gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const body = drafts[decision.id]?.trim();
                          if (!body) {
                            return;
                          }
                          onComment(decision.id, body);
                          setDrafts((current) => ({ ...current, [decision.id]: "" }));
                        }}
                      >
                        <textarea
                          value={drafts[decision.id] ?? ""}
                          onChange={(event) => setDrafts((current) => ({ ...current, [decision.id]: event.target.value }))}
                          className="min-h-24 resize-none rounded-2xl border px-3 py-2 text-sm leading-6 outline-none"
                          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                          placeholder={ts('placeholders.counselPlaceholder', 'Offer counsel, questions, or cautions for this shared decision.')}
                        />
                        <button className="h-10 rounded-full px-3 text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>{ts('labels.sendPrivateComment', 'Send private comment')}</button>
                      </form>
                    ) : null}
                  </article>
                ))}
                {!preview.sharedDecisions.length ? (
                  <div className="rounded-2xl border p-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
                        <Users size={18} />
                      </div>
                      <div>
                        <p className="font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.youAreConnected', 'You are connected!')}</p>
                        <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                          {preview.invite.name} {ts('labels.noSharedDecisionsYet', 'has not shared any decision summaries yet. They will appear here when they choose to share them with you from their Decisions tab.')}
                        </p>
                        {preview.invite.permissions.canCommentOnDecisions ? (
                          <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                            {ts('labels.commentWhenShared', 'Once they share decisions, you will be able to leave comments offering your counsel, questions, or cautions.')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}

function CounselRemovalConfirmModal({
  theme,
  ts,
  pending,
  isWorking,
  onCancel,
  onConfirm,
}: {
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
  pending: CounselRemovalConfirmationState | null;
  isWorking: boolean;
  onCancel: () => void;
  onConfirm: (typedValue: string) => unknown;
}) {
  const [typedValue, setTypedValue] = useState("");

  if (!pending) {
    return null;
  }

  const confirmationWord = "REMOVE";
  const canConfirm = typedValue.trim().toUpperCase() === confirmationWord && !isWorking;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-end p-3 backdrop-blur-sm sm:place-items-center" style={{ backgroundColor: "rgba(13, 23, 20, 0.45)" }}>
      <section className="w-full max-w-lg rounded-3xl border p-5 shadow-2xl" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.finalConfirmationAction', 'Final confirmation action')}</p>
            <h2 className="mt-2 text-xl font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.removeFromCounselCircle', 'Remove from Counsel Circle')}: {pending.contactName}</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
              Type <span className="font-semibold" style={{ color: theme.textPrimary }}>{confirmationWord}</span> to permanently remove this contact and revoke shared access.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid size-10 shrink-0 place-items-center rounded-full border transition"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            aria-label="Close confirmation"
          >
            <X size={17} />
          </button>
        </div>

        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canConfirm) {
              return;
            }
            onConfirm(typedValue);
          }}
        >
          <input
            value={typedValue}
            onChange={(event) => setTypedValue(event.target.value)}
            className="h-11 rounded-xl border px-3 text-sm outline-none"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            placeholder={`${ts('labels.type', 'Type')} ${confirmationWord}`}
            autoFocus
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-11 rounded-full border px-4 text-sm font-semibold"
              style={{ borderColor: theme.borderMedium, color: theme.textPrimary, backgroundColor: theme.bgInput }}
              disabled={isWorking}
            >
              {ts('labels.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="h-11 rounded-full px-4 text-sm font-semibold"
              style={{
                backgroundColor: canConfirm ? theme.primary : theme.borderMedium,
                color: theme.textOnPrimary,
                opacity: canConfirm ? 1 : 0.7,
              }}
              disabled={!canConfirm}
            >
              {isWorking ? ts('labels.removing', 'Removing...') : ts('labels.confirmRemoval', 'Confirm removal')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PreferencesPanel({
  panelRef,
  ts,
  preferences,
  status,
  ui,
  copy,
  activeRegion,
  onChange,
  themePreference,
  onThemePreferenceChange,
  availableVoices,
  selectedVoice,
  onVoiceChange,
  theme,
}: {
  panelRef: RefObject<HTMLElement | null>;
  ts: (key: string, fallback?: string) => string;
  preferences: UserPreferences;
  status: string;
  ui: (typeof uiText)[LanguageCode];
  copy: (typeof languageCopy)[LanguageCode];
  activeRegion: (typeof regions)[RegionCode];
  onChange: (patch: Partial<UserPreferences>) => void;
  themePreference: ThemePreference;
  onThemePreferenceChange: (value: ThemePreference) => void;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: string | null;
  onVoiceChange: (voiceURI: string | null) => void;
  theme: ThemeColors;
}) {
  const bibleOptions = bibleTranslationOptionsForLanguage(preferences.language);
  const selectedTranslation = bibleTranslations[preferences.bibleTranslation];

  return (
    <section ref={panelRef} className="mb-5 scroll-mt-24 rounded-xl border p-4 shadow-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md" style={{ backgroundColor: theme.bgInput, color: theme.primary }}>
            <Languages size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{ui.preferencesTitle}</p>
            <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>{copy.onboarding}</p>
            <p className="mt-2 text-xs leading-5" style={{ color: theme.textSecondary }}>{status}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>
            {ui.language}
            <select
              value={preferences.language}
              onChange={(event) => onChange(preferencePatchForLanguage(event.target.value as LanguageCode))}
              className="mt-2 h-10 w-full rounded-md border px-3 text-sm normal-case tracking-normal outline-none"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            >
              {Object.entries(languages).map(([code, language]) => (
                <option key={code} value={code}>
              {language.nativeName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>
            {ui.bible}
            <select
              value={preferences.bibleTranslation}
              onChange={(event) => onChange({ bibleTranslation: event.target.value as BibleTranslation })}
              className="mt-2 h-10 w-full rounded-md border px-3 text-sm normal-case tracking-normal outline-none"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            >
              {bibleOptions.map((code) => {
                const translation = bibleTranslations[code];
                const languageName = languages[translation.language].nativeName;
                return (
                <option key={code} value={code}>
                  {languageName} · {translation.label}
                </option>
                );
              })}
            </select>
            <span className="mt-1 block text-[11px] normal-case leading-4 tracking-normal" style={{ color: theme.textSecondary }}>
              {selectedTranslation?.note}
            </span>
          </label>
          <div className="rounded-md border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>{ts('labels.appearance', 'Appearance')}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ThemeOptionButton icon={Sun} label="Classic" active={themePreference === "classic"} onClick={() => onThemePreferenceChange("classic")} color="#203a35" theme={theme} />
              <ThemeOptionButton icon={Moon} label="Dark" active={themePreference === "dark"} onClick={() => onThemePreferenceChange("dark")} color="#d0ad55" theme={theme} />
              <ThemeOptionButton icon={Moon} label="Black" active={themePreference === "black"} onClick={() => onThemePreferenceChange("black")} color="#0b0f0d" theme={theme} />
              <ThemeOptionButton icon={Monitor} label="System" active={themePreference === "system"} onClick={() => onThemePreferenceChange("system")} theme={theme} />
            </div>
          </div>
        </div>
      </div>
      <details className="mt-3 rounded-md border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>
          Advanced preferences · {activeRegion.label} · {preferences.voiceEnabled ? "voice on" : "voice off"}
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border p-3 md:col-span-2" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>{ts('labels.moreThemes', 'More themes')}</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              <ThemeOptionButton icon={Sun} label="Warm" active={themePreference === "warm"} onClick={() => onThemePreferenceChange("warm")} color="#8b5a3c" theme={theme} />
              <ThemeOptionButton icon={Sun} label="Ocean" active={themePreference === "ocean"} onClick={() => onThemePreferenceChange("ocean")} color="#2d5a7b" theme={theme} />
              <ThemeOptionButton icon={Sun} label="Forest" active={themePreference === "forest"} onClick={() => onThemePreferenceChange("forest")} color="#2d6b4a" theme={theme} />
              <ThemeOptionButton icon={Sun} label="Sunset" active={themePreference === "sunset"} onClick={() => onThemePreferenceChange("sunset")} color="#8b3a52" theme={theme} />
            </div>
          </div>
          <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>
            {ui.region}
            <select
              value={preferences.region}
              onChange={(event) => onChange({ region: event.target.value as RegionCode })}
              className="mt-2 h-10 w-full rounded-md border px-3 text-sm normal-case tracking-normal outline-none"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            >
              {Object.entries(regions).map(([code, region]) => (
                <option key={code} value={code}>
                  {region.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex h-full items-end gap-2 rounded-md border px-3 py-2 text-sm font-semibold" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textPrimary }}>
            <input
              type="checkbox"
              checked={preferences.voiceEnabled}
              onChange={(event) => onChange({ voiceEnabled: event.target.checked })}
              className="size-4"
              style={{ accentColor: theme.primary }}
            />
            {ui.voiceControls}
          </label>
        </div>
        {preferences.voiceEnabled && availableVoices.length > 0 ? (
          <div className="mt-3">
            <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>
              Reading voice
              <select
                value={selectedVoice || ""}
                onChange={(event) => onVoiceChange(event.target.value || null)}
                className="mt-2 h-10 w-full rounded-md border px-3 text-sm normal-case tracking-normal outline-none"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              >
                <option value="">{ts('labels.deviceDefaultRecommended', 'Device default (recommended)')}</option>
                {availableVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voiceLabel(voice)}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] normal-case leading-4 tracking-normal" style={{ color: theme.textSecondary }}>
                Aletheia shows only a short curated set of human-sounding device voices. Sound-effect voices are hidden.
              </span>
            </label>
          </div>
        ) : preferences.voiceEnabled ? (
          <p className="mt-3 rounded-md border p-3 text-xs leading-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
            No suitable human-sounding reading voice was found for this language on this device.
          </p>
        ) : null}
      </details>
      <div className="mt-3 grid gap-2 text-xs leading-5 md:grid-cols-3" style={{ color: theme.textSecondary }}>
        <p className="rounded-md border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>{copy.translationFallback}</p>
        <p className="rounded-md border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>{copy.regionHint}</p>
        <p className="rounded-md border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
          <Globe2 className="mr-1 inline align-[-2px]" size={14} />
          {activeRegion.example}
        </p>
      </div>
    </section>
  );
}

function CompanionPanel({
  ts,
  messages,
  mode,
  modeProfile,
  modeCards,
  preferences,
  copy,
  ui,
  query,
  focusIntentions,
  setQuery,
  onAsk,
  onDraftPrompt,
  onModeChange,
  onListen,
  onAskQuestion,
  onClearVoiceTranscript,
  onSpeak,
  onTogglePause,
  onScriptureOpen,
  onTrackDecision,
  onDraftReflection,
  onCreateCounselSummary,
  onGoDeeper,
  onWait,
  onSharePostcard,
  onShare,
  onFeedback,
  isWorking,
  isListening,
  voiceTranscriptPreview,
  isSpeaking,
  speechPaused,
  speechProgress,
  answerFocusId,
  onAnswerFocused,
  theme,
}: {
  ts: (key: string, fallback?: string) => string;
  messages: ChatMessage[];
  mode: Mode;
  modeProfile: DisplayModeProfile;
  modeCards: ModeCard[];
  preferences: UserPreferences;
  copy: (typeof languageCopy)[LanguageCode];
  ui: (typeof uiText)[LanguageCode];
  query: string;
  focusIntentions: string[];
  setQuery: (value: string) => void;
  onAsk: (event: FormEvent<HTMLFormElement>) => void;
  onDraftPrompt: (value: string) => void;
  onModeChange: (mode: Mode) => void;
  onListen: () => void;
  onAskQuestion: (question: string) => Promise<void>;
  onClearVoiceTranscript: () => void;
  onSpeak: () => void;
  onTogglePause: () => void;
  onScriptureOpen: (scripture: string) => void;
  onTrackDecision: (exchange: ConversationExchange) => void;
  onDraftReflection: (exchange: ConversationExchange) => void;
  onCreateCounselSummary: (exchange: ConversationExchange) => void;
  onGoDeeper: (exchange: ConversationExchange) => void;
  onWait: (exchange: ConversationExchange) => void;
  onSharePostcard: (exchange: ConversationExchange) => void;
  onShare: (channel: ShareChannel) => void;
  onFeedback: (value: string) => void;
  isWorking: boolean;
  isListening: boolean;
  voiceTranscriptPreview: string;
  isSpeaking: boolean;
  speechPaused: boolean;
  speechProgress: number;
  answerFocusId: string | null;
  onAnswerFocused: () => void;
  theme: ThemeColors;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const currentCounselRef = useRef<HTMLDivElement | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [showSidebarDeep, setShowSidebarDeep] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [voiceDetailsOpen, setVoiceDetailsOpen] = useState(false);
  const exchanges = conversationExchanges(messages);
  const currentExchange = exchanges[exchanges.length - 1] ?? null;
  const history = exchanges.slice(0, -1).reverse();
  const hasCounselSurface = Boolean(currentExchange || history.length);
  const focusLabels = focusIntentionLabels(focusIntentions);
  const suggestedFocusPrompt = focusIntentionPrompt(focusIntentions, "companion");
  const promptChips = [suggestedFocusPrompt, ...modeProfile.prompts].filter(Boolean).slice(0, 3);
  const currentModeCard = modeCards.find((item) => item.label === mode) ?? modeCards[0];
  const CurrentLensIcon = currentModeCard.icon;
  const voiceDraft = voiceTranscriptPreview.trim();

  useEffect(() => {
    if (!answerFocusId || !currentExchange?.question) {
      return;
    }
    window.setTimeout(() => {
      currentCounselRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      onAnswerFocused();
    }, 60);
  }, [answerFocusId, currentExchange?.id, currentExchange?.answer.id, currentExchange?.question, onAnswerFocused]);

  return (
    <div className="space-y-4">
      <section id="companion-ask" ref={panelRef} className="min-w-0 scroll-mt-24 overflow-hidden rounded-xl border shadow-[0_18px_45px_rgba(33,58,53,0.08)]" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
        <div className="flex flex-col gap-3 border-b px-3 py-3 sm:px-5 sm:py-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold" style={{ color: theme.textPrimary }}>
              <MessageCircle size={18} />
              {ui.askTitle}
            </div>
            <p className="mt-1 text-sm leading-5" style={{ color: theme.textSecondary }}>
              {ui.askIntro}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="w-fit rounded-sm border px-2 py-1 text-xs font-semibold" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }} suppressHydrationWarning>
              {languages[preferences.language].nativeName} · {preferences.bibleTranslation}
            </span>
          </div>
        </div>

        <form onSubmit={onAsk} className="p-3 sm:p-5" style={{ backgroundColor: theme.bgMain + 'E0' }}>
          <div className="rounded-lg border p-3 shadow-sm sm:p-4" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ui.yourQuestion}</p>
              <span className="rounded-sm px-2 py-1 text-xs font-semibold" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>
                {modeProfile.focus}
              </span>
            </div>
            <div className="mb-3 rounded-xl border p-2.5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
              <div className="flex items-center gap-3 rounded-lg border p-2.5" style={{ borderColor: theme.primary, backgroundColor: theme.bgCard }}>
                <span className="grid size-10 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                  <CurrentLensIcon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{ui.currentLens}</span>
                  <span className="mt-0.5 flex min-w-0 items-center gap-2">
                    <span className="truncate text-base font-semibold" style={{ color: theme.textPrimary }}>{modeProfile.displayLabel ?? mode}</span>
                    <Check className="shrink-0" size={16} style={{ color: theme.primary }} />
                  </span>
                </span>
              </div>
              <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]" aria-label={ui.currentLens}>
                {modeCards.map((item) => (
                  <ModeLensCard
                    key={item.label}
                    item={item}
                    active={mode === item.label}
                    onClick={() => onModeChange(item.label)}
                    theme={theme}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <textarea
                id="companion-question-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`${copy.askPlaceholder} ${(focusLabels[0] ?? modeProfile.focus).toLowerCase()}...`}
                className="min-h-32 flex-1 resize-none rounded-md border px-4 py-4 text-base leading-7 outline-none transition sm:text-sm"
                style={{
                  borderColor: theme.borderMedium,
                  backgroundColor: theme.bgInput,
                  color: theme.textPrimary,
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = theme.primary}
                onBlur={(e) => e.currentTarget.style.borderColor = theme.borderMedium}
              />
              <div className="flex items-stretch gap-2">
                {preferences.voiceEnabled ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onListen}
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border px-3 transition"
                      style={{
                        borderColor: isListening ? theme.primary : theme.borderMedium,
                        backgroundColor: isListening ? theme.activeBg : theme.bgInput,
                        color: isListening ? theme.primary : theme.textPrimary,
                        boxShadow: isListening ? `0 0 0 2px ${theme.primary}1f` : "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isListening ? theme.activeBg : theme.bgCardElevated;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isListening ? theme.activeBg : theme.bgInput;
                      }}
                      aria-label={isListening ? ts('labels.stopDictation', 'Stop dictation') : ts('labels.startDictation', 'Start dictation')}
                      title={isListening ? ts('labels.stopDictation', 'Stop dictation') : ts('labels.startDictation', 'Tap to dictate your question')}
                    >
                      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                    {isListening ? (
                      <span
                        className="inline-flex h-12 items-center gap-2 rounded-lg border px-3 text-[11px] font-semibold uppercase tracking-[0.12em]"
                        style={{
                          borderColor: theme.primary,
                          backgroundColor: theme.bgCardElevated,
                          color: theme.primary,
                        }}
                        aria-live="polite"
                      >
                        <span className="relative flex size-3 items-center justify-center" aria-hidden="true">
                          <span className="absolute inline-flex size-3 animate-ping rounded-full bg-red-500 opacity-70" />
                          <span className="relative size-2 rounded-full bg-red-500" />
                        </span>
                        REC
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <button
                  disabled={isWorking}
                  className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold shadow-lg transition disabled:opacity-60 sm:flex-none"
                  style={{
                    backgroundColor: theme.primary,
                    color: theme.textOnPrimary,
                  }}
                  onMouseEnter={(e) => !isWorking && (e.currentTarget.style.backgroundColor = theme.primaryHover)}
                  onMouseLeave={(e) => !isWorking && (e.currentTarget.style.backgroundColor = theme.primary)}
                >
                  <Send size={17} />
                  {isWorking ? "..." : ui.askButton}
                </button>
              </div>
              {isListening || voiceDraft ? (
                <DisclosureSection
                  title={isListening ? ts('notifications.voiceInputListening', 'Voice input active') : ts('labels.voiceTranscription', 'Voice transcription')}
                  summary={voiceDraft || (isListening ? ts('notifications.voiceInputListeningBody', 'Speak now. Your words will appear here before you insert them.') : "")}
                  eyebrow={ui.yourQuestion}
                  isOpen={isListening || Boolean(voiceDraft) || voiceDetailsOpen}
                  onOpenChange={setVoiceDetailsOpen}
                  compactCollapsed
                  showDetailsLabel={ts('showDetails', 'Show details')}
                  hideDetailsLabel={ts('hideDetails', 'Hide details')}
                  className="pt-1"
                  theme={theme}
                >
                  <div className="text-xs leading-5" style={{ color: theme.textSecondary }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold" style={{ color: theme.textPrimary }}>
                        {isListening ? ts('notifications.voiceInputListening', 'Voice input active') : ts('labels.voiceTranscription', 'Voice transcription')}
                      </span>
                      <span className="rounded-full border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                        {isListening ? ts('labels.listening', 'Listening') : ts('labels.voiceDraftReady', 'Draft ready')}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6" style={{ color: theme.textPrimary }}>
                      {voiceDraft || (isListening ? ts('notifications.voiceInputListeningBody', 'Speak now. Your words will appear here before you insert them.') : "")}
                    </p>
                    {!isListening && voiceDraft ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setQuery([query.trim(), voiceDraft].filter(Boolean).join(" "));
                            onClearVoiceTranscript();
                          }}
                          className="rounded-md border px-3 py-2 font-semibold transition"
                          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                        >
                          {ts('labels.insertTranscript', 'Insert transcript')}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const mergedQuestion = [query.trim(), voiceDraft].filter(Boolean).join(" ").trim();
                            onClearVoiceTranscript();
                            await onAskQuestion(mergedQuestion);
                          }}
                          className="rounded-md px-3 py-2 font-semibold transition"
                          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                        >
                          {ts('labels.askTranscript', 'Ask now')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onClearVoiceTranscript()}
                          className="rounded-md border px-3 py-2 font-semibold transition"
                          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
                        >
                          {ts('labels.clearTranscript', 'Clear')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </DisclosureSection>
              ) : null}
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {promptChips.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onDraftPrompt(prompt)}
                  disabled={isWorking}
                  className="shrink-0 rounded-md border px-3 py-3 text-left text-xs font-semibold leading-5 shadow-sm transition disabled:opacity-60"
                  style={{
                    borderColor: theme.borderMedium,
                    backgroundColor: theme.bgCard,
                    color: theme.textPrimary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = theme.primary;
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = theme.borderMedium;
                    e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
            {preferences.voiceEnabled ? <p className="mt-2 text-xs leading-5" style={{ color: theme.textMuted }}>{copy.voiceHint}</p> : null}
          </div>
        </form>
      </section>

      {hasCounselSurface ? (
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 rounded-xl border p-3 shadow-sm sm:p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
          {currentExchange ? (
            <div ref={currentCounselRef} className="scroll-mt-24">
              <CurrentCounselCard
                ts={ts}
                theme={theme}
                exchange={currentExchange}
                preferences={preferences}
                ui={ui}
                isWorking={isWorking}
                isSpeaking={isSpeaking}
                speechPaused={speechPaused}
                speechProgress={speechProgress}
                onSpeak={onSpeak}
                onTogglePause={onTogglePause}
                onScriptureOpen={onScriptureOpen}
                onTrackDecision={onTrackDecision}
                onDraftReflection={onDraftReflection}
                onCreateCounselSummary={onCreateCounselSummary}
                onGoDeeper={onGoDeeper}
                onWait={onWait}
                onSharePostcard={onSharePostcard}
                onShare={onShare}
                onFeedback={onFeedback}
              />
            </div>
          ) : null}

          {history.length ? (
            <section className="mt-4 rounded-lg border p-3 sm:p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.conversationHistory', 'Conversation history')}</p>
                  <p className="mt-1 text-sm leading-6" style={{ color: theme.textMuted }}>
                    Older counsel is kept quiet so the current question stays clear.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-fit rounded-sm px-2 py-1 text-xs font-semibold" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                    {history.length} saved
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHistory((value) => !value)}
                    className="rounded-md border px-2 py-1 text-[11px] font-semibold transition"
                    style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
                  >
                    {showHistory ? ui.hideDetails : ui.showDetails}
                  </button>
                </div>
              </div>
              {showHistory ? <div className="mt-3 space-y-2">
                {history.map((exchange) => (
                  <HistoryExchange
                    key={exchange.id}
                    theme={theme}
                    exchange={exchange}
                    preferences={preferences}
                    ui={ui}
                    expanded={expandedHistoryId === exchange.id}
                    onToggle={() => setExpandedHistoryId((current) => (current === exchange.id ? null : exchange.id))}
                    onContinue={() => {
                      if (!exchange.question) return;
                      onDraftPrompt(`Continue from this: ${cleanDisplayText(exchange.question.text)}`);
                      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    onScriptureOpen={onScriptureOpen}
                  />
                ))}
              </div> : null}
            </section>
          ) : null}
        </section>

      <aside className="space-y-4">
        <section className={`rounded-xl border shadow-sm ${showSidebarDeep ? "p-4" : "p-3"}`} style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ui.modeGuidance}</p>
            <button
              type="button"
              onClick={() => setShowSidebarDeep((v) => !v)}
              className="rounded-md border px-2 py-1 text-[10px] font-semibold transition"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
            >
              {showSidebarDeep ? ui.hideDetails : ui.showDetails}
            </button>
          </div>
          {showSidebarDeep ? (
            <div className="mt-3 space-y-3 editorial-sidebar">
              <div className="rounded-lg border p-3" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}>
                <h2 className="font-semibold" style={{ color: theme.textPrimary }}>{modeProfile.displayLabel ?? modeProfile.label}: {modeProfile.intent}</h2>
                <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>{modeProfile.useWhen}</p>
                <p className="mt-3 text-sm leading-6" style={{ color: theme.textSecondary }}>{modeProfile.lens}</p>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{ui.deepChecks}</p>
                <div className="mt-2 space-y-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                  {modeProfile.diagnosticTracks.slice(0, 3).map((track) => (
                    <p key={track}>{track}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{ui.blindSpots}</p>
                <ul className="mt-2 space-y-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                  {modeProfile.blindSpots.slice(0, 3).map((spot) => (
                    <li key={spot}>{spot}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border p-3" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{ui.maturitySignals}</p>
                <ul className="mt-2 space-y-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                  {modeProfile.maturitySignals.slice(0, 3).map((signal) => (
                    <li key={signal} className="flex gap-2">
                      <Check className="mt-1 shrink-0" style={{ color: theme.primary }} size={15} />
                      <span>{signal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="mt-2" style={{ color: theme.textSecondary }}>
              <p className="text-sm leading-5">{modeProfile.intent}</p>
            </div>
          )}
        </section>

        <TrustLayerPanel theme={theme} ui={ui} />
        </aside>
      </div>
      ) : null}
    </div>
  );
}

function ScriptureChips({
  theme,
  sources,
  preferences,
  onScriptureOpen,
}: {
  theme: ThemeColors;
  sources?: WisdomEntry[];
  preferences: UserPreferences;
  onScriptureOpen: (scripture: string) => void;
}) {
  if (!sources?.length) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {sources.map((source) => (
        <button
          type="button"
          key={source.scripture}
          onClick={() => onScriptureOpen(source.scripture)}
          className="rounded-md border px-2 py-1 text-xs font-semibold transition"
          style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textSecondary }}
          suppressHydrationWarning
        >
          {source.scripture} · {localizedScriptureRead(source.scripture, preferences).translation}
        </button>
      ))}
    </div>
  );
}

const scriptureBookPattern = Array.from(
  new Set(curatedScriptureReferences.map((reference) => reference.replace(/\s+\d+:\d+(?:[-–—]\d+)?$/, "")))
)
  .sort((a, b) => b.length - a.length)
  .map((book) => book.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const scriptureTextReferencePattern = new RegExp(
  `\\b(?:${scriptureBookPattern})\\s+\\d+:\\d+(?:\\s*[-–—]\\s*\\d+)?\\b`,
  "g"
);

function scriptureTextMatches(text: string) {
  return [...text.matchAll(scriptureTextReferencePattern)]
    .map((match) => {
      const label = match[0];
      const canonical = canonicalScriptureReference(label);
      return {
        label,
        scripture: canonical,
        index: match.index ?? 0,
      };
    })
    .filter((match) => curatedScriptureReferences.includes(match.scripture))
    .sort((a, b) => a.index - b.index);
}

function ScriptureLinkedText({
  theme,
  text,
  onScriptureOpen,
}: {
  theme: ThemeColors;
  text: string;
  onScriptureOpen: (scripture: string) => void;
}) {
  const cleaned = cleanDisplayText(text);
  const matches = scriptureTextMatches(cleaned);

  if (!matches.length) {
    return <p className="whitespace-pre-wrap text-sm leading-6" style={{ color: theme.textPrimary }}>{cleaned}</p>;
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((match, position) => {
    if (match.index < cursor) {
      return;
    }
    if (match.index > cursor) {
      nodes.push(cleaned.slice(cursor, match.index));
    }
    nodes.push(
      <button
        key={`${match.label}-${position}-${match.index}`}
        type="button"
        onClick={() => onScriptureOpen(match.label)}
        className="mx-0.5 rounded-md px-1.5 py-0.5 font-semibold underline decoration-1 underline-offset-2 transition"
        style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
      >
        {match.label}
      </button>
    );
    cursor = match.index + match.label.length;
  });
  if (cursor < cleaned.length) {
    nodes.push(cleaned.slice(cursor));
  }

  return <p className="whitespace-pre-wrap text-sm leading-6" style={{ color: theme.textPrimary }}>{nodes}</p>;
}

function TrustLayerPanel({ theme, ui }: { theme: ThemeColors; ui: (typeof uiText)[LanguageCode] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-xl border p-4 shadow-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={17} style={{ color: theme.primary }} />
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ui.trustLayer}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-md border px-2 py-1 text-[11px] font-semibold transition"
          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
        >
          {open ? ui.hideDetails : ui.showDetails}
        </button>
      </div>
      <p className="mt-3 rounded-lg border p-3 text-sm leading-6" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
        {ui.trustScriptureBody ?? uiText.en.trustScriptureBody}
      </p>
      {open ? <div className="mt-3 space-y-3 text-sm leading-6" style={{ color: theme.textSecondary }}>
        <p className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
          {ui.trustBoundaryBody ?? uiText.en.trustBoundaryBody}
        </p>
        <p className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
          {ui.trustMemoryBody ?? uiText.en.trustMemoryBody}
        </p>
        <p className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
          {ui.trustConnectedDataBody ?? uiText.en.trustConnectedDataBody}
        </p>
      </div> : null}
    </section>
  );
}

function ThemeOptionButton({
  icon: Icon,
  label,
  active,
  onClick,
  color,
  theme,
}: {
  icon: typeof Sun;
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
  theme: ThemeColors;
}) {
  // Use the theme color for active state, or the color prop
  const activeColor = color || theme.primary;
  
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-xs font-semibold transition"
      style={{
        backgroundColor: active ? activeColor : theme.bgInput,
        color: active ? (color ? '#f8f5e8' : theme.textOnPrimary) : theme.textPrimary,
        borderWidth: active ? '2px' : '1px',
        borderStyle: 'solid',
        borderColor: active ? theme.accentGold : theme.borderMedium,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = theme.bgCardElevated;
          e.currentTarget.style.borderColor = theme.borderStrong;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = theme.bgInput;
          e.currentTarget.style.borderColor = theme.borderMedium;
        }
      }}
    >
      <Icon size={14} style={color && !active ? { color } : undefined} />
      {label}
    </button>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  ts,
  theme,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  step: number;
  onChange: (value: number | null) => void;
  ts: (key: string, fallback?: string) => string;
  theme: ThemeColors;
}) {
  const shown = value === null ? min : value;
  const isSignalScale = min === 0 && max === 10 && step === 1;
  if (isSignalScale) {
    return (
      <div className="rounded-xl border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>{label}</p>
          <span className="rounded-md px-2 py-1 text-[10px] font-semibold tracking-[0.08em]" style={{ backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}>
            {value === null ? ts('placeholders.notSet', 'Not set') : String(value)}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-6 gap-1 sm:grid-cols-11">
          {Array.from({ length: 11 }, (_, index) => (
            <button
              key={index}
              type="button"
              className="h-8 rounded-md border text-xs font-semibold transition"
              style={{
                borderColor: value === index ? theme.primary : theme.borderLight,
                backgroundColor: value === index ? theme.activeBg : theme.bgCard,
                color: value === index ? theme.textPrimary : theme.textSecondary,
              }}
              onClick={() => onChange(value === index ? null : index)}
            >
              {index}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-5" style={{ color: theme.textMuted }}>
          {ts('manualContext.tapToSet', 'Tap a number to set it, or tap it again to clear it.')}
        </p>
      </div>
    );
  }

  return (
    <label className="rounded-xl border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
      <span className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</span>
        <span className="rounded-md px-2 py-1 text-[10px] font-semibold tracking-[0.08em]" style={{ backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}>
          {value === null ? ts('placeholders.notSet', 'Not set') : String(value)}
        </span>
      </span>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          className="grid size-10 shrink-0 place-items-center rounded-md border text-lg font-semibold"
          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard, color: theme.textPrimary }}
          onClick={() => onChange(value === null ? min : Math.max(min, Number((shown - step).toFixed(2))))}
        >
          -
        </button>
        <input
          inputMode="decimal"
          type="number"
          min={min}
          max={max}
          step={step}
          value={value ?? ""}
          placeholder={ts('placeholders.notSet', 'Not set')}
          onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
          className="min-h-10 w-full rounded-md border px-3 py-2 text-sm normal-case tracking-normal outline-none"
          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard, color: theme.textPrimary }}
          onFocus={(e) => e.currentTarget.style.borderColor = theme.primary}
          onBlur={(e) => e.currentTarget.style.borderColor = theme.borderMedium}
        />
        <button
          type="button"
          className="grid size-10 shrink-0 place-items-center rounded-md border text-lg font-semibold"
          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard, color: theme.textPrimary }}
          onClick={() => onChange(value === null ? min : Math.min(max, Number((shown + step).toFixed(2))))}
        >
          +
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: theme.textMuted }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </label>
  );
}

function CurrentCounselCard({
  ts,
  theme,
  exchange,
  preferences,
  ui,
  isWorking,
  isSpeaking,
  speechPaused,
  speechProgress,
  onSpeak,
  onTogglePause,
  onScriptureOpen,
  onTrackDecision,
  onDraftReflection,
  onCreateCounselSummary,
  onGoDeeper,
  onWait,
  onSharePostcard,
  onShare,
  onFeedback,
}: {
  ts: (key: string, fallback?: string) => string;
  theme: ThemeColors;
  exchange: ConversationExchange;
  preferences: UserPreferences;
  ui: (typeof uiText)[LanguageCode];
  isWorking: boolean;
  isSpeaking: boolean;
  speechPaused: boolean;
  speechProgress: number;
  onSpeak: () => void;
  onTogglePause: () => void;
  onScriptureOpen: (scripture: string) => void;
  onTrackDecision: (exchange: ConversationExchange) => void;
  onDraftReflection: (exchange: ConversationExchange) => void;
  onCreateCounselSummary: (exchange: ConversationExchange) => void;
  onGoDeeper: (exchange: ConversationExchange) => void;
  onWait: (exchange: ConversationExchange) => void;
  onSharePostcard: (exchange: ConversationExchange) => void;
  onShare: (channel: ShareChannel) => void;
  onFeedback: (value: string) => void;
}) {
  const text = { ...uiText.en, ...ui };
  const question = exchange.question?.text;
  const exchangeMode = exchange.mode;
  const exchangeModeProfile = localizedModeProfile(exchangeMode, preferences.language);
  const isThinking = exchange.answer.id === "thinking";
  const showDecisionActions = Boolean(question) && !isThinking;
  const answerText = exchange.answer.id === "welcome" ? text.welcomeCounsel! : exchange.answer.text;
  const [isCounselLensOpen, setIsCounselLensOpen] = useState(false);

  return (
    <section className="rounded-lg border p-3 shadow-sm sm:p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>
          {question ? text.currentCounsel : ui.startHere}
        </p>
        <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: isThinking || isWorking ? theme.bgCardElevated : theme.bgInput, color: isThinking || isWorking ? theme.accentGold : theme.textSecondary }}>
          {isThinking || isWorking ? "..." : ui.ready}
        </span>
      </div>
      {question ? (
        <div className="rounded-md p-3" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textOnPrimary }}>{ui.yourQuestion}</p>
          <p className="mt-2 text-sm leading-6">{cleanDisplayText(question)}</p>
        </div>
      ) : null}
      <article className="editorial-counsel mt-3 rounded-md border p-3 sm:p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{ts('labels.appName', 'Aletheia')}</p>
          {preferences.voiceEnabled && !isThinking ? (
            <div className="flex items-center gap-2">
              {isSpeaking && speechProgress > 0 ? (
                <span className="text-xs" style={{ color: theme.textMuted }}>{speechProgress}%</span>
              ) : null}
              <button
                type="button"
                onClick={onSpeak}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
                aria-label={isSpeaking ? "Stop reading aloud" : "Read answer aloud"}
                title={isSpeaking ? "Stop" : "Listen to this answer"}
              >
                <Volume2 size={14} style={isSpeaking ? { color: theme.accentGold } : undefined} />
                {isSpeaking ? "Stop" : "Read aloud"}
              </button>
              {isSpeaking ? (
                <button
                  type="button"
                  onClick={onTogglePause}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition"
                  style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
                  aria-label={speechPaused ? "Resume reading" : "Pause reading"}
                  title={speechPaused ? "Resume" : "Pause"}
                >
                  {speechPaused ? "Resume" : "Pause"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div
          className={`mb-3 rounded-md border ${isCounselLensOpen ? "p-3" : "px-3 py-2"}`}
          style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}
        >
          <button
            type="button"
            onClick={() => setIsCounselLensOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left"
            aria-expanded={isCounselLensOpen}
          >
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>
                {ui.wisdomMode}
              </span>
              <span className="mt-1 block text-sm font-semibold" style={{ color: theme.textPrimary }}>
                {ui.currentLens}: {exchangeModeProfile.displayLabel ?? exchangeMode}
              </span>
            </span>
            <span className="shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {isCounselLensOpen ? ui.hideDetails : ui.showDetails}
            </span>
          </button>
          {isCounselLensOpen ? (
            <p className="mt-2 text-xs leading-5">
              {exchangeModeProfile.displayLabel ?? exchangeMode} {text.modeShapesCounsel} {exchangeModeProfile.lens.toLowerCase()}
            </p>
          ) : null}
        </div>
        <div className="calm-prose" style={{ color: theme.textPrimary }}>
          <ScriptureLinkedText theme={theme} text={answerText} onScriptureOpen={onScriptureOpen} />
        </div>
        <ScriptureChips theme={theme} sources={exchange.answer.sources} preferences={preferences} onScriptureOpen={onScriptureOpen} />
      </article>
      {showDecisionActions ? (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <CounselAction theme={theme} label={text.trackThisDecision!} onClick={() => onTrackDecision(exchange)} />
            <CounselAction theme={theme} label={text.saveAsReflection!} onClick={() => onDraftReflection(exchange)} />
            <CounselAction theme={theme} label={text.createCounselSummary!} onClick={() => onCreateCounselSummary(exchange)} />
          </div>
          <details className="mt-3 rounded-md border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>
              {ts('labels.moreCounselOptions', 'More counsel options')}
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <CounselAction theme={theme} label={text.goDeeper!} onClick={() => onGoDeeper(exchange)} />
              <CounselAction theme={theme} label={text.waitThreeDays!} onClick={() => onWait(exchange)} />
              <CounselAction theme={theme} label={ts('labels.createAnswerCard', 'Create wisdom card')} onClick={() => onSharePostcard(exchange)} />
            </div>
            <AnswerFeedback theme={theme} ui={ui} onFeedback={onFeedback} />
            <div className="mt-3 rounded-md border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
              <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{text.shareAnswerPrompt}</p>
              <p className="mt-1 text-xs leading-5" style={{ color: theme.textSecondary }}>
                {text.sharePrivacyNote}
              </p>
              <button
                type="button"
                onClick={() => onShare("native")}
                className="mt-3 inline-flex h-11 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              >
                <Share2 size={14} />
                {text.shareAletheia}
              </button>
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}

function AnswerFeedback({ theme, ui, onFeedback }: { theme: ThemeColors; ui: (typeof uiText)[LanguageCode]; onFeedback: (value: string) => void }) {
  const text = { ...uiText.en, ...ui };
  const items = [
    ["helpful", text.feedbackHelpful!],
    ["mildly_helpful", text.feedbackMildlyHelpful!],
    ["too_vague", text.feedbackTooVague!],
    ["too_preachy", text.feedbackTooPreachy!],
    ["not_relevant", text.feedbackNotRelevant!],
  ] as const;

  return (
    <div className="mt-3 rounded-lg border p-3" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{text.feedbackQuestion}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onFeedback(value)}
            className="h-8 rounded-md border px-3 text-xs font-semibold transition"
            style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CounselAction({ theme, label, onClick }: { theme: ThemeColors; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border px-3 py-2 text-xs font-semibold transition"
      style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}
    >
      {label}
    </button>
  );
}

function HistoryExchange({
  theme,
  exchange,
  preferences,
  ui,
  expanded,
  onToggle,
  onContinue,
  onScriptureOpen,
}: {
  theme: ThemeColors;
  exchange: ConversationExchange;
  preferences: UserPreferences;
  ui: (typeof uiText)[LanguageCode];
  expanded: boolean;
  onToggle: () => void;
  onContinue: () => void;
  onScriptureOpen: (scripture: string) => void;
}) {
  const title = exchange.question?.text ?? "Welcome guidance";
  const preview = cleanDisplayText(exchange.answer.text).slice(0, 120);
  const exchangeModeProfile = localizedModeProfile(exchange.mode, preferences.language);

  return (
    <article className="rounded-lg border" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-3 text-left transition"
      >
        <span className="min-w-0">
          <span className="block break-words text-sm font-semibold leading-5" style={{ color: theme.textPrimary }}>{cleanDisplayText(title)}</span>
          <span className="mt-1 inline-flex rounded-md px-2 py-1 text-[11px] font-semibold" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}>
            {ui.currentLens}: {exchangeModeProfile.displayLabel ?? exchange.mode}
          </span>
          <span className="mt-1 block line-clamp-2 text-xs leading-5" style={{ color: theme.textMuted }}>{preview}</span>
        </span>
        <span className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}>
          {expanded ? "Hide" : "Read"}
        </span>
      </button>
      {expanded ? (
        <div className="border-t p-3" style={{ borderColor: theme.borderLight }}>
          {exchange.question ? (
            <p className="rounded-md p-3 text-sm leading-6" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>{cleanDisplayText(exchange.question.text)}</p>
          ) : null}
          <div className="mt-3">
            <ScriptureLinkedText theme={theme} text={exchange.answer.text} onScriptureOpen={onScriptureOpen} />
          </div>
          <ScriptureChips theme={theme} sources={exchange.answer.sources} preferences={preferences} onScriptureOpen={onScriptureOpen} />
          {exchange.question ? (
            <button
              type="button"
              onClick={onContinue}
              className="mt-3 h-11 rounded-md border px-3 text-xs font-semibold transition"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
            >
              Continue from this
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function DecisionCompanionPanel({
  language,
  mode,
  modeProfile,
  decisions,
  focusedDecisionId,
  events,
  insight,
  counselContacts,
  counselSummaryDraft,
  setCounselSummaryDraft,
  announceWorkflow,
  ts,
  rules,
  title,
  pressure,
  emotion,
  focusIntentions,
  counselName,
  counselRole,
  counselAvatarUrl,
  counselContactValue,
  counselCanViewSummaries,
  counselCanComment,
  counselCanReceiveCheckins,
  latestCounselInvite,
  userSignedIn,
  ruleText,
  setTitle,
  setPressure,
  setEmotion,
  setCounselName,
  setCounselRole,
  setCounselAvatarUrl,
  setCounselContactValue,
  setCounselCanViewSummaries,
  setCounselCanComment,
  setCounselCanReceiveCheckins,
  setRuleText,
  onCreateDecision,
  onUpdateDecision,
  onDeleteDecision,
  onAddCounsel,
  onShareCounselInvite,
  onShareDecisionWithCounsel,
  onBulkShareDecisionsWithCounsel,
  onRemoveCounselContact,
  onSpeakText,
  onShareDecisionPostcard,
  isSpeaking,
  onAddRule,
  onScriptureOpen,
  theme,
}: {
  language: LanguageCode;
  mode: Mode;
  modeProfile: DisplayModeProfile;
  decisions: WisdomDecision[];
  focusedDecisionId: string | null;
  events: DecisionEvent[];
  insight: TimelineInsight;
  counselContacts: CounselContact[];
  counselSummaryDraft: CounselSummaryDraft | null;
  setCounselSummaryDraft: (value: CounselSummaryDraft | null) => void;
  announceWorkflow: (title: string, body: string, tone?: WorkflowTone, action?: { label: string; onClick: () => void }) => void;
  ts: (key: string, fallback?: string) => string;
  rules: RuleOfLife[];
  title: string;
  pressure: string;
  emotion: string;
  focusIntentions: string[];
  counselName: string;
  counselRole: string;
  counselAvatarUrl: string;
  counselContactValue: string;
  counselCanViewSummaries: boolean;
  counselCanComment: boolean;
  counselCanReceiveCheckins: boolean;
  latestCounselInvite: { name: string; url: string } | null;
  userSignedIn: boolean;
  ruleText: string;
  setTitle: (value: string) => void;
  setPressure: (value: string) => void;
  setEmotion: (value: string) => void;
  setCounselName: (value: string) => void;
  setCounselRole: (value: string) => void;
  setCounselAvatarUrl: (value: string) => void;
  setCounselContactValue: (value: string) => void;
  setCounselCanViewSummaries: (value: boolean) => void;
  setCounselCanComment: (value: boolean) => void;
  setCounselCanReceiveCheckins: (value: boolean) => void;
  setRuleText: (value: string) => void;
  onCreateDecision: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateDecision: (
    id: string,
    patch: Partial<WisdomDecision> & {
      waitingDays?: number | null;
      revisitDays?: number | null;
      outcomeReviewDays?: number | null;
      event?: string;
    }
  ) => void;
  onDeleteDecision: (id: string) => void;
  onAddCounsel: (event: FormEvent<HTMLFormElement>) => void;
  onShareCounselInvite: (channel?: ShareChannel) => void;
  onShareDecisionWithCounsel: (contactId: string, decisionId: string) => void;
  onBulkShareDecisionsWithCounsel: (contactId: string, decisionIds: string[]) => void;
  onRemoveCounselContact: (contactId: string) => void;
  onSpeakText: (text: string, notice?: string, label?: string) => void;
  onShareDecisionPostcard: (decision: WisdomDecision, kind: "summary" | "blessing", text?: string) => void;
  isSpeaking: boolean;
  onAddRule: (event: FormEvent<HTMLFormElement>) => void;
  onScriptureOpen: (scripture: string) => void;
  theme: ThemeColors;
}) {
  const runtime = runtimeCopyFor(language);
  const [counselAvatarStatus, setCounselAvatarStatus] = useState("");
  const [counselAvatarPickerOpen, setCounselAvatarPickerOpen] = useState(false);
  const counselAvatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const activeDecisions = decisions.filter((decision) => decision.status !== "closed");
  const selectedDecision = decisions[0];
  const [blessingOpen, setBlessingOpen] = useState(false);
  const [decisionSection, setDecisionSection] = useState<"decisions" | "counsel" | "rhythm" | "memory">("decisions");
  const modeRules = rules.filter((rule) => rule.mode === mode);
  const selectedDecisionBlessing = selectedDecision ? buildDecisionBlessing(selectedDecision, ts) : "";
  const decisionNextTitle = selectedDecision ? formatNextDecisionTitle(selectedDecision.title) : runtime.decisionNextTitleDefault;
  const decisionFocusPrompt = focusIntentionPrompt(focusIntentions, "decisions");
  const decisionNextBody = selectedDecision
    ? runtime.decisionNextBodyActive
    : runtime.decisionNextBodyEmpty;
  const decisionNextBodyWithFocus = decisionFocusPrompt
    ? `${decisionNextBody} ${decisionFocusPrompt}`
    : decisionNextBody;
  const visibleCounselContacts = counselContacts.slice(0, 3);
  const hiddenCounselContacts = counselContacts.slice(3);

  async function optimizeCounselAvatarFile(file: File): Promise<string> {
    const imageBitmap = await createImageBitmap(file);
    const maxSize = 512;
    const scale = Math.min(1, maxSize / Math.max(imageBitmap.width, imageBitmap.height));
    const width = Math.max(1, Math.round(imageBitmap.width * scale));
    const height = Math.max(1, Math.round(imageBitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Image processing failed.");
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(imageBitmap, 0, 0, width, height);
    imageBitmap.close();

    const dataUrl = canvas.toDataURL("image/webp", 0.86);
    const normalized = normalizeAvatarUrl(dataUrl);
    if (!normalized) {
      throw new Error("The selected image is too large after optimization.");
    }
    return normalized;
  }

  async function onCounselAvatarFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const acceptedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!acceptedTypes.has(file.type)) {
      setCounselAvatarStatus("Use PNG, JPEG, or WEBP images.");
      event.target.value = "";
      return;
    }
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setCounselAvatarStatus("Choose an image smaller than 10MB.");
      event.target.value = "";
      return;
    }

    try {
      const optimized = await optimizeCounselAvatarFile(file);
      setCounselAvatarUrl(optimized);
      setCounselAvatarStatus("Photo selected for this counsel contact.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not process this image.";
      setCounselAvatarStatus(message);
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <ContextualNextAction
        eyebrow={runtime.nextInDecisions}
        title={decisionNextTitle}
        body={decisionNextBodyWithFocus}
        theme={theme}
      />
      <section className="space-y-4">
        <section className="rounded-xl border p-4 shadow-sm sm:p-5" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.decisionCompanion', 'Decision Companion')}</p>
              <h2 className="mt-2 text-2xl font-semibold" style={{ color: theme.textPrimary }}>{runtime.decisionCompanionHeading}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: theme.textSecondary }}>
                {runtime.decisionCompanionSub}
              </p>
            </div>
            <span className="w-fit rounded-md px-3 py-2 text-xs font-semibold" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}>{modeProfile.displayLabel ?? modeProfile.label}</span>
          </div>

          <form onSubmit={onCreateDecision} className="mt-5 grid gap-3 xl:grid-cols-[1fr_1.2fr_auto]">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="min-h-11 rounded-lg border px-3 py-2 text-sm outline-none md:min-h-12 md:px-4 md:text-base"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              placeholder={ts('placeholders.decisionTitle', 'Decision title')}
            />
            <input
              value={pressure}
              onChange={(event) => setPressure(event.target.value)}
              className="min-h-11 rounded-lg border px-3 py-2 text-sm outline-none md:min-h-12 md:px-4 md:text-base"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              placeholder={ts('placeholders.decisionPressure', 'What pressure, fear, or hope is attached?')}
            />
            <select
              value={emotion}
              onChange={(event) => setEmotion(event.target.value)}
              className="min-h-11 rounded-lg border px-3 py-2 text-sm outline-none md:min-h-12 md:px-4 md:text-base"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              aria-label={ts('labels.initialEmotion', 'Initial emotion')}
            >
              <option value="uncertain">{ts('emotion.uncertain', 'uncertain')}</option>
              <option value="anxious">{ts('emotion.anxious', 'anxious')}</option>
              <option value="excited">{ts('emotion.excited', 'excited')}</option>
              <option value="pressured">{ts('emotion.pressured', 'pressured')}</option>
              <option value="peaceful">{ts('emotion.peaceful', 'peaceful')}</option>
            </select>
            <button className="h-11 rounded-lg px-4 text-sm font-semibold lg:col-span-full" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
              {ts('labels.startDecisionMemory', 'Start decision memory')}
            </button>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <TimelineStat icon={Clock3} label={ts('labels.activeDecisions', 'Active decisions')} value={String(activeDecisions.length)} theme={theme} />
          <TimelineStat icon={Sparkles} label={ts('labels.daysDiscerning', 'Days discerning')} value={String(insight.daysDiscerning)} theme={theme} />
          <TimelineStat icon={ShieldCheck} label={ts('labels.patternsNoticed', 'Patterns noticed')} value={String(insight.patterns.length)} theme={theme} />
        </section>

        <ScreenTabs
          value={decisionSection}
          onChange={setDecisionSection}
          ariaLabel={ts('labels.decisionSections', 'Decision sections')}
          theme={theme}
          tabs={[
            { key: "decisions", label: "Decisions" },
            { key: "counsel", label: "Counsel" },
            { key: "rhythm", label: "Rhythm" },
            { key: "memory", label: "Memory" },
          ]}
        />

        {decisionSection === "decisions" ? (
          <div className="space-y-4">
            <DisclosureSection title={ts('labels.wisdomTimeline', 'Wisdom timeline')} summary={events.length ? insight.gentleObservation : runtime.timelineReady} eyebrow={`${events.length} ${ts('labels.eventsRecorded', 'events recorded')}`} compactCollapsed showDetailsLabel={ts('showDetails', 'Show details')} hideDetailsLabel={ts('hideDetails', 'Hide details')} theme={theme}>
              <section className="rounded-xl border p-4 shadow-sm sm:p-5" style={{ backgroundColor: theme.primary, borderColor: theme.borderMedium, color: theme.textOnPrimary }}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textOnPrimary, opacity: 0.9 }}>{ts('labels.wisdomTimeline', 'Wisdom timeline')}</p>
                <p className="mt-3 text-sm leading-6" style={{ color: theme.textOnPrimary }}>{insight.gentleObservation}</p>
                <div className="mt-4 space-y-3">
                  {events.slice(0, 5).map((event) => (
                    <div key={event.id} className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
                      <p className="text-sm leading-6" style={{ color: theme.textPrimary }}>{event.body}</p>
                      <p className="mt-1 text-xs" style={{ color: theme.textSecondary }}>{new Date(event.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                  {!events.length ? <p className="text-sm leading-6" style={{ color: theme.textOnPrimary }}>{ts('labels.startDecisionToBeginTimeline', 'Start a decision to begin your wisdom timeline.')}</p> : null}
                </div>
              </section>
            </DisclosureSection>

            <DisclosureSection title={ts('labels.decisionArchiveReadiness', 'Decision archive and readiness details')} summary={decisions.length ? `${decisions.length} ${ts('labels.decisionsSavedOpenFullList', 'decisions saved. Open when you want the full list.')}` : ts('labels.noDecisionMemoryYet', 'No decision memory yet. Start one above when pressure needs time and counsel.')} eyebrow={ts('labels.decisionMemory', 'Decision memory')} defaultOpen={Boolean(focusedDecisionId) || (decisions.length > 0 && decisions.length < 2)} compactCollapsed showDetailsLabel={ts('showDetails', 'Show details')} hideDetailsLabel={ts('hideDetails', 'Hide details')} theme={theme}>
              <section className="space-y-3">
                {decisions.map((decision) => (
                  <DecisionCard key={decision.id} decision={decision} highlighted={decision.id === focusedDecisionId} modeProfile={localizedModeProfile(decision.mode, language)} modeLabel={ts(modeTranslationKey(decision.mode), decision.mode)} onUpdate={onUpdateDecision} onDelete={onDeleteDecision} theme={theme} ts={ts} />
                ))}
                {!decisions.length ? (
                  <div className="rounded-xl border border-dashed p-6 text-sm leading-6" style={{ borderColor: theme.borderMedium, color: theme.textSecondary }}>
                    {ts('labels.noDecisionMemoryHelp', 'No decision memory yet. Add the first decision above and Aletheia will track pressure, wisdom anchors, waiting, counsel, and learning.')}
                  </div>
                ) : null}
              </section>
            </DisclosureSection>
          </div>
        ) : null}

        {decisionSection === "counsel" ? (
          <DisclosureSection title={`${ts('labels.counselCircle', 'Counsel Circle')} · ${counselContacts.length} ${ts('labels.trustedVoices', 'trusted voices')}`} summary={ts('labels.counselCircleSummary', 'Private invites and sharing controls are explicit. No one sees chats, journals, or decisions unless shared.')} eyebrow={ts('labels.counsel', 'Counsel')} defaultOpen={Boolean(counselSummaryDraft)} compactCollapsed showDetailsLabel={ts('showDetails', 'Show details')} hideDetailsLabel={ts('hideDetails', 'Hide details')} theme={theme}>
            <section id="counsel-circle" className="scroll-mt-24">
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.counselCircle', 'Counsel Circle')}</p>
              <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                {ts('labels.inviteTrustedPeoplePrivate', 'Invite trusted people privately. They see only the decision summaries you choose to share.')}
              </p>
              {counselSummaryDraft ? (
                <div className="mt-3 rounded-lg border p-3" style={{ borderColor: theme.accentGold, backgroundColor: theme.bgCardElevated }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{ts('labels.summaryReady', 'Summary ready')}</p>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this counsel summary? This cannot be undone.')) {
                          setCounselSummaryDraft(null);
                          announceWorkflow(
                            ts('notifications.counselSummaryCleared'),
                            ts('notifications.counselSummaryClearedBody'),
                            "info"
                          );
                        }
                      }}
                      className="grid size-9 shrink-0 place-items-center rounded-md border-2 transition"
                      style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: '#cc4444' }}
                      aria-label="Delete counsel summary"
                      title="Delete summary"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p className="mt-2 text-sm font-semibold" style={{ color: theme.textPrimary }}>{counselSummaryDraft.title}</p>
                  <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border p-3 text-xs leading-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                    {counselSummaryDraft.body}
                  </pre>
                  <p className="mt-2 text-xs leading-5" style={{ color: theme.textSecondary }}>
                    {ts('labels.summaryPrivateUntilShared', 'This summary is private until you copy it or share a selected decision with someone in your Counsel Circle.')}
                  </p>
                </div>
              ) : null}
              <form onSubmit={onAddCounsel} className="mt-3 grid gap-2">
                <input
                  value={counselName}
                  onChange={(event) => setCounselName(event.target.value)}
                  className="min-h-11 rounded-md border px-3 py-2 text-sm outline-none md:min-h-12 md:px-4"
                  style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                  placeholder={ts('placeholders.name', 'Name')}
                />
                <input
                  ref={counselAvatarFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={onCounselAvatarFileSelected}
                />
                <div className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
                  <div className="flex items-center gap-3">
                    <AvatarCircle
                      avatarUrl={counselAvatarUrl || null}
                      seed={counselName || counselContactValue || "counsel-contact"}
                      label={counselName || "Counsel contact"}
                      size={34}
                      className="size-[34px] rounded-full border object-cover"
                    />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>
                        Counsel photo
                      </p>
                      <p className="text-xs leading-5" style={{ color: theme.textSecondary }}>
                        Choose from gallery to personalize this contact.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => counselAvatarFileInputRef.current?.click()}
                      className="h-9 rounded-md border px-3 text-xs font-semibold"
                      style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                    >
                      Choose photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setCounselAvatarPickerOpen(true)}
                      className="h-9 rounded-md border px-3 text-xs font-semibold"
                      style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                    >
                      Pick fun avatar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCounselAvatarUrl("");
                        setCounselAvatarStatus("Using default avatar for this contact.");
                      }}
                      className="h-9 rounded-md border px-3 text-xs font-semibold"
                      style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                    >
                      Use default
                    </button>
                  </div>
                  {counselAvatarStatus ? (
                    <p className="mt-2 text-xs leading-5" style={{ color: theme.textSecondary }}>
                      {counselAvatarStatus}
                    </p>
                  ) : null}
                </div>
                <input
                  value={counselContactValue}
                  onChange={(event) => setCounselContactValue(event.target.value)}
                  className="h-10 rounded-md border px-3 text-sm outline-none"
                  style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                  placeholder={ts('placeholders.contactOptional', 'Email or phone, optional')}
                />
                <select
                  value={counselRole}
                  onChange={(event) => setCounselRole(event.target.value)}
                  className="h-10 rounded-md border px-3 text-sm outline-none"
                  style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                >
                  <option>spouse</option>
                  <option>mentor</option>
                  <option>pastor</option>
                  <option>advisor</option>
                  <option>friend</option>
                </select>
                <div className="space-y-2 rounded-lg border p-3 text-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
                  <PermissionToggle
                    checked={counselCanViewSummaries}
                    label={ts('labels.canViewSelectedDecisionSummaries', 'Can view selected decision summaries')}
                    onChange={setCounselCanViewSummaries}
                  />
                  <PermissionToggle
                    checked={counselCanComment}
                    label={ts('labels.canCommentOnSharedDecisions', 'Can comment on shared decisions')}
                    onChange={setCounselCanComment}
                  />
                  <PermissionToggle
                    checked={counselCanReceiveCheckins}
                    label={ts('labels.canReceiveWaitingModeCheckins', 'Can receive waiting-mode check-ins')}
                    onChange={setCounselCanReceiveCheckins}
                  />
                </div>
                <p className="rounded-lg border p-3 text-xs leading-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
                  {ts('labels.privateChatsNeverVisible', 'Private chats, journal entries, and unshared decisions are never visible to counselors by default.')}
                </p>
                <button className="h-10 rounded-md px-3 text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                  {userSignedIn ? ts('labels.createPrivateInvite', 'Create private invite') : ts('labels.addLocally', 'Add locally')}
                </button>
              </form>
              <AvatarPickerModal
                theme={theme}
                ts={ts}
                open={counselAvatarPickerOpen}
                title={ts('avatar.chooseCounselAvatar', 'Choose a counsel avatar')}
                subtitle={ts('avatar.chooseCounselAvatarBody', 'Pick a curated avatar for this contact, or use gallery upload.')}
                currentAvatar={counselAvatarUrl}
                onClose={() => setCounselAvatarPickerOpen(false)}
                onPick={(avatarSrc) => {
                  setCounselAvatarUrl(avatarSrc);
                  setCounselAvatarStatus(ts('avatar.counselAvatarSelected', 'Avatar selected for this counsel contact.'));
                  setCounselAvatarPickerOpen(false);
                }}
              />

              <DisclosureSection
                title={latestCounselInvite ? `${ts('labels.inviteReadyFor', 'Invite ready for')} ${latestCounselInvite.name}` : ts('labels.shareInvite', 'Share invite')}
                summary={latestCounselInvite ? ts('labels.privateChatsNeverVisible', 'Private chats, journal entries, and unshared decisions are never visible to counselors by default.') : ts('labels.counselCircleSummary', 'Private invites and sharing controls are explicit. No one sees chats, journals, or decisions unless shared.')}
                eyebrow={ts('labels.shareInvite', 'Share invite')}
                defaultOpen={Boolean(latestCounselInvite)}
                compactCollapsed
                showDetailsLabel={ts('showDetails', 'Show details')}
                hideDetailsLabel={ts('hideDetails', 'Hide details')}
                theme={theme}
              >
                {latestCounselInvite ? (
                  <div className="rounded-lg border p-3" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}>
                    <p className="break-all text-xs leading-5" style={{ color: theme.textSecondary }}>{latestCounselInvite.url}</p>
                    {counselContacts[0]?.name === latestCounselInvite.name && counselContacts[0]?.emailSent ? (
                      <p className="mt-2 rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: theme.bgCardElevated, color: theme.primary }}>
                        {ts('labels.emailSentPrivateLinkFallback', 'Email sent. The private link is also here as a fallback.')}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-md border px-3 py-2 text-xs font-semibold" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                        onClick={() => onShareCounselInvite("copy")}
                        type="button"
                      >
                        {ts('labels.copyLink', 'Copy link')}
                      </button>
                      <button
                        className="rounded-md px-3 py-2 text-xs font-semibold"
                        style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                        onClick={() => onShareCounselInvite("native")}
                        type="button"
                      >
                        {ts('labels.shareInvite', 'Share invite')}
                      </button>
                      <button
                        className="rounded-md border px-3 py-2 text-xs font-semibold"
                        style={{ borderColor: theme.borderMedium, color: theme.textPrimary }}
                        onClick={() => onShareCounselInvite("email")}
                        type="button"
                      >
                        {ts('labels.email', 'Email')}
                      </button>
                      <button
                        className="rounded-md border px-3 py-2 text-xs font-semibold"
                        style={{ borderColor: theme.borderMedium, color: theme.textPrimary }}
                        onClick={() => onShareCounselInvite("sms")}
                        type="button"
                      >
                        {ts('labels.sms', 'SMS')}
                      </button>
                      <button
                        className="rounded-md border px-3 py-2 text-xs font-semibold"
                        style={{ borderColor: theme.borderMedium, color: theme.textPrimary }}
                        onClick={() => onShareCounselInvite("whatsapp")}
                        type="button"
                      >
                        {ts('labels.whatsApp', 'WhatsApp')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-lg border p-3 text-sm leading-6" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
                    {ts('labels.privateChatsNeverVisible', 'Private chats, journal entries, and unshared decisions are never visible to counselors by default.')}
                  </p>
                )}
              </DisclosureSection>

              <DisclosureSection
                title={`${visibleCounselContacts.length} ${visibleCounselContacts.length === 1 ? ts('labels.trustedVoice', 'trusted voice') : ts('labels.trustedVoices', 'trusted voices')}`}
                summary={hiddenCounselContacts.length
                  ? `${hiddenCounselContacts.length} ${hiddenCounselContacts.length === 1 ? ts('labels.moreTrustedVoice', 'more trusted voice') : ts('labels.moreTrustedVoices', 'more trusted voices')} stay collapsed until you need them.`
                  : ts('labels.counselCircleSummary', 'Private invites and sharing controls are explicit. No one sees chats, journals, or decisions unless shared.')}
                eyebrow={ts('labels.trustedVoices', 'trusted voices')}
                defaultOpen={counselContacts.length > 0 && counselContacts.length <= 2}
                compactCollapsed
                showDetailsLabel={ts('showDetails', 'Show details')}
                hideDetailsLabel={ts('hideDetails', 'Hide details')}
                theme={theme}
              >
                <div className="space-y-2">
                  {visibleCounselContacts.map((contact) => (
                  <div key={contact.id} className="rounded-lg border p-3" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AvatarCircle
                          avatarUrl={contact.avatarUrl}
                          seed={contact.id}
                          label={contact.name}
                          size={30}
                          className="size-[30px] rounded-full border object-cover"
                        />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{contact.name}</p>
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: theme.textMuted }}>
                            {contact.role} · {contact.inviteStatus === "accepted" ? ts('status.accepted', 'accepted') : contact.inviteStatus === "pending" ? ts('status.invited', 'invited') : ts('status.local', 'local')}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveCounselContact(contact.id)}
                        className="grid size-8 place-items-center rounded-md border transition"
                        style={{ borderColor: theme.borderMedium, color: theme.textMuted, backgroundColor: "transparent" }}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.backgroundColor = theme.bgInput;
                          event.currentTarget.style.borderColor = theme.borderStrong;
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.backgroundColor = "transparent";
                          event.currentTarget.style.borderColor = theme.borderMedium;
                        }}
                        aria-label={`${ts('labels.removeFromCounselCircle', 'Remove from Counsel Circle')}: ${contact.name}`}
                        title={ts('labels.removeFromCounselCircle', 'Remove from Counsel Circle')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em]" style={{ color: theme.textSecondary }}>
                      {contact.canViewSummaries ? <span className="rounded px-2 py-1" style={{ backgroundColor: theme.bgCardElevated }}>{ts('labels.summaries', 'summaries')}</span> : null}
                      {contact.canCommentOnDecisions ? <span className="rounded px-2 py-1" style={{ backgroundColor: theme.bgCardElevated }}>{ts('labels.comments', 'comments')}</span> : null}
                      {contact.canReceiveCheckins ? <span className="rounded px-2 py-1" style={{ backgroundColor: theme.bgCardElevated }}>{ts('labels.checkIns', 'check-ins')}</span> : null}
                    </div>
                    <details className="mt-3 rounded-md border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
                      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>
                        {ts('labels.shareDecisions', 'Share decisions')}
                      </summary>
                      {contact.canViewSummaries && decisions.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold" style={{ color: theme.textSecondary }}>{ts('labels.shareDecisions', 'Share decisions:')}</p>
                          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
                            {decisions.map((decision) => (
                              <button
                                key={decision.id}
                                type="button"
                                className="flex w-full items-start gap-2 rounded border px-2 py-2 text-left text-xs transition"
                                style={{
                                  borderColor: theme.borderMedium,
                                  backgroundColor: theme.bgCard,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = theme.primary;
                                  e.currentTarget.style.backgroundColor = theme.bgCardElevated;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = theme.borderMedium;
                                  e.currentTarget.style.backgroundColor = theme.bgCard;
                                }}
                                onClick={() => onShareDecisionWithCounsel(contact.id, decision.id)}
                              >
                                <span className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-semibold" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                                  {isMode(decision.mode) ? ts(modeTranslationKey(decision.mode), decision.mode) : decision.mode}
                                </span>
                                <span className="min-w-0 flex-1 break-words font-medium leading-5" style={{ color: theme.textPrimary }}>{decision.title}</span>
                              </button>
                            ))}
                          </div>
                          {decisions.length > 1 ? (
                            <button
                              type="button"
                              className="w-full rounded-md px-3 py-2 text-xs font-semibold transition"
                              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                              onClick={() => onBulkShareDecisionsWithCounsel(contact.id, decisions.map((d) => d.id))}
                            >
                              {ts('labels.shareAllDecisions', 'Share all decisions')} ({decisions.length})
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs leading-5" style={{ color: theme.textSecondary }}>
                          {ts('labels.noSharedDecisionsYet', 'No shared decisions yet.')}
                        </p>
                      )}
                    </details>
                  </div>
                  ))}
                  {hiddenCounselContacts.length ? (
                    <DisclosureSection
                      title={`${hiddenCounselContacts.length} ${hiddenCounselContacts.length === 1 ? ts('labels.moreTrustedVoice', 'more trusted voice') : ts('labels.moreTrustedVoices', 'more trusted voices')}`}
                      summary={ts('labels.counselCircleSummary', 'Private invites and sharing controls are explicit. No one sees chats, journals, or decisions unless shared.')}
                      eyebrow={ts('labels.moreCounselOptions', 'More counsel options')}
                      compactCollapsed
                      showDetailsLabel={ts('showDetails', 'Show details')}
                      hideDetailsLabel={ts('hideDetails', 'Hide details')}
                      theme={theme}
                    >
                      <div className="space-y-2">
                        {hiddenCounselContacts.map((contact) => (
                          <div key={contact.id} className="rounded-lg border p-3" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <AvatarCircle
                                  avatarUrl={contact.avatarUrl}
                                  seed={contact.id}
                                  label={contact.name}
                                  size={30}
                                  className="size-[30px] rounded-full border object-cover"
                                />
                                <div>
                                  <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{contact.name}</p>
                                  <p className="text-xs uppercase tracking-[0.12em]" style={{ color: theme.textMuted }}>
                                    {contact.role} · {contact.inviteStatus === "accepted" ? ts('status.accepted', 'accepted') : contact.inviteStatus === "pending" ? ts('status.invited', 'invited') : ts('status.local', 'local')}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => onRemoveCounselContact(contact.id)}
                                className="grid size-8 place-items-center rounded-md border transition"
                                style={{ borderColor: theme.borderMedium, color: theme.textMuted, backgroundColor: "transparent" }}
                                onMouseEnter={(event) => {
                                  event.currentTarget.style.backgroundColor = theme.bgInput;
                                  event.currentTarget.style.borderColor = theme.borderStrong;
                                }}
                                onMouseLeave={(event) => {
                                  event.currentTarget.style.backgroundColor = "transparent";
                                  event.currentTarget.style.borderColor = theme.borderMedium;
                                }}
                                aria-label={`${ts('labels.removeFromCounselCircle', 'Remove from Counsel Circle')}: ${contact.name}`}
                                title={ts('labels.removeFromCounselCircle', 'Remove from Counsel Circle')}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </DisclosureSection>
                  ) : null}
                  {!counselContacts.length ? (
                    <p className="rounded-lg border border-dashed p-3 text-sm leading-6" style={{ borderColor: theme.borderMedium, color: theme.textSecondary }}>
                      {ts('labels.addTrustedPersonBeforeHighStakes', 'Add one trusted person before the next high-stakes decision.')}
                    </p>
                  ) : null}
                </div>
              </DisclosureSection>
            </section>
          </DisclosureSection>
        ) : null}

        {decisionSection === "rhythm" ? (
          <div className="space-y-4">
            <DisclosureSection title={ts('labels.formationRhythm', 'Formation rhythm')} summary={ts('labels.formationRhythmSummary', 'Morning reflection, evening examen, and weekly pattern review stay available without dominating the decision page.')} eyebrow={ts('labels.rhythm', 'Rhythm')} compactCollapsed showDetailsLabel={ts('showDetails', 'Show details')} hideDetailsLabel={ts('hideDetails', 'Hide details')} theme={theme}>
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.formationRhythm', 'Formation rhythm')}</p>
                <div className="mt-3 grid gap-2">
                  <RhythmItem label={ts('labels.threeMinuteMorningReflection', '3-minute morning reflection')} body={ts('labels.namePressureBeforeDayNamesIt', 'Name the pressure before the day names it for you.')} theme={theme} />
                  <RhythmItem label={ts('labels.eveningExamen', 'Evening examen')} body={ts('labels.reviewMoneyWorkMomentHonestly', 'Review one money or work moment with honesty, not shame.')} theme={theme} />
                  <RhythmItem label={ts('labels.weeklyPatternReview', 'Weekly pattern review')} body={ts('labels.noticeRepeatedUrgencyComparison', 'Notice repeated urgency, comparison, fear, or overgiving.')} theme={theme} />
                </div>
              </section>
            </DisclosureSection>

            <DisclosureSection title={`${runtime.ruleOfLife} · ${modeRules.length} ${modeRules.length === 1 ? runtime.ruleOfLifePrincipleSingular : runtime.ruleOfLifePrinciplePlural}`} summary={runtime.ruleOfLifeSummary} eyebrow={runtime.ruleOfLife} compactCollapsed showDetailsLabel={ts('showDetails', 'Show details')} hideDetailsLabel={ts('hideDetails', 'Hide details')} theme={theme}>
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{runtime.ruleOfLife}</p>
                <form onSubmit={onAddRule} className="mt-3 grid gap-2">
                  <textarea
                    value={ruleText}
                    onChange={(event) => setRuleText(event.target.value)}
                    className="min-h-20 resize-none rounded-md border px-3 py-2 text-sm leading-6 outline-none"
                    style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                    placeholder={ts('placeholders.ruleExample', 'I do not make career decisions without counsel.')}
                  />
                  <button className="h-10 rounded-md px-3 text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>{ts('labels.savePrinciple', 'Save principle')}</button>
                </form>
                <div className="mt-3 space-y-2">
                  {modeRules.slice(0, 4).map((rule) => (
                    <p key={rule.id} className="rounded-lg border p-3 text-sm leading-6" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated, color: theme.textSecondary }}>
                      {rule.principle}
                    </p>
                  ))}
                  {!modeRules.length ? (
                    <p className="rounded-lg border border-dashed p-3 text-sm leading-6" style={{ borderColor: theme.borderMedium, color: theme.textSecondary }}>
                      Write one principle you want to live by before pressure arrives.
                    </p>
                  ) : null}
                </div>
              </section>
            </DisclosureSection>

            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.scriptureIntegrity', 'Scripture integrity')}</p>
              <ul className="mt-3 space-y-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                <li>{ts('labels.referencesFromCuratedLibrary', 'References come from the curated wisdom library.')}</li>
                <li>{ts('labels.noFinancialOutcomesOrPredictions', 'No financial outcomes or divine predictions.')}</li>
                <li>{ts('labels.prosperityFramingRefused', 'Prosperity-gospel framing is refused.')}</li>
                <li>{ts('labels.highStakesPointedToCounsel', 'High-stakes choices are pointed toward qualified counsel.')}</li>
              </ul>
            </section>
          </div>
        ) : null}

        {decisionSection === "memory" ? (
          <div className="space-y-4">
            <section className="rounded-xl border p-4 shadow-sm" style={{ backgroundColor: theme.primary, borderColor: theme.borderMedium, color: theme.textOnPrimary }}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textOnPrimary, opacity: 0.9 }}>{ts('labels.decisionPractice', 'Decision practice')}</p>
              <p className="mt-3 text-sm font-semibold" style={{ color: theme.textOnPrimary }}>{runtime.decisionPracticeLine}</p>
              <p className="mt-2 text-sm leading-6" style={{ color: theme.textOnPrimary }}>{ts('labels.smallPracticeForDecision', 'A small practice for the decision you are carrying, shaped by the active wisdom mode.')}</p>
            </section>

            {selectedDecision?.summary ? (
              <section className="rounded-xl border p-4 shadow-sm" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.decisionSummaryExport', 'Decision Summary Export')}</p>
                  <button
                    type="button"
                    onClick={() => onSpeakText(selectedDecision.summary || "", "Aletheia is reading the decision summary aloud.", "Decision summary")}
                    className="inline-flex h-11 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition"
                    style={{
                      borderColor: theme.borderMedium,
                      backgroundColor: theme.bgInput,
                      color: theme.textPrimary,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bgCardElevated}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.bgInput}
                  >
                    <Volume2 size={14} style={{ color: isSpeaking ? theme.accentGold : 'inherit' }} />
                    {isSpeaking ? ts('labels.stop', 'Stop') : ts('labels.readAloud', 'Read aloud')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onShareDecisionPostcard(selectedDecision, "summary")}
                    className="inline-flex h-11 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition"
                    style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                  >
                    <Share2 size={14} />
                    {ts('labels.createCard', 'Create card')}
                  </button>
                </div>
                <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                  {ts('labels.mentorReadySummaryReviewBeforeSharing', 'Mentor-ready summary with decision, pressure, wisdom anchors, risks, counsel questions, and next faithful step. Review it before sharing.')}
                </p>
                <div className="mt-3 max-h-80 min-h-40 overflow-y-auto rounded-md border p-3" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput }}>
                  <ScriptureLinkedText theme={theme} text={selectedDecision.summary} onScriptureOpen={onScriptureOpen} />
                </div>
                <div className="mt-3 rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
                  <button
                    type="button"
                    onClick={() => setBlessingOpen((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold"
                    style={{ color: theme.textPrimary }}
                  >
                    <span>{ts('labels.decisionBlessing', 'Decision blessing / prayer draft')}</span>
                    <span className="text-xs" style={{ color: theme.textSecondary }}>{blessingOpen ? ts('hideDetails', 'Hide details') : ts('showDetails', 'Show details')}</span>
                  </button>
                  {blessingOpen ? (
                    <div className="mt-3">
                      <p className="whitespace-pre-wrap text-sm leading-6" style={{ color: theme.textSecondary }}>{selectedDecisionBlessing}</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => onSpeakText(selectedDecisionBlessing, ts('notifications.decisionBlessingReading', 'Aletheia is reading the decision blessing.'), ts('labels.decisionBlessing', 'Decision blessing'))}
                          className="premium-tap-card inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold"
                          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                        >
                          <Volume2 size={14} />
                          {ts('labels.readAloud', 'Read aloud')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onShareDecisionPostcard(selectedDecision, "blessing", selectedDecisionBlessing)}
                          className="premium-tap-card inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-xs font-semibold"
                          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                        >
                          <Share2 size={14} />
                          {ts('labels.createCard', 'Create card')}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function TimelineStat({ icon: Icon, label, value, theme }: { icon: typeof Clock3; label: string; value: string; theme: ThemeColors }) {
  return (
    <div className="rounded-xl border p-4 shadow-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{label}</p>
        <Icon size={17} style={{ color: theme.textSecondary }} />
      </div>
      <p className="mt-3 text-3xl font-semibold" style={{ color: theme.textPrimary }}>{value}</p>
    </div>
  );
}

function PermissionToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 rounded border-[#9fb0a6]"
      />
      <span>{label}</span>
    </label>
  );
}

function DecisionCard({
  decision,
  highlighted = false,
  modeProfile,
  modeLabel,
  onUpdate,
  onDelete,
  theme,
  ts,
}: {
  decision: WisdomDecision;
  highlighted?: boolean;
  modeProfile: ModeProfile;
  modeLabel: string;
  onUpdate: (
    id: string,
    patch: Partial<WisdomDecision> & {
      waitingDays?: number | null;
      revisitDays?: number | null;
      outcomeReviewDays?: number | null;
      event?: string;
    }
  ) => void;
  onDelete: (id: string) => void;
  theme: ThemeColors;
  ts: (key: string, fallback?: string) => string;
}) {
  const [noteDraft, setNoteDraft] = useState("");
  const [finalDecisionDraft, setFinalDecisionDraft] = useState(decision.finalDecision ?? "");
  const [learningDraft, setLearningDraft] = useState(decision.learning ?? "");
  const waiting = decision.waitingUntil ? new Date(decision.waitingUntil) : null;
  const revisit = decision.revisitAt ? new Date(decision.revisitAt) : null;
  const outcomeReview = decision.outcomeReviewAt ? new Date(decision.outcomeReviewAt) : null;
  const waitingText = waiting ? `Waiting until ${waiting.toLocaleDateString()}` : null;
  const revisitText = revisit ? `Revisit ${revisit.toLocaleDateString()}` : null;
  const outcomeText = outcomeReview ? `Outcome review ${outcomeReview.toLocaleDateString()}` : null;
  const [detailsOpen, setDetailsOpen] = useState(highlighted);
  const isDetailsOpen = highlighted || detailsOpen;

  return (
    <article
      id={`decision-card-${decision.id}`}
      tabIndex={-1}
      className="rounded-xl border p-4 shadow-sm outline-none sm:p-5"
      style={{
        borderColor: highlighted ? theme.accentGold : theme.borderLight,
        backgroundColor: highlighted ? theme.bgCardElevated : theme.bgCard,
        boxShadow: highlighted ? `0 0 0 2px ${theme.accentGold}33` : undefined,
      }}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}>{modeLabel}</span>
            <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: theme.bgCardElevated, color: theme.accentGold }}>{decision.status}</span>
            {waitingText ? <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: theme.bgCardElevated, color: theme.accentGold }}>{waitingText}</span> : null}
            {revisitText ? <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: theme.bgInput, color: theme.primary }}>{revisitText}</span> : null}
            {outcomeText ? <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}>{outcomeText}</span> : null}
          </div>
          <h3 className="mt-3 text-xl font-semibold" style={{ color: theme.textPrimary }}>{decision.title}</h3>
          <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>{decision.pressure}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <div className="min-w-28 rounded-lg border p-3 text-center" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textSecondary }}>{ts('labels.readiness', 'Readiness')}</p>
            <p className="mt-1 text-2xl font-semibold" style={{ color: theme.textPrimary }}>{decision.readiness}%</p>
          </div>
          <button
            type="button"
            onClick={() => onDelete(decision.id)}
            className="grid size-11 shrink-0 place-items-center self-start rounded-lg border-2 transition"
            style={{
              borderColor: theme.borderMedium,
              backgroundColor: theme.bgCard,
              color: '#cc4444',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#cc4444';
              e.currentTarget.style.backgroundColor = '#fff5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = theme.borderMedium;
              e.currentTarget.style.backgroundColor = theme.bgCard;
            }}
            aria-label={ts('labels.deleteDecision', 'Delete decision')}
            title={ts('labels.deleteThisDecision', 'Delete this decision')}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <DecisionToggle active={decision.counselSought} label={ts('labels.counsel', 'Counsel')} onClick={() => onUpdate(decision.id, { counselSought: !decision.counselSought, event: "Counsel status changed." })} theme={theme} />
        <DecisionToggle active={decision.costCounted} label={ts('labels.cost', 'Cost')} onClick={() => onUpdate(decision.id, { costCounted: !decision.costCounted, event: "Cost counting updated." })} theme={theme} />
        <DecisionToggle active={decision.alignmentClear} label={ts('labels.values', 'Values')} onClick={() => onUpdate(decision.id, { alignmentClear: !decision.alignmentClear, event: "Values alignment updated." })} theme={theme} />
        <DecisionToggle active={decision.reversibleStep} label={ts('labels.reversible', 'Reversible')} onClick={() => onUpdate(decision.id, { reversibleStep: !decision.reversibleStep, event: "Reversibility updated." })} theme={theme} />
        <DecisionToggle active={decision.peaceOverUrgency} label={ts('labels.peace', 'Peace')} onClick={() => onUpdate(decision.id, { peaceOverUrgency: !decision.peaceOverUrgency, event: "Peace over urgency updated." })} theme={theme} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm leading-6" style={{ color: theme.textSecondary }}>{modeProfile.diagnosticTracks[0]}</p>
        <button
          type="button"
          onClick={() => setDetailsOpen((value) => !value)}
          className="rounded-md border px-3 py-2 text-xs font-semibold transition"
          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
        >
          {isDetailsOpen ? ts('hideDetails', 'Hide details') : ts('showDetails', 'Show details')}
        </button>
      </div>

      {isDetailsOpen ? (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex flex-wrap gap-2">
              {[1, 3, 7, 30].map((days) => (
                <button key={days} type="button" onClick={() => onUpdate(decision.id, { waitingDays: days })} className="rounded-md border px-3 py-2 text-xs font-semibold" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}>
                  {ts('labels.waitDays', 'Wait')} {days}d
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to close this decision? You can still view it in the timeline, but it will no longer appear in active decisions.')) {
                    onUpdate(decision.id, { status: "closed", event: "Decision closed with learning recorded." });
                  }
                }}
                className="rounded-md px-3 py-2 text-xs font-semibold"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                {ts('labels.close', 'Close')}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
              <label className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>
                {ts('labels.whatChanged', 'What changed?')}
              </label>
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                className="mt-2 min-h-20 w-full resize-none rounded-md border p-3 text-sm leading-6 outline-none"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                placeholder={ts('placeholders.costExample', 'Prayer, counsel, facts, time, or emotion shifted how you see the decision')}
              />
              <button
                type="button"
                onClick={() => {
                  if (!noteDraft.trim()) return;
                  onUpdate(decision.id, { event: noteDraft.trim() });
                  setNoteDraft("");
                }}
                className="mt-2 h-11 rounded-md border px-3 text-xs font-semibold"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              >
                {ts('labels.addTimelineNote', 'Add timeline note')}
              </button>
            </div>

            <div className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
              <label className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>
                {ts('labels.outcomeAndLearning', 'Outcome and learning')}
              </label>
              <input
                value={finalDecisionDraft}
                onChange={(event) => setFinalDecisionDraft(event.target.value)}
                className="mt-2 h-10 w-full rounded-md border px-3 text-sm outline-none"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                placeholder={ts('placeholders.finalDecision', 'Final decision')}
              />
              <textarea
                value={learningDraft}
                onChange={(event) => setLearningDraft(event.target.value)}
                className="mt-2 min-h-16 w-full resize-none rounded-md border p-3 text-sm leading-6 outline-none"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                placeholder={ts('placeholders.learningQuestion', 'What did you learn?')}
              />
              <button
                type="button"
                onClick={() =>
                  onUpdate(decision.id, {
                    finalDecision: finalDecisionDraft,
                    learning: learningDraft,
                    status: "closed",
                    event: "Recorded final decision and learning.",
                  })
                }
                className="mt-2 h-11 rounded-md px-3 text-xs font-semibold"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                {ts('labels.saveOutcome', 'Save outcome')}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>{ts('labels.revisitRhythm', 'Revisit rhythm')}</p>
            <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
              {ts('labels.wisdomGetsClearerWithTime', 'Wisdom often gets clearer after facts, counsel, prayer, and time. Schedule a light review point without turning it into pressure.')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => onUpdate(decision.id, { revisitDays: days })}
                  className="rounded-md border px-3 py-2 text-xs font-semibold transition"
                  style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bgCardElevated}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.bgInput}
                >
                  {ts('labels.revisitIn', 'Revisit in')} {days}d
                </button>
              ))}
              {[7, 30, 90].map((days) => (
                <button
                  key={`outcome-${days}`}
                  type="button"
                  onClick={() => onUpdate(decision.id, { outcomeReviewDays: days })}
                  className="rounded-md border px-3 py-2 text-xs font-semibold transition"
                  style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bgCardElevated}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.bgInput}
                >
                  {ts('labels.outcomeDays', 'Outcome')} {days}d
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </article>
  );
}

function DecisionToggle({ active, label, onClick, theme }: { active: boolean; label: string; onClick: () => void; theme: ThemeColors }) {
  return (
    <button
      onClick={onClick}
      className="h-full w-full rounded-lg border px-3 py-2 text-sm font-semibold transition"
      style={{
        borderColor: active ? theme.primary : theme.borderMedium,
        backgroundColor: active ? theme.bgCardElevated : theme.bgInput,
        color: active ? theme.primary : theme.textSecondary,
      }}
    >
      {label}
    </button>
  );
}

function WisdomCheck({
  decision,
  setDecision,
  emotion,
  setEmotion,
  timeframe,
  setTimeframe,
  result,
  mode,
  modeProfile,
  ts,
  theme,
}: {
  decision: string;
  setDecision: (value: string) => void;
  emotion: string;
  setEmotion: (value: string) => void;
  timeframe: string;
  setTimeframe: (value: string) => void;
  result: { sources: WisdomEntry[]; readiness: number; hasUrgency: boolean; hasCounsel: boolean } | null;
  mode: Mode;
  modeProfile: DisplayModeProfile;
  ts: (key: string, fallback?: string) => string;
  theme: ThemeColors;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="min-w-0 rounded-xl border p-4 shadow-sm sm:p-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
        <div className="mb-5 flex items-center gap-2 text-xl font-semibold" style={{ color: theme.textPrimary }}>
          <Scale size={20} />
          Wisdom Check
        </div>
        <div className="mb-5 rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{modeProfile.displayLabel ?? modeProfile.label} · {ts('labels.discernmentReadout', 'Discernment readout')}</p>
          <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>{modeProfile.intent}</p>
        </div>
        <label className="text-sm font-semibold" htmlFor="decision" style={{ color: theme.textPrimary }}>
          Decision or pressure
        </label>
        <textarea
          id="decision"
          value={decision}
          onChange={(event) => setDecision(event.target.value)}
          className="mt-2 min-h-36 w-full resize-none rounded-lg border px-3 py-3 text-sm leading-6 outline-none"
          placeholder={ts('placeholders.journalExample', 'Example: I want to leave my job and start consulting, but I am worried about income stability.')}
          style={{
            borderColor: theme.borderMedium,
            backgroundColor: theme.bgInput,
            color: theme.textPrimary,
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = theme.primary}
          onBlur={(e) => e.currentTarget.style.borderColor = theme.borderMedium}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
            {ts('labels.currentEmotion', 'Current emotion')}
            <select value={emotion} onChange={(event) => setEmotion(event.target.value)} className="mt-2 h-11 w-full rounded-md border px-3 text-sm outline-none" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}>
              <option value="uncertain">{ts('emotion.uncertain', 'uncertain')}</option>
              <option value="anxious">{ts('emotion.anxious', 'anxious')}</option>
              <option value="excited">{ts('emotion.excited', 'excited')}</option>
              <option value="pressured">{ts('emotion.pressured', 'pressured')}</option>
              <option value="peaceful">{ts('emotion.peaceful', 'peaceful')}</option>
            </select>
          </label>
          <label className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
            {ts('labels.timeHorizon', 'Time horizon')}
            <select value={timeframe} onChange={(event) => setTimeframe(event.target.value)} className="mt-2 h-11 w-full rounded-md border px-3 text-sm outline-none" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}>
              <option value="Long-term">{ts('labels.longTerm', 'Long-term')}</option>
              <option value="Next 90 days">{ts('labels.next90Days', 'Next 90 days')}</option>
              <option value="This month">{ts('labels.thisMonth', 'This month')}</option>
              <option value="This week">{ts('labels.thisWeek', 'This week')}</option>
            </select>
          </label>
        </div>
      </section>

      <section className="min-w-0 rounded-xl border p-4 shadow-sm sm:p-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
        <h2 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.discernmentReadout', 'Discernment readout')}</h2>
        {result ? (
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm font-semibold" style={{ color: theme.textPrimary }}>
                <span>{ts('labels.readinessSignal', 'Readiness signal')}</span>
                <span>{result.readiness}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full" style={{ backgroundColor: theme.borderLight }}>
                <div className="h-full rounded-full" style={{ width: `${result.readiness}%`, backgroundColor: theme.primary }} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Signal active={!result.hasUrgency} label={ts('labels.paceIsCalmEnough', 'Pace is calm enough')} theme={theme} />
              <Signal
                active={result.hasCounsel}
                label={result.hasCounsel ? ts('labels.counselIsVisible', 'Counsel is visible') : ts('labels.counselStillNeeded', 'Counsel still needed')}
                theme={theme}
              />
            </div>
            <div className="rounded-lg border p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accentGold }}>{ts('labels.grounding', 'Grounding')}</p>
              <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                {result.sources[0]?.scripture}: {result.sources[0]?.principle}
              </p>
            </div>
            <div className="rounded-lg border p-4" style={{ backgroundColor: theme.primary, borderColor: theme.borderMedium, color: theme.textOnPrimary }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textOnPrimary, opacity: 0.9 }}>{mode} diagnostic</p>
              <ul className="mt-3 space-y-2 text-sm leading-6" style={{ color: theme.textOnPrimary }}>
                {modeProfile.diagnosticTracks.slice(0, 2).map((track) => (
                  <li key={track}>{track}</li>
                ))}
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accentGold }}>{ts('labels.watchFor', 'Watch for')}</p>
                <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>{modeProfile.blindSpots[0]}</p>
              </div>
              <div className="rounded-lg border p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accentGold }}>{ts('labels.practice', 'Practice')}</p>
                <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>{modeProfile.practices[0]}</p>
              </div>
            </div>
            <div className="rounded-lg border p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accentGold }}>{ts('labels.nextFaithfulAction', 'Next faithful action')}</p>
              <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
                {ts('labels.nextFaithfulActionBody', 'Name the smallest reversible step, show the plan to one wise person, and wait until the emotional pressure lowers before making an irreversible move.')}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed p-6 text-sm leading-6" style={{ borderColor: theme.borderMedium, color: theme.textSecondary }}>
            {ts('labels.writeDecisionForReadout', 'Write a decision on the left. Aletheia will turn it into a reflective readout grounded in the wisdom library.')}
          </div>
        )}
      </section>
    </div>
  );
}

function ReflectPanel({
  language,
  decision,
  setDecision,
  emotion,
  setEmotion,
  timeframe,
  setTimeframe,
  result,
  mode,
  modeProfile,
  ts,
  entries,
  gratitudeEntries,
  title,
  body,
  setTitle,
  setBody,
  onSave,
  onDelete,
  onSaveGratitude,
  onDeleteGratitude,
  onShareGratitudePostcard,
  onUseGratitudeAsReflection,
  onVoiceReflection,
  onShareReflectionPostcard,
  todayCompanionCard,
  theme,
}: {
  language: LanguageCode;
  decision: string;
  setDecision: (value: string) => void;
  emotion: string;
  setEmotion: (value: string) => void;
  timeframe: string;
  setTimeframe: (value: string) => void;
  result: { sources: WisdomEntry[]; readiness: number; hasUrgency: boolean; hasCounsel: boolean } | null;
  mode: Mode;
  modeProfile: ModeProfile;
  ts: (key: string, fallback?: string) => string;
  entries: JournalEntry[];
  gratitudeEntries: GratitudeEntry[];
  title: string;
  body: string;
  setTitle: (value: string) => void;
  setBody: (value: string) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
  onSaveGratitude: (file: File | null, note: string, place: string, visual?: GratitudeVisualSettings, formation?: GratitudeFormation) => void;
  onDeleteGratitude: (id: string) => void;
  onShareGratitudePostcard: (entry: GratitudeEntry) => void;
  onUseGratitudeAsReflection: (entry: GratitudeEntry) => void;
  onVoiceReflection: () => void;
  onShareReflectionPostcard: (entry: JournalEntry) => void;
  todayCompanionCard: TodayCompanionCard;
  theme: ThemeColors;
}) {
  const runtime = runtimeCopyFor(language);
  const reflectNextTitle = body.trim() || decision.trim() ? runtime.reflectNextTitleActive : runtime.reflectNextTitleDefault;
  const reflectNextBody = body.trim() || decision.trim()
    ? runtime.reflectNextBodyActive
    : runtime.reflectNextBodyDefault;
  const [reflectSection, setReflectSection] = useState<"check" | "gratitude" | "journal">("check");

  return (
    <div className="min-w-0 space-y-4">
      <ContextualNextAction
        eyebrow={runtime.nextInReflect}
        title={reflectNextTitle}
        body={reflectNextBody}
        actionLabel={body.trim() ? ts('labels.saveReflection', 'Save reflection') : undefined}
        onAction={body.trim() ? onSave : undefined}
        theme={theme}
      />
      <section className="rounded-xl border p-4 shadow-sm sm:p-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('nav.reflect', 'Reflect')}</p>
        <h2 className="mt-2 text-2xl font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.discernmentReflectionQuietPlace', 'Discernment and reflection in one quiet place')}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: theme.textSecondary }}>
          {runtime.reflectIntro}
        </p>
        <button
          type="button"
          onClick={onVoiceReflection}
          className="premium-tap-card mt-4 inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold"
          style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}
        >
          <Volume2 size={15} />
          {ts('labels.voiceReflectionMode', 'Voice Reflection Mode')}
        </button>
      </section>

      <ScreenTabs
        value={reflectSection}
        onChange={setReflectSection}
        ariaLabel={ts('labels.reflectSections', 'Reflect sections')}
        theme={theme}
        tabs={[
          { key: "check", label: ts('labels.wisdomCheck', 'Wisdom check') },
          { key: "gratitude", label: ts('labels.gratitudeLens', 'Gratitude') },
          { key: "journal", label: ts('labels.reflectionJournal', 'Journal') },
        ]}
      />

      {reflectSection === "check" ? (
        <DisclosureSection
          title={runtime.wisdomCheck}
          summary={result ? `${ts('labels.readiness', 'Readiness')} ${result.readiness}/100 · ${result.hasUrgency ? runtime.wisdomCheckUrgency : runtime.wisdomCheckSlower}` : runtime.wisdomCheckSummaryDefault}
          eyebrow={runtime.decisionScan}
          defaultOpen={Boolean(decision.trim())}
          showDetailsLabel={ts('showDetails', 'Show details')}
          hideDetailsLabel={ts('hideDetails', 'Hide details')}
          theme={theme}
        >
          <WisdomCheck
            decision={decision}
            setDecision={setDecision}
            emotion={emotion}
            setEmotion={setEmotion}
            timeframe={timeframe}
            setTimeframe={setTimeframe}
            result={result}
            mode={mode}
            modeProfile={modeProfile}
            ts={ts}
            theme={theme}
          />
        </DisclosureSection>
      ) : null}

      {reflectSection === "gratitude" ? (
        <GratitudeLensPanel
          entries={gratitudeEntries}
          language={language}
          ts={ts}
          theme={theme}
          onSave={onSaveGratitude}
          onDelete={onDeleteGratitude}
          onSharePostcard={onShareGratitudePostcard}
          onUseAsReflection={onUseGratitudeAsReflection}
          todayCompanionCard={todayCompanionCard}
        />
      ) : null}

      {reflectSection === "journal" ? (
        <JournalPanel
          entries={entries}
          title={title}
          body={body}
          language={language}
          mode={mode}
          setTitle={setTitle}
          setBody={setBody}
          onSave={onSave}
          onDelete={onDelete}
          onSharePostcard={onShareReflectionPostcard}
          onVoiceReflection={onVoiceReflection}
          ts={ts}
          theme={theme}
        />
      ) : null}
    </div>
  );
}

function Signal({ active, label, theme }: { active: boolean; label: string; theme: ThemeColors }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg border p-3 text-sm font-semibold"
      style={{
        borderColor: active ? theme.primary : theme.borderMedium,
        backgroundColor: active ? theme.bgCardElevated : theme.bgInput,
        color: active ? theme.textPrimary : theme.textSecondary,
      }}
    >
      <Check size={16} />
      {label}
    </div>
  );
}

function GratitudeLensPanel({
  entries,
  language,
  ts,
  theme,
  onSave,
  onDelete,
  onSharePostcard,
  onUseAsReflection,
  todayCompanionCard,
}: {
  entries: GratitudeEntry[];
  language: LanguageCode;
  ts: (key: string, fallback?: string) => string;
  theme: ThemeColors;
  onSave: (file: File | null, note: string, place: string, visual?: GratitudeVisualSettings, formation?: GratitudeFormation) => void | Promise<void>;
  onDelete: (id: string) => void;
  onSharePostcard: (entry: GratitudeEntry) => void;
  onUseAsReflection: (entry: GratitudeEntry) => void;
  todayCompanionCard: TodayCompanionCard;
}) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [note, setNote] = useState("");
  const [place, setPlace] = useState("");
  const [formation, setFormation] = useState<GratitudeFormation>(DEFAULT_GRATITUDE_FORMATION);
  const [visual, setVisual] = useState<GratitudeVisualSettings>(DEFAULT_GRATITUDE_VISUAL);
  const [isSaving, setIsSaving] = useState(false);
  const [weekStartTime] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setImageFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : "");
  };

  const resetForm = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setImageFile(null);
    setPreviewUrl("");
    setNote("");
    setPlace("");
    setFormation(DEFAULT_GRATITUDE_FORMATION);
    setVisual(DEFAULT_GRATITUDE_VISUAL);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const submit = async () => {
    if (!imageFile || !note.trim()) {
      await onSave(imageFile, note, place, visual, formation);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(imageFile, note, place, visual, formation);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleOverlay = (key: keyof Pick<GratitudeVisualSettings, "showDate" | "showPlace" | "showNote" | "showSignature">) => {
    setVisual((current) => ({ ...current, [key]: !current[key] }));
  };

  const toggleSticker = (sticker: GratitudeSticker) => {
    setVisual((current) => {
      const exists = current.stickers.includes(sticker);
      if (exists) {
        return { ...current, stickers: current.stickers.filter((item) => item !== sticker) };
      }
      return { ...current, stickers: [...current.stickers, sticker].slice(0, MAX_GRATITUDE_STICKERS) };
    });
  };

  const gratitudeFormationLabel = (value: GratitudeFormation) => ts(`labels.gratitudeFormation_${value}`, value);
  const gratitudeFormationPrompt = (value: GratitudeFormation) => ts(`labels.gratitudeFormationPrompt_${value}`, "What did this help you notice?");
  const gratitudeFilterLabel = (filter: GratitudeFilter) => ts(`labels.gratitudeFilter_${filter}`, filter);
  const gratitudeStickerLabel = (sticker: GratitudeSticker) => ts(`labels.gratitudeSticker_${sticker}`, GRATITUDE_STICKER_MARK[sticker]);
  const activeOverlayLabels = [
    visual.showNote ? ts('labels.gratitudeOverlayNote', 'Note') : "",
    visual.showDate ? ts('labels.gratitudeOverlayDate', 'Date') : "",
    visual.showPlace ? ts('labels.gratitudeOverlayPlace', 'Place') : "",
    visual.showSignature ? ts('labels.gratitudeOverlaySignature', 'Aletheia signature') : "",
  ].filter(Boolean);
  const activeStyleSummary = [
    gratitudeFilterLabel(visual.filter),
    activeOverlayLabels.length ? `${activeOverlayLabels.length} ${ts('labels.gratitudeOverlays', 'overlays')}` : ts('labels.gratitudeNoOverlays', 'no overlays'),
    visual.stickers.length ? `${visual.stickers.length} ${ts('labels.gratitudeStickers', 'stickers')}` : "",
    visual.emoji ? ts('labels.gratitudeEmoji', 'emoji') : "",
  ].filter(Boolean).join(" · ");

  const latestEntry = entries[0];
  const summary = entries.length
    ? `${entries.length} ${entries.length === 1 ? ts('labels.gratitudeMoment', 'gratitude moment') : ts('labels.gratitudeMoments', 'gratitude moments')} · ${ts('labels.localOnly', 'local only')}`
    : ts('labels.gratitudeEmptySummary', 'Start with one image and one grateful sentence.');
  const weeklyEntries = entries.filter((entry) => {
    const entryTime = new Date(entry.createdAt).getTime();
    return Number.isFinite(entryTime) && entryTime >= weekStartTime;
  });
  const weeklyPlaces = Array.from(new Set(weeklyEntries.map((entry) => entry.place.trim()).filter(Boolean))).slice(0, 3);
  const gratitudeThemes = Array.from(new Set(
    weeklyEntries
      .flatMap((entry) => entry.note.toLowerCase().split(/[^a-zÀ-ÿ]+/i))
      .filter((word) => word.length > 4 && !["today", "thank", "thanks", "grateful", "danke", "heute"].includes(word))
  )).slice(0, 3);
  const formationCounts = GRATITUDE_FORMATIONS.map((item) => ({
    key: item,
    label: gratitudeFormationLabel(item),
    icon: GRATITUDE_FORMATION_ICON[item],
    count: weeklyEntries.filter((entry) => normalizeGratitudeFormation(entry.formation) === item).length,
  }));
  const topFormation = formationCounts.reduce((top, item) => item.count > top.count ? item : top, formationCounts[0]);
  const todayWisdomPrompt = ts(
    'labels.gratitudePromptFromWisdomBody',
    'Take one photo that helps you practice today’s wisdom: {practice}'
  ).replace("{practice}", todayCompanionCard.practice);
  const gratitudeRhythmLabel = notificationTimeLabel(GRATITUDE_REFLECTION_DEFAULT_HOUR, language);

  return (
    <div id="gratitude-lens-card" tabIndex={-1} className="scroll-mt-28 outline-none">
      <DisclosureSection
        title={ts('labels.gratitudeLens', 'Gratitude Lens')}
        summary={summary}
        eyebrow={ts('labels.visualGratitude', 'Visual gratitude')}
        defaultOpen={entries.length === 0}
        showDetailsLabel={ts('showDetails', 'Show details')}
        hideDetailsLabel={ts('hideDetails', 'Hide details')}
        theme={theme}
      >
      <section className="grid min-w-0 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-xl border p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-md" style={{ backgroundColor: theme.bgInput, color: theme.primary }}>
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.captureGratitude', 'Capture one moment of gratitude')}</h3>
              <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>
                {ts('labels.gratitudeLensBody', 'Take or choose a photo, name what you are grateful for, and keep a private visual record of provision, beauty, and small mercies.')}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border p-3" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="mt-0.5 shrink-0" style={{ color: theme.accentGold }} />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>
                  {ts('labels.promptFromTodayWisdom', "Prompt from today’s wisdom")}
                </p>
                <p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>
                  {todayWisdomPrompt}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border p-3" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>
              {ts('labels.gratitudeNoticingQuestion', 'What are you noticing?')}
            </p>
            <p className="mt-1 text-xs leading-5" style={{ color: theme.textSecondary }}>
              {ts('labels.gratitudeNoticingBody', 'Name the kind of gift before you style or share anything.')}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GRATITUDE_FORMATIONS.map((item) => {
                const isActive = formation === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFormation(item)}
                    className="premium-tap-card flex min-h-16 flex-col items-start justify-between rounded-lg border p-3 text-left transition"
                    style={{
                      borderColor: isActive ? theme.primary : theme.borderMedium,
                      backgroundColor: isActive ? theme.primary : theme.bgInput,
                      color: isActive ? theme.textOnPrimary : theme.textPrimary,
                    }}
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: isActive ? theme.textOnPrimary : theme.accentGold }}>
                      {GRATITUDE_FORMATION_ICON[item]}
                    </span>
                    <span className="mt-2 text-sm font-semibold leading-5">{gratitudeFormationLabel(item)}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 rounded-lg border p-3 text-xs leading-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
              {gratitudeFormationPrompt(formation)}
            </p>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput }}>
            {previewUrl ? (
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={previewUrl}
                  alt={ts('labels.gratitudePreview', 'Gratitude preview')}
                  fill
                  className="object-cover"
                  style={{ filter: GRATITUDE_FILTER_STYLE[visual.filter] }}
                  unoptimized
                />
                {(visual.stickers.length || visual.emoji) ? (
                  <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-2">
                    {[...visual.stickers.map((sticker) => GRATITUDE_STICKER_MARK[sticker]), visual.emoji].filter(Boolean).slice(0, 5).map((item) => (
                      <span
                        key={item}
                        className="rounded-full border px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur"
                        style={{ borderColor: theme.borderMedium, backgroundColor: "rgba(13, 23, 20, 0.62)", color: "#f8f5e8" }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 p-6 text-center"
                style={{ color: theme.textSecondary }}
              >
                <Camera size={28} />
                <span className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.chooseGratitudePhoto', 'Choose or take a photo')}</span>
                <span className="max-w-xs text-xs leading-5">{ts('labels.gratitudePhotoPrivate', 'The image stays on this device unless you export or share a postcard.')}</span>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={selectFile} />

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-11 rounded-md border px-4 text-sm font-semibold"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            >
              {previewUrl ? ts('labels.changePhoto', 'Change photo') : ts('labels.addPhoto', 'Add photo')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="h-11 rounded-md border px-4 text-sm font-semibold"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard, color: theme.textSecondary }}
            >
              {ts('labels.clear', 'Clear')}
            </button>
          </div>

          <details className="mt-4 rounded-xl border p-3" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-start gap-3">
              <Sparkles size={18} className="mt-0.5 shrink-0" style={{ color: theme.accentGold }} />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>
                  {ts('labels.gratitudeStyleCard', 'Postcard style')}
                </p>
                <p className="mt-1 text-xs leading-5" style={{ color: theme.textSecondary }}>
                  {activeStyleSummary || ts('labels.gratitudeStyleBody', 'Optional, local-only edits. Nothing leaves this device until you export or share.')}
                </p>
              </div>
              </span>
              <span className="shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                {ts('showDetails', 'Show details')}
              </span>
            </summary>

            <div className="mt-4 border-t pt-4" style={{ borderColor: theme.borderLight }}>
              <p className="text-xs leading-5" style={{ color: theme.textSecondary }}>
                {ts('labels.gratitudeStyleBody', 'Optional, local-only edits. Nothing leaves this device until you export or share.')}
              </p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
              {ts('labels.gratitudeFilters', 'Filters')}
            </p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {GRATITUDE_FILTERS.map((filter) => {
                const isActive = visual.filter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setVisual((current) => ({ ...current, filter }))}
                    className="shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition active:scale-[0.98]"
                    style={{
                      borderColor: isActive ? theme.primary : theme.borderMedium,
                      backgroundColor: isActive ? theme.primary : theme.bgInput,
                      color: isActive ? theme.textOnPrimary : theme.textPrimary,
                    }}
                  >
                    {gratitudeFilterLabel(filter)}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
              {ts('labels.gratitudeOverlays', 'Overlays')}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                ["showNote", ts('labels.gratitudeOverlayNote', 'Note')],
                ["showDate", ts('labels.gratitudeOverlayDate', 'Date')],
                ["showPlace", ts('labels.gratitudeOverlayPlace', 'Place')],
                ["showSignature", ts('labels.gratitudeOverlaySignature', 'Aletheia signature')],
              ].map(([key, label]) => {
                const settingKey = key as keyof Pick<GratitudeVisualSettings, "showDate" | "showPlace" | "showNote" | "showSignature">;
                const isActive = visual[settingKey];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleOverlay(settingKey)}
                    className="inline-flex min-h-10 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition active:scale-[0.98]"
                    style={{ borderColor: isActive ? theme.primary : theme.borderMedium, backgroundColor: isActive ? theme.bgCardElevated : theme.bgInput, color: theme.textPrimary }}
                  >
                    <span className="min-w-0">{label}</span>
                    {isActive ? <Check size={14} style={{ color: theme.accentGold }} /> : null}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
              {ts('labels.gratitudeStickers', 'Stickers')}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GRATITUDE_STICKERS.map((sticker) => {
                const isActive = visual.stickers.includes(sticker);
                return (
                  <button
                    key={sticker}
                    type="button"
                    onClick={() => toggleSticker(sticker)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition active:scale-[0.98]"
                    style={{
                      borderColor: isActive ? theme.primary : theme.borderMedium,
                      backgroundColor: isActive ? theme.bgCardElevated : theme.bgInput,
                      color: theme.textPrimary,
                    }}
                  >
                    <span aria-hidden="true">{GRATITUDE_STICKER_MARK[sticker]}</span>
                    <span className="min-w-0 truncate">{gratitudeStickerLabel(sticker)}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] leading-5" style={{ color: theme.textMuted }}>
              {ts('labels.gratitudeStickerLimit', 'Choose up to four. Keep the card calm.')}
            </p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
              {ts('labels.gratitudeEmoji', 'Emoji')}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {GRATITUDE_EMOJIS.map((emoji) => {
                const isActive = visual.emoji === emoji;
                return (
                  <button
                    key={emoji || "none"}
                    type="button"
                    onClick={() => setVisual((current) => ({ ...current, emoji }))}
                    className="min-h-10 rounded-full border px-3 text-sm font-semibold transition active:scale-[0.98]"
                    style={{
                      borderColor: isActive ? theme.primary : theme.borderMedium,
                      backgroundColor: isActive ? theme.primary : theme.bgInput,
                      color: isActive ? theme.textOnPrimary : theme.textPrimary,
                    }}
                  >
                    {emoji || ts('labels.gratitudeNoEmoji', 'None')}
                  </button>
                );
              })}
            </div>
            </div>
          </details>

          <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
            {ts('labels.gratefulFor', 'What are you grateful for?')}
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={280}
              className="mt-2 min-h-28 w-full resize-none rounded-lg border px-3 py-3 text-sm normal-case leading-6 tracking-normal outline-none"
              placeholder={ts('placeholders.gratitudeNote', 'I am grateful for...')}
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            />
          </label>

          <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
            {ts('labels.placeOptional', 'Place (optional)')}
            <div className="mt-2 flex items-center gap-2 rounded-lg border px-3" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput }}>
              <MapPin size={16} style={{ color: theme.textMuted }} />
              <input
                value={place}
                onChange={(event) => setPlace(event.target.value)}
                maxLength={120}
                className="h-11 min-w-0 flex-1 bg-transparent text-sm normal-case tracking-normal outline-none"
                placeholder={ts('placeholders.gratitudePlace', 'Kitchen table, morning walk, office...')}
                style={{ color: theme.textPrimary }}
              />
            </div>
          </label>

          <button
            type="button"
            onClick={submit}
            disabled={isSaving}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-65"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            <Plus size={16} />
            {isSaving ? ts('labels.saving', 'Saving...') : ts('labels.saveGratitude', 'Save gratitude')}
          </button>
          <p className="mt-3 text-xs leading-5" style={{ color: theme.textMuted }}>
            {ts('labels.gratitudePrivacyNote', 'Private by default: gratitude images are stored locally on this device and are not synced to your account.')}
          </p>
          <p className="mt-2 text-xs leading-5" style={{ color: theme.textMuted }}>
            {ts('labels.suggestedGratitudeRhythm', 'Best rhythm: around {time} local time as a day-closing reflection.').replace("{time}", gratitudeRhythmLabel)}
          </p>
        </div>

        <div className="rounded-xl border p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts('labels.gratitudeTimeline', 'Gratitude timeline')}</p>
              <h3 className="mt-1 text-lg font-semibold" style={{ color: theme.textPrimary }}>
                {latestEntry ? ts('labels.latestGratitude', 'Latest gratitude') : ts('labels.noGratitudeYet', 'No gratitude moments yet')}
              </h3>
            </div>
            <Sprout size={24} style={{ color: theme.primary }} />
          </div>
          <div className="mt-4 rounded-xl border p-3" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput }}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>
              {ts('labels.gratitudeWeeklyRecap', 'Weekly gratitude recap')}
            </p>
            <p className="mt-1 text-sm font-semibold leading-6" style={{ color: theme.textPrimary }}>
              {ts('labels.weeklyMomentsNoticed', 'This week: {count} moments noticed.').replace("{count}", String(weeklyEntries.length))}
            </p>
            <p className="mt-1 text-xs leading-5" style={{ color: theme.textSecondary }}>
              {weeklyPlaces.length
                ? ts('labels.weeklyGratitudePlaces', 'Places noticed: {places}.').replace("{places}", weeklyPlaces.join(", "))
                : ts('labels.noStreaksJustRemembrance', 'No streaks, no pressure. Just remembrance over time.')}
            </p>
            {gratitudeThemes.length ? (
              <p className="mt-1 text-xs leading-5" style={{ color: theme.textSecondary }}>
                {ts('labels.gratitudeThemesNoticed', 'Themes noticed: {themes}.').replace("{themes}", gratitudeThemes.join(", "))}
              </p>
            ) : null}
            {weeklyEntries.length ? (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {formationCounts.map((item) => (
                  <div key={item.key} className="rounded-lg border px-2 py-2" style={{ borderColor: item.count ? theme.primary : theme.borderLight, backgroundColor: item.count ? theme.bgCardElevated : theme.bgCard }}>
                    <p className="text-base font-semibold" style={{ color: item.count ? theme.textPrimary : theme.textMuted }}>{item.count}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: item.count ? theme.accentGold : theme.textMuted }}>
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
            {weeklyEntries.length && topFormation.count ? (
              <p className="mt-3 rounded-lg border p-3 text-xs leading-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textSecondary }}>
                <span className="font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.gratitudePatternThisWeek', 'Pattern this week')}:</span>{" "}
                {ts('labels.gratitudePatternThisWeekBody', 'You have been noticing {pattern}. Keep paying attention without turning it into a score.').replace("{pattern}", topFormation.label.toLowerCase())}
              </p>
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
            {entries.length ? (
              entries.map((entry) => (
                <article key={entry.id} className="overflow-hidden rounded-xl border" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
                  <div className="relative aspect-[16/9] w-full">
                    <Image
                      src={entry.imageDataUrl}
                      alt={entry.note}
                      fill
                      className="object-cover"
                      style={{ filter: GRATITUDE_FILTER_STYLE[normalizeGratitudeVisual(entry.visual).filter] }}
                      unoptimized
                    />
                  </div>
                  <div className="p-4">
                    <span className="inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.accentGold }}>
                      <span aria-hidden="true">{GRATITUDE_FORMATION_ICON[normalizeGratitudeFormation(entry.formation)]}</span>
                      <span className="truncate">{gratitudeFormationLabel(normalizeGratitudeFormation(entry.formation))}</span>
                    </span>
                    <p className="mt-3 text-sm font-semibold leading-6" style={{ color: theme.textPrimary }}>{entry.note}</p>
                    <p className="mt-2 text-xs leading-5" style={{ color: theme.textMuted }}>
                      {new Date(entry.createdAt).toLocaleString(language, { dateStyle: "medium", timeStyle: "short" })}
                      {entry.place ? ` · ${entry.place}` : ""}
                    </p>
                    {(entry.postcardCreatedAt || entry.reflectedAt) ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.postcardCreatedAt ? (
                          <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                            {ts('labels.postcardSavedToTimeline', 'Postcard saved to timeline')}
                          </span>
                        ) : null}
                        {entry.reflectedAt ? (
                          <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}>
                            {ts('labels.usedForReflection', 'Used as reflection prompt')}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => onUseAsReflection(entry)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold"
                        style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                      >
                        <Feather size={15} />
                        {ts('labels.useAsReflectionPrompt', 'Use as prompt')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSharePostcard(entry)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold"
                        style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                      >
                        <Download size={15} />
                        {ts('labels.createPostcard', 'Create postcard')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(entry.id)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold"
                        style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
                      >
                        <Trash2 size={15} />
                        {ts('labels.delete', 'Delete')}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-sm leading-6" style={{ borderColor: theme.borderMedium, color: theme.textSecondary }}>
                {ts('labels.gratitudeTimelineEmpty', 'Take one quiet photo of something you do not want to take for granted. Aletheia will keep it here as a private visual rhythm.')}
              </div>
            )}
          </div>
        </div>
      </section>
      </DisclosureSection>
    </div>
  );
}

function LibraryPanel({
  entries,
  search,
  setSearch,
  mode,
  preferences,
  ts,
  onScriptureOpen,
  scriptureMemory,
  onSaveScriptureMemory,
  onShareScriptureMemory,
  theme,
}: {
  entries: WisdomEntry[];
  search: string;
  setSearch: (value: string) => void;
  mode: Mode;
  preferences: UserPreferences;
  ts: (key: string, fallback?: string) => string;
  onScriptureOpen: (scripture: string) => void;
  scriptureMemory: ScriptureMemory | null;
  onSaveScriptureMemory: (scripture: string, principle: string) => void;
  onShareScriptureMemory: (memory: ScriptureMemory) => void;
  theme: ThemeColors;
}) {
  const runtime = runtimeCopyFor(preferences.language);
  const localizedModeSearchLabel = localizedModeLabel(mode, preferences.language).toLowerCase();
  const [librarySection, setLibrarySection] = useState<"explore" | "memory">("explore");
  const libraryNextTitle = search.trim() ? `Review ${entries.length} matching wisdom anchor${entries.length === 1 ? "" : "s"}` : runtime.libraryNextTitleDefault;
  const libraryNextBody = search.trim()
    ? runtime.libraryNextBodySearch
    : `${runtime.libraryTryPrefix} ${[
        "Stewardship",
        "Debt",
        "Contentment",
        "Counsel",
        "Cost Counting",
        "Generosity",
        "Provision and Anxiety",
        "Diligence",
      ].map((item) => localizedWisdomThemeLabel(item, preferences.language).toLowerCase()).join(', ')}.`;
  const visibleEntries = entries.slice(0, search.trim() ? entries.length : 4);
  const remainingEntries = entries.slice(4);

  return (
    <div className="min-w-0 space-y-4">
      <ContextualNextAction
        eyebrow={runtime.nextInLibrary}
        title={libraryNextTitle}
        body={libraryNextBody}
        theme={theme}
      />
      {scriptureMemory ? (
        <ScreenTabs
          value={librarySection}
          onChange={setLibrarySection}
          ariaLabel={ts('labels.librarySections', 'Library sections')}
          theme={theme}
          tabs={[
            { key: "explore", label: ts('labels.libraryExplore', 'Explore') },
            { key: "memory", label: ts('labels.scriptureMemory', 'Scripture Memory') },
          ]}
        />
      ) : null}

      {librarySection === "memory" && scriptureMemory ? (
        <DisclosureSection
          title={ts('labels.scriptureMemory', 'Scripture Memory')}
          summary={ts('labels.scriptureMemorySummary', 'One passage you are carrying can stay visible without keeping the whole library open.')}
          eyebrow={ts('labels.carryScriptureForWeek', 'Carry scripture')}
          defaultOpen
          compactCollapsed
          showDetailsLabel={ts('showDetails', 'Show details')}
          hideDetailsLabel={ts('hideDetails', 'Hide details')}
          theme={theme}
        >
          <div className="rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => onScriptureOpen(scriptureMemory.scripture)}
                className="text-left text-sm font-semibold underline underline-offset-4"
                style={{ color: theme.textPrimary }}
              >
                {scriptureMemory.scripture}
              </button>
              <button
                type="button"
                onClick={() => onShareScriptureMemory(scriptureMemory)}
                className="premium-tap-card w-fit rounded-md border px-3 py-2 text-xs font-semibold"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              >
                {ts('labels.createCard', 'Create card')}
              </button>
            </div>
            <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>{scriptureMemory.principle}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSaveScriptureMemory(scriptureMemory.scripture, scriptureMemory.principle)}
                className="rounded-md border px-3 py-2 text-xs font-semibold"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
              >
                {ts('labels.carryScriptureForWeek', 'Carry scripture')}
              </button>
              <button
                type="button"
                onClick={() => setLibrarySection("explore")}
                className="rounded-md border px-3 py-2 text-xs font-semibold"
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textSecondary }}
              >
                {ts('labels.backToLibrary', 'Back to library')}
              </button>
            </div>
          </div>
        </DisclosureSection>
      ) : null}

      {librarySection !== "memory" ? (
      <section className="min-w-0 rounded-xl border p-4 shadow-sm sm:p-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xl font-semibold" style={{ color: theme.textPrimary }}>
              <BookOpen size={20} />
              {ts('labels.wisdomLibrary', 'Wisdom Library')}
            </div>
            <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>
              {runtime.libraryDescription}
            </p>
          </div>
          <label className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={17} style={{ color: theme.textMuted }} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-lg border px-3 pl-10 pr-3 text-sm outline-none"
              placeholder={`${ts('labels.search', 'Search')} ${localizedModeSearchLabel} ${ts('labels.wisdom', 'wisdom')}...`}
              style={{
                borderColor: theme.borderMedium,
                backgroundColor: theme.bgInput,
                color: theme.textPrimary,
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = theme.primary}
              onBlur={(e) => e.currentTarget.style.borderColor = theme.borderMedium}
            />
          </label>
        </div>

        <div className="mt-5 grid min-w-0 gap-3 lg:grid-cols-2">
          {visibleEntries.map((entry, index) => {
            const localizedEntry = localizedWisdomLibraryEntry(entry, preferences);
            return (
              <article
                key={entry.scripture}
                className={`rounded-lg border p-4 ${visibleEntries.length % 2 === 1 && index === visibleEntries.length - 1 ? "lg:col-span-2" : ""}`}
                style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em]" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}>{localizedWisdomThemeLabel(entry.theme, preferences.language)}</span>
                  <button
                    type="button"
                    onClick={() => onScriptureOpen(entry.scripture)}
                    className="text-left text-sm font-semibold underline underline-offset-4 transition"
                    style={{
                      color: theme.textPrimary,
                      textDecorationColor: theme.borderMedium,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = theme.accentGold}
                    onMouseLeave={(e) => e.currentTarget.style.color = theme.textPrimary}
                  >
                    {entry.scripture}
                  </button>
                </div>
                <p className="text-sm font-semibold leading-6" style={{ color: theme.textPrimary }}>{localizedEntry.principle}</p>
                <p className="mt-3 text-sm leading-6" style={{ color: theme.textSecondary }}>{localizedEntry.application}</p>
                <p className="mt-3 rounded-md border p-3 text-xs leading-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard, color: theme.textMuted }}>
                  {localizedWisdomLibraryNote(entry, preferences)}
                </p>
                <button
                  type="button"
                  onClick={() => onSaveScriptureMemory(entry.scripture, localizedEntry.principle)}
                  className="premium-tap-card mt-3 inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold"
                  style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                >
                  <BookOpen size={14} />
                  {ts('labels.carryScriptureForWeek', 'Carry scripture')}
                </button>
              </article>
            );
          })}
        </div>
        {!search.trim() && remainingEntries.length > 0 ? (
          <details className="mt-4 rounded-lg border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgInput }}>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>
              {runtime.fullWisdomLibrary} · {remainingEntries.length} {runtime.moreAnchors}
            </summary>
            <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2">
              {remainingEntries.map((entry, index) => {
                const localizedEntry = localizedWisdomLibraryEntry(entry, preferences);
                return (
                  <article
                    key={entry.scripture}
                    className={`rounded-lg border p-4 ${remainingEntries.length % 2 === 1 && index === remainingEntries.length - 1 ? "lg:col-span-2" : ""}`}
                    style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em]" style={{ backgroundColor: theme.bgInput, color: theme.textSecondary }}>{localizedWisdomThemeLabel(entry.theme, preferences.language)}</span>
                      <button
                        type="button"
                        onClick={() => onScriptureOpen(entry.scripture)}
                        className="text-left text-sm font-semibold underline underline-offset-4 transition"
                        style={{ color: theme.textPrimary, textDecorationColor: theme.borderMedium }}
                      >
                        {entry.scripture}
                      </button>
                    </div>
                    <p className="text-sm font-semibold leading-6" style={{ color: theme.textPrimary }}>{localizedEntry.principle}</p>
                    <p className="mt-3 text-sm leading-6" style={{ color: theme.textSecondary }}>{localizedEntry.application}</p>
                    <button
                      type="button"
                      onClick={() => onSaveScriptureMemory(entry.scripture, localizedEntry.principle)}
                      className="premium-tap-card mt-3 inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold"
                      style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                    >
                      <BookOpen size={14} />
                      {ts('labels.carryScriptureForWeek', 'Carry scripture')}
                    </button>
                  </article>
                );
              })}
            </div>
          </details>
        ) : null}
      </section>
      ) : null}
    </div>
  );
}

function JournalPanel({
  entries,
  title,
  body,
  language,
  mode,
  setTitle,
  setBody,
  onSave,
  onDelete,
  onSharePostcard,
  onVoiceReflection,
  ts,
  theme,
}: {
  entries: JournalEntry[];
  title: string;
  body: string;
  language: LanguageCode;
  mode: Mode;
  setTitle: (value: string) => void;
  setBody: (value: string) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
  onSharePostcard: (entry: JournalEntry) => void;
  onVoiceReflection: () => void;
  ts: (key: string, fallback?: string) => string;
  theme: ThemeColors;
}) {
  const runtime = runtimeCopyFor(language);
  const [journalSection, setJournalSection] = useState<"write" | "archive">("write");
  const visibleEntries = entries.slice(0, 3);
  const remainingEntries = entries.slice(3);

  return (
    <div className="min-w-0 space-y-4">
      <ScreenTabs
        value={journalSection}
        onChange={setJournalSection}
        ariaLabel={ts('labels.journalSections', 'Journal sections')}
        theme={theme}
        tabs={[
          { key: "write", label: ts('labels.writeReflection', 'Write') },
          { key: "archive", label: ts('labels.savedReflections', 'Archive') },
        ]}
      />

      {journalSection === "write" ? (
        <section className="min-w-0 rounded-xl border p-4 shadow-sm sm:p-5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
          <div className="mb-5 flex items-center gap-2 text-xl font-semibold" style={{ color: theme.textPrimary }}>
            <Feather size={20} />
            {ts('labels.reflectionJournal', 'Reflection Journal')}
          </div>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-11 w-full rounded-lg border px-3 text-sm outline-none"
            placeholder={ts('placeholders.reflectionTitle', 'Reflection title')}
            style={{
              borderColor: theme.borderMedium,
              backgroundColor: theme.bgInput,
              color: theme.textPrimary,
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = theme.primary}
            onBlur={(e) => e.currentTarget.style.borderColor = theme.borderMedium}
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="mt-3 min-h-48 w-full resize-none rounded-lg border px-3 py-3 text-sm leading-6 outline-none"
            placeholder={ts('placeholders.reflectionBody', 'What are you noticing about motives, fear, generosity, or peace in your current decisions?')}
            style={{
              borderColor: theme.borderMedium,
              backgroundColor: theme.bgInput,
              color: theme.textPrimary,
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = theme.primary}
            onBlur={(e) => e.currentTarget.style.borderColor = theme.borderMedium}
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button onClick={onSave} className="premium-tap-card inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary, boxShadow: `0 10px 15px -3px ${theme.primary}15` }}>
              <Plus size={16} />
              {ts('labels.saveReflection', 'Save reflection')}
            </button>
            <button
              type="button"
              onClick={onVoiceReflection}
              className="premium-tap-card inline-flex h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold"
              style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
            >
              <Volume2 size={16} />
              {ts('labels.voiceReflectionMode', 'Voice Reflection Mode')}
            </button>
          </div>
        </section>
      ) : null}

      {journalSection === "archive" ? (
        <DisclosureSection
          title={`${entries.length} ${entries.length === 1 ? runtime.savedReflectionSingular : runtime.savedReflectionPlural}`}
          summary={entries.length ? runtime.reflectionHistorySummaryActive : runtime.reflectionHistorySummaryDefault}
          eyebrow={runtime.reflectionHistory}
          defaultOpen={entries.length > 0 && entries.length < 4}
          compactCollapsed
          showDetailsLabel={ts('showDetails', 'Show details')}
          hideDetailsLabel={ts('hideDetails', 'Hide details')}
          theme={theme}
        >
          <section className="min-w-0">
            <h2 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>{ts('labels.savedReflections', 'Saved reflections')}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {visibleEntries.length ? (
                visibleEntries.map((entry) => (
                  <article key={entry.id} className="rounded-lg border p-4" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold" style={{ color: theme.textPrimary }}>{entry.title}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>
                          {entry.mode} - {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button onClick={() => {
                        if (window.confirm(ts('confirm.deleteJournalEntry', 'Are you sure you want to delete this journal entry? This cannot be undone.'))) {
                          onDelete(entry.id);
                        }
                      }} className="grid size-9 shrink-0 place-items-center rounded-md border" aria-label={`${ts('labels.delete', 'Delete')} ${entry.title}`} style={{ borderColor: theme.borderMedium, color: theme.textMuted }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bgInput} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6" style={{ color: theme.textSecondary }}>{entry.body}</p>
                    <button
                      type="button"
                      onClick={() => onSharePostcard(entry)}
                      className="premium-tap-card mt-3 inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold"
                      style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                    >
                      <Share2 size={14} />
                      {ts('labels.createCard', 'Create card')}
                    </button>
                  </article>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm leading-6 md:col-span-2" style={{ borderColor: theme.borderMedium, color: theme.textMuted }}>
                  {ts('labels.noReflectionsYet', 'No reflections yet. Save one from the form to keep a private record on this device.')}
                </div>
              )}
            </div>
            {remainingEntries.length > 0 ? (
              <DisclosureSection
                title={ts('labels.moreReflections', 'More reflections')}
                summary={`${remainingEntries.length} ${remainingEntries.length === 1 ? runtime.savedReflectionSingular : runtime.savedReflectionPlural} ${ts('labels.stayCollapsedUntilNeeded', 'stay collapsed until you need the full archive.')}`}
                eyebrow={ts('labels.archive', 'Archive')}
                compactCollapsed
                showDetailsLabel={ts('showDetails', 'Show details')}
                hideDetailsLabel={ts('hideDetails', 'Hide details')}
                theme={theme}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  {remainingEntries.map((entry) => (
                    <article key={entry.id} className="rounded-lg border p-4" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold" style={{ color: theme.textPrimary }}>{entry.title}</p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accentGold }}>
                            {entry.mode} - {new Date(entry.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button onClick={() => {
                          if (window.confirm(ts('confirm.deleteJournalEntry', 'Are you sure you want to delete this journal entry? This cannot be undone.'))) {
                            onDelete(entry.id);
                          }
                        }} className="grid size-9 shrink-0 place-items-center rounded-md border" aria-label={`${ts('labels.delete', 'Delete')} ${entry.title}`} style={{ borderColor: theme.borderMedium, color: theme.textMuted }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bgInput} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6" style={{ color: theme.textSecondary }}>{entry.body}</p>
                      <button
                        type="button"
                        onClick={() => onSharePostcard(entry)}
                        className="premium-tap-card mt-3 inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold"
                        style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}
                      >
                        <Share2 size={14} />
                        {ts('labels.createCard', 'Create card')}
                      </button>
                    </article>
                  ))}
                </div>
              </DisclosureSection>
            ) : null}
            <p className="mt-4 text-xs leading-5" style={{ color: theme.textMuted }}>{ts('labels.currentlyActiveMode', 'Currently active mode')}: {mode}</p>
          </section>
        </DisclosureSection>
      ) : null}
    </div>
  );
}
