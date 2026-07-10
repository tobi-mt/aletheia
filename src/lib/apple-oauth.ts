import { createCipheriv, createDecipheriv, createHash, createPrivateKey, randomBytes, sign } from "node:crypto";
import { many, run } from "@/lib/db";

const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
const APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke";

function appleConfig() {
  const teamId = process.env.AUTH_APPLE_TEAM_ID?.trim();
  const keyId = process.env.AUTH_APPLE_KEY_ID?.trim();
  const clientId = process.env.AUTH_APPLE_AUDIENCE?.trim() || "com.tobi.aletheia.app";
  const privateKey = process.env.AUTH_APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!teamId || !keyId || !privateKey) {
    throw new Error("Apple OAuth credentials are not configured.");
  }
  return { teamId, keyId, clientId, privateKey };
}

function base64url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createAppleClientSecret() {
  const config = appleConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url({ alg: "ES256", kid: config.keyId });
  const payload = base64url({
    iss: config.teamId,
    iat: now,
    exp: now + 5 * 60,
    aud: "https://appleid.apple.com",
    sub: config.clientId,
  });
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
    key: createPrivateKey(config.privateKey),
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");
  return { clientId: config.clientId, clientSecret: `${header}.${payload}.${signature}` };
}

function encryptionKey() {
  const secret = process.env.AUTH_APPLE_TOKEN_ENCRYPTION_KEY?.trim() || process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) throw new Error("Apple token encryption is not configured.");
  return createHash("sha256").update(secret).digest();
}

function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((value) => value.toString("base64url")).join(".");
}

function decryptToken(value: string) {
  const [ivValue, tagValue, ciphertextValue] = value.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error("Stored Apple token is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
}

async function postToApple(url: string, values: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(values),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string; refresh_token?: string };
  if (!response.ok || body.error) throw new Error(`Apple OAuth request failed: ${body.error || response.status}`);
  return body;
}

export async function exchangeAppleAuthorizationCode(code: string) {
  const { clientId, clientSecret } = createAppleClientSecret();
  const body = await postToApple(APPLE_TOKEN_URL, {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  });
  if (!body.refresh_token) throw new Error("Apple did not return a refresh token.");
  return body.refresh_token;
}

export async function saveAppleCredential(userId: string, subject: string, refreshToken: string) {
  await run(
    `INSERT INTO oauth_credentials (provider, provider_subject, user_id, refresh_token_encrypted, created_at, updated_at)
     VALUES ('apple', ?, ?, ?, ?, ?)
     ON CONFLICT (provider, provider_subject) DO UPDATE
     SET user_id = EXCLUDED.user_id, refresh_token_encrypted = EXCLUDED.refresh_token_encrypted, updated_at = EXCLUDED.updated_at`,
    subject,
    userId,
    encryptToken(refreshToken),
    new Date().toISOString(),
    new Date().toISOString()
  );
}

export async function revokeAppleCredentialForUser(userId: string) {
  const credentials = await many<{ refresh_token_encrypted: string }>(
    "SELECT refresh_token_encrypted FROM oauth_credentials WHERE provider = 'apple' AND user_id = ?",
    userId
  );
  if (credentials.length === 0) return { revoked: false, reason: "not_linked" as const };
  const { clientId, clientSecret } = createAppleClientSecret();
  for (const credential of credentials) {
    await postToApple(APPLE_REVOKE_URL, {
      client_id: clientId,
      client_secret: clientSecret,
      token: decryptToken(credential.refresh_token_encrypted),
      token_type_hint: "refresh_token",
    });
  }
  return { revoked: true as const };
}
