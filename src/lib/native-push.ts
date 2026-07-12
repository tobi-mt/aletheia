import { createPrivateKey, createSign, randomUUID } from "node:crypto";
import http2 from "node:http2";
import { many, run } from "@/lib/db";

export type NativePushPlatform = "ios" | "android";

export type NativePushTargetRow = {
  id: string;
  user_id: string;
  platform: NativePushPlatform;
  token: string;
  enabled: boolean;
  device_name: string | null;
  app_version: string | null;
  build_version: string | null;
  push_environment: string | null;
  last_seen_at: string | null;
  last_registered_at: string | null;
  last_sent_at: string | null;
  badge_count: number;
  language: string | null;
  region: string | null;
  bible_translation: string | null;
  voice_enabled: boolean | null;
  counsel_notifications_enabled?: boolean | null;
  formation_notifications_enabled?: boolean | null;
  preferred_hour?: number | null;
  preferred_local_hour?: number | null;
  preferred_timezone?: string | null;
  delivery_strategy?: string | null;
  last_gratitude_sent_at?: string | null;
};

export type NativePushDeviceRegistrationInput = {
  platform: NativePushPlatform;
  token: string;
  deviceName?: string | null;
  appVersion?: string | null;
  buildVersion?: string | null;
  pushEnvironment?: string | null;
};

export type NativePushMessagePayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  notificationKind: string;
  notificationId: string;
  data?: Record<string, string | number | boolean | null | undefined>;
};

export type NativePushFailureSample = {
  id: string;
  userId: string;
  platform: NativePushPlatform;
  statusCode: number | null;
  reason: string;
  deleted: boolean;
};

type NativePushResult = {
  configured: boolean;
  attempted: number;
  sent: number;
  failed: number;
  failureSamples: NativePushFailureSample[];
};

type ApnsConfig = {
  teamId: string;
  keyId: string;
  privateKey: string;
  bundleId: string;
  environment: "development" | "production";
};

type FcmConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
};

type FcmTokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

let cachedFcmToken: FcmTokenCache | null = null;
let cachedApnsToken: { token: string; expiresAtMs: number } | null = null;

