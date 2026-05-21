import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { counselInviteUrl, createCounselInviteToken, hashCounselInviteToken } from "@/lib/counsel-invites";
import { many, run } from "@/lib/db";
import { counselInviteEmail, emailConfigured, isEmailAddress, sendEmail } from "@/lib/email";

type CounselRow = {
  id: string;
  name: string;
  role: string;
  contact: string | null;
  notes: string | null;
  invite_status: string;
  can_view_summaries: boolean;
  can_comment_on_decisions: boolean;
  can_receive_checkins: boolean;
  accepted_at: string | null;
  created_at: string;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ contacts: [] });
  }

  const contacts = await many<CounselRow>(
    `SELECT id, name, role, contact, notes, invite_status, can_view_summaries,
            can_comment_on_decisions, can_receive_checkins, accepted_at, created_at
     FROM counsel_contacts
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    user.id
  );

  return NextResponse.json({
    contacts: contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      role: contact.role,
      contact: contact.contact,
      notes: contact.notes,
      inviteStatus: contact.invite_status,
      canViewSummaries: contact.can_view_summaries,
      canCommentOnDecisions: contact.can_comment_on_decisions,
      canReceiveCheckins: contact.can_receive_checkins,
      acceptedAt: contact.accepted_at,
      createdAt: contact.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to save your counsel circle." }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    role?: string;
    contact?: string;
    notes?: string;
    canViewSummaries?: boolean;
    canCommentOnDecisions?: boolean;
    canReceiveCheckins?: boolean;
  };
  const name = body.name?.trim().slice(0, 120);
  const role = (body.role?.trim() || "mentor").slice(0, 80);
  const contactValue = body.contact?.trim().slice(0, 180) || null;
  const notes = body.notes?.trim().slice(0, 500) || null;
  const canViewSummaries = body.canViewSummaries !== false;
  const canCommentOnDecisions = Boolean(body.canCommentOnDecisions);
  const canReceiveCheckins = Boolean(body.canReceiveCheckins);
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const token = createCounselInviteToken();
  const inviteUrl = counselInviteUrl(token, request.url);
  const contact = {
    id: crypto.randomUUID(),
    name,
    role,
    contact: contactValue,
    notes,
    inviteStatus: "pending",
    canViewSummaries,
    canCommentOnDecisions,
    canReceiveCheckins,
    acceptedAt: null,
    createdAt: now,
    emailSent: false,
    emailError: null as string | null,
  };
  await run(
    `INSERT INTO counsel_contacts (
      id, user_id, name, role, contact, notes, invite_token_hash, invite_status,
      can_view_summaries, can_comment_on_decisions, can_receive_checkins,
      created_at, updated_at
    )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    contact.id,
    user.id,
    name,
    role,
    contactValue,
    notes,
    hashCounselInviteToken(token),
    "pending",
    canViewSummaries,
    canCommentOnDecisions,
    canReceiveCheckins,
    now,
    now
  );
  await trackServerEvent({
    userId: user.id,
    eventName: "counsel_contact_created",
    metadata: {
      role,
      invite: true,
      canViewSummaries,
      canCommentOnDecisions,
      canReceiveCheckins,
    },
  });

  if (contactValue && isEmailAddress(contactValue) && emailConfigured()) {
    const inviterName = user.name || "Someone you know";
    const template = counselInviteEmail({
      counselorName: name,
      inviterName,
      inviteUrl,
    });
    const result = await sendEmail({
      to: contactValue,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
    contact.emailSent = result.sent;
    contact.emailError = result.sent ? null : result.error || "Email could not be sent.";
  }

  return NextResponse.json({ contact, inviteUrl });
}
