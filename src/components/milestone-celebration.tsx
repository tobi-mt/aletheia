"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import type { ThemeColors } from "@/lib/themes";

export type CelebrationTier = "whisper" | "milestone" | "peak";

export type CelebrationEvent =
  | "challenge_day_marked_complete"
  | "challenge_completed"
  | "streak_milestone_unlocked"
  | "first_reflection_saved"
  | "onboarding_completed"
  | "first_rule_saved"
  | "first_gratitude_saved";

export type CelebrationRequest = {
  event: CelebrationEvent;
  tier: CelebrationTier;
  title: string;
  body?: string;
  source?: "home" | "account" | "reflect" | "challenges" | "onboarding" | "system";
  challengeId?: string;
  milestone?: number;
  timestamp?: number;
};

type MilestoneCelebrationOptions = {
  onTriggered?: (payload: CelebrationAnalyticsPayload) => void;
};

export type CelebrationStyle = "confetti" | "fireworks" | "shootingStars" | "sparkles";

type ActiveCelebration = CelebrationRequest & {
  id: string;
  startedAt: number;
  duration: number;
  style: CelebrationStyle;
  intensity: CelebrationIntensity;
};

type CelebrationParticle = {
  id: string;
  style: CelebrationStyle;
  x: number;
  y: number;
  size: number;
  drift: number;
  driftY: number;
  rotation: number;
  delay: number;
  duration: number;
  opacity: number;
  shape: "rect" | "circle" | "leaf";
  color: string;
};

export type CelebrationAnalyticsPayload = Pick<
  CelebrationRequest,
  "event" | "tier" | "source" | "challengeId" | "milestone" | "timestamp"
> & { style: CelebrationStyle };

const TIER_PRIORITY: Record<CelebrationTier, number> = {
  whisper: 0,
  milestone: 1,
  peak: 2,
};

const STYLE_DURATION: Record<CelebrationStyle, number> = {
  confetti: 1200,
  fireworks: 1700,
  shootingStars: 1500,
  sparkles: 1100,
};

const STYLE_PARTICLE_COUNT: Record<CelebrationStyle, number> = {
  confetti: 18,
  fireworks: 26,
  shootingStars: 16,
  sparkles: 10,
};

type CelebrationIntensity = {
  particleMultiplier: number;
  opacityMin: number;
  opacityMax: number;
  durationMultiplier: number;
  cardScale: number;
  glowAlpha: number;
  accentPulse: number;
  repeatDelay: number;
};

const DEFAULT_INTENSITY: CelebrationIntensity = {
  particleMultiplier: 1,
  opacityMin: 0.45,
  opacityMax: 0.8,
  durationMultiplier: 1,
  cardScale: 1,
  glowAlpha: 1,
  accentPulse: 1,
  repeatDelay: 1,
};

const EVENT_INTENSITY_MATRIX: Partial<Record<CelebrationEvent, CelebrationIntensity>> = {
  challenge_completed: {
    particleMultiplier: 1.18,
    opacityMin: 0.72,
    opacityMax: 1,
    durationMultiplier: 1.08,
    cardScale: 1.02,
    glowAlpha: 1.18,
    accentPulse: 1.15,
    repeatDelay: 0.92,
  },
  streak_milestone_unlocked: {
    particleMultiplier: 0.95,
    opacityMin: 0.56,
    opacityMax: 0.88,
    durationMultiplier: 1,
    cardScale: 1.01,
    glowAlpha: 0.94,
    accentPulse: 1,
    repeatDelay: 1,
  },
  first_reflection_saved: {
    particleMultiplier: 0.45,
    opacityMin: 0.22,
    opacityMax: 0.44,
    durationMultiplier: 0.82,
    cardScale: 0.97,
    glowAlpha: 0.56,
    accentPulse: 0.66,
    repeatDelay: 1.16,
  },
};

const EVENT_PRESENTATIONS: Record<CelebrationEvent, { style: CelebrationStyle; duration: number; intensity: CelebrationIntensity }> = {
  challenge_day_marked_complete: { style: "confetti", duration: STYLE_DURATION.confetti, intensity: DEFAULT_INTENSITY },
  challenge_completed: { style: "fireworks", duration: STYLE_DURATION.fireworks, intensity: EVENT_INTENSITY_MATRIX.challenge_completed ?? DEFAULT_INTENSITY },
  streak_milestone_unlocked: { style: "shootingStars", duration: STYLE_DURATION.shootingStars, intensity: EVENT_INTENSITY_MATRIX.streak_milestone_unlocked ?? DEFAULT_INTENSITY },
  first_reflection_saved: { style: "sparkles", duration: STYLE_DURATION.sparkles, intensity: EVENT_INTENSITY_MATRIX.first_reflection_saved ?? DEFAULT_INTENSITY },
  onboarding_completed: { style: "sparkles", duration: STYLE_DURATION.sparkles, intensity: DEFAULT_INTENSITY },
  first_rule_saved: { style: "sparkles", duration: STYLE_DURATION.sparkles, intensity: DEFAULT_INTENSITY },
  first_gratitude_saved: { style: "sparkles", duration: STYLE_DURATION.sparkles, intensity: DEFAULT_INTENSITY },
};

