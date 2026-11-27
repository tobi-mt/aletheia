import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { many } from "@/lib/db";
import { apiError } from "@/lib/api-errors";
import { pushTtlSeconds } from "@/lib/push-policy";

const defaultDeps = { getCurrentUser, many, now: () => new Date() };

export async function claimCounselAcceptanceNotification(deps = defaultDeps) {
  const user = await deps.getCurrentUser();
  if (!user) return apiError(401, "sign_in_required", "Sign in to view counsel notifications.");
  const now = deps.now();
  const cutoff = new Date(now.getTime() - pushTtlSeconds("counsel_invite_accepted") * 1000);
  // Claim only one fresh event. The account-scoped receipt survives reinstalls
  // and its unique constraint arbitrates concurrent devices.
  const notifications = await deps.many<{ id: string; name: string; acceptedAt: string }>(
    `WITH claimed AS (
       INSERT INTO notification_delivery_receipts (
         id, notification_kind, notification_id, sender_user_id, recipient_user_id,
         contact_id, opened_at, created_at, updated_at
       )
       SELECT 'counsel-acceptance:' || c.id || ':' || EXTRACT(EPOCH FROM c.accepted_at)::text,
              'counsel_invite_accepted', c.id || ':' || EXTRACT(EPOCH FROM c.accepted_at)::text,
              c.user_id, c.user_id, c.id, ?, ?, ?
       FROM counsel_contacts c
       WHERE c.user_id = ? AND c.invite_status = 'accepted'
         AND c.accepted_at >= ? AND c.accepted_at <= ?
         AND NOT EXISTS (
           SELECT 1 FROM notification_delivery_receipts r
           WHERE r.notification_kind = 'counsel_invite_accepted'
             AND r.notification_id = c.id || ':' || EXTRACT(EPOCH FROM c.accepted_at)::text
             AND r.recipient_user_id = c.user_id
         )
       ORDER BY c.accepted_at DESC, c.id
       LIMIT 1
       ON CONFLICT (notification_kind, notification_id, recipient_user_id) DO NOTHING
       RETURNING contact_id
     )
     SELECT c.id, c.name, c.accepted_at AS "acceptedAt"
     FROM counsel_contacts c JOIN claimed ON claimed.contact_id = c.id`,
    now.toISOString(), now.toISOString(), now.toISOString(), user.id, cutoff.toISOString(), now.toISOString(),
  );
  return NextResponse.json({ notifications });
}

export async function POST() {
  return claimCounselAcceptanceNotification();
}
