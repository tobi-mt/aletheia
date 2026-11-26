export type ThemeColors = {
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

export function accessibleAccentText(theme: ThemeColors) {
  return theme.bgMain === "#0e1514" || theme.bgMain === "#050605" ? theme.accentGold : theme.primary;
}
