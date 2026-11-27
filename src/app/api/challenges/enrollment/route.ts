import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { many, run } from "@/lib/db";
import { readJsonBody } from "@/lib/request";
import { getChallengeById } from "@/lib/challenge-data";

export const dynamic = "force-dynamic";

const enrollmentDeps = { getCurrentUser, many, run };
const MAX_ENROLLMENTS_PER_REQUEST = 50;

function requestedChallengeIds(body: { challengeId?: unknown; challengeIds?: unknown }) {
  const raw = Array.isArray(body.challengeIds) ? body.challengeIds : [body.challengeId];
  const ids = raw
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(ids)].slice(0, MAX_ENROLLMENTS_PER_REQUEST);
}

const isoTimestamp = (value: string | Date) => (value instanceof Date ? value.toISOString() : value);

export async function postChallengeEnrollment(request: Request, deps = enrollmentDeps) {
  const user = await deps.getCurrentUser();
  if (!user) return apiError(401, "sign_in_required", "Sign in to track challenge progress.");

  const parsed = await readJsonBody<{ challengeId?: unknown; challengeIds?: unknown }>(request, { maxBytes: 8_000 });
  if (!parsed.ok) return parsed.response;

  const challengeIds = requestedChallengeIds(parsed.data ?? {});
  if (!challengeIds.length) return apiError(400, "invalid_input", "challengeId is required.");
  if (challengeIds.some((id) => !getChallengeById(id))) {
    return apiError(404, "not_found", "Challenge not found.");
  }

  const startedAt = new Date().toISOString();
  for (const challengeId of challengeIds) {
    // Beginning again keeps the original start date so progress history stays truthful.
    await deps.run(
      `INSERT INTO challenge_enrollments (user_id, challenge_id, started_at)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id, challenge_id) DO NOTHING`,
      user.id,
      challengeId,
      startedAt
    );
  }

  const rows = await deps.many<{ challenge_id: string; started_at: string | Date }>(
    `SELECT challenge_id, started_at FROM challenge_enrollments WHERE user_id = ?`,
    user.id
  );
  const enrollments = rows
    .filter((row) => challengeIds.includes(row.challenge_id))
    .map((row) => ({ challengeId: row.challenge_id, startedAt: isoTimestamp(row.started_at) }));

  return NextResponse.json({ ok: true, enrollments });
}

export async function deleteChallengeEnrollment(request: Request, deps = enrollmentDeps) {
  const user = await deps.getCurrentUser();
  if (!user) return apiError(401, "sign_in_required", "Sign in to track challenge progress.");

  const parsed = await readJsonBody<{ challengeId?: unknown }>(request, { maxBytes: 2_000 });
  if (!parsed.ok) return parsed.response;

  const challengeId = typeof parsed.data?.challengeId === "string" ? parsed.data.challengeId.trim() : "";
  if (!challengeId) return apiError(400, "invalid_input", "challengeId is required.");

  await deps.run(
    `DELETE FROM challenge_enrollments WHERE user_id = ? AND challenge_id = ?`,
    user.id,
    challengeId
  );
  return NextResponse.json({ ok: true, challengeId });
}

export async function POST(request: Request) {
  return postChallengeEnrollment(request);
}

export async function DELETE(request: Request) {
  return deleteChallengeEnrollment(request);
}