function trimEnv(value: string | undefined | null) {
  return value?.trim() ?? "";
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function parseJsonEnv<T>(value: string | undefined | null) {
  const trimmed = trimEnv(value);
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

function loadApnsConfig(): ApnsConfig | null {
  const teamId = trimEnv(process.env.NATIVE_PUSH_APNS_TEAM_ID);
  const keyId = trimEnv(process.env.NATIVE_PUSH_APNS_KEY_ID);
  const privateKey = trimEnv(process.env.NATIVE_PUSH_APNS_PRIVATE_KEY || process.env.NATIVE_PUSH_APNS_KEY_P8).replace(/\\n/g, "\n");
  const bundleId = trimEnv(process.env.NATIVE_PUSH_APNS_BUNDLE_ID);
  const environment = trimEnv(process.env.NATIVE_PUSH_APNS_ENVIRONMENT).toLowerCase() === "development" ? "development" : "production";

  if (!teamId || !keyId || !privateKey || !bundleId) {
    return null;
  }

  return {
    teamId,
    keyId,
    privateKey,
    bundleId,
    environment,
  };
}

function loadFcmConfig(): FcmConfig | null {
  const rawServiceAccount =
    trimEnv(process.env.NATIVE_PUSH_FCM_SERVICE_ACCOUNT_JSON) ||
    trimEnv(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  if (!rawServiceAccount) {
    return null;
  }

  const serviceAccount = parseJsonEnv<{
    project_id?: string;
    client_email?: string;
    private_key?: string;
    token_uri?: string;
  }>(rawServiceAccount);
  if (!serviceAccount?.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    return null;
  }

  return {
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key,
    tokenUri: serviceAccount.token_uri?.trim() || "https://oauth2.googleapis.com/token",
  };
}

export function getNativePushConfigStatus() {
  const apns = loadApnsConfig();
  const fcm = loadFcmConfig();
  return {
    configured: Boolean(apns || fcm),
    apnsConfigured: Boolean(apns),
    fcmConfigured: Boolean(fcm),
  };
}

export function isNativePushConfigured() {
  return getNativePushConfigStatus().configured;
}

export function isNativePushPlatformConfigured(platform: NativePushPlatform) {
  const status = getNativePushConfigStatus();
  return platform === "ios" ? status.apnsConfigured : status.fcmConfigured;
}

export async function registerNativePushDevice(userId: string, input: NativePushDeviceRegistrationInput) {
  const now = new Date().toISOString();
  const deviceId = randomUUID();

  await run(
    `INSERT INTO native_push_devices (
       id, user_id, platform, token, device_name, app_version, build_version, push_environment,
       enabled, last_seen_at, last_registered_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?)
     ON CONFLICT (token)
     DO UPDATE SET
       user_id = EXCLUDED.user_id,
       platform = EXCLUDED.platform,
       device_name = EXCLUDED.device_name,
       app_version = EXCLUDED.app_version,
       build_version = EXCLUDED.build_version,
       push_environment = EXCLUDED.push_environment,
       enabled = TRUE,
       last_seen_at = EXCLUDED.last_seen_at,
       last_registered_at = EXCLUDED.last_registered_at,
       updated_at = EXCLUDED.updated_at`,
    deviceId,
    userId,
    input.platform,
    input.token.trim(),
    input.deviceName?.trim().slice(0, 120) || null,
    input.appVersion?.trim().slice(0, 40) || null,
    input.buildVersion?.trim().slice(0, 40) || null,
    input.pushEnvironment?.trim().slice(0, 40) || null,
    now,
    now,
    now,
    now
  );

  return {
    ok: true,
    deviceId,
    registeredAt: now,
  };
}

export async function unregisterNativePushDevice(userId: string, token?: string | null) {
  const now = new Date().toISOString();
  if (token?.trim()) {
    await run(
      `DELETE FROM native_push_devices
       WHERE user_id = ? AND token = ?`,
      userId,
      token.trim()
    );
    return { ok: true, removedAll: false, updatedAt: now };
  }

  await run(
    `DELETE FROM native_push_devices
     WHERE user_id = ?`,
    userId
  );
  return { ok: true, removedAll: true, updatedAt: now };
}

export async function loadNativePushTargets(userIds: string[]) {
  if (!userIds.length) {
    return [];
  }

  return many<NativePushTargetRow>(
    `SELECT native_push_devices.id,
            native_push_devices.user_id,
            native_push_devices.platform,
            native_push_devices.token,
            native_push_devices.enabled,
            native_push_devices.device_name,
            native_push_devices.app_version,
            native_push_devices.build_version,
            native_push_devices.push_environment,
            native_push_devices.last_seen_at,
            native_push_devices.last_registered_at,
            native_push_devices.last_sent_at,
            native_push_devices.badge_count,
            user_preferences.language,
            user_preferences.region,
            user_preferences.bible_translation,
            user_preferences.voice_enabled,
            user_preferences.counsel_notifications_enabled,
            user_preferences.formation_notifications_enabled
     FROM native_push_devices
     LEFT JOIN user_preferences ON user_preferences.user_id = native_push_devices.user_id
     WHERE native_push_devices.user_id = ANY(?)`,
    userIds
  );
}

export async function loadEnabledNativePushTargets() {
  return many<NativePushTargetRow>(
    `SELECT native_push_devices.id,
            native_push_devices.user_id,
            native_push_devices.platform,
            native_push_devices.token,
            native_push_devices.enabled,
            native_push_devices.device_name,
            native_push_devices.app_version,
            native_push_devices.build_version,
            native_push_devices.push_environment,
            native_push_devices.last_seen_at,
            native_push_devices.last_registered_at,
            native_push_devices.last_sent_at,
            native_push_devices.badge_count,
            user_preferences.language,
            user_preferences.region,
            user_preferences.bible_translation,
            user_preferences.voice_enabled,
            user_preferences.counsel_notifications_enabled,
            user_preferences.formation_notifications_enabled,
            COALESCE(user_preferences.notification_preferred_local_hour, 8) AS preferred_hour,
            COALESCE(user_preferences.notification_preferred_local_hour, 8) AS preferred_local_hour,
            COALESCE(user_preferences.notification_preferred_timezone, 'UTC') AS preferred_timezone,
            COALESCE(user_preferences.notification_delivery_strategy, 'morning') AS delivery_strategy,
            NULL::TIMESTAMPTZ AS last_gratitude_sent_at
     FROM native_push_devices
     LEFT JOIN user_preferences ON user_preferences.user_id = native_push_devices.user_id
     WHERE native_push_devices.enabled = TRUE`
  );
}

async function updateNativePushFreshness(deviceId: string, deliveredAt: string, badgeCount: number) {
  await run(
    `UPDATE native_push_devices
     SET last_sent_at = ?,
         last_seen_at = ?,
         badge_count = ?,
         updated_at = ?
     WHERE id = ?`,
    deliveredAt,
    deliveredAt,
    badgeCount,
    deliveredAt,
    deviceId
  );
}

export async function clearNativePushBadge(userId: string) {
  const now = new Date().toISOString();
  await run(
    `UPDATE native_push_devices
     SET badge_count = 0, last_seen_at = ?, updated_at = ?
     WHERE user_id = ? AND enabled = TRUE`,
    now,
    now,
    userId
  );
  return { ok: true, badgeCount: 0 };
}

function stringifyFcmData(data: NativePushMessagePayload["data"]) {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(data ?? {})) {
    if (value === undefined) {
      continue;
    }
    output[key] = value === null ? "" : String(value);
  }
  return output;
}

function buildNativePayload(message: NativePushMessagePayload, row: NativePushTargetRow) {
  return {
    title: message.title,
    body: message.body,
    data: {
      ...(message.data ?? {}),
      url: message.url,
      tag: message.tag,
      notificationKind: message.notificationKind,
      notificationId: message.notificationId,
      platform: row.platform,
      deviceId: row.id,
    },
  };
}

function shouldDeleteBrokenNativeDevice(statusCode: number | null, reason: string) {
  if (statusCode === 404 || statusCode === 410) {
    return true;
  }
  const normalized = reason.toLowerCase();
  return (
    normalized.includes("unregistered") ||
    normalized.includes("baddevicetoken") ||
    normalized.includes("device token") ||
    normalized.includes("not registered") ||
    normalized.includes("registration-token-not-registered") ||
    normalized.includes("messaging/registration-token-not-registered")
  );
}

function apnsAuthToken(config: ApnsConfig) {
  const now = Date.now();
  if (cachedApnsToken && cachedApnsToken.expiresAtMs > now) {
    return cachedApnsToken.token;
  }

  const iat = Math.floor(now / 1000);
  const header = { alg: "ES256", kid: config.keyId };
  const payload = { iss: config.teamId, iat };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const privateKey = createPrivateKey(config.privateKey);
  // JWT ES256 uses the JOSE/P1363 representation (r || s), not OpenSSL's
  // default DER-encoded ECDSA signature. APNs rejects DER signatures with
  // InvalidProviderToken even when the key, team, topic, and device are valid.
  const signature = createSign("sha256").update(signingInput).sign({
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
  const token = `${signingInput}.${base64Url(signature)}`;
  cachedApnsToken = {
    token,
    expiresAtMs: now + 20 * 60 * 1000,
  };
  return token;
}

async function sendApnsNotification(row: NativePushTargetRow, message: NativePushMessagePayload) {
  const config = loadApnsConfig();
  if (!config) {
    throw new Error("APNs is not configured.");
  }

  const client = http2.connect(`https://${config.environment === "development" ? "api.sandbox.push.apple.com" : "api.push.apple.com"}`);
  const payload = buildNativePayload(message, row);
  const body = JSON.stringify({
    aps: {
      alert: {
        title: message.title,
        body: message.body,
      },
      sound: "default",
      badge: Math.min(99, Math.max(1, Number(row.badge_count ?? 0) + 1)),
    },
    ...payload.data,
  });
  const headers = {
    ":method": "POST",
    ":path": `/3/device/${row.token}`,
    authorization: `bearer ${apnsAuthToken(config)}`,
    "apns-topic": config.bundleId,
    "apns-push-type": "alert",
    "apns-priority": "10",
    "content-type": "application/json",
  };

  return new Promise<void>((resolve, reject) => {
    const request = client.request(headers);
    let responseStatus: number | null = null;
    let responseBody = "";

    request.on("response", (responseHeaders) => {
      responseStatus = Number(responseHeaders[":status"] ?? 0) || null;
    });
    request.on("data", (chunk) => {
      responseBody += chunk.toString("utf8");
    });
    request.on("end", () => {
      client.close();
      if (responseStatus && responseStatus >= 200 && responseStatus < 300) {
        resolve();
        return;
      }
      reject(new Error(`APNs push failed (${responseStatus ?? "n/a"}): ${responseBody || "unknown error"}`));
    });
    request.on("error", (error) => {
      client.close();
      reject(error);
    });
    request.end(body);
  });
}

async function fcmAccessToken(config: FcmConfig) {
  const now = Date.now();
  if (cachedFcmToken && cachedFcmToken.expiresAtMs > now) {
    return cachedFcmToken.accessToken;
  }

  const iat = Math.floor(now / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: config.clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: config.tokenUri,
    iat,
    exp: iat + 3600,
  };
  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const privateKey = createPrivateKey(config.privateKey);
  const signature = createSign("RSA-SHA256").update(signingInput).sign(privateKey);
  const assertion = `${signingInput}.${base64Url(signature)}`;

  const tokenResponse = await fetch(config.tokenUri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const payloadResponse = (await tokenResponse.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error?: string; error_description?: string }
    | null;

  if (!tokenResponse.ok || !payloadResponse?.access_token) {
    const reason = payloadResponse?.error_description || payloadResponse?.error || tokenResponse.statusText || "unknown error";
    throw new Error(`FCM access token request failed (${tokenResponse.status}): ${reason}`);
  }

  const expiresInSeconds = Number(payloadResponse.expires_in ?? 3600);
  cachedFcmToken = {
    accessToken: payloadResponse.access_token,
    expiresAtMs: now + Math.max(60, expiresInSeconds - 60) * 1000,
  };
  return payloadResponse.access_token;
}

async function sendFcmNotification(row: NativePushTargetRow, message: NativePushMessagePayload) {
  const config = loadFcmConfig();
  if (!config) {
    throw new Error("FCM is not configured.");
  }

  const accessToken = await fcmAccessToken(config);
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: row.token,
        notification: {
          title: message.title,
          body: message.body,
        },
        data: stringifyFcmData(buildNativePayload(message, row).data),
        android: {
          priority: "HIGH",
        },
      },
    }),
  });

  const responseBody = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(`FCM push failed (${response.status}): ${responseBody || "unknown error"}`);
  }
}

