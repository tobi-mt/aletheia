import type { LanguageCode } from "@/lib/localization";
import type { ThemeColors } from "@/lib/themes";
import type { Mode } from "@/lib/wisdom-data";

export type SurfaceTranslator = (key: string, fallback?: string) => string;

export type { ThemeColors } from "@/lib/themes";

export type SurfaceIdentity = {
  language: LanguageCode;
  mode: Mode;
};

export type SurfaceLoadingProps = {
  theme: ThemeColors;
  label: string;
};
