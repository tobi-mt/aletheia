import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { buildDecisionSummary, detectPatterns, scoreDecision } from "@/lib/decision-intelligence";
import { many, run } from "@/lib/db";
import { retrieveWisdom } from "@/lib/wisdom";
import type { Mode } from "@/lib/wisdom-data";

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

type EventRow = {
  id: string;
  decision_id: string | null;
  event_type: string;
  body: string;
  mode: Mode | null;
  created_at: string;
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

function timelineInsight(decisions: DecisionRow[], events: EventRow[]) {
  const text = [...decisions.map((item) => `${item.title} ${item.pressure} ${item.initial_emotion}`), ...events.map((event) => event.body)].join(" ");
  const patterns = detectPatterns(text);
  const active = decisions.filter((decision) => decision.status === "discerning");
  const oldest = active
    .map((decision) => new Date(decision.created_at).getTime())
    .sort((a, b) => a - b)[0];
  const days = oldest ? Math.max(1, Math.round((Date.now() - oldest) / 86400000)) : 0;

  return {
    activeCount: active.length,
    daysDiscerning: days,
    patterns,
    gentleObservation: patterns.includes("urgency")
      ? "Urgency appears in your recent decisions. That does not make the desire wrong, but speed may be clouding wisdom."
      : patterns.includes("comparison")
        ? "Comparison appears in your recent reflections. It may help to define enough before choosing more."
        : patterns.includes("fear")
          ? "Fear appears in your recent discernment. Some fear calls for planning; some calls for release."
          : active.length
            ? `You are carrying ${active.length} active decision${active.length === 1 ? "" : "s"}. Keep the next faithful step small and visible.`
            : "Your timeline is ready to track decisions, patterns, counsel, and learning.",
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ decisions: [], events: [], insight: timelineInsight([], []) });
  }

  const [decisions, events] = await Promise.all([
    many<DecisionRow>(
      `SELECT * FROM wisdom_decisions
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT 40`,
      user.id
    ),
    many<EventRow>(
      `SELECT id, decision_id, event_type, body, mode, created_at
       FROM decision_events
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 80`,
      user.id
    ),
  ]);

  return NextResponse.json({
    decisions: decisions.map(mapDecision),
    events: events.map((event) => ({
      id: event.id,
      decisionId: event.decision_id,
      eventType: event.event_type,
      body: event.body,
      mode: event.mode,
      createdAt: event.created_at,
    })),
    insight: timelineInsight(decisions, events),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to save decisions." }, { status: 401 });
  }

  const body = (await request.json()) as {
    title?: string;
    mode?: Mode;
    pressure?: string;
    emotion?: string;
  };
  const title = body.title?.trim();
  const pressure = body.pressure?.trim();
  const mode = body.mode ?? "Money";
  const emotion = body.emotion?.trim() || "uncertain";

  if (!title || !pressure) {
    return NextResponse.json({ error: "Decision title and pressure are required." }, { status: 400 });
  }

  const signals = scoreDecision({
    pressure,
    emotion,
    counselSought: false,
    costCounted: false,
    alignmentClear: false,
    reversibleStep: false,
    peaceOverUrgency: false,
  });
  const sources = await retrieveWisdom(`${title} ${pressure} ${emotion}`, mode, 3);
  const summary = buildDecisionSummary({ title, mode, pressure, emotion, sources, signals });
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await run(
    `INSERT INTO wisdom_decisions
     (id, user_id, title, mode, pressure, initial_emotion, readiness, summary, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    user.id,
    title,
    mode,
    pressure,
    emotion,
    signals.readiness,
    summary,
    now,
    now
  );
  await run(
    `INSERT INTO decision_events (id, user_id, decision_id, event_type, body, mode, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    crypto.randomUUID(),
    user.id,
    id,
    "created",
    `Started discerning: ${title}`,
    mode,
    now
  );
  await trackServerEvent({
    userId: user.id,
    eventName: "decision_created",
    metadata: { mode, readiness: signals.readiness, emotion },
  });

  return NextResponse.json({
    decision: {
      id,
      title,
      mode,
      pressure,
      initialEmotion: emotion,
      status: "discerning",
      readiness: signals.readiness,
      counselSought: false,
      costCounted: false,
      alignmentClear: false,
      reversibleStep: false,
      peaceOverUrgency: false,
      waitingUntil: null,
      summary,
      finalDecision: null,
      learning: null,
      createdAt: now,
      updatedAt: now,
    },
    signals,
  });
}
