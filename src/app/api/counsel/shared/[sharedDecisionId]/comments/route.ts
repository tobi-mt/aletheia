import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { ensureCounselInviteAcceptanceSchema } from "@/lib/counsel-invites";
import { one, run } from "@/lib/db";

type Params = { params: Promise<{ sharedDecisionId: string }> };

type SharedDecisionRow = {
  id: string;
  contact_id: string;
  decision_id: string;
};

export async function POST(request: Request, { params }: Params) {
  const { sharedDecisionId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to add a private message.");
  }

  await ensureCounselInviteAcceptanceSchema();

  const sharedDecision = await one<SharedDecisionRow>(
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

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await run(
    "INSERT INTO counsel_comments (id, contact_id, decision_id, body, acceptance_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    id,
    sharedDecision.contact_id,
    sharedDecision.decision_id,
    message,
    null,
    now
  );

  return NextResponse.json({
    comment: {
      id,
      body: message,
      createdAt: now,
      acceptanceId: null,
    },
  });
}
