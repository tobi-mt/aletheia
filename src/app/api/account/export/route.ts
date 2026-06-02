import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { many, one } from "@/lib/db";
import { trackServerEvent } from "@/lib/analytics";

type CountRow = { count: string | number };

async function userRows<T extends Record<string, unknown>>(table: string, userId: string, order = "created_at DESC") {
  return many<T>(`SELECT * FROM ${table} WHERE user_id = ? ORDER BY ${order}`, userId);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to export your Aletheia data." }, { status: 401 });
  }

  const [
    profile,
    preferences,
    manualContext,
    memorySummary,
    conversations,
    reflections,
    decisions,
    decisionEvents,
    counselContacts,
    counselSharedDecisions,
    counselComments,
    rulesOfLife,
    answerFeedback,
    pushSubscriptions,
  ] = await Promise.all([
    one("SELECT id, email, name, avatar_url, login_count, last_seen_at, created_at FROM users WHERE id = ?", user.id),
    one("SELECT * FROM user_preferences WHERE user_id = ?", user.id),
    one("SELECT * FROM user_manual_context WHERE user_id = ?", user.id),
    one("SELECT * FROM user_memory_summaries WHERE user_id = ?", user.id),
    userRows("chat_messages", user.id),
    userRows("journal_entries", user.id),
    userRows("wisdom_decisions", user.id, "updated_at DESC"),
    userRows("decision_events", user.id),
    userRows("counsel_contacts", user.id),
    userRows("counsel_shared_decisions", user.id),
    many(
      `SELECT counsel_comments.*
       FROM counsel_comments
       JOIN counsel_contacts ON counsel_contacts.id = counsel_comments.contact_id
       WHERE counsel_contacts.user_id = ?
       ORDER BY counsel_comments.created_at DESC`,
      user.id
    ),
    userRows("rule_of_life_entries", user.id),
    userRows("answer_feedback", user.id),
    userRows("push_subscriptions", user.id),
  ]);

  const counts = {
    conversations: conversations.length,
    reflections: reflections.length,
    decisions: decisions.length,
    counselContacts: counselContacts.length,
    rulesOfLife: rulesOfLife.length,
    pushSubscriptions: pushSubscriptions.length,
    analyticsEvents: Number((await one<CountRow>("SELECT COUNT(*) AS count FROM analytics_events WHERE user_id = ?", user.id))?.count ?? 0),
  };

  await trackServerEvent({
    userId: user.id,
    eventName: "data_export_requested",
    metadata: counts,
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    exportVersion: 1,
    account: profile,
    preferences,
    manualContext,
    memorySummary,
    conversations,
    reflections,
    decisions,
    decisionEvents,
    counselContacts,
    counselSharedDecisions,
    counselComments,
    rulesOfLife,
    answerFeedback,
    pushSubscriptions: pushSubscriptions.map((subscription) => ({
      ...(subscription as Record<string, unknown>),
      p256dh: "[redacted]",
      auth: "[redacted]",
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="aletheia-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
