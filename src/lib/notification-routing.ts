export type NotificationFocus = "today" | "gratitude" | "challenge" | "decision" | "library" | "reflect";

export type NotificationSurface = "incoming" | "outgoing";

export type NotificationOpenMode = "thread" | "comment";

export type NotificationRouteParams = {
  notificationKind?: string | null;
  notificationId?: string | null;
  focus?: NotificationFocus | null;
  decisionId?: string | null;
  sharedDecisionId?: string | null;
  contactId?: string | null;
  circleId?: string | null;
  challengeId?: string | null;
  nudgeId?: string | null;
  surface?: NotificationSurface | null;
  open?: NotificationOpenMode | null;
  section?: string | null;
  tab?: string | null;
};

type NotificationDataLike = Record<string, unknown> | null | undefined;

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function setIfPresent(params: URLSearchParams, key: string, value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (trimmed) {
    params.set(key, trimmed);
  }
}

export function buildNotificationUrl(input: NotificationRouteParams) {
  const params = new URLSearchParams();
  params.set("source", "notification");
  setIfPresent(params, "notificationKind", input.notificationKind);
  setIfPresent(params, "notificationId", input.notificationId);

  switch (input.notificationKind) {
    case "daily_wisdom":
      params.set("focus", "today");
      break;
    case "gratitude_reflection":
      params.set("focus", "gratitude");
      break;
    case "challenge_circle_nudge":
      params.set("focus", "challenge");
      setIfPresent(params, "challenge", input.challengeId);
      setIfPresent(params, "circleId", input.circleId);
      setIfPresent(params, "nudgeId", input.nudgeId);
      params.set("tab", "reflect");
      params.set("section", "nudges");
      break;
    case "counsel_comment":
      params.set("focus", "decision");
      setIfPresent(params, "decisionId", input.decisionId);
      setIfPresent(params, "sharedDecisionId", input.sharedDecisionId);
      setIfPresent(params, "contactId", input.contactId);
      params.set("tab", "decisions");
      params.set("section", "share");
      params.set("open", input.open ?? "comment");
      if (input.surface) {
        params.set("surface", input.surface);
      }
      break;
    case "counsel_decision_shared":
      params.set("focus", "decision");
      setIfPresent(params, "decisionId", input.decisionId);
      setIfPresent(params, "sharedDecisionId", input.sharedDecisionId);
      setIfPresent(params, "contactId", input.contactId);
      params.set("tab", "decisions");
      params.set("section", "share");
      params.set("open", input.open ?? "thread");
      if (input.surface) {
        params.set("surface", input.surface);
      }
      break;
    case "decision_followup":
      params.set("focus", "decision");
      setIfPresent(params, "decisionId", input.decisionId);
      params.set("tab", "decisions");
      break;
    default:
      if (input.focus) {
        params.set("focus", input.focus);
      } else {
        params.set("focus", "today");
      }
      setIfPresent(params, "decisionId", input.decisionId);
      setIfPresent(params, "sharedDecisionId", input.sharedDecisionId);
      setIfPresent(params, "contactId", input.contactId);
      setIfPresent(params, "circleId", input.circleId);
      setIfPresent(params, "challengeId", input.challengeId);
      setIfPresent(params, "nudgeId", input.nudgeId);
      if (input.tab) {
        params.set("tab", input.tab);
      }
      if (input.section) {
        params.set("section", input.section);
      }
      if (input.open) {
        params.set("open", input.open);
      }
      if (input.surface) {
        params.set("surface", input.surface);
      }
      break;
  }

  return `/?${params.toString()}`;
}

export function parseNotificationLaunchUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const params = url.searchParams;
    if (params.get("source") !== "notification") {
      return null;
    }

    const focus = params.get("focus");
    const notificationKind = params.get("notificationKind") || null;
    const notificationId = params.get("notificationId") || null;
    return {
      notificationKind,
      notificationId,
      focus: focus === "today" || focus === "gratitude" || focus === "challenge" || focus === "decision" || focus === "library" || focus === "reflect" ? focus : null,
      decisionId: params.get("decisionId") || null,
      sharedDecisionId: params.get("sharedDecisionId") || null,
      contactId: params.get("contactId") || null,
      circleId: params.get("circleId") || null,
      challengeId: params.get("challenge") || params.get("challengeId") || null,
      nudgeId: params.get("nudgeId") || null,
      surface: params.get("surface") === "incoming" || params.get("surface") === "outgoing" ? params.get("surface") as NotificationSurface : null,
      open: params.get("open") === "thread" || params.get("open") === "comment" ? params.get("open") as NotificationOpenMode : null,
      section: params.get("section") || null,
      tab: params.get("tab") || null,
    };
  } catch {
    return null;
  }
}

export function notificationUrlFromData(data: NotificationDataLike) {
  const notificationKind = stringValue(data?.notificationKind);
  const notificationId = stringValue(data?.notificationId);
  return buildNotificationUrl({
    notificationKind,
    notificationId,
    focus: stringValue(data?.focus) as NotificationFocus | null,
    decisionId: stringValue(data?.decisionId),
    sharedDecisionId: stringValue(data?.sharedDecisionId),
    contactId: stringValue(data?.contactId),
    circleId: stringValue(data?.circleId),
    challengeId: stringValue(data?.challengeId) || stringValue(data?.challenge),
    nudgeId: stringValue(data?.nudgeId),
    surface: stringValue(data?.surface) === "incoming" || stringValue(data?.surface) === "outgoing" ? (stringValue(data?.surface) as NotificationSurface) : null,
    open: stringValue(data?.open) === "thread" || stringValue(data?.open) === "comment" ? (stringValue(data?.open) as NotificationOpenMode) : null,
    section: stringValue(data?.section),
    tab: stringValue(data?.tab),
  });
}
