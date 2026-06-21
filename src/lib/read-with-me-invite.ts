export type ReadWithMeInviteDurationUnit = "days" | "weeks" | "months";

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

export function normalizeReadWithMeInviteDetails(
  input: Partial<ReadWithMeInviteDetails> = {}
): ReadWithMeInviteDetails {
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
