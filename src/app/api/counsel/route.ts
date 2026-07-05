import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { normalizeAvatarUrl } from "@/lib/avatars";
import { createCounselInviteToken, ensureCounselInviteAcceptanceSchema, hashCounselInviteToken } from "@/lib/counsel-invites";
import { counselInviteUrl } from "@/lib/counsel-invite-links";
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

type SharedDecisionRow = {
  shared_id: string;
  id: string;
  title: string;
  mode: string;
  status: string;
  readiness: number;
  summary: string | null;
  waiting_until: string | null;
  shared_at: string;
};

type SharedDecisionDeliveryRow = {
  contact_id: string;
  shared_id: string;
  decision_id: string;
  title: string;
  mode: string;
  status: string;
  readiness: number;
  summary: string | null;
  waiting_until: string | null;
  shared_at: string;
  delivery_status: string | null;
  delivery_reason: string | null;
  accepted_recipient_count: number | string | null;
  push_subscription_count: number | string | null;
  delivered_count: number | string | null;
  failed_count: number | string | null;
  opened_count: number | string | null;
  attempted_at: string | null;
  delivered_at: string | null;
  delivery_updated_at: string | null;
  comments: Array<{
    id: string;
    body: string;
    createdAt: string;
    acceptanceId: string | null;
  }>;
};

type SharedDecisionCommentRow = {
  id: string;
  contact_id: string;
  decision_id: string;
  body: string;
  created_at: string;
  acceptance_id: string | null;
};

type CommentRow = {
  id: string;
  decision_id: string;
  body: string;
  created_at: string;
  acceptance_id: string | null;
};

type ReceivedInviteRow = {
  id: string;
  invite_token_hash: string;
  contact_id: string;
  recipient_user_id: string;
  accepted_at: string;
  created_at: string;
};

type CounselInvitePreviewPayload = {
  invite: {
    contactId: string;
    acceptanceId?: string;
    name: string;
    role: string;
    avatarUrl: string | null;
    status: "pending" | "accepted";
    acceptedAt: string | null;
    permissions: {
      canViewSummaries: boolean;
      canCommentOnDecisions: boolean;
      canReceiveCheckins: boolean;
    };
  };
  sharedDecisions: Array<{
    sharedId: string;
    id: string;
    title: string;
    mode: string;
    status: string;
    readiness: number;
    summary: string | null;
    waitingUntil: string | null;
    sharedAt: string;
    comments: Array<{ id: string; body: string; createdAt: string; acceptanceId: string | null }>;
  }>;
};

async function sharedDecisions(contactId: string) {
  return many<SharedDecisionRow>(
    `SELECT s.id AS shared_id, d.id, d.title, d.mode, d.status, d.readiness, d.summary, d.waiting_until, s.created_at AS shared_at
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
    `SELECT id, decision_id, body, created_at, acceptance_id
     FROM counsel_comments
     WHERE contact_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    contactId
  );
}

async function recentSharedDecisions(userId: string) {
  return many<SharedDecisionDeliveryRow>(
    `WITH ranked AS (
       SELECT
         s.contact_id,
         s.id AS shared_id,
         d.id AS decision_id,
         d.title,
         d.mode,
         d.status,
         d.readiness,
         d.summary,
         d.waiting_until,
         s.created_at AS shared_at,
         delivery.status AS delivery_status,
         delivery.status_reason AS delivery_reason,
         delivery.accepted_recipient_count,
         delivery.push_subscription_count,
         delivery.delivered_count,
         delivery.failed_count,
         COALESCE(receipts.opened_count, 0) AS opened_count,
         delivery.attempted_at,
         delivery.delivered_at,
         delivery.updated_at AS delivery_updated_at,
         ROW_NUMBER() OVER (PARTITION BY s.contact_id ORDER BY s.created_at DESC) AS rn
       FROM counsel_shared_decisions s
       JOIN wisdom_decisions d ON d.id = s.decision_id
       LEFT JOIN counsel_shared_decision_deliveries delivery ON delivery.shared_decision_id = s.id
       LEFT JOIN (
         SELECT notification_id, COUNT(*)::int AS opened_count
         FROM notification_delivery_receipts
         WHERE notification_kind = 'counsel_decision_shared'
         GROUP BY notification_id
       ) receipts ON receipts.notification_id = s.id
       WHERE s.user_id = ?
     )
     SELECT *
     FROM ranked
     WHERE rn <= 12
     ORDER BY shared_at DESC`,
    userId
  );
}

