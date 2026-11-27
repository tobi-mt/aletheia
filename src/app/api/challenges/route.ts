import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { many } from "@/lib/db";
import { challengeDefinitions } from "@/lib/challenge-data";

export const dynamic = "force-dynamic";

const challengesDeps = { requireUser, many };

export async function getChallenges(deps = challengesDeps) {
  try {
    const user = await deps.requireUser();
    if (!user) throw new Error("sign_in_required");

    const rows = await deps.many<{
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
    const enrollmentRows = await deps.many<{ challenge_id: string; started_at: string | Date }>(
      `SELECT challenge_id, started_at FROM challenge_enrollments WHERE user_id = ?`,
      user.id
    ).catch(() => []); // Progress must still load if the enrollment table is not migrated yet.
    const startedAtByChallengeId = new Map(
      enrollmentRows.map((row) => [
        row.challenge_id,
        row.started_at instanceof Date ? row.started_at.toISOString() : row.started_at,
      ])
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
      title: "",
      description: "",
      totalDays: def.totalDays,
      mode: def.mode,
      completedDays: progressByChallengeId.get(def.id) ?? [],
      startedAt: startedAtByChallengeId.get(def.id) ?? progressByChallengeId.get(def.id)?.[0]?.completedAt ?? null,
    }));

    return NextResponse.json({ challenges });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to track challenge progress.");
  }
}

export async function GET() {
  return getChallenges();
}
