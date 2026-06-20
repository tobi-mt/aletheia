export const STUDY_THEME_KEYS = {
  TRUST: "trust",
  STEWARDSHIP: "stewardship",
  WISDOM: "wisdom",
  GENEROSITY: "generosity",
  PERSEVERANCE: "perseverance",
} as const;

export type StudyThemeKey = (typeof STUDY_THEME_KEYS)[keyof typeof STUDY_THEME_KEYS];
