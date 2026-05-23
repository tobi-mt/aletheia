import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { many, run } from "@/lib/db";

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
    return NextResponse.json({ error: "Sign in to share decision summaries." }, { status: 401 });
  }

  const body = (await request.json()) as { contactId?: string; decisionIds?: string[] };
  const contactId = body.contactId?.trim();
  const decisionIds = body.decisionIds?.filter((id) => id?.trim()).map((id) => id.trim()) ?? [];
  
  if (!contactId || decisionIds.length === 0) {
    return NextResponse.json({ error: "Contact and at least one decision are required." }, { status: 400 });
  }

  // Verify contact belongs to user and has permission
  const contact = await many<ContactRow>(
    "SELECT id, user_id, can_view_summaries FROM counsel_contacts WHERE id = ? AND user_id = ?",
    contactId,
    user.id
  );

  if (contact.length === 0) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }
  
  if (!contact[0].can_view_summaries) {
    return NextResponse.json({ error: "This counselor does not have summary-view permission." }, { status: 403 });
  }

  // Verify all decisions belong to user
  const placeholders = decisionIds.map(() => "?").join(",");
  const decisions = await many<DecisionRow>(
    `SELECT id, summary FROM wisdom_decisions WHERE id IN (${placeholders}) AND user_id = ?`,
    ...decisionIds,
    user.id
  );

  if (decisions.length !== decisionIds.length) {
    return NextResponse.json({ error: "One or more decisions not found." }, { status: 404 });
  }

  // Bulk insert shared decisions (skip duplicates)
  const now = new Date().toISOString();
  let sharedCount = 0;
  
  for (const decisionId of decisionIds) {
    try {
      await run(
        `INSERT INTO counsel_shared_decisions (id, user_id, contact_id, decision_id, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (contact_id, decision_id) DO NOTHING`,
        crypto.randomUUID(),
        user.id,
        contactId,
        decisionId,
        now
      );
      sharedCount++;
    } catch (error) {
      // Continue on error - log but don't fail the whole batch
      console.error("Failed to share decision:", decisionId, error);
    }
  }

  await trackServerEvent({
    userId: user.id,
    eventName: "counsel_decisions_bulk_shared",
    metadata: { count: sharedCount, requested: decisionIds.length },
  });

  return NextResponse.json({ ok: true, sharedCount });
}
