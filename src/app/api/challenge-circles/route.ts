import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { many, one, run } from "@/lib/db";
import { createChallengeInviteToken, challengeInviteUrl, hashChallengeInviteToken } from "@/lib/challenge-circles";
import { readJsonBody } from "@/lib/request";
import { challengeDefinitions, getChallengeById } from "@/lib/challenge-data";
import { trackServerEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

type CircleRow = {
  id: string;
  challenge_id: string;
  owner_user_id: string;
  invite_status: string;
  note: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  owner_name: string | null;
  owner_avatar_url: string | null;
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

async function circleMembers(circleId: string, challengeId: string) {
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
    challengeId,
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

async function formatCircle(circle: CircleRow) {
  const challenge = getChallengeById(circle.challenge_id);
  if (!challenge) {
    return null;
  }

  const [members, nudges] = await Promise.all([
    circleMembers(circle.id, circle.challenge_id),
    circleNudges(circle.id),
  ]);

  return {
    id: circle.id,
    challengeId: circle.challenge_id,
    challenge: {
      id: challenge.id,
      titleKey: challenge.titleKey,
      descriptionKey: challenge.descriptionKey,
      totalDays: challenge.totalDays,
      mode: challenge.mode,
    },
    invite: {
      status: circle.invite_status,
      note: circle.note,
      acceptedAt: circle.accepted_at,
      createdAt: circle.created_at,
      owner: {
        id: circle.owner_user_id,
        name: circle.owner_name,
        avatarUrl: circle.owner_avatar_url,
      },
    },
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

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ circles: [] });
    }

    const circles = await many<CircleRow>(
      `SELECT c.id, c.challenge_id, c.owner_user_id, c.invite_status, c.note, c.accepted_at, c.created_at, c.updated_at,
              u.name AS owner_name, u.avatar_url AS owner_avatar_url
       FROM challenge_circles c
       JOIN challenge_circle_members m ON m.circle_id = c.id
       LEFT JOIN users u ON u.id = c.owner_user_id
       WHERE m.user_id = ?
       ORDER BY c.created_at DESC`,
      user.id
    );

    const formatted = await Promise.all(circles.map((circle) => formatCircle(circle)));
    return NextResponse.json({
      circles: formatted.filter((circle): circle is NonNullable<typeof circle> => Boolean(circle)),
      challenges: challengeDefinitions.map((challenge) => ({
        id: challenge.id,
        titleKey: challenge.titleKey,
        descriptionKey: challenge.descriptionKey,
        totalDays: challenge.totalDays,
        mode: challenge.mode,
      })),
    });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to see shared practices.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError(401, "sign_in_required", "Sign in to create a shared practice invite.");
    }

    const parsed = await readJsonBody<{ challengeId?: string; note?: string }>(request, { maxBytes: 2_000, emptyBody: {} });
    if (!parsed.ok) {
      return parsed.response;
    }
    const body = parsed.data;
    const challengeId = body.challengeId?.trim() ?? "";
    const note = body.note?.trim().slice(0, 240) || null;
    const challenge = getChallengeById(challengeId);
    if (!challenge) {
      return apiError(404, "not_found", "Challenge not found.");
    }

    const token = createChallengeInviteToken();
    const now = new Date().toISOString();
    const circleId = crypto.randomUUID();

    await run(
      `INSERT INTO challenge_circles (
         id, challenge_id, owner_user_id, invite_token_hash, invite_status, note, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      circleId,
      challengeId,
      user.id,
      hashChallengeInviteToken(token),
      "pending",
      note,
      now,
      now
    );

    await run(
      `INSERT INTO challenge_circle_members (
         id, circle_id, user_id, role, joined_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      circleId,
      user.id,
      "host",
      now,
      now
    );

    await trackServerEvent({
      userId: user.id,
      eventName: "challenge_circle_created",
      metadata: {
        challengeId,
        totalDays: challenge.totalDays,
        mode: challenge.mode,
      },
    });

    const circle = await one<CircleRow>(
      `SELECT c.id, c.challenge_id, c.owner_user_id, c.invite_status, c.note, c.accepted_at, c.created_at, c.updated_at,
              u.name AS owner_name, u.avatar_url AS owner_avatar_url
       FROM challenge_circles c
       LEFT JOIN users u ON u.id = c.owner_user_id
       WHERE c.id = ?`,
      circleId
    );
    if (!circle) {
      return apiError(500, "save_failed", "Could not create the practice invite.");
    }

    const formatted = await formatCircle(circle);
    if (!formatted) {
      return apiError(500, "save_failed", "Could not create the practice invite.");
    }

    return NextResponse.json({
      circle: formatted,
      inviteUrl: challengeInviteUrl(token, request.url),
    });
  } catch {
    return apiError(500, "save_failed", "Could not create the practice invite.");
  }
}
