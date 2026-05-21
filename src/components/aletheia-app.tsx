"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { signIn as authSignIn, signOut as authSignOut } from "next-auth/react";
import { FormEvent, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  BriefcaseBusiness,
  Check,
  Compass,
  Feather,
  HandHeart,
  Home,
  MessageCircle,
  Moon,
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
  defaultPreferences,
  defaultBibleTranslationForLanguage,
  languageCopy,
  languages,
  localizedDailyWisdom,
  localizedScriptureRead,
  localizedWisdomLibraryNote,
  normalizePreferences,
  regions,
  type BibleTranslation,
  type LanguageCode,
  type RegionCode,
  type UserPreferences,
} from "@/lib/localization";
import { modeProfiles, type ModeProfile } from "@/lib/mode-profiles";
import type { Mode } from "@/lib/wisdom-data";

type View = "companion" | "decisions" | "reflect" | "library" | "account";
type AuthMode = "login" | "register";
type AuthStatus = "checking" | "guest" | "signing-in" | "signed-in" | "signing-out";
type AnalyticsMetadata = Record<string, string | number | boolean | null>;
type ShareChannel = "native" | "copy" | "whatsapp" | "facebook" | "x" | "linkedin" | "email" | "sms";
type WorkflowTone = "info" | "success" | "warning" | "error";
type WorkflowNoticeState = {
  id: string;
  title: string;
  body: string;
  tone: WorkflowTone;
};

const ALETHEIA_SHARE_URL = "https://aletheia.mirrortalkpodcast.com?ref=share";
const ALETHEIA_SHARE_TEXT = "Aletheia is a calm AI-powered biblical wisdom companion for money, work, and stewardship.";

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
};

function storedPreferences() {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  try {
    const saved = window.localStorage.getItem("aletheia_preferences");
    return saved ? normalizePreferences(JSON.parse(saved) as Partial<UserPreferences>) : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

function shouldShowOnboarding() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const completed = window.localStorage.getItem("aletheia_onboarding_complete") === "yes";
    const hasPreferences = Boolean(window.localStorage.getItem("aletheia_preferences"));
    const hasAnonId = Boolean(window.localStorage.getItem("aletheia_anon_id"));
    const hasOpenedThisSession = Boolean(window.sessionStorage.getItem("aletheia_app_opened_tracked"));
    return !completed && !hasPreferences && !hasAnonId && !hasOpenedThisSession;
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
      createdLabel: pendingQuestion ? "Earlier counsel" : "Welcome",
    });
    pendingQuestion = null;
  }

  return exchanges;
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
  text: string;
  sources?: WisdomEntry[];
};

type ConversationExchange = {
  id: string;
  question: ChatMessage | null;
  answer: ChatMessage;
  createdLabel: string;
};

type JournalEntry = {
  id: string;
  title: string;
  body: string;
  mode: Mode;
  createdAt: string;
};

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

