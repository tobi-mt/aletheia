import assert from "node:assert/strict";
import test from "node:test";
import webpush from "web-push";
import { postSharedDecisionComment } from "../src/app/api/counsel/shared/[sharedDecisionId]/comments/route.ts";
import { postInviteComment } from "../src/app/api/counsel/invite/[token]/comments/route.ts";
import { postAcceptanceComment } from "../src/app/api/counsel/acceptances/[contactId]/comments/route.ts";
import { getNotificationDiagnosticsRoute } from "../src/app/api/notifications/diagnostics/route.ts";
import { getNotificationDeliveryReportRoute } from "../src/app/api/analytics/notification-delivery-report/route.ts";
import { getAnalyticsSummaryRoute } from "../src/app/api/analytics/summary/route.ts";
import { postNotificationSubscription } from "../src/app/api/notifications/subscribe/route.ts";
import { runDailyNotifications } from "../src/app/api/notifications/daily/route.ts";
import { buildNotificationUrl, parseNotificationLaunchUrl } from "../src/lib/notification-routing.ts";
import { calculatePushRetryDelayMs, sendNotificationWithRetry } from "../src/lib/notifications.ts";

function createCallLog() {
  return {
    runs: [],
    oneCalls: [],
    manyCalls: [],
    notifications: [],
    events: [],
    unauthorizedHits: 0,
  };
}

function jsonRequest(url, body) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("shared decision comment route saves the comment and notifies the accepted counselors", async () => {
  const calls = createCallLog();
  const deps = {
    getCurrentUser: async () => ({ id: "user-1", name: "Jordan", email: "jordan@example.com", avatarUrl: null, loginCount: 1, lastSeenAt: null, createdAt: "2026-07-01T00:00:00.000Z" }),
    ensureCounselInviteAcceptanceSchema: async () => undefined,
    one: async (sql, ...params) => {
      calls.oneCalls.push({ sql, params });
      if (sql.includes("FROM counsel_shared_decisions")) {
        return { id: "shared-1", contact_id: "contact-1", decision_id: "decision-1" };
      }
      return null;
    },
    many: async (sql, ...params) => {
      calls.manyCalls.push({ sql, params });
      return [{ recipient_user_id: "recipient-1" }, { recipient_user_id: "recipient-2" }];
    },
    run: async (sql, ...params) => {
      calls.runs.push({ sql, params });
    },
    sendCounselCommentNotifications: async (input) => {
      calls.notifications.push(input);
      return { configured: true, attempted: 2, sent: 2, failed: 0, failureSamples: [] };
    },
    now: () => new Date("2026-07-07T10:00:00.000Z"),
    randomUUID: () => "comment-shared-1",
  };

  const response = await postSharedDecisionComment(
    jsonRequest("http://localhost/api/counsel/shared/shared-1/comments", { body: "  Please pray with me.  " }),
    "shared-1",
    deps
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    comment: {
      id: "comment-shared-1",
      body: "Please pray with me.",
      createdAt: "2026-07-07T10:00:00.000Z",
      acceptanceId: null,
    },
  });
  assert.equal(calls.runs.length, 1);
  assert.match(calls.runs[0].sql, /INSERT INTO counsel_comments/);
  assert.deepEqual(calls.notifications[0], {
    notificationId: "comment-shared-1",
    sharedDecisionId: "shared-1",
    contactId: "contact-1",
    decisionId: "decision-1",
    senderUserId: "user-1",
    senderName: "Jordan",
    body: "Please pray with me.",
    targetUserIds: ["recipient-1", "recipient-2"],
    surface: "incoming",
  });
});

