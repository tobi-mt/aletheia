import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { many, run } from "@/lib/db";
import type { Mode } from "@/lib/wisdom-data";

const feedbackValues = new Set(["helpful", "mildly_helpful", "too_vague", "too_preachy", "not_relevant"]);

function feedbackPreferenceSummary(rows: Array<{ value: string; count: number }>) {
  const counts = Object.fromEntries(rows.map((row) => [row.value, Number(row.count)]));
  const preferences: string[] = [];

  if ((counts.too_vague ?? 0) >= 2) {
    preferences.push("Be more concrete, with clearer next steps and fewer abstractions.");
  }
  if ((counts.too_preachy ?? 0) >= 1) {
    preferences.push("Use less religious jargon and explain biblical ideas in ordinary language.");
  }
  if ((counts.not_relevant ?? 0) >= 1) {
    preferences.push("Stay closer to the user's exact question and ask a clarifying question when needed.");
  }
  if ((counts.helpful ?? 0) + (counts.mildly_helpful ?? 0) >= 3) {
    preferences.push("Keep the calm, practical, reflective tone that the user has found helpful.");
  }

  return {
    counts,
    guidance: preferences.length
      ? preferences
      : ["Keep answers warm, specific, non-hyped, and grounded in retrieved wisdom sources."],
  };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = (await request.json()) as {
    value?: string;
    mode?: Mode;
    placement?: string;
  };
  const value = body.value?.trim() ?? "";
  if (!feedbackValues.has(value)) {
    return NextResponse.json({ error: "Unsupported feedback value." }, { status: 400 });
  }

  if (user) {
    const now = new Date().toISOString();
    await run(
      `INSERT INTO answer_feedback (id, user_id, value, mode, placement, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      user.id,
      value,
      body.mode ?? null,
      body.placement?.slice(0, 80) ?? null,
      now
    );

    const rows = await many<{ value: string; count: number }>(
      `SELECT value, COUNT(*)::int AS count
       FROM answer_feedback
       WHERE user_id = ?
       GROUP BY value`,
      user.id
    );
    const answerPreferences = feedbackPreferenceSummary(rows);
    await run(
      `INSERT INTO user_memory_summaries (user_id, summary, answer_preferences, updated_at)
       VALUES (?, COALESCE((SELECT summary FROM user_memory_summaries WHERE user_id = ?), ''), ?::jsonb, ?)
       ON CONFLICT (user_id)
       DO UPDATE SET answer_preferences = EXCLUDED.answer_preferences, updated_at = EXCLUDED.updated_at`,
      user.id,
      user.id,
      JSON.stringify(answerPreferences),
      now
    );

    await trackServerEvent({
      userId: user.id,
      eventName: "answer_feedback",
      metadata: { value, mode: body.mode ?? null, placement: body.placement ?? null },
    });

    return NextResponse.json({ ok: true, answerPreferences });
  }

  return NextResponse.json({
    ok: true,
    localOnly: true,
    answerPreferences: feedbackPreferenceSummary([{ value, count: 1 }]),
  });
}
