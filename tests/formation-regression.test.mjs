import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { postCircleInviteLink } from "../src/app/api/challenge-circles/by-id/[circleId]/invite-link/route.ts";
import { hashChallengeInviteToken } from "../src/lib/challenge-circles.ts";
import { deleteChallengeEnrollment, postChallengeEnrollment } from "../src/app/api/challenges/enrollment/route.ts";
import { getChallenges } from "../src/app/api/challenges/route.ts";
import { challengeDefinitions } from "../src/lib/challenge-data.ts";

const app = readFileSync(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8");
const tokenRoute = readFileSync(new URL("../src/app/api/challenge-circles/[token]/route.ts", import.meta.url), "utf8");
const tokenNudgesRoute = readFileSync(new URL("../src/app/api/challenge-circles/[token]/nudges/route.ts", import.meta.url), "utf8");
const formation = app.slice(app.indexOf("function FormationRailSection("), app.indexOf("const ChallengeResponseDashboard = memo("));

const request = () => new Request("https://aletheia.example/api/challenge-circles/by-id/circle-1/invite-link", { method: "POST" });

test("circle members can mint a fresh invite link; only its hash is stored", async () => {
  const writes = [];
  const deps = {
    getCurrentUser: async () => ({ id: "member-1" }),
    one: async (_sql, circleId, userId) => (circleId === "circle-1" && userId === "member-1" ? { id: "m-1" } : null),
    run: async (_sql, ...params) => { writes.push(params); },
  };

  const response = await postCircleInviteLink(request(), "circle-1", deps);
  assert.equal(response.status, 200);
  const { inviteUrl } = await response.json();
  const token = new URL(inviteUrl).searchParams.get("challengeInvite");
  assert.ok(token);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], hashChallengeInviteToken(token));
  assert.notEqual(writes[0][0], token);
  assert.deepEqual(writes[0].slice(1, 3), ["circle-1", "member-1"]);

  const outsider = await postCircleInviteLink(request(), "circle-1", { ...deps, getCurrentUser: async () => ({ id: "stranger" }) });
  assert.equal(outsider.status, 404);
  const guest = await postCircleInviteLink(request(), "circle-1", { ...deps, getCurrentUser: async () => null });
  assert.equal(guest.status, 401);
  assert.equal(writes.length, 1);
});

test("invite tokens resolve through the original hash or any re-shared link", () => {
  for (const source of [tokenRoute, tokenNudgesRoute]) {
    assert.match(source, /challenge_circle_invite_links l WHERE l\.token_hash = \?/);
  }
});

test("tapping a practice always opens that practice instead of switching to another circle", () => {
  assert.doesNotMatch(formation, /latestChallengeCircle|formationAutoSwitched/);
  assert.doesNotMatch(formation, /pendingChallengeId \?\?\s*selectedChallengeId/);
  assert.match(formation, /const selectedChallenge = selectedChallengeId\s*\?\s*displayChallenges\.find\(\(challenge\) => challenge\.id === selectedChallengeId\)/);
});

