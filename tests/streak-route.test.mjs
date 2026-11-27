import assert from "node:assert/strict";
import test from "node:test";
import { postStreak } from "../src/app/api/streak/route.ts";

const now = new Date("2026-11-27T15:00:00.000Z");

const depsFor = (row) => {
  const calls = { selects: [], updates: [] };
  return {
    calls,
    deps: {
      getCurrentUser: async () => ({ id: "user-1" }),
      one: async (sql) => { calls.selects.push(sql); return row; },
      run: async (sql, ...params) => { calls.updates.push(params); },
    },
  };
};

test("streak reads the DATE column as text so timezones ahead of UTC never shift the day", async () => {
  const { calls, deps } = depsFor({ consecutive_use_days: 1, last_use_date: "2026-11-27", streak_achievements: {} });
  const body = await (await postStreak(deps, now)).json();
  assert.match(calls.selects[0], /last_use_date::text/);
  assert.equal(body.consecutiveDays, 1, "opening the app again on the same day keeps the streak");
  assert.deepEqual(body.unlockedMilestones, []);
  assert.equal(calls.updates.length, 0);
});

test("streak grows after yesterday, resets after a gap and unlocks a milestone once", async () => {
  const grown = depsFor({ consecutive_use_days: 6, last_use_date: "2026-11-26", streak_achievements: {} });
  const grownBody = await (await postStreak(grown.deps, now)).json();
  assert.equal(grownBody.consecutiveDays, 7);
  assert.deepEqual(grownBody.unlockedMilestones, [7]);

  const reset = depsFor({ consecutive_use_days: 6, last_use_date: "2026-11-20", streak_achievements: {} });
  assert.equal((await (await postStreak(reset.deps, now)).json()).consecutiveDays, 1);
});
