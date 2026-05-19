"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { signIn as authSignIn, signOut as authSignOut } from "next-auth/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronRight,
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
  ShieldCheck,
  Sparkles,
  Sprout,
  Trash2,
  WifiOff,
  Bell,
  Clock3,
  FileText,
  Users,
} from "lucide-react";
import { buildDecisionSummary, detectPatterns, scoreDecision } from "@/lib/decision-intelligence";
import { modeProfiles, type ModeProfile } from "@/lib/mode-profiles";
import type { Mode } from "@/lib/wisdom-data";

type View = "companion" | "decisions" | "check" | "library" | "journal";
type AuthMode = "login" | "register";
type AuthStatus = "checking" | "guest" | "signing-in" | "signed-in" | "signing-out";
type AnalyticsMetadata = Record<string, string | number | boolean | null>;

type User = {
  id: string;
  email: string;
  name: string | null;
};

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
  notes: string | null;
  createdAt: string;
};

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
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [googleAuthAvailable, setGoogleAuthAvailable] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Checking your sign-in status...");
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
  const [ruleText, setRuleText] = useState("");

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
      setUser(data.user);

      if (data.user) {
        setAuthStatus("signed-in");
        setStatusMessage("Signed in. Conversations and reflections sync to the local database.");
        const [chatResponse, journalResponse, notificationResponse, decisionsResponse, counselResponse, rulesResponse] = await Promise.all([
          fetch("/api/chat"),
          fetch("/api/journal"),
          fetch("/api/notifications/status"),
          fetch("/api/decisions"),
          fetch("/api/counsel"),
          fetch("/api/rules"),
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
        setNotificationsConfigured(Boolean(notificationData.configured));
        setNotificationsEnabled(Boolean(notificationData.enabled));
      } else {
        const params = new URLSearchParams(window.location.search);
        setAuthStatus("guest");
        setStatusMessage("Guest mode is active. Sign in to sync decisions, journal, notifications, and rules.");
        if (params.get("auth") === "oauth_failed") {
          setAuthError("Google sign-in did not finish. Please try again.");
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
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => undefined);
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

  const daily = todayWisdom();
  const activeMode = modeProfiles[mode];
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

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    if (!user) {
      trackClientEvent("chat_question_sent", { mode, persisted: false });
    }

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text: trimmed };
    setIsWorking(true);
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
        body: JSON.stringify({ message: trimmed, mode }),
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
      setStatusMessage(
        data.persisted
          ? data.usedOpenAI
            ? "Answered with server-side OpenAI/RAG and saved to your account."
            : "Answered with server-side retrieval fallback and saved to your account."
          : data.usedOpenAI
            ? "Answered with server-side OpenAI/RAG. Sign in to save history."
            : "Answered with server-side retrieval fallback. Add OPENAI_API_KEY for generated AI responses."
      );
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
    } finally {
      setIsWorking(false);
    }
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsWorking(true);
    setAuthStatus("signing-in");
    setAuthError("");

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
      setUser(data.user);
      setAuthStatus("signed-in");
      setAuthPassword("");
      setStatusMessage("Signed in. Conversations and reflections now sync to the database.");
      const journalResponse = await fetch("/api/journal");
      const journalData = (await journalResponse.json()) as { entries?: JournalEntry[] };
      setJournalEntries(journalData.entries ?? []);
    } catch (error) {
      setAuthStatus("guest");
      setAuthError(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setIsWorking(false);
    }
  }

  async function logout() {
    setAuthStatus("signing-out");
    await fetch("/api/auth/logout", { method: "POST" });
    await authSignOut({ redirect: false }).catch(() => undefined);
    setUser(null);
    setAuthStatus("guest");
    setMessages(defaultMessages);
    setJournalEntries([]);
    setNotificationsEnabled(false);
    setStatusMessage("Signed out. Guest mode is active.");
  }

  async function handleGoogleSignIn() {
    if (!googleAuthAvailable) {
      setAuthError("Google sign-in is not configured yet. You can still sign in with email.");
      return;
    }
    setAuthStatus("signing-in");
    setAuthError("");
    setStatusMessage("Opening Google sign-in...");
    await authSignIn("google", {
      redirectTo: "/api/auth/oauth/complete?next=/",
    });
  }

  async function enableNotifications() {
    if (!user) {
      setNotificationStatus("Sign in first, then enable notifications.");
      return;
    }
    if (!notificationsConfigured) {
      setNotificationStatus("Notifications are not configured on the server yet.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setNotificationStatus("This browser does not support web push notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission !== "granted") {
      setNotificationStatus("Notifications were not enabled. You can allow them later in browser settings.");
      return;
    }

    const keyResponse = await fetch("/api/notifications/key");
    const keyData = (await keyResponse.json()) as { publicKey?: string };
    if (!keyData.publicKey) {
      setNotificationStatus("Notifications are missing a public key.");
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
      return;
    }

    setNotificationsEnabled(true);
    setNotificationStatus("Daily wisdom notifications are enabled for this device.");
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
  }

  async function saveReflection() {
    const title = journalTitle.trim() || `${mode} reflection`;
    const body = journalBody.trim();
    if (!body) {
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
    }

    setJournalTitle("");
    setJournalBody("");
  }

  async function deleteJournalEntry(id: string) {
    if (user) {
      await fetch(`/api/journal/${id}`, { method: "DELETE" });
    }
    setJournalEntries((current) => current.filter((entry) => entry.id !== id));
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
  }

  async function addCounselContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = counselName.trim();
    if (!name) {
      return;
    }
    if (user) {
      const response = await fetch("/api/counsel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role: counselRole }),
      });
      const data = (await response.json()) as { contact?: CounselContact };
      if (data.contact) {
        setCounselContacts((current) => [data.contact!, ...current]);
      }
    } else {
      setCounselContacts((current) => [
        { id: crypto.randomUUID(), name, role: counselRole, notes: null, createdAt: new Date().toISOString() },
        ...current,
      ]);
    }
    setCounselName("");
  }

  async function addRuleOfLife(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const principle = ruleText.trim();
    if (!principle) {
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
      }
    } else {
      setRulesOfLife((current) => [
        { id: crypto.randomUUID(), mode, principle, createdAt: new Date().toISOString() },
        ...current,
      ]);
    }
    setRuleText("");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef2ef] text-[#171917]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(201,177,123,0.16),transparent_24%),radial-gradient(circle_at_92%_16%,rgba(64,101,96,0.14),transparent_24%),linear-gradient(180deg,#f4f6f2_0%,#e4ebe6_100%)]" />

      <nav className="sticky top-0 z-30 border-b border-[#c9d5cd]/70 bg-[#eef2ef]/88 px-3 py-3 backdrop-blur-xl sm:px-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <button
            className="flex min-w-0 items-center gap-3 text-left"
            onClick={() => setActiveView("companion")}
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
            <NavButton active={activeView === "companion"} icon={MessageCircle} label="Companion" onClick={() => setActiveView("companion")} />
            <NavButton active={activeView === "decisions"} icon={FileText} label="Decisions" onClick={() => setActiveView("decisions")} />
            <NavButton active={activeView === "check"} icon={Scale} label="Wisdom Check" onClick={() => setActiveView("check")} />
            <NavButton active={activeView === "library"} icon={BookOpen} label="Library" onClick={() => setActiveView("library")} />
            <NavButton active={activeView === "journal"} icon={Feather} label="Journal" onClick={() => setActiveView("journal")} />
          </div>

          <div className="flex items-center gap-2">
            {!isOnline ? (
              <span className="hidden items-center gap-2 rounded-md border border-[#d5b7a9] bg-[#fff5ef] px-3 py-2 text-xs font-medium text-[#8c3f28] sm:inline-flex">
                <WifiOff size={14} />
                Offline
              </span>
            ) : null}
            <button
              className="grid size-10 place-items-center rounded-md border border-[#bdcbc2] bg-[#fbfcf8]/70 text-[#213a35] shadow-sm transition hover:bg-white"
              aria-label={user ? "Open account" : "Open guest dashboard"}
              onClick={() => setActiveView("companion")}
            >
              <Home size={18} />
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-4 px-3 pb-28 pt-4 sm:px-4 sm:py-5 lg:grid-cols-[280px_1fr] lg:py-6">
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
          <div className="mb-4 grid gap-3 sm:mb-5 sm:gap-4 xl:grid-cols-[1fr_360px]">
            <section className="min-w-0 rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/72 p-4 shadow-sm sm:p-5">
              <div className="mb-4 inline-flex w-fit max-w-full items-center gap-2 rounded-md border border-[#c0cec5] bg-[#fbfcf8]/80 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#866a24] sm:mb-5 sm:text-xs sm:tracking-[0.18em]">
                <Sparkles size={14} />
                Wisdom for real decisions
              </div>
              <h1 className="max-w-3xl text-[2rem] font-semibold leading-[1.08] tracking-normal text-[#171917] sm:text-5xl sm:leading-tight">
                Biblical wisdom for money, work, and stewardship.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#505a52] sm:text-base sm:leading-7">
                Ask a real question, run a decision through a Wisdom Check, search the curated library, and keep private reflections on this device.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2 lg:hidden">
                {modes.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleModeChange(item.label)}
                    className={`flex min-w-0 items-center gap-2 rounded-md border px-2 py-2 text-left text-xs font-semibold sm:text-sm ${
                      mode === item.label
                        ? "border-[#203a35] bg-[#203a35] text-[#f8f5e8]"
                        : "border-[#c9d5cd] bg-[#fbfcf8]/78 text-[#405049]"
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
              <div className="mt-3 rounded-lg border border-[#d8e1db] bg-white/62 p-3 lg:hidden">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#866a24]">{mode} mode changes the lens</p>
                <p className="mt-2 text-sm leading-6 text-[#4f5f56]">{activeMode.useWhen}</p>
              </div>
            </section>

            <section className="min-w-0 rounded-xl border border-[#c9d5cd] bg-[#203a35] p-4 text-[#f8f5e8] shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d0ad55]">Daily Wisdom</p>
                  <h2 className="mt-1 text-xl font-semibold">{daily.theme}</h2>
                </div>
                <Sprout size={22} />
              </div>
              <p className="text-sm font-semibold text-[#f3e8bd]">{daily.scripture}</p>
              <p className="mt-3 text-sm leading-6 text-[#e7eee8]">{daily.principle}</p>
            </section>
          </div>

          <AuthPanel
            user={user}
            authMode={authMode}
            setAuthMode={setAuthMode}
            name={authName}
            setName={setAuthName}
            email={authEmail}
            setEmail={setAuthEmail}
            password={authPassword}
            setPassword={setAuthPassword}
            error={authError}
            authStatus={authStatus}
            googleAuthAvailable={googleAuthAvailable}
            status={statusMessage}
            isWorking={isWorking}
            onSubmit={handleAuth}
            onGoogleSignIn={handleGoogleSignIn}
            onLogout={logout}
          />

          <NotificationPanel
            user={user}
            enabled={notificationsEnabled}
            configured={notificationsConfigured}
            permission={notificationPermission}
            status={notificationStatus}
            onEnable={enableNotifications}
            onDisable={disableNotifications}
          />

          <AnimatePresence mode="wait">
            {activeView === "companion" ? (
              <Screen key="companion">
                <CompanionPanel
                  messages={messages}
                  mode={mode}
                  modeProfile={activeMode}
                  query={query}
                  setQuery={setQuery}
                  onAsk={handleAsk}
                  onPrompt={setQuery}
                  isWorking={isWorking}
                />
              </Screen>
            ) : null}
            {activeView === "check" ? (
              <Screen key="check">
                <WisdomCheck
                  decision={decision}
                  setDecision={setDecision}
                  emotion={emotion}
                  setEmotion={setEmotion}
                  timeframe={timeframe}
                  setTimeframe={setTimeframe}
                  result={decisionResult}
                  mode={mode}
                  modeProfile={activeMode}
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
                  ruleText={ruleText}
                  setTitle={setDecisionTitle}
                  setPressure={setDecisionPressure}
                  setEmotion={setDecisionEmotion}
                  setCounselName={setCounselName}
                  setCounselRole={setCounselRole}
                  setRuleText={setRuleText}
                  onCreateDecision={createDecision}
                  onUpdateDecision={updateDecision}
                  onAddCounsel={addCounselContact}
                  onAddRule={addRuleOfLife}
                />
              </Screen>
            ) : null}
            {activeView === "library" ? (
              <Screen key="library">
                <LibraryPanel entries={filteredEntries} search={librarySearch} setSearch={setLibrarySearch} mode={mode} />
              </Screen>
            ) : null}
            {activeView === "journal" ? (
              <Screen key="journal">
                <JournalPanel
                  entries={journalEntries}
                  title={journalTitle}
                  body={journalBody}
                  mode={mode}
                  setTitle={setJournalTitle}
                  setBody={setJournalBody}
                  onSave={saveReflection}
                  onDelete={deleteJournalEntry}
                />
              </Screen>
            ) : null}
          </AnimatePresence>
        </section>
      </div>

      <div className="fixed inset-x-2 bottom-2 z-40 rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/92 p-1 shadow-2xl shadow-[#1f2a24]/12 backdrop-blur sm:inset-x-3 sm:bottom-3 md:hidden">
        <div className="grid grid-cols-5 gap-1">
          <MobileNav active={activeView === "companion"} icon={MessageCircle} label="Ask" onClick={() => setActiveView("companion")} />
          <MobileNav active={activeView === "decisions"} icon={FileText} label="Decide" onClick={() => setActiveView("decisions")} />
          <MobileNav active={activeView === "check"} icon={Scale} label="Check" onClick={() => setActiveView("check")} />
          <MobileNav active={activeView === "library"} icon={BookOpen} label="Library" onClick={() => setActiveView("library")} />
          <MobileNav active={activeView === "journal"} icon={Feather} label="Journal" onClick={() => setActiveView("journal")} />
        </div>
      </div>
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

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
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
              {error ? <span className="text-sm font-medium text-[#8c3f28]">{error}</span> : null}
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

function CompanionPanel({
  messages,
  mode,
  modeProfile,
  query,
  setQuery,
  onAsk,
  onPrompt,
  isWorking,
}: {
  messages: ChatMessage[];
  mode: Mode;
  modeProfile: ModeProfile;
  query: string;
  setQuery: (value: string) => void;
  onAsk: (event: FormEvent<HTMLFormElement>) => void;
  onPrompt: (value: string) => void;
  isWorking: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_320px]">
      <section className="min-w-0 rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#d8e1db] px-3 py-3 sm:px-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-[#203a35]">
              <MessageCircle size={18} />
              Wisdom Companion
            </div>
            <p className="mt-1 text-sm leading-5 text-[#5a685f]">{modeProfile.intent}</p>
          </div>
          <span className="w-fit rounded-md bg-[#edf2ee] px-2 py-1 text-xs font-semibold text-[#52635a]">{mode} lens</span>
        </div>

        <div className="max-h-[560px] space-y-4 overflow-y-auto p-3 sm:p-4">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`min-w-0 rounded-lg border p-3 sm:p-4 ${
                message.role === "user"
                  ? "ml-auto max-w-2xl border-[#203a35]/10 bg-[#203a35] text-[#f8f5e8]"
                  : "max-w-3xl border-[#d8e1db] bg-white/72 text-[#303832]"
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans text-sm leading-6">{message.text}</pre>
              {message.sources?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {message.sources.map((source) => (
                    <span key={source.scripture} className="rounded-md border border-[#d8e1db] bg-[#fbfcf8] px-2 py-1 text-xs font-semibold text-[#68766d]">
                      {source.scripture}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <form onSubmit={onAsk} className="border-t border-[#d8e1db] p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Ask in ${mode} mode: ${modeProfile.focus.toLowerCase()}...`}
              className="min-h-20 flex-1 resize-none rounded-lg border border-[#c9d5cd] bg-white/80 px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-[#8b968e] focus:border-[#203a35]"
            />
            <button disabled={isWorking} className="grid h-11 w-full shrink-0 place-items-center rounded-lg bg-[#203a35] text-[#f8f5e8] shadow-lg shadow-[#203a35]/15 transition hover:bg-[#284b43] disabled:opacity-60 sm:size-12 sm:w-auto" aria-label="Send question">
              <Send size={18} />
            </button>
          </div>
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
                key={prompt}
                onClick={() => onPrompt(prompt)}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-[#d8e1db] bg-white/64 px-3 py-3 text-left text-sm font-medium text-[#45534b] transition hover:bg-white"
              >
                {prompt}
                <ChevronRight size={15} />
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
      </aside>
    </div>
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
  ruleText,
  setTitle,
  setPressure,
  setEmotion,
  setCounselName,
  setCounselRole,
  setRuleText,
  onCreateDecision,
  onUpdateDecision,
  onAddCounsel,
  onAddRule,
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
  ruleText: string;
  setTitle: (value: string) => void;
  setPressure: (value: string) => void;
  setEmotion: (value: string) => void;
  setCounselName: (value: string) => void;
  setCounselRole: (value: string) => void;
  setRuleText: (value: string) => void;
  onCreateDecision: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateDecision: (id: string, patch: Partial<WisdomDecision> & { waitingDays?: number | null; event?: string }) => void;
  onAddCounsel: (event: FormEvent<HTMLFormElement>) => void;
  onAddRule: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const activeDecisions = decisions.filter((decision) => decision.status !== "closed");
  const selectedDecision = decisions[0];
  const modeRules = rules.filter((rule) => rule.mode === mode);

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_340px]">
      <section className="space-y-4">
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
      </section>

      <aside className="space-y-4">
        <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Counsel Circle</p>
          <form onSubmit={onAddCounsel} className="mt-3 grid gap-2">
            <input
              value={counselName}
              onChange={(event) => setCounselName(event.target.value)}
              className="h-10 rounded-md border border-[#c9d5cd] bg-white/78 px-3 text-sm outline-none"
              placeholder="Name"
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
            <button className="h-10 rounded-md bg-[#203a35] px-3 text-sm font-semibold text-[#f8f5e8]">Add counsel</button>
          </form>
          <div className="mt-3 space-y-2">
            {counselContacts.slice(0, 5).map((contact) => (
              <div key={contact.id} className="flex items-center gap-2 rounded-lg border border-[#d8e1db] bg-white/64 p-3">
                <Users size={16} className="text-[#405049]" />
                <div>
                  <p className="text-sm font-semibold text-[#203a35]">{contact.name}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-[#718077]">{contact.role}</p>
                </div>
              </div>
            ))}
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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d0ad55]">Premium daily wisdom</p>
          <p className="mt-3 text-sm font-semibold text-[#f3e8bd]">{modeProfile.practices[0]}</p>
          <p className="mt-2 text-sm leading-6 text-[#edf4ee]">A tiny practice for today, shaped by the active wisdom mode.</p>
        </section>

        {selectedDecision?.summary ? (
          <section className="rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#866a24]">Decision Summary Export</p>
            <textarea readOnly value={selectedDecision.summary} className="mt-3 max-h-56 min-h-40 w-full resize-none rounded-md border border-[#c9d5cd] bg-white/78 p-3 text-xs leading-5 text-[#405049]" />
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

function Signal({ active, label }: { active: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-semibold ${active ? "border-[#b8d0c2] bg-[#edf7f1] text-[#245443]" : "border-[#e0c3b7] bg-[#fff6f1] text-[#8c3f28]"}`}>
      <Check size={16} />
      {label}
    </div>
  );
}

function LibraryPanel({ entries, search, setSearch, mode }: { entries: WisdomEntry[]; search: string; setSearch: (value: string) => void; mode: Mode }) {
  return (
    <section className="min-w-0 rounded-xl border border-[#c9d5cd] bg-[#fbfcf8]/78 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xl font-semibold text-[#203a35]">
            <BookOpen size={20} />
            Wisdom Library
          </div>
          <p className="mt-2 text-sm leading-6 text-[#5b6a61]">A curated MVP knowledge base for biblical wisdom retrieval.</p>
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
              <span className="text-sm font-semibold text-[#203a35]">{entry.scripture}</span>
            </div>
            <p className="text-sm font-semibold leading-6 text-[#2e3933]">{entry.principle}</p>
            <p className="mt-3 text-sm leading-6 text-[#59675f]">{entry.application}</p>
          </article>
        ))}
      </div>
    </section>
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
