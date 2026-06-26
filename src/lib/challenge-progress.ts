export type ChallengeProgressState =
  | "not_started"
  | "started"
  | "active"
  | "inactive"
  | "completed_today"
  | "completed"
  | "abandoned";

export type ChallengeProgressSnapshot = {
  completedDays: number;
  totalDays: number;
  lastCompletedAt?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
export const CHALLENGE_INACTIVE_AFTER_DAYS = 1;

function isSameLocalDay(leftMs: number, rightMs: number) {
  const left = new Date(leftMs);
  const right = new Date(rightMs);

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function getChallengeProgressState(
  snapshot: ChallengeProgressSnapshot,
  nowMs = Date.now()
): ChallengeProgressState {
  if (snapshot.completedDays >= snapshot.totalDays) {
    return "completed";
  }

  if (snapshot.completedDays <= 0) {
    return "not_started";
  }

  if (!snapshot.lastCompletedAt) {
    return "started";
  }

  const completedAtMs = Date.parse(snapshot.lastCompletedAt);
  if (!Number.isFinite(completedAtMs)) {
    return "started";
  }

  if (isSameLocalDay(completedAtMs, nowMs)) {
    return "completed_today";
  }

  const elapsedDays = (nowMs - completedAtMs) / DAY_MS;
  return elapsedDays > CHALLENGE_INACTIVE_AFTER_DAYS ? "inactive" : "active";
}

export function isChallengeInProgress(snapshot: ChallengeProgressSnapshot, nowMs = Date.now()) {
  const state = getChallengeProgressState(snapshot, nowMs);
  return state === "started" || state === "active" || state === "inactive" || state === "completed_today";
}
