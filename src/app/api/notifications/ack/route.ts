import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { apiError } from "@/lib/api-errors";

type NotificationKind = "counsel_decision_shared" | "challenge_circle_nudge" | "decision_followup" | "counsel_comment";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: true, acknowledged: false, reason: "not_signed_in" });
  }

  const body = (await request.json().catch(() => ({}))) as {
    notificationKind?: NotificationKind;
    notificationId?: string;
    senderUserId?: string;
    recipientUserId?: string;
    circleId?: string | null;
    contactId?: string | null;
    challengeId?: string | null;
  };

  const notificationKind = body.notificationKind;
  const notificationId = body.notificationId?.trim();
  if (
    notificationKind !== "counsel_decision_shared" &&
    notificationKind !== "challenge_circle_nudge" &&
    notificationKind !== "decision_followup" &&
    notificationKind !== "counsel_comment"
  ) {
    return apiError(400, "invalid_input", "Unsupported notification kind.");
  }
  if (!notificationId) {
    return apiError(400, "invalid_input", "Notification id is required.");
  }
  if (body.recipientUserId && body.recipientUserId !== user.id) {
    return NextResponse.json({ ok: true, acknowledged: false, reason: "recipient_mismatch" });
  }

  const now = new Date().toISOString();
  await run(
    `INSERT INTO notification_delivery_receipts (
       id, notification_kind, notification_id, sender_user_id, recipient_user_id,
       circle_id, contact_id, challenge_id, opened_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (notification_kind, notification_id, recipient_user_id)
     DO UPDATE SET
       opened_at = EXCLUDED.opened_at,
       updated_at = EXCLUDED.updated_at`,
    crypto.randomUUID(),
    notificationKind,
    notificationId,
    body.senderUserId?.trim() || user.id,
    user.id,
    body.circleId ?? null,
    body.contactId ?? null,
    body.challengeId ?? null,
    now,
    now,
    now
  );

  return NextResponse.json({ ok: true, acknowledged: true });
}
