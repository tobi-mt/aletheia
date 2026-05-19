const secret = process.env.NOTIFICATION_CRON_SECRET;
const appUrl = process.env.NOTIFICATION_DAILY_URL
  ?? (process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/notifications/daily`
    : "");

if (!secret) {
  throw new Error("NOTIFICATION_CRON_SECRET is required.");
}

if (!appUrl) {
  throw new Error("Set NOTIFICATION_DAILY_URL or NEXT_PUBLIC_APP_URL.");
}

const response = await fetch(appUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
  },
});

const body = await response.text();

if (!response.ok) {
  throw new Error(`Notification request failed with ${response.status}: ${body}`);
}

console.log(body);