async function sendNativePush(row: NativePushTargetRow, message: NativePushMessagePayload) {
  if (row.platform === "ios") {
    return sendApnsNotification(row, message);
  }
  return sendFcmNotification(row, message);
}

function summarizeNativePushFailure(error: unknown, row: NativePushTargetRow, deleted: boolean): NativePushFailureSample {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown native push error");
  const statusCodeMatch = message.match(/\((\d{3})\)/);
  const statusCode = statusCodeMatch ? Number(statusCodeMatch[1]) : null;
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    statusCode,
    reason: message.replace(/\s+/g, " ").trim().slice(0, 240),
    deleted,
  };
}

export async function sendNativePushRows(
  rows: NativePushTargetRow[],
  payloadForRow: (row: NativePushTargetRow) => NativePushMessagePayload
): Promise<NativePushResult> {
  const configured = isNativePushConfigured();
  if (!configured) {
    return {
      configured,
      attempted: 0,
      sent: 0,
      failed: 0,
      failureSamples: [],
    };
  }
  if (!rows.length) {
    return {
      configured,
      attempted: 0,
      sent: 0,
      failed: 0,
      failureSamples: [],
    };
  }

  let sent = 0;
  let failed = 0;
  const failureSamples: NativePushFailureSample[] = [];

  await Promise.allSettled(
    rows.map(async (row) => {
      try {
        await sendNativePush(row, payloadForRow(row));
        const deliveredAt = new Date().toISOString();
        sent += 1;
        await updateNativePushFreshness(
          row.id,
          deliveredAt,
          row.platform === "ios" ? Math.min(99, Math.max(1, Number(row.badge_count ?? 0) + 1)) : Number(row.badge_count ?? 0)
        );
      } catch (error) {
        failed += 1;
        const reason = error instanceof Error ? error.message : String(error ?? "Unknown native push error");
        const statusCodeMatch = reason.match(/\((\d{3})\)/);
        const statusCode = statusCodeMatch ? Number(statusCodeMatch[1]) : null;
        const deleted = shouldDeleteBrokenNativeDevice(statusCode, reason);
        failureSamples.push(summarizeNativePushFailure(error, row, deleted));
        console.error("Native push delivery failed", {
          deviceId: row.id,
          userId: row.user_id,
          platform: row.platform,
          pushEnvironment: row.push_environment,
          statusCode,
          reason: reason.replace(/\s+/g, " ").trim().slice(0, 500),
          deleted,
        });
        if (deleted) {
          await run("DELETE FROM native_push_devices WHERE id = ?", row.id).catch(() => undefined);
        }
      }
    })
  );

  return {
    configured,
    attempted: rows.length,
    sent,
    failed,
    failureSamples,
  };
}
