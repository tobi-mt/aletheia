import type { LanguageCode } from "@/lib/localization";
import type { Mode } from "@/lib/wisdom-data";

export type SurfaceTranslator = (key: string, fallback?: string) => string;

export type ThemeColors = {
  primary: string;
  primaryHover: string;
  primaryText: string;
  bgMain: string;
  bgGradient: string;
  bgCard: string;
  bgCardElevated: string;
  bgInput: string;
  bgNav: string;
  bgNavBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  borderLight: string;
  borderMedium: string;
  borderStrong: string;
  accentGold: string;
  accentLight: string;
  hoverBg: string;
  activeBg: string;
};

export type SurfaceIdentity = {
  language: LanguageCode;
  mode: Mode;
};

export type SurfaceLoadingProps = {
  theme: ThemeColors;
  label: string;
};
