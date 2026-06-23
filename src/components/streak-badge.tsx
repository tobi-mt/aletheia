"use client";

import React from "react";
import { motion } from "framer-motion";

export interface StreakBadgeProps {
  days: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
  theme?: any;
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
    if (days === 0) return ts("streak.start", "Start");
    return `${days}d`;
  };

  const getMilestoneText = () => {
    if (days >= 365) return ts("streak.milestone365", "1-Year Master 👑");
    if (days >= 100) return ts("streak.milestone100", "100-Day Legend ⚡");
    if (days >= 30) return ts("streak.milestone30", "30-Day Warrior 🔥");
    if (days >= 7) return ts("streak.milestone7", "7-Day Sprout 🌱");
    return null;
  };

  const bgColor =
    days === 0
      ? `rgba(${theme?.accentRgb || "100, 100, 100"}, 0.1)`
      : `rgba(${theme?.accentRgb || "255, 107, 53"}, 0.15)`;

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
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold relative`}
        style={{
          background: bgColor,
          borderWidth: "2px",
          borderColor: theme?.accentColor || "rgba(255, 107, 53, 0.3)",
        }}
        animate={animated && days > 0 ? "animate" : "initial"}
        variants={pulseVariants}
        transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
      >
        <span>{getStreakEmoji()}</span>
        {size !== "sm" && (
          <span
            className="absolute bottom-0 right-0 text-xs font-bold"
            style={{
              background: theme?.accentColor || "#ff6b35",
              color: "white",
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
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {getMilestoneText() ? (
            <p className="text-sm font-semibold">{getMilestoneText()}</p>
          ) : (
            <p className="text-xs opacity-60">{ts("streak.keepGoing", "Keep going!")}</p>
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
      case 7:   return ts("streak.achievement7",   "7-Day Sprout! You're building consistency!");
      case 30:  return ts("streak.achievement30",  "30-Day Warrior! Amazing dedication!");
      case 100: return ts("streak.achievement100", "100-Day Legend! You're unstoppable!");
      case 365: return ts("streak.achievement365", "1-Year Master! You've transformed your life!");
      default:  return ts("streak.achievementUnlocked", "Achievement Unlocked!");
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
            {ts("streak.celebrate", "Celebrate")}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white text-orange-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            {ts("streak.share", "Share")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
