export async function getCurrentUser() {
  return null;
}

export async function requireUser() {
  return null;
}

export async function ensureCounselInviteAcceptanceSchema() {}

export function hashCounselInviteToken(token) {
  return token;
}

export async function one() {
  return null;
}

export async function many() {
  return [];
}

export async function run() {}

export function getVapidKeyPairStatus() {
  return {
    configured: true,
    keyPairValid: true,
    reason: "ok",
  };
}

export function getVapidPublicKey() {
  return "public-key";
}

export function isPushConfigured() {
  return true;
}

export async function sendCounselCommentNotifications() {
  return { configured: false, attempted: 0, sent: 0, failed: 0, failureSamples: [] };
}

export async function recordDailyNotificationUnauthorizedHit() {}

export async function claimNotificationCronWindow() {
  return { claimed: true, windowKey: "test-window" };
}

export async function completeNotificationCronWindow() {}

export async function sendPendingDecisionNotifications() {
  return {
    attempted: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    processed: 0,
    failureSamples: [],
  };
}

export async function sendDailyWisdomNotifications() {
  return {
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    scanned: 0,
    hour: 0,
    followupAttempted: 0,
    followupSent: 0,
    followupFailed: 0,
    followupDecisionsNotified: 0,
    gratitudeAttempted: 0,
    gratitudeSent: 0,
    gratitudeFailed: 0,
    failureSamples: [],
  };
}

export async function sendChallengeReminders() {
  return { attempted: 0, sent: 0, failed: 0, suggested: 0 };
}

export async function trackEvent() {}

export async function analyticsSummary() {
  return {};
}
