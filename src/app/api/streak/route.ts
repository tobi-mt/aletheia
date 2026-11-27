import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { one, run } from "@/lib/db";

type StreakRow = {
  consecutive_use_days: number | null;
  last_use_date: string | null;
  streak_achievements: Record<string, { milestone: number; unlockedAt: string }> | null;
};

// DATE is read as text: node-pg turns DATE into local midnight, which shifts the day
// in timezones ahead of UTC and made every app open count as a new streak day.
const STREAK_SELECT = `SELECT consecutive_use_days, last_use_date::text AS last_use_date, streak_achievements FROM users WHERE id = ?`;

const streakDeps = { getCurrentUser, one, run };

export async function GET() {
  return getStreak();
}

export async function POST() {
  return postStreak();
}

export async function getStreak(deps = streakDeps) {
  const user = await deps.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const row = await deps.one<StreakRow>(STREAK_SELECT, user.id);

    return NextResponse.json({
      consecutiveDays: row?.consecutive_use_days || 0,
      lastUseDate: row?.last_use_date || null,
      achievements: row?.streak_achievements || {},
    });
  } catch (error) {
    console.error("Error fetching streak:", error);
    return NextResponse.json({ error: "Failed to fetch streak" }, { status: 500 });
  }
}

export async function postStreak(deps = streakDeps, now = new Date()) {
  const user = await deps.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get current user data
    const row = await deps.one<StreakRow>(STREAK_SELECT, user.id);

    if (!row) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const today = now.toISOString().slice(0, 10);
    const lastUseDate = row.last_use_date ? String(row.last_use_date).slice(0, 10) : null;
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);

    let newStreak = row.consecutive_use_days || 0;
    const newAchievements: Record<string, { milestone: number; unlockedAt: string }> = {
      ...(row.streak_achievements ?? {}),
    };
    const unlockedMilestones: number[] = [];

    // If user hasn't used app today, increment streak if they used it yesterday
    if (lastUseDate !== today) {
      if (lastUseDate === yesterday) {
        newStreak = (newStreak || 0) + 1;
      } else {
        // Break the streak if they skipped a day
        newStreak = 1;
      }

      // Check for milestone unlocks
      const MILESTONES = [7, 30, 100, 365];
      for (const milestone of MILESTONES) {
        if (newStreak >= milestone && !newAchievements[milestone]) {
          newAchievements[milestone] = {
            milestone,
            unlockedAt: now.toISOString(),
          };
          unlockedMilestones.push(milestone);
        }
      }

      // Update user
      await deps.run(
        `UPDATE users SET consecutive_use_days = ?, last_use_date = ?, streak_achievements = ?, updated_at = NOW() WHERE id = ?`,
        newStreak,
        today,
        JSON.stringify(newAchievements),
        user.id
      );
    }

    return NextResponse.json({
      consecutiveDays: newStreak,
      lastUseDate: today,
      achievements: newAchievements,
      unlockedMilestones,
    });
  } catch (error) {
    console.error("Error updating streak:", error);
    return NextResponse.json({ error: "Failed to update streak" }, { status: 500 });
  }
}
