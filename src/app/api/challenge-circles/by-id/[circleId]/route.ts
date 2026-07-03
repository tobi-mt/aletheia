import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { many, one, run } from "@/lib/db";
import { normalizeReadWithMeInviteDetails, type ReadWithMeInviteDetails } from "@/lib/read-with-me-invite";
import { buildFastingDayPlan, normalizeFastingInviteDetails, type FastingInviteDetails } from "@/lib/fasting-invite";
import { readJsonBody } from "@/lib/request";
import { getChallengeById } from "@/lib/challenge-data";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ circleId: string }> };

type CircleRow = {
  id: string;
  challenge_id: string;
  owner_user_id: string;
  invite_status: string;
  note: string | null;
  invite_details_json: unknown;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  owner_name: string | null;
  owner_avatar_url: string | null;
};

type ViewerResponseRow = {
  response_status: string;
  responded_at: string | null;
};

type InviteResponseRow = {
  user_id: string;
  response_status: string;
  responded_at: string | null;
  name: string | null;
  avatar_url: string | null;
};

type MemberRow = {
  user_id: string;
  role: string;
  joined_at: string;
  name: string | null;
  avatar_url: string | null;
  completed_days: number | string | null;
  last_completed_at: string | null;
};

type NudgeRow = {
  id: string;
  body: string;
  created_at: string;
  sender_user_id: string;
  sender_name: string | null;
  sender_avatar_url: string | null;
  recipient_user_id: string | null;
  recipient_name: string | null;
  delivery_status: string | null;
  delivery_reason: string | null;
  delivered_count: number | string | null;
  failed_count: number | string | null;
  opened_count: number | string | null;
  attempted_at: string | null;
  delivered_at: string | null;
};

const FASTING_CHALLENGE_ID = "fasting-custom";

function formatInviteDetails(challengeId: string, rawDetails: unknown): ReadWithMeInviteDetails | FastingInviteDetails | null {
  if (!rawDetails || typeof rawDetails !== "object" || Array.isArray(rawDetails)) {
    return null;
  }

  if (challengeId === FASTING_CHALLENGE_ID) {
    return normalizeFastingInviteDetails(rawDetails as Partial<FastingInviteDetails>);
  }

  if (challengeId !== "read-with-me-7day") {
    return null;
  }

  return normalizeReadWithMeInviteDetails(rawDetails as Partial<ReadWithMeInviteDetails>);
}

async function findCircle(circleId: string) {
  return one<CircleRow>(
    `SELECT c.id, c.challenge_id, c.owner_user_id, c.invite_status, c.note, c.invite_details_json, c.accepted_at, c.created_at, c.updated_at,
            u.name AS owner_name, u.avatar_url AS owner_avatar_url
     FROM challenge_circles c
     LEFT JOIN users u ON u.id = c.owner_user_id
     WHERE c.id = ?`,
    circleId
  );
}

function challengeProgressKey(challengeId: string, circleId: string) {
  return challengeId === FASTING_CHALLENGE_ID ? `fasting:${circleId}` : challengeId;
}

async function circleMembers(circleId: string, challengeId: string) {
  const progressKey = challengeProgressKey(challengeId, circleId);
  return many<MemberRow>(
    `SELECT m.user_id, m.role, m.joined_at, u.name, u.avatar_url,
            COALESCE(progress.days_completed, 0) AS completed_days,
            progress.last_completed_at
     FROM challenge_circle_members m
     JOIN users u ON u.id = m.user_id
     LEFT JOIN (
       SELECT user_id, COUNT(*)::int AS days_completed, MAX(completed_at) AS last_completed_at
       FROM challenge_progress
       WHERE challenge_id = ?
       GROUP BY user_id
     ) AS progress ON progress.user_id = m.user_id
     WHERE m.circle_id = ?
     ORDER BY CASE WHEN m.role = 'host' THEN 0 ELSE 1 END, m.joined_at ASC`,
    progressKey,
    circleId
  );
}

