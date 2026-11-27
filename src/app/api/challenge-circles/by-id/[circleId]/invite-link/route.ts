import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { one, run } from "@/lib/db";
import { challengeInviteUrl, createChallengeInviteToken, hashChallengeInviteToken } from "@/lib/challenge-circles";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ circleId: string }> };

type InviteLinkDeps = {
  getCurrentUser: typeof getCurrentUser;
  one: typeof one;
  run: typeof run;
};

// Circle tokens are only stored as hashes, so members mint an additional link
// instead of recovering the original one. Earlier links keep working.
export async function postCircleInviteLink(
  request: Request,
  circleId: string,
  deps: InviteLinkDeps = { getCurrentUser, one, run }
) {
  const user = await deps.getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to invite friends to this practice.");
  }

  const membership = await deps.one<{ id: string }>(
    `SELECT id FROM challenge_circle_members WHERE circle_id = ? AND user_id = ?`,
    circleId,
    user.id
  );
  if (!membership) {
    return apiError(404, "not_found", "Practice not found.");
  }

  const token = createChallengeInviteToken();
  await deps.run(
    `INSERT INTO challenge_circle_invite_links (token_hash, circle_id, created_by_user_id, created_at)
     VALUES (?, ?, ?, ?)`,
    hashChallengeInviteToken(token),
    circleId,
    user.id,
    new Date().toISOString()
  );

  return NextResponse.json({ inviteUrl: challengeInviteUrl(token, request.url) });
}

export async function POST(request: Request, { params }: Params) {
  const { circleId } = await params;
  try {
    return await postCircleInviteLink(request, circleId);
  } catch {
    return apiError(500, "save_failed", "Could not create an invite link.");
  }
}