test("invite comment route saves the comment and notifies the decision owner", async () => {
  const calls = createCallLog();
  const deps = {
    getCurrentUser: async () => ({ id: "recipient-1", name: "Taylor", email: "taylor@example.com", avatarUrl: null, loginCount: 1, lastSeenAt: null, createdAt: "2026-07-01T00:00:00.000Z" }),
    ensureCounselInviteAcceptanceSchema: async () => undefined,
    one: async (sql, ...params) => {
      calls.oneCalls.push({ sql, params });
      if (sql.includes("FROM counsel_contacts") && sql.includes("invite_token_hash")) {
        return { id: "contact-1", invite_status: "accepted", can_comment_on_decisions: true };
      }
      if (sql.includes("FROM counsel_shared_decisions")) {
        return { id: "shared-1", user_id: "owner-1", decision_id: "decision-1" };
      }
      if (sql.includes("FROM counsel_invite_acceptances")) {
        return { id: "acceptance-1", contact_id: "contact-1", recipient_user_id: "recipient-1" };
      }
      return null;
    },
    run: async (sql, ...params) => {
      calls.runs.push({ sql, params });
    },
    sendCounselCommentNotifications: async (input) => {
      calls.notifications.push(input);
      return { configured: true, attempted: 1, sent: 1, failed: 0, failureSamples: [] };
    },
    now: () => new Date("2026-07-07T11:00:00.000Z"),
    randomUUID: () => "comment-invite-1",
  };

  const response = await postInviteComment(
    jsonRequest("http://localhost/api/counsel/invite/token/comments", { decisionId: "decision-1", body: " I agree with this nudge " }),
    "token",
    deps
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    comment: {
      id: "comment-invite-1",
      body: "I agree with this nudge",
      createdAt: "2026-07-07T11:00:00.000Z",
      acceptanceId: "acceptance-1",
    },
  });
  assert.equal(calls.runs.length, 1);
  assert.deepEqual(calls.notifications[0], {
    notificationId: "comment-invite-1",
    sharedDecisionId: "shared-1",
    contactId: "contact-1",
    decisionId: "decision-1",
    senderUserId: "recipient-1",
    senderName: "Taylor",
    body: "I agree with this nudge",
    targetUserIds: ["owner-1"],
    surface: "outgoing",
  });
});

test("acceptance comment route saves the comment and notifies the decision owner", async () => {
  const calls = createCallLog();
  const deps = {
    getCurrentUser: async () => ({ id: "recipient-1", name: "Taylor", email: "taylor@example.com", avatarUrl: null, loginCount: 1, lastSeenAt: null, createdAt: "2026-07-01T00:00:00.000Z" }),
    ensureCounselInviteAcceptanceSchema: async () => undefined,
    one: async (sql, ...params) => {
      calls.oneCalls.push({ sql, params });
      if (sql.includes("FROM counsel_contacts")) {
        return { id: "contact-1", invite_status: "accepted", can_comment_on_decisions: true };
      }
      if (sql.includes("FROM counsel_invite_acceptances")) {
        return { id: "acceptance-1", contact_id: "contact-1", recipient_user_id: "recipient-1" };
      }
      if (sql.includes("FROM counsel_shared_decisions")) {
        return { id: "shared-1", user_id: "owner-1", decision_id: "decision-1" };
      }
      return null;
    },
    run: async (sql, ...params) => {
      calls.runs.push({ sql, params });
    },
    sendCounselCommentNotifications: async (input) => {
      calls.notifications.push(input);
      return { configured: true, attempted: 1, sent: 1, failed: 0, failureSamples: [] };
    },
    now: () => new Date("2026-07-07T12:00:00.000Z"),
    randomUUID: () => "comment-acceptance-1",
  };

  const response = await postAcceptanceComment(
    jsonRequest("http://localhost/api/counsel/acceptances/contact-1/comments", { decisionId: "decision-1", body: " Thanks, this helps. " }),
    "contact-1",
    deps
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    comment: {
      id: "comment-acceptance-1",
      body: "Thanks, this helps.",
      createdAt: "2026-07-07T12:00:00.000Z",
      acceptanceId: "acceptance-1",
    },
  });
  assert.equal(calls.runs.length, 1);
  assert.deepEqual(calls.notifications[0], {
    notificationId: "comment-acceptance-1",
    sharedDecisionId: "shared-1",
    contactId: "contact-1",
    decisionId: "decision-1",
    senderUserId: "recipient-1",
    senderName: "Taylor",
    body: "Thanks, this helps.",
    targetUserIds: ["owner-1"],
    surface: "outgoing",
  });
});

