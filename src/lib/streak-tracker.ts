import { one, run } from "@/lib/db";

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

/**
 * Calculate and update user streak based on today's usage
 */
export async function updateUserStreak(userId: string): Promise<number> {
  try {
    // Get current user data
    const user = await one<{
      consecutive_use_days: number | null;
      last_use_date: string | null;
      streak_achievements: any;
    }>(
      `SELECT consecutive_use_days, last_use_date, streak_achievements 
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return 0;
    }

    const today = new Date().toISOString().split("T")[0];
    const lastUseDate = user.last_use_date 
      ? typeof user.last_use_date === "string" 
        ? user.last_use_date.split("T")[0]
        : new Date(user.last_use_date).toISOString().split("T")[0]
      : null;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let newStreak = user.consecutive_use_days || 0;

    // If user hasn't used app today, increment streak if they used it yesterday
    if (lastUseDate !== today) {
      if (lastUseDate === yesterday) {
        newStreak = (newStreak || 0) + 1;
      } else {
        // Break the streak if they skipped a day
        newStreak = 1;
      }

      // Update user
      await run(
        `UPDATE users 
         SET consecutive_use_days = ?, last_use_date = ?, updated_at = NOW()
         WHERE id = ?`,
        [newStreak, today, userId]
      );
    }

    return newStreak;
  } catch (error) {
    console.error("Error updating streak:", error);
    return 0;
  }
}

/**
 * Get user's current streak data
 */
export async function getUserStreak(userId: string): Promise<StreakData> {
  try {
    const user = await one<{
      consecutive_use_days: number | null;
      last_use_date: string | null;
      streak_achievements: any;
    }>(
      `SELECT consecutive_use_days, last_use_date, streak_achievements 
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return {
        consecutiveDays: 0,
        lastUseDate: null,
        achievements: {},
      };
    }

    return {
      consecutiveDays: user.consecutive_use_days || 0,
      lastUseDate: user.last_use_date || null,
      achievements: user.streak_achievements || {},
    };
  } catch (error) {
    console.error("Error fetching streak:", error);
    return {
      consecutiveDays: 0,
      lastUseDate: null,
      achievements: {},
    };
  }
}

/**
 * Check and unlock streak achievements
 */
export async function checkStreakAchievements(
  userId: string,
  currentStreak: number
): Promise<number[]> {
  const MILESTONES = [7, 30, 100, 365];
  const unlockedMilestones: number[] = [];

  try {
    const user = await one<{
      streak_achievements: any;
    }>(
      `SELECT streak_achievements FROM users WHERE id = ?`,
      [userId]
    );

    const achievements = user?.streak_achievements || {};

    for (const milestone of MILESTONES) {
      if (currentStreak >= milestone && !achievements[milestone]) {
        achievements[milestone] = {
          milestone,
          unlockedAt: new Date().toISOString(),
        };
        unlockedMilestones.push(milestone);
      }
    }

    if (unlockedMilestones.length > 0) {
      await run(
        `UPDATE users SET streak_achievements = ?, updated_at = NOW()
         WHERE id = ?`,
        [JSON.stringify(achievements), userId]
      );
    }

    return unlockedMilestones;
  } catch (error) {
    console.error("Error checking achievements:", error);
    return [];
  }
}

/**
 * Format streak display
 */
export function formatStreak(days: number): string {
  if (days === 0) return "Start your streak today! 🔥";
  if (days === 1) return "🔥 1-day reflection streak";
  return `🔥 ${days}-day reflection streak`;
}

/**
 * Get streak emoji level based on days
 */
export function getStreakLevel(days: number): string {
  if (days === 0) return "❄️";
  if (days < 7) return "🌱";
  if (days < 30) return "🔥";
  if (days < 100) return "⚡";
  return "👑";
}
