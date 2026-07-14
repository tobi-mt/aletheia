import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { ensureCounselInviteAcceptanceSchema, hashCounselInviteToken } from "@/lib/counsel-invites";
import { one, run } from "@/lib/db";
import { sendCounselCommentNotifications } from "@/lib/notifications";
import { isObjectionableUserContent } from "@/lib/user-content-safety";

type Params = { params: Promise<{ token: string }> };

type ContactRow = {
  id: string;
  invite_status: string;
  can_comment_on_decisions: boolean;
};

type AcceptanceRow = {
  id: string;
  contact_id: string;
  recipient_user_id: string;
};

type SharedRow = {
  id: string;
  user_id: string;
  decision_id: string;
};

export type InviteCommentRouteDeps = {
  getCurrentUser: typeof getCurrentUser;
  ensureCounselInviteAcceptanceSchema: typeof ensureCounselInviteAcceptanceSchema;
  one: typeof one;
  run: typeof run;
  sendCounselCommentNotifications: typeof sendCounselCommentNotifications;
  now: () => Date;
  randomUUID: () => string;
};

export const inviteCommentRouteDeps: InviteCommentRouteDeps = {
  getCurrentUser,
  ensureCounselInviteAcceptanceSchema,
  one,
  run,
  sendCounselCommentNotifications,
  now: () => new Date(),
  randomUUID: () => crypto.randomUUID(),
};

export async function postInviteComment(
  request: Request,
  token: string,
  deps: InviteCommentRouteDeps = inviteCommentRouteDeps
) {
  const user = await deps.getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to comment on this invite.");
  }
  await deps.ensureCounselInviteAcceptanceSchema();
  const contact = await deps.one<ContactRow>(
    `SELECT id, invite_status, can_comment_on_decisions
     FROM counsel_contacts
     WHERE invite_token_hash = ?`,
    hashCounselInviteToken(token)
  );
  if (!contact) {
    return apiError(404, "not_found", "Invite not found.");
  }
  if (contact.invite_status !== "accepted") {
    return apiError(403, "permission_denied", "Accept the invite before commenting.");
  }
  if (!contact.can_comment_on_decisions) {
    return apiError(403, "permission_denied", "This invite does not allow comments.");
  }

  const body = (await request.json()) as { decisionId?: string; body?: string };
  const decisionId = body.decisionId?.trim();
  const comment = body.body?.trim().slice(0, 1200);
  if (!decisionId || !comment) {
    return apiError(400, "invalid_input", "Decision and comment are required.");
  }
  if (isObjectionableUserContent(comment)) {
    return apiError(400, "unsafe_content", "This comment cannot be shared.");
  }

  const shared = await deps.one<SharedRow>(
    "SELECT id, user_id, decision_id FROM counsel_shared_decisions WHERE contact_id = ? AND decision_id = ?",
    contact.id,
    decisionId
  );
  if (!shared) {
    return apiError(403, "permission_denied", "That decision summary has not been shared with this counselor.");
  }

  const acceptance = await deps.one<AcceptanceRow>(
    `SELECT id, contact_id, recipient_user_id
     FROM counsel_invite_acceptances
     WHERE contact_id = ? AND recipient_user_id = ?`,
    contact.id,
    user.id
  );

  const now = deps.now().toISOString();
  const id = deps.randomUUID();
  await deps.run(
    "INSERT INTO counsel_comments (id, contact_id, decision_id, body, acceptance_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    id,
    contact.id,
    decisionId,
    comment,
    acceptance?.id ?? null,
    now
  );

  await deps.sendCounselCommentNotifications({
    notificationId: id,
    sharedDecisionId: shared.id,
    contactId: contact.id,
    decisionId,
    senderUserId: user.id,
    senderName: user.name ?? null,
    body: comment,
    targetUserIds: [shared.user_id],
    surface: "outgoing",
  }).catch(() => null);

  return NextResponse.json({
    comment: {
      id,
      body: comment,
      createdAt: now,
      acceptanceId: acceptance?.id ?? null,
    },
  });
}

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  return postInviteComment(request, token);
}