test("notification routing helper builds the right deep links for push launches", () => {
  assert.equal(
    buildNotificationUrl({
      notificationKind: "daily_wisdom",
      notificationId: "daily-1",
      focus: "today",
    }),
    "/?source=notification&notificationKind=daily_wisdom&notificationId=daily-1&focus=today"
  );

  assert.equal(
    buildNotificationUrl({
      notificationKind: "counsel_comment",
      notificationId: "comment-1",
      focus: "decision",
      decisionId: "decision-1",
      sharedDecisionId: "shared-1",
      contactId: "contact-1",
      surface: "outgoing",
      open: "comment",
      tab: "decisions",
      section: "share",
    }),
    "/?source=notification&notificationKind=counsel_comment&notificationId=comment-1&focus=decision&decisionId=decision-1&sharedDecisionId=shared-1&contactId=contact-1&tab=decisions&section=share&open=comment&surface=outgoing"
  );

  assert.deepEqual(
    parseNotificationLaunchUrl("https://aletheia.example/?source=notification&focus=challenge&challenge=challenge-1&section=nudges&tab=reflect&notificationKind=challenge_circle_nudge"),
    {
      notificationKind: "challenge_circle_nudge",
      notificationId: null,
      focus: "challenge",
      decisionId: null,
      sharedDecisionId: null,
      contactId: null,
      circleId: null,
      challengeId: "challenge-1",
      nudgeId: null,
      surface: null,
      open: null,
      section: "nudges",
      tab: "reflect",
    }
  );
});

test("daily notification cron sends pending decisions before the other jobs", async () => {
  const calls = createCallLog();
  const sequence = [];
  const deps = {
    recordDailyNotificationUnauthorizedHit: async () => {
      calls.unauthorizedHits += 1;
    },
    sendPendingDecisionNotifications: async (now) => {
      sequence.push(`decision:${now.toISOString()}`);
      return {
        attempted: 2,
        sent: 1,
        failed: 0,
        pending: 2,
        processed: 1,
        failureSamples: [],
      };
    },
    sendDailyWisdomNotifications: async (now) => {
      sequence.push(`wisdom:${now.toISOString()}`);
      return {
        attempted: 3,
        sent: 3,
        failed: 0,
        skipped: 0,
        scanned: 5,
        hour: 9,
        followupAttempted: 0,
        followupSent: 0,
        followupFailed: 0,
        followupDecisionsNotified: 0,
        gratitudeAttempted: 0,
        gratitudeSent: 0,
        gratitudeFailed: 0,
        failureSamples: [],
      };
    },
    sendChallengeReminders: async (now) => {
      sequence.push(`challenge:${now.toISOString()}`);
      return { attempted: 4, sent: 2, failed: 0, suggested: 1 };
    },
    trackEvent: async (event) => {
      calls.events.push(event);
    },
    claimNotificationCronWindow: async () => ({ claimed: true, windowKey: "2026-07-07T09" }),
    completeNotificationCronWindow: async (windowKey) => {
      sequence.push(`complete:${windowKey}`);
    },
    now: () => new Date("2026-07-07T09:30:00.000Z"),
  };

  const previousSecret = process.env.NOTIFICATION_CRON_SECRET;
  process.env.NOTIFICATION_CRON_SECRET = "cron-secret";
  try {
    const response = await runDailyNotifications(
      new Request("http://localhost/api/notifications/daily?secret=cron-secret"),
      deps
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      attempted: 3,
      sent: 3,
      failed: 0,
      skipped: 0,
      scanned: 5,
      hour: 9,
      followupAttempted: 0,
      followupSent: 0,
      followupFailed: 0,
      followupDecisionsNotified: 0,
      gratitudeAttempted: 0,
      gratitudeSent: 0,
      gratitudeFailed: 0,
      failureSamples: [],
      decisionResult: {
        attempted: 2,
        sent: 1,
        failed: 0,
        pending: 2,
        processed: 1,
        failureSamples: [],
      },
      challengeResult: { attempted: 4, sent: 2, failed: 0, suggested: 1 },
    });

    assert.deepEqual(sequence, [
      "decision:2026-07-07T09:30:00.000Z",
      "wisdom:2026-07-07T09:30:00.000Z",
      "challenge:2026-07-07T09:30:00.000Z",
      "complete:2026-07-07T09",
    ]);
    assert.equal(calls.events.length, 1);
    assert.equal(calls.events[0].eventName, "notification_daily_checked");
    assert.equal(calls.events[0].metadata.decisionAttempted, 2);
  } finally {
    process.env.NOTIFICATION_CRON_SECRET = previousSecret;
  }
});

