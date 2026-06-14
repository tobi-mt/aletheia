import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { one, run } from "@/lib/db";
import { apiError } from "@/lib/api-errors";

type ContactRow = {
  id: string;
  user_id: string;
  can_view_summaries: boolean;
};

type DecisionRow = {
  id: string;
  summary: string | null;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to share a decision summary.");
  }

  const body = (await request.json()) as { contactId?: string; decisionId?: string };
  const contactId = body.contactId?.trim();
  const decisionId = body.decisionId?.trim();
  if (!contactId || !decisionId) {
    return apiError(400, "invalid_input", "Contact and decision are required.");
  }

  const [contact, decision] = await Promise.all([
    one<ContactRow>(
      "SELECT id, user_id, can_view_summaries FROM counsel_contacts WHERE id = ? AND user_id = ?",
      contactId,
      user.id
    ),
    one<DecisionRow>(
      "SELECT id, summary FROM wisdom_decisions WHERE id = ? AND user_id = ?",
      decisionId,
      user.id
    ),
  ]);

  if (!contact || !decision) {
    return apiError(404, "not_found", "Contact or decision not found.");
  }
  if (!contact.can_view_summaries) {
    return apiError(403, "permission_denied", "This counselor does not have summary-view permission.");
  }

  await run(
    `INSERT INTO counsel_shared_decisions (id, user_id, contact_id, decision_id, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (contact_id, decision_id) DO NOTHING`,
    crypto.randomUUID(),
    user.id,
    contactId,
    decisionId,
    new Date().toISOString()
  );
  await trackServerEvent({
    userId: user.id,
    eventName: "counsel_decision_shared",
    metadata: { hasSummary: Boolean(decision.summary) },
  });

  return NextResponse.json({ ok: true });
}
