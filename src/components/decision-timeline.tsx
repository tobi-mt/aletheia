"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Check, CheckCircle2, Clock3, Feather, Sparkles } from "lucide-react";
import type { ThemeColors } from "@/lib/themes";

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
  theme?: ThemeColors;
  ts: (key: string, fallback?: string) => string;
}

export function DecisionTimeline({
  createdAt,
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

  const getCheckpointMeta = (checkpoint: TimelineCheckpoint) => {
    switch (checkpoint.type) {
      case "created":
        return { icon: Sparkles, accent: theme?.accentGold || "#f59e0b", gradient: `linear-gradient(135deg, ${theme?.accentGold || "#f59e0b"} 0%, ${theme?.bgCardElevated || "#fff"} 78%)` };
      case "check-in":
        return { icon: Clock3, accent: theme?.primary || "#203a35", gradient: `linear-gradient(135deg, ${theme?.primary || "#203a35"} 0%, ${theme?.bgCardElevated || "#fff"} 78%)` };
      case "reflection":
        return { icon: Feather, accent: theme?.accentGold || "#f59e0b", gradient: `linear-gradient(135deg, ${theme?.bgCardElevated || "#fff"} 0%, ${theme?.accentGold || "#f59e0b"} 85%)` };
      case "outcome":
        return { icon: CheckCircle2, accent: theme?.primary || "#203a35", gradient: `linear-gradient(135deg, ${theme?.primary || "#203a35"} 0%, ${theme?.accentGold || "#f59e0b"} 82%)` };
      default:
        return { icon: Clock3, accent: theme?.textMuted || "#9ca3af", gradient: `linear-gradient(135deg, ${theme?.bgCardElevated || "#fff"} 0%, ${theme?.bgCard || "#fff"} 80%)` };
    }
  };

  return (
    <div className="space-y-5">
      <section
        className="relative overflow-hidden rounded-[1.55rem] border p-3.5 shadow-[0_18px_50px_rgba(10,18,14,0.12)]"
        style={{
          borderColor: theme?.borderLight,
          background: `linear-gradient(135deg, ${theme?.bgCardElevated || "#fff"} 0%, ${theme?.bgCard || "#fff"} 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-80" style={{ background: `radial-gradient(circle at 18% 18%, ${theme?.accentGold || "#f59e0b"}22, transparent 34%), radial-gradient(circle at 92% 0%, ${theme?.primary || "#203a35"}18, transparent 30%)` }} />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme?.accentGold }}>
              {ts("decisionTimeline.title")}
            </p>
            <h3 className="mt-1 text-[1.08rem] font-semibold tracking-tight sm:text-xl" style={{ color: theme?.textPrimary }}>
              {ts("decisionTimeline.daysProgress").replace("{days}", String(daysElapsed))}
            </h3>
            <p className="mt-1 max-w-2xl text-[0.9rem] leading-6" style={{ color: theme?.textSecondary }}>
              {nextCheckpoint ? `${ts("decisionTimeline.nextLabel")} ${nextCheckpoint.label}` : ts("decisionTimeline.completed")}
            </p>
          </div>
          <div className="grid size-10 shrink-0 place-items-center rounded-full border shadow-sm" style={{ borderColor: theme?.borderLight, backgroundColor: theme?.bgInput, color: theme?.textPrimary }}>
            <Clock3 size={16} />
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ backgroundColor: theme?.bgCard }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${theme?.accentGold || "#f59e0b"}, ${theme?.primary || "#203a35"})` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </section>

      <div className="relative pl-1 sm:pl-2">
        <div
          className="absolute left-5 top-1 bottom-1 w-px"
          style={{ background: `linear-gradient(to bottom, transparent, ${theme?.accentGold || "#f59e0b"}, ${theme?.borderLight || "#e5e7eb"}, transparent)` }}
        />

        <div className="space-y-3.5">
          {timelineCheckpoints.map((checkpoint, index) => {
            const meta = getCheckpointMeta(checkpoint);
            const Icon = checkpoint.completed ? Check : meta.icon;
            return (
              <motion.div
                key={`${checkpoint.type}-${index}`}
                className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[3rem_minmax(0,1fr)]"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                onClick={() => onCheckpointClick?.(checkpoint)}
              >
                <div className="relative flex justify-center pt-1">
                  <motion.div
                    className="grid size-10 place-items-center rounded-full border shadow-sm"
                    style={{
                      borderColor: checkpoint.completed ? theme?.accentLight : theme?.borderLight,
                      backgroundColor: checkpoint.completed ? theme?.activeBg : theme?.bgCardElevated,
                      color: checkpoint.completed ? theme?.accentGold : meta.accent,
                    }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <Icon size={16} />
                  </motion.div>
                </div>

                <article
                  className="overflow-hidden rounded-[1.45rem] border shadow-[0_10px_28px_rgba(10,18,14,0.08)]"
                  style={{
                    borderColor: checkpoint.completed ? theme?.accentLight : theme?.borderLight,
                    background: checkpoint.completed
                      ? `linear-gradient(180deg, color-mix(in srgb, ${theme?.bgCardElevated || "#fff"} 74%, ${theme?.accentGold || "#f59e0b"} 26%), ${theme?.bgCard || "#fff"})`
                      : `linear-gradient(180deg, color-mix(in srgb, ${theme?.bgCardElevated || "#fff"} 88%, white 12%), ${theme?.bgCard || "#fff"})`,
                  }}
                >
                  <div className="h-1.5" style={{ background: meta.gradient }} />
                  <div className="p-3.5 sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-[0.95rem] font-semibold tracking-tight" style={{ color: theme?.textPrimary }}>
                            {checkpoint.label}
                          </h4>
                          {checkpoint.daysSinceCreation > 0 ? (
                            <span className="rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ borderColor: theme?.borderLight, backgroundColor: theme?.bgInput, color: theme?.textSecondary }}>
                              {ts("decisionTimeline.dayBadge").replace("{day}", String(checkpoint.daysSinceCreation))}
                            </span>
                          ) : null}
                        </div>
                        {checkpoint.description ? (
                          <p className="mt-1.5 text-[0.88rem] leading-6" style={{ color: theme?.textSecondary }}>
                            {checkpoint.description}
                          </p>
                        ) : null}
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: checkpoint.completed ? theme?.accentLight : theme?.borderLight, backgroundColor: checkpoint.completed ? theme?.activeBg : theme?.bgInput, color: checkpoint.completed ? theme?.accentGold : theme?.textSecondary }}>
                        {checkpoint.completed ? <Check size={11} /> : <Clock3 size={11} />}
                        {checkpoint.completed ? ts("streak.unlocked") : ts("streak.notYet")}
                      </span>
                    </div>

                    {checkpoint.followUpPrompt && !checkpoint.completed ? (
                      <motion.div
                        className="mt-3 rounded-2xl border px-3 py-2.5 text-xs leading-5"
                        style={{
                          borderColor: theme?.borderLight,
                          backgroundColor: theme?.bgInput,
                          color: theme?.textSecondary,
                        }}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18 }}
                      >
                        <span className="font-semibold" style={{ color: theme?.accentGold }}>•</span>{" "}
                        <span className="font-medium">{checkpoint.followUpPrompt}</span>
                      </motion.div>
                    ) : null}
                  </div>
                </article>
              </motion.div>
            );
          })}
        </div>
      </div>

      {nextCheckpoint && (
        <motion.div
          className="overflow-hidden rounded-[1.45rem] border shadow-[0_10px_28px_rgba(10,18,14,0.08)]"
          style={{
            background: `linear-gradient(180deg, color-mix(in srgb, ${theme?.bgCardElevated || "#fff"} 82%, ${theme?.accentGold || "#f59e0b"} 18%), ${theme?.bgCard || "#fff"})`,
            borderColor: (theme?.accentGold || "#f59e0b") + "40",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-start gap-3 p-3.5 sm:p-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-full border" style={{ borderColor: theme?.borderLight, backgroundColor: theme?.bgInput, color: theme?.accentGold }}>
              <Clock3 className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0">
              <p className="text-[0.92rem] font-semibold tracking-tight" style={{ color: theme?.textPrimary }}>
                {ts("decisionTimeline.nextLabel")} {nextCheckpoint.label}
              </p>
              <p className="mt-1 text-[0.78rem] leading-5" style={{ color: theme?.textSecondary }}>
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
      label: ts("decisionTimeline.checkpoint.decisionStartedLabel"),
      description: ts("decisionTimeline.checkpoint.decisionStartedDesc"),
      completed: true,
      dueDate: createdAt.toISOString(),
    },
    {
      daysSinceCreation: 1,
      type: "check-in",
      label: ts("decisionTimeline.checkpoint.day1Label"),
      description: ts("decisionTimeline.checkpoint.day1Desc"),
      completed: daysElapsed >= 1,
      followUpPrompt: ts("decisionTimeline.checkpoint.day1Prompt"),
    },
    {
      daysSinceCreation: 3,
      type: "check-in",
      label: ts("decisionTimeline.checkpoint.day3Label"),
      description: ts("decisionTimeline.checkpoint.day3Desc"),
      completed: daysElapsed >= 3,
      followUpPrompt: ts("decisionTimeline.checkpoint.day3Prompt"),
    },
    {
      daysSinceCreation: 7,
      type: "reflection",
      label: ts("decisionTimeline.checkpoint.day7Label"),
      description: ts("decisionTimeline.checkpoint.day7Desc"),
      completed: daysElapsed >= 7,
      followUpPrompt: ts("decisionTimeline.checkpoint.day7Prompt"),
    },
    {
      daysSinceCreation: 30,
      type: "outcome",
      label: ts("decisionTimeline.checkpoint.day30Label"),
      description: ts("decisionTimeline.checkpoint.day30Desc"),
      completed: daysElapsed >= 30,
      followUpPrompt: ts("decisionTimeline.checkpoint.day30Prompt"),
    },
  ];
}