const MILESTONE_COOLDOWN_MS = 12_000;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function normalizeHexChannel(value: string) {
  return value.length === 1 ? `${value}${value}` : value;
}

function parseThemeColor(color: string | undefined) {
  if (!color) {
    return null;
  }

  const hex = color.trim();
  if (hex.startsWith("#")) {
    const normalized = hex.slice(1);
    if (normalized.length === 3 || normalized.length === 4) {
      const [r, g, b, a] = normalized.split("").map(normalizeHexChannel);
      return {
        r: Number.parseInt(r, 16),
        g: Number.parseInt(g, 16),
        b: Number.parseInt(b, 16),
        a: a ? Number.parseInt(a, 16) / 255 : 1,
      };
    }
    if (normalized.length === 6 || normalized.length === 8) {
      const r = Number.parseInt(normalized.slice(0, 2), 16);
      const g = Number.parseInt(normalized.slice(2, 4), 16);
      const b = Number.parseInt(normalized.slice(4, 6), 16);
      const a = normalized.length === 8 ? Number.parseInt(normalized.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
  }

  const rgbMatch = hex.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const values = rgbMatch[1].split(",").map((value) => value.trim());
    const [r, g, b] = values.slice(0, 3).map((value) => Number.parseFloat(value));
    const a = values.length > 3 ? Number.parseFloat(values[3]) : 1;
    if ([r, g, b].every(Number.isFinite)) {
      return { r, g, b, a: Number.isFinite(a) ? a : 1 };
    }
  }

  return null;
}

function rgba(color: string | undefined, alpha: number) {
  const parsed = parseThemeColor(color);
  if (!parsed) {
    return color ?? `rgba(242, 213, 138, ${alpha})`;
  }

  return `rgba(${Math.round(parsed.r)}, ${Math.round(parsed.g)}, ${Math.round(parsed.b)}, ${clamp01(alpha)})`;
}

function mixColors(base: string | undefined, target: string, ratio: number) {
  const baseColor = parseThemeColor(base) ?? parseThemeColor(target);
  const targetColor = parseThemeColor(target);
  if (!baseColor || !targetColor) {
    return base ?? target;
  }

  const amount = clamp01(ratio);
  const inverse = 1 - amount;
  const r = Math.round(baseColor.r * inverse + targetColor.r * amount);
  const g = Math.round(baseColor.g * inverse + targetColor.g * amount);
  const b = Math.round(baseColor.b * inverse + targetColor.b * amount);
  return `rgb(${r}, ${g}, ${b})`;
}

function relativeLuminance(color: string | undefined) {
  const parsed = parseThemeColor(color);
  if (!parsed) {
    return 0.5;
  }

  const transform = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * transform(parsed.r) + 0.7152 * transform(parsed.g) + 0.0722 * transform(parsed.b);
}

function isDarkTheme(theme?: ThemeColors) {
  return relativeLuminance(theme?.bgMain ?? theme?.bgCard ?? theme?.bgCardElevated) < 0.46;
}

type CelebrationThemeTone = {
  particleColors: string[];
  accentColor: string;
  shellBackground: string;
  cardBackground: string;
  cardBorder: string;
  iconBackground: string;
  iconColor: string;
  titleColor: string;
  bodyColor: string;
  glow: string;
  burstRing: string;
  streakColor: string;
  ribbonColor: string;
  shadow: string;
};

function buildCelebrationThemeTone(theme?: ThemeColors): Record<CelebrationStyle, CelebrationThemeTone> {
  const dark = isDarkTheme(theme);
  const bgCard = theme?.bgCard ?? (dark ? "#17221d" : "#fffdf8");
  const bgCardElevated = theme?.bgCardElevated ?? (dark ? "#20302c" : "#f6f3ea");
  const bgInput = theme?.bgInput ?? (dark ? "#25342f" : "#fffaf2");
  const accentGold = theme?.accentGold ?? (dark ? "#d0ad55" : "#b88c32");
  const accentLight = theme?.accentLight ?? (dark ? "#aabf9f" : "#dfe8d1");
  const primary = theme?.primary ?? (dark ? "#7f9f92" : "#203a35");
  const primaryHover = theme?.primaryHover ?? primary;
  const textPrimary = theme?.textPrimary ?? (dark ? "#fbf7e9" : "#172033");
  const textSecondary = theme?.textSecondary ?? (dark ? "#d1d8d3" : "#5d6473");
  const textOnPrimary = theme?.textOnPrimary ?? (dark ? "#0c1110" : "#ffffff");
  const borderLight = theme?.borderLight ?? (dark ? "#31413b" : "#e7dfcf");
  const borderMedium = theme?.borderMedium ?? (dark ? "#3d4e48" : "#d8c9ad");

  const softGold = mixColors(bgCardElevated, accentGold, dark ? 0.58 : 0.42);
  const softPrimary = mixColors(bgCardElevated, primary, dark ? 0.5 : 0.36);
  const softLight = mixColors(bgCardElevated, accentLight, dark ? 0.46 : 0.28);
  const softInk = mixColors(bgCardElevated, textPrimary, dark ? 0.24 : 0.12);

  return {
    confetti: {
      particleColors: [
        softGold,
        softPrimary,
        softLight,
        mixColors(bgCard, textSecondary, dark ? 0.26 : 0.18),
      ],
      accentColor: accentGold,
      shellBackground: `linear-gradient(180deg, ${mixColors(bgCardElevated, accentGold, dark ? 0.1 : 0.06)}, ${bgCard})`,
      cardBackground: `linear-gradient(180deg, ${mixColors(bgCardElevated, accentGold, dark ? 0.16 : 0.08)}, ${bgCard})`,
      cardBorder: borderLight,
      iconBackground: bgInput,
      iconColor: mixColors(textPrimary, accentGold, dark ? 0.62 : 0.52),
      titleColor: textPrimary,
      bodyColor: textSecondary,
      glow: `radial-gradient(circle at top, ${rgba(accentGold, dark ? 0.1 : 0.08)} 0%, transparent 54%)`,
      burstRing: rgba(accentGold, dark ? 0.16 : 0.1),
      streakColor: rgba(primaryHover, dark ? 0.62 : 0.48),
      ribbonColor: `linear-gradient(90deg, ${rgba(bgCardElevated, dark ? 0.16 : 0.28)} 0%, ${rgba(accentGold, dark ? 0.82 : 0.72)} 40%, ${rgba(accentLight, dark ? 0.62 : 0.46)} 100%)`,
      shadow: dark ? "0 18px 56px rgba(2, 8, 6, 0.52)" : "0 18px 48px rgba(15, 23, 42, 0.14)",
    },
    fireworks: {
      particleColors: [
        mixColors(accentGold, textOnPrimary, dark ? 0.22 : 0.14),
        mixColors(accentGold, primary, dark ? 0.42 : 0.34),
        mixColors(accentGold, bgCardElevated, dark ? 0.52 : 0.38),
        mixColors(textOnPrimary, accentLight, dark ? 0.2 : 0.12),
      ],
      accentColor: accentGold,
      shellBackground: `linear-gradient(180deg, ${mixColors(bgCardElevated, accentGold, dark ? 0.12 : 0.08)}, ${bgCard})`,
      cardBackground: `linear-gradient(180deg, ${mixColors(bgCardElevated, accentGold, dark ? 0.2 : 0.12)}, ${bgCard})`,
      cardBorder: borderMedium,
      iconBackground: mixColors(bgInput, accentGold, dark ? 0.12 : 0.08),
      iconColor: mixColors(textPrimary, accentGold, dark ? 0.7 : 0.55),
      titleColor: textPrimary,
      bodyColor: textSecondary,
      glow: `radial-gradient(circle at top, ${rgba(accentGold, dark ? 0.14 : 0.1)} 0%, transparent 58%)`,
      burstRing: rgba(accentGold, dark ? 0.28 : 0.18),
      streakColor: rgba(accentGold, dark ? 0.92 : 0.8),
      ribbonColor: `linear-gradient(90deg, ${rgba(accentGold, dark ? 0.9 : 0.78)} 0%, ${rgba(primary, dark ? 0.72 : 0.54)} 100%)`,
      shadow: dark ? "0 22px 72px rgba(4, 8, 7, 0.56)" : "0 22px 64px rgba(15, 23, 42, 0.18)",
    },
    shootingStars: {
      particleColors: [
        mixColors(textOnPrimary, accentGold, dark ? 0.18 : 0.1),
        mixColors(accentGold, primary, dark ? 0.34 : 0.26),
        mixColors(textOnPrimary, accentLight, dark ? 0.24 : 0.12),
        mixColors(bgCardElevated, textPrimary, dark ? 0.16 : 0.1),
      ],
      accentColor: mixColors(accentGold, textOnPrimary, dark ? 0.12 : 0.08),
      shellBackground: `linear-gradient(180deg, ${mixColors(bgCardElevated, primary, dark ? 0.12 : 0.08)}, ${bgCard})`,
      cardBackground: `linear-gradient(180deg, ${mixColors(bgCardElevated, primary, dark ? 0.14 : 0.1)}, ${bgCard})`,
      cardBorder: borderLight,
      iconBackground: mixColors(bgInput, primary, dark ? 0.12 : 0.08),
      iconColor: mixColors(textPrimary, accentGold, dark ? 0.52 : 0.42),
      titleColor: textPrimary,
      bodyColor: textSecondary,
      glow: `radial-gradient(circle at top, ${rgba(primary, dark ? 0.12 : 0.08)} 0%, transparent 58%)`,
      burstRing: rgba(primary, dark ? 0.2 : 0.12),
      streakColor: rgba(textOnPrimary, dark ? 0.82 : 0.72),
      ribbonColor: `linear-gradient(90deg, ${rgba(textOnPrimary, dark ? 0.96 : 0.82)} 0%, ${rgba(accentGold, dark ? 0.88 : 0.74)} 52%, ${rgba(accentLight, dark ? 0.68 : 0.46)} 100%)`,
      shadow: dark ? "0 18px 56px rgba(4, 8, 7, 0.5)" : "0 18px 48px rgba(15, 23, 42, 0.12)",
    },
    sparkles: {
      particleColors: [
        softInk,
        softGold,
        softLight,
        mixColors(bgCardElevated, accentGold, dark ? 0.44 : 0.3),
      ],
      accentColor: mixColors(accentGold, textPrimary, dark ? 0.2 : 0.12),
      shellBackground: `linear-gradient(180deg, ${mixColors(bgCardElevated, accentLight, dark ? 0.08 : 0.05)}, ${bgCard})`,
      cardBackground: `linear-gradient(180deg, ${mixColors(bgCardElevated, accentGold, dark ? 0.1 : 0.06)}, ${bgCard})`,
      cardBorder: borderLight,
      iconBackground: bgInput,
      iconColor: mixColors(textPrimary, accentGold, dark ? 0.6 : 0.48),
      titleColor: textPrimary,
      bodyColor: textSecondary,
      glow: `radial-gradient(circle at top, ${rgba(accentLight, dark ? 0.1 : 0.06)} 0%, transparent 58%)`,
      burstRing: rgba(accentGold, dark ? 0.14 : 0.08),
      streakColor: rgba(accentGold, dark ? 0.64 : 0.54),
      ribbonColor: `linear-gradient(90deg, ${rgba(bgCardElevated, dark ? 0.18 : 0.26)} 0%, ${rgba(accentGold, dark ? 0.72 : 0.64)} 44%, ${rgba(accentLight, dark ? 0.54 : 0.36)} 100%)`,
      shadow: dark ? "0 18px 54px rgba(2, 8, 6, 0.44)" : "0 18px 48px rgba(15, 23, 42, 0.12)",
    },
  };
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return function next() {
    let value = seed += 0x6d2b79f5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function getRandomParticleShape(random: () => number): CelebrationParticle["shape"] {
  const roll = random();
  if (roll < 0.58) return "rect";
  if (roll < 0.82) return "circle";
  return "leaf";
}

function buildParticles(celebration: ActiveCelebration, palette: string[]): CelebrationParticle[] {
  const random = mulberry32(hashString(celebration.id));
  const count = Math.max(6, Math.round(STYLE_PARTICLE_COUNT[celebration.style] * celebration.intensity.particleMultiplier));

  return Array.from({ length: count }, (_, index) => {
    const sizeBase = celebration.style === "fireworks" ? 5 : celebration.tier === "peak" ? 9 : celebration.tier === "milestone" ? 8 : 7;
    const size = (sizeBase + random() * (celebration.style === "sparkles" ? 5 : celebration.tier === "whisper" ? 6 : 8)) * (0.92 + celebration.intensity.cardScale * 0.08);
    const x = celebration.style === "fireworks" ? 40 + random() * 20 : celebration.style === "shootingStars" ? 18 + random() * 64 : 8 + random() * 84;
    const y = celebration.style === "fireworks" ? 28 + random() * 24 : celebration.style === "shootingStars" ? -10 - random() * 10 : -8 - random() * 10;
    const drift = celebration.style === "fireworks"
      ? (random() - 0.5) * 38
      : celebration.style === "shootingStars"
        ? 26 + random() * 18
        : (random() - 0.5) * (celebration.tier === "peak" ? 26 : 20);
    const driftY = celebration.style === "fireworks"
      ? -10 - random() * 14
      : celebration.style === "shootingStars"
        ? 42 + random() * 20
        : 0;
    const rotation = celebration.style === "fireworks"
      ? (random() - 0.5) * 1120
      : celebration.tier === "peak"
        ? (random() - 0.5) * 920
        : (random() - 0.5) * 760;
    const delay = random() * (celebration.style === "fireworks" ? 0.18 : 0.28) * celebration.intensity.repeatDelay + index * 0.006;
    const duration = (celebration.duration / 1000) * celebration.intensity.durationMultiplier + random() * (celebration.style === "sparkles" ? 0.14 : 0.22);
    const opacity = celebration.intensity.opacityMin + random() * (celebration.intensity.opacityMax - celebration.intensity.opacityMin);
    const shape = getRandomParticleShape(random);

    return {
      id: `${celebration.id}-${index}`,
      style: celebration.style,
      x,
      y,
      size,
      drift,
      driftY,
      rotation,
      delay,
      duration,
      opacity,
      shape,
      color: palette[index % palette.length],
    };
  });
}

function presentationForRequest(request: CelebrationRequest) {
  const presentation = EVENT_PRESENTATIONS[request.event];
  if (presentation) {
    return presentation;
  }

  return request.tier === "peak"
    ? { style: "fireworks" as const, duration: STYLE_DURATION.fireworks, intensity: DEFAULT_INTENSITY }
    : { style: "confetti" as const, duration: STYLE_DURATION.confetti, intensity: DEFAULT_INTENSITY };
}

export function useMilestoneCelebration(options: MilestoneCelebrationOptions = {}) {
  const [celebration, setCelebration] = useState<ActiveCelebration | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const celebrationRef = useRef<ActiveCelebration | null>(null);
  const clearTimerRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef(0);
  const lastPriorityRef = useRef(-1);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setPrefersReducedMotion(media.matches);
    apply();
    media.addEventListener?.("change", apply);
    return () => {
      media.removeEventListener?.("change", apply);
    };
  }, []);

  useEffect(() => () => {
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    celebrationRef.current = null;
    setCelebration(null);
  }, []);

  const celebrate = useCallback((request: CelebrationRequest) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return false;
    }

    if (prefersReducedMotion || document.visibilityState === "hidden") {
      return false;
    }

    const now = Date.now();
    const requestPriority = TIER_PRIORITY[request.tier];
    const currentCelebration = celebrationRef.current;
    const currentPriority = currentCelebration ? TIER_PRIORITY[currentCelebration.tier] : -1;
    const withinCooldown = now < cooldownUntilRef.current;

    if (currentCelebration) {
      if (requestPriority < currentPriority) {
        return false;
      }

      if (requestPriority === currentPriority && now - currentCelebration.startedAt < 450) {
        return false;
      }
    } else if (withinCooldown && requestPriority <= lastPriorityRef.current) {
      return false;
    }

    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }

    const presentation = presentationForRequest(request);
    const duration = presentation.duration;
    const active: ActiveCelebration = {
      ...request,
      id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${request.event}-${Math.random().toString(36).slice(2)}`,
      startedAt: now,
      duration,
      style: presentation.style,
      intensity: presentation.intensity,
      timestamp: request.timestamp ?? now,
    };

    celebrationRef.current = active;
    setCelebration(active);
    options.onTriggered?.({
      event: active.event,
      tier: active.tier,
      source: active.source,
      challengeId: active.challengeId,
      milestone: active.milestone,
      timestamp: active.timestamp,
      style: active.style,
    });
    cooldownUntilRef.current = now + MILESTONE_COOLDOWN_MS;
    lastPriorityRef.current = requestPriority;
    clearTimerRef.current = window.setTimeout(() => {
      celebrationRef.current = null;
      setCelebration(null);
      clearTimerRef.current = null;
    }, duration);
    return true;
  }, [options, prefersReducedMotion]);

  return {
    celebration,
    celebrate,
    clear,
    prefersReducedMotion,
  };
}

function PeakSparkleAccent({
  celebration,
  tone,
  intensity,
}: {
  celebration: ActiveCelebration;
  tone: CelebrationThemeTone;
  intensity: CelebrationIntensity;
}) {
  const sparkles = [
    { key: "tl", left: "22%", top: "22%", delay: 0 },
    { key: "tr", left: "78%", top: "24%", delay: 0.08 },
    { key: "bl", left: "30%", top: "68%", delay: 0.16 },
    { key: "br", left: "70%", top: "66%", delay: 0.22 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {sparkles.map((sparkle) => (
        <motion.span
          key={`${celebration.id}-${sparkle.key}`}
          className="absolute"
          initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
          animate={{ opacity: [0, 0.9 * intensity.accentPulse, 0], scale: [0.8, 1.05 * intensity.cardScale, 0.92], rotate: [-8, 0, 10] }}
          transition={{
            duration: 1.15 * intensity.durationMultiplier,
            delay: sparkle.delay,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 0.2 * intensity.repeatDelay,
            ease: "easeInOut",
          }}
          style={{ left: sparkle.left, top: sparkle.top }}
        >
          <Sparkles
            size={11}
            style={{
              color: tone.accentColor,
              filter: `drop-shadow(0 0 10px ${rgba(tone.accentColor, 0.36)})`,
            }}
          />
        </motion.span>
      ))}
    </div>
  );
}

function FireworksBurstAccent({
  celebration,
  tone,
  intensity,
}: {
  celebration: ActiveCelebration;
  tone: CelebrationThemeTone;
  intensity: CelebrationIntensity;
}) {
  const bursts = [
    { key: "left", left: "28%", top: "24%", scale: 1, delay: 0 },
    { key: "center", left: "50%", top: "18%", scale: 1.22, delay: 0.14 },
    { key: "right", left: "72%", top: "25%", scale: 0.96, delay: 0.24 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {bursts.map((burst) => (
        <motion.div
          key={`${celebration.id}-${burst.key}`}
          className="absolute rounded-full border"
          initial={{ opacity: 0, scale: 0.45 }}
          animate={{ opacity: [0, 0.55 * intensity.accentPulse, 0], scale: [0.45, burst.scale * intensity.cardScale, burst.scale * 1.22] }}
          transition={{
            duration: 1.35 * intensity.durationMultiplier,
            delay: burst.delay,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 0.28 * intensity.repeatDelay,
            ease: "easeOut",
          }}
          style={{
            left: burst.left,
            top: burst.top,
            width: "5.5rem",
            height: "5.5rem",
            borderColor: tone.burstRing,
            boxShadow: `0 0 0 1px ${rgba(tone.accentColor, 0.06)}, 0 0 22px ${rgba(tone.accentColor, 0.18)}`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}

function ShootingStarAccent({
  celebration,
  tone,
  intensity,
}: {
  celebration: ActiveCelebration;
  tone: CelebrationThemeTone;
  intensity: CelebrationIntensity;
}) {
  const streaks = [
    { key: "primary", left: "10%", top: "18%", delay: 0, width: "5.75rem" },
    { key: "secondary", left: "22%", top: "8%", delay: 0.12, width: "4.8rem" },
    { key: "tertiary", left: "72%", top: "14%", delay: 0.22, width: "5rem" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {streaks.map((streak) => (
        <motion.div
          key={`${celebration.id}-${streak.key}`}
          className="absolute overflow-hidden rounded-full"
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.85 }}
          animate={{
            opacity: [0, 0.92 * intensity.accentPulse, 0],
            x: [0, 44, 92],
            y: [0, 26, 52],
            scale: [0.85, 1, 1 * intensity.cardScale],
          }}
          transition={{
            duration: 1.25 * intensity.durationMultiplier,
            delay: streak.delay,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 0.18 * intensity.repeatDelay,
            ease: [0.16, 0.8, 0.2, 1],
          }}
          style={{
            left: streak.left,
            top: streak.top,
            width: streak.width,
            height: "0.5rem",
            transform: "rotate(-28deg)",
            background: `linear-gradient(90deg, transparent 0%, ${tone.streakColor} 36%, ${rgba(tone.accentColor, 0.95)} 58%, transparent 100%)`,
            boxShadow: `0 0 16px ${rgba(tone.accentColor, 0.32)}`,
          }}
        />
      ))}
    </div>
  );
}

function RibbonConfettiAccent({
  celebration,
  tone,
  intensity,
}: {
  celebration: ActiveCelebration;
  tone: CelebrationThemeTone;
  intensity: CelebrationIntensity;
}) {
  const ribbons = [
    { key: "left", left: "22%", top: "20%", rotate: -12, delay: 0, width: "4.4rem" },
    { key: "mid", left: "50%", top: "16%", rotate: 8, delay: 0.1, width: "5rem" },
    { key: "right", left: "76%", top: "22%", rotate: -6, delay: 0.2, width: "4.2rem" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {ribbons.map((ribbon) => (
        <motion.div
          key={`${celebration.id}-${ribbon.key}`}
          className="absolute rounded-full"
          initial={{ opacity: 0, y: -4, scale: 0.92 }}
          animate={{ opacity: [0, 0.52 * intensity.accentPulse, 0], y: [0, 4, 8], scale: [0.92, 1 * intensity.cardScale, 1] }}
          transition={{
            duration: 1.1 * intensity.durationMultiplier,
            delay: ribbon.delay,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 0.2 * intensity.repeatDelay,
            ease: "easeInOut",
          }}
          style={{
            left: ribbon.left,
            top: ribbon.top,
            width: ribbon.width,
            height: "0.4rem",
            transform: `rotate(${ribbon.rotate}deg)`,
            background: tone.ribbonColor,
            boxShadow: `0 0 10px ${rgba(tone.accentColor, 0.18)}`,
          }}
        />
      ))}
    </div>
  );
}

function CornerShimmerAccent({
  celebration,
  tone,
  intensity,
}: {
  celebration: ActiveCelebration;
  tone: CelebrationThemeTone;
  intensity: CelebrationIntensity;
}) {
  const sparkles = [
    { key: "tl", left: "9%", top: "12%", delay: 0, size: 10, driftX: 5, driftY: 4, rotate: -10 },
    { key: "tr", left: "86%", top: "16%", delay: 0.1, size: 9, driftX: -4, driftY: 5, rotate: 8 },
    { key: "bl", left: "14%", top: "74%", delay: 0.18, size: 8, driftX: 4, driftY: -3, rotate: -6 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {sparkles.map((sparkle) => (
        <motion.span
          key={`${celebration.id}-${sparkle.key}`}
          className="absolute"
          initial={{ opacity: 0, scale: 0.72, rotate: sparkle.rotate }}
          animate={{
            opacity: [0, 0.24 * intensity.accentPulse, 0],
            x: [0, sparkle.driftX, sparkle.driftX * 1.2],
            y: [0, sparkle.driftY, sparkle.driftY * 1.2],
            scale: [0.72, 0.9 * intensity.cardScale, 0.8],
            rotate: [sparkle.rotate, 0, sparkle.rotate * -0.6],
          }}
          transition={{
            duration: 0.95 * intensity.durationMultiplier,
            delay: sparkle.delay,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 0.34 * intensity.repeatDelay,
            ease: "easeInOut",
          }}
          style={{ left: sparkle.left, top: sparkle.top }}
        >
          <Sparkles
            size={sparkle.size}
            style={{
              color: tone.accentColor,
              filter: `drop-shadow(0 0 8px ${rgba(tone.accentColor, 0.22)})`,
            }}
          />
        </motion.span>
      ))}
    </div>
  );
}

export function MilestoneCelebrationLayer({
  celebration,
  theme,
  onShown,
}: {
  celebration: ActiveCelebration | null;
  theme?: ThemeColors;
  onShown?: (payload: CelebrationAnalyticsPayload) => void;
}) {
  const particles = useMemo(
    () => {
      if (!celebration) {
        return [];
      }

      return buildParticles(celebration, buildCelebrationThemeTone(theme)[celebration.style].particleColors);
    },
    [celebration, theme]
  );
  const themeTone = useMemo(() => buildCelebrationThemeTone(theme), [theme]);
  const reportedCelebrationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!celebration || reportedCelebrationIdRef.current === celebration.id) {
      return;
    }
    reportedCelebrationIdRef.current = celebration.id;
    onShown?.({
      event: celebration.event,
      tier: celebration.tier,
      source: celebration.source,
      challengeId: celebration.challengeId,
      milestone: celebration.milestone,
      timestamp: celebration.timestamp,
      style: celebration.style,
    });
  }, [celebration, onShown]);

  if (!celebration || typeof document === "undefined") {
    return null;
  }

  const activeTone = themeTone[celebration.style];
  const activeToneIntensity = celebration.intensity;

  return createPortal(
    <AnimatePresence>
      <div className="pointer-events-none fixed inset-0 z-[45] overflow-hidden" aria-hidden="true">
        <motion.div
          key={celebration.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.72 + Math.min(1, activeToneIntensity.glowAlpha) * 0.22 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{ background: activeTone.glow }}
        />

        <div className="absolute inset-0 overflow-hidden">
          {particles.map((particle) => (
            <motion.span
              key={particle.id}
              className="absolute"
              initial={{
                opacity: 0,
                y: `${particle.y}vh`,
                x: particle.style === "fireworks" ? "50vw" : `${particle.x}vw`,
                rotate: 0,
                scale: particle.style === "fireworks" ? 0.68 : 0.88,
              }}
              animate={{
                opacity: [0, particle.opacity, 0],
                y: particle.style === "fireworks"
                  ? [`${particle.y}vh`, `${particle.y + particle.driftY}vh`, `${particle.y + particle.driftY * 1.5}vh`]
                  : particle.style === "shootingStars"
                    ? ["-10vh", "55vh", "116vh"]
                    : ["-10vh", "112vh"],
                x: particle.style === "fireworks"
                  ? [`${particle.x}vw`, `${particle.x + particle.drift}vw`, `${particle.x + particle.drift * 1.4}vw`]
                  : particle.style === "shootingStars"
                    ? [`${particle.x}vw`, `${particle.x + particle.drift}vw`]
                    : [0, particle.drift, particle.drift * 0.7],
                rotate: [0, particle.rotation],
                scale: particle.style === "fireworks" ? [0.7, 1.18, 0.88] : [0.92, 1, 0.96],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: particle.style === "shootingStars" ? [0.12, 0.74, 0.18, 1] : [0.12, 0.82, 0.18, 1],
              }}
              style={{
                left: particle.style === "fireworks" ? "50%" : `${particle.x}%`,
                top: `${Math.max(-14, particle.y)}vh`,
                width: particle.style === "shootingStars" ? `${particle.size * 2.2}px` : `${particle.size}px`,
                height: `${particle.style === "shootingStars" ? Math.max(2.5, particle.size * 0.28) : particle.style === "fireworks" ? particle.size * 1.4 : particle.shape === "rect" ? particle.size * 1.55 : particle.size}px`,
                borderRadius: particle.shape === "circle" ? "999px" : particle.shape === "leaf" ? "999px 999px 999px 0" : "999px",
                background: particle.color,
                boxShadow: `0 0 18px color-mix(in srgb, ${particle.color} 22%, transparent)`,
                transformOrigin: particle.style === "fireworks" ? "center center" : "center top",
                color: particle.color,
                backgroundImage: particle.style === "shootingStars"
                  ? "linear-gradient(90deg, transparent 0%, currentColor 42%, transparent 100%)"
                  : undefined,
              }}
            />
          ))}
        </div>

        <div className="absolute inset-x-0 top-16 flex justify-center px-4 sm:top-20">
          <motion.div
            key={`${celebration.id}-card`}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: activeToneIntensity.cardScale }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="max-w-[24rem] rounded-[1.4rem] border px-4 py-3.5 text-center shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur-md sm:px-5"
            style={{
              borderColor: activeTone.cardBorder,
              background: activeTone.cardBackground,
              color: activeTone.titleColor,
              position: "relative",
              boxShadow: activeTone.shadow,
            }}
          >
            {celebration.style === "fireworks" ? (
              <FireworksBurstAccent celebration={celebration} tone={activeTone} intensity={activeToneIntensity} />
            ) : celebration.style === "shootingStars" ? (
              <ShootingStarAccent celebration={celebration} tone={activeTone} intensity={activeToneIntensity} />
            ) : celebration.event === "first_reflection_saved" ? (
              <CornerShimmerAccent celebration={celebration} tone={activeTone} intensity={activeToneIntensity} />
            ) : celebration.style === "sparkles" ? (
              <RibbonConfettiAccent celebration={celebration} tone={activeTone} intensity={activeToneIntensity} />
            ) : celebration.tier === "peak" ? (
              <PeakSparkleAccent celebration={celebration} tone={activeTone} intensity={activeToneIntensity} />
            ) : null}
            <div className="mx-auto flex size-10 items-center justify-center rounded-full border" style={{ borderColor: activeTone.cardBorder, backgroundColor: activeTone.iconBackground, color: activeTone.iconColor }}>
              <Sparkles size={18} />
            </div>
            <p className="mt-3 text-[1.03rem] font-semibold leading-6" style={{ color: activeTone.titleColor }}>
              {celebration.title}
            </p>
            {celebration.body ? (
              <p className="mt-1.5 text-sm leading-6" style={{ color: activeTone.bodyColor }}>
                {celebration.body}
              </p>
            ) : null}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
