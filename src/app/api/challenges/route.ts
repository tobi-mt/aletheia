import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { many } from "@/lib/db";
import { challengeDefinitions } from "@/lib/challenge-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();

    const rows = await many<{
      challenge_id: string;
      day: number;
      reflection: string;
      completed_at: string;
    }>(
      `SELECT challenge_id, day, reflection, completed_at
       FROM challenge_progress
       WHERE user_id = ?
       ORDER BY challenge_id, day`,
      user.id
    );

    const progressByChallengeId = new Map<
      string,
      Array<{ day: number; reflection: string; completedAt: string }>
    >();
    for (const row of rows) {
      const list = progressByChallengeId.get(row.challenge_id) ?? [];
      list.push({
        day: row.day,
        reflection: row.reflection,
        completedAt: row.completed_at,
      });
      progressByChallengeId.set(row.challenge_id, list);
    }

    const challenges = challengeDefinitions.map((def) => ({
      id: def.id,
      titleKey: def.titleKey,
      descriptionKey: def.descriptionKey,
      totalDays: def.totalDays,
      mode: def.mode,
      completedDays: progressByChallengeId.get(def.id) ?? [],
    }));

    return NextResponse.json({ challenges });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to track challenge progress.");
  }
}
