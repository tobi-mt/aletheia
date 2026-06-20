export const THEME_KEYS = {
  STEWARDSHIP: "Stewardship",
  DEBT: "Debt",
  CONTENTMENT: "Contentment",
  COUNSEL: "Counsel",
  COST_COUNTING: "Cost Counting",
  GENEROSITY: "Generosity",
  DILIGENCE: "Diligence",
  PROVISION_AND_ANXIETY: "Provision and Anxiety",
  RECOVERY: "Recovery",
  CONFESSION: "Confession",
  PURITY: "Purity",
  FREEDOM: "Freedom",
} as const;

export type ThemeKey = (typeof THEME_KEYS)[keyof typeof THEME_KEYS];

export const DEFAULT_TODAY_VISUAL_THEME: ThemeKey = THEME_KEYS.CONTENTMENT;
