import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildDecisionSummary, scoreDecision } from "@/lib/decision-intelligence";
import { many, one, run } from "@/lib/db";
import { retrieveWisdom } from "@/lib/wisdom";
import type { Mode } from "@/lib/wisdom-data";

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
    summary: row.summary,
    finalDecision: row.final_decision,
    learning: row.learning,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

  const signals = scoreDecision({
    pressure: current.pressure,
    emotion: current.initial_emotion,
    counselSought,
    costCounted,
    alignmentClear,
    reversibleStep,
    peaceOverUrgency,
  });
  const sources = await retrieveWisdom(
    `${current.title} ${current.pressure} ${current.initial_emotion}`,
    current.mode,
    3
  );
  const summary = buildDecisionSummary({
    title: current.title,
    mode: current.mode,
    pressure: current.pressure,
    emotion: current.initial_emotion,
    sources,
    signals,
  });
  const now = new Date().toISOString();

  await run(
    `UPDATE wisdom_decisions
     SET counsel_sought = ?, cost_counted = ?, alignment_clear = ?, reversible_step = ?,
         peace_over_urgency = ?, readiness = ?, status = ?, waiting_until = ?,
         summary = ?, final_decision = COALESCE(?, final_decision), learning = COALESCE(?, learning),
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
