import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { ensureCounselInviteAcceptanceSchema } from "@/lib/counsel-invites";
import { one, run } from "@/lib/db";

type Params = { params: Promise<{ contactId: string }> };

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
  decision_id: string;
};

export async function POST(request: Request, { params }: Params) {
  const { contactId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to comment on this invite.");
  }

  await ensureCounselInviteAcceptanceSchema();

  const contact = await one<ContactRow>(
    `SELECT id, invite_status, can_comment_on_decisions
     FROM counsel_contacts
     WHERE id = ?`,
    contactId
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

  const acceptance = await one<AcceptanceRow>(
    `SELECT id, contact_id, recipient_user_id
     FROM counsel_invite_acceptances
     WHERE contact_id = ? AND recipient_user_id = ?`,
    contact.id,
    user.id
  );
  if (!acceptance) {
    return apiError(403, "permission_denied", "Open the accepted invite before commenting.");
  }

  const body = (await request.json()) as { decisionId?: string; body?: string };
  const decisionId = body.decisionId?.trim();
  const comment = body.body?.trim().slice(0, 1200);
  if (!decisionId || !comment) {
    return apiError(400, "invalid_input", "Decision and comment are required.");
  }

  const shared = await one<SharedRow>(
    "SELECT decision_id FROM counsel_shared_decisions WHERE contact_id = ? AND decision_id = ?",
    contact.id,
    decisionId
  );
  if (!shared) {
    return apiError(403, "permission_denied", "That decision summary has not been shared with this counselor.");
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await run(
    "INSERT INTO counsel_comments (id, contact_id, decision_id, body, acceptance_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    id,
    contact.id,
    decisionId,
    comment,
    acceptance.id,
    now
  );

  return NextResponse.json({
    comment: {
      id,
      body: comment,
      createdAt: now,
      acceptanceId: acceptance.id,
    },
  });
}
