import assert from "node:assert/strict";
import test from "node:test";
import { REMINDERS_CARD_SNOOZE_MS, shouldShowRemindersReenableCard } from "../src/lib/reminders-reenable-card.ts";

const now = Date.parse("2026-11-27T15:00:00.000Z");
const reinstalled = {
  signedIn: true,
  configured: true,
  accountEnabled: true,
  deviceSubscribed: false,
  permission: "default",
  optedOut: false,
  dismissedAt: null,
  now,
};

test("shows after a reinstall when the account still has reminders on", () => {
  assert.equal(shouldShowRemindersReenableCard(reinstalled), true);
});

test("stays hidden for people who never enabled or deliberately turned reminders off", () => {
  assert.equal(shouldShowRemindersReenableCard({ ...reinstalled, accountEnabled: false }), false);
  assert.equal(shouldShowRemindersReenableCard({ ...reinstalled, optedOut: true }), false);
  assert.equal(shouldShowRemindersReenableCard({ ...reinstalled, signedIn: false }), false);
  assert.equal(shouldShowRemindersReenableCard({ ...reinstalled, configured: false }), false);
});

test("stays hidden when the device is already subscribed or the permission is not promptable", () => {
  assert.equal(shouldShowRemindersReenableCard({ ...reinstalled, deviceSubscribed: true }), false);
  assert.equal(shouldShowRemindersReenableCard({ ...reinstalled, permission: "granted" }), false);
  assert.equal(shouldShowRemindersReenableCard({ ...reinstalled, permission: "denied" }), false);
  assert.equal(shouldShowRemindersReenableCard({ ...reinstalled, permission: "unsupported" }), false);
});

test("Not now snoozes the card and it returns after the snooze window", () => {
  const justDismissed = new Date(now - 60_000).toISOString();
  const longAgo = new Date(now - REMINDERS_CARD_SNOOZE_MS - 1).toISOString();
  assert.equal(shouldShowRemindersReenableCard({ ...reinstalled, dismissedAt: justDismissed }), false);
  assert.equal(shouldShowRemindersReenableCard({ ...reinstalled, dismissedAt: longAgo }), true);
  assert.equal(shouldShowRemindersReenableCard({ ...reinstalled, dismissedAt: "garbage" }), true);
});
