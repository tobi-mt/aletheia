import { createHash, createPublicKey, verify, type JsonWebKey as NodeJsonWebKey } from "node:crypto";

const APPLE_ISSUER = "https://appleid.apple.com";
const DEFAULT_APPLE_AUDIENCE = "com.tobi.aletheia.app";

type AppleClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  nonce?: string;
};

type AppleJwk = NodeJsonWebKey & { kid?: string; alg?: string };
let cachedKeys: { expiresAt: number; keys: AppleJwk[] } | null = null;

function decodeJson(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
}

async function appleKeys() {
  if (cachedKeys && cachedKeys.expiresAt > Date.now()) return cachedKeys.keys;
  const response = await fetch(`${APPLE_ISSUER}/auth/keys`, { cache: "no-store" });
  if (!response.ok) throw new Error("Apple identity keys are unavailable.");
  const body = (await response.json()) as { keys?: AppleJwk[] };
  if (!Array.isArray(body.keys) || body.keys.length === 0) throw new Error("Apple returned no identity keys.");
  cachedKeys = { keys: body.keys, expiresAt: Date.now() + 60 * 60 * 1000 };
  return body.keys;
}

export async function verifyAppleIdentityToken(identityToken: string, rawNonce: string) {
  const segments = identityToken.split(".");
  if (segments.length !== 3) throw new Error("Invalid Apple identity token.");
  const header = decodeJson(segments[0]) as { alg?: string; kid?: string };
  const claims = decodeJson(segments[1]) as AppleClaims;
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Apple identity token.");

  const jwk = (await appleKeys()).find((key) => key.kid === header.kid && (!key.alg || key.alg === "RS256"));
  if (!jwk) throw new Error("Apple identity key was not found.");
  const signatureValid = verify(
    "RSA-SHA256",
    Buffer.from(`${segments[0]}.${segments[1]}`),
    createPublicKey({ key: jwk, format: "jwk" }),
    Buffer.from(segments[2], "base64url")
  );
  if (!signatureValid) throw new Error("Apple identity signature is invalid.");

  const now = Math.floor(Date.now() / 1000);
  const audience = process.env.AUTH_APPLE_AUDIENCE?.trim() || DEFAULT_APPLE_AUDIENCE;
  const audiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
  const expectedNonce = createHash("sha256").update(rawNonce).digest("hex");
  if (claims.iss !== APPLE_ISSUER || !audiences.includes(audience)) throw new Error("Apple identity issuer or audience is invalid.");
  if (!claims.exp || claims.exp <= now || (claims.iat && claims.iat > now + 60)) throw new Error("Apple identity token is expired or not yet valid.");
  if (!claims.sub || claims.nonce !== expectedNonce) throw new Error("Apple identity nonce is invalid.");
  if (!claims.email || claims.email_verified === false || claims.email_verified === "false") throw new Error("Apple did not return a verified email address.");
  return { subject: claims.sub, email: claims.email.trim().toLowerCase() };
}