async function receivedInvitePreviews(userId: string) {
  const acceptedRows = await many<ReceivedInviteRow>(
    `SELECT a.id, a.invite_token_hash, a.contact_id, a.recipient_user_id, a.accepted_at, a.created_at
     FROM counsel_invite_acceptances a
     WHERE a.recipient_user_id = ?
     ORDER BY a.accepted_at DESC`,
    userId
  );

  if (!acceptedRows.length) {
    return [];
  }

  const contactIds = acceptedRows.map((row) => row.contact_id);
  const placeholders = contactIds.map(() => "?").join(",");
  const contacts = await many<CounselRow>(
    `SELECT id, name, role, avatar_url, contact, notes, invite_status, can_view_summaries,
            can_comment_on_decisions, can_receive_checkins, accepted_at, created_at
     FROM counsel_contacts
     WHERE id IN (${placeholders})`,
    ...contactIds
  );
  const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));

  const inviteRows = await Promise.all(
    acceptedRows.map(async (row) => {
      const contact = contactsById.get(row.contact_id);
      if (!contact) {
        return null;
      }
      const [decisionRows, commentRows] = await Promise.all([sharedDecisions(contact.id), comments(contact.id)]);
      return {
        invite: {
          contactId: contact.id,
          acceptanceId: row.id,
          name: contact.name,
          role: contact.role,
          avatarUrl: contact.avatar_url,
          status: "accepted" as const,
          acceptedAt: row.accepted_at,
          permissions: {
            canViewSummaries: contact.can_view_summaries,
            canCommentOnDecisions: contact.can_comment_on_decisions,
            canReceiveCheckins: contact.can_receive_checkins,
          },
        },
        sharedDecisions: decisionRows.map((decision) => ({
          sharedId: decision.shared_id,
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
              acceptanceId: comment.acceptance_id,
            })),
        })),
      } satisfies CounselInvitePreviewPayload;
    })
  );

  return inviteRows.filter(Boolean) as CounselInvitePreviewPayload[];
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ contacts: [], receivedInvites: [] });
  }

  await ensureCounselInviteAcceptanceSchema();

  const contacts = await many<CounselRow>(
    `SELECT id, name, role, avatar_url, contact, notes, invite_status, can_view_summaries,
            can_comment_on_decisions, can_receive_checkins, accepted_at, created_at
     FROM counsel_contacts
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    user.id
  );
  const receivedInvites = await receivedInvitePreviews(user.id);
  const recentShares = await recentSharedDecisions(user.id);
  const recentShareComments = await many<SharedDecisionCommentRow>(
    `SELECT c.id, c.contact_id, c.decision_id, c.body, c.created_at, c.acceptance_id
     FROM counsel_comments c
     JOIN counsel_shared_decisions s
       ON s.contact_id = c.contact_id
      AND s.decision_id = c.decision_id
     WHERE s.user_id = ?
     ORDER BY c.created_at ASC
     LIMIT 200`,
    user.id
  );
  const commentsByShareKey = new Map<string, Array<{
    id: string;
    body: string;
    createdAt: string;
    acceptanceId: string | null;
  }>>();
  for (const comment of recentShareComments) {
    const key = `${comment.contact_id}:${comment.decision_id}`;
    const bucket = commentsByShareKey.get(key) ?? [];
    bucket.push({
      id: comment.id,
      body: comment.body,
      createdAt: comment.created_at,
      acceptanceId: comment.acceptance_id,
    });
    commentsByShareKey.set(key, bucket);
  }
  const recentSharesByContact = new Map<string, Array<{
    id: string;
    decisionId: string;
    title: string;
    mode: string;
    status: string;
    readiness: number;
    summary: string | null;
    waitingUntil: string | null;
    sharedAt: string;
    deliveryStatus: string;
    deliveryReason: string | null;
    acceptedRecipientCount: number;
    pushSubscriptionCount: number;
    deliveredCount: number;
    failedCount: number;
    openedCount: number;
    attemptedAt: string | null;
    deliveredAt: string | null;
    deliveryUpdatedAt: string | null;
    comments: Array<{
      id: string;
      body: string;
      createdAt: string;
      acceptanceId: string | null;
    }>;
  }>>();

  for (const share of recentShares) {
    const bucket = recentSharesByContact.get(share.contact_id) ?? [];
      bucket.push({
        id: share.shared_id,
        decisionId: share.decision_id,
        title: share.title,
        mode: share.mode,
        status: share.status,
        readiness: share.readiness,
        summary: share.summary,
        waitingUntil: share.waiting_until,
        sharedAt: share.shared_at,
        deliveryStatus:
          Number(share.opened_count ?? 0) > 0
            ? "opened"
            : share.delivery_status ?? "sent_to_push_service",
      deliveryReason: share.delivery_reason,
      acceptedRecipientCount: Number(share.accepted_recipient_count ?? 0),
      pushSubscriptionCount: Number(share.push_subscription_count ?? 0),
      deliveredCount: Number(share.delivered_count ?? 0),
      failedCount: Number(share.failed_count ?? 0),
      openedCount: Number(share.opened_count ?? 0),
      attemptedAt: share.attempted_at,
      deliveredAt: share.delivered_at,
      deliveryUpdatedAt: share.delivery_updated_at,
      comments: commentsByShareKey.get(`${share.contact_id}:${share.decision_id}`) ?? [],
    });
    recentSharesByContact.set(share.contact_id, bucket);
  }

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
      recentShares: recentSharesByContact.get(contact.id) ?? [],
    })),
    receivedInvites,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to save your counsel circle.");
  }

  await ensureCounselInviteAcceptanceSchema();

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
