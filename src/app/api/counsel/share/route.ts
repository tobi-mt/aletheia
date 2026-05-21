import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { one, run } from "@/lib/db";

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
    return NextResponse.json({ error: "Sign in to share a decision summary." }, { status: 401 });
  }

  const body = (await request.json()) as { contactId?: string; decisionId?: string };
  const contactId = body.contactId?.trim();
  const decisionId = body.decisionId?.trim();
  if (!contactId || !decisionId) {
    return NextResponse.json({ error: "Contact and decision are required." }, { status: 400 });
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
    return NextResponse.json({ error: "Contact or decision not found." }, { status: 404 });
  }
  if (!contact.can_view_summaries) {
    return NextResponse.json({ error: "This counselor does not have summary-view permission." }, { status: 403 });
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