async function viewerResponse(circleId: string, userId: string) {
  return one<ViewerResponseRow>(
    `SELECT response_status, responded_at
     FROM challenge_circle_invite_responses
     WHERE circle_id = ? AND user_id = ?`,
    circleId,
    userId
  );
}

async function inviteResponses(circleId: string) {
  return many<InviteResponseRow>(
    `SELECT r.user_id, r.response_status, r.responded_at, u.name, u.avatar_url
     FROM challenge_circle_invite_responses r
     JOIN users u ON u.id = r.user_id
     WHERE r.circle_id = ?
     ORDER BY r.responded_at DESC, r.updated_at DESC`,
    circleId
  );
}

async function circleNudges(circleId: string) {
  return many<NudgeRow>(
    `SELECT n.id, n.body, n.created_at, n.sender_user_id, n.recipient_user_id,
            sender_u.name AS sender_name, sender_u.avatar_url AS sender_avatar_url,
            recipient_u.name AS recipient_name,
            delivery.status AS delivery_status,
            delivery.status_reason AS delivery_reason,
            delivery.delivered_count,
            delivery.failed_count,
            COALESCE(receipts.opened_count, 0) AS opened_count,
            delivery.attempted_at,
            delivery.delivered_at
     FROM challenge_circle_nudges n
     JOIN users sender_u ON sender_u.id = n.sender_user_id
     LEFT JOIN users recipient_u ON recipient_u.id = n.recipient_user_id
     LEFT JOIN challenge_circle_nudge_deliveries delivery ON delivery.nudge_id = n.id
     LEFT JOIN (
       SELECT notification_id, COUNT(*)::int AS opened_count
       FROM notification_delivery_receipts
       WHERE notification_kind = 'challenge_circle_nudge'
       GROUP BY notification_id
     ) receipts ON receipts.notification_id = n.id
     WHERE n.circle_id = ?
     ORDER BY n.created_at DESC
     LIMIT 12`,
    circleId
  );
}

async function formatCircle(circle: CircleRow, viewerUserId?: string) {
  const isFastingChallenge = circle.challenge_id === FASTING_CHALLENGE_ID;
  const challenge = isFastingChallenge ? null : getChallengeById(circle.challenge_id);
  if (!challenge && !isFastingChallenge) {
    return null;
  }

  const inviteDetails = formatInviteDetails(circle.challenge_id, circle.invite_details_json);
  const fastingInviteDetails = inviteDetails?.kind === "fasting" ? inviteDetails : null;
  const totalDays = isFastingChallenge && inviteDetails?.durationValue ? inviteDetails.durationValue : challenge!.totalDays;
  const days = fastingInviteDetails ? buildFastingDayPlan(fastingInviteDetails.durationValue, fastingInviteDetails.goal) : null;

  const [members, nudges, responses, viewer] = await Promise.all([
    circleMembers(circle.id, circle.challenge_id),
    circleNudges(circle.id),
    inviteResponses(circle.id),
    viewerUserId ? viewerResponse(circle.id, viewerUserId) : Promise.resolve(null),
  ]);

  return {
    id: circle.id,
    challengeId: circle.challenge_id,
    challenge: {
      id: isFastingChallenge ? circle.challenge_id : challenge!.id,
      titleKey: isFastingChallenge ? "challenges.fastingCustom.title" : challenge!.titleKey,
      descriptionKey: isFastingChallenge ? "challenges.fastingCustom.description" : challenge!.descriptionKey,
      title: isFastingChallenge ? "Fasting Practice" : challenge!.title,
      description: isFastingChallenge
        ? "Choose a duration, name a goal, and follow a tailored day-by-day fast."
        : challenge!.description,
      totalDays,
      mode: isFastingChallenge ? "Life" : challenge!.mode,
      days: days ?? undefined,
    },
    invite: {
      status: circle.invite_status,
      note: circle.note,
      acceptedAt: circle.accepted_at,
      createdAt: circle.created_at,
      details: inviteDetails,
      owner: {
        id: circle.owner_user_id,
        name: circle.owner_name,
        avatarUrl: circle.owner_avatar_url,
      },
    },
    viewerResponse: viewer?.response_status ?? null,
    memberCount: members.length,
    members: members.map((member) => ({
      userId: member.user_id,
      name: member.name,
      avatarUrl: member.avatar_url,
      role: member.role,
      joinedAt: member.joined_at,
      completedDays: typeof member.completed_days === "number" ? member.completed_days : Number(member.completed_days ?? 0),
      lastCompletedAt: member.last_completed_at,
    })),
    responses: responses.map((response) => ({
      userId: response.user_id,
      name: response.name,
      avatarUrl: response.avatar_url,
      responseStatus: response.response_status,
      respondedAt: response.responded_at,
    })),
    nudges: nudges.map((nudge) => ({
      id: nudge.id,
      body: nudge.body,
      createdAt: nudge.created_at,
      senderUserId: nudge.sender_user_id,
      senderName: nudge.sender_name,
      senderAvatarUrl: nudge.sender_avatar_url,
      recipientUserId: nudge.recipient_user_id,
      recipientName: nudge.recipient_name,
      deliveryStatus:
        Number(nudge.opened_count ?? 0) > 0
          ? "opened"
          : nudge.delivery_status ?? "sent_to_push_service",
      deliveryReason: nudge.delivery_reason,
      deliveredCount: Number(nudge.delivered_count ?? 0),
      failedCount: Number(nudge.failed_count ?? 0),
      openedCount: Number(nudge.opened_count ?? 0),
      attemptedAt: nudge.attempted_at,
      deliveredAt: nudge.delivered_at,
    })),
  };
}