test("daily notification cron skips an already claimed hourly window", async () => {
  const calls = createCallLog();
  const deps = {
    recordDailyNotificationUnauthorizedHit: async () => {
      calls.unauthorizedHits += 1;
    },
    claimNotificationCronWindow: async () => ({ claimed: false, windowKey: "2026-07-07T09" }),
    completeNotificationCronWindow: async () => {
      assert.fail("a skipped window must not be completed twice");
    },
    sendPendingDecisionNotifications: async () => {
      assert.fail("duplicate cron runs must not send decision notifications");
    },
    sendDailyWisdomNotifications: async () => {
      assert.fail("duplicate cron runs must not send daily notifications");
    },
    sendChallengeReminders: async () => {
      assert.fail("duplicate cron runs must not send challenge notifications");
    },
    trackEvent: async (event) => {
      calls.events.push(event);
    },
    now: () => new Date("2026-07-07T09:45:00.000Z"),
  };

  const previousSecret = process.env.NOTIFICATION_CRON_SECRET;
  process.env.NOTIFICATION_CRON_SECRET = "cron-secret";
  try {
    const response = await runDailyNotifications(
      new Request("http://localhost/api/notifications/daily?secret=cron-secret"),
      deps
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      skippedDuplicateRun: true,
      windowKey: "2026-07-07T09",
    });
    assert.equal(calls.events.length, 0);
  } finally {
    process.env.NOTIFICATION_CRON_SECRET = previousSecret;
  }
});

test("notification diagnostics exposes freshness and refresh due for active subscriptions", async () => {
  const calls = createCallLog();
  const deps = {
    getAdminSecret: () => "analytics-secret",
    requireUser: async () => {
      throw new Error("admin diagnostics should not require a user");
    },
    many: async (sql) => {
      calls.manyCalls.push({ sql });
      return [
        {
          id: "sub-1",
          endpoint: "https://push.example.test/endpoint",
          preferred_local_hour: 8,
          preferred_timezone: "Europe/Berlin",
          timezone_mode: "auto",
          delivery_strategy: "morning",
          updated_at: "2026-07-06T09:00:00.000Z",
          last_sent_at: "2026-07-06T08:30:00.000Z",
          last_gratitude_sent_at: null,
          last_challenge_notified_at: null,
        },
      ];
    },
    one: async (sql) => {
      calls.oneCalls.push({ sql });
      return { created_at: "2026-07-07T08:55:00.000Z" };
    },
    getVapidKeyPairStatus: () => ({ configured: true, keyPairValid: true, reason: "ok" }),
    getVapidPublicKey: () => "public-key",
    isPushConfigured: () => true,
    now: () => new Date("2026-07-07T09:30:00.000Z"),
  };

  const response = await getNotificationDiagnosticsRoute(
    new Request("http://localhost/api/notifications/diagnostics", {
      headers: { authorization: "Bearer analytics-secret" },
    }),
    deps
  );

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.account.subscriptions, 1);
  assert.equal(data.account.refreshDueSubscriptions, 1);
  assert.equal(data.account.recommendedAction, "resubscribe_or_send_test");
  assert.deepEqual(data.account.diagnostics[0], {
    id: "sub-1",
    endpointHost: "push.example.test",
    preferredLocalHour: 8,
    preferredTimezone: "Europe/Berlin",
    timezoneMode: "auto",
    deliveryStrategy: "morning",
    updatedAt: "2026-07-06T09:00:00.000Z",
    lastSentAt: "2026-07-06T08:30:00.000Z",
    lastGratitudeSentAt: null,
    lastChallengeNotifiedAt: null,
    lastRefreshedAt: "2026-07-06T09:00:00.000Z",
    refreshDueAt: "2026-07-07T09:00:00.000Z",
    refreshDue: true,
    refreshDueMinutes: -30,
    latestActivityAt: "2026-07-06T09:00:00.000Z",
    daysSinceLastActivity: 1,
    stale: false,
    skipReason: null,
  });
});

