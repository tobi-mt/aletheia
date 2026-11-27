export const REMINDERS_CARD_DISMISS_STORAGE_PREFIX = "aletheia_reminders_card_dismissed:";
export const REMINDERS_CARD_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

export type RemindersReenableCardInput = {
  signedIn: boolean;
  configured: boolean;
  accountEnabled: boolean;
  deviceSubscribed: boolean;
  permission: NotificationPermission | "unsupported";
  optedOut: boolean;
  dismissedAt: string | null;
  now: number;
};

/**
 * The card is for people whose account still has reminders on (for example on
 * the phone they reinstalled from) but whose current install has never been
 * asked. A granted permission is left to the silent self-heal and a denied one
 * can only be changed in system settings, so both are excluded.
 */
export function shouldShowRemindersReenableCard(input: RemindersReenableCardInput) {
  if (!input.signedIn || !input.configured || !input.accountEnabled) return false;
  if (input.deviceSubscribed || input.optedOut) return false;
  if (input.permission !== "default") return false;
  if (input.dismissedAt) {
    const dismissedAt = Date.parse(input.dismissedAt);
    if (Number.isFinite(dismissedAt) && input.now - dismissedAt < REMINDERS_CARD_SNOOZE_MS) return false;
  }
  return true;
}
