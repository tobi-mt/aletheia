import { NextResponse } from "next/server";
import { hashCounselInviteToken } from "@/lib/counsel-invites";
import { one, run } from "@/lib/db";

type Params = { params: Promise<{ token: string }> };

type ContactRow = {
  id: string;
  invite_status: string;
  can_comment_on_decisions: boolean;
};

type SharedRow = {
  decision_id: string;
};

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const contact = await one<ContactRow>(
    `SELECT id, invite_status, can_comment_on_decisions
     FROM counsel_contacts
     WHERE invite_token_hash = ?`,
    hashCounselInviteToken(token)
  );
  if (!contact) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }
  if (contact.invite_status !== "accepted") {
    return NextResponse.json({ error: "Accept the invite before commenting." }, { status: 403 });
  }
  if (!contact.can_comment_on_decisions) {
    return NextResponse.json({ error: "This invite does not allow comments." }, { status: 403 });
  }

  const body = (await request.json()) as { decisionId?: string; body?: string };
  const decisionId = body.decisionId?.trim();
  const comment = body.body?.trim().slice(0, 1200);
  if (!decisionId || !comment) {
    return NextResponse.json({ error: "Decision and comment are required." }, { status: 400 });
  }

  const shared = await one<SharedRow>(
    "SELECT decision_id FROM counsel_shared_decisions WHERE contact_id = ? AND decision_id = ?",
    contact.id,
    decisionId
  );
  if (!shared) {
    return NextResponse.json({ error: "That decision summary has not been shared with this counselor." }, { status: 403 });
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await run(
    "INSERT INTO counsel_comments (id, contact_id, decision_id, body, created_at) VALUES (?, ?, ?, ?, ?)",
    id,
    contact.id,
    decisionId,
    comment,
    now
  );

  return NextResponse.json({
    comment: {
      id,
      body: comment,
      createdAt: now,
    },
  });
}
