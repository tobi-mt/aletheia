import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { one, run } from "@/lib/db";
import { hashChallengeInviteToken } from "@/lib/challenge-circles";
import { readJsonBody } from "@/lib/request";
import { trackServerEvent } from "@/lib/analytics";
import { sendChallengeCircleNudgeNotifications } from "@/lib/notifications";
import { isObjectionableUserContent } from "@/lib/user-content-safety";

type Params = { params: Promise<{ token: string }> };

type CircleRow = {
  id: string;
  challenge_id: string;
  owner_user_id: string;
  invite_status: string;
};

type MemberNameRow = {
  name: string | null;
};

async function findCircle(token: string) {
  return one<CircleRow>(
    `SELECT id, challenge_id, owner_user_id, invite_status
     FROM challenge_circles
     WHERE invite_token_hash = ?`,
    hashChallengeInviteToken(token)
  );
}

async function isMember(circleId: string, userId: string) {
  return one<{ id: string }>(
    "SELECT id FROM challenge_circle_members WHERE circle_id = ? AND user_id = ?",
    circleId,
    userId
  );
}

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to nudge your practice circle.");
  }

  const circle = await findCircle(token);
  if (!circle) {
    return apiError(404, "not_found", "Invite not found.");
  }

  const membership = await isMember(circle.id, user.id);
  if (!membership) {
    return apiError(403, "permission_denied", "Join the shared practice before sending nudges.");
  }

  const parsed = await readJsonBody<{ body?: string; recipientUserId?: string | null }>(request, { maxBytes: 2_000, emptyBody: {} });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.data.body?.trim().slice(0, 240) ?? "";
  if (!body) {
    return apiError(400, "invalid_input", "A nudge message is required.");
  }
  if (isObjectionableUserContent(body)) {
    return apiError(400, "unsafe_content", "This nudge cannot be shared.");
  }
  const recipientUserId = parsed.data.recipientUserId?.trim() ?? null;
  if (recipientUserId === user.id) {
    return apiError(400, "invalid_input", "Choose another person for a direct nudge.");
  }
  if (recipientUserId) {
    const recipientMembership = await one<{ id: string }>(
      "SELECT id FROM challenge_circle_members WHERE circle_id = ? AND user_id = ?",
      circle.id,
      recipientUserId
    );
    if (!recipientMembership) {
      return apiError(400, "invalid_input", "Choose a person who is in this shared practice.");
    }
  }

  const now = new Date().toISOString();
  const nudgeId = crypto.randomUUID();
  await run(
    `INSERT INTO challenge_circle_nudges (id, circle_id, sender_user_id, recipient_user_id, body, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    nudgeId,
    circle.id,
    user.id,
    recipientUserId,
    body,
    now
  );

  await trackServerEvent({
    userId: user.id,
    eventName: "challenge_circle_nudged",
    metadata: {
      challengeId: circle.challenge_id,
      inviteStatus: circle.invite_status,
      recipientUserId,
    },
  }).catch(() => undefined);

  const delivery = await sendChallengeCircleNudgeNotifications({
    circleId: circle.id,
    challengeId: circle.challenge_id,
    nudgeId,
    senderUserId: user.id,
    senderName: user.name,
    body,
    recipientUserId,
  }).catch(() => ({ configured: false, attempted: 0, sent: 0, failed: 0, failureSamples: [] }));

  const recipientName = recipientUserId
    ? (await one<MemberNameRow>(
        `SELECT u.name
         FROM challenge_circle_members m
         JOIN users u ON u.id = m.user_id
         WHERE m.circle_id = ? AND m.user_id = ?`,
        circle.id,
        recipientUserId
      ))?.name ?? null
    : null;

  return NextResponse.json({
    ok: true,
    nudge: {
      id: nudgeId,
      body,
      createdAt: now,
      senderUserId: user.id,
      recipientUserId,
      recipientName,
    },
    delivery,
  });
}
