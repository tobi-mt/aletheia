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

const REQUEST_TIMEOUT_MS = Number(process.env.NOTIFICATION_REQUEST_TIMEOUT_MS ?? 30000);
const MAX_ATTEMPTS = Math.max(1, Number(process.env.NOTIFICATION_REQUEST_RETRIES ?? 3));
const BASE_RETRY_DELAY_MS = Number(process.env.NOTIFICATION_RETRY_DELAY_MS ?? 1500);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeErrorMessage(error) {
  if (!error || typeof error !== "object") {
    return String(error ?? "Unknown error");
  }

  const baseMessage = "message" in error ? String(error.message ?? "Unknown error") : "Unknown error";
  const cause = "cause" in error && error.cause && typeof error.cause === "object" ? error.cause : null;
  const code = cause && "code" in cause ? String(cause.code ?? "") : "";
  const reason = cause && "message" in cause ? String(cause.message ?? "") : "";

  if (code && reason) {
    return `${baseMessage} (${code}: ${reason})`;
  }
  if (code) {
    return `${baseMessage} (${code})`;
  }
  return baseMessage;
}

function isRetryableError(error) {
  if (!error || typeof error !== "object") {
    return false;
  }

  if (error.name === "AbortError") {
    return true;
  }

  const cause = "cause" in error && error.cause && typeof error.cause === "object" ? error.cause : null;
  const code = cause && "code" in cause ? String(cause.code ?? "") : "";
  return [
    "ECONNRESET",
    "ECONNREFUSED",
    "ENOTFOUND",
    "EAI_AGAIN",
    "ETIMEDOUT",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_BODY_TIMEOUT",
  ].includes(code);
}

function parseResultBody(body) {
  if (!body.trim()) {
    return null;
  }
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

async function requestDailyNotifications(attempt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(appUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    const body = await response.text();
    const result = parseResultBody(body);

    if (!response.ok) {
      const error = new Error(`Notification request failed with ${response.status}: ${body}`);
      const retryable = response.status >= 500 || response.status === 429;
      throw Object.assign(error, { retryable });
    }

    return { body, result };
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error(
        `Request timed out after ${REQUEST_TIMEOUT_MS}ms on attempt ${attempt}/${MAX_ATTEMPTS}. URL: ${appUrl}.`
      );
      throw Object.assign(timeoutError, { retryable: true });
    }

    const retryable =
      (typeof error === "object" && error && "retryable" in error && Boolean(error.retryable)) ||
      isRetryableError(error);
    throw Object.assign(new Error(normalizeErrorMessage(error)), { retryable });
  } finally {
    clearTimeout(timeoutId);
  }
}

try {
  let payload = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      payload = await requestDailyNotifications(attempt);
      break;
    } catch (error) {
      const retryable = typeof error === "object" && error && "retryable" in error && Boolean(error.retryable);
      const finalAttempt = attempt === MAX_ATTEMPTS;

      if (!retryable || finalAttempt) {
        throw error;
      }

      const delayMs = BASE_RETRY_DELAY_MS * attempt;
      console.warn(
        `Notification request attempt ${attempt}/${MAX_ATTEMPTS} failed (${error.message}). Retrying in ${delayMs}ms...`
      );
      await sleep(delayMs);
    }
  }

  const { body, result } = payload ?? { body: "", result: null };

  if (result && typeof result === "object") {
    const attempted = Number(result.attempted ?? 0);
    const sent = Number(result.sent ?? 0);
    const failed = Number(result.failed ?? 0);
    const skipped = Number(result.skipped ?? 0);
    const scanned = Number(result.scanned ?? 0);
    const hour = Number(result.hour ?? new Date().getUTCHours());
    const followupAttempted = Number(result.followupAttempted ?? 0);
    const followupDecisionsNotified = Number(result.followupDecisionsNotified ?? 0);
    console.log(
      `✓ Daily notifications checked. attempted=${attempted} sent=${sent} failed=${failed} skipped=${skipped} scanned=${scanned} utcHour=${hour} followupAttempted=${followupAttempted} followupDecisionsNotified=${followupDecisionsNotified}`
    );
    if (Array.isArray(result.failureSamples) && result.failureSamples.length) {
      console.log("Failure samples:");
      for (const sample of result.failureSamples) {
        console.log(
          `- subscription=${sample.id} user=${sample.userId} status=${sample.statusCode ?? "n/a"} deleted=${sample.deleted ? "yes" : "no"} reason=${sample.reason}`
        );
      }
    }
    if (attempted === 0) {
      console.log("No users were due in this hourly run.");
    }
  } else {
    console.log("✓ Daily notifications checked.");
    console.log(body.trim() || "Endpoint returned an empty response body.");
  }
} catch (error) {
  throw new Error(`Failed to send notifications after ${MAX_ATTEMPTS} attempt(s): ${normalizeErrorMessage(error)}`);
}
