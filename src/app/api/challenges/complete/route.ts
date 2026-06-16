import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { run } from "@/lib/db";
import { trackServerEvent } from "@/lib/analytics";
import { getChallengeById } from "@/lib/challenge-data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const body = (await request.json()) as {
      challengeId?: string;
      day?: number;
      reflection?: string;
    };

    const challengeId = body.challengeId?.trim();
    const day = typeof body.day === "number" ? Math.floor(body.day) : null;
    const reflection = body.reflection?.trim() ?? "";

    if (!challengeId) {
      return apiError(400, "invalid_input", "challengeId is required.");
    }
    if (day === null || day < 1) {
      return apiError(400, "invalid_input", "day must be a positive integer.");
    }

    const challenge = getChallengeById(challengeId);
    if (!challenge) {
      return apiError(404, "not_found", "Challenge not found.");
    }
    if (day > challenge.totalDays) {
      return apiError(400, "invalid_input", `Day ${day} exceeds challenge length of ${challenge.totalDays}.`);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await run(
      `INSERT INTO challenge_progress (id, user_id, challenge_id, day, reflection, completed_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, challenge_id, day) DO UPDATE SET
         reflection = EXCLUDED.reflection,
         completed_at = EXCLUDED.completed_at`,
      id,
      user.id,
      challengeId,
      day,
      reflection,
      now
    );

    await trackServerEvent({
      eventName: "challenge_day_completed",
      userId: user.id,
      metadata: { challengeId, day, challengeTotalDays: challenge.totalDays },
    }).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      day,
      challengeId,
      completedAt: now,
    });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to track challenge progress.");
  }
}
