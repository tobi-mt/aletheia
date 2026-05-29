import nodemailer from "nodemailer";

type EmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type EmailResult = {
  sent: boolean;
  provider: "resend" | "smtp" | "none";
  error?: string;
};

function env(name: string, fallbackName?: string) {
  return (process.env[name] || (fallbackName ? process.env[fallbackName] : "") || "").trim();
}

function fromAddress() {
  const email = env("ALETHEIA_FROM_EMAIL", "MIRROR_TALK_FROM_EMAIL");
  const name = env("ALETHEIA_FROM_NAME", "MIRROR_TALK_FROM_NAME") || "Aletheia";
  return name && email ? `${name} <${email}>` : email;
}

function ccEmail() {
  return env("ALETHEIA_CC_EMAIL", "MIRROR_TALK_CC_EMAIL") || null;
}

function buildHtml(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `
    <div style="margin:0;background:#eef2ef;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#203a35;">
      <div style="max-width:620px;margin:0 auto;background:#fbfcf8;border:1px solid #c9d5cd;border-radius:16px;padding:28px;">
        <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#866a24;font-weight:700;">Aletheia</div>
        <div style="white-space:pre-wrap;font-size:15px;line-height:1.7;color:#405049;margin-top:18px;">${escaped}</div>
      </div>
    </div>
  `;
}

export function isEmailAddress(value: string | null | undefined) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

export function emailConfigured() {
  const resendReady = Boolean(env("ALETHEIA_RESEND_API_KEY", "MIRROR_TALK_RESEND_API_KEY") && env("ALETHEIA_FROM_EMAIL", "MIRROR_TALK_FROM_EMAIL"));
  const smtpReady = Boolean(
    env("ALETHEIA_SMTP_SERVER", "MIRROR_TALK_SMTP_SERVER") &&
      env("ALETHEIA_SMTP_USERNAME", "MIRROR_TALK_SMTP_USERNAME") &&
      env("ALETHEIA_SMTP_PASSWORD", "MIRROR_TALK_SMTP_PASSWORD") &&
      env("ALETHEIA_FROM_EMAIL", "MIRROR_TALK_FROM_EMAIL")
  );
  return resendReady || smtpReady;
}

export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const resendApiKey = env("ALETHEIA_RESEND_API_KEY", "MIRROR_TALK_RESEND_API_KEY");
  const from = fromAddress();
  if (resendApiKey && from) {
    const payload: Record<string, unknown> = {
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html || buildHtml(input.text),
    };
    const cc = ccEmail();
    if (cc) {
      payload.cc = [cc];
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "aletheia/0.1.1",
        },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        return { sent: true, provider: "resend" };
      }
      const errorText = await response.text();
      return { sent: false, provider: "resend", error: errorText || `Resend returned HTTP ${response.status}` };
    } catch (error) {
      return { sent: false, provider: "resend", error: error instanceof Error ? error.message : "Resend request failed." };
    }
  }

  const smtpServer = env("ALETHEIA_SMTP_SERVER", "MIRROR_TALK_SMTP_SERVER");
  const smtpUsername = env("ALETHEIA_SMTP_USERNAME", "MIRROR_TALK_SMTP_USERNAME");
  const smtpPassword = env("ALETHEIA_SMTP_PASSWORD", "MIRROR_TALK_SMTP_PASSWORD");
  const smtpPort = Number(env("ALETHEIA_SMTP_PORT", "MIRROR_TALK_SMTP_PORT") || "587");
  if (smtpServer && smtpUsername && smtpPassword && from) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpServer,
        port: Number.isFinite(smtpPort) ? smtpPort : 587,
        secure: smtpPort === 465,
        auth: {
          user: smtpUsername,
          pass: smtpPassword,
        },
      });
      await transporter.sendMail({
        from,
        to: input.to,
        cc: ccEmail() || undefined,
        subject: input.subject,
        text: input.text,
        html: input.html || buildHtml(input.text),
      });
      return { sent: true, provider: "smtp" };
    } catch (error) {
      return { sent: false, provider: "smtp", error: error instanceof Error ? error.message : "SMTP send failed." };
    }
  }

  return { sent: false, provider: "none", error: "Email is not configured." };
}

export function counselInviteEmail({
  counselorName,
  inviterName,
  inviteUrl,
}: {
  counselorName: string;
  inviterName: string;
  inviteUrl: string;
}) {
  const text = `Hi ${counselorName},

${inviterName} invited you to be part of their private Counsel Circle in Aletheia.

Aletheia is a wisdom companion for money, work, stewardship, and major life decisions. This invite is intentionally privacy-first:

- You will only see decision summaries the user explicitly shares with you.
- You will not see private chats.
- You will not see journal entries.
- You will not see unshared decisions.

Open your private invite:
${inviteUrl}

If you accept, you can offer counsel only within the permissions the user chose.

Grace and wisdom,
Aletheia`;

  return {
    subject: `${inviterName} invited you to their Aletheia Counsel Circle`,
    text,
    html: buildHtml(text),
  };
}