test("notification delivery report route forwards the lookback window to the report helper", async () => {
  const calls = createCallLog();
  const deps = {
    getAdminSecret: () => "analytics-secret",
    getNotificationDeliveryReport: async (lookbackDays) => {
      calls.events.push({ lookbackDays });
      return {
        generatedAt: "2026-07-07T00:00:00.000Z",
        lookbackDays,
        vapid: {
          configured: true,
          keyPairValid: true,
          reason: "ok",
        },
        summary: {
          totalUsers: 1,
          usersWithActiveSubscriptions: 1,
          usersWithoutActiveSubscriptions: 0,
          usersBeforeWindow: 0,
          usersAlreadySentToday: 0,
          usersWithNoRecipientRow: 0,
          usersWithPushEndpointRejected: 0,
          usersWithVapidFailure: 0,
          usersWithRefreshDue: 0,
          usersWithIssues: 0,
        },
        rows: [],
      };
    },
  };

  const response = await getNotificationDeliveryReportRoute(
    new Request("http://localhost/api/analytics/notification-delivery-report?lookbackDays=14", {
      headers: { Authorization: "Bearer analytics-secret" },
    }),
    deps
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    generatedAt: "2026-07-07T00:00:00.000Z",
    lookbackDays: 14,
    vapid: {
      configured: true,
      keyPairValid: true,
      reason: "ok",
    },
    summary: {
      totalUsers: 1,
      usersWithActiveSubscriptions: 1,
      usersWithoutActiveSubscriptions: 0,
      usersBeforeWindow: 0,
      usersAlreadySentToday: 0,
      usersWithNoRecipientRow: 0,
      usersWithPushEndpointRejected: 0,
      usersWithVapidFailure: 0,
      usersWithRefreshDue: 0,
      usersWithIssues: 0,
    },
    rows: [],
  });
  assert.deepEqual(calls.events, [{ lookbackDays: 14 }]);
});

test("analytics summary route forwards notification sync failure causes and filters", async () => {
  const calls = createCallLog();
  const previousSecret = process.env.ANALYTICS_ADMIN_SECRET;
  process.env.ANALYTICS_ADMIN_SECRET = "analytics-secret";
  try {
    const response = await getAnalyticsSummaryRoute(
      new Request("http://localhost/api/analytics/summary?includeAutomation=1&startDate=2026-06-01&endDate=2026-06-30", {
        headers: { Authorization: "Bearer analytics-secret" },
      }),
      {
        analyticsSummary: async (options) => {
          calls.events.push(options);
          return {
            overview: {},
            features30d: [],
            usageTrends: { daily: [], weekly: [], monthly: [], yearly: [] },
            featureUsageTrends: { daily: [], weekly: [], monthly: [], yearly: [] },
            topScreens30d: [],
            funnel30d: [],
            retentionWeekly: [],
            retentionMonthly: [],
            cohortBreakdowns: { weekly: [], monthly: [] },
            notificationDeliveryReport: null,
            notificationSyncFailuresByCause: [
              { cause: "save_failed", count: 3, unique_people: 2 },
            ],
            notificationSyncFailureTrend: [
              { day: "2026-06-01", cause: "save_failed", count: 1, total_count: 1 },
            ],
            selectedRange: { startDate: "2026-06-01", endDate: "2026-06-30" },
            generatedAt: "2026-07-07T00:00:00.000Z",
          };
        },
      }
    );

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.config.geo_enrichment_enabled, false);
    assert.equal(data.notificationSyncFailuresByCause[0].cause, "save_failed");
    assert.equal(data.notificationSyncFailureTrend[0].cause, "save_failed");
    assert.equal(typeof data.generatedAt, "string");
    assert.deepEqual(calls.events, [
      {
        includeAutomation: true,
        startDate: "2026-06-01",
        endDate: "2026-06-30",
      },
    ]);
  } finally {
    process.env.ANALYTICS_ADMIN_SECRET = previousSecret;
  }
});

test("notification subscribe route returns sign-in required when the session is missing", async () => {
  const response = await postNotificationSubscription(
    jsonRequest("http://localhost/api/notifications/subscribe", {
      subscription: {
        endpoint: "https://push.example.test/endpoint",
        keys: {
          p256dh: "p256dh",
          auth: "auth",
        },
      },
    }),
    {
      isPushConfigured: () => true,
      requireUser: async () => {
        throw new Error("UNAUTHORIZED");
      },
      readJsonBody: async () => ({ ok: true, data: {} }),
      headers: async () => new Headers(),
      run: async () => {
        throw new Error("should not run");
      },
      consoleError: () => undefined,
    }
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    errorCode: "sign_in_required",
    error: "Sign in to enable notifications.",
  });
});