type CounselContact = {
  id: string;
  name: string;
  role: string;
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

function isCounselInvitePreview(value: CounselInvitePreview | { error?: string }): value is CounselInvitePreview {
  return "invite" in value && "sharedDecisions" in value;
}

type RuleOfLife = {
  id: string;
  mode: Mode;
  principle: string;
  createdAt: string;
};

const wisdomEntries: WisdomEntry[] = [
  {
    theme: "Stewardship",
    scripture: "Matthew 25:14-30",
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
  {
    theme: "Debt",
    scripture: "Proverbs 22:7",
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
  {
    theme: "Contentment",
    scripture: "Philippians 4:11-13",
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
  {
    theme: "Counsel",
    scripture: "Proverbs 15:22",
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
  {
    theme: "Cost Counting",
    scripture: "Luke 14:28",
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
  {
    theme: "Generosity",
    scripture: "2 Corinthians 9:6-8",
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
  {
    theme: "Diligence",
    scripture: "Proverbs 21:5",
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
  {
    theme: "Provision and Anxiety",
    scripture: "Matthew 6:25-34",
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
];

const modes: { label: Mode; icon: typeof PiggyBank; copy: string }[] = [
  { label: "Money", icon: PiggyBank, copy: modeProfiles.Money.focus },
  { label: "Work", icon: BriefcaseBusiness, copy: modeProfiles.Work.focus },
  { label: "Purpose", icon: Compass, copy: modeProfiles.Purpose.focus },
  { label: "Generosity", icon: HandHeart, copy: modeProfiles.Generosity.focus },
];

const modeTerms: Record<Mode, string[]> = {
  Money: ["money", "debt", "stewardship", "contentment", "saving", "investing", "risk", "wealth"],
  Work: ["work", "job", "career", "business", "counsel", "diligence", "cost", "planning"],
  Purpose: ["purpose", "identity", "direction", "discernment", "peace", "anxiety", "motives", "calling"],
  Generosity: ["generosity", "give", "giving", "charity", "willing", "sustainable", "stewardship", "guilt"],
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

function searchWisdom(query: string, mode: Mode, limit = 3) {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return wisdomEntries
    .map((entry) => {
      const haystack = [
        entry.scripture,
        entry.principle,
        entry.context,
        entry.application,
        ...entry.keywords,
        ...entry.emotions,
      ]
        .join(" ")
        .toLowerCase();
      const themeScore = words.includes(entry.theme.toLowerCase()) ? 8 : 0;
      const exactKeywordScore = entry.keywords.reduce(
        (score, keyword) => score + (words.includes(keyword) ? 6 : 0),
        0
      );
      const keywordScore = words.reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0);
      const modeScore = modeTerms[mode].reduce(
        (score, term) => score + (haystack.includes(term) ? 2 : 0),
        haystack.includes(mode.toLowerCase()) ? 2 : 0
      );
      return { entry, score: themeScore + exactKeywordScore + keywordScore + modeScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((result) => result.entry);
}

function composeResponse(question: string, mode: Mode) {
  const sources = searchWisdom(question, mode, 3);
  const primary = sources[0] ?? wisdomEntries[0];
  const secondary = sources[1] ?? wisdomEntries[2];

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

function todayWisdom() {
  const index = new Date().getDate() % wisdomEntries.length;
  return wisdomEntries[index];
}

export function AletheiaApp() {
  const [activeView, setActiveView] = useState<View>("companion");
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
  const [preferences, setPreferences] = useState<UserPreferences>(storedPreferences);
  const [preferencesStatus, setPreferencesStatus] = useState("Language settings are ready.");
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);
  const [onboardingConcern, setOnboardingConcern] = useState("");
  const [onboardingTone, setOnboardingTone] = useState("gentle");
  const [faithFamiliarity, setFaithFamiliarity] = useState("familiar");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedScripture, setSelectedScripture] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Checking your sign-in status...");
  const [workflowNotice, setWorkflowNotice] = useState<WorkflowNoticeState | null>(null);
  const [notificationStatus, setNotificationStatus] = useState("Checking notification support...");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsConfigured, setNotificationsConfigured] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [wisdomDecisions, setWisdomDecisions] = useState<WisdomDecision[]>([]);
  const [decisionEvents, setDecisionEvents] = useState<DecisionEvent[]>([]);
  const [timelineInsight, setTimelineInsight] = useState<TimelineInsight>({
    activeCount: 0,
    daysDiscerning: 0,
    patterns: [],
    gentleObservation: "Your timeline is ready to track decisions, patterns, counsel, and learning.",
  });
  const [counselContacts, setCounselContacts] = useState<CounselContact[]>([]);
  const [rulesOfLife, setRulesOfLife] = useState<RuleOfLife[]>([]);
  const [decisionTitle, setDecisionTitle] = useState("");
  const [decisionPressure, setDecisionPressure] = useState("");
  const [decisionEmotion, setDecisionEmotion] = useState("uncertain");
  const [counselName, setCounselName] = useState("");
  const [counselRole, setCounselRole] = useState("mentor");
  const [counselContactValue, setCounselContactValue] = useState("");
  const [counselCanViewSummaries, setCounselCanViewSummaries] = useState(true);
  const [counselCanComment, setCounselCanComment] = useState(false);
  const [counselCanReceiveCheckins, setCounselCanReceiveCheckins] = useState(false);
  const [latestCounselInvite, setLatestCounselInvite] = useState<{ name: string; url: string } | null>(null);
  const [counselInviteToken, setCounselInviteToken] = useState<string | null>(null);
  const [counselInvitePreview, setCounselInvitePreview] = useState<CounselInvitePreview | null>(null);
  const [counselInviteStatus, setCounselInviteStatus] = useState("");
  const [ruleText, setRuleText] = useState("");
  const preferencesRef = useRef<HTMLElement | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);

  function announceWorkflow(title: string, body: string, tone: WorkflowTone = "info") {
    setWorkflowNotice({
      id: crypto.randomUUID(),
      title,
      body,
      tone,
    });
  }

  useEffect(() => {
    if (!workflowNotice) {
      return;
    }
    const timeout = window.setTimeout(() => setWorkflowNotice(null), 6500);
    return () => window.clearTimeout(timeout);
  }, [workflowNotice]);

  async function loadSignedInWorkspace(signedInUser: User) {
    const [chatResponse, journalResponse, notificationResponse, decisionsResponse, counselResponse, rulesResponse, preferencesResponse] = await Promise.all([
      fetch("/api/chat"),
      fetch("/api/journal"),
      fetch("/api/notifications/status"),
      fetch("/api/decisions"),
      fetch("/api/counsel"),
      fetch("/api/rules"),
      fetch("/api/preferences"),
    ]);
    const chatData = (await chatResponse.json()) as { messages?: ChatMessage[] };
    const journalData = (await journalResponse.json()) as { entries?: JournalEntry[] };
    const notificationData = (await notificationResponse.json()) as {
      configured?: boolean;
      enabled?: boolean;
    };
    const decisionsData = (await decisionsResponse.json()) as {
      decisions?: WisdomDecision[];
      events?: DecisionEvent[];
      insight?: TimelineInsight;
    };
    const counselData = (await counselResponse.json()) as { contacts?: CounselContact[] };
    const rulesData = (await rulesResponse.json()) as { rules?: RuleOfLife[] };
    const preferencesData = (await preferencesResponse.json()) as { preferences?: UserPreferences };

    setUser(signedInUser);
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
    setNotificationsConfigured(Boolean(notificationData.configured));
    setNotificationsEnabled(Boolean(notificationData.enabled));
  }

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
    async function loadSession() {
      setAuthStatus("checking");
      const [response, providersResponse] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/auth/providers").catch(() => null),
      ]);
      if (providersResponse?.ok) {
        const providers = (await providersResponse.json()) as Record<string, unknown>;
        setGoogleAuthAvailable(Boolean(providers.google));
      }
      const data = (await response.json()) as { user: User | null };
      const params = new URLSearchParams(window.location.search);

      if (data.user) {
        await loadSignedInWorkspace(data.user);
        const signedInMessage = params.get("auth") === "google_success"
          ? "Google sign-in successful. Sync is active."
          : "Signed in. Conversations and reflections sync to the database.";
        setStatusMessage(signedInMessage);
        setAuthNotice(params.get("auth") === "google_success" ? signedInMessage : "");
        try {
          window.localStorage.setItem("aletheia_onboarding_complete", "yes");
        } catch {
          // Signed-in users should not be blocked by local onboarding storage.
        }
        setShowOnboarding(false);
        if (params.get("view") === "account" || params.get("auth") === "google_success") {
          setActiveView("account");
          window.history.replaceState({}, "", window.location.pathname);
        }
      } else {
        setUser(null);
        setAuthStatus("guest");
        setStatusMessage("Guest mode is active. Sign in to sync decisions, journal, notifications, and rules.");
        if (params.get("auth") === "oauth_failed") {
          setAuthError("Google sign-in did not finish. Please try again.");
          setAuthNotice("");
          setActiveView("account");
          setShowOnboarding(false);
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
    }

    loadSession().catch(() => {
      setAuthStatus("guest");
      setStatusMessage("Backend unavailable. Guest mode is still usable.");
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("counselInvite");
    if (!token) {
      return;
    }
    Promise.resolve().then(() => {
      setCounselInviteToken(token);
      setCounselInviteStatus("Loading private counsel invite...");
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
          setCounselInviteStatus("This counsel invite could not be opened. Ask for a fresh private link.");
        });
    });
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) {
            return;
          }
          refreshing = true;
          window.location.reload();
        });
        navigator.serviceWorker
          .register("/sw.js")
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
            document.addEventListener("visibilitychange", updateWhenVisible);
          })
          .catch(() => undefined);
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
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    async function loadNotificationStatus() {
      if ("Notification" in window) {
        setNotificationPermission(Notification.permission);
      } else {
        setNotificationStatus("This browser does not support notifications.");
      }
      const response = await fetch("/api/notifications/status");
      const data = (await response.json()) as {
        configured?: boolean;
        enabled?: boolean;
      };
      setNotificationsConfigured(Boolean(data.configured));
      setNotificationsEnabled(Boolean(data.enabled));
      if (!data.configured) {
        setNotificationStatus("Notifications need VAPID keys before they can be enabled.");
      } else if (!user) {
        setNotificationStatus("Sign in to enable daily wisdom notifications.");
      } else if (data.enabled) {
        setNotificationStatus("Daily wisdom notifications are enabled.");
      } else {
        setNotificationStatus("Get one quiet daily wisdom reflection on this device.");
      }
    }

    loadNotificationStatus().catch(() =>
      setNotificationStatus("Notification status could not be loaded.")
    );
  }, [user]);

  const filteredEntries = useMemo(() => {
    if (!librarySearch.trim()) {
      return wisdomEntries;
    }
    return searchWisdom(librarySearch, mode, wisdomEntries.length);
  }, [librarySearch, mode]);

  const dailyEntry = todayWisdom();
  const daily = localizedDailyWisdom(dailyEntry, mode, preferences);
  const activeMode = modeProfiles[mode];
  const activeLanguage = languages[preferences.language];
  const activeRegion = regions[preferences.region];
  const copy = languageCopy[preferences.language] ?? languageCopy.en;
  const activeDecision = wisdomDecisions.find((item) => item.status !== "closed") ?? wisdomDecisions[0] ?? null;
  const todayPattern = timelineInsight.patterns[0] ?? activeMode.blindSpots[0];
  const decisionResult = useMemo(() => {
    if (!decision.trim()) {
      return null;
    }
    const sources = searchWisdom(`${decision} ${emotion} ${timeframe}`, mode, 2);
    const hasUrgency = /today|now|urgent|must|quick|fomo|panic|afraid/i.test(decision);
    const mentionsCounsel = /counsel|advisor|mentor|spouse|pastor|friend|team/i.test(decision);
    const negatesCounsel =
      /not (talked|spoken|asked|met|shared|consulted)|no (counsel|advisor|mentor|input)|without (counsel|advice|input)/i.test(
        decision
      );
    const hasCounsel = mentionsCounsel && !negatesCounsel;
    const readiness = Math.max(36, Math.min(92, 62 + (hasCounsel ? 14 : 0) - (hasUrgency ? 16 : 0) + (timeframe === "Long-term" ? 8 : 0)));
    return { sources, readiness, hasUrgency, hasCounsel };
  }, [decision, emotion, timeframe, mode]);

  function handleModeChange(nextMode: Mode) {
    setMode(nextMode);
    trackClientEvent("wisdom_mode_selected", { mode: nextMode });
  }

  function showView(view: View) {
    setActiveView(view);
    window.requestAnimationFrame(() => {
      workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function revealPreferences() {
    showView("account");
    setPreferencesStatus("Language, region, Bible translation, and voice are in Account.");
    announceWorkflow("Preferences opened", "Language, region, Bible translation, and voice are all managed in Account.", "info");
    window.requestAnimationFrame(() => {
      preferencesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function completeOnboarding() {
    try {
      window.localStorage.setItem("aletheia_onboarding_complete", "yes");
    } catch {
      // Onboarding can still close if storage is unavailable.
    }
    if (onboardingConcern.trim()) {
      setQuery(
        `I am seeking wisdom for this right now: ${onboardingConcern.trim()}. Please guide me with a ${onboardingTone} tone. My faith familiarity is ${faithFamiliarity}.`
      );
      showView("companion");
      setStatusMessage("A personal starting question is ready in the companion.");
      announceWorkflow("Starting path prepared", "Your first question is ready in the Companion input. Send it when you are ready.", "success");
    } else {
      announceWorkflow("Setup saved", "Your preferences are ready. Start with a question, a decision, or today's reflection.", "success");
    }
    setShowOnboarding(false);
  }

  function continueDecisionFlow() {
    showView("decisions");
    announceWorkflow("Decision companion opened", "Continue the decision with pressure, counsel, cost, and the next faithful step in view.", "info");
  }

  function reflectOnToday() {
    setJournalTitle(`${daily.theme} reflection`);
    setJournalBody(`${daily.practice}\n\nWhat I notice today:\n`);
    showView("reflect");
    announceWorkflow("Reflection prepared", "Today's wisdom has been placed into Reflect so you can respond quietly.", "success");
  }

  function askFromDashboard() {
    showView("companion");
    announceWorkflow("Companion ready", "Ask the question as plainly as you can. Aletheia will slow it down with you.", "info");
  }

  function reviewPatternFlow() {
    showView("decisions");
    announceWorkflow("Timeline opened", "Look for recurring pressure, fear, comparison, counsel, and clarity over time.", "info");
  }

  function openAccountFlow() {
    showView("account");
  }

  async function shareAletheia(channel: ShareChannel, placement: string) {
    trackClientEvent("app_shared", { channel, placement });
    if (channel === "native" && navigator.share) {
      try {
        await navigator.share({
          title: "Aletheia",
          text: ALETHEIA_SHARE_TEXT,
          url: ALETHEIA_SHARE_URL,
        });
        setStatusMessage("Aletheia share sheet opened.");
        announceWorkflow("Share sheet opened", "Only the Aletheia app link is shared. Your private content stays private.", "success");
        return;
      } catch {
        setStatusMessage("Share cancelled. You can still copy the link.");
        announceWorkflow("Share cancelled", "Nothing was shared. You can still copy the app link if you want.", "info");
        return;
      }
    }

    if (channel === "copy" || channel === "native") {
      try {
        await navigator.clipboard.writeText(ALETHEIA_SHARE_URL);
        setStatusMessage("Aletheia link copied.");
        announceWorkflow("Link copied", "Only the public Aletheia invite link was copied.", "success");
      } catch {
        setStatusMessage(ALETHEIA_SHARE_URL);
        announceWorkflow("Copy unavailable", "The invite link is shown in the status message so you can share it manually.", "warning");
      }
    }
  }

  function recordAnswerFeedback(value: string, placement: string) {
    trackClientEvent("answer_feedback", { value, placement, mode });
    setStatusMessage("Thank you. Aletheia will use feedback like this to become wiser and clearer.");
    announceWorkflow("Feedback saved", "Thank you. This helps shape clearer, wiser responses.", "success");
  }

  function trackDecisionFromExchange(exchange: ConversationExchange) {
    const question = cleanDisplayText(exchange.question?.text ?? "");
    if (!question) {
      showView("decisions");
      return;
    }
    setDecisionTitle(question.slice(0, 90));
    setDecisionPressure(question);
    setDecisionEmotion("uncertain");
    showView("decisions");
    announceWorkflow("Decision draft started", "Aletheia moved the question into Decision Companion so it can be tracked over time.", "success");
  }

  function draftReflectionFromExchange(exchange: ConversationExchange) {
    const question = cleanDisplayText(exchange.question?.text ?? "Recent counsel");
    const answer = cleanDisplayText(exchange.answer.text);
    setJournalTitle(`Reflection: ${question.slice(0, 70)}`);
    setJournalBody(`Question:\n${question}\n\nAletheia counsel:\n${answer}\n\nWhat I notice:\n`);
    showView("reflect");
    announceWorkflow("Reflection draft prepared", "The question and counsel are ready in Reflect. Add what you are noticing.", "success");
  }

  function draftCounselSummaryFromExchange(exchange: ConversationExchange) {
    const question = cleanDisplayText(exchange.question?.text ?? "");
    setQuery(`Create a concise counsel summary I can share with a trusted person about this decision: ${question}`);
    showView("companion");
    announceWorkflow("Counsel summary queued", "The Companion input now asks for a mentor-ready summary. Send it when ready.", "success");
  }

  function goDeeperFromExchange(exchange: ConversationExchange) {
    const question = cleanDisplayText(exchange.question?.text ?? "this counsel");
    setQuery(
      `Please go deeper on this in a practical, understandable way. Add more context, examples, blind spots, scripture context, and one next faithful step: ${question}`
    );
    announceWorkflow("Deeper follow-up ready", "The Companion input now asks Aletheia to expand the counsel with more depth and practical clarity.", "success");
  }

  function waitFromExchange(exchange: ConversationExchange) {
    const question = cleanDisplayText(exchange.question?.text ?? "");
    setDecisionTitle(question ? question.slice(0, 90) : "Decision waiting period");
    setDecisionPressure(`${question}\n\nSuggested waiting rhythm: wait 3 days, seek counsel, count the cost, and revisit with less urgency.`);
    setDecisionEmotion("pressured");
    showView("decisions");
    announceWorkflow("Waiting rhythm prepared", "A 3-day waiting path was drafted in Decision Companion.", "success");
  }

  async function updatePreferences(patch: Partial<UserPreferences>) {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    setPreferencesStatus(user ? "Saving language settings..." : "Saved on this device. Sign in to sync language settings.");
    try {
      window.localStorage.setItem("aletheia_preferences", JSON.stringify(next));
    } catch {
      // Preferences still work in memory if local storage is unavailable.
    }

    if (user) {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const saved = response.ok;
      setPreferencesStatus(saved ? "Language settings saved." : "Could not sync language settings yet.");
      announceWorkflow(
        saved ? "Preferences synced" : "Preferences saved locally",
        saved ? "Your language, region, Bible translation, and voice settings are synced." : "The app kept the setting on this device, but sync did not complete.",
        saved ? "success" : "warning"
      );
    } else {
      announceWorkflow("Preferences saved", "These settings are saved on this device. Sign in to sync them across devices.", "success");
    }
  }

  function startVoiceInput() {
    const browserWindow = window as typeof window & {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
    };
    const SpeechRecognition =
      browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPreferencesStatus("Voice input is not supported in this browser yet.");
      announceWorkflow("Voice input unavailable", "This browser does not support speech recognition yet.", "warning");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = activeLanguage.speech;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setQuery((current) => `${current}${current ? " " : ""}${transcript}`.trim());
        announceWorkflow("Voice captured", "The spoken text was added to the Companion input.", "success");
      }
    };
    recognition.onerror = () => {
      setPreferencesStatus("Voice input stopped before Aletheia could hear clearly.");
      announceWorkflow("Voice input stopped", "Aletheia could not hear clearly. You can try again or type the question.", "warning");
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }

  function speakLatestAletheiaReply() {
    if (!("speechSynthesis" in window)) {
      setPreferencesStatus("Voice output is not supported in this browser yet.");
      announceWorkflow("Voice output unavailable", "This browser does not support spoken playback yet.", "warning");
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      announceWorkflow("Voice stopped", "Spoken playback has been stopped.", "info");
      return;
    }
    const latest = [...messages].reverse().find((message) => message.role === "aletheia");
    if (!latest) {
      return;
    }
    speakText(latest.text, "Aletheia is reading the latest response in your selected language voice when available.");
  }

  function speakText(text: string, notice = "Aletheia is reading this aloud in your selected language voice when available.") {
    if (!("speechSynthesis" in window)) {
      setPreferencesStatus("Voice output is not supported in this browser yet.");
      announceWorkflow("Voice output unavailable", "This browser does not support spoken playback yet.", "warning");
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      announceWorkflow("Voice stopped", "Spoken playback has been stopped.", "info");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(cleanDisplayText(text));
    utterance.lang = activeLanguage.speech;
    utterance.rate = 0.92;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    announceWorkflow("Reading aloud", notice, "info");
    window.speechSynthesis.speak(utterance);
  }

  async function askAletheia(rawQuestion: string) {
    if (isWorking) {
      return;
    }
    const trimmed = rawQuestion.trim();
    if (!trimmed) {
      announceWorkflow("Ask a question first", "Type or choose a question so Aletheia has something concrete to work with.", "warning");
      return;
    }

    if (!user) {
      trackClientEvent("chat_question_sent", { mode, language: preferences.language, region: preferences.region, persisted: false });
    }

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: trimmed };
    setIsWorking(true);
    announceWorkflow("Question sent", "Aletheia is retrieving grounded wisdom and preparing a response.", "info");
    setMessages((current) => [
      ...current,
      userMessage,
      { id: "thinking", role: "aletheia", text: "Retrieving grounded wisdom..." },
    ]);
    setQuery("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, mode, preferences }),
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
      const responseMessage =
        data.persisted
          ? data.usedOpenAI
            ? "Answered with server-side OpenAI/RAG and saved to your account."
            : "Answered with server-side retrieval fallback and saved to your account."
          : data.usedOpenAI
            ? "Answered with server-side OpenAI/RAG. Sign in to save history."
            : "Answered with server-side retrieval fallback. Add OPENAI_API_KEY for generated AI responses.";
      setStatusMessage(responseMessage);
      announceWorkflow("Answer ready", responseMessage, "success");
    } catch {
      const fallback = composeResponse(trimmed, mode);
      setMessages((current) =>
        current.map((message) =>
          message.id === "thinking"
            ? { id: crypto.randomUUID(), role: "aletheia", text: fallback.text, sources: fallback.sources }
            : message
        )
      );
      setStatusMessage("Used offline fallback because the server route was unavailable.");
      announceWorkflow("Offline answer ready", "The server was unavailable, so Aletheia used its local fallback wisdom.", "warning");
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
      const data = (await response.json()) as { user?: User; error?: string };
      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "Authentication failed.");
      }
      setAuthPassword("");
      await loadSignedInWorkspace(data.user);
      const successMessage = authMode === "register"
        ? "Account created. You are signed in and sync is active."
        : "Sign-in successful. Sync is active.";
      setStatusMessage(successMessage);
      setAuthNotice(successMessage);
      announceWorkflow(authMode === "register" ? "Account created" : "Signed in", successMessage, "success");
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
      setAuthError(message);
      setAuthNotice("");
      announceWorkflow("Sign-in did not finish", message, "error");
    } finally {
      setIsWorking(false);
    }
  }

  async function logout() {
    setAuthStatus("signing-out");
    setAuthNotice("Signing out...");
    await fetch("/api/auth/logout", { method: "POST" });
    await authSignOut({ redirect: false }).catch(() => undefined);
    setUser(null);
    setAuthStatus("guest");
    setAuthNotice("Signed out. Guest mode is active.");
    setMessages(defaultMessages);
    setJournalEntries([]);
    setNotificationsEnabled(false);
    setStatusMessage("Signed out. Guest mode is active.");
    announceWorkflow("Signed out", "Guest mode is active. You can still use Aletheia on this device.", "info");
  }

  async function handleGoogleSignIn() {
    if (!googleAuthAvailable) {
      setAuthError("Google sign-in is not configured yet. You can still sign in with email.");
      setAuthNotice("");
      announceWorkflow("Google unavailable", "Google sign-in is not configured yet. Email sign-in is available.", "warning");
      return;
    }
    setAuthStatus("signing-in");
    setAuthError("");
    setAuthNotice("Opening Google sign-in. You will return to Account when it finishes.");
    setStatusMessage("Opening Google sign-in. You will return to Account when it finishes.");
    announceWorkflow("Opening Google", "You will return to the Account tab after sign-in completes.", "info");
    await authSignIn("google", {
      redirectTo: "/api/auth/oauth/complete?next=%2F%3Fauth%3Dgoogle_success%26view%3Daccount",
    });
  }

  async function enableNotifications() {
    if (!user) {
      setNotificationStatus("Sign in first, then enable notifications.");
      announceWorkflow("Sign in required", "Daily wisdom notifications can be enabled after sign-in.", "warning");
      return;
    }
    if (!notificationsConfigured) {
      setNotificationStatus("Notifications are not configured on the server yet.");
      announceWorkflow("Notifications not configured", "The server is missing notification keys or settings.", "warning");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setNotificationStatus("This browser does not support web push notifications.");
      announceWorkflow("Notifications unavailable", "This browser does not support web push notifications.", "warning");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission !== "granted") {
      setNotificationStatus("Notifications were not enabled. You can allow them later in browser settings.");
      announceWorkflow("Notifications not enabled", "You can allow notifications later in your browser settings.", "warning");
      return;
    }

    const keyResponse = await fetch("/api/notifications/key");
    const keyData = (await keyResponse.json()) as { publicKey?: string };
    if (!keyData.publicKey) {
      setNotificationStatus("Notifications are missing a public key.");
      announceWorkflow("Notification key missing", "The server did not provide a VAPID public key.", "error");
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
    });
    const preferredHour = 8;
    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription, preferredHour }),
    });
    if (!response.ok) {
      setNotificationStatus("Could not save notification preference.");
      announceWorkflow("Notification sync failed", "Permission was granted, but the subscription could not be saved.", "error");
      return;
    }

    setNotificationsEnabled(true);
    setNotificationStatus("Daily wisdom notifications are enabled for this device.");
    announceWorkflow("Notifications enabled", "This device is subscribed to daily wisdom notifications.", "success");
  }

  async function disableNotifications() {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
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
    setNotificationsEnabled(false);
    setNotificationStatus("Daily wisdom notifications are turned off for this device.");
    announceWorkflow("Notifications off", "Daily wisdom notifications are turned off for this device.", "info");
  }

  async function saveReflection() {
    const title = journalTitle.trim() || `${mode} reflection`;
    const body = journalBody.trim();
    if (!body) {
      announceWorkflow("Write the reflection first", "Add a few honest lines before saving.", "warning");
      return;
    }

    if (user) {
      const response = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, mode }),
      });
      const data = (await response.json()) as { entry?: JournalEntry };
      if (data.entry) {
        setJournalEntries((current) => [data.entry!, ...current]);
        announceWorkflow("Reflection saved", "Your reflection is synced to your account.", "success");
      }
    } else {
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
      setStatusMessage("Reflection saved for this session. Sign in to persist it to the database.");
      announceWorkflow("Reflection saved locally", "This reflection is kept for this session. Sign in to sync it.", "success");
    }

    setJournalTitle("");
    setJournalBody("");
  }

  async function deleteJournalEntry(id: string) {
    if (user) {
      await fetch(`/api/journal/${id}`, { method: "DELETE" });
    }
    setJournalEntries((current) => current.filter((entry) => entry.id !== id));
    announceWorkflow("Reflection deleted", "The journal entry was removed.", "info");
  }

  function refreshLocalTimeline(decisions: WisdomDecision[], events: DecisionEvent[]) {
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
            : "Your timeline is ready to track decisions, patterns, counsel, and learning.",
    });
  }

  async function createDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = decisionTitle.trim();
    const pressure = decisionPressure.trim();
    if (!title || !pressure) {
      announceWorkflow("Name the decision and pressure", "Aletheia needs both the decision and the pressure around it before tracking.", "warning");
      return;
    }

    if (user) {
      const response = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, pressure, emotion: decisionEmotion, mode }),
      });
      const data = (await response.json()) as { decision?: WisdomDecision };
      if (data.decision) {
        setWisdomDecisions((current) => [data.decision!, ...current]);
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
        announceWorkflow("Decision tracked", "The decision is now in your Decision Companion timeline.", "success");
      }
    } else {
      const sources = searchWisdom(`${title} ${pressure} ${decisionEmotion}`, mode, 3);
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
        summary: buildDecisionSummary({ title, mode, pressure, emotion: decisionEmotion, sources, signals }),
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
      setStatusMessage("Decision saved for this session. Sign in to persist decision memory.");
      announceWorkflow("Decision tracked locally", "The decision is tracked on this device. Sign in to sync decision memory.", "success");
    }

    setDecisionTitle("");
    setDecisionPressure("");
  }

  async function updateDecision(id: string, patch: Partial<WisdomDecision> & { waitingDays?: number | null; event?: string }) {
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
        announceWorkflow("Decision update failed", "The change could not be saved. Please try again.", "error");
        return;
      }
    }

    const waitingUntil =
      typeof patch.waitingDays === "number" && patch.waitingDays > 0
        ? new Date(Date.now() + patch.waitingDays * 86400000).toISOString()
        : patch.waitingDays === null
          ? null
          : current.waitingUntil;
    const updated = wisdomDecisions.map((item) => {
      if (item.id !== id) {
        return item;
      }
      const next = { ...item, ...patch, waitingUntil, updatedAt: new Date().toISOString() };
      const sources = searchWisdom(`${next.title} ${next.pressure} ${next.initialEmotion}`, next.mode, 3);
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
        }),
      };
    });
    const eventBody = patch.event ?? (patch.waitingDays ? `Entered waiting mode for ${patch.waitingDays} day${patch.waitingDays === 1 ? "" : "s"}.` : "");
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
    announceWorkflow("Decision updated", eventBody || "The decision signals were updated.", "success");
  }

  async function addCounselContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = counselName.trim();
    if (!name) {
      announceWorkflow("Add a name first", "Name the trusted person before adding them to your Counsel Circle.", "warning");
      return;
    }
    if (user) {
      const response = await fetch("/api/counsel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role: counselRole,
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
          data.contact.emailSent ? "Private invite emailed" : "Private invite created",
          data.contact.emailSent
            ? `${data.contact.name} was emailed a private invite. They still only see summaries you explicitly share.`
            : data.contact.emailError
              ? `The private link is ready, but email was not sent: ${data.contact.emailError}`
              : `${data.contact.name} can only see decision summaries you explicitly share.`,
          data.contact.emailError ? "warning" : "success"
        );
      } else if (data.error) {
        announceWorkflow("Counsel invite not created", data.error, "error");
      }
    } else {
      setCounselContacts((current) => [
        {
          id: crypto.randomUUID(),
          name,
          role: counselRole,
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
      announceWorkflow("Counsel added locally", "Sign in to create private invite links and share selected decision summaries.", "success");
    }
    setCounselName("");
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
      announceWorkflow("Invite link copied", "Share it only with the counselor you intended to invite.", "success");
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
      announceWorkflow("Summary shared", "Only this decision summary was shared. Chats and journal entries remain private.", "success");
    } else {
      announceWorkflow("Summary not shared", data.error || "The summary could not be shared.", "error");
    }
  }

  async function acceptCounselInvite() {
    if (!counselInviteToken) {
      return;
    }
    setCounselInviteStatus("Accepting invite...");
    const response = await fetch(`/api/counsel/invite/${encodeURIComponent(counselInviteToken)}`, {
      method: "POST",
    });
    const data = (await response.json()) as CounselInvitePreview | { error?: string };
    if (response.ok && isCounselInvitePreview(data)) {
      setCounselInvitePreview(data);
      setCounselInviteStatus("Invite accepted. You can now view shared summaries.");
    } else {
      setCounselInviteStatus("This invite could not be accepted.");
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
      setCounselInviteStatus("Comment shared privately with the person who invited you.");
    } else {
      setCounselInviteStatus(data.error || "Comment could not be shared.");
    }
  }

  async function addRuleOfLife(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const principle = ruleText.trim();
    if (!principle) {
      announceWorkflow("Write a principle first", "Add one personal rule of life before saving.", "warning");
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
        announceWorkflow("Rule of life saved", "This principle is now part of your formation record.", "success");
      }
    } else {
      setRulesOfLife((current) => [
        { id: crypto.randomUUID(), mode, principle, createdAt: new Date().toISOString() },
        ...current,
      ]);
      announceWorkflow("Rule saved locally", "This principle is saved on this device. Sign in to sync it.", "success");
    }
    setRuleText("");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef2ef] text-[#171917]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(201,177,123,0.16),transparent_24%),radial-gradient(circle_at_92%_16%,rgba(64,101,96,0.14),transparent_24%),linear-gradient(180deg,#f4f6f2_0%,#e4ebe6_100%)]" />
      <WorkflowNotice notice={workflowNotice} onClose={() => setWorkflowNotice(null)} />

      <nav className="sticky top-0 z-30 border-b border-[#c9d5cd]/70 bg-[#eef2ef]/88 px-3 py-3 backdrop-blur-xl sm:px-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <button
            className="flex min-w-0 items-center gap-3 text-left"
            onClick={() => showView("companion")}
            aria-label="Go to Aletheia home"
          >
            <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-[#c4d0c8] bg-[#eef1ea] shadow-sm">
              <Image
                src="/brand/aletheia-app-icon-192.png"
                alt=""
                fill
                sizes="44px"
                priority
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#405049] sm:tracking-[0.22em]">Aletheia</p>
              <p className="truncate text-xs text-[#66746b]">Wisdom for stewardship</p>
            </div>
          </button>

          <div className="hidden items-center gap-1 rounded-lg border border-[#c9d5cd] bg-[#fbfcf8]/72 p-1 shadow-sm md:flex">
            <NavButton active={activeView === "companion"} icon={Home} label="Home" onClick={() => showView("companion")} />
            <NavButton active={activeView === "decisions"} icon={FileText} label="Decisions" onClick={() => showView("decisions")} />
            <NavButton active={activeView === "reflect"} icon={Feather} label="Reflect" onClick={() => showView("reflect")} />
            <NavButton active={activeView === "library"} icon={BookOpen} label="Library" onClick={() => showView("library")} />
            <NavButton active={activeView === "account"} icon={Users} label="Account" onClick={() => showView("account")} />
          </div>

          <div className="flex items-center gap-2">
            {!isOnline ? (
              <span className="hidden items-center gap-2 rounded-md border border-[#d5b7a9] bg-[#fff5ef] px-3 py-2 text-xs font-medium text-[#8c3f28] sm:inline-flex">
                <WifiOff size={14} />
                Offline
              </span>
            ) : null}
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#bdcbc2] bg-[#fbfcf8]/70 px-3 text-xs font-semibold text-[#213a35] shadow-sm transition hover:bg-white"
              onClick={revealPreferences}
            >
              <Languages size={15} />
              <span className="hidden sm:inline">{languages[preferences.language].nativeName}</span>
              <span>{preferences.bibleTranslation}</span>
            </button>
            <button
              className="grid size-10 place-items-center rounded-md border border-[#bdcbc2] bg-[#fbfcf8]/70 text-[#213a35] shadow-sm transition hover:bg-white"
              aria-label={user ? "Open account" : "Open guest dashboard"}
              onClick={() => showView("companion")}
            >
              <Home size={18} />
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-4 px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 sm:py-5 lg:grid-cols-[280px_1fr] lg:py-6">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <section className="rounded-lg border border-[#c9d5cd] bg-[#fbfcf8]/76 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#866a24]">
                <ShieldCheck size={14} />
                Guardrails
              </div>
              <ul className="space-y-2 text-sm leading-6 text-[#505a52]">
                <li>Never predicts financial outcomes.</li>
                <li>Never invents scripture references.</li>
                <li>Encourages counsel for high-stakes choices.</li>
              </ul>
            </section>

            <section className="rounded-lg border border-[#c9d5cd] bg-[#203a35] p-4 text-[#f8f5e8] shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Wisdom mode</h2>
                <Moon size={17} className="text-[#d0ad55]" />
              </div>
              <div className="space-y-2">
                {modes.map((item) => (
                  <ModeButton key={item.label} item={item} active={mode === item.label} onClick={() => handleModeChange(item.label)} />
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-white/8 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d0ad55]">Current lens</p>
                <p className="mt-2 text-sm leading-6 text-[#e7eee8]">{activeMode.intent}</p>
              </div>
            </section>
          </div>
        </aside>

        <section className="min-w-0">
          <section ref={workspaceRef} className="scroll-mt-24">
            <AnimatePresence mode="wait">
              {activeView === "companion" ? (
                <Screen key="companion">
                <HomeDashboard
                  mode={mode}
                  modeProfile={activeMode}
                  daily={daily}
                  dailyEntry={dailyEntry}
                  activeDecision={activeDecision}
                  user={user}
                  notificationsEnabled={notificationsEnabled}
                  todayPattern={todayPattern}
                  onModeChange={handleModeChange}
                  onScriptureOpen={setSelectedScripture}
                  onContinueDecision={continueDecisionFlow}
                  onReflectToday={reflectOnToday}
                  onAsk={askFromDashboard}
                  onReviewPattern={reviewPatternFlow}
                  onOpenAccount={openAccountFlow}
                />
                <CompanionPanel
                  messages={messages}
                  mode={mode}
                  modeProfile={activeMode}
                  preferences={preferences}
                  copy={copy}
                  query={query}
                  setQuery={setQuery}
                  onAsk={handleAsk}
                  onPrompt={askAletheia}
                  onDraftPrompt={setQuery}
                  onListen={startVoiceInput}
                  onSpeak={speakLatestAletheiaReply}
                  isWorking={isWorking}
                  isListening={isListening}
                  isSpeaking={isSpeaking}
                  onScriptureOpen={setSelectedScripture}
                  onTrackDecision={trackDecisionFromExchange}
                  onDraftReflection={draftReflectionFromExchange}
                  onCreateCounselSummary={draftCounselSummaryFromExchange}
                  onGoDeeper={goDeeperFromExchange}
                  onWait={waitFromExchange}
                  onShare={(channel) => shareAletheia(channel, "answer")}
                  onFeedback={(value) => recordAnswerFeedback(value, "answer")}
                />
                </Screen>
              ) : null}
              {activeView === "decisions" ? (
                <Screen key="decisions">
                <DecisionCompanionPanel
                  mode={mode}
                  modeProfile={activeMode}
                  decisions={wisdomDecisions}
                  events={decisionEvents}
                  insight={timelineInsight}
                  counselContacts={counselContacts}
                  rules={rulesOfLife}
                  title={decisionTitle}
                  pressure={decisionPressure}
                  emotion={decisionEmotion}
                  counselName={counselName}
                  counselRole={counselRole}
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
                  setCounselContactValue={setCounselContactValue}
                  setCounselCanViewSummaries={setCounselCanViewSummaries}
                  setCounselCanComment={setCounselCanComment}
                  setCounselCanReceiveCheckins={setCounselCanReceiveCheckins}
                  setRuleText={setRuleText}
                  onCreateDecision={createDecision}
                  onUpdateDecision={updateDecision}
                  onAddCounsel={addCounselContact}
                  onShareCounselInvite={shareCounselInvite}
                  onShareDecisionWithCounsel={shareDecisionWithCounsel}
                  onSpeakText={speakText}
                  isSpeaking={isSpeaking}
                  onAddRule={addRuleOfLife}
                  onScriptureOpen={setSelectedScripture}
                />
                </Screen>
              ) : null}
              {activeView === "reflect" ? (
                <Screen key="reflect">
                <ReflectPanel
                  decision={decision}
                  setDecision={setDecision}
                  emotion={emotion}
                  setEmotion={setEmotion}
                  timeframe={timeframe}
                  setTimeframe={setTimeframe}
                  result={decisionResult}
                  mode={mode}
                  modeProfile={activeMode}
                  entries={journalEntries}
                  title={journalTitle}
                  body={journalBody}
                  setTitle={setJournalTitle}
                  setBody={setJournalBody}
                  onSave={saveReflection}
                  onDelete={deleteJournalEntry}
                />
                </Screen>
              ) : null}
              {activeView === "library" ? (
                <Screen key="library">
                <LibraryPanel
                  entries={filteredEntries}
                  search={librarySearch}
                  setSearch={setLibrarySearch}
                  mode={mode}
                  preferences={preferences}
                  onScriptureOpen={setSelectedScripture}
                />
                </Screen>
              ) : null}
              {activeView === "account" ? (
                <Screen key="account">
                <AccountPanel
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
                  preferencesRef={preferencesRef}
                  preferences={preferences}
                  preferencesStatus={preferencesStatus}
                  copy={copy}
                  activeRegion={activeRegion}
                  onPreferenceChange={updatePreferences}
                  notificationsEnabled={notificationsEnabled}
                  notificationsConfigured={notificationsConfigured}
                  notificationPermission={notificationPermission}
                  notificationStatus={notificationStatus}
                  onEnableNotifications={enableNotifications}
                  onDisableNotifications={disableNotifications}
                  messages={messages}
                  decisions={wisdomDecisions}
                  journalEntries={journalEntries}
                  counselContacts={counselContacts}
                  rules={rulesOfLife}
                  onShare={(channel, placement) => shareAletheia(channel, placement)}
                />
                </Screen>
              ) : null}
            </AnimatePresence>
          </section>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#c9d5cd] bg-[#fbfcf8]/95 px-2 pt-1 pb-[calc(0.45rem+env(safe-area-inset-bottom))] shadow-[0_-10px_28px_rgba(31,42,36,0.08)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          <MobileNav active={activeView === "companion"} icon={Home} label="Home" onClick={() => showView("companion")} />
          <MobileNav active={activeView === "decisions"} icon={FileText} label="Decide" onClick={() => showView("decisions")} />
          <MobileNav active={activeView === "reflect"} icon={Feather} label="Reflect" onClick={() => showView("reflect")} />
          <MobileNav active={activeView === "library"} icon={BookOpen} label="Library" onClick={() => showView("library")} />
          <MobileNav active={activeView === "account"} icon={Users} label="Account" onClick={() => showView("account")} />
        </div>
      </div>

      <OnboardingModal
        open={showOnboarding}
        mode={mode}
        preferences={preferences}
        concern={onboardingConcern}
        setConcern={setOnboardingConcern}
        tone={onboardingTone}
        setTone={setOnboardingTone}
        faithFamiliarity={faithFamiliarity}
        setFaithFamiliarity={setFaithFamiliarity}
        notificationsEnabled={notificationsEnabled}
        onModeChange={handleModeChange}
        onPreferenceChange={updatePreferences}
        onComplete={completeOnboarding}
      />
      <CounselInviteModal
        token={counselInviteToken}
        preview={counselInvitePreview}
        status={counselInviteStatus}
        onAccept={acceptCounselInvite}
        onComment={addCounselInviteComment}
        onClose={() => {
          setCounselInviteToken(null);
          setCounselInvitePreview(null);
          setCounselInviteStatus("");
        }}
      />
      <ScriptureModal scripture={selectedScripture} preferences={preferences} onClose={() => setSelectedScripture(null)} />
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

function NavButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Home; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
        active ? "bg-[#203a35] text-[#f8f5e8]" : "text-[#4f5f56] hover:bg-[#edf2ee]"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function MobileNav({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Home; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold transition ${
        active ? "bg-[#203a35] text-[#f8f5e8]" : "text-[#52635a]"
      }`}
    >
      <Icon size={17} />
      {label}
    </button>
  );
}

function ModeButton({ item, active, onClick }: { item: (typeof modes)[number]; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition ${
        active ? "border-[#d0ad55]/45 bg-white/12" : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <item.icon className="mt-0.5 shrink-0" size={17} />
      <span>
        <span className="block text-sm font-semibold">{item.label}</span>
        <span className="mt-1 block text-xs leading-5 text-[#dbe4dd]">{item.copy}</span>
      </span>
    </button>
  );
}

function WorkflowNotice({
  notice,
  onClose,
}: {
  notice: WorkflowNoticeState | null;
  onClose: () => void;
}) {
  if (!notice) {
    return null;
  }

  const toneClass: Record<WorkflowTone, string> = {
    success: "border-[#b8d0c2] bg-[#edf7f1] text-[#245443]",
    info: "border-[#c9d5cd] bg-[#fbfcf8] text-[#203a35]",
    warning: "border-[#ead8a4] bg-[#fff8dc] text-[#866a24]",
    error: "border-[#e0c3b7] bg-[#fff6f1] text-[#8c3f28]",
  };

  return (
    <div className="fixed inset-x-3 bottom-24 z-50 sm:bottom-auto sm:left-auto sm:right-4 sm:top-24 sm:w-[360px]" role="status" aria-live="polite">
      <div className={`rounded-xl border p-4 shadow-xl shadow-[#203a35]/12 backdrop-blur ${toneClass[notice.tone]}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{notice.title}</p>
            <p className="mt-1 text-sm leading-6 opacity-85">{notice.body}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-md bg-white/45 transition hover:bg-white/70"
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

function OnboardingModal({
  open,
  mode,
  preferences,
  concern,
  setConcern,
  tone,
  setTone,
  faithFamiliarity,
  setFaithFamiliarity,
  notificationsEnabled,
  onModeChange,
  onPreferenceChange,
  onComplete,
}: {
  open: boolean;
  mode: Mode;
  preferences: UserPreferences;
  concern: string;
  setConcern: (value: string) => void;
  tone: string;
  setTone: (value: string) => void;
  faithFamiliarity: string;
  setFaithFamiliarity: (value: string) => void;
  notificationsEnabled: boolean;
  onModeChange: (mode: Mode) => void;
  onPreferenceChange: (patch: Partial<UserPreferences>) => void;
  onComplete: () => void;
}) {
  if (!open) {
    return null;
  }

  const bibleOptions = bibleTranslationOptionsForLanguage(preferences.language);
  const selectedTranslation = bibleTranslations[preferences.bibleTranslation];

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#101814]/45 p-3 backdrop-blur-sm sm:place-items-center">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#c9d5cd] bg-[#fbfcf8] p-4 shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Begin quietly</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#203a35]">Make Aletheia feel like it knows your context.</h2>
            <p className="mt-2 text-sm leading-6 text-[#55645b]">
              Choose the lens and settings for your first few sessions. You can change everything later in Account.
            </p>
          </div>
          <button
            type="button"
            onClick={onComplete}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-[#c9d5cd] bg-white/78 text-[#405049] transition hover:bg-white"
            aria-label="Close onboarding"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <section>
            <p className="text-sm font-semibold text-[#203a35]">What brings you here?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {modes.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => onModeChange(item.label)}
                  className={`flex min-w-0 items-start gap-2 rounded-lg border p-3 text-left transition ${
                    mode === item.label
                      ? "border-[#203a35] bg-[#203a35] text-[#f8f5e8]"
                      : "border-[#d8e1db] bg-white/64 text-[#203a35] hover:bg-white"
                  }`}
                >
                  <item.icon className="mt-0.5 shrink-0" size={16} />
                  <span>
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className={`mt-1 line-clamp-2 block text-xs leading-5 ${mode === item.label ? "text-[#dfe8df]" : "text-[#607067]"}`}>{item.copy}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#d8e1db] bg-white/62 p-3">
            <label className="text-sm font-semibold text-[#203a35]">
              What are you seeking wisdom for?
              <textarea
                value={concern}
                onChange={(event) => setConcern(event.target.value)}
                className="mt-2 min-h-20 w-full resize-none rounded-md border border-[#c9d5cd] bg-white/78 px-3 py-2 text-sm leading-6 outline-none"
                placeholder="Money stress, a career decision, generosity pressure, purpose uncertainty, or something you are bearing..."
              />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#52635a]">
                Tone
                <select
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm normal-case tracking-normal text-[#203a35] outline-none"
                >
                  <option value="gentle">Gentle</option>
                  <option value="direct">Direct</option>
                  <option value="strategic">Strategic</option>
                  <option value="reflective">Reflective</option>
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#52635a]">
                Faith familiarity
                <select
                  value={faithFamiliarity}
                  onChange={(event) => setFaithFamiliarity(event.target.value)}
                  className="mt-2 h-10 w-full rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm normal-case tracking-normal text-[#203a35] outline-none"
                >
                  <option value="new">New to biblical wisdom</option>
                  <option value="familiar">Familiar</option>
                  <option value="deep">Deeply familiar</option>
                </select>
              </label>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#52635a]">
              Language
              <select
                value={preferences.language}
                onChange={(event) => onPreferenceChange(preferencePatchForLanguage(event.target.value as LanguageCode))}
                className="mt-2 h-10 w-full rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm normal-case tracking-normal text-[#203a35] outline-none"
              >
                {Object.entries(languages).map(([code, language]) => (
                  <option key={code} value={code}>
                    {language.nativeName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#52635a]">
              Bible
              <select
                value={preferences.bibleTranslation}
                onChange={(event) => onPreferenceChange({ bibleTranslation: event.target.value as BibleTranslation })}
                className="mt-2 h-10 w-full rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm normal-case tracking-normal text-[#203a35] outline-none"
              >
                {bibleOptions.map((code) => {
                  const translation = bibleTranslations[code];
                  return (
                  <option key={code} value={code}>
                    {translation.language === preferences.language ? "Available" : "English fallback"} · {code} - {translation.label}
                  </option>
                  );
                })}
              </select>
              <span className="mt-1 block text-[11px] normal-case leading-4 tracking-normal text-[#718077]">
                {selectedTranslation?.note}
              </span>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#52635a]">
              Region
              <select
                value={preferences.region}
                onChange={(event) => onPreferenceChange({ region: event.target.value as RegionCode })}
                className="mt-2 h-10 w-full rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm normal-case tracking-normal text-[#203a35] outline-none"
              >
                {Object.entries(regions).map(([code, region]) => (
                  <option key={code} value={code}>
                    {region.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="rounded-lg border border-[#d8e1db] bg-white/62 p-3">
            <p className="text-sm font-semibold text-[#203a35]">Account and notifications live in Account.</p>
            <p className="mt-1 text-sm leading-6 text-[#607067]">
              After you enter Aletheia, use the Account tab to sign in, sync your history, and turn on daily wisdom notifications.
            </p>
            <p className="mt-2 text-xs leading-5 text-[#718077]">
              {notificationsEnabled ? "Notifications are already enabled on this device." : "Notifications are optional and can be enabled only after sign-in."}
            </p>
          </section>

          <InstallGuideCard compact />
        </div>

        <button
          type="button"
          onClick={onComplete}
          className="mt-5 h-11 w-full rounded-md bg-[#203a35] px-4 text-sm font-semibold text-[#f8f5e8] shadow-lg shadow-[#203a35]/15"
        >
          Enter Aletheia
        </button>
      </section>
    </div>
  );
}

function HomeDashboard({
  mode,
  modeProfile,
  daily,
  dailyEntry,
  activeDecision,
  user,
  notificationsEnabled,
  todayPattern,
  onModeChange,
  onScriptureOpen,
  onContinueDecision,
  onReflectToday,
  onAsk,
  onReviewPattern,
  onOpenAccount,
}: {
  mode: Mode;
  modeProfile: ModeProfile;
  daily: ReturnType<typeof localizedDailyWisdom>;
  dailyEntry: WisdomEntry;
  activeDecision: WisdomDecision | null;
  user: User | null;
  notificationsEnabled: boolean;
  todayPattern: string;
  onModeChange: (mode: Mode) => void;
  onScriptureOpen: (scripture: string) => void;
  onContinueDecision: () => void;
  onReflectToday: () => void;
  onAsk: () => void;
  onReviewPattern: () => void;
  onOpenAccount: () => void;
}) {
  const primaryAction = activeDecision
    ? { label: "Continue a decision", body: activeDecision.title, onClick: onContinueDecision }
    : { label: "Start a decision", body: "Name one choice that deserves prayer, facts, counsel, and time.", onClick: onContinueDecision };

  const secondaryAction = user && notificationsEnabled
    ? { label: "Review a pattern", body: todayPattern, onClick: onReviewPattern }
    : { label: user ? "Enable notifications" : "Enable sync", body: user ? "Receive one quiet daily wisdom prompt." : "Sign in to keep decisions and reflections across devices.", onClick: onOpenAccount };

  return (
    <div className="mb-4 grid gap-3 sm:mb-5 sm:gap-4 xl:grid-cols-[1fr_360px]">
      <section className="min-w-0 rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm sm:p-5">
        <div className="mb-4 inline-flex w-fit max-w-full items-center gap-2 rounded-md border border-[#c0cec5] bg-white/60 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#866a24] sm:text-xs sm:tracking-[0.18em]">
          <Sparkles size={14} />
          Today in Aletheia
        </div>
        <h1 className="max-w-3xl text-[2rem] font-semibold leading-[1.08] tracking-normal text-[#171917] sm:text-5xl sm:leading-tight">
          What should I do next?
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#505a52] sm:text-base sm:leading-7">
          A calm path for today: continue what matters, reflect before reacting, or ask one honest question.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <DashboardAction icon={Compass} label={primaryAction.label} body={primaryAction.body} primary onClick={primaryAction.onClick} />
          <DashboardAction icon={Feather} label="Reflect on today" body={daily.practice} onClick={onReflectToday} />
          <DashboardAction icon={MessageCircle} label="Ask Aletheia" body={`${mode} mode is focused on ${modeProfile.focus.toLowerCase()}.`} onClick={onAsk} />
          <DashboardAction icon={ShieldCheck} label={secondaryAction.label} body={secondaryAction.body} onClick={secondaryAction.onClick} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 lg:hidden">
          {modes.map((item) => (
            <button
              key={item.label}
              onClick={() => onModeChange(item.label)}
              className={`flex min-w-0 items-center gap-2 rounded-md border px-2 py-2 text-left text-xs font-semibold sm:text-sm ${
                mode === item.label
                  ? "border-[#203a35] bg-[#203a35] text-[#f8f5e8]"
                  : "border-[#c9d5cd] bg-white/62 text-[#405049]"
              }`}
            >
              <item.icon className="shrink-0" size={15} />
              <span className="min-w-0">
                <span className="block">{item.label}</span>
                <span className={`mt-0.5 block truncate text-[10px] font-medium ${mode === item.label ? "text-[#dfe8df]" : "text-[#6d7a71]"}`}>
                  {modeProfiles[item.label].intent}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="min-w-0 rounded-xl border border-[#c9d5cd] bg-[#203a35] p-4 text-[#f8f5e8] shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d0ad55]">{daily.label}</p>
            <h2 className="mt-1 text-xl font-semibold">{daily.theme}</h2>
          </div>
          <Sprout size={22} />
        </div>
        <button
          type="button"
          onClick={() => onScriptureOpen(dailyEntry.scripture)}
          className="text-left text-sm font-semibold text-[#f3e8bd] underline decoration-[#d0ad55]/50 underline-offset-4 transition hover:text-white"
        >
          {daily.scripture}
        </button>
        <p className="mt-3 text-sm leading-6 text-[#e7eee8]">{daily.principle}</p>
        <div className="mt-3 rounded-md border border-white/10 bg-white/7 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d0ad55]">Tiny practice</p>
          <p className="mt-2 text-sm leading-6 text-[#edf4ee]">{daily.practice}</p>
        </div>
        <div className="mt-3 rounded-md border border-white/10 bg-white/7 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d0ad55]">Mode lens</p>
          <p className="mt-2 text-sm leading-6 text-[#edf4ee]">
            {mode} mode is focusing on {modeProfile.lens.toLowerCase()}
          </p>
        </div>
      </section>
    </div>
  );
}

function DashboardAction({
  icon: Icon,
  label,
  body,
  primary = false,
  onClick,
}: {
  icon: typeof Compass;
  label: string;
  body: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 items-start gap-3 rounded-lg border p-3 text-left transition ${
        primary
          ? "border-[#203a35] bg-[#203a35] text-[#f8f5e8] shadow-lg shadow-[#203a35]/12"
          : "border-[#d8e1db] bg-white/62 text-[#203a35] hover:border-[#203a35] hover:bg-white"
      }`}
    >
      <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-md ${primary ? "bg-white/10 text-[#d0ad55]" : "bg-[#edf2ee] text-[#203a35]"}`}>
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className={`mt-1 line-clamp-2 block text-xs leading-5 ${primary ? "text-[#dfe8df]" : "text-[#607067]"}`}>{body}</span>
      </span>
    </button>
  );
}

function RhythmItem({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-lg border border-[#d8e1db] bg-white/62 p-3">
      <p className="text-sm font-semibold text-[#203a35]">{label}</p>
      <p className="mt-1 text-xs leading-5 text-[#607067]">{body}</p>
    </div>
  );
}

function ContextualNextAction({
  eyebrow,
  title,
  body,
  actionLabel,
  onAction,
}: {
  eyebrow: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold text-[#203a35]">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#55645b]">{body}</p>
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="h-10 rounded-md bg-[#203a35] px-4 text-sm font-semibold text-[#f8f5e8] shadow-sm"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function AccountPanel({
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
  preferencesRef,
  preferences,
  preferencesStatus,
  copy,
  activeRegion,
  onPreferenceChange,
  notificationsEnabled,
  notificationsConfigured,
  notificationPermission,
  notificationStatus,
  onEnableNotifications,
  onDisableNotifications,
  messages,
  decisions,
  journalEntries,
  counselContacts,
  rules,
  onShare,
}: {
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
  preferencesRef: RefObject<HTMLElement | null>;
  preferences: UserPreferences;
  preferencesStatus: string;
  copy: (typeof languageCopy)[LanguageCode];
  activeRegion: (typeof regions)[RegionCode];
  onPreferenceChange: (patch: Partial<UserPreferences>) => void;
  notificationsEnabled: boolean;
  notificationsConfigured: boolean;
  notificationPermission: NotificationPermission;
  notificationStatus: string;
  onEnableNotifications: () => void;
  onDisableNotifications: () => void;
  messages: ChatMessage[];
  decisions: WisdomDecision[];
  journalEntries: JournalEntry[];
  counselContacts: CounselContact[];
  rules: RuleOfLife[];
  onShare: (channel: ShareChannel, placement: string) => void;
}) {
  const exchanges = conversationExchanges(messages).filter((exchange) => exchange.question);
  const badges = [
    { label: "First reflection saved", active: journalEntries.length > 0 },
    { label: "First decision tracked", active: decisions.length > 0 },
    { label: "Sought counsel", active: counselContacts.length > 0 || decisions.some((decision) => decision.counselSought) },
    { label: "Waiting mode used", active: decisions.some((decision) => Boolean(decision.waitingUntil)) },
    { label: "Rule of life created", active: rules.length > 0 },
    { label: "Notifications enabled", active: notificationsEnabled },
    { label: "7 days of wisdom practice", active: false },
  ];
  const hasFormationMilestone = badges.some((badge) => badge.active);
  const accountNextTitle = user
    ? notificationsEnabled
      ? "Review sync and formation"
      : "Enable daily wisdom notifications"
    : "Sign in to make Aletheia portable";
  const accountNextBody = user
    ? notificationsEnabled
      ? "Your account is active. Review preferences, history, and formation milestones when you need to."
      : "Sync is active. Turn on one quiet daily wisdom prompt if this device should receive it."
    : "Use Google or email to sync decisions, reflections, preferences, counsel, and notifications across devices.";

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_340px]">
      <section className="space-y-4">
        <ContextualNextAction
          eyebrow="Next in Account"
          title={accountNextTitle}
          body={accountNextBody}
        />
        <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Account</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#203a35]">Your Aletheia space</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#55645b]">
            Manage sign-in, sync, language, notifications, history, and formation milestones without crowding the wisdom companion.
          </p>
        </section>

        <AccountStatusCard
          user={user}
          authStatus={authStatus}
          notificationsEnabled={notificationsEnabled}
          notificationStatus={notificationStatus}
          onLogout={onLogout}
        />

        <AuthPanel
          user={user}
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
          onLogout={onLogout}
        />

        <PreferencesPanel
          panelRef={preferencesRef}
          preferences={preferences}
          status={preferencesStatus}
          copy={copy}
          activeRegion={activeRegion}
          onChange={onPreferenceChange}
        />

        <NotificationPanel
          user={user}
          enabled={notificationsEnabled}
          configured={notificationsConfigured}
          permission={notificationPermission}
          status={notificationStatus}
          onEnable={onEnableNotifications}
          onDisable={onDisableNotifications}
        />

        <InstallGuideCard />

        <ShareInviteCard placement="account" onShare={onShare} />
      </section>

      <aside className="space-y-4">
        <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">History</p>
          <div className="mt-3 grid gap-3">
            <AccountStat label="Conversations" value={String(exchanges.length)} />
            <AccountStat label="Decisions" value={String(decisions.length)} />
            <AccountStat label="Journal entries" value={String(journalEntries.length)} />
          </div>
          {!exchanges.length && !decisions.length && !journalEntries.length ? (
            <p className="mt-3 rounded-lg border border-dashed border-[#c9d5cd] p-3 text-sm leading-6 text-[#607067]">
              Start with one honest question or one decision under pressure. Aletheia will keep the record quiet and useful.
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-[#c9d5cd] bg-[#203a35] p-4 text-[#f8f5e8] shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d0ad55]">Badges / Formation</p>
          <div className="mt-3 space-y-2">
            {badges.map((badge) => (
              <div
                key={badge.label}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  badge.active
                    ? "border-[#d0ad55]/35 bg-white/10 text-[#f8f5e8]"
                    : "border-white/10 bg-white/5 text-[#b8c8bd]"
                }`}
              >
                <Check size={15} className={badge.active ? "text-[#d0ad55]" : "text-[#7d8b83]"} />
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-[#cddbd1]">
            These are quiet signs of formation, not points to chase. The first milestone usually begins with saving one reflection.
          </p>
          {hasFormationMilestone ? (
            <ShareMilestonePrompt onShare={(channel) => onShare(channel, "milestone")} />
          ) : null}
        </section>
      </aside>
    </div>
  );
}

function AccountStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d8e1db] bg-white/64 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#718077]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#203a35]">{value}</p>
    </div>
  );
}

function InstallGuideCard({ compact = false }: { compact?: boolean }) {
  const [installState, setInstallState] = useState({
    standalone: false,
    platform: "desktop" as "ios" | "android" | "desktop",
  });

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
    <section className={`rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 shadow-sm ${compact ? "p-3" : "p-4 sm:p-5"}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-[#edf2ee] text-[#203a35]">
          <Home size={17} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#203a35]">
            {installState.standalone ? "Aletheia is installed on this device" : "Install Aletheia on your home screen"}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#5b6a61]">
            {installState.standalone
              ? "You are already using the app-like experience."
              : "Turn the website into an app icon so it opens full-screen and feels native."}
          </p>
        </div>
      </div>
      {!installState.standalone ? (
        <ol className={`mt-3 grid gap-2 text-sm leading-6 text-[#55645b] ${compact ? "" : "sm:grid-cols-3"}`}>
          {steps.map((step, index) => (
            <li key={step} className="rounded-lg border border-[#d8e1db] bg-white/64 p-3">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[#866a24]">Step {index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      ) : null}
      <p className="mt-3 text-xs leading-5 text-[#718077]">
        On iPhone and iPad, daily web push notifications are most reliable after Aletheia is added to the Home Screen.
      </p>
    </section>
  );
}

function ShareInviteCard({
  placement,
  onShare,
}: {
  placement: string;
  onShare: (channel: ShareChannel, placement: string) => void;
}) {
  return (
    <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-[#edf2ee] text-[#203a35]">
          <Share2 size={17} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#203a35]">Invite someone</p>
          <p className="mt-1 text-sm leading-6 text-[#5b6a61]">
            Invite someone who may need wisdom for money, work, or stewardship.
          </p>
          <p className="mt-1 text-xs leading-5 text-[#718077]">
            This shares only the Aletheia app link, not your private questions or reflections.
          </p>
        </div>
      </div>
      <ShareActions placement={placement} onShare={onShare} />
    </section>
  );
}

function ShareMilestonePrompt({ onShare }: { onShare: (channel: ShareChannel) => void }) {
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-white/8 p-3">
      <p className="text-sm font-semibold text-[#f8f5e8]">Know someone making a major decision?</p>
      <p className="mt-1 text-xs leading-5 text-[#cddbd1]">
        You can invite them to Aletheia without sharing anything private from your account.
      </p>
      <button
        type="button"
        onClick={() => onShare("native")}
        className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-[#f8f5e8] px-3 text-xs font-semibold text-[#203a35]"
      >
        <Share2 size={14} />
        Share Aletheia
      </button>
    </div>
  );
}

function ShareActions({
  placement,
  onShare,
}: {
  placement: string;
  onShare: (channel: ShareChannel, placement: string) => void;
}) {
  const platforms: { label: string; channel: ShareChannel }[] = [
    { label: "WhatsApp", channel: "whatsapp" },
    { label: "Facebook", channel: "facebook" },
    { label: "X / Twitter", channel: "x" },
    { label: "LinkedIn", channel: "linkedin" },
    { label: "Email", channel: "email" },
    { label: "SMS", channel: "sms" },
  ];

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onShare("native", placement)}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-[#203a35] px-3 text-xs font-semibold text-[#f8f5e8] shadow-sm"
      >
        <Share2 size={14} />
        Share Aletheia
      </button>
      <button
        type="button"
        onClick={() => onShare("copy", placement)}
        className="h-9 rounded-md border border-[#c9d5cd] bg-white/70 px-3 text-xs font-semibold text-[#405049] transition hover:bg-white"
      >
        Copy link
      </button>
      {platforms.map((platform) => (
        <a
          key={platform.channel}
          href={sharePlatformUrl(platform.channel)}
          target={platform.channel === "email" || platform.channel === "sms" ? undefined : "_blank"}
          rel={platform.channel === "email" || platform.channel === "sms" ? undefined : "noreferrer"}
          onClick={() => onShare(platform.channel, placement)}
          className="inline-flex h-9 items-center rounded-md border border-[#c9d5cd] bg-white/70 px-3 text-xs font-semibold text-[#405049] transition hover:bg-white"
        >
          {platform.label}
        </a>
      ))}
    </div>
  );
}

function AccountStatusCard({
  user,
  authStatus,
  notificationsEnabled,
  notificationStatus,
  onLogout,
}: {
  user: User | null;
  authStatus: AuthStatus;
  notificationsEnabled: boolean;
  notificationStatus: string;
  onLogout: () => void;
}) {
  const signedIn = Boolean(user);
  return (
    <section className="rounded-xl border border-[#c9d5cd] bg-white/70 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Profile</p>
          <h3 className="mt-2 text-xl font-semibold text-[#203a35]">
            {signedIn ? `Signed in as ${user?.name || user?.email}` : "Guest mode"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#55645b]">
            {signedIn
              ? "Sync is active for decisions, reflections, counsel, rules, and preferences."
              : "Sign in to sync your wisdom history across devices and enable daily notifications."}
          </p>
        </div>
        {signedIn ? (
          <button
            type="button"
            onClick={onLogout}
            disabled={authStatus === "signing-out"}
            className="h-10 rounded-md border border-[#c9d5cd] bg-[#fbfcf8]/78 px-4 text-sm font-semibold text-[#405049] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {authStatus === "signing-out" ? "Signing out..." : "Sign out"}
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <AccountSignal label="Sync" value={signedIn ? "Active" : "Guest only"} active={signedIn} />
        <AccountSignal label="Last synced" value={signedIn ? "This session" : "Not synced"} active={signedIn} />
        <AccountSignal label="Notifications" value={notificationsEnabled ? "Enabled" : notificationStatus} active={notificationsEnabled} />
      </div>
    </section>
  );
}

function AccountSignal({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${active ? "border-[#b8d0c2] bg-[#edf7f1]" : "border-[#d8e1db] bg-[#fbfcf8]/78"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#718077]">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-5 text-[#203a35]">{value}</p>
    </div>
  );
}

function AuthPanel({
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
}: {
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
}) {
  const authBusy = isWorking || authStatus === "checking" || authStatus === "signing-in" || authStatus === "signing-out";
  const statusLabel =
    authStatus === "checking"
      ? "Checking session"
      : authStatus === "signing-in"
        ? "Signing in"
        : authStatus === "signing-out"
          ? "Signing out"
          : user
            ? "Signed in"
            : "Guest";

  return (
    <section className="mb-5 rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Account</p>
        <span
          className={`rounded-md px-2 py-1 text-xs font-semibold ${
            user
              ? "bg-[#edf7f1] text-[#245443]"
              : authBusy
                ? "bg-[#fff8dc] text-[#866a24]"
                : "bg-[#edf2ee] text-[#52635a]"
          }`}
        >
          {statusLabel}
        </span>
      </div>
      {notice ? (
        <div
          role="status"
          className="mb-3 rounded-lg border border-[#b8d0c2] bg-[#edf7f1] px-3 py-2 text-sm font-medium leading-6 text-[#245443]"
        >
          {notice}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="mb-3 rounded-lg border border-[#e0c3b7] bg-[#fff6f1] px-3 py-2 text-sm font-medium leading-6 text-[#8c3f28]"
        >
          {error}
        </div>
      ) : null}
      {user ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#203a35]">
              Signed in as {user.name || user.email}
            </p>
            <p className="mt-1 text-sm leading-6 text-[#5b6a61]">{status}</p>
          </div>
          <button
            onClick={onLogout}
            disabled={authBusy}
            className="h-10 rounded-md border border-[#c9d5cd] bg-white/70 px-4 text-sm font-semibold text-[#405049] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {authStatus === "signing-out" ? "Signing out..." : "Sign out"}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold text-[#203a35]">
              Sign in for sync
            </p>
            <p className="mt-1 text-sm leading-6 text-[#5b6a61]">
              {status} {googleAuthAvailable ? "Use Google or email." : "Use email to continue."} Password sessions use httpOnly cookies.
            </p>
          </div>
          <div className="grid gap-3">
            {googleAuthAvailable ? (
              <>
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  disabled={authBusy}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-[#c9d5cd] bg-white/78 px-4 text-sm font-semibold text-[#203a35] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authStatus === "signing-in" ? "Opening Google..." : "Continue with Google"}
                </button>
                <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#718077]">
                  <span className="h-px flex-1 bg-[#d8e1db]" />
                  Email
                  <span className="h-px flex-1 bg-[#d8e1db]" />
                </div>
              </>
            ) : null}
            <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            {authMode === "register" ? (
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-10 rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm outline-none focus:border-[#203a35]"
                placeholder="Name"
              />
            ) : null}
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm outline-none focus:border-[#203a35]"
              placeholder="Email"
              type="email"
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm outline-none focus:border-[#203a35]"
              placeholder="Password"
              type="password"
            />
            <button
              disabled={authBusy}
              className="h-10 rounded-md bg-[#203a35] px-4 text-sm font-semibold text-[#f8f5e8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authStatus === "signing-in" ? "Working..." : authMode === "register" ? "Create" : "Sign in"}
            </button>
            <div className="sm:col-span-full flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === "register" ? "login" : "register")}
                className="text-sm font-semibold text-[#405049] underline-offset-4 hover:underline"
              >
                {authMode === "register" ? "I already have an account" : "Create a new account"}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function NotificationPanel({
  user,
  enabled,
  configured,
  permission,
  status,
  onEnable,
  onDisable,
}: {
  user: User | null;
  enabled: boolean;
  configured: boolean;
  permission: NotificationPermission;
  status: string;
  onEnable: () => void;
  onDisable: () => void;
}) {
  const unsupported =
    typeof window !== "undefined" &&
    (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window));
  const disabled = !user || !configured || unsupported || permission === "denied";

  return (
    <section className="mb-5 rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-[#edf2ee] text-[#203a35]">
            <Bell size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#203a35]">Daily wisdom notifications</p>
            <p className="mt-1 text-sm leading-6 text-[#5b6a61]">
              {status}
            </p>
          </div>
        </div>
        {enabled ? (
          <button
            onClick={onDisable}
            className="h-10 rounded-md border border-[#c9d5cd] bg-white/70 px-4 text-sm font-semibold text-[#405049] transition hover:bg-white"
          >
            Turn off
          </button>
        ) : (
          <button
            onClick={onEnable}
            disabled={disabled}
            className="h-10 rounded-md bg-[#203a35] px-4 text-sm font-semibold text-[#f8f5e8] transition hover:bg-[#284b43] disabled:cursor-not-allowed disabled:opacity-55"
          >
            Enable
          </button>
        )}
      </div>
    </section>
  );
}

function ScriptureModal({
  scripture,
  preferences,
  onClose,
}: {
  scripture: string | null;
  preferences: UserPreferences;
  onClose: () => void;
}) {
  if (!scripture) {
    return null;
  }

  const quickRead = localizedScriptureRead(scripture, preferences);
  const selectedLanguage = languages[preferences.language] ?? languages.en;
  const wisdomEntry = wisdomEntries.find((entry) => entry.scripture === scripture);
  const isLocalized = quickRead.availableLanguage === preferences.language;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#101814]/45 p-3 backdrop-blur-sm sm:place-items-center">
      <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#c9d5cd] bg-[#fbfcf8] p-4 shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Scripture quick read</p>
            <h2 className="mt-2 text-xl font-semibold text-[#203a35]">{scripture}</h2>
            <p className="mt-1 text-sm text-[#607067]">
              {quickRead.label} · {quickRead.translation}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-[#c9d5cd] bg-white/78 text-[#405049] transition hover:bg-white"
            aria-label="Close scripture quick read"
          >
            <X size={17} />
          </button>
        </div>
        <p className="mt-4 rounded-lg border border-[#d8e1db] bg-white/70 p-4 text-sm leading-7 text-[#303832]">
          {quickRead.text}
        </p>
        {!isLocalized ? (
          <p className="mt-3 rounded-lg border border-[#d8e1db] bg-[#f4f6ef] p-3 text-xs leading-5 text-[#607067]">
            A public-domain {selectedLanguage.name} reading is not available for this passage yet, so Aletheia is showing the safest curated reading available and keeping the reference exact.
          </p>
        ) : null}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-[#d8e1db] bg-white/64 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Context</p>
            <p className="mt-2 text-sm leading-6 text-[#505a52]">
              {wisdomEntry?.context ?? "This reference is shown because it belongs to Aletheia’s curated wisdom library."}
            </p>
          </div>
          <div className="rounded-lg border border-[#d8e1db] bg-white/64 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Why it matters here</p>
            <p className="mt-2 text-sm leading-6 text-[#505a52]">
              {wisdomEntry?.application ?? "Use it as a wisdom anchor, not as a prediction or pressure tactic."}
            </p>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-[#d8e1db] bg-[#203a35] p-4 text-[#f8f5e8]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d0ad55]">Related principle</p>
          <p className="mt-2 text-sm leading-6 text-[#edf4ee]">
            {wisdomEntry?.principle ?? "Aletheia only surfaces known references and avoids invented verse text."}
          </p>
        </div>
        <p className="mt-3 text-xs leading-5 text-[#718077]">
          When Aletheia has a curated public-domain reading in your chosen translation, it shows that reading. Otherwise it uses a concise, clearly marked wisdom summary and keeps the reference exact.
        </p>
      </section>
    </div>
  );
}

function CounselInviteModal({
  token,
  preview,
  status,
  onAccept,
  onComment,
  onClose,
}: {
  token: string | null;
  preview: CounselInvitePreview | null;
  status: string;
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
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#0d1714]/42 p-3 backdrop-blur-sm sm:place-items-center">
      <section className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#c9d5cd] bg-[#fbfcf8] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#866a24]">Private Counsel Invite</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#203a35]">
              {preview ? `Counsel request for ${preview.invite.name}` : "Opening invite..."}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#607067]">
              This link never gives access to private chats, journals, or unshared decisions. You only see summaries intentionally shared with you.
            </p>
          </div>
          <button className="grid size-9 place-items-center rounded-md border border-[#c9d5cd]" onClick={onClose} aria-label="Close invite">
            <X size={17} />
          </button>
        </div>

        {status ? <p className="mt-4 rounded-lg border border-[#d8e1db] bg-white/70 p-3 text-sm text-[#405049]">{status}</p> : null}

        {preview ? (
          <>
            <div className="mt-4 grid gap-2 rounded-xl border border-[#d8e1db] bg-white/70 p-4 text-sm text-[#405049]">
              <p>
                <span className="font-semibold text-[#203a35]">Role:</span> {preview.invite.role}
              </p>
              <p>
                <span className="font-semibold text-[#203a35]">Status:</span> {accepted ? "Accepted" : "Waiting for acceptance"}
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-xs font-semibold uppercase tracking-[0.08em]">
                {preview.invite.permissions.canViewSummaries ? <span className="rounded bg-[#edf2ee] px-2 py-1">summaries only</span> : null}
                {preview.invite.permissions.canCommentOnDecisions ? <span className="rounded bg-[#edf2ee] px-2 py-1">comments allowed</span> : null}
                {preview.invite.permissions.canReceiveCheckins ? <span className="rounded bg-[#edf2ee] px-2 py-1">waiting check-ins</span> : null}
              </div>
            </div>

            {!accepted ? (
              <button className="mt-4 h-11 w-full rounded-lg bg-[#203a35] px-4 text-sm font-semibold text-[#f8f5e8]" onClick={onAccept}>
                Accept private counsel invite
              </button>
            ) : (
              <div className="mt-4 space-y-3">
                {preview.sharedDecisions.map((decision) => (
                  <article key={decision.id} className="rounded-xl border border-[#d8e1db] bg-white/72 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#203a35]">{decision.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#718077]">
                          {decision.mode} · readiness {decision.readiness}/100
                        </p>
                      </div>
                      <span className="w-fit rounded-md bg-[#edf2ee] px-2 py-1 text-xs font-semibold text-[#405049]">{decision.status}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#55645b]">
                      {decision.summary || "The user shared this decision, but a summary has not been generated yet."}
                    </p>
                    {decision.comments.length ? (
                      <div className="mt-3 space-y-2">
                        {decision.comments.map((comment) => (
                          <p key={comment.id} className="rounded-lg border border-[#d8e1db] bg-[#fbfcf8] p-3 text-sm leading-6 text-[#405049]">
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
                          className="min-h-24 resize-none rounded-lg border border-[#c9d5cd] bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#203a35]"
                          placeholder="Offer counsel, questions, or cautions for this shared decision."
                        />
                        <button className="h-10 rounded-md bg-[#203a35] px-3 text-sm font-semibold text-[#f8f5e8]">Send private comment</button>
                      </form>
                    ) : null}
                  </article>
                ))}
                {!preview.sharedDecisions.length ? (
                  <p className="rounded-xl border border-dashed border-[#c9d5cd] p-4 text-sm leading-6 text-[#607067]">
                    No decision summaries have been shared with this invite yet.
                  </p>
                ) : null}
              </div>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}

function PreferencesPanel({
  panelRef,
  preferences,
  status,
  copy,
  activeRegion,
  onChange,
}: {
  panelRef: RefObject<HTMLElement | null>;
  preferences: UserPreferences;
  status: string;
  copy: (typeof languageCopy)[LanguageCode];
  activeRegion: (typeof regions)[RegionCode];
  onChange: (patch: Partial<UserPreferences>) => void;
}) {
  const bibleOptions = bibleTranslationOptionsForLanguage(preferences.language);
  const selectedTranslation = bibleTranslations[preferences.bibleTranslation];

  return (
    <section ref={panelRef} className="mb-5 scroll-mt-24 rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-[#edf2ee] text-[#203a35]">
            <Languages size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#203a35]">Language and region</p>
            <p className="mt-1 text-sm leading-6 text-[#5b6a61]">{copy.onboarding}</p>
            <p className="mt-2 text-xs leading-5 text-[#718077]">{status}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#52635a]">
            Language
            <select
              value={preferences.language}
              onChange={(event) => onChange(preferencePatchForLanguage(event.target.value as LanguageCode))}
              className="mt-2 h-10 w-full rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm normal-case tracking-normal text-[#203a35] outline-none"
            >
              {Object.entries(languages).map(([code, language]) => (
                <option key={code} value={code}>
                  {language.nativeName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#52635a]">
            Region
            <select
              value={preferences.region}
              onChange={(event) => onChange({ region: event.target.value as RegionCode })}
              className="mt-2 h-10 w-full rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm normal-case tracking-normal text-[#203a35] outline-none"
            >
              {Object.entries(regions).map(([code, region]) => (
                <option key={code} value={code}>
                  {region.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#52635a]">
            Bible
            <select
              value={preferences.bibleTranslation}
              onChange={(event) => onChange({ bibleTranslation: event.target.value as BibleTranslation })}
              className="mt-2 h-10 w-full rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm normal-case tracking-normal text-[#203a35] outline-none"
            >
              {bibleOptions.map((code) => {
                const translation = bibleTranslations[code];
                return (
                <option key={code} value={code}>
                  {translation.language === preferences.language ? "Available" : "English fallback"} · {code} - {translation.label}
                </option>
                );
              })}
            </select>
            <span className="mt-1 block text-[11px] normal-case leading-4 tracking-normal text-[#718077]">
              {selectedTranslation?.note}
            </span>
          </label>
          <label className="flex h-full items-end gap-2 rounded-md border border-[#d8e1db] bg-white/54 px-3 py-2 text-sm font-semibold text-[#405049]">
            <input
              type="checkbox"
              checked={preferences.voiceEnabled}
              onChange={(event) => onChange({ voiceEnabled: event.target.checked })}
              className="size-4 accent-[#203a35]"
            />
            Voice controls
          </label>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-xs leading-5 text-[#607067] md:grid-cols-3">
        <p className="rounded-md border border-[#d8e1db] bg-white/50 p-3">{copy.translationFallback}</p>
        <p className="rounded-md border border-[#d8e1db] bg-white/50 p-3">{copy.regionHint}</p>
        <p className="rounded-md border border-[#d8e1db] bg-white/50 p-3">
          <Globe2 className="mr-1 inline align-[-2px]" size={14} />
          {activeRegion.example}
        </p>
      </div>
    </section>
  );
}

function CompanionPanel({
  messages,
  mode,
  modeProfile,
  preferences,
  copy,
  query,
  setQuery,
  onAsk,
  onPrompt,
  onDraftPrompt,
  onListen,
  onSpeak,
  onScriptureOpen,
  onTrackDecision,
  onDraftReflection,
  onCreateCounselSummary,
  onGoDeeper,
  onWait,
  onShare,
  onFeedback,
  isWorking,
  isListening,
  isSpeaking,
}: {
  messages: ChatMessage[];
  mode: Mode;
  modeProfile: ModeProfile;
  preferences: UserPreferences;
  copy: (typeof languageCopy)[LanguageCode];
  query: string;
  setQuery: (value: string) => void;
  onAsk: (event: FormEvent<HTMLFormElement>) => void;
  onPrompt: (value: string) => void | Promise<void>;
  onDraftPrompt: (value: string) => void;
  onListen: () => void;
  onSpeak: () => void;
  onScriptureOpen: (scripture: string) => void;
  onTrackDecision: (exchange: ConversationExchange) => void;
  onDraftReflection: (exchange: ConversationExchange) => void;
  onCreateCounselSummary: (exchange: ConversationExchange) => void;
  onGoDeeper: (exchange: ConversationExchange) => void;
  onWait: (exchange: ConversationExchange) => void;
  onShare: (channel: ShareChannel) => void;
  onFeedback: (value: string) => void;
  isWorking: boolean;
  isListening: boolean;
  isSpeaking: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const exchanges = conversationExchanges(messages);
  const currentExchange = exchanges[exchanges.length - 1] ?? null;
  const history = exchanges.slice(0, -1).reverse();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_320px]">
      <section ref={panelRef} className="min-w-0 scroll-mt-24 rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#d8e1db] px-3 py-3 sm:px-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-[#203a35]">
              <MessageCircle size={18} />
              Wisdom Companion
            </div>
            <p className="mt-1 text-sm leading-5 text-[#5a685f]">{modeProfile.intent}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="w-fit rounded-md bg-[#edf2ee] px-2 py-1 text-xs font-semibold text-[#52635a]">{mode} lens</span>
            <span className="w-fit rounded-md bg-[#f5edda] px-2 py-1 text-xs font-semibold text-[#72591f]">
              {languages[preferences.language].nativeName} · {preferences.bibleTranslation}
            </span>
          </div>
        </div>

        <div className="max-h-[620px] space-y-4 overflow-y-auto p-3 sm:p-4">
          {currentExchange ? (
            <CurrentCounselCard
              exchange={currentExchange}
              mode={mode}
              modeProfile={modeProfile}
              isWorking={isWorking}
              onScriptureOpen={onScriptureOpen}
              onTrackDecision={onTrackDecision}
              onDraftReflection={onDraftReflection}
              onCreateCounselSummary={onCreateCounselSummary}
              onGoDeeper={onGoDeeper}
              onWait={onWait}
              onShare={onShare}
              onFeedback={onFeedback}
            />
          ) : null}

          {history.length ? (
            <section className="rounded-xl border border-[#d8e1db] bg-white/58 p-3 sm:p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Conversation history</p>
                  <p className="mt-1 text-sm leading-6 text-[#607067]">
                    Older counsel is kept quiet so the current question stays clear.
                  </p>
                </div>
                <span className="w-fit rounded-md bg-[#edf2ee] px-2 py-1 text-xs font-semibold text-[#52635a]">
                  {history.length} saved
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {history.map((exchange) => (
                  <HistoryExchange
                    key={exchange.id}
                    exchange={exchange}
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
              </div>
            </section>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onAsk} className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 border-t border-[#d8e1db] bg-[#fbfcf8]/94 p-3 backdrop-blur md:bottom-0">
          <div className="flex flex-col gap-2 sm:flex-row">
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`${copy.askPlaceholder} ${modeProfile.focus.toLowerCase()}...`}
              className="min-h-20 flex-1 resize-none rounded-lg border border-[#c9d5cd] bg-white/80 px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-[#8b968e] focus:border-[#203a35]"
            />
            {preferences.voiceEnabled ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                <button
                  type="button"
                  onClick={onListen}
                  className="grid h-11 place-items-center rounded-lg border border-[#c9d5cd] bg-white/78 px-3 text-[#203a35] transition hover:bg-white"
                  aria-label="Use voice input"
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button
                  type="button"
                  onClick={onSpeak}
                  className="grid h-11 place-items-center rounded-lg border border-[#c9d5cd] bg-white/78 px-3 text-[#203a35] transition hover:bg-white"
                  aria-label="Read latest response aloud"
                >
                  <Volume2 size={18} className={isSpeaking ? "text-[#866a24]" : undefined} />
                </button>
              </div>
            ) : null}
            <button disabled={isWorking} className="grid h-11 w-full shrink-0 place-items-center rounded-lg bg-[#203a35] text-[#f8f5e8] shadow-lg shadow-[#203a35]/15 transition hover:bg-[#284b43] disabled:opacity-60 sm:size-12 sm:w-auto" aria-label="Send question">
              <Send size={18} />
            </button>
          </div>
          {preferences.voiceEnabled ? <p className="mt-2 text-xs leading-5 text-[#718077]">{copy.voiceHint}</p> : null}
        </form>
      </section>

      <aside className="space-y-4">
        <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">What this mode is for</p>
          <h2 className="mt-2 font-semibold text-[#203a35]">{modeProfile.label}: {modeProfile.intent}</h2>
          <p className="mt-2 text-sm leading-6 text-[#55645b]">{modeProfile.useWhen}</p>
          <p className="mt-3 rounded-lg border border-[#d8e1db] bg-white/64 p-3 text-sm leading-6 text-[#45534b]">
            {modeProfile.lens}
          </p>
        </section>

        <section className="rounded-xl border border-[#c9d5cd] bg-[#203a35] p-4 text-[#f8f5e8] shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d0ad55]">Deep checks</p>
          <div className="mt-3 space-y-3">
            {modeProfile.diagnosticTracks.slice(0, 3).map((track) => (
              <div key={track} className="rounded-lg border border-white/10 bg-white/7 p-3">
                <p className="text-sm leading-6 text-[#edf4ee]">{track}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Blind spots</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#55645b]">
            {modeProfile.blindSpots.slice(0, 3).map((spot) => (
              <li key={spot} className="rounded-lg border border-[#d8e1db] bg-white/60 px-3 py-2">
                {spot}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
          <h2 className="font-semibold text-[#203a35]">Try a {mode.toLowerCase()} question</h2>
          <div className="mt-3 space-y-2">
            {modeProfile.prompts.map((prompt) => (
              <button
                type="button"
                key={prompt}
                onClick={() => {
                  panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  void onPrompt(prompt);
                }}
                disabled={isWorking}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-[#d8e1db] bg-white/64 px-3 py-3 text-left text-sm font-medium text-[#45534b] transition hover:border-[#203a35] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>
                  <span className="block">{prompt}</span>
                  <span className="mt-1 block text-xs font-semibold text-[#866a24]">Ask now</span>
                </span>
                <Send size={15} />
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Maturity signals</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#55645b]">
            {modeProfile.maturitySignals.slice(0, 3).map((signal) => (
              <li key={signal} className="flex gap-2">
                <Check className="mt-1 shrink-0 text-[#2d5d4c]" size={15} />
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </section>

        <TrustLayerPanel />
      </aside>
    </div>
  );
}

function ScriptureChips({
  sources,
  onScriptureOpen,
}: {
  sources?: WisdomEntry[];
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
          className="rounded-md border border-[#d8e1db] bg-[#fbfcf8] px-2 py-1 text-xs font-semibold text-[#68766d] transition hover:border-[#203a35] hover:text-[#203a35]"
        >
          {source.scripture}
        </button>
      ))}
    </div>
  );
}

const scriptureReferences = wisdomEntries
  .map((entry) => entry.scripture)
  .sort((a, b) => b.length - a.length);

function ScriptureLinkedText({
  text,
  onScriptureOpen,
}: {
  text: string;
  onScriptureOpen: (scripture: string) => void;
}) {
  const cleaned = cleanDisplayText(text);
  const matches = scriptureReferences
    .flatMap((scripture) =>
      [...cleaned.matchAll(new RegExp(scripture.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))].map((match) => ({
        scripture,
        index: match.index ?? 0,
      }))
    )
    .sort((a, b) => a.index - b.index);

  if (!matches.length) {
    return <p className="whitespace-pre-wrap text-sm leading-6 text-[#303832]">{cleaned}</p>;
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
        key={`${match.scripture}-${position}-${match.index}`}
        type="button"
        onClick={() => onScriptureOpen(match.scripture)}
        className="mx-0.5 rounded-md bg-[#edf2ee] px-1.5 py-0.5 font-semibold text-[#203a35] underline decoration-[#b8c8bd] decoration-1 underline-offset-2 transition hover:bg-[#dfe8df]"
      >
        {match.scripture}
      </button>
    );
    cursor = match.index + match.scripture.length;
  });
  if (cursor < cleaned.length) {
    nodes.push(cleaned.slice(cursor));
  }

  return <p className="whitespace-pre-wrap text-sm leading-6 text-[#303832]">{nodes}</p>;
}

function TrustLayerPanel() {
  return (
    <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldCheck size={17} className="text-[#203a35]" />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Trust layer</p>
      </div>
      <div className="mt-3 space-y-3 text-sm leading-6 text-[#55645b]">
        <p className="rounded-lg border border-[#d8e1db] bg-white/64 p-3">
          Scripture references come from Aletheia’s curated wisdom library. If a verse appears, you can tap it to see context and why it matters.
        </p>
        <p className="rounded-lg border border-[#d8e1db] bg-white/64 p-3">
          Aletheia will not promise outcomes, predict markets, claim divine certainty, or replace qualified financial, legal, tax, medical, or pastoral counsel.
        </p>
        <p className="rounded-lg border border-[#d8e1db] bg-white/64 p-3">
          Signed-in memory helps continuity across decisions, reflections, counsel, and rules of life. It should make guidance more personal without exposing private details unnecessarily.
        </p>
        <p className="rounded-lg border border-[#d8e1db] bg-white/64 p-3">
          Future health, finance, or device integrations should be permission-by-permission, off by default, and limited to the exact data the user chooses to connect.
        </p>
      </div>
    </section>
  );
}

function CurrentCounselCard({
  exchange,
  mode,
  modeProfile,
  isWorking,
  onScriptureOpen,
  onTrackDecision,
  onDraftReflection,
  onCreateCounselSummary,
  onGoDeeper,
  onWait,
  onShare,
  onFeedback,
}: {
  exchange: ConversationExchange;
  mode: Mode;
  modeProfile: ModeProfile;
  isWorking: boolean;
  onScriptureOpen: (scripture: string) => void;
  onTrackDecision: (exchange: ConversationExchange) => void;
  onDraftReflection: (exchange: ConversationExchange) => void;
  onCreateCounselSummary: (exchange: ConversationExchange) => void;
  onGoDeeper: (exchange: ConversationExchange) => void;
  onWait: (exchange: ConversationExchange) => void;
  onShare: (channel: ShareChannel) => void;
  onFeedback: (value: string) => void;
}) {
  const question = exchange.question?.text;
  const isThinking = exchange.answer.id === "thinking";
  const showDecisionActions = Boolean(question) && !isThinking;

  return (
    <section className="rounded-xl border border-[#c9d5cd] bg-white/72 p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">
          {question ? "Current counsel" : "Start here"}
        </p>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${isThinking || isWorking ? "bg-[#fff8dc] text-[#866a24]" : "bg-[#edf7f1] text-[#245443]"}`}>
          {isThinking || isWorking ? "Listening" : "Ready"}
        </span>
      </div>
      {question ? (
        <div className="rounded-lg bg-[#203a35] p-3 text-[#f8f5e8]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d0ad55]">Your question</p>
          <p className="mt-2 text-sm leading-6">{cleanDisplayText(question)}</p>
        </div>
      ) : null}
      <article className="mt-3 rounded-lg border border-[#d8e1db] bg-[#fbfcf8]/80 p-3 sm:p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#866a24]">Aletheia</p>
        <p className="mb-3 rounded-md border border-[#d8e1db] bg-white/70 p-3 text-xs leading-5 text-[#607067]">
          {mode} mode is shaping this counsel around {modeProfile.lens.toLowerCase()}
        </p>
        <ScriptureLinkedText text={exchange.answer.text} onScriptureOpen={onScriptureOpen} />
        <ScriptureChips sources={exchange.answer.sources} onScriptureOpen={onScriptureOpen} />
      </article>
      {showDecisionActions ? (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <CounselAction label="Track this decision" onClick={() => onTrackDecision(exchange)} />
            <CounselAction label="Save as reflection" onClick={() => onDraftReflection(exchange)} />
            <CounselAction label="Create counsel summary" onClick={() => onCreateCounselSummary(exchange)} />
            <CounselAction label="Go deeper" onClick={() => onGoDeeper(exchange)} />
            <CounselAction label="Wait 3 days" onClick={() => onWait(exchange)} />
          </div>
          <AnswerFeedback onFeedback={onFeedback} />
          <div className="mt-3 rounded-lg border border-[#d8e1db] bg-[#fbfcf8]/76 p-3">
            <p className="text-sm font-semibold text-[#203a35]">Share Aletheia with someone who may benefit from this kind of counsel.</p>
            <p className="mt-1 text-xs leading-5 text-[#718077]">
              This shares the app link only, not your question or Aletheia’s private answer.
            </p>
            <button
              type="button"
              onClick={() => onShare("native")}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-[#c9d5cd] bg-white/80 px-3 text-xs font-semibold text-[#405049] transition hover:bg-white"
            >
              <Share2 size={14} />
              Share Aletheia
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

function AnswerFeedback({ onFeedback }: { onFeedback: (value: string) => void }) {
  const items = [
    ["helpful", "Helpful"],
    ["mildly_helpful", "Mildly helpful"],
    ["too_vague", "Too vague"],
    ["too_preachy", "Too preachy"],
    ["not_relevant", "Not relevant"],
  ] as const;

  return (
    <div className="mt-3 rounded-lg border border-[#d8e1db] bg-white/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#866a24]">Was this counsel useful?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onFeedback(value)}
            className="h-8 rounded-md border border-[#c9d5cd] bg-white/80 px-3 text-xs font-semibold text-[#405049] transition hover:bg-white"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CounselAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-[#c9d5cd] bg-white/70 px-3 py-2 text-xs font-semibold text-[#405049] transition hover:border-[#203a35] hover:bg-white"
    >
      {label}
    </button>
  );
}

function HistoryExchange({
  exchange,
  expanded,
  onToggle,
  onContinue,
  onScriptureOpen,
}: {
  exchange: ConversationExchange;
  expanded: boolean;
  onToggle: () => void;
  onContinue: () => void;
  onScriptureOpen: (scripture: string) => void;
}) {
  const title = exchange.question?.text ?? "Welcome guidance";
  const preview = cleanDisplayText(exchange.answer.text).slice(0, 120);

  return (
    <article className="rounded-lg border border-[#d8e1db] bg-[#fbfcf8]/76">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-3 text-left transition hover:bg-white/70"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[#203a35]">{cleanDisplayText(title)}</span>
          <span className="mt-1 block line-clamp-2 text-xs leading-5 text-[#607067]">{preview}</span>
        </span>
        <span className="shrink-0 rounded-md bg-[#edf2ee] px-2 py-1 text-xs font-semibold text-[#52635a]">
          {expanded ? "Hide" : "Read"}
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-[#d8e1db] p-3">
          {exchange.question ? (
            <p className="rounded-md bg-[#203a35] p-3 text-sm leading-6 text-[#f8f5e8]">{cleanDisplayText(exchange.question.text)}</p>
          ) : null}
          <div className="mt-3">
            <ScriptureLinkedText text={exchange.answer.text} onScriptureOpen={onScriptureOpen} />
          </div>
          <ScriptureChips sources={exchange.answer.sources} onScriptureOpen={onScriptureOpen} />
          {exchange.question ? (
            <button
              type="button"
              onClick={onContinue}
              className="mt-3 h-9 rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-xs font-semibold text-[#405049] transition hover:bg-white"
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
  mode,
  modeProfile,
  decisions,
  events,
  insight,
  counselContacts,
  rules,
  title,
  pressure,
  emotion,
  counselName,
  counselRole,
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
  setCounselContactValue,
  setCounselCanViewSummaries,
  setCounselCanComment,
  setCounselCanReceiveCheckins,
  setRuleText,
  onCreateDecision,
  onUpdateDecision,
  onAddCounsel,
  onShareCounselInvite,
  onShareDecisionWithCounsel,
  onSpeakText,
  isSpeaking,
  onAddRule,
  onScriptureOpen,
}: {
  mode: Mode;
  modeProfile: ModeProfile;
  decisions: WisdomDecision[];
  events: DecisionEvent[];
  insight: TimelineInsight;
  counselContacts: CounselContact[];
  rules: RuleOfLife[];
  title: string;
  pressure: string;
  emotion: string;
  counselName: string;
  counselRole: string;
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
  setCounselContactValue: (value: string) => void;
  setCounselCanViewSummaries: (value: boolean) => void;
  setCounselCanComment: (value: boolean) => void;
  setCounselCanReceiveCheckins: (value: boolean) => void;
  setRuleText: (value: string) => void;
  onCreateDecision: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateDecision: (id: string, patch: Partial<WisdomDecision> & { waitingDays?: number | null; event?: string }) => void;
  onAddCounsel: (event: FormEvent<HTMLFormElement>) => void;
  onShareCounselInvite: (channel?: ShareChannel) => void;
  onShareDecisionWithCounsel: (contactId: string, decisionId: string) => void;
  onSpeakText: (text: string, notice?: string) => void;
  isSpeaking: boolean;
  onAddRule: (event: FormEvent<HTMLFormElement>) => void;
  onScriptureOpen: (scripture: string) => void;
}) {
  const activeDecisions = decisions.filter((decision) => decision.status !== "closed");
  const selectedDecision = decisions[0];
  const modeRules = rules.filter((rule) => rule.mode === mode);
  const decisionNextTitle = selectedDecision ? `Continue: ${selectedDecision.title}` : "Name the decision under pressure";
  const decisionNextBody = selectedDecision
    ? "Update counsel, cost, waiting, and peace signals so the decision has a real timeline."
    : "Start with one decision and the pressure attached to it. Aletheia will track wisdom, counsel, and readiness over time.";

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_340px]">
      <section className="space-y-4">
        <ContextualNextAction
          eyebrow="Next in Decisions"
          title={decisionNextTitle}
          body={decisionNextBody}
        />
        <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Decision Companion</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#203a35]">Track the decision until wisdom has had time to work.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#55645b]">
                Memory, counsel, waiting, summary export, and a calm readiness signal for major choices.
              </p>
            </div>
            <span className="w-fit rounded-md bg-[#edf2ee] px-3 py-2 text-xs font-semibold text-[#52635a]">{mode} lens</span>
          </div>

          <form onSubmit={onCreateDecision} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1.2fr_auto]">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-11 rounded-lg border border-[#c9d5cd] bg-white/78 px-3 text-sm outline-none focus:border-[#203a35]"
              placeholder="Decision title"
            />
            <input
              value={pressure}
              onChange={(event) => setPressure(event.target.value)}
              className="h-11 rounded-lg border border-[#c9d5cd] bg-white/78 px-3 text-sm outline-none focus:border-[#203a35]"
              placeholder="What pressure, fear, or hope is attached?"
            />
            <select
              value={emotion}
              onChange={(event) => setEmotion(event.target.value)}
              className="h-11 rounded-lg border border-[#c9d5cd] bg-white/78 px-3 text-sm outline-none focus:border-[#203a35]"
              aria-label="Initial emotion"
            >
              <option>uncertain</option>
              <option>anxious</option>
              <option>excited</option>
              <option>pressured</option>
              <option>peaceful</option>
            </select>
            <button className="h-11 rounded-lg bg-[#203a35] px-4 text-sm font-semibold text-[#f8f5e8] lg:col-span-full">
              Start decision memory
            </button>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <TimelineStat icon={Clock3} label="Active decisions" value={String(activeDecisions.length)} />
          <TimelineStat icon={Sparkles} label="Days discerning" value={String(insight.daysDiscerning)} />
          <TimelineStat icon={ShieldCheck} label="Patterns noticed" value={String(insight.patterns.length)} />
        </section>

        <section className="rounded-xl border border-[#c9d5cd] bg-[#203a35] p-4 text-[#f8f5e8] shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d0ad55]">Wisdom Timeline</p>
          <p className="mt-3 text-sm leading-6 text-[#edf4ee]">{insight.gentleObservation}</p>
          <div className="mt-4 space-y-3">
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="rounded-lg border border-white/10 bg-white/7 p-3">
                <p className="text-sm leading-6 text-[#edf4ee]">{event.body}</p>
                <p className="mt-1 text-xs text-[#b8c8bd]">{new Date(event.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
            {!events.length ? <p className="text-sm leading-6 text-[#cddbd1]">Start a decision to begin your wisdom timeline.</p> : null}
          </div>
        </section>

        <section className="space-y-3">
          {decisions.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} modeProfile={modeProfiles[decision.mode]} onUpdate={onUpdateDecision} />
          ))}
          {!decisions.length ? (
            <div className="rounded-xl border border-dashed border-[#c9d5cd] p-6 text-sm leading-6 text-[#617067]">
              No decision memory yet. Add the first decision above and Aletheia will track pressure, wisdom anchors, waiting, counsel, and learning.
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Formation rhythm</p>
          <div className="mt-3 grid gap-2">
            <RhythmItem label="3-minute morning reflection" body="Name the pressure before the day names it for you." />
            <RhythmItem label="Evening examen" body="Review one money or work moment with honesty, not shame." />
            <RhythmItem label="Weekly pattern review" body="Notice repeated urgency, comparison, fear, or overgiving." />
          </div>
        </section>
      </section>

      <aside className="space-y-4">
        <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Counsel Circle</p>
          <p className="mt-2 text-sm leading-6 text-[#607067]">
            Invite trusted people privately. They see only the decision summaries you choose to share.
          </p>
          <form onSubmit={onAddCounsel} className="mt-3 grid gap-2">
            <input
              value={counselName}
              onChange={(event) => setCounselName(event.target.value)}
              className="h-10 rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm outline-none"
              placeholder="Name"
            />
            <input
              value={counselContactValue}
              onChange={(event) => setCounselContactValue(event.target.value)}
              className="h-10 rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm outline-none"
              placeholder="Email or phone, optional"
            />
            <select
              value={counselRole}
              onChange={(event) => setCounselRole(event.target.value)}
              className="h-10 rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm outline-none"
            >
              <option>spouse</option>
              <option>mentor</option>
              <option>pastor</option>
              <option>advisor</option>
              <option>friend</option>
            </select>
            <div className="space-y-2 rounded-lg border border-[#d8e1db] bg-white/64 p-3 text-sm text-[#405049]">
              <PermissionToggle
                checked={counselCanViewSummaries}
                label="Can view selected decision summaries"
                onChange={setCounselCanViewSummaries}
              />
              <PermissionToggle
                checked={counselCanComment}
                label="Can comment on shared decisions"
                onChange={setCounselCanComment}
              />
              <PermissionToggle
                checked={counselCanReceiveCheckins}
                label="Can receive waiting-mode check-ins"
                onChange={setCounselCanReceiveCheckins}
              />
            </div>
            <p className="rounded-lg border border-[#d8e1db] bg-white/64 p-3 text-xs leading-5 text-[#607067]">
              Private chats, journal entries, and unshared decisions are never visible to counselors by default.
            </p>
            <button className="h-10 rounded-md bg-[#203a35] px-3 text-sm font-semibold text-[#f8f5e8]">
              {userSignedIn ? "Create private invite" : "Add locally"}
            </button>
          </form>
          {latestCounselInvite ? (
            <div className="mt-3 rounded-lg border border-[#c9d5cd] bg-[#eef2ef] p-3">
              <p className="text-sm font-semibold text-[#203a35]">Invite ready for {latestCounselInvite.name}</p>
              <p className="mt-1 break-all text-xs leading-5 text-[#607067]">{latestCounselInvite.url}</p>
              {counselContacts[0]?.name === latestCounselInvite.name && counselContacts[0]?.emailSent ? (
                <p className="mt-2 rounded-md bg-[#edf7f1] px-2 py-1 text-xs font-semibold text-[#245443]">
                  Email sent. The private link is also here as a fallback.
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-md border border-[#c9d5cd] px-3 py-2 text-xs font-semibold text-[#203a35]"
                  onClick={() => onShareCounselInvite("copy")}
                  type="button"
                >
                  Copy link
                </button>
                <button
                  className="rounded-md bg-[#203a35] px-3 py-2 text-xs font-semibold text-[#f8f5e8]"
                  onClick={() => onShareCounselInvite("native")}
                  type="button"
                >
                  Share invite
                </button>
                <button
                  className="rounded-md border border-[#c9d5cd] px-3 py-2 text-xs font-semibold text-[#203a35]"
                  onClick={() => onShareCounselInvite("email")}
                  type="button"
                >
                  Email
                </button>
                <button
                  className="rounded-md border border-[#c9d5cd] px-3 py-2 text-xs font-semibold text-[#203a35]"
                  onClick={() => onShareCounselInvite("sms")}
                  type="button"
                >
                  SMS
                </button>
                <button
                  className="rounded-md border border-[#c9d5cd] px-3 py-2 text-xs font-semibold text-[#203a35]"
                  onClick={() => onShareCounselInvite("whatsapp")}
                  type="button"
                >
                  WhatsApp
                </button>
              </div>
            </div>
          ) : null}
          <div className="mt-3 space-y-2">
            {counselContacts.slice(0, 5).map((contact) => (
              <div key={contact.id} className="rounded-lg border border-[#d8e1db] bg-white/64 p-3">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-[#405049]" />
                  <div>
                    <p className="text-sm font-semibold text-[#203a35]">{contact.name}</p>
                    <p className="text-xs uppercase tracking-[0.12em] text-[#718077]">
                      {contact.role} · {contact.inviteStatus === "accepted" ? "accepted" : contact.inviteStatus === "pending" ? "invited" : "local"}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#607067]">
                  {contact.canViewSummaries ? <span className="rounded bg-[#edf2ee] px-2 py-1">summaries</span> : null}
                  {contact.canCommentOnDecisions ? <span className="rounded bg-[#edf2ee] px-2 py-1">comments</span> : null}
                  {contact.canReceiveCheckins ? <span className="rounded bg-[#edf2ee] px-2 py-1">check-ins</span> : null}
                </div>
                {selectedDecision && contact.canViewSummaries ? (
                  <button
                    type="button"
                    className="mt-3 w-full rounded-md border border-[#c9d5cd] px-3 py-2 text-xs font-semibold text-[#203a35]"
                    onClick={() => onShareDecisionWithCounsel(contact.id, selectedDecision.id)}
                  >
                    Share current summary only
                  </button>
                ) : null}
              </div>
            ))}
            {!counselContacts.length ? (
              <p className="rounded-lg border border-dashed border-[#c9d5cd] p-3 text-sm leading-6 text-[#607067]">
                Add one trusted person before the next high-stakes decision.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Rule of Life</p>
          <form onSubmit={onAddRule} className="mt-3 grid gap-2">
            <textarea
              value={ruleText}
              onChange={(event) => setRuleText(event.target.value)}
              className="min-h-20 resize-none rounded-md border border-[#c9d5cd] bg-white/78 px-3 py-2 text-sm leading-6 outline-none"
              placeholder="I do not make career decisions without counsel."
            />
            <button className="h-10 rounded-md bg-[#203a35] px-3 text-sm font-semibold text-[#f8f5e8]">Save principle</button>
          </form>
          <div className="mt-3 space-y-2">
            {modeRules.slice(0, 4).map((rule) => (
              <p key={rule.id} className="rounded-lg border border-[#d8e1db] bg-white/64 p-3 text-sm leading-6 text-[#45534b]">
                {rule.principle}
              </p>
            ))}
            {!modeRules.length ? (
              <p className="rounded-lg border border-dashed border-[#c9d5cd] p-3 text-sm leading-6 text-[#607067]">
                Write one principle you want to live by before pressure arrives.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Scripture integrity</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#55645b]">
            <li>References come from the curated wisdom library.</li>
            <li>No financial outcomes or divine predictions.</li>
            <li>Prosperity-gospel framing is refused.</li>
            <li>High-stakes choices are pointed toward qualified counsel.</li>
          </ul>
        </section>

        <section className="rounded-xl border border-[#c9d5cd] bg-[#203a35] p-4 text-[#f8f5e8] shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d0ad55]">Decision practice</p>
          <p className="mt-3 text-sm font-semibold text-[#f3e8bd]">{modeProfile.practices[0]}</p>
          <p className="mt-2 text-sm leading-6 text-[#edf4ee]">A small practice for the decision you are carrying, shaped by the active wisdom mode.</p>
        </section>

        {selectedDecision?.summary ? (
          <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Decision Summary Export</p>
              <button
                type="button"
                onClick={() => onSpeakText(selectedDecision.summary || "", "Aletheia is reading the decision summary aloud.")}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-xs font-semibold text-[#405049] transition hover:bg-white"
              >
                <Volume2 size={14} className={isSpeaking ? "text-[#866a24]" : undefined} />
                {isSpeaking ? "Stop" : "Read aloud"}
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#55645b]">
              Mentor-ready summary with decision, pressure, wisdom anchors, risks, counsel questions, and next faithful step. Review it before sharing.
            </p>
            <div className="mt-3 max-h-80 min-h-40 overflow-y-auto rounded-md border border-[#c9d5cd] bg-white/78 p-3">
              <ScriptureLinkedText text={selectedDecision.summary} onScriptureOpen={onScriptureOpen} />
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function TimelineStat({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#866a24]">{label}</p>
        <Icon size={17} className="text-[#405049]" />
      </div>
      <p className="mt-3 text-3xl font-semibold text-[#203a35]">{value}</p>
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
  modeProfile,
  onUpdate,
}: {
  decision: WisdomDecision;
  modeProfile: ModeProfile;
  onUpdate: (id: string, patch: Partial<WisdomDecision> & { waitingDays?: number | null; event?: string }) => void;
}) {
  const [noteDraft, setNoteDraft] = useState("");
  const [finalDecisionDraft, setFinalDecisionDraft] = useState(decision.finalDecision ?? "");
  const [learningDraft, setLearningDraft] = useState(decision.learning ?? "");
  const waiting = decision.waitingUntil ? new Date(decision.waitingUntil) : null;
  const waitingText = waiting ? `Waiting until ${waiting.toLocaleDateString()}` : null;
  return (
    <article className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#edf2ee] px-2 py-1 text-xs font-semibold text-[#52635a]">{decision.mode}</span>
            <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-semibold text-[#866a24]">{decision.status}</span>
            {waitingText ? <span className="rounded-md bg-[#fff8dc] px-2 py-1 text-xs font-semibold text-[#866a24]">{waitingText}</span> : null}
          </div>
          <h3 className="mt-3 text-xl font-semibold text-[#203a35]">{decision.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#55645b]">{decision.pressure}</p>
        </div>
        <div className="min-w-28 rounded-lg border border-[#d8e1db] bg-white/70 p-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#718077]">Readiness</p>
          <p className="mt-1 text-2xl font-semibold text-[#203a35]">{decision.readiness}%</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <DecisionToggle active={decision.counselSought} label="Counsel" onClick={() => onUpdate(decision.id, { counselSought: !decision.counselSought, event: "Counsel status changed." })} />
        <DecisionToggle active={decision.costCounted} label="Cost" onClick={() => onUpdate(decision.id, { costCounted: !decision.costCounted, event: "Cost counting updated." })} />
        <DecisionToggle active={decision.alignmentClear} label="Values" onClick={() => onUpdate(decision.id, { alignmentClear: !decision.alignmentClear, event: "Values alignment updated." })} />
        <DecisionToggle active={decision.reversibleStep} label="Reversible" onClick={() => onUpdate(decision.id, { reversibleStep: !decision.reversibleStep, event: "Reversibility updated." })} />
        <DecisionToggle active={decision.peaceOverUrgency} label="Peace" onClick={() => onUpdate(decision.id, { peaceOverUrgency: !decision.peaceOverUrgency, event: "Peace over urgency updated." })} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <p className="text-sm leading-6 text-[#55645b]">{modeProfile.diagnosticTracks[0]}</p>
        <div className="flex flex-wrap gap-2">
          {[1, 3, 7, 30].map((days) => (
            <button key={days} onClick={() => onUpdate(decision.id, { waitingDays: days })} className="rounded-md border border-[#c9d5cd] bg-white/70 px-3 py-2 text-xs font-semibold text-[#405049]">
              Wait {days}d
            </button>
          ))}
          <button onClick={() => onUpdate(decision.id, { status: "closed", event: "Decision closed with learning recorded." })} className="rounded-md bg-[#203a35] px-3 py-2 text-xs font-semibold text-[#f8f5e8]">
            Close
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-[#d8e1db] bg-white/64 p-3">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#866a24]">
            What changed?
          </label>
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            className="mt-2 min-h-20 w-full resize-none rounded-md border border-[#c9d5cd] bg-white/80 p-3 text-sm leading-6 outline-none"
            placeholder="Prayer, counsel, facts, time, or emotion shifted..."
          />
          <button
            onClick={() => {
              if (!noteDraft.trim()) return;
              onUpdate(decision.id, { event: noteDraft.trim() });
              setNoteDraft("");
            }}
            className="mt-2 h-9 rounded-md border border-[#c9d5cd] bg-white/80 px-3 text-xs font-semibold text-[#405049]"
          >
            Add timeline note
          </button>
        </div>

        <div className="rounded-lg border border-[#d8e1db] bg-white/64 p-3">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#866a24]">
            Outcome and learning
          </label>
          <input
            value={finalDecisionDraft}
            onChange={(event) => setFinalDecisionDraft(event.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-[#c9d5cd] bg-white/80 px-3 text-sm outline-none"
            placeholder="Final decision"
          />
          <textarea
            value={learningDraft}
            onChange={(event) => setLearningDraft(event.target.value)}
            className="mt-2 min-h-16 w-full resize-none rounded-md border border-[#c9d5cd] bg-white/80 p-3 text-sm leading-6 outline-none"
            placeholder="What did you learn?"
          />
          <button
            onClick={() =>
              onUpdate(decision.id, {
                finalDecision: finalDecisionDraft,
                learning: learningDraft,
                status: "closed",
                event: "Recorded final decision and learning.",
              })
            }
            className="mt-2 h-9 rounded-md bg-[#203a35] px-3 text-xs font-semibold text-[#f8f5e8]"
          >
            Save outcome
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[#d8e1db] bg-white/64 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#866a24]">Revisit rhythm</p>
        <p className="mt-2 text-sm leading-6 text-[#55645b]">
          Wisdom often gets clearer after facts, counsel, prayer, and time. Schedule a light review point without turning it into pressure.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => onUpdate(decision.id, { event: `Scheduled an outcome review for ${days} days from now.` })}
              className="rounded-md border border-[#c9d5cd] bg-white/80 px-3 py-2 text-xs font-semibold text-[#405049] transition hover:bg-white"
            >
              Review in {days}d
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

function DecisionToggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
        active ? "border-[#b8d0c2] bg-[#edf7f1] text-[#245443]" : "border-[#d8e1db] bg-white/64 text-[#607067]"
      }`}
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
}: {
  decision: string;
  setDecision: (value: string) => void;
  emotion: string;
  setEmotion: (value: string) => void;
  timeframe: string;
  setTimeframe: (value: string) => void;
  result: { sources: WisdomEntry[]; readiness: number; hasUrgency: boolean; hasCounsel: boolean } | null;
  mode: Mode;
  modeProfile: ModeProfile;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="min-w-0 rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex items-center gap-2 text-xl font-semibold text-[#203a35]">
          <Scale size={20} />
          Wisdom Check
        </div>
        <div className="mb-5 rounded-lg border border-[#d8e1db] bg-white/62 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">{mode} discernment lens</p>
          <p className="mt-2 text-sm leading-6 text-[#55645b]">{modeProfile.intent}</p>
        </div>
        <label className="text-sm font-semibold text-[#405049]" htmlFor="decision">
          Decision or pressure
        </label>
        <textarea
          id="decision"
          value={decision}
          onChange={(event) => setDecision(event.target.value)}
          className="mt-2 min-h-36 w-full resize-none rounded-lg border border-[#c9d5cd] bg-white/78 px-3 py-3 text-sm leading-6 outline-none focus:border-[#203a35]"
          placeholder="Example: I want to leave my job and start consulting, but I am worried about income stability."
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#405049]">
            Current emotion
            <select value={emotion} onChange={(event) => setEmotion(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm outline-none">
              <option>uncertain</option>
              <option>anxious</option>
              <option>excited</option>
              <option>pressured</option>
              <option>peaceful</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-[#405049]">
            Time horizon
            <select value={timeframe} onChange={(event) => setTimeframe(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm outline-none">
              <option>Long-term</option>
              <option>Next 90 days</option>
              <option>This month</option>
              <option>This week</option>
            </select>
          </label>
        </div>
      </section>

      <section className="min-w-0 rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm sm:p-5">
        <h2 className="text-xl font-semibold text-[#203a35]">Discernment readout</h2>
        {result ? (
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm font-semibold text-[#405049]">
                <span>Readiness signal</span>
                <span>{result.readiness}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#dde6df]">
                <div className="h-full rounded-full bg-[#203a35]" style={{ width: `${result.readiness}%` }} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Signal active={!result.hasUrgency} label="Pace is calm enough" />
              <Signal
                active={result.hasCounsel}
                label={result.hasCounsel ? "Counsel is visible" : "Counsel still needed"}
              />
            </div>
            <div className="rounded-lg border border-[#d8e1db] bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6c25]">Grounding</p>
              <p className="mt-2 text-sm leading-6 text-[#505a52]">
                {result.sources[0]?.scripture}: {result.sources[0]?.principle}
              </p>
            </div>
            <div className="rounded-lg border border-[#d8e1db] bg-[#203a35] p-4 text-[#f8f5e8]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d0ad55]">{mode} diagnostic</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#edf4ee]">
                {modeProfile.diagnosticTracks.slice(0, 2).map((track) => (
                  <li key={track}>{track}</li>
                ))}
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[#d8e1db] bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6c25]">Watch for</p>
                <p className="mt-2 text-sm leading-6 text-[#505a52]">{modeProfile.blindSpots[0]}</p>
              </div>
              <div className="rounded-lg border border-[#d8e1db] bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6c25]">Practice</p>
                <p className="mt-2 text-sm leading-6 text-[#505a52]">{modeProfile.practices[0]}</p>
              </div>
            </div>
            <div className="rounded-lg border border-[#d8e1db] bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6c25]">Next faithful action</p>
              <p className="mt-2 text-sm leading-6 text-[#505a52]">
                Name the smallest reversible step, show the plan to one wise person, and wait until the emotional pressure lowers before making an irreversible move.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-[#c9d5cd] p-6 text-sm leading-6 text-[#617067]">
            Write a decision on the left. Aletheia will turn it into a reflective readout grounded in the wisdom library.
          </div>
        )}
      </section>
    </div>
  );
}

function ReflectPanel({
  decision,
  setDecision,
  emotion,
  setEmotion,
  timeframe,
  setTimeframe,
  result,
  mode,
  modeProfile,
  entries,
  title,
  body,
  setTitle,
  setBody,
  onSave,
  onDelete,
}: {
  decision: string;
  setDecision: (value: string) => void;
  emotion: string;
  setEmotion: (value: string) => void;
  timeframe: string;
  setTimeframe: (value: string) => void;
  result: { sources: WisdomEntry[]; readiness: number; hasUrgency: boolean; hasCounsel: boolean } | null;
  mode: Mode;
  modeProfile: ModeProfile;
  entries: JournalEntry[];
  title: string;
  body: string;
  setTitle: (value: string) => void;
  setBody: (value: string) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
}) {
  const reflectNextTitle = body.trim() || decision.trim() ? "Finish the reflection in front of you" : "Begin with one honest sentence";
  const reflectNextBody = body.trim() || decision.trim()
    ? "Save what you are noticing while the insight is still fresh."
    : "Use Wisdom Check for a quick discernment scan, or write what you notice about money, work, fear, generosity, or pace.";

  return (
    <div className="min-w-0 space-y-4">
      <ContextualNextAction
        eyebrow="Next in Reflect"
        title={reflectNextTitle}
        body={reflectNextBody}
        actionLabel={body.trim() ? "Save reflection" : undefined}
        onAction={body.trim() ? onSave : undefined}
      />
      <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Reflect</p>
        <h2 className="mt-2 text-2xl font-semibold text-[#203a35]">Discernment and reflection in one quiet place</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#55645b]">
          Use Wisdom Check to slow a decision down, then save what you notice before the moment passes.
        </p>
      </section>

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
      />

      <JournalPanel
        entries={entries}
        title={title}
        body={body}
        mode={mode}
        setTitle={setTitle}
        setBody={setBody}
        onSave={onSave}
        onDelete={onDelete}
      />
    </div>
  );
}

function Signal({ active, label }: { active: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-semibold ${active ? "border-[#b8d0c2] bg-[#edf7f1] text-[#245443]" : "border-[#e0c3b7] bg-[#fff6f1] text-[#8c3f28]"}`}>
      <Check size={16} />
      {label}
    </div>
  );
}

function LibraryPanel({
  entries,
  search,
  setSearch,
  mode,
  preferences,
  onScriptureOpen,
}: {
  entries: WisdomEntry[];
  search: string;
  setSearch: (value: string) => void;
  mode: Mode;
  preferences: UserPreferences;
  onScriptureOpen: (scripture: string) => void;
}) {
  const libraryNextTitle = search.trim() ? `Review ${entries.length} matching wisdom anchor${entries.length === 1 ? "" : "s"}` : "Search one wisdom theme";
  const libraryNextBody = search.trim()
    ? "Open a scripture reference to read the passage context and why it matters here."
    : "Try stewardship, debt, contentment, counsel, cost, generosity, anxiety, or diligence.";

  return (
    <div className="min-w-0 space-y-4">
      <ContextualNextAction
        eyebrow="Next in Library"
        title={libraryNextTitle}
        body={libraryNextBody}
      />
      <section className="min-w-0 rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xl font-semibold text-[#203a35]">
              <BookOpen size={20} />
              Wisdom Library
            </div>
            <p className="mt-2 text-sm leading-6 text-[#5b6a61]">
              A curated wisdom base with language-aware application notes and public-domain translation labels.
            </p>
          </div>
          <label className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#68766d]" size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-lg border border-[#c9d5cd] bg-white/78 pl-10 pr-3 text-sm outline-none focus:border-[#203a35]"
              placeholder={`Search ${mode.toLowerCase()} wisdom...`}
            />
          </label>
        </div>

        <div className="mt-5 grid min-w-0 gap-3 lg:grid-cols-2">
          {entries.map((entry) => (
            <article key={entry.scripture} className="rounded-lg border border-[#d8e1db] bg-white/68 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-[#edf2ee] px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#52635a]">{entry.theme}</span>
                <button
                  type="button"
                  onClick={() => onScriptureOpen(entry.scripture)}
                  className="text-left text-sm font-semibold text-[#203a35] underline decoration-[#b9c7bf] underline-offset-4 transition hover:text-[#866a24]"
                >
                  {entry.scripture}
                </button>
              </div>
              <p className="text-sm font-semibold leading-6 text-[#2e3933]">{entry.principle}</p>
              <p className="mt-3 text-sm leading-6 text-[#59675f]">{entry.application}</p>
              <p className="mt-3 rounded-md border border-[#d8e1db] bg-[#fbfcf8] p-3 text-xs leading-5 text-[#607067]">
                {localizedWisdomLibraryNote(entry, preferences)}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function JournalPanel({
  entries,
  title,
  body,
  mode,
  setTitle,
  setBody,
  onSave,
  onDelete,
}: {
  entries: JournalEntry[];
  title: string;
  body: string;
  mode: Mode;
  setTitle: (value: string) => void;
  setBody: (value: string) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="min-w-0 rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex items-center gap-2 text-xl font-semibold text-[#203a35]">
          <Feather size={20} />
          Reflection Journal
        </div>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="h-11 w-full rounded-lg border border-[#c9d5cd] bg-white/78 px-3 text-sm outline-none focus:border-[#203a35]"
          placeholder="Reflection title"
        />
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="mt-3 min-h-48 w-full resize-none rounded-lg border border-[#c9d5cd] bg-white/78 px-3 py-3 text-sm leading-6 outline-none focus:border-[#203a35]"
          placeholder="What are you noticing about motives, fear, generosity, work, or pace?"
        />
        <button onClick={onSave} className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#203a35] px-4 text-sm font-semibold text-[#f8f5e8] shadow-lg shadow-[#203a35]/15">
          <Plus size={16} />
          Save reflection
        </button>
      </section>

      <section className="min-w-0 rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm sm:p-5">
        <h2 className="text-xl font-semibold text-[#203a35]">Saved reflections</h2>
        <div className="mt-4 space-y-3">
          {entries.length ? (
            entries.map((entry) => (
              <article key={entry.id} className="rounded-lg border border-[#d8e1db] bg-white/68 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#203a35]">{entry.title}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a6c25]">
                      {entry.mode} - {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={() => onDelete(entry.id)} className="grid size-9 shrink-0 place-items-center rounded-md border border-[#d8e1db] text-[#68766d] hover:bg-[#edf2ee]" aria-label={`Delete ${entry.title}`}>
                    <Trash2 size={15} />
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#505a52]">{entry.body}</p>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-[#c9d5cd] p-6 text-sm leading-6 text-[#617067]">
              No reflections yet. Save one from the form to keep a private record on this device.
            </div>
          )}
        </div>
        <p className="mt-4 text-xs leading-5 text-[#718077]">Currently active mode: {mode}</p>
      </section>
    </div>
  );
}
