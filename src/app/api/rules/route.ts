import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { many, run } from "@/lib/db";
import { apiError } from "@/lib/api-errors";
import { normalizeMode, type Mode } from "@/lib/wisdom-data";

type RuleRow = {
  id: string;
  mode: Mode;
  principle: string;
  created_at: string;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ rules: [] });
  }

  const rules = await many<RuleRow>(
    `SELECT id, mode, principle, created_at
     FROM rule_of_life_entries
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    user.id
  );

  return NextResponse.json({
    rules: rules.map((rule) => ({
      id: rule.id,
      mode: rule.mode,
      principle: rule.principle,
      createdAt: rule.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to save rules of life.");
  }

  const body = (await request.json()) as { mode?: unknown; principle?: string };
  const principle = body.principle?.trim();
  const mode = normalizeMode(body.mode);
  if (!principle) {
    return apiError(400, "invalid_input", "Principle is required.");
  }

  const now = new Date().toISOString();
  const rule = { id: crypto.randomUUID(), mode, principle, createdAt: now };
  await run(
    `INSERT INTO rule_of_life_entries (id, user_id, mode, principle, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    rule.id,
    user.id,
    mode,
    principle,
    now,
    now
  );
  await trackServerEvent({
    userId: user.id,
    eventName: "rule_created",
    metadata: { mode },
  });

  return NextResponse.json({ rule });
}
