import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { emailConfigured, isEmailAddress, sendEmail } from "@/lib/email";

function supportRecipient() {
  return (
    process.env.ALETHEIA_SUPPORT_EMAIL ||
    process.env.MIRROR_TALK_SUPPORT_EMAIL ||
    process.env.ALETHEIA_FROM_EMAIL ||
    process.env.MIRROR_TALK_FROM_EMAIL ||
    ""
  ).trim();
}

function trim(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const category = trim(body.category, 80) || "General feedback";
  const message = trim(body.message, 4000);
  const path = trim(body.path, 300);
  const appView = trim(body.appView, 80);
  const theme = trim(body.theme, 80);
  const language = trim(body.language, 40);

  if (message.length < 8) {
    return NextResponse.json({ error: "Add a little more detail so we can understand the issue." }, { status: 400 });
  }
  if (!emailConfigured()) {
    return NextResponse.json({ error: "Support email is not configured yet." }, { status: 503 });
  }

  const to = supportRecipient();
  if (!isEmailAddress(to)) {
    return NextResponse.json({ error: "Support recipient email is not configured yet." }, { status: 503 });
  }

  const text = `Aletheia issue report

Category: ${category}
User: ${user ? `${user.name || "Unnamed"} <${user.email}> (${user.id})` : "Guest / not signed in"}
Path: ${path || "unknown"}
App view: ${appView || "unknown"}
Language: ${language || "unknown"}
Theme: ${theme || "unknown"}
Submitted: ${new Date().toISOString()}

Message:
${message}

Privacy note: This report includes only the text the user typed plus basic app context. Private chats, journals, decisions, and manual context were not attached.`;

  const result = await sendEmail({
    to,
    subject: `Aletheia report: ${category}`,
    text,
  });

  await trackServerEvent({
    userId: user?.id ?? null,
    eventName: "issue_reported",
    metadata: {
      category,
      sent: result.sent,
      provider: result.provider,
      signedIn: Boolean(user),
    },
  });

  if (!result.sent) {
    return NextResponse.json({ error: result.error || "Could not send the report." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, provider: result.provider });
}
