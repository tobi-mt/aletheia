import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { one, run } from "@/lib/db";
import { defaultManualContext, normalizeManualContext, type ManualContextProfile } from "@/lib/manual-context";
import { readJsonBody } from "@/lib/request";

type ContextRow = {
  health_context: string;
  finance_context: string;
  work_context: string;
  obligations: string;
  goals: string;
  boundaries: string;
  context_json: unknown;
  use_in_answers: boolean;
};

function mapRow(row: ContextRow | undefined): ManualContextProfile {
  if (!row) {
    return defaultManualContext;
  }
  const contextFromJson =
    row.context_json && typeof row.context_json === "object"
      ? (row.context_json as Partial<ManualContextProfile>)
      : {};
  return normalizeManualContext({
    ...contextFromJson,
    // Backward-compatible fallback from legacy columns
    healthContext: contextFromJson.healthContext ?? row.health_context,
    financeContext: contextFromJson.financeContext ?? row.finance_context,
    workContext: contextFromJson.workContext ?? row.work_context,
    obligations: contextFromJson.obligations ?? row.obligations,
    goals: contextFromJson.goals ?? row.goals,
    boundaries: contextFromJson.boundaries ?? row.boundaries,
    useInAnswers: contextFromJson.useInAnswers ?? row.use_in_answers,
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ context: defaultManualContext, persisted: false });
  }

  const row = await one<ContextRow>(
    `SELECT health_context, finance_context, work_context, obligations, goals, boundaries, context_json, use_in_answers
     FROM user_manual_context
     WHERE user_id = ?`,
    user.id
  );

  return NextResponse.json({ context: mapRow(row), persisted: Boolean(row) });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  const parsedBody = await readJsonBody<Partial<ManualContextProfile>>(request, { maxBytes: 18_000, emptyBody: {} });
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;
  const context = normalizeManualContext(body);

  if (!user) {
    return NextResponse.json({ context, persisted: false });
  }

  const now = new Date().toISOString();
  await run(
    `INSERT INTO user_manual_context (
      user_id, health_context, finance_context, work_context, obligations, goals, boundaries,
      context_json, use_in_answers, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?)
    ON CONFLICT (user_id)
    DO UPDATE SET
      health_context = EXCLUDED.health_context,
      finance_context = EXCLUDED.finance_context,
      work_context = EXCLUDED.work_context,
      obligations = EXCLUDED.obligations,
      goals = EXCLUDED.goals,
      boundaries = EXCLUDED.boundaries,
      context_json = EXCLUDED.context_json,
      use_in_answers = EXCLUDED.use_in_answers,
      updated_at = EXCLUDED.updated_at`,
    user.id,
    context.healthContext,
    context.financeContext,
    context.workContext,
    context.obligations,
    context.goals,
    context.boundaries,
    JSON.stringify(context),
    context.useInAnswers,
    now,
    now
  );

  return NextResponse.json({ context, persisted: true });
}
