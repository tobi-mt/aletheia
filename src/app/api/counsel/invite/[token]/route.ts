import { NextResponse } from "next/server";
import { hashCounselInviteToken } from "@/lib/counsel-invites";
import { many, one, run } from "@/lib/db";

type Params = { params: Promise<{ token: string }> };

type ContactRow = {
  id: string;
  name: string;
  role: string;
  avatar_url: string | null;
  invite_status: string;
  can_view_summaries: boolean;
  can_comment_on_decisions: boolean;
  can_receive_checkins: boolean;
  accepted_at: string | null;
};

type SharedDecisionRow = {
  id: string;
  title: string;
  mode: string;
  status: string;
  readiness: number;
  summary: string | null;
  waiting_until: string | null;
  shared_at: string;
};

type CommentRow = {
  id: string;
  decision_id: string;
  body: string;
  created_at: string;
};

async function findContact(token: string) {
  return one<ContactRow>(
    `SELECT id, name, role, avatar_url, invite_status, can_view_summaries, can_comment_on_decisions,
            can_receive_checkins, accepted_at
     FROM counsel_contacts
     WHERE invite_token_hash = ?`,
    hashCounselInviteToken(token)
  );
}

async function sharedDecisions(contactId: string) {
  return many<SharedDecisionRow>(
    `SELECT d.id, d.title, d.mode, d.status, d.readiness, d.summary, d.waiting_until, s.created_at AS shared_at
     FROM counsel_shared_decisions s
     JOIN wisdom_decisions d ON d.id = s.decision_id
     WHERE s.contact_id = ?
     ORDER BY s.created_at DESC
     LIMIT 20`,
    contactId
  );
}

async function comments(contactId: string) {
  return many<CommentRow>(
    `SELECT id, decision_id, body, created_at
     FROM counsel_comments
     WHERE contact_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    contactId
  );
}

function publicPayload(contact: ContactRow, decisions: SharedDecisionRow[], commentRows: CommentRow[]) {
  return {
    invite: {
      name: contact.name,
      role: contact.role,
      avatarUrl: contact.avatar_url,
      status: contact.invite_status,
      acceptedAt: contact.accepted_at,
      permissions: {
        canViewSummaries: contact.can_view_summaries,
        canCommentOnDecisions: contact.can_comment_on_decisions,
        canReceiveCheckins: contact.can_receive_checkins,
      },
    },
    sharedDecisions: decisions.map((decision) => ({
      id: decision.id,
      title: decision.title,
      mode: decision.mode,
      status: decision.status,
      readiness: decision.readiness,
      summary: decision.summary,
      waitingUntil: decision.waiting_until,
      sharedAt: decision.shared_at,
      comments: commentRows
        .filter((comment) => comment.decision_id === decision.id)
        .map((comment) => ({
          id: comment.id,
          body: comment.body,
          createdAt: comment.created_at,
        })),
    })),
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const contact = await findContact(token);
  if (!contact) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  const decisions = contact.invite_status === "accepted" ? await sharedDecisions(contact.id) : [];
  const commentRows = contact.invite_status === "accepted" ? await comments(contact.id) : [];
  return NextResponse.json(publicPayload(contact, decisions, commentRows));
}

export async function POST(_request: Request, { params }: Params) {
  const { token } = await params;
  const contact = await findContact(token);
  if (!contact) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  const now = new Date().toISOString();
  if (contact.invite_status !== "accepted") {
    await run(
      "UPDATE counsel_contacts SET invite_status = ?, accepted_at = ?, updated_at = ? WHERE id = ?",
      "accepted",
      now,
      now,
      contact.id
    );
    contact.invite_status = "accepted";
    contact.accepted_at = now;
  }

  const decisions = await sharedDecisions(contact.id);
  const commentRows = await comments(contact.id);
  return NextResponse.json(publicPayload(contact, decisions, commentRows));
}
