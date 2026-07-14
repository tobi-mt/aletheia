import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { ensureCounselInviteAcceptanceSchema } from "@/lib/counsel-invites";
import { many, one, run } from "@/lib/db";
import { sendCounselCommentNotifications } from "@/lib/notifications";
import { isObjectionableUserContent } from "@/lib/user-content-safety";

type Params = { params: Promise<{ sharedDecisionId: string }> };

type SharedDecisionRow = {
  id: string;
  contact_id: string;
  decision_id: string;
};

type RecipientRow = {
  recipient_user_id: string;
};

export type SharedDecisionCommentRouteDeps = {
  getCurrentUser: typeof getCurrentUser;
  ensureCounselInviteAcceptanceSchema: typeof ensureCounselInviteAcceptanceSchema;
  one: typeof one;
  many: typeof many;
  run: typeof run;
  sendCounselCommentNotifications: typeof sendCounselCommentNotifications;
  now: () => Date;
  randomUUID: () => string;
};

export const sharedDecisionCommentRouteDeps: SharedDecisionCommentRouteDeps = {
  getCurrentUser,
  ensureCounselInviteAcceptanceSchema,
  one,
  many,
  run,
  sendCounselCommentNotifications,
  now: () => new Date(),
  randomUUID: () => crypto.randomUUID(),
};

export async function postSharedDecisionComment(
  request: Request,
  sharedDecisionId: string,
  deps: SharedDecisionCommentRouteDeps = sharedDecisionCommentRouteDeps
) {
  const user = await deps.getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to add a private message.");
  }

  await deps.ensureCounselInviteAcceptanceSchema();

  const sharedDecision = await deps.one<SharedDecisionRow>(
    `SELECT id, contact_id, decision_id
     FROM counsel_shared_decisions
     WHERE id = ? AND user_id = ?`,
    sharedDecisionId,
    user.id
  );
  if (!sharedDecision) {
    return apiError(404, "not_found", "Shared decision not found.");
  }

  const body = (await request.json()) as { body?: string };
  const message = body.body?.trim().slice(0, 1200);
  if (!message) {
    return apiError(400, "invalid_input", "A message is required.");
  }
  if (isObjectionableUserContent(message)) {
    return apiError(400, "unsafe_content", "This message cannot be shared.");
  }

  const now = deps.now().toISOString();
  const id = deps.randomUUID();
  await deps.run(
    "INSERT INTO counsel_comments (id, contact_id, decision_id, body, acceptance_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    id,
    sharedDecision.contact_id,
    sharedDecision.decision_id,
    message,
    null,
    now
  );

  const recipients = await deps.many<RecipientRow>(
    `SELECT recipient_user_id
     FROM counsel_invite_acceptances
     WHERE contact_id = ?
       AND recipient_user_id IS NOT NULL
     ORDER BY created_at DESC`,
    sharedDecision.contact_id
  );

  await deps.sendCounselCommentNotifications({
    notificationId: id,
    sharedDecisionId: sharedDecision.id,
    contactId: sharedDecision.contact_id,
    decisionId: sharedDecision.decision_id,
    senderUserId: user.id,
    senderName: user.name ?? null,
    body: message,
    targetUserIds: recipients.map((recipient) => recipient.recipient_user_id),
    surface: "incoming",
  }).catch(() => null);

  return NextResponse.json({
    comment: {
      id,
      body: message,
      createdAt: now,
      acceptanceId: null,
    },
  });
}

export async function POST(request: Request, { params }: Params) {
  const { sharedDecisionId } = await params;
  return postSharedDecisionComment(request, sharedDecisionId);
}
