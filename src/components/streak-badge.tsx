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
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-base",
  };

  const getStreakEmoji = () => {
    if (days === 0) return "❄️";
    if (days < 7) return "🌱";
    if (days < 30) return "🔥";
    if (days < 100) return "⚡";
    return "👑";
  };

  const getStreakLabel = () => {
    if (days === 0) return ts("streak.start");
    return `${days}d`;
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
  const badgeShadow = `0 10px 22px color-mix(in srgb, ${accentColor} 12%, transparent)`;
  const bgColor =
    days === 0
      ? `linear-gradient(180deg, color-mix(in srgb, ${surfaceColor} 90%, ${accentColor} 10%), ${surfaceColor})`
      : `linear-gradient(180deg, color-mix(in srgb, ${surfaceColor} 84%, ${accentColor} 16%), ${surfaceColor})`;

  const pulseVariants = {
    initial: { opacity: 0.7 },
    animate: { opacity: [0.7, 1, 0.7] },
  };

  return (
    <motion.div
      initial="initial"
      animate={animated && days > 0 ? "milestone" : "initial"}
      variants={{ initial: { scale: 1 }, milestone: { scale: 1.1 } }}
      className="flex flex-col items-center gap-2"
    >
      <motion.div
        className={`${sizeClasses[size]} relative flex items-center justify-center overflow-hidden rounded-full border font-bold`}
        style={{
          background: bgColor,
          borderWidth: "2px",
          borderColor: `color-mix(in srgb, ${accentColor} 38%, ${theme?.borderMedium || accentColor} 62%)`,
          color: iconColor,
          boxShadow: badgeShadow,
        }}
        animate={animated && days > 0 ? "animate" : "initial"}
        variants={pulseVariants}
        transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
      >
        <span className="relative z-10" style={{ color: accentColor }}>
          {getStreakEmoji()}
        </span>
        {size !== "sm" && (
          <span
            className="absolute bottom-0 right-0 z-20 text-xs font-bold"
            style={{
              background: accentColor,
              color: theme?.textOnPrimary || "#ffffff",
              border: `1px solid ${theme?.bgCard || "#ffffff"}`,
              borderRadius: "50%",
              width: "1.25rem",
              height: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {getStreakLabel()}
          </span>
        )}
      </motion.div>

      {showLabel && (
        <motion.div
          className="max-w-[7.5rem] text-center"
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
      <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-6 py-4 rounded-2xl shadow-2xl max-w-sm">
        <p className="text-xl font-bold text-center">{getMessage()}</p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-white/30 hover:bg-white/40 px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            {ts("streak.celebrate")}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white text-orange-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            {ts("streak.share")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
