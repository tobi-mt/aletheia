import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { many, one, run } from "@/lib/db";
import { hashChallengeInviteToken } from "@/lib/challenge-circles";
import { normalizeReadWithMeInviteDetails, type ReadWithMeInviteDetails } from "@/lib/read-with-me-invite";
import { buildFastingDayPlan, normalizeFastingInviteDetails, type FastingInviteDetails } from "@/lib/fasting-invite";
import { readJsonBody } from "@/lib/request";
import { trackServerEvent } from "@/lib/analytics";
import { getChallengeById } from "@/lib/challenge-data";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

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

async function findCircle(token: string) {
  return one<CircleRow>(
    `SELECT c.id, c.challenge_id, c.owner_user_id, c.invite_status, c.note, c.invite_details_json, c.accepted_at, c.created_at, c.updated_at,
            u.name AS owner_name, u.avatar_url AS owner_avatar_url
     FROM challenge_circles c
     LEFT JOIN users u ON u.id = c.owner_user_id
     WHERE c.invite_token_hash = ?`,
    hashChallengeInviteToken(token)
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

async function circleMembers(circleId: string, challengeId: string) {
  const progressKey = challengeId === FASTING_CHALLENGE_ID ? `fasting:${circleId}` : challengeId;
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

async function circleNudges(circleId: string) {
  return many<NudgeRow>(
    `SELECT n.id, n.body, n.created_at, n.sender_user_id, u.name AS sender_name, u.avatar_url AS sender_avatar_url
     FROM challenge_circle_nudges n
     JOIN users u ON u.id = n.sender_user_id
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
    })),
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const circle = await findCircle(token);
  if (!circle) {
    return apiError(404, "not_found", "Invite not found.");
  }

  const user = await getCurrentUser();
  const formatted = await formatCircle(circle, user?.id);
  if (!formatted) {
    return apiError(404, "not_found", "Invite not found.");
  }

  return NextResponse.json(formatted);
}

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to join the shared practice.");
  }

  const circle = await findCircle(token);
  if (!circle) {
    return apiError(404, "not_found", "Invite not found.");
  }

  const parsed = await readJsonBody<{ action?: "accept" | "decline" }>(request, { maxBytes: 1_000, emptyBody: {} });
  if (!parsed.ok) {
    return parsed.response;
  }
  const action = parsed.data.action ?? "accept";
  if (action !== "accept" && action !== "decline") {
    return apiError(400, "invalid_input", "Unknown invite response.");
  }

  const now = new Date().toISOString();
  if (action === "accept" && circle.invite_status !== "accepted") {
    await run(
      "UPDATE challenge_circles SET invite_status = ?, accepted_at = ?, updated_at = ? WHERE id = ?",
      "accepted",
      now,
      now,
      circle.id
    );
    circle.invite_status = "accepted";
    circle.accepted_at = now;
  }

  await run(
    `INSERT INTO challenge_circle_invite_responses (id, circle_id, user_id, response_status, responded_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (circle_id, user_id) DO UPDATE SET
       response_status = EXCLUDED.response_status,
       responded_at = EXCLUDED.responded_at,
       updated_at = EXCLUDED.updated_at`,
    crypto.randomUUID(),
    circle.id,
    user.id,
    action === "accept" ? "accepted" : "declined",
    now,
    now
  );

  if (action === "accept") {
    await run(
      `INSERT INTO challenge_circle_members (id, circle_id, user_id, role, joined_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (circle_id, user_id) DO UPDATE SET updated_at = EXCLUDED.updated_at`,
      crypto.randomUUID(),
      circle.id,
      user.id,
      user.id === circle.owner_user_id ? "host" : "member",
      now,
      now
    );
  } else if (user.id !== circle.owner_user_id) {
    await run(
      `DELETE FROM challenge_circle_members
       WHERE circle_id = ? AND user_id = ?`,
      circle.id,
      user.id
    );
  }

  await trackServerEvent({
    userId: user.id,
    eventName: action === "accept" ? "challenge_circle_joined" : "challenge_circle_declined",
    metadata: {
      challengeId: circle.challenge_id,
      responseStatus: action,
    },
  }).catch(() => undefined);

  const refreshed = await findCircle(token);
  if (!refreshed) {
    return apiError(500, "save_failed", "Could not join the shared practice.");
  }

  const formatted = await formatCircle(refreshed, user.id);
  if (!formatted) {
    return apiError(500, "save_failed", "Could not join the shared practice.");
  }

  return NextResponse.json(formatted);
}
