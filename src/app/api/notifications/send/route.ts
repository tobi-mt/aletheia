"use server";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { getPendingNotifications, markNotificationSent } from "@/lib/notification-sequencing";
import { run } from "@/lib/db";

/**
 * Internal endpoint to send pending notifications
 * Called by cron job or background task
 * Returns how many notifications were sent
 */
export async function GET(request: Request) {
  // Verify this is an internal/cron request with proper auth
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return apiError(401, "permission_denied", "Invalid or missing CRON_SECRET");
  }

  try {
    const pending = await getPendingNotifications();
    let sentCount = 0;

    for (const notification of pending) {
      const { id, decision_id, user_id, day, title, body } = notification;

      // Here you would integrate with your push notification provider:
      // - Firebase Cloud Messaging (FCM) for Android
      // - Apple Push Notification service (APNs) for iOS
      // - Or a service like OneSignal, Expo, etc.
      
      // For now, we'll just mark as sent and log
      console.log(`[Notification] ${title}: ${body}`);

      try {
        await markNotificationSent(id, decision_id, user_id, day);
        sentCount++;
      } catch (error) {
        console.error(`Failed to mark notification ${id} as sent:`, error);
        // Mark as failed
        await run(
          `UPDATE notification_schedules SET status = ? WHERE id = ?`,
          "failed",
          id
        );
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      totalPending: pending.length,
    });
  } catch (error) {
    console.error("[Notification Send Error]", error);
    return apiError(500, "unavailable", "Failed to send notifications");
  }
}