test("notification subscribe route returns save_failed when the database write throws", async () => {
  const response = await postNotificationSubscription(
    jsonRequest("http://localhost/api/notifications/subscribe", {
      subscription: {
        endpoint: "https://push.example.test/endpoint",
        keys: {
          p256dh: "p256dh",
          auth: "auth",
        },
      },
      preferredHour: 8,
      preferredLocalHour: 8,
      preferredTimezone: "Europe/Berlin",
      timezoneMode: "auto",
      deliveryStrategy: "morning",
    }),
    {
      isPushConfigured: () => true,
      requireUser: async () => ({
        id: "user-1",
        name: "Jordan",
        email: "jordan@example.com",
        avatarUrl: null,
        loginCount: 1,
        lastSeenAt: null,
        createdAt: "2026-07-01T00:00:00.000Z",
      }),
      readJsonBody: async () => ({
        ok: true,
        data: {
          subscription: {
            endpoint: "https://push.example.test/endpoint",
            keys: {
              p256dh: "p256dh",
              auth: "auth",
            },
          },
          preferredHour: 8,
          preferredLocalHour: 8,
          preferredTimezone: "Europe/Berlin",
          timezoneMode: "auto",
          deliveryStrategy: "morning",
        },
      }),
      headers: async () => new Headers({ "user-agent": "Mozilla/5.0" }),
      run: async () => {
        throw new Error("database unavailable");
      },
      consoleError: () => undefined,
    }
  );

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    errorCode: "save_failed",
    error: "Notification subscription could not be saved.",
  });
});

test("notification subscribe route marks subscriptions as freshly verified on save", async () => {
  const calls = createCallLog();
  const response = await postNotificationSubscription(
    jsonRequest("http://localhost/api/notifications/subscribe", {
      subscription: {
        endpoint: "https://push.example.test/endpoint",
        keys: {
          p256dh: "p256dh",
          auth: "auth",
        },
      },
      preferredHour: 9,
      preferredLocalHour: 10,
      preferredTimezone: "Europe/Berlin",
      timezoneMode: "manual",
      deliveryStrategy: "evening",
    }),
    {
      isPushConfigured: () => true,
      requireUser: async () => ({
        id: "user-1",
        name: "Jordan",
        email: "jordan@example.com",
        avatarUrl: null,
        loginCount: 1,
        lastSeenAt: null,
        createdAt: "2026-07-01T00:00:00.000Z",
      }),
      readJsonBody: async () => ({
        ok: true,
        data: {
          subscription: {
            endpoint: "https://push.example.test/endpoint",
            keys: {
              p256dh: "p256dh",
              auth: "auth",
            },
          },
          preferredHour: 9,
          preferredLocalHour: 10,
          preferredTimezone: "Europe/Berlin",
          timezoneMode: "manual",
          deliveryStrategy: "evening",
        },
      }),
      headers: async () => new Headers({ "user-agent": "Mozilla/5.0" }),
      run: async (sql, ...params) => {
        calls.runs.push({ sql, params });
      },
      consoleError: () => undefined,
    }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(calls.runs.length, 3);
  assert.doesNotMatch(calls.runs[0].sql, /last_verified_at/);
  assert.equal(calls.runs[0].params.at(-3), "evening");
  assert.equal(calls.runs[0].params.at(-2), calls.runs[0].params.at(-1));
});

test("push notification retry helper uses exponential backoff and retries transient failures", async () => {
  const originalRandom = Math.random;
  const originalSetTimeout = globalThis.setTimeout;
  const originalSendNotification = webpush.sendNotification;
  const delays = [];
  let calls = 0;

  Math.random = () => 0.5;
  globalThis.setTimeout = ((callback, delay, ...args) => {
    delays.push(delay);
    return originalSetTimeout(callback, 0, ...args);
  });
  webpush.sendNotification = async () => {
    calls += 1;
    if (calls === 1) {
      throw new Error("timeout");
    }
    return undefined;
  };

  try {
    assert.equal(calculatePushRetryDelayMs(0), 800);
    assert.equal(calculatePushRetryDelayMs(1), 800);
    assert.equal(calculatePushRetryDelayMs(2), 1600);

    await sendNotificationWithRetry(
      {
        endpoint: "https://push.example.test/endpoint",
        keys: {
          p256dh: "p256dh",
          auth: "auth",
        },
      },
      "{\"title\":\"Retry test\"}"
    );

    assert.equal(calls, 2);
    assert.ok(delays.includes(800));
  } finally {
    Math.random = originalRandom;
    globalThis.setTimeout = originalSetTimeout;
    webpush.sendNotification = originalSendNotification;
  }
});
