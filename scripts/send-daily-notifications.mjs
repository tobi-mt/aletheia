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

console.log(`Sending daily notifications to: ${appUrl}`);

// Create an AbortController with timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

try {
  const response = await fetch(appUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Notification request failed with ${response.status}: ${body}`);
  }

  console.log("✓ Daily notifications sent successfully");
  console.log(body);
} catch (error) {
  clearTimeout(timeoutId);
  
  if (error.name === 'AbortError') {
    throw new Error(`Request timed out after 30 seconds. URL: ${appUrl}. Check if the server is running and reachable.`);
  }
  
  throw new Error(`Failed to send notifications: ${error.message}`);
}
