"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Clock3, CheckCircle2 } from "lucide-react";

export interface TimelineCheckpoint {
  daysSinceCreation: number;
  type: "created" | "check-in" | "reflection" | "outcome";
  label: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  followUpPrompt?: string;
}

export interface DecisionTimelineProps {
  createdAt: string;
  status: string;
  daysElapsed: number;
  checkpoints: TimelineCheckpoint[];
  onCheckpointClick?: (checkpoint: TimelineCheckpoint) => void;
  theme?: any;
  ts: (key: string, fallback?: string) => string;
}

export function DecisionTimeline({
  createdAt,
  status,
  daysElapsed,
  checkpoints = [],
  onCheckpointClick,
  theme,
  ts,
}: DecisionTimelineProps) {
  const defaultCheckpoints: TimelineCheckpoint[] = useMemo(
    () => generateDecisionCheckpoints(new Date(createdAt), daysElapsed, ts),
    [createdAt, daysElapsed, ts]
  );

  const timelineCheckpoints = checkpoints.length > 0 ? checkpoints : defaultCheckpoints;
  const nextCheckpoint = timelineCheckpoints.find((cp) => !cp.completed);
  const progress = Math.min((daysElapsed / 30) * 100, 100);

  const getCheckpointIcon = (type: string) => {
    switch (type) {
      case "created": return "✨";
      case "check-in": return "💭";
      case "reflection": return "📝";
      case "outcome": return "🎯";
      default: return "•";
    }
  };

  const getCheckpointColor = (completed: boolean) => {
    if (theme) return completed ? theme.accentGold : theme.textTertiary;
    return completed ? "#f59e0b" : "#9ca3af";
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium" style={{ color: theme?.textPrimary }}>
            {ts("decisionTimeline.title", "Decision Journey")}
          </span>
          <span style={{ color: theme?.textSecondary }}>
            {ts("decisionTimeline.daysProgress", "{days} of 30 days").replace("{days}", String(daysElapsed))}
          </span>
        </div>
        <motion.div
          className="h-2 w-full rounded-full overflow-hidden"
          style={{ background: theme?.bgCard }}
        >
          <motion.div
            className="h-full"
            style={{ background: theme?.accentGold || "#f59e0b" }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </motion.div>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div
          className="absolute left-3 top-8 bottom-0 w-1"
          style={{
            background: `linear-gradient(to bottom, ${theme?.accentGold || "#f59e0b"}, ${theme?.borderLight || "#e5e7eb"})`,
          }}
        />

        <div className="space-y-4">
          {timelineCheckpoints.map((checkpoint, index) => (
            <motion.div
              key={`${checkpoint.type}-${index}`}
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onCheckpointClick?.(checkpoint)}
            >
              <motion.div
                className="mt-1 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-lg cursor-pointer"
                style={{
                  background: checkpoint.completed
                    ? theme?.accentGold || "#f59e0b"
                    : theme?.bgCard || "#f3f4f6",
                  borderWidth: "2px",
                  borderColor: getCheckpointColor(checkpoint.completed),
                }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.95 }}
              >
                {checkpoint.completed ? (
                  <Check className="w-3 h-3" style={{ color: "white" }} />
                ) : (
                  <span>{getCheckpointIcon(checkpoint.type)}</span>
                )}
              </motion.div>

              <div
                className="flex-1 min-w-0"
                style={{
                  padding: "12px",
                  borderRadius: "0.75rem",
                  background: checkpoint.completed
                    ? `${theme?.accentGold || "#f59e0b"}15`
                    : theme?.bgCard || "#f9fafb",
                  border: `1px solid ${
                    checkpoint.completed
                      ? (theme?.accentGold || "#f59e0b") + "40"
                      : theme?.borderLight || "#e5e7eb"
                  }`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4
                      className="text-sm font-semibold break-keep hyphens-none"
                      style={{
                        color: checkpoint.completed ? theme?.textPrimary : theme?.textSecondary,
                      }}
                    >
                      {checkpoint.label}
                      {checkpoint.daysSinceCreation > 0 && (
                        <span className="ml-2 text-xs whitespace-nowrap" style={{ color: theme?.textTertiary }}>
                          {ts("decisionTimeline.dayBadge", "Day {day}").replace("{day}", String(checkpoint.daysSinceCreation))}
                        </span>
                      )}
                    </h4>
                    {checkpoint.description && (
                      <p className="text-xs mt-1 leading-snug" style={{ color: theme?.textTertiary }}>
                        {checkpoint.description}
                      </p>
                    )}
                  </div>
                  {checkpoint.completed && (
                    <CheckCircle2
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      style={{ color: theme?.accentGold || "#f59e0b" }}
                    />
                  )}
                </div>

                {checkpoint.followUpPrompt && !checkpoint.completed && (
                  <motion.div
                    className="mt-2 p-2 rounded-md text-xs"
                    style={{
                      background: (theme?.accentGold || "#f59e0b") + "20",
                      borderLeft: `2px solid ${theme?.accentGold || "#f59e0b"}`,
                      color: theme?.textSecondary,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    💡 <span className="font-medium">{checkpoint.followUpPrompt}</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Next milestone */}
      {nextCheckpoint && (
        <motion.div
          className="p-3 rounded-lg border-2"
          style={{
            background: theme?.bgCardElevated || "white",
            borderColor: (theme?.accentGold || "#f59e0b") + "40",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-start gap-3">
            <Clock3 className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: theme?.accentGold || "#f59e0b" }} />
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: theme?.textPrimary }}>
                {ts("decisionTimeline.nextLabel", "Next:")} {nextCheckpoint.label}
              </p>
              <p className="text-xs mt-1" style={{ color: theme?.textSecondary }}>
                {nextCheckpoint.followUpPrompt}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Generate timeline checkpoints — all labels resolved via ts() for full i18n support.
 */
export function generateDecisionCheckpoints(
  createdAt: Date,
  daysElapsed: number,
  ts: (key: string, fallback?: string) => string
): TimelineCheckpoint[] {
  return [
    {
      daysSinceCreation: 0,
      type: "created",
      label: ts("decisionTimeline.checkpoint.decisionStartedLabel", "Decision Started"),
      description: ts("decisionTimeline.checkpoint.decisionStartedDesc", "You began this decision"),
      completed: true,
      dueDate: createdAt.toISOString(),
    },
    {
      daysSinceCreation: 1,
      type: "check-in",
      label: ts("decisionTimeline.checkpoint.day1Label", "Day 1 Check-in"),
      description: ts("decisionTimeline.checkpoint.day1Desc", "First reflection"),
      completed: daysElapsed >= 1,
      followUpPrompt: ts("decisionTimeline.checkpoint.day1Prompt", "How are you feeling about this decision today?"),
    },
    {
      daysSinceCreation: 3,
      type: "check-in",
      label: ts("decisionTimeline.checkpoint.day3Label", "Day 3 Engagement"),
      description: ts("decisionTimeline.checkpoint.day3Desc", "Gather perspective"),
      completed: daysElapsed >= 3,
      followUpPrompt: ts("decisionTimeline.checkpoint.day3Prompt", "What wisdom have you received?"),
    },
    {
      daysSinceCreation: 7,
      type: "reflection",
      label: ts("decisionTimeline.checkpoint.day7Label", "Weekly Reflection"),
      description: ts("decisionTimeline.checkpoint.day7Desc", "Reflect on progress"),
      completed: daysElapsed >= 7,
      followUpPrompt: ts("decisionTimeline.checkpoint.day7Prompt", "What have you learned this week?"),
    },
    {
      daysSinceCreation: 30,
      type: "outcome",
      label: ts("decisionTimeline.checkpoint.day30Label", "Monthly Outcome"),
      description: ts("decisionTimeline.checkpoint.day30Desc", "See where you are now"),
      completed: daysElapsed >= 30,
      followUpPrompt: ts("decisionTimeline.checkpoint.day30Prompt", "How did this decision turn out?"),
    },
  ];
}
