export type StreakAchievement = {
  milestone: number;
  unlockedAt: string;
  notifiedAt?: string;
};

export type StreakData = {
  consecutiveDays: number;
  lastUseDate: string | null;
  achievements: Record<number, StreakAchievement>;
};

export const STREAK_MILESTONES = [7, 30, 100, 365] as const;

export function formatStreak(days: number): string {
  if (days === 0) return "Start your streak today! 🔥";
  if (days === 1) return "🔥 1-day reflection streak";
  return `🔥 ${days}-day reflection streak`;
}

export function getStreakLevel(days: number): string {
  if (days === 0) return "❄️";
  if (days < 7) return "🌱";
  if (days < 30) return "🔥";
  if (days < 100) return "⚡";
  return "👑";
}
