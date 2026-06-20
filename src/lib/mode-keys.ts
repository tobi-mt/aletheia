export const MODE_KEYS = {
  MONEY: "Money",
  WORK: "Work",
  PURPOSE: "Purpose",
  GENEROSITY: "Generosity",
  LIFE: "Life",
} as const;

export type Mode = (typeof MODE_KEYS)[keyof typeof MODE_KEYS];

export const DEFAULT_MODE: Mode = MODE_KEYS.MONEY;
