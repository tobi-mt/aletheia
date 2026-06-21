export type ReadWithMeInviteDurationUnit = "days" | "weeks" | "months";
export type ReadWithMeInvitePendingWindowUnit = "hours" | "days";

export type ReadWithMeInviteRecipient = {
  id: string;
  name: string;
  note: string;
};

export type ReadWithMeInviteDetails = {
  bookTitle: string;
  author: string;
  edition: string;
  durationValue: number | null;
  durationUnit: ReadWithMeInviteDurationUnit;
  startDate: string;
  cadence: string;
  focus: string;
  note: string;
  recipients: ReadWithMeInviteRecipient[];
  pendingAfterValue: number | null;
  pendingAfterUnit: ReadWithMeInvitePendingWindowUnit;
};

export const defaultReadWithMeInviteDetails: ReadWithMeInviteDetails = {
  bookTitle: "",
  author: "",
  edition: "",
  durationValue: 4,
  durationUnit: "weeks",
  startDate: "",
  cadence: "Read at a steady pace and hold one brief check-in each week.",
  focus: "",
  note: "",
  recipients: [],
  pendingAfterValue: 24,
  pendingAfterUnit: "hours",
};

function cleanText(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function cleanDate(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
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

function normalizeDurationUnit(value: unknown): ReadWithMeInviteDurationUnit {
  return value === "days" || value === "months" ? value : "weeks";
}

function normalizePendingWindowUnit(value: unknown): ReadWithMeInvitePendingWindowUnit {
  return value === "days" ? value : "hours";
}

function normalizeRecipient(value: unknown, index: number): ReadWithMeInviteRecipient | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Partial<ReadWithMeInviteRecipient>;
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
}

export function normalizeReadWithMeInviteDetails(
  input: Partial<ReadWithMeInviteDetails> = {}
): ReadWithMeInviteDetails {
  const rawRecipients = (input as { recipients?: unknown }).recipients;
  const recipients = Array.isArray(rawRecipients)
    ? (rawRecipients as unknown[])
        .map((recipient, index) => normalizeRecipient(recipient, index))
        .filter((recipient): recipient is ReadWithMeInviteRecipient => Boolean(recipient))
        .slice(0, 12)
    : [];

  return {
    bookTitle: cleanText(input.bookTitle, 160),
    author: cleanText(input.author, 120),
    edition: cleanText(input.edition, 120),
    durationValue: numberOrNull(input.durationValue, 1, 365),
    durationUnit: normalizeDurationUnit(input.durationUnit),
    startDate: cleanDate(input.startDate),
    cadence: cleanText(input.cadence, 280),
    focus: cleanText(input.focus, 320),
    note: cleanText(input.note, 420),
    recipients,
    pendingAfterValue: numberOrNull((input as { pendingAfterValue?: unknown }).pendingAfterValue, 1, 365),
    pendingAfterUnit: normalizePendingWindowUnit((input as { pendingAfterUnit?: unknown }).pendingAfterUnit),
  };
}

export function formatReadWithMeDurationLabel(
  durationValue: number | null,
  durationUnit: ReadWithMeInviteDurationUnit
) {
  if (durationValue === null) {
    return "";
  }
  const unit = durationValue === 1 ? durationUnit.replace(/s$/, "") : durationUnit;
  return `${durationValue} ${unit}`;
}

export function formatReadWithMePendingWindowLabel(
  pendingAfterValue: number | null,
  pendingAfterUnit: ReadWithMeInvitePendingWindowUnit
) {
  if (pendingAfterValue === null) {
    return "";
  }
  const unit = pendingAfterValue === 1 ? pendingAfterUnit.replace(/s$/, "") : pendingAfterUnit;
  return `after ${pendingAfterValue} ${unit}`;
}
