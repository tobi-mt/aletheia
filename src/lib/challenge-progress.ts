export type ChallengeProgressState =
  | "not_started"
  | "started"
  | "active"
  | "inactive"
  | "completed"
  | "abandoned";

export type ChallengeProgressSnapshot = {
  completedDays: number;
  totalDays: number;
  lastCompletedAt?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
export const CHALLENGE_INACTIVE_AFTER_DAYS = 3;

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

  const elapsedDays = (nowMs - completedAtMs) / DAY_MS;
  return elapsedDays > CHALLENGE_INACTIVE_AFTER_DAYS ? "inactive" : "active";
}

export function isChallengeInProgress(snapshot: ChallengeProgressSnapshot, nowMs = Date.now()) {
  const state = getChallengeProgressState(snapshot, nowMs);
  return state === "started" || state === "active" || state === "inactive";
}
