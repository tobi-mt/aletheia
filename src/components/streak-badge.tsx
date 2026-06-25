"use client";

import React from "react";
import { motion } from "framer-motion";
import { ThemeColors } from "@/lib/themes";

export interface StreakBadgeProps {
  days: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
  theme?: ThemeColors;
  ts: (key: string, fallback?: string) => string;
}

export function StreakBadge({
  days,
  size = "md",
  showLabel = true,
  animated = true,
  theme,
  ts,
}: StreakBadgeProps) {
  const sizeClasses = {
    sm: {
      shell: "px-3 py-2.5",
      icon: "h-8 w-8 text-xs",
    },
    md: {
      shell: "px-3.5 py-3",
      icon: "h-10 w-10 text-sm",
    },
    lg: {
      shell: "px-4 py-3.5",
      icon: "h-12 w-12 text-base",
    },
  };

  const getStreakEmoji = () => {
    if (days === 0) return "❄️";
    if (days < 7) return "🌱";
    if (days < 30) return "🔥";
    if (days < 100) return "⚡";
    return "👑";
  };

  const getMilestoneText = () => {
    if (days >= 365) return ts("streak.milestone365");
    if (days >= 100) return ts("streak.milestone100");
    if (days >= 30) return ts("streak.milestone30");
    if (days >= 7) return ts("streak.milestone7");
    return null;
  };

  const accentColor = theme?.accentGold || "#ff6b35";
  const surfaceColor = theme?.bgCardElevated || theme?.bgCard || "#ffffff";
  const iconColor = theme?.textPrimary || "#1f2937";
  const labelColor = theme?.textSecondary || iconColor;
  const milestoneColor = theme?.textPrimary || iconColor;
  const badgeShadow = `0 12px 24px color-mix(in srgb, ${accentColor} 10%, transparent)`;
  const shellBorder = `color-mix(in srgb, ${accentColor} 32%, ${theme?.borderMedium || accentColor} 68%)`;
  const countText = days === 0 ? ts("streak.start") : `${days}`;

  return (
    <motion.div
      initial="initial"
      animate={animated && days > 0 ? "milestone" : "initial"}
      variants={{ initial: { scale: 1 }, milestone: { scale: 1.1 } }}
      className={`inline-flex flex-col items-center gap-2 rounded-[1.35rem] border text-center ${sizeClasses[size].shell}`}
    >
      <div
        className={`${sizeClasses[size].icon} relative flex items-center justify-center rounded-full border font-bold`}
        style={{
          background: `linear-gradient(180deg, color-mix(in srgb, ${surfaceColor} 92%, ${accentColor} 8%), ${surfaceColor})`,
          borderWidth: "2px",
          borderColor: shellBorder,
          color: iconColor,
          boxShadow: badgeShadow,
        }}
      >
        <span className="relative z-10" style={{ color: accentColor }}>
          {getStreakEmoji()}
        </span>
      </div>

      {size !== "sm" && (
        <span
          className="inline-flex min-w-[3.35rem] items-center justify-center rounded-full border px-2.5 py-1 text-[0.72rem] font-bold leading-none tracking-[0.08em]"
          style={{
            background: `linear-gradient(180deg, color-mix(in srgb, ${surfaceColor} 94%, ${accentColor} 6%), ${surfaceColor})`,
            color: theme?.textPrimary || "#1f2937",
            borderColor: shellBorder,
            boxShadow: `0 6px 14px color-mix(in srgb, ${accentColor} 8%, transparent)`,
          }}
        >
          {countText}
        </span>
      )}

      {showLabel && (
        <motion.div
          className="max-w-[8rem] text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {getMilestoneText() ? (
            <p className="text-sm font-semibold" style={{ color: milestoneColor }}>
              {getMilestoneText()}
            </p>
          ) : (
            <p className="text-xs font-medium" style={{ color: labelColor }}>
              {ts("streak.keepGoing")}
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export function StreakAchievementNotification({
  milestone,
  onClose,
  ts,
}: {
  milestone: number;
  onClose: () => void;
  ts: (key: string, fallback?: string) => string;
}) {
  const getMessage = () => {
    switch (milestone) {
      case 7:   return ts("streak.achievement7");
      case 30:  return ts("streak.achievement30");
      case 100: return ts("streak.achievement100");
      case 365: return ts("streak.achievement365");
      default:  return ts("streak.achievementUnlocked");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
    >
      <div className="max-w-[19rem] rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 px-6 py-4 text-white shadow-2xl sm:max-w-sm">
        <p className="text-xl font-bold text-center">{getMessage()}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-white/30 px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors hover:bg-white/40"
          >
            {ts("streak.celebrate")}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold whitespace-nowrap text-orange-600 transition-colors hover:bg-gray-100"
          >
            {ts("streak.share")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
