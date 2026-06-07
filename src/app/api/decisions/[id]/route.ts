import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { buildDecisionSummary, scoreDecision } from "@/lib/decision-intelligence";
import { many, one, run } from "@/lib/db";
import { defaultPreferences, normalizePreferences, type UserPreferences } from "@/lib/localization";
import { retrieveWisdom } from "@/lib/wisdom";
import { normalizeMode, type Mode } from "@/lib/wisdom-data";

type Params = { params: Promise<{ id: string }> };

type DecisionRow = {
  id: string;
  title: string;
  mode: Mode;
  pressure: string;
  initial_emotion: string;
  status: string;
  readiness: number;
  counsel_sought: boolean;
  cost_counted: boolean;
  alignment_clear: boolean;
  reversible_step: boolean;
  peace_over_urgency: boolean;
  waiting_until: string | null;
  revisit_at: string | null;
  outcome_review_at: string | null;
  summary: string | null;
  final_decision: string | null;
  learning: string | null;
  created_at: string;
  updated_at: string;
};

function mapDecision(row: DecisionRow) {
  return {
    id: row.id,
    title: row.title,
    mode: row.mode,
    pressure: row.pressure,
    initialEmotion: row.initial_emotion,
    status: row.status,
    readiness: row.readiness,
    counselSought: row.counsel_sought,
    costCounted: row.cost_counted,
    alignmentClear: row.alignment_clear,
    reversibleStep: row.reversible_step,
    peaceOverUrgency: row.peace_over_urgency,
    waitingUntil: row.waiting_until,
    revisitAt: row.revisit_at,
    outcomeReviewAt: row.outcome_review_at,
    summary: row.summary,
    finalDecision: row.final_decision,
    learning: row.learning,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function refreshUserMemorySummary(userId: string) {
  const decisions = await many<{ title: string; mode: string; pressure: string; status: string }>(
    `SELECT title, mode, pressure, status
     FROM wisdom_decisions
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT 12`,
    userId
  );
  const active = decisions.filter((decision) => decision.status !== "closed");
  const combined = decisions.map((decision) => `${decision.title} ${decision.pressure}`).join(" ").toLowerCase();
  const themes = [
    combined.match(/career|job|work|business|calling|quit|leave/) ? "career pressure" : "",
    combined.match(/money|debt|invest|house|salary|budget|income/) ? "money stewardship" : "",
    combined.match(/compare|comparison|behind|envy/) ? "financial comparison" : "",
    combined.match(/give|help|family|support|generosity/) ? "generosity and boundaries" : "",
    combined.match(/urgent|rush|quick|pressure|now/) ? "urgency under pressure" : "",
  ].filter(Boolean);
  const summary = active.length
    ? `User is actively discerning ${active.length} major decision${active.length === 1 ? "" : "s"}. Recurring themes: ${themes.length ? themes.join(", ") : "clarity, counsel, cost, and next faithful steps"}. Use this as a concise continuity signal, not as full private history.`
    : decisions.length
      ? `User has prior decision history. Recurring themes: ${themes.length ? themes.join(", ") : "discernment, stewardship, and reflection"}. Use lightly and only when relevant.`
      : "";

  if (!summary) {
    return;
  }
  await run(
    `INSERT INTO user_memory_summaries (user_id, summary, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT (user_id)
     DO UPDATE SET summary = EXCLUDED.summary, updated_at = EXCLUDED.updated_at`,
    userId,
    summary,
    new Date().toISOString()
  );
}

async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const row = await one<{
    language: string;
    region: string;
    bible_translation: string;
    voice_enabled: boolean;
  }>(
    `SELECT language, region, bible_translation, voice_enabled
     FROM user_preferences
     WHERE user_id = ?`,
    userId
  );

  return normalizePreferences(
    row
      ? {
          language: row.language as UserPreferences["language"],
          region: row.region as UserPreferences["region"],
          bibleTranslation: row.bible_translation as UserPreferences["bibleTranslation"],
          voiceEnabled: row.voice_enabled,
        }
      : defaultPreferences
  );
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to update decisions." }, { status: 401 });
  }

  const { id } = await params;
  const current = await one<DecisionRow>(
    "SELECT * FROM wisdom_decisions WHERE id = ? AND user_id = ?",
    id,
    user.id
  );
  if (!current) {
    return NextResponse.json({ error: "Decision not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    counselSought?: boolean;
    costCounted?: boolean;
    alignmentClear?: boolean;
    reversibleStep?: boolean;
    peaceOverUrgency?: boolean;
    waitingDays?: number | null;
    revisitDays?: number | null;
    outcomeReviewDays?: number | null;
    finalDecision?: string;
    learning?: string;
    status?: string;
    event?: string;
  };

  const counselSought = body.counselSought ?? current.counsel_sought;
  const costCounted = body.costCounted ?? current.cost_counted;
  const alignmentClear = body.alignmentClear ?? current.alignment_clear;
  const reversibleStep = body.reversibleStep ?? current.reversible_step;
  const peaceOverUrgency = body.peaceOverUrgency ?? current.peace_over_urgency;
  const status = body.status ?? current.status;
  const waitingUntil =
    typeof body.waitingDays === "number" && body.waitingDays > 0
      ? new Date(Date.now() + body.waitingDays * 86400000).toISOString()
      : body.waitingDays === null
        ? null
        : current.waiting_until;
  const revisitAt =
    typeof body.revisitDays === "number" && body.revisitDays > 0
      ? new Date(Date.now() + body.revisitDays * 86400000).toISOString()
      : body.revisitDays === null
        ? null
        : current.revisit_at;
  const outcomeReviewAt =
    typeof body.outcomeReviewDays === "number" && body.outcomeReviewDays > 0
      ? new Date(Date.now() + body.outcomeReviewDays * 86400000).toISOString()
      : body.outcomeReviewDays === null
        ? null
        : current.outcome_review_at;

  const signals = scoreDecision({
    pressure: current.pressure,
    emotion: current.initial_emotion,
    counselSought,
    costCounted,
    alignmentClear,
    reversibleStep,
    peaceOverUrgency,
  });
  const mode = normalizeMode(current.mode);
  const sources = await retrieveWisdom(
    `${current.title} ${current.pressure} ${current.initial_emotion}`,
    mode,
    3
  );
  const preferences = await getUserPreferences(user.id);
  const summary = buildDecisionSummary({
    title: current.title,
    mode,
    pressure: current.pressure,
    emotion: current.initial_emotion,
    sources,
    signals,
    preferences,
  });
  const now = new Date().toISOString();

  await run(
    `UPDATE wisdom_decisions
     SET counsel_sought = ?, cost_counted = ?, alignment_clear = ?, reversible_step = ?,
         peace_over_urgency = ?, readiness = ?, status = ?, waiting_until = ?,
         revisit_at = ?, outcome_review_at = ?, summary = ?,
         final_decision = COALESCE(?, final_decision), learning = COALESCE(?, learning),
         updated_at = ?
     WHERE id = ? AND user_id = ?`,
    counselSought,
    costCounted,
    alignmentClear,
    reversibleStep,
    peaceOverUrgency,
    signals.readiness,
    status,
    waitingUntil,
    revisitAt,
    outcomeReviewAt,
    summary,
    body.finalDecision?.trim() || null,
    body.learning?.trim() || null,
    now,
    id,
    user.id
  );

  if (body.event?.trim()) {
    await run(
      `INSERT INTO decision_events (id, user_id, decision_id, event_type, body, mode, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      user.id,
      id,
      "update",
      body.event.trim(),
      current.mode,
      now
    );
  }
  await trackServerEvent({
    userId: user.id,
    eventName: "decision_updated",
    metadata: {
      mode: current.mode,
      readiness: signals.readiness,
      status,
      waiting: Boolean(waitingUntil),
    },
  });
  await refreshUserMemorySummary(user.id);

  const rows = await many(
    "SELECT * FROM wisdom_decisions WHERE id = ? AND user_id = ?",
    id,
    user.id
  );

  return NextResponse.json({ decision: rows[0] ? mapDecision(rows[0] as DecisionRow) : null, signals });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to delete decisions." }, { status: 401 });
  }

  const { id } = await params;
  await run("DELETE FROM wisdom_decisions WHERE id = ? AND user_id = ?", id, user.id);
  return NextResponse.json({ ok: true });
}
