import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { one, run } from "@/lib/db";
import { normalizeFastingInviteDetails, type FastingInviteDetails } from "@/lib/fasting-invite";
import { trackServerEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ circleId: string }> };

type CircleRow = {
  id: string;
  challenge_id: string;
  invite_details_json: unknown;
};

type MemberRow = {
  user_id: string;
};

const FASTING_CHALLENGE_ID = "fasting-custom";

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError(401, "sign_in_required", "Sign in to track fasting progress.");
    }

    const { circleId } = await params;
    const circle = await one<CircleRow>(
      `SELECT id, challenge_id, invite_details_json
       FROM challenge_circles
       WHERE id = ?`,
      circleId
    );
    if (!circle) {
      return apiError(404, "not_found", "Circle not found.");
    }
    if (circle.challenge_id !== FASTING_CHALLENGE_ID) {
      return apiError(400, "invalid_input", "This circle is not a fasting practice.");
    }

    const membership = await one<MemberRow>(
      `SELECT user_id
       FROM challenge_circle_members
       WHERE circle_id = ? AND user_id = ?`,
      circleId,
      user.id
    );
    if (!membership) {
      return apiError(403, "permission_denied", "Join the circle before completing a day.");
    }

    const inviteDetails = normalizeFastingInviteDetails(circle.invite_details_json as Partial<FastingInviteDetails>);
    if (inviteDetails.durationValue === null) {
      return apiError(400, "invalid_input", "This fasting circle is missing a duration.");
    }

    const body = (await request.json().catch(() => ({}))) as {
      day?: number;
      reflection?: string;
    };
    const day = typeof body.day === "number" ? Math.floor(body.day) : null;
    const reflection = body.reflection?.trim() ?? "";
    if (day === null || day < 1) {
      return apiError(400, "invalid_input", "day must be a positive integer.");
    }
    if (day > inviteDetails.durationValue) {
      return apiError(400, "invalid_input", `Day ${day} exceeds the fasting plan length of ${inviteDetails.durationValue}.`);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const progressKey = `fasting:${circleId}`;

    await run(
      `INSERT INTO challenge_progress (id, user_id, challenge_id, day, reflection, completed_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, challenge_id, day) DO UPDATE SET
         reflection = EXCLUDED.reflection,
         completed_at = EXCLUDED.completed_at`,
      id,
      user.id,
      progressKey,
      day,
      reflection,
      now
    );

    await trackServerEvent({
      eventName: "challenge_day_completed",
      userId: user.id,
      metadata: {
        challengeId: progressKey,
        circleId,
        day,
        challengeTotalDays: inviteDetails.durationValue,
        challengeKind: "fasting",
      },
    }).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      circleId,
      challengeId: progressKey,
      day,
      completedAt: now,
    });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to track fasting progress.");
  }
}