test("Formation supports several practices, history, and visible save failures in one place", () => {
  assert.match(formation, /const activePractices = enrolledPractices/);
  assert.match(formation, /\{ id: "mine", label: ts\("challenges\.myPractices"\) \}/);
  assert.match(formation, /\{ id: "history", label: ts\("challenges\.historyTab"\) \}/);
  assert.match(formation, /setSaveDayError\(data\.error \|\| ts\("challenges\.saveFailed"\)\)/);
  assert.match(formation, /isFastingChallenge && !fastingCircle\) \{\s*setOpenDayDetailDay\(null\);\s*openInviteEditor\(challenge\);/);
  assert.match(formation, /\/invite-link`, \{ method: "POST" \}/);
  assert.doesNotMatch(formation, /if \(!user\) \{\s*return \(\s*<section/);
});

test("shared formation day links open Library formation, including older reflect links", () => {
  assert.match(app, /\/\?tab=library&challenge=\$\{encodeURIComponent\(challenge\.id\)\}/);
  assert.match(app, /if \(challengeParam\) \{[\s\S]{0,140}setActiveViewState\("library"\);\s*setRequestedLibrarySection\("formation"\);/);
});

const enrollmentRequest = (method, body) => new Request("https://aletheia.example/api/challenges/enrollment", {
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// A tiny in-memory stand-in for challenge_enrollments so begin -> reload can be exercised end to end.
function enrollmentStore(userId = "user-1") {
  const rows = new Map();
  return {
    rows,
    getCurrentUser: async () => ({ id: userId }),
    requireUser: async () => ({ id: userId }),
    run: async (sql, ...params) => {
      if (/INSERT INTO challenge_enrollments/.test(sql)) {
        const [owner, challengeId, startedAt] = params;
        const key = `${owner}:${challengeId}`;
        if (!rows.has(key)) rows.set(key, { user_id: owner, challenge_id: challengeId, started_at: startedAt });
      } else if (/DELETE FROM challenge_enrollments/.test(sql)) {
        rows.delete(`${params[0]}:${params[1]}`);
      }
    },
    many: async (sql, owner) =>
      /FROM challenge_enrollments/.test(sql) ? [...rows.values()].filter((row) => row.user_id === owner) : [],
  };
}

test("beginning a practice is stored on the account before Day 1 and survives a reload on another device", async () => {
  const store = enrollmentStore();
  const challengeId = challengeDefinitions[0].id;

  const begun = await postChallengeEnrollment(enrollmentRequest("POST", { challengeId }), store);
  assert.equal(begun.status, 200);
  const { enrollments } = await begun.json();
  assert.equal(enrollments.length, 1);
  assert.equal(enrollments[0].challengeId, challengeId);
  const firstStartedAt = enrollments[0].startedAt;

  // Beginning again (or syncing an offline begin) must not reset the start date.
  await new Promise((resolve) => setTimeout(resolve, 5));
  const again = await (await postChallengeEnrollment(enrollmentRequest("POST", { challengeIds: [challengeId] }), store)).json();
  assert.equal(again.enrollments[0].startedAt, firstStartedAt);

  const reloaded = await (await getChallenges(store)).json();
  const practice = reloaded.challenges.find((challenge) => challenge.id === challengeId);
  assert.equal(practice.completedDays.length, 0);
  assert.equal(practice.startedAt, firstStartedAt);
  assert.ok(reloaded.challenges.filter((challenge) => challenge.id !== challengeId).every((challenge) => challenge.startedAt === null));

  const removed = await deleteChallengeEnrollment(enrollmentRequest("DELETE", { challengeId }), store);
  assert.equal(removed.status, 200);
  const afterRemove = await (await getChallenges(store)).json();
  assert.equal(afterRemove.challenges.find((challenge) => challenge.id === challengeId).startedAt, null);
});

test("enrollment rejects guests and unknown practices, and progress still loads before the table is migrated", async () => {
  const store = enrollmentStore();
  const guest = await postChallengeEnrollment(enrollmentRequest("POST", { challengeId: challengeDefinitions[0].id }), { ...store, getCurrentUser: async () => null });
  assert.equal(guest.status, 401);
  const unknown = await postChallengeEnrollment(enrollmentRequest("POST", { challengeId: "not-a-practice" }), store);
  assert.equal(unknown.status, 404);
  assert.equal(store.rows.size, 0);

  const unmigrated = await getChallenges({
    requireUser: store.requireUser,
    many: async (sql) => {
      if (/challenge_enrollments/.test(sql)) throw new Error('relation "challenge_enrollments" does not exist');
      return [];
    },
  });
  assert.equal(unmigrated.status, 200);
});

test("Begin persists to the account and offline begins are retried per account", () => {
  assert.match(formation, /function beginPractice[\s\S]{0,600}void persistEnrollments\(\[challenge\.id\]\)/);
  assert.match(formation, /fetch\("\/api\/challenges\/enrollment", \{\s*method: "POST"/);
  assert.match(formation, /syncPendingEnrollmentsRef\.current\(challengeData\.challenges\)/);
  assert.match(formation, /if \(challenge\.startedAt\) return true;/);
  assert.match(formation, /completedDays: withProgress\?\.completedDays \?\? \[\],\s*startedAt: withProgress\?\.startedAt \?\? null,/);
  assert.match(app, /function readStartedFormationIds\(userId: string \| null \| undefined\)/);
});
