import assert from "node:assert/strict";
import test from "node:test";

import { emailConfigured, sendEmail } from "../src/lib/email.ts";

const ENV_KEYS = [
  "ALETHEIA_RESEND_API_KEY",
  "ALETHEIA_FROM_EMAIL",
  "ALETHEIA_SMTP_SERVER",
  "ALETHEIA_SMTP_USERNAME",
  "ALETHEIA_SMTP_PASSWORD",
];

function preserveEnvironment() {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreEnvironment(saved) {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = saved[key];
    }
  }
}

test("email delivery is Resend-only and ignores legacy SMTP credentials", { concurrency: false }, async () => {
  const saved = preserveEnvironment();
  try {
    delete process.env.ALETHEIA_RESEND_API_KEY;
    delete process.env.ALETHEIA_FROM_EMAIL;
    process.env.ALETHEIA_SMTP_SERVER = "smtp.example.com";
    process.env.ALETHEIA_SMTP_USERNAME = "user";
    process.env.ALETHEIA_SMTP_PASSWORD = "secret";

    assert.equal(emailConfigured(), false);
    assert.deepEqual(await sendEmail({ to: "person@example.com", subject: "Test", text: "Test" }), {
      sent: false,
      provider: "none",
      error: "Email is not configured.",
    });
  } finally {
    restoreEnvironment(saved);
  }
});

test("Resend requests have a bounded timeout and bounded provider errors", { concurrency: false }, async () => {
  const saved = preserveEnvironment();
  const originalFetch = globalThis.fetch;
  try {
    process.env.ALETHEIA_RESEND_API_KEY = "test-key";
    process.env.ALETHEIA_FROM_EMAIL = "hello@example.com";
    let requestInit;
    globalThis.fetch = async (_url, init) => {
      requestInit = init;
      return new Response("x".repeat(800), { status: 503 });
    };

    const result = await sendEmail({ to: "person@example.com", subject: "Test", text: "Body" });
    assert.equal(requestInit.signal instanceof AbortSignal, true);
    assert.equal(result.sent, false);
    assert.equal(result.provider, "resend");
    assert.equal(result.error.length, 500);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnvironment(saved);
  }
});