export async function PATCH(request: Request, { params }: Params) {
  const { circleId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to update the shared practice.");
  }

  const circle = await findCircle(circleId);
  if (!circle) {
    return apiError(404, "not_found", "Practice not found.");
  }

  if (circle.owner_user_id !== user.id) {
    return apiError(403, "permission_denied", "Only the host can update this shared practice.");
  }

  const parsed = await readJsonBody<{ note?: string; inviteDetails?: Partial<ReadWithMeInviteDetails> | Partial<FastingInviteDetails> }>(request, { maxBytes: 6_000, emptyBody: {} });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.data;
  const challengeId = circle.challenge_id;
  const isFastingChallenge = challengeId === FASTING_CHALLENGE_ID;
  const rawInviteDetails = body.inviteDetails ?? {};
  const inviteDetails = isFastingChallenge
    ? normalizeFastingInviteDetails(rawInviteDetails as Partial<FastingInviteDetails>)
    : challengeId === "read-with-me-7day"
      ? normalizeReadWithMeInviteDetails(rawInviteDetails as Partial<ReadWithMeInviteDetails>)
      : null;

  if (!isFastingChallenge && challengeId !== "read-with-me-7day") {
    return apiError(400, "invalid_input", "This practice cannot be edited here.");
  }

  if (challengeId === FASTING_CHALLENGE_ID && inviteDetails?.durationValue === null) {
    return apiError(400, "invalid_input", "Add a duration before saving the invite.");
  }

  if (challengeId === "read-with-me-7day" && (!inviteDetails?.bookTitle || inviteDetails?.durationValue === null)) {
    return apiError(400, "invalid_input", "Add a book title and duration before saving the invite.");
  }

  const note = body.note?.trim().slice(0, 240) || null;
  const now = new Date().toISOString();

  await run(
    `UPDATE challenge_circles
     SET note = ?, invite_details_json = ?::jsonb, updated_at = ?
     WHERE id = ?`,
    note,
    JSON.stringify(inviteDetails ?? {}),
    now,
    circleId
  );

  const updatedCircle = await findCircle(circleId);
  if (!updatedCircle) {
    return apiError(500, "save_failed", "Could not update the practice invite.");
  }

  const formatted = await formatCircle(updatedCircle, user.id);
  if (!formatted) {
    return apiError(500, "save_failed", "Could not update the practice invite.");
  }

  return NextResponse.json({ circle: formatted });
}
