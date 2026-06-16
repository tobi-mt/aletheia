import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { many } from "@/lib/db";
import { isPushConfigured } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type DiagnosticsRow = {
  id: string;
  endpoint: string;
  preferred_local_hour: number | null;
  preferred_timezone: string | null;
  timezone_mode: string | null;
  delivery_strategy: string | null;
  updated_at: string | null;
  last_sent_at: string | null;
  last_gratitude_sent_at: string | null;
  last_challenge_notified_at: string | null;
};

function parseTimestamp(value: string | null) {
  if (!value) {
    return null;
  }
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) {
    return null;
  }
  return ts;
}

function daysSince(value: string | null) {
  const ts = parseTimestamp(value);
  if (ts === null) {
    return null;
  }
  return Math.floor((Date.now() - ts) / 86400000);
}

function latestActivityAt(row: DiagnosticsRow) {
  const candidates = [
    parseTimestamp(row.last_sent_at),
    parseTimestamp(row.last_gratitude_sent_at),
    parseTimestamp(row.last_challenge_notified_at),
    parseTimestamp(row.updated_at),
  ].filter((value): value is number => value !== null);

  if (candidates.length === 0) {
    return null;
  }

  return new Date(Math.max(...candidates)).toISOString();
}

export async function GET() {
  if (!isPushConfigured()) {
    return apiError(503, "not_configured", "Notifications are not configured yet.");
  }

  try {
    const user = await requireUser();
    const rows = await many<DiagnosticsRow>(
      `SELECT id, endpoint, preferred_local_hour, preferred_timezone, timezone_mode, delivery_strategy,
              updated_at, last_sent_at, last_gratitude_sent_at, last_challenge_notified_at
       FROM push_subscriptions
       WHERE user_id = ? AND enabled = TRUE
       ORDER BY updated_at DESC`,
      user.id
    );

    const diagnostics = rows.map((row) => {
      const activityAt = latestActivityAt(row);
      const stale = activityAt ? daysSince(activityAt) !== null && (daysSince(activityAt) as number) > 7 : true;
      return {
        id: row.id,
        endpointHost: (() => {
          try {
            return new URL(row.endpoint).host;
          } catch {
            return "unknown";
          }
        })(),
        preferredLocalHour: row.preferred_local_hour ?? 8,
        preferredTimezone: row.preferred_timezone ?? "UTC",
        timezoneMode: row.timezone_mode === "manual" ? "manual" : "auto",
        deliveryStrategy: row.delivery_strategy ?? "morning",
        updatedAt: row.updated_at,
        lastSentAt: row.last_sent_at,
        lastGratitudeSentAt: row.last_gratitude_sent_at,
        lastChallengeNotifiedAt: row.last_challenge_notified_at,
        latestActivityAt: activityAt,
        daysSinceLastActivity: activityAt ? daysSince(activityAt) : null,
        stale,
      };
    });

    return NextResponse.json({
      configured: true,
      subscriptions: diagnostics.length,
      staleSubscriptions: diagnostics.filter((row) => row.stale).length,
      recommendedAction:
        diagnostics.length === 0
          ? "subscribe"
          : diagnostics.some((row) => row.stale)
            ? "resubscribe_or_send_test"
            : "none",
      diagnostics,
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to view notification diagnostics.");
  }
}
