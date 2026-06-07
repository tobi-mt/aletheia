import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { buildDecisionSummary, detectPatterns, scoreDecision } from "@/lib/decision-intelligence";
import { many, one, run } from "@/lib/db";
import { defaultPreferences, normalizePreferences, type UserPreferences } from "@/lib/localization";
import { retrieveWisdom } from "@/lib/wisdom";
import { normalizeMode, type Mode } from "@/lib/wisdom-data";

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

type EventRow = {
  id: string;
  decision_id: string | null;
  event_type: string;
  body: string;
  mode: Mode | null;
  created_at: string;
};

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
    mode?: unknown;
    pressure?: string;
    emotion?: string;
  };
  const title = body.title?.trim();
  const pressure = body.pressure?.trim();
  const mode = normalizeMode(body.mode);
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
  const preferences = await getUserPreferences(user.id);
  const summary = buildDecisionSummary({ title, mode, pressure, emotion, sources, signals, preferences });
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
  await refreshUserMemorySummary(user.id);

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
      revisitAt: null,
      outcomeReviewAt: null,
      summary,
      finalDecision: null,
      learning: null,
      createdAt: now,
      updatedAt: now,
    },
    signals,
  });
}
