import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { normalizeAvatarUrl } from "@/lib/avatars";
import { counselInviteUrl, createCounselInviteToken, hashCounselInviteToken } from "@/lib/counsel-invites";
import { many, one, run, withDbClient } from "@/lib/db";
import { counselInviteEmail, emailConfigured, isEmailAddress, sendEmail } from "@/lib/email";
import { readJsonBody } from "@/lib/request";
import { apiError } from "@/lib/api-errors";

type CounselRow = {
  id: string;
  name: string;
  role: string;
  avatar_url: string | null;
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
    `SELECT id, name, role, avatar_url, contact, notes, invite_status, can_view_summaries,
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
      avatarUrl: contact.avatar_url,
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
    return apiError(401, "sign_in_required", "Sign in to save your counsel circle.");
  }

  const body = (await request.json()) as {
    name?: string;
    role?: string;
    avatarUrl?: string;
    contact?: string;
    notes?: string;
    canViewSummaries?: boolean;
    canCommentOnDecisions?: boolean;
    canReceiveCheckins?: boolean;
  };
  const name = body.name?.trim().slice(0, 120);
  const role = (body.role?.trim() || "mentor").slice(0, 80);
  const avatarUrl = normalizeAvatarUrl(body.avatarUrl?.trim() ?? "") ?? null;
  if (body.avatarUrl?.trim() && !avatarUrl) {
    return apiError(
      400,
      "invalid_image",
      "Use a valid image for the counselor avatar. Curated picks, gallery uploads, and HTTPS image URLs are supported."
    );
  }
  const contactValue = body.contact?.trim().slice(0, 180) || null;
  const notes = body.notes?.trim().slice(0, 500) || null;
  const canViewSummaries = body.canViewSummaries !== false;
  const canCommentOnDecisions = Boolean(body.canCommentOnDecisions);
  const canReceiveCheckins = Boolean(body.canReceiveCheckins);
  if (!name) {
    return apiError(400, "invalid_input", "Name is required.");
  }

  const now = new Date().toISOString();
  const token = createCounselInviteToken();
  const inviteUrl = counselInviteUrl(token, request.url);
  const contact = {
    id: crypto.randomUUID(),
    name,
    role,
    avatarUrl,
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
      id, user_id, name, role, avatar_url, contact, notes, invite_token_hash, invite_status,
      can_view_summaries, can_comment_on_decisions, can_receive_checkins,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    contact.id,
    user.id,
    name,
    role,
    avatarUrl,
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

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to manage your counsel circle.");
  }

  const url = new URL(request.url);
  let contactId = url.searchParams.get("contactId")?.trim() || "";

  if (!contactId) {
    const parsedBody = await readJsonBody<{ contactId?: string }>(request, { maxBytes: 1_000, emptyBody: {} });
    if (!parsedBody.ok) {
      return parsedBody.response;
    }
    const body = parsedBody.data;
    contactId = body.contactId?.trim() || "";
  }

  if (!contactId) {
    return apiError(400, "invalid_input", "Contact is required.");
  }

  const contact = await one<Pick<CounselRow, "id" | "name" | "role" | "invite_status">>(
    "SELECT id, name, role, invite_status FROM counsel_contacts WHERE id = ? AND user_id = ?",
    contactId,
    user.id
  );

  if (!contact) {
    return apiError(404, "not_found", "Contact not found.");
  }

  let revokedSharedCount = 0;
  let revokedCommentCount = 0;
  try {
    await withDbClient("remove counsel contact", async (client) => {
      await client.query("BEGIN");

      try {
        const sharedResult = await client.query(
          "DELETE FROM counsel_shared_decisions WHERE contact_id = $1 AND user_id = $2",
          [contactId, user.id]
        );
        revokedSharedCount = sharedResult.rowCount ?? 0;

        const commentResult = await client.query("DELETE FROM counsel_comments WHERE contact_id = $1", [contactId]);
        revokedCommentCount = commentResult.rowCount ?? 0;

        await client.query("DELETE FROM counsel_contacts WHERE id = $1 AND user_id = $2", [contactId, user.id]);

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      }
    });
  } catch (error) {
    console.error("Failed to remove counsel contact", error);
    return apiError(500, "save_failed", "Could not remove this counsel contact.");
  }

  await trackServerEvent({
    userId: user.id,
    eventName: "counsel_contact_removed",
    metadata: {
      role: contact.role,
      inviteStatus: contact.invite_status,
      revokedSharedCount,
      revokedCommentCount,
    },
  });

  return NextResponse.json({
    ok: true,
    removedContactId: contactId,
    revokedSharedCount,
    revokedCommentCount,
  });
}
