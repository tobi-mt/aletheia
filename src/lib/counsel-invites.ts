import { createHash, randomBytes } from "node:crypto";
import { run } from "@/lib/db";

export function createCounselInviteToken() {
  return randomBytes(32).toString("base64url");
}

export function hashCounselInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function ensureCounselInviteAcceptanceSchema() {
  await run(`
    CREATE TABLE IF NOT EXISTS counsel_invite_acceptances (
      id TEXT PRIMARY KEY,
      invite_token_hash TEXT NOT NULL UNIQUE,
      contact_id TEXT NOT NULL REFERENCES counsel_contacts(id) ON DELETE CASCADE,
      recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      accepted_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      UNIQUE(contact_id, recipient_user_id)
    );

    ALTER TABLE counsel_invite_acceptances ADD COLUMN IF NOT EXISTS invite_token_hash TEXT UNIQUE;
    ALTER TABLE counsel_invite_acceptances ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
    ALTER TABLE counsel_invite_acceptances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS counsel_invite_acceptances_recipient_idx ON counsel_invite_acceptances(recipient_user_id, accepted_at DESC);
    ALTER TABLE counsel_comments ADD COLUMN IF NOT EXISTS acceptance_id TEXT;
    CREATE INDEX IF NOT EXISTS counsel_comments_acceptance_idx ON counsel_comments(acceptance_id, created_at DESC);
  `);
}
