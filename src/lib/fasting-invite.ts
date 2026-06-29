import type { ReadWithMeInviteRecipient } from "@/lib/read-with-me-invite";

export type FastingInviteDurationUnit = "days";

export type FastingInviteDetails = {
  kind: "fasting";
  bookTitle?: string;
  author?: string;
  edition?: string;
  durationValue: number | null;
  durationUnit: FastingInviteDurationUnit;
  startDate: string;
  goal: string;
  cadence: string;
  note: string;
  recipients: ReadWithMeInviteRecipient[];
  focus?: string;
  pendingAfterValue?: number | null;
  pendingAfterUnit?: "hours" | "days";
};

export type FastingDayPlan = {
  day: number;
  scripture: string;
  principle: string;
  prompt: string;
  practice: string;
};

export const defaultFastingInviteDetails: FastingInviteDetails = {
  kind: "fasting",
  bookTitle: "",
  author: "",
  edition: "",
  durationValue: 7,
  durationUnit: "days",
  startDate: "",
  goal: "",
  cadence: "One day at a time, with prayer, clarity, and shared support.",
  note: "",
  recipients: [],
  focus: "",
  pendingAfterValue: 24,
  pendingAfterUnit: "hours",
};

const FASTING_DAY_TEMPLATES: FastingDayPlan[] = [
  {
    day: 1,
    scripture: "Matthew 6:16-18",
    principle: "Fast for God, not for display.",
    prompt: "What do you want to bring quietly before God today?",
    practice: "Begin the fast with a clear intention.",
  },
  {
    day: 2,
    scripture: "Isaiah 58:6",
    principle: "A true fast loosens what is heavy and unjust.",
    prompt: "What is this fast helping you release?",
    practice: "Name one attachment you are loosening today.",
  },
  {
    day: 3,
    scripture: "Psalm 63:1",
    principle: "Desire can become prayer when hunger is named honestly.",
    prompt: "What do you crave that only God can satisfy?",
    practice: "Turn one craving into a brief prayer.",
  },
  {
    day: 4,
    scripture: "Joel 2:12-13",
    principle: "Return with your whole heart, not just better habits.",
    prompt: "What would wholehearted return look like today?",
    practice: "Sit with God for a few quiet minutes before reacting.",
  },
  {
    day: 5,
    scripture: "Matthew 4:4",
    principle: "You do not live by bread alone.",
    prompt: "Where do you need to remember what truly sustains you?",
    practice: "Replace one habit with prayer or scripture reading.",
  },
  {
    day: 6,
    scripture: "Philippians 4:6-7",
    principle: "Need can become peace when it is placed before God.",
    prompt: "What pressure can you hand over instead of carrying it alone?",
    practice: "Pray through one source of anxiety slowly.",
  },
  {
    day: 7,
    scripture: "1 Corinthians 9:24-27",
    principle: "The goal is not strain, but faithful discipline.",
    prompt: "What would finishing well look like for this fast?",
    practice: "Plan a gentle return that preserves the fruit.",
  },
];

function cleanText(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function numberOrNull(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

export function normalizeFastingInviteDetails(input: Partial<FastingInviteDetails> = {}): FastingInviteDetails {
  const rawRecipients = (input as { recipients?: unknown }).recipients;
  const recipients = Array.isArray(rawRecipients)
    ? (rawRecipients as unknown[])
        .map((recipient, index) => {
          if (!recipient || typeof recipient !== "object" || Array.isArray(recipient)) {
            return null;
          }
          const record = recipient as Partial<ReadWithMeInviteRecipient>;
          const name = cleanText(record.name, 120);
          if (!name) {
            return null;
          }

          const fallbackId = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "recipient"}-${index + 1}`;
          return {
            id: cleanText(record.id, 80) || fallbackId,
            name,
            note: cleanText(record.note, 160),
          };
        })
        .filter((recipient): recipient is ReadWithMeInviteRecipient => Boolean(recipient))
        .slice(0, 12)
    : [];

  return {
    kind: "fasting",
    bookTitle: "",
    author: "",
    edition: "",
    durationValue: numberOrNull(input.durationValue, 1, 30),
    durationUnit: "days",
    startDate: typeof input.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.startDate.trim()) ? input.startDate.trim() : "",
    goal: cleanText(input.goal, 320),
    cadence: cleanText(input.cadence, 280),
    note: cleanText(input.note, 420),
    recipients,
    focus: cleanText(input.goal, 320),
    pendingAfterValue: 24,
    pendingAfterUnit: "hours",
  };
}

export function buildFastingDayPlan(durationValue: number | null, goal: string): FastingDayPlan[] {
  if (!durationValue) {
    return [];
  }

  return Array.from({ length: durationValue }, (_, index) => {
    const template = FASTING_DAY_TEMPLATES[index % FASTING_DAY_TEMPLATES.length];
    const day = index + 1;
    const goalPhrase = goal.trim();
    const goalSuffix = goalPhrase ? ` for ${goalPhrase.toLowerCase()}` : "";

    return {
      day,
      scripture: template.scripture,
      principle: template.principle,
      prompt: template.prompt.replace("this fast", `this fast${goalSuffix}`),
      practice: template.practice,
    };
  });
}

export function formatFastingDurationLabel(durationValue: number | null) {
  if (durationValue === null) {
    return "";
  }
  return `${durationValue} day${durationValue === 1 ? "" : "s"}`;
}
