import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { getNotificationDeliveryReport } from "@/lib/notification-delivery-report";

export const dynamic = "force-dynamic";

export type NotificationDeliveryReportRouteDeps = {
  getNotificationDeliveryReport: typeof getNotificationDeliveryReport;
  getAdminSecret: () => string | undefined;
};

export const notificationDeliveryReportRouteDeps: NotificationDeliveryReportRouteDeps = {
  getNotificationDeliveryReport,
  getAdminSecret: () => process.env.ANALYTICS_ADMIN_SECRET,
};

export async function getNotificationDeliveryReportRoute(
  request: Request,
  deps: NotificationDeliveryReportRouteDeps = notificationDeliveryReportRouteDeps
) {
  const secret = deps.getAdminSecret();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!secret || token !== secret) {
    return apiError(401, "permission_denied", "Unauthorized");
  }

  const url = new URL(request.url);
  const lookbackDays = Number(url.searchParams.get("lookbackDays") ?? "30");
  const report = await deps.getNotificationDeliveryReport(lookbackDays);

  return NextResponse.json(report);
}

export async function GET(request: Request) {
  return getNotificationDeliveryReportRoute(request);
}
