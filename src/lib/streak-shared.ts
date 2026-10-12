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

export type StreakCopy = {
  startToday: string;
  oneDay: string;
  multipleDays: string;
};

export function formatStreak(
  days: number,
  copy: StreakCopy,
  formatNumber: (value: number) => string = String
): string {
  if (days === 0) return copy.startToday;
  const template = days === 1 ? copy.oneDay : copy.multipleDays;
  return template.replace("{days}", formatNumber(days));
}

export function getStreakLevel(days: number): string {
  if (days === 0) return "❄️";
  if (days < 7) return "🌱";
  if (days < 30) return "🔥";
  if (days < 100) return "⚡";
  return "👑";
}
