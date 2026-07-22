import webpush, { PushSubscription } from "web-push";
import { createECDH, timingSafeEqual } from "node:crypto";
import { many, one, run } from "@/lib/db";
import { localizedDailyWisdom, localizedScriptureReference, normalizePreferences, type BibleTranslation, type LanguageCode, type RegionCode } from "@/lib/localization";
import { getWisdomEntries } from "@/lib/wisdom";
import { selectDailyWisdomIndex } from "@/lib/wisdom-data";
import { getChallengeById, type ChallengeId } from "@/lib/challenge-data";
import { buildFastingDayPlan, formatFastingDurationLabel, normalizeFastingInviteDetails, type FastingInviteDetails } from "@/lib/fasting-invite";
import { recommendChallenges } from "@/lib/challenge-recommendations";
import { normalizeManualContext, type ManualContextProfile } from "@/lib/manual-context";
import { loadTranslationsSync, getTranslation } from "@/lib/translations";
import { MODE_KEYS, type Mode } from "@/lib/mode-keys";
import { getPendingNotifications, markNotificationSent } from "@/lib/notification-sequencing";
import { buildNotificationUrl, type NotificationSurface } from "@/lib/notification-routing";
import {
  loadNativePushTargets,
  loadEnabledNativePushTargets,
  isNativePushConfigured,
  sendNativePushRows,
  type NativePushMessagePayload,
  type NativePushFailureSample,
  type NativePushTargetRow,
} from "@/lib/native-push";

type PushRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  enabled: boolean;
  preferred_hour: number;
  preferred_local_hour: number | null;
  preferred_timezone: string | null;
  delivery_strategy: string | null;
  last_sent_at: string | null;
  last_gratitude_sent_at: string | null;
  language: string | null;
  region: string | null;
  bible_translation: string | null;
  voice_enabled: boolean | null;
  counsel_notifications_enabled?: boolean | null;
  formation_notifications_enabled?: boolean | null;
};

type NotificationRecipientRow = Pick<PushRow, "user_id" | "language" | "region" | "bible_translation" | "voice_enabled">;
type NotificationPreferenceRow = Pick<PushRow, "counsel_notifications_enabled" | "formation_notifications_enabled">;

export function notificationCronWindowKey(now: Date) {
  return now.toISOString().slice(0, 13);
}

export async function claimNotificationCronWindow(now: Date) {
  const windowKey = notificationCronWindowKey(now);
  const claimed = await one<{ window_key: string }>(
    `INSERT INTO notification_cron_runs (window_key, claimed_at)
     VALUES (?, ?)
     ON CONFLICT (window_key) DO NOTHING
     RETURNING window_key`,
    windowKey,
    now.toISOString()
  );
  return { claimed: Boolean(claimed), windowKey };
}

export async function completeNotificationCronWindow(windowKey: string, completedAt = new Date()) {
  await run(
    `UPDATE notification_cron_runs
     SET completed_at = ?
     WHERE window_key = ?`,
    completedAt.toISOString(),
    windowKey
  );
}

type ChallengeCircleNudgeTargetRow = {
  user_id: string;
};

type ChallengeCircleNudgePushInput = {
  circleId: string;
  challengeId: string;
  nudgeId: string;
  senderUserId: string;
  senderName: string | null;
  body: string;
  recipientUserId: string | null;
};

type CounselShareTargetRow = {
  recipient_user_id: string;
};

type CounselDecisionSharePushInput = {
  sharedDecisionId: string;
  contactId: string;
  decisionId: string;
  decisionTitle: string;
  senderUserId: string;
  senderName: string | null;
};

type CounselCommentPushInput = {
  notificationId: string;
  sharedDecisionId: string | null;
  contactId: string;
  decisionId: string;
  senderUserId: string;
  senderName: string | null;
  body: string;
  targetUserIds: string[];
  surface?: NotificationSurface | null;
};

type PendingDecisionNotificationRow = {
  id: string;
  decision_id: string;
  user_id: string;
  day: number;
  title: string;
  body: string;
};

type DeliveryStatus = "waiting_for_acceptance" | "sent_to_push_service" | "opened" | "partial" | "no_push_subscription" | "failed";

type CounselShareDeliveryReason = "no_push_subscription" | "disabled_push_subscription" | "push_failed" | "muted_by_preferences" | null;

export type CounselShareDeliverySummary = {
  id: string;
  sharedDecisionId: string;
  userId: string;
  contactId: string;
  decisionId: string;
  decisionTitle: string;
  status: DeliveryStatus;
  reason: CounselShareDeliveryReason;
  acceptedRecipientCount: number;
  pushSubscriptionCount: number;
  deliveredCount: number;
  failedCount: number;
  openedCount: number;
  attemptedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChallengeCircleNudgeDeliverySummary = {
  id: string;
  nudgeId: string;
  circleId: string;
  challengeId: string;
  senderUserId: string;
  recipientUserId: string | null;
  status: DeliveryStatus;
  reason: CounselShareDeliveryReason;
  acceptedRecipientCount: number;
  pushSubscriptionCount: number;
  deliveredCount: number;
  failedCount: number;
  openedCount: number;
  attemptedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PendingDecisionNotificationDeliverySummary = {
  attempted: number;
  sent: number;
  failed: number;
  pending: number;
  processed: number;
  failureSamples: PushFailureSample[];
};

type DueDecisionReminderRow = {
  id: string;
  user_id: string;
  title: string;
  waiting_until: string | Date | null;
  revisit_at: string | Date | null;
  waiting_due: boolean;
  revisit_due: boolean;
  language: string | null;
};

type ReminderKind = "waiting" | "revisit";

type DueDecisionReminder = {
  decisionId: string;
  userId: string;
  title: string;
  kind: ReminderKind;
  dueAt: string;
  language: LanguageCode;
};

type FastingProgressRow = {
  user_id: string;
  challenge_id: string;
  days_completed: string;
  last_completed_at: string;
};

type FastingCircleRow = {
  id: string;
  invite_details_json: unknown;
};

type ActiveChallengeProgressRow = {
  challengeId: string;
  daysCompleted: number;
  totalDays: number;
  lastCompletedAt: Date;
  fastingCircleId?: string;
  fastingInviteDetails?: FastingInviteDetails;
};

const DAILY_UNAUTHORIZED_METRIC_KEY = "daily_unauthorized_hits";
const GRATITUDE_REFLECTION_LOCAL_HOUR = 19;
const PUSH_DELIVERY_TIMEOUT_MS = Number(process.env.PUSH_DELIVERY_TIMEOUT_MS ?? 10000);
const PUSH_DELIVERY_MAX_ATTEMPTS = Math.max(1, Number(process.env.PUSH_DELIVERY_MAX_ATTEMPTS ?? 3));
const PUSH_DELIVERY_RETRY_BASE_DELAY_MS = Number(process.env.PUSH_DELIVERY_RETRY_BASE_DELAY_MS ?? 800);
const PUSH_DELIVERY_RETRY_JITTER_MS = Number(process.env.PUSH_DELIVERY_RETRY_JITTER_MS ?? 250);

type MetricRow = {
  metric_value: string | number;
};

type PushFailureSample = {
  id: string;
  userId: string;
  statusCode: number | null;
  reason: string;
  deleted: boolean;
};

type PushFailureKind = "endpoint_rejected" | "vapid_failure" | "retryable_failure" | "unknown_failure";

export type CounselCommentDeliverySummary = {
  id: string;
  commentId: string;
  sharedDecisionId: string;
  userId: string;
  contactId: string;
  decisionId: string;
  status: DeliveryStatus;
  reason: "no_recipient_row" | "no_active_subscription" | "vapid_failure" | "push_endpoint_rejected" | "push_failed" | "muted_by_preferences" | null;
  acceptedRecipientCount: number;
  pushSubscriptionCount: number;
  deliveredCount: number;
  failedCount: number;
  openedCount: number;
  attemptedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationHealthSnapshot = {
  enabledSubscriptions: number;
  dueNow: number;
  scanned: number;
  unauthorizedHits: number;
  hourUtc: number;
  generatedAt: string;
};

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
}

function decodeBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function getVapidKeyPairStatus() {
  const publicKey = getVapidPublicKey().trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
  const subject = getVapidSubject();

  if (!publicKey || !privateKey || !subject) {
    return {
      configured: false,
      keyPairValid: false,
      reason: "missing_vapid_env",
    };
  }

  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(decodeBase64Url(privateKey));
    const derivedPublicKey = ecdh.getPublicKey();
    const configuredPublicKey = decodeBase64Url(publicKey);
    const keyPairValid =
      configuredPublicKey.length === derivedPublicKey.length &&
      timingSafeEqual(configuredPublicKey, derivedPublicKey);

    return {
      configured: true,
      keyPairValid,
      reason: keyPairValid ? "ok" : "public_private_mismatch",
    };
  } catch {
    return {
      configured: true,
      keyPairValid: false,
      reason: "invalid_vapid_key_format",
    };
  }
}

export function getVapidSubject() {
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (subject) {
    return subject;
  }
  const claimEmail = process.env.VAPID_CLAIM_EMAIL?.trim();
  if (!claimEmail) {
    return "";
  }
  return claimEmail.startsWith("mailto:") ? claimEmail : `mailto:${claimEmail}`;
}

export function isPushConfigured() {
  const status = getVapidKeyPairStatus();
  return status.configured && status.keyPairValid;
}

export function configureWebPush() {
  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = getVapidSubject();

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Web Push is not configured. Add VAPID keys to the environment.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

const counselDecisionSharedNotificationCopyByLanguage: Partial<Record<LanguageCode, { title: string; body: string }>> = {
  en: {
    title: "New activity on a shared decision",
    body: "Open Aletheia to review the shared decision and private counsel.",
  },
  de: {
    title: "Neue Aktivität bei einer geteilten Entscheidung",
    body: "Öffne Aletheia, um die geteilte Entscheidung und die private Beratung zu prüfen.",
  },
  fr: {
    title: "Nouvelle activité sur une décision partagée",
    body: "Ouvre Aletheia pour consulter la décision partagée et le conseil privé.",
  },
  es: {
    title: "Nueva actividad en una decisión compartida",
    body: "Abre Aletheia para revisar la decisión compartida y el consejo privado.",
  },
  pt: {
    title: "Nova atividade em uma decisão compartilhada",
    body: "Abra o Aletheia para revisar a decisão compartilhada e o conselho privado.",
  },
  ar: {
    title: "نشاط جديد على قرار مشترك",
    body: "افتح Aletheia لمراجعة القرار المشترك والمشورة الخاصة.",
  },
  hi: {
    title: "साझा निर्णय पर नई गतिविधि",
    body: "साझा निर्णय और निजी सलाह की समीक्षा करने के लिए Aletheia खोलें।",
  },
  tl: {
    title: "Bagong aktibidad sa isang pinagsasaluhang pasya",
    body: "Buksan ang Aletheia para repasuhin ang pinagsasaluhang pasya at pribadong payo.",
  },
  yo: {
    title: "Ìṣe tuntun lórí ìpinnu tí a pín",
    body: "Ṣí Aletheia láti tún wo ìpinnu tí a pín àti ìmọ̀ràn aláìkọ̀kọ̀.",
  },
  ig: {
    title: "Ọrụ ọhụrụ na mkpebi e kesara",
    body: "Mepee Aletheia ka i nyochaa mkpebi e kesara na ndụmọdụ nke onwe.",
  },
  ha: {
    title: "Sabuwar aiki a kan shawarar da aka raba",
    body: "Buɗe Aletheia don duba shawarar da aka raba da kuma shawara ta sirri.",
  },
};

const counselCommentNotificationCopyByLanguage: Partial<Record<LanguageCode, { title: string; body: string }>> = {
  en: {
    title: "New private comment",
    body: "Open Aletheia to read the latest message on your shared decision.",
  },
  de: {
    title: "Neuer privater Kommentar",
    body: "Öffne Aletheia, um die neueste Nachricht zu deiner geteilten Entscheidung zu lesen.",
  },
  fr: {
    title: "Nouveau commentaire privé",
    body: "Ouvre Aletheia pour lire le dernier message sur votre décision partagée.",
  },
  es: {
    title: "Nuevo comentario privado",
    body: "Abre Aletheia para leer el último mensaje sobre tu decisión compartida.",
  },
  pt: {
    title: "Novo comentário privado",
    body: "Abra o Aletheia para ler a mensagem mais recente sobre sua decisão compartilhada.",
  },
  ar: {
    title: "تعليق خاص جديد",
    body: "افتح Aletheia لقراءة أحدث رسالة حول قرارك المشترك.",
  },
  hi: {
    title: "नई निजी टिप्पणी",
    body: "अपना साझा निर्णय देखने के लिए Aletheia खोलें और नया संदेश पढ़ें।",
  },
  tl: {
    title: "Bagong pribadong komento",
    body: "Buksan ang Aletheia para basahin ang pinakabagong mensahe sa iyong pinagsasaluhang pasya.",
  },
  yo: {
    title: "Ọ̀rọ̀ àdáni tuntun",
    body: "Ṣí Aletheia láti ka ifiranṣẹ tuntun lori ìpinnu tí o pín.",
  },
  ig: {
    title: "Nkwuputa nke onwe ọhụrụ",
    body: "Mepee Aletheia ka i gụọ ozi ọhụrụ banyere mkpebi gị e kesara.",
  },
  ha: {
    title: "Sabon sharhi na sirri",
    body: "Buɗe Aletheia don karanta sabon saƙo game da shawarar da kuka raba.",
  },
};

const challengeCircleNudgeNotificationCopyByLanguage: Partial<Record<LanguageCode, { title: string; body: string }>> = {
  en: {
    title: "New activity in your circle",
    body: "Open Aletheia to review the latest circle nudge.",
  },
  de: {
    title: "Neue Aktivität in deinem Kreis",
    body: "Öffne Aletheia, um den neuesten Anstoß im Kreis zu sehen.",
  },
  fr: {
    title: "Nouvelle activité dans votre cercle",
    body: "Ouvre Aletheia pour consulter le dernier rappel du cercle.",
  },
  es: {
    title: "Nueva actividad en tu círculo",
    body: "Abre Aletheia para revisar el último aviso del círculo.",
  },
  pt: {
    title: "Nova atividade no seu círculo",
    body: "Abra o Aletheia para ver o último incentivo do círculo.",
  },
  ar: {
    title: "نشاط جديد في دائرتك",
    body: "افتح Aletheia لمراجعة آخر تنبيه في الدائرة.",
  },
  hi: {
    title: "आपके सर्कल में नई गतिविधि",
    body: "Aletheia खोलकर सर्कल का नया चेक-इन देखें।",
  },
  tl: {
    title: "Bagong aktibidad sa iyong circle",
    body: "Buksan ang Aletheia para tingnan ang pinakabagong check-in ng circle.",
  },
  yo: {
    title: "Ìṣe tuntun nínú ẹgbẹ́ rẹ",
    body: "Ṣí Aletheia láti ṣàyẹ̀wò ìfọkànsìn tuntun jù lọ nínú ẹgbẹ́.",
  },
  ig: {
    title: "Ọrụ ọhụrụ n'okirikiri gị",
    body: "Mepee Aletheia ka i nyochaa check-in ọhụrụ nke okirikiri.",
  },
  ha: {
    title: "Sabuwar aiki a cikin da'irarka",
    body: "Buɗe Aletheia don duba sabon sakon dubawa na da'irar.",
  },
};

function counselNotificationsEnabled(row: NotificationPreferenceRow) {
  return row.counsel_notifications_enabled !== false;
}

function formationNotificationsEnabled(row: NotificationPreferenceRow) {
  return row.formation_notifications_enabled !== false;
}

function challengeCircleNudgeNotificationTitle(language: LanguageCode) {
  return challengeCircleNudgeNotificationCopyByLanguage[language]?.title ?? challengeCircleNudgeNotificationCopyByLanguage.en!.title;
}

function challengeCircleNudgeNotificationPayload(row: NotificationRecipientRow, input: ChallengeCircleNudgePushInput) {
  const preferences = normalizePreferences({
    language: row.language as LanguageCode,
    region: row.region as RegionCode,
    bibleTranslation: row.bible_translation as BibleTranslation,
    voiceEnabled: Boolean(row.voice_enabled),
  });

  return {
    title: challengeCircleNudgeNotificationTitle(preferences.language),
    body: challengeCircleNudgeNotificationCopyByLanguage[preferences.language]?.body ?? challengeCircleNudgeNotificationCopyByLanguage.en!.body,
    url: buildNotificationUrl({
      notificationKind: "challenge_circle_nudge",
      notificationId: input.nudgeId,
      focus: "challenge",
      challengeId: input.challengeId,
      circleId: input.circleId,
      nudgeId: input.nudgeId,
      tab: "reflect",
      section: "nudges",
    }),
    tag: `aletheia-circle-nudge-${input.circleId}-${input.nudgeId}-${row.user_id}`,
    notificationKind: "challenge_circle_nudge",
    notificationId: input.nudgeId,
    circleId: input.circleId,
    challengeId: input.challengeId,
    nudgeId: input.nudgeId,
    senderUserId: input.senderUserId,
    recipientUserId: row.user_id,
  };
}

function counselShareNotificationTitle(language: LanguageCode) {
  return counselDecisionSharedNotificationCopyByLanguage[language]?.title ?? counselDecisionSharedNotificationCopyByLanguage.en!.title;
}

function counselShareNotificationPayload(row: NotificationRecipientRow, input: CounselDecisionSharePushInput) {
  const preferences = normalizePreferences({
    language: row.language as LanguageCode,
    region: row.region as RegionCode,
    bibleTranslation: row.bible_translation as BibleTranslation,
    voiceEnabled: Boolean(row.voice_enabled),
  });
  const title = counselShareNotificationTitle(preferences.language);
  const body = counselDecisionSharedNotificationCopyByLanguage[preferences.language]?.body ?? counselDecisionSharedNotificationCopyByLanguage.en!.body;

  return {
    title,
    body,
    url: buildNotificationUrl({
      notificationKind: "counsel_decision_shared",
      notificationId: input.sharedDecisionId,
      focus: "decision",
      decisionId: input.decisionId,
      sharedDecisionId: input.sharedDecisionId,
      contactId: input.contactId,
      surface: "incoming",
      open: "thread",
      tab: "decisions",
      section: "share",
    }),
    tag: `aletheia-counsel-share-${input.sharedDecisionId}-${row.user_id}`,
    notificationKind: "counsel_decision_shared",
    notificationId: input.sharedDecisionId,
    sharedDecisionId: input.sharedDecisionId,
    contactId: input.contactId,
    decisionId: input.decisionId,
    senderUserId: input.senderUserId,
    recipientUserId: row.user_id,
  };
}

function counselCommentNotificationTitle(language: LanguageCode) {
  return counselCommentNotificationCopyByLanguage[language]?.title ?? counselCommentNotificationCopyByLanguage.en!.title;
}

function counselCommentNotificationPayload(row: NotificationRecipientRow, input: CounselCommentPushInput) {
  const preferences = normalizePreferences({
    language: row.language as LanguageCode,
    region: row.region as RegionCode,
    bibleTranslation: row.bible_translation as BibleTranslation,
    voiceEnabled: Boolean(row.voice_enabled),
  });
  const title = counselCommentNotificationTitle(preferences.language);
  const body =
    counselCommentNotificationCopyByLanguage[preferences.language]?.body ??
    counselCommentNotificationCopyByLanguage.en!.body;

  const url = buildNotificationUrl({
    notificationKind: "counsel_comment",
    notificationId: input.notificationId,
    focus: "decision",
    decisionId: input.decisionId,
    sharedDecisionId: input.sharedDecisionId,
    contactId: input.contactId,
    surface: input.surface ?? "incoming",
    open: "comment",
    tab: "decisions",
    section: "share",
  });

  return {
    title,
    body,
    url,
    tag: `aletheia-counsel-comment-${notificationTagPart(input.notificationId)}-${row.user_id}`,
    notificationKind: "counsel_comment",
    notificationId: input.notificationId,
    sharedDecisionId: input.sharedDecisionId,
    contactId: input.contactId,
    decisionId: input.decisionId,
    senderUserId: input.senderUserId,
    recipientUserId: row.user_id,
  };
}

async function upsertCounselShareDelivery(summary: CounselShareDeliverySummary) {
  const now = new Date().toISOString();
  await run(
    `INSERT INTO counsel_shared_decision_deliveries (
       id, shared_decision_id, user_id, contact_id, decision_id, status, status_reason,
       accepted_recipient_count, push_subscription_count, delivered_count, failed_count,
       attempted_at, delivered_at, created_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (shared_decision_id)
     DO UPDATE SET
       user_id = EXCLUDED.user_id,
       contact_id = EXCLUDED.contact_id,
       decision_id = EXCLUDED.decision_id,
       status = EXCLUDED.status,
       status_reason = EXCLUDED.status_reason,
       accepted_recipient_count = EXCLUDED.accepted_recipient_count,
       push_subscription_count = EXCLUDED.push_subscription_count,
       delivered_count = EXCLUDED.delivered_count,
       failed_count = EXCLUDED.failed_count,
       attempted_at = EXCLUDED.attempted_at,
       delivered_at = EXCLUDED.delivered_at,
       updated_at = EXCLUDED.updated_at`,
    summary.id,
    summary.sharedDecisionId,
    summary.userId,
    summary.contactId,
    summary.decisionId,
    summary.status,
    summary.reason,
    summary.acceptedRecipientCount,
    summary.pushSubscriptionCount,
    summary.deliveredCount,
    summary.failedCount,
    summary.attemptedAt,
    summary.deliveredAt,
    summary.createdAt,
    now
  );
}

async function upsertChallengeCircleNudgeDelivery(summary: ChallengeCircleNudgeDeliverySummary) {
  const now = new Date().toISOString();
  await run(
    `INSERT INTO challenge_circle_nudge_deliveries (
       id, nudge_id, circle_id, challenge_id, sender_user_id, recipient_user_id, status, status_reason,
       accepted_recipient_count, push_subscription_count, delivered_count, failed_count,
       attempted_at, delivered_at, created_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (nudge_id)
     DO UPDATE SET
       circle_id = EXCLUDED.circle_id,
       challenge_id = EXCLUDED.challenge_id,
       sender_user_id = EXCLUDED.sender_user_id,
       recipient_user_id = EXCLUDED.recipient_user_id,
       status = EXCLUDED.status,
       status_reason = EXCLUDED.status_reason,
       accepted_recipient_count = EXCLUDED.accepted_recipient_count,
       push_subscription_count = EXCLUDED.push_subscription_count,
       delivered_count = EXCLUDED.delivered_count,
       failed_count = EXCLUDED.failed_count,
       attempted_at = EXCLUDED.attempted_at,
       delivered_at = EXCLUDED.delivered_at,
       updated_at = EXCLUDED.updated_at`,
    summary.id,
    summary.nudgeId,
    summary.circleId,
    summary.challengeId,
    summary.senderUserId,
    summary.recipientUserId,
    summary.status,
    summary.reason,
    summary.acceptedRecipientCount,
    summary.pushSubscriptionCount,
    summary.deliveredCount,
    summary.failedCount,
    summary.attemptedAt,
    summary.deliveredAt,
    summary.createdAt,
    now
  );
}

async function upsertCounselCommentDelivery(summary: CounselCommentDeliverySummary) {
  const now = new Date().toISOString();
  await run(
    `INSERT INTO counsel_comment_deliveries (
       id, comment_id, shared_decision_id, contact_id, decision_id, sender_user_id, status, status_reason,
       accepted_recipient_count, push_subscription_count, delivered_count, failed_count,
       attempted_at, delivered_at, created_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (comment_id)
     DO UPDATE SET
       shared_decision_id = EXCLUDED.shared_decision_id,
       contact_id = EXCLUDED.contact_id,
       decision_id = EXCLUDED.decision_id,
       sender_user_id = EXCLUDED.sender_user_id,
       status = EXCLUDED.status,
       status_reason = EXCLUDED.status_reason,
       accepted_recipient_count = EXCLUDED.accepted_recipient_count,
       push_subscription_count = EXCLUDED.push_subscription_count,
       delivered_count = EXCLUDED.delivered_count,
       failed_count = EXCLUDED.failed_count,
       attempted_at = EXCLUDED.attempted_at,
       delivered_at = EXCLUDED.delivered_at,
       updated_at = EXCLUDED.updated_at`,
    summary.id,
    summary.commentId,
    summary.sharedDecisionId,
    summary.contactId,
    summary.decisionId,
    summary.userId,
    summary.status,
    summary.reason,
    summary.acceptedRecipientCount,
    summary.pushSubscriptionCount,
    summary.deliveredCount,
    summary.failedCount,
    summary.attemptedAt,
    summary.deliveredAt,
    summary.createdAt,
    now
  );
}

async function targetRecipientsForCounselShare(contactId: string) {
  return many<CounselShareTargetRow>(
    `SELECT DISTINCT recipient_user_id
     FROM counsel_invite_acceptances
     WHERE contact_id = ?
       AND recipient_user_id IS NOT NULL
     ORDER BY recipient_user_id`,
    contactId
  );
}

async function pushSubscriptionsForUsers(userIds: string[]) {
  if (!userIds.length) {
    return [];
  }

  return many<PushRow>(
    `SELECT push_subscriptions.id, push_subscriptions.user_id, endpoint, p256dh, auth, push_subscriptions.enabled, preferred_hour, last_sent_at,
            preferred_local_hour, preferred_timezone, delivery_strategy, last_gratitude_sent_at,
            user_preferences.language, user_preferences.region, user_preferences.bible_translation, user_preferences.voice_enabled,
            user_preferences.counsel_notifications_enabled, user_preferences.formation_notifications_enabled
     FROM push_subscriptions
     LEFT JOIN user_preferences ON user_preferences.user_id = push_subscriptions.user_id
     WHERE push_subscriptions.user_id = ANY(?)`,
    userIds
  );
}

function splitPushSubscriptionRows(rows: PushRow[], recipientUserIds: string[]) {
  const enabledRows = rows.filter((row) => row.enabled);
  const enabledUserIds = new Set(enabledRows.map((row) => row.user_id));
  const activeRecipients = new Set(enabledUserIds);
  const missingActiveRecipientCount = recipientUserIds.filter((recipientUserId) => !activeRecipients.has(recipientUserId)).length;
  const disabledUserIds = new Set(rows.filter((row) => !row.enabled).map((row) => row.user_id));

  return {
    enabledRows,
    enabledRecipientCount: enabledUserIds.size,
    disabledRecipientCount: disabledUserIds.size,
    missingActiveRecipientCount,
  };
}

function splitNativePushTargetRows(rows: NativePushTargetRow[], recipientUserIds: string[]) {
  const enabledRows = rows.filter((row) => row.enabled);
  const enabledUserIds = new Set(enabledRows.map((row) => row.user_id));
  const activeRecipients = new Set(enabledUserIds);
  const missingActiveRecipientCount = recipientUserIds.filter((recipientUserId) => !activeRecipients.has(recipientUserId)).length;
  const disabledUserIds = new Set(rows.filter((row) => !row.enabled).map((row) => row.user_id));

  return {
    enabledRows,
    enabledRecipientCount: enabledUserIds.size,
    disabledRecipientCount: disabledUserIds.size,
    missingActiveRecipientCount,
  };
}

function asPushRow(row: NativePushTargetRow): PushRow {
  return row as unknown as PushRow;
}

async function sendNativePushFanOut(
  userIds: string[],
  filterRow: (row: NativePushTargetRow) => boolean,
  payloadForRow: (row: NativePushTargetRow) => NativePushMessagePayload
) {
  if (!isNativePushConfigured() || userIds.length === 0) {
    return {
      configured: isNativePushConfigured(),
      attempted: 0,
      sent: 0,
      failed: 0,
      failureSamples: [] as NativePushFailureSample[],
    };
  }

  const nativeRows = await loadNativePushTargets(userIds);
  const { enabledRows } = splitNativePushTargetRows(nativeRows, userIds);
  const nativeEligibleRows = enabledRows.filter(filterRow);
  return sendNativePushRows(nativeEligibleRows, payloadForRow);
}

export async function sendCounselShareNotifications(input: CounselDecisionSharePushInput) {
  const acceptedRecipients = await targetRecipientsForCounselShare(input.contactId);
  const acceptedRecipientIds = acceptedRecipients.map((row) => row.recipient_user_id);

  if (acceptedRecipientIds.length === 0) {
    const now = new Date().toISOString();
    const summary: CounselShareDeliverySummary = {
      id: crypto.randomUUID(),
      sharedDecisionId: input.sharedDecisionId,
      userId: input.senderUserId,
      contactId: input.contactId,
      decisionId: input.decisionId,
      decisionTitle: input.decisionTitle,
      status: "waiting_for_acceptance",
      reason: null,
      acceptedRecipientCount: 0,
      pushSubscriptionCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      openedCount: 0,
      attemptedAt: null,
      deliveredAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await upsertCounselShareDelivery(summary);
    return summary;
  }

  const pushRows = await pushSubscriptionsForUsers(acceptedRecipientIds);
  const { enabledRows, disabledRecipientCount } = splitPushSubscriptionRows(pushRows, acceptedRecipientIds);
  const eligibleRows = enabledRows.filter((row) => counselNotificationsEnabled(row));
  const rowsByRecipient = new Map<string, PushRow[]>();
  for (const row of eligibleRows) {
    const bucket = rowsByRecipient.get(row.user_id) ?? [];
    bucket.push(row);
    rowsByRecipient.set(row.user_id, bucket);
  }

  const recipientsWithoutPush = acceptedRecipientIds.filter((recipientUserId) => !rowsByRecipient.has(recipientUserId));
  const recipientsMutedByPreference = acceptedRecipientIds.filter(
    (recipientUserId) =>
      enabledRows.some((row) => row.user_id === recipientUserId) && !rowsByRecipient.has(recipientUserId)
  );
  const eligibleRecipientCount = new Set(eligibleRows.map((row) => row.user_id)).size;
  const attemptedAt = new Date().toISOString();
  let deliveredCount = 0;
  let failedCount = 0;
  const openedCount = 0;
  let status: DeliveryStatus = "sent_to_push_service";
  let reason: CounselShareDeliveryReason = recipientsMutedByPreference.length > 0
    ? "muted_by_preferences"
    : recipientsWithoutPush.length > 0
      ? disabledRecipientCount > 0
        ? "disabled_push_subscription"
        : "no_push_subscription"
      : null;

  if (eligibleRows.length > 0) {
    try {
      configureWebPush();
      const { sent, failed } = await sendPushRows(
        eligibleRows,
        (row) => JSON.stringify(counselShareNotificationPayload(row, input)),
        { lastSentColumn: null }
      );
      deliveredCount = sent;
      failedCount = failed;

      if (sent > 0 && failed === 0 && recipientsWithoutPush.length === 0) {
        status = "sent_to_push_service";
        reason = recipientsMutedByPreference.length > 0 ? "muted_by_preferences" : null;
      } else if (sent > 0 && (failed > 0 || recipientsWithoutPush.length > 0 || recipientsMutedByPreference.length > 0)) {
        status = "partial";
        reason = recipientsMutedByPreference.length > 0
          ? "muted_by_preferences"
          : recipientsWithoutPush.length > 0
            ? disabledRecipientCount > 0
              ? "disabled_push_subscription"
              : "no_push_subscription"
            : "push_failed";
      } else if (failed > 0) {
        status = "failed";
        reason = "push_failed";
      } else if (recipientsMutedByPreference.length > 0 || recipientsWithoutPush.length > 0) {
        status = "no_push_subscription";
        reason = recipientsMutedByPreference.length > 0
          ? "muted_by_preferences"
          : disabledRecipientCount > 0
            ? "disabled_push_subscription"
            : "no_push_subscription";
      } else {
        status = "sent_to_push_service";
        reason = null;
      }
    } catch {
      deliveredCount = 0;
      failedCount = eligibleRows.length;
      status = "failed";
      reason = "push_failed";
    }
  } else if (disabledRecipientCount > 0 || recipientsMutedByPreference.length > 0) {
    status = "no_push_subscription";
    reason = recipientsMutedByPreference.length > 0 ? "muted_by_preferences" : "disabled_push_subscription";
  }

  const summary: CounselShareDeliverySummary = {
    id: crypto.randomUUID(),
    sharedDecisionId: input.sharedDecisionId,
    userId: input.senderUserId,
    contactId: input.contactId,
    decisionId: input.decisionId,
    decisionTitle: input.decisionTitle,
    status,
    reason,
    acceptedRecipientCount: acceptedRecipientIds.length,
    pushSubscriptionCount: eligibleRecipientCount,
    deliveredCount,
    failedCount,
    openedCount,
    attemptedAt,
    deliveredAt: deliveredCount > 0 ? attemptedAt : null,
    createdAt: attemptedAt,
    updatedAt: attemptedAt,
  };

  await upsertCounselShareDelivery(summary);
  await sendNativePushFanOut(
    acceptedRecipientIds,
    (row) => counselNotificationsEnabled(row),
    (row) => counselShareNotificationPayload(row, input)
  );
  return summary;
}

export async function sendCounselCommentNotifications(input: CounselCommentPushInput) {
  const uniqueTargetIds = [...new Set(input.targetUserIds.map((id) => id.trim()).filter(Boolean))];
  const now = new Date().toISOString();
  const configured = isPushConfigured();

  if (uniqueTargetIds.length === 0) {
    await upsertCounselCommentDelivery({
      id: crypto.randomUUID(),
      commentId: input.notificationId,
      sharedDecisionId: input.sharedDecisionId ?? input.notificationId,
      contactId: input.contactId,
      decisionId: input.decisionId,
      userId: input.senderUserId,
      status: "no_push_subscription",
      reason: "no_recipient_row",
      acceptedRecipientCount: 0,
      pushSubscriptionCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      openedCount: 0,
      attemptedAt: null,
      deliveredAt: null,
      createdAt: now,
      updatedAt: now,
    });
    return {
      configured,
      attempted: 0,
      sent: 0,
      failed: 0,
      failureSamples: [],
    };
  }

  if (!configured) {
    await upsertCounselCommentDelivery({
      id: crypto.randomUUID(),
      commentId: input.notificationId,
      sharedDecisionId: input.sharedDecisionId ?? input.notificationId,
      contactId: input.contactId,
      decisionId: input.decisionId,
      userId: input.senderUserId,
      status: "failed",
      reason: "vapid_failure",
      acceptedRecipientCount: uniqueTargetIds.length,
      pushSubscriptionCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      openedCount: 0,
      attemptedAt: null,
      deliveredAt: null,
      createdAt: now,
      updatedAt: now,
    });
    return {
      configured: false,
      attempted: 0,
      sent: 0,
      failed: 0,
      failureSamples: [],
    };
  }

  try {
    configureWebPush();
    const pushRows = await pushSubscriptionsForUsers(uniqueTargetIds);
    const { enabledRows, missingActiveRecipientCount, disabledRecipientCount } = splitPushSubscriptionRows(pushRows, uniqueTargetIds);
    const eligibleRows = enabledRows.filter((row) => counselNotificationsEnabled(row));
    const eligibleRecipientCount = new Set(eligibleRows.map((row) => row.user_id)).size;
    const attemptedAt = new Date().toISOString();
    let deliveredCount = 0;
    let failedCount = 0;
    let status: DeliveryStatus = "sent_to_push_service";
    let reason: CounselCommentDeliverySummary["reason"] = null;

    if (eligibleRows.length > 0) {
      const result = await sendPushRows(
        eligibleRows,
        (row) => JSON.stringify(counselCommentNotificationPayload(row, input)),
        { lastSentColumn: null }
      );
      deliveredCount = result.sent;
      failedCount = result.failed;

      const failureReasons = result.failureSamples.map((sample) => {
        const normalized = sample.reason.toLowerCase();
        if (sample.deleted && (sample.statusCode === 404 || sample.statusCode === 410)) {
          return "push_endpoint_rejected" as const;
        }
        if (normalized.includes("vapid")) {
          return "vapid_failure" as const;
        }
        return "push_failed" as const;
      });

      if (result.sent > 0 && result.failed === 0 && missingActiveRecipientCount === 0) {
        status = "sent_to_push_service";
        reason = null;
      } else if (result.sent > 0 || missingActiveRecipientCount > 0) {
        status = "partial";
        reason = failureReasons.includes("push_endpoint_rejected")
          ? "push_endpoint_rejected"
          : failureReasons.includes("vapid_failure")
            ? "vapid_failure"
            : missingActiveRecipientCount > 0
              ? "no_active_subscription"
              : disabledRecipientCount > 0
                ? "muted_by_preferences"
                : result.failed > 0
                  ? "push_failed"
                  : null;
      } else if (result.failed > 0) {
        status = "failed";
        reason = failureReasons.includes("push_endpoint_rejected")
          ? "push_endpoint_rejected"
          : failureReasons.includes("vapid_failure")
            ? "vapid_failure"
            : "push_failed";
      } else if (disabledRecipientCount > 0 || missingActiveRecipientCount > 0) {
        status = "no_push_subscription";
        reason = disabledRecipientCount > 0 ? "muted_by_preferences" : "no_active_subscription";
      }

      await upsertCounselCommentDelivery({
        id: crypto.randomUUID(),
        commentId: input.notificationId,
        sharedDecisionId: input.sharedDecisionId ?? input.notificationId,
        contactId: input.contactId,
        decisionId: input.decisionId,
        userId: input.senderUserId,
        status,
        reason,
        acceptedRecipientCount: uniqueTargetIds.length,
        pushSubscriptionCount: eligibleRecipientCount,
        deliveredCount,
        failedCount,
        openedCount: 0,
        attemptedAt,
        deliveredAt: deliveredCount > 0 ? attemptedAt : null,
        createdAt: attemptedAt,
        updatedAt: attemptedAt,
      });

      await sendNativePushFanOut(
        uniqueTargetIds,
        (row) => counselNotificationsEnabled(row),
        (row) => counselCommentNotificationPayload(row, input)
      );

      return {
        configured: true,
        attempted: eligibleRows.length,
        sent: deliveredCount,
        failed: failedCount,
        failureSamples: result.failureSamples,
      };
    }

    reason = enabledRows.length > 0 ? "muted_by_preferences" : missingActiveRecipientCount > 0 ? "no_active_subscription" : null;
    status = reason ? "no_push_subscription" : "sent_to_push_service";

    await upsertCounselCommentDelivery({
      id: crypto.randomUUID(),
      commentId: input.notificationId,
      sharedDecisionId: input.sharedDecisionId ?? input.notificationId,
      contactId: input.contactId,
      decisionId: input.decisionId,
      userId: input.senderUserId,
      status,
      reason,
      acceptedRecipientCount: uniqueTargetIds.length,
      pushSubscriptionCount: eligibleRecipientCount,
      deliveredCount: 0,
      failedCount: 0,
      openedCount: 0,
      attemptedAt: null,
      deliveredAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await sendNativePushFanOut(
      uniqueTargetIds,
      (row) => counselNotificationsEnabled(row),
      (row) => counselCommentNotificationPayload(row, input)
    );

    return {
      configured: true,
      attempted: 0,
      sent: 0,
      failed: 0,
      failureSamples: [],
    };
  } catch {
    await upsertCounselCommentDelivery({
      id: crypto.randomUUID(),
      commentId: input.notificationId,
      sharedDecisionId: input.sharedDecisionId ?? input.notificationId,
      contactId: input.contactId,
      decisionId: input.decisionId,
      userId: input.senderUserId,
      status: "failed",
      reason: "push_failed",
      acceptedRecipientCount: uniqueTargetIds.length,
      pushSubscriptionCount: 0,
      deliveredCount: 0,
      failedCount: uniqueTargetIds.length,
      openedCount: 0,
      attemptedAt: now,
      deliveredAt: null,
      createdAt: now,
      updatedAt: now,
    });
    return {
      configured: true,
      attempted: uniqueTargetIds.length,
      sent: 0,
      failed: uniqueTargetIds.length,
      failureSamples: [],
    };
  }
}

function dailyNotificationPayload(row: PushRow, wisdomEntries: Awaited<ReturnType<typeof getWisdomEntries>>) {
  const now = new Date();
  const localHour = localHourForTimezone(now, row.preferred_timezone);
  const index = dailyWisdomIndex(row, wisdomEntries.length, now);
  const wisdom = wisdomEntries[index];
  const preferences = normalizePreferences({
    language: row.language as LanguageCode,
    region: row.region as RegionCode,
    bibleTranslation: row.bible_translation as BibleTranslation,
    voiceEnabled: Boolean(row.voice_enabled),
  });
  const dailyMode: Mode = [MODE_KEYS.MONEY, MODE_KEYS.WORK, MODE_KEYS.PURPOSE, MODE_KEYS.GENEROSITY, MODE_KEYS.LIFE].includes(wisdom.theme as Mode)
    ? (wisdom.theme as Mode)
    : MODE_KEYS.MONEY;
  const daily = localizedDailyWisdom(wisdom, dailyMode, preferences);
  const localDate = localDateForTimezone(now, row.preferred_timezone);
  const campaignArchetype = weeklyCampaignArchetype(localDate);
  const variant = stableHash(`${row.user_id}:${localDate}:${daily.scripture}:${daily.theme}`) % 6;
  const title = buildDailyNotificationTitle({
    language: preferences.language,
    label: daily.label,
    theme: daily.theme,
    scripture: daily.scripture,
    variant,
  });
  const body = buildDailyNotificationBody({
    language: preferences.language,
    theme: daily.theme,
    practice: daily.practice,
    scripture: daily.scripture,
    principle: daily.principle,
    variant,
  });
  const opener = campaignArchetypeOpener(preferences.language, campaignArchetype, variant);
  const campaignBody = compactNotificationCopy(`${opener} ${body}`, 164);
  const premiumBody = appendPremiumCloser(campaignBody, preferences.language, variant, localHour, premiumDailyClosers);
  return {
    title,
    body: premiumBody,
    url: buildNotificationUrl({
      notificationKind: "daily_wisdom",
      notificationId: `daily-${row.user_id}-${notificationTagPart(localDate)}-${index}`,
      focus: "today",
    }),
    scripture: daily.scripture,
    tag: `aletheia-daily-${notificationTagPart(localDate)}-${index}`,
    notificationId: `daily-${row.user_id}-${notificationTagPart(localDate)}-${index}`,
    notificationKind: "daily_wisdom",
    wisdomTheme: wisdom.theme,
    campaignArchetype,
  };
}

function gratitudeNotificationPayload(row: PushRow) {
  const preferences = normalizePreferences({
    language: row.language as LanguageCode,
    region: row.region as RegionCode,
    bibleTranslation: row.bible_translation as BibleTranslation,
    voiceEnabled: Boolean(row.voice_enabled),
  });
  const now = new Date();
  const localHour = localHourForTimezone(now, row.preferred_timezone);
  const localDate = localDateForTimezone(now, row.preferred_timezone);
  const copy = gratitudeNotificationCopy[preferences.language] ?? gratitudeNotificationCopy.en!;
  const variant = stableHash(`${row.user_id}:${localDate}:gratitude`) % copy.titles.length;
  const body = compactNotificationCopy(copy.bodies[variant](), 136);

  return {
    title: compactNotificationCopy(copy.titles[variant](), 68),
    body: appendPremiumCloser(body, preferences.language, variant, localHour, premiumGratitudeClosers),
    url: buildNotificationUrl({
      notificationKind: "gratitude_reflection",
      notificationId: `gratitude-${row.user_id}-${notificationTagPart(localDate)}`,
      focus: "gratitude",
    }),
    tag: `aletheia-gratitude-${notificationTagPart(localDate)}`,
    notificationId: `gratitude-${row.user_id}-${notificationTagPart(localDate)}`,
    notificationKind: "gratitude_reflection",
  };
}

function stableHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function normalizeTimestamp(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}

function dailyWisdomIndex(row: PushRow, size: number, now: Date) {
  return selectDailyWisdomIndex({
    dayNumber: Number(localDateForTimezone(now, row.preferred_timezone).replace(/-/g, "")),
    size,
    seedParts: [row.user_id, row.language || "", row.bible_translation || ""],
  });
}

function compactNotificationCopy(copy: string, max = 140) {
  const cleaned = copy.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function calculatePushRetryDelayMs(attempt: number) {
  const boundedAttempt = Math.max(1, Math.floor(attempt));
  const baseDelay = PUSH_DELIVERY_RETRY_BASE_DELAY_MS * Math.pow(2, boundedAttempt - 1);
  const jitterSpan = Math.max(0, PUSH_DELIVERY_RETRY_JITTER_MS);
  const jitter = jitterSpan > 0 ? Math.round((Math.random() * 2 - 1) * jitterSpan) : 0;
  return Math.max(0, baseDelay + jitter);
}

function pushErrorStatusCode(error: unknown) {
  if (typeof error !== "object" || !error || !("statusCode" in error)) {
    return null;
  }
  const statusCode = Number((error as { statusCode?: unknown }).statusCode);
  return Number.isFinite(statusCode) ? statusCode : null;
}

function isRetryablePushError(error: unknown) {
  const statusCode = pushErrorStatusCode(error);
  if (statusCode !== null) {
    return statusCode === 408 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
  }

  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("econnreset") ||
    normalized.includes("econnrefused") ||
    normalized.includes("eai_again") ||
    normalized.includes("etimedout")
  );
}

async function sendNotificationWithTimeout(subscription: PushSubscription, payload: string) {
  return new Promise<unknown>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(`Push notification timeout after ${PUSH_DELIVERY_TIMEOUT_MS}ms`)), PUSH_DELIVERY_TIMEOUT_MS);
    webpush
      .sendNotification(subscription, payload)
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

export async function sendNotificationWithRetry(subscription: PushSubscription, payload: string) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= PUSH_DELIVERY_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await sendNotificationWithTimeout(subscription, payload);
    } catch (error) {
      lastError = error;
      if (!isRetryablePushError(error) || attempt === PUSH_DELIVERY_MAX_ATTEMPTS) {
        throw error;
      }
      await sleep(calculatePushRetryDelayMs(attempt));
    }
  }

  throw lastError ?? new Error("Unknown push delivery error");
}

async function markPushSubscriptionFreshness(rowId: string, deliveredAt: string, lastSentColumn: "last_sent_at" | "last_gratitude_sent_at" | null = "last_sent_at") {
  if (lastSentColumn) {
    await run(
      `UPDATE push_subscriptions
       SET ${lastSentColumn} = ?,
           updated_at = ?
       WHERE id = ?`,
      deliveredAt,
      deliveredAt,
      rowId
    );
    return;
  }

  await run(
    `UPDATE push_subscriptions
     SET updated_at = ?
     WHERE id = ?`,
    deliveredAt,
    rowId
  );
}

function notificationTagPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 40) || "item";
}

type DailyNotificationLanguageCopy = {
  titles: Array<(input: { label: string; theme: string; scripture: string }) => string>;
  bodies: Array<(input: { theme: string; practice: string; scripture: string; principle: string }) => string>;
};

type SimpleNotificationLanguageCopy = {
  titles: Array<() => string>;
  bodies: Array<() => string>;
};

type CampaignArchetype = "reflection" | "challenge" | "promise" | "gratitude";

const WEEKLY_CAMPAIGN_ARCHETYPES: CampaignArchetype[] = ["reflection", "challenge", "promise", "gratitude"];

const dailyNotificationCopy: Partial<Record<LanguageCode, DailyNotificationLanguageCopy>> = {
  en: {
    titles: [
      ({ theme }) => `${theme}: a wiser pace`,
      ({ theme }) => `Today's ${theme} check`,
      ({ scripture }) => `${scripture} for today`,
      () => "One faithful next step",
      ({ theme }) => `Carry this in ${theme}`,
      ({ label }) => label,
    ],
    bodies: [
      ({ scripture, practice }) => `${scripture} · ${practice}`,
      ({ theme }) => `Open today's card: one question, one tiny practice, and a calmer lens for ${theme}.`,
      ({ practice }) => `Tiny practice: ${practice}`,
      ({ scripture, principle }) => `${scripture} · ${principle}`,
      ({ theme }) => `A short wisdom pause is ready for ${theme}. No pressure, just clarity.`,
      ({ practice }) => `Carry this today: ${practice}`,
    ],
  },
  es: {
    titles: [
      ({ theme }) => `${theme}: un ritmo más sabio`,
      ({ theme }) => `Revisión de ${theme} para hoy`,
      ({ scripture }) => `${scripture} para hoy`,
      () => "Un próximo paso fiel",
      ({ theme }) => `Lleva esto en ${theme}`,
      ({ label }) => label,
    ],
    bodies: [
      ({ scripture, practice }) => `${scripture} · ${practice}`,
      ({ theme }) => `Abre la tarjeta de hoy: una pregunta, una práctica breve y más claridad para ${theme}.`,
      ({ practice }) => `Práctica breve: ${practice}`,
      ({ scripture, principle }) => `${scripture} · ${principle}`,
      ({ theme }) => `Hay una pausa de sabiduría para ${theme}. Sin presión, con claridad.`,
      ({ practice }) => `Lleva esto hoy: ${practice}`,
    ],
  },
  fr: {
    titles: [
      ({ theme }) => `${theme} : un rythme plus sage`,
      ({ theme }) => `Point du jour sur ${theme}`,
      ({ scripture }) => `${scripture} pour aujourd'hui`,
      () => "Un prochain pas fidèle",
      ({ theme }) => `Garde ceci pour ${theme}`,
      ({ label }) => label,
    ],
    bodies: [
      ({ scripture, practice }) => `${scripture} · ${practice}`,
      ({ theme }) => `Ouvre la carte du jour : une question, une petite pratique et plus de clarté pour ${theme}.`,
      ({ practice }) => `Petite pratique : ${practice}`,
      ({ scripture, principle }) => `${scripture} · ${principle}`,
      ({ theme }) => `Une pause de sagesse est prête pour ${theme}. Sans pression, avec clarté.`,
      ({ practice }) => `Garde ceci aujourd'hui : ${practice}`,
    ],
  },
  pt: {
    titles: [
      ({ theme }) => `${theme}: um ritmo mais sábio`,
      ({ theme }) => `Revisão de ${theme} para hoje`,
      ({ scripture }) => `${scripture} para hoje`,
      () => "Um próximo passo fiel",
      ({ theme }) => `Leve isto em ${theme}`,
      ({ label }) => label,
    ],
    bodies: [
      ({ scripture, practice }) => `${scripture} · ${practice}`,
      ({ theme }) => `Abra o cartão de hoje: uma pergunta, uma prática breve e mais clareza para ${theme}.`,
      ({ practice }) => `Prática breve: ${practice}`,
      ({ scripture, principle }) => `${scripture} · ${principle}`,
      ({ theme }) => `Uma pausa de sabedoria está pronta para ${theme}. Sem pressão, com clareza.`,
      ({ practice }) => `Leve isto hoje: ${practice}`,
    ],
  },
  de: {
    titles: [
      ({ theme }) => `${theme}: ein weiseres Tempo`,
      ({ theme }) => `Dein ${theme}-Impuls`,
      ({ scripture }) => `${scripture} für heute`,
      () => "Ein treuer nächster Schritt",
      ({ theme }) => `Nimm dies in ${theme} mit`,
      ({ label }) => label,
    ],
    bodies: [
      ({ scripture, practice }) => `${scripture} · ${practice}`,
      ({ theme }) => `Öffne die heutige Karte: eine Frage, eine kleine Übung und mehr Klarheit für ${theme}.`,
      ({ practice }) => `Kleine Übung: ${practice}`,
      ({ scripture, principle }) => `${scripture} · ${principle}`,
      ({ theme }) => `Ein kurzer Weisheitsmoment für ${theme} ist bereit. Kein Druck, nur Klarheit.`,
      ({ practice }) => `Nimm das heute mit: ${practice}`,
    ],
  },
  yo: {
    titles: [
      ({ theme }) => `${theme}: ìyára tó ní ọgbọ́n`,
      ({ theme }) => `Ìrònú ${theme} fún oni`,
      ({ scripture }) => `${scripture} fún oni`,
      () => "Ìgbésẹ̀ olóòtítọ́ tó kàn",
      ({ theme }) => `Rù èyí lọ ninu ${theme}`,
      ({ label }) => label,
    ],
    bodies: [
      ({ scripture, practice }) => `${scripture} · ${practice}`,
      ({ theme }) => `Ṣí kaadi oni: ìbéèrè kan, ìṣe kékeré kan, àti ìmúlò tó yege fún ${theme}.`,
      ({ practice }) => `Ìṣe kékeré: ${practice}`,
      ({ scripture, principle }) => `${scripture} · ${principle}`,
      ({ theme }) => `Ìsinmi ọgbọ́n kékeré fún ${theme} ti ṣetan. Kò sí ìkánjú, ìmọ̀lára kedere ni.`,
      ({ practice }) => `Rù èyí lọ loni: ${practice}`,
    ],
  },
  ig: {
    titles: [
      ({ theme }) => `${theme}: ọsọ amamihe`,
      ({ theme }) => `Ntụgharị ${theme} taa`,
      ({ scripture }) => `${scripture} maka taa`,
      () => "Nzọụkwụ kwesịrị ntụkwasị obi",
      ({ theme }) => `Buru nke a n'ime ${theme}`,
      ({ label }) => label,
    ],
    bodies: [
      ({ scripture, practice }) => `${scripture} · ${practice}`,
      ({ theme }) => `Mepee kaadị taa: ajụjụ otu, omume nta, na nghọta dị jụụ maka ${theme}.`,
      ({ practice }) => `Omume nta: ${practice}`,
      ({ scripture, principle }) => `${scripture} · ${principle}`,
      ({ theme }) => `Obere oge amamihe maka ${theme} dị njikere. Enweghị nrụgide, naanị nghọta.`,
      ({ practice }) => `Buru nke a taa: ${practice}`,
    ],
  },
  ha: {
    titles: [
      ({ theme }) => `${theme}: tafiya mai hikima`,
      ({ theme }) => `Tunanin ${theme} na yau`,
      ({ scripture }) => `${scripture} na yau`,
      () => "Mataki mai aminci na gaba",
      ({ theme }) => `Rika wannan a ${theme}`,
      ({ label }) => label,
    ],
    bodies: [
      ({ scripture, practice }) => `${scripture} · ${practice}`,
      ({ theme }) => `Bude katin yau: tambaya daya, karamin aiki daya, da karin haske ga ${theme}.`,
      ({ practice }) => `Karamin aiki: ${practice}`,
      ({ scripture, principle }) => `${scripture} · ${principle}`,
      ({ theme }) => `Karamin lokacin hikima ga ${theme} ya shirya. Ba matsin lamba ba, haske ne.`,
      ({ practice }) => `Rike wannan yau: ${practice}`,
    ],
  },
  tl: {
    titles: [
      ({ theme }) => `${theme}: mas mahinahong takbo`,
      ({ theme }) => `Pagsusuri ng ${theme} para sa ngayon`,
      ({ scripture }) => `${scripture} para sa ngayon`,
      () => "Isang tapat na susunod na hakbang",
      ({ theme }) => `Dalhin ito sa ${theme}`,
      ({ label }) => label,
    ],
    bodies: [
      ({ scripture, practice }) => `${scripture} · ${practice}`,
      ({ theme }) => `Buksan ang card ngayon: isang tanong, isang maliit na pagsasanay, at mas mahinahong pagtingin para sa ${theme}.`,
      ({ practice }) => `Maliit na pagsasanay: ${practice}`,
      ({ scripture, principle }) => `${scripture} · ${principle}`,
      ({ theme }) => `May handang maikling sandali ng karunungan para sa ${theme}. Walang pressure, malinaw lang.`,
      ({ practice }) => `Dalhin ito ngayon: ${practice}`,
    ],
  },
  ar: {
    titles: [
      ({ theme }) => `${theme}: إيقاع أهدأ`,
      ({ theme }) => `مراجعة ${theme} لليوم`,
      ({ scripture }) => `${scripture} لليوم`,
      () => "خطوة أمينة واحدة تالية",
      ({ theme }) => `احمل هذا في ${theme}`,
      ({ label }) => label,
    ],
    bodies: [
      ({ scripture, practice }) => `${scripture} · ${practice}`,
      ({ theme }) => `افتح بطاقة اليوم: سؤال واحد، وممارسة صغيرة، ونظرة أهدأ إلى ${theme}.`,
      ({ practice }) => `ممارسة صغيرة: ${practice}`,
      ({ scripture, principle }) => `${scripture} · ${principle}`,
      ({ theme }) => `لحظة حكمة قصيرة جاهزة لـ ${theme}. بلا ضغط، مع وضوح.`,
      ({ practice }) => `احمل هذا اليوم: ${practice}`,
    ],
  },
  hi: {
    titles: [
      ({ theme }) => `${theme}: अधिक शांत लय`,
      ({ theme }) => `आज का ${theme} अवलोकन`,
      ({ scripture }) => `${scripture} आज के लिए`,
      () => "एक निष्ठावान अगला कदम",
      ({ theme }) => `${theme} में इसे साथ रखें`,
      ({ label }) => label,
    ],
    bodies: [
      ({ scripture, practice }) => `${scripture} · ${practice}`,
      ({ theme }) => `आज का कार्ड खोलिए: एक प्रश्न, एक छोटी प्रैक्टिस, और ${theme} के लिए अधिक शांत दृष्टि।`,
      ({ practice }) => `छोटी प्रैक्टिस: ${practice}`,
      ({ scripture, principle }) => `${scripture} · ${principle}`,
      ({ theme }) => `${theme} के लिए एक छोटा ज्ञान-विराम तैयार है। कोई दबाव नहीं, बस स्पष्टता.`,
      ({ practice }) => `इसे आज साथ रखें: ${practice}`,
    ],
  },
};

const gratitudeNotificationCopy: Partial<Record<LanguageCode, SimpleNotificationLanguageCopy>> = {
  en: {
    titles: [
      () => "A quiet gratitude moment",
      () => "What are you grateful for today?",
      () => "End the day with one gift",
      () => "Gratitude Lens is ready",
    ],
    bodies: [
      () => "Take one photo, name one mercy, and let the day close with attention.",
      () => "Before the day disappears, capture one thing you do not want to take for granted.",
      () => "One image. One honest sentence of thanks. No pressure, just remembrance.",
      () => "Open Gratitude Lens and keep one private visual note from today.",
    ],
  },
  es: {
    titles: [
      () => "Un momento tranquilo de gratitud",
      () => "¿Por qué das gracias hoy?",
      () => "Cierra el día con un regalo",
      () => "Tu mirada de gratitud está lista",
    ],
    bodies: [
      () => "Toma una foto, nombra una misericordia y cierra el día con atención.",
      () => "Antes de que el día pase, guarda algo que no quieres dar por sentado.",
      () => "Una imagen. Una frase sincera de gratitud. Sin presión, solo memoria.",
      () => "Abre Gratitud y conserva una nota visual privada de hoy.",
    ],
  },
  fr: {
    titles: [
      () => "Un moment calme de gratitude",
      () => "De quoi es-tu reconnaissant aujourd’hui ?",
      () => "Termine la journée avec un don",
      () => "Le regard de gratitude est prêt",
    ],
    bodies: [
      () => "Prends une photo, nomme une grâce, et laisse la journée se fermer avec attention.",
      () => "Avant que le jour passe, garde une chose que tu ne veux pas considérer comme acquise.",
      () => "Une image. Une phrase sincère de gratitude. Sans pression, juste le souvenir.",
      () => "Ouvre Gratitude et garde une note visuelle privée d’aujourd’hui.",
    ],
  },
  pt: {
    titles: [
      () => "Um momento calmo de gratidão",
      () => "Pelo que você é grato hoje?",
      () => "Feche o dia com uma dádiva",
      () => "O olhar de gratidão está pronto",
    ],
    bodies: [
      () => "Tire uma foto, nomeie uma misericórdia e encerre o dia com atenção.",
      () => "Antes que o dia passe, guarde algo que você não quer tratar como comum.",
      () => "Uma imagem. Uma frase honesta de gratidão. Sem pressão, só memória.",
      () => "Abra Gratidão e guarde uma nota visual privada de hoje.",
    ],
  },
  de: {
    titles: [
      () => "Ein stiller Moment der Dankbarkeit",
      () => "Wofür bist du heute dankbar?",
      () => "Schließe den Tag mit einer Gabe",
      () => "Der Dankbarkeitsblick ist bereit",
    ],
    bodies: [
      () => "Mach ein Foto, benenne eine Gnade und lass den Tag aufmerksam ausklingen.",
      () => "Bevor der Tag vergeht, halte etwas fest, das du nicht selbstverständlich nehmen willst.",
      () => "Ein Bild. Ein ehrlicher Satz Dankbarkeit. Kein Druck, nur Erinnerung.",
      () => "Öffne den Dankbarkeitsblick und bewahre eine private visuelle Notiz von heute.",
    ],
  },
  yo: {
    titles: [
      () => "Ìgbà ìdúpẹ́ pẹ̀lẹ́",
      () => "Kí ni o dúpẹ́ fún lónìí?",
      () => "Parí ọjọ́ pẹ̀lú ẹ̀bùn kan",
      () => "Ojú ìdúpẹ́ ti ṣetan",
    ],
    bodies: [
      () => "Ya fọ́tò kan, sọ aanu kan, kí ọjọ́ pari pẹ̀lú ìfọkànsìn.",
      () => "Kí ọjọ́ tó kọjá, gba ohun kan sílẹ̀ tí o kò fẹ́ ka sí ohun lasan.",
      () => "Àwòrán kan. Gbólóhùn ìdúpẹ́ kan. Kò sí ìkánjú, ìrántí nìkan.",
      () => "Ṣí Ojú Ìdúpẹ́ kí o pa àkọsílẹ̀ ìran ikọ̀kọ̀ kan mọ́ fún òní.",
    ],
  },
  ig: {
    titles: [
      () => "Oge ekele dị jụụ",
      () => "Gịnị ka ị na-ekele maka taa?",
      () => "Mechie ụbọchị na otu onyinye",
      () => "Anya ekele dị njikere",
    ],
    bodies: [
      () => "Were otu foto, kpọọ otu amara, ka ụbọchị mechie n’ilebara anya.",
      () => "Tupu ụbọchị gafee, debe otu ihe ị chọghị iwere dị ka ihe nkịtị.",
      () => "Otu foto. Otu ahịrị ekele eziokwu. Enweghị nrụgide, naanị ncheta.",
      () => "Mepee Anya Ekele ma debe otu ndetu anya nkeonwe nke taa.",
    ],
  },
  ha: {
    titles: [
      () => "Lokacin godiya mai natsuwa",
      () => "Me kake godewa yau?",
      () => "Rufe rana da baiwa guda",
      () => "Madubin godiya ya shirya",
    ],
    bodies: [
      () => "Dauki hoto guda, ambaci wata alheri, ka rufe rana da lura.",
      () => "Kafin rana ta wuce, kama abu daya da ba ka so ka dauka da wasa.",
      () => "Hoto daya. Jumlar godiya ta gaskiya daya. Ba matsin lamba, tunawa ne kawai.",
      () => "Bude Madubin Godiya ka ajiye bayanin gani na sirri daga yau.",
    ],
  },
  tl: {
    titles: [
      () => "Isang tahimik na sandali ng pasasalamat",
      () => "Ano ang ipinagpapasalamat mo ngayon?",
      () => "Tapusin ang araw sa isang handog",
      () => "Handa na ang Gratitude Lens",
    ],
    bodies: [
      () => "Kumuha ng isang larawan, pangalanan ang isang biyaya, at hayaang matapos ang araw nang may pansin.",
      () => "Bago lumipas ang araw, itabi ang isang bagay na ayaw mong balewalain.",
      () => "Isang larawan. Isang tapat na pangungusap ng pasasalamat. Walang pressure, alaala lang.",
      () => "Buksan ang Gratitude Lens at itago ang isang pribadong visual note mula sa araw na ito.",
    ],
  },
  ar: {
    titles: [
      () => "لحظة امتنان هادئة",
      () => "عمَّ تشعر بالامتنان اليوم؟",
      () => "اختم اليوم بهدية واحدة",
      () => "عدسة الامتنان جاهزة",
    ],
    bodies: [
      () => "التقط صورة واحدة، واذكر نعمة واحدة، ودع اليوم يُختتم بانتباه.",
      () => "قبل أن ينتهي اليوم، احتفظ بشيء لا تريد أن تأخذه كأمر مسلم به.",
      () => "صورة واحدة. جملة امتنان صادقة واحدة. بلا ضغط، فقط تذكّر.",
      () => "افتح عدسة الامتنان واحتفظ بملاحظة بصرية خاصة من اليوم.",
    ],
  },
  hi: {
    titles: [
      () => "शांत कृतज्ञता का क्षण",
      () => "आज किस बात के लिए आभारी हैं?",
      () => "दिन का समापन एक उपहार के साथ करें",
      () => "Gratitude Lens तैयार है",
    ],
    bodies: [
      () => "एक फोटो लें, एक कृपा का नाम लें, और दिन को ध्यान के साथ समाप्त होने दें।",
      () => "दिन बीतने से पहले, किसी ऐसी चीज़ को सुरक्षित रखें जिसे आप सामान्य नहीं मानना चाहते।",
      () => "एक छवि। कृतज्ञता का एक ईमानदार वाक्य। कोई दबाव नहीं, बस स्मरण।",
      () => "Gratitude Lens खोलिए और आज की एक निजी दृश्य-टिप्पणी सहेजिए।",
    ],
  },
};

const premiumDailyClosers: Partial<Record<LanguageCode, string[]>> = {
  en: ["Open now for your one clear next step.", "Tap to carry a wiser lens into today.", "Open now and let wisdom shape your next decision."],
  es: ["Abre ahora y toma un paso claro para hoy.", "Toca para llevar una mirada más sabia a tu día.", "Abre ahora y deja que la sabiduría guíe tu próxima decisión."],
  fr: ["Ouvre maintenant pour un prochain pas clair.", "Touchez pour porter un regard plus sage aujourd'hui.", "Ouvre maintenant et laisse la sagesse guider ta prochaine décision."],
  pt: ["Abra agora para um próximo passo claro.", "Toque para levar um olhar mais sábio para hoje.", "Abra agora e deixe a sabedoria guiar sua próxima decisão."],
  de: ["Jetzt öffnen für deinen klaren nächsten Schritt.", "Tippe hier und nimm einen weiseren Blick mit in den Tag.", "Jetzt öffnen und Weisheit in deine nächste Entscheidung tragen."],
  yo: ["Ṣí i báyìí fún ìgbésẹ̀ kedere tó kàn.", "Fọwọ́ kan an kí o ru ojú ọgbọ́n wọ ọjọ́ rẹ.", "Ṣí i báyìí kí ọgbọ́n dari ìpinnu rẹ tó kàn."],
  ig: ["Mepee ya ugbu a maka nzọụkwụ doro anya ọzọ.", "Pịa ka i buru anya amamihe n'ime ụbọchị taa.", "Mepee ugbu a ka amamihe duzie mkpebi gị na-esote."],
  ha: ["Bude yanzu don mataki na gaba mai bayyana.", "Matsa ka dauki hangen hikima cikin yau.", "Bude yanzu ka bar hikima ta jagoranci shawararka ta gaba."],
  tl: ["Buksan ngayon para sa malinaw na susunod na hakbang.", "I-tap para dalhin ang mas mahinahong pananaw sa araw na ito.", "Buksan ngayon at hayaang gabayan ng karunungan ang susunod mong pasya."],
  ar: ["افتح الآن لخطوة تالية واضحة.", "اضغط لتحمل نظرة أكثر حكمة في يومك.", "افتح الآن ودع الحكمة تقود قرارك التالي."],
  hi: ["अभी खोलें और अगला स्पष्ट कदम पाएँ.", "टैप करें और आज के लिए अधिक बुद्धिमान दृष्टि साथ लें.", "अभी खोलें और ज्ञान को आपके अगले निर्णय का मार्गदर्शन करने दें."],
};

const premiumGratitudeClosers: Partial<Record<LanguageCode, string[]>> = {
  en: ["Open Gratitude Lens and seal this day with thanks.", "Tap now and keep one memory that deserves attention."],
  es: ["Abre Gratitude Lens y cierra este día con gratitud.", "Toca ahora y guarda una memoria que merece atención."],
  fr: ["Ouvre Gratitude Lens et termine la journée avec reconnaissance.", "Touchez maintenant et garde un souvenir qui mérite l'attention."],
  pt: ["Abra o Gratitude Lens e encerre o dia com gratidão.", "Toque agora e guarde uma memória que merece atenção."],
  de: ["Öffne den Dankbarkeitsblick und schließe den Tag mit Dank.", "Jetzt tippen und eine Erinnerung bewahren, die Aufmerksamkeit verdient."],
  yo: ["Ṣí Ojú Ìdúpẹ́ kí o sì fi ìdúpẹ́ pa ọjọ́ yìí.", "Fọwọ́ kan an báyìí kí o pa ìrántí tó yẹ mọ́."],
  ig: ["Mepee Anya Ekele ma mechie ụbọchị a n'ekele.", "Pịa ugbu a ka i debe ncheta kwesịrị nlebara anya."],
  ha: ["Bude Madubin Godiya ka rufe yau da godiya.", "Matsa yanzu ka adana tunanin da ya cancanci kulawa."],
  tl: ["Buksan ang Gratitude Lens at tapusin ang araw na may pasasalamat.", "I-tap ngayon at itabi ang alaalang karapat-dapat sa pansin."],
  ar: ["افتح عدسة الامتنان واختتم يومك بالشكر.", "اضغط الآن واحتفظ بذكرى تستحق الانتباه."],
  hi: ["Gratitude Lens खोलें और दिन का समापन धन्यवाद के साथ करें.", "अभी टैप करें और एक याद संजोएँ जो ध्यान की हकदार है."],
};

const campaignArchetypeOpeners: Partial<Record<LanguageCode, Record<CampaignArchetype, string[]>>> = {
  en: {
    reflection: ["Pause and reflect with wisdom."],
    challenge: ["Take one courageous step today."],
    promise: ["Hold this promise close today."],
    gratitude: ["Notice one mercy before the rush."],
  },
  es: {
    reflection: ["Haz una pausa y reflexiona con sabiduría."],
    challenge: ["Da hoy un paso valiente."],
    promise: ["Abraza hoy esta promesa."],
    gratitude: ["Reconoce una misericordia antes de la prisa."],
  },
  fr: {
    reflection: ["Fais une pause et réfléchis avec sagesse."],
    challenge: ["Fais aujourd'hui un pas courageux."],
    promise: ["Garde cette promesse près de toi aujourd'hui."],
    gratitude: ["Remarque une grâce avant la précipitation."],
  },
  pt: {
    reflection: ["Faça uma pausa e reflita com sabedoria."],
    challenge: ["Dê hoje um passo corajoso."],
    promise: ["Segure esta promessa com você hoje."],
    gratitude: ["Perceba uma misericórdia antes da correria."],
  },
  de: {
    reflection: ["Halte kurz inne und reflektiere mit Weisheit."],
    challenge: ["Gehe heute einen mutigen Schritt."],
    promise: ["Trage diese Verheißung heute nah bei dir."],
    gratitude: ["Bemerke eine Gnade vor der Hektik."],
  },
  yo: {
    reflection: ["Dúró díẹ̀ kí o sì ronú pẹ̀lú ọgbọ́n."],
    challenge: ["Gbé ìgbésẹ̀ akínkanjú kan lónìí."],
    promise: ["Di ìlérí yìí mú lónìí."],
    gratitude: ["Ṣàkíyèsí aanu kan kí ìyára tó bẹ̀rẹ̀."],
  },
  ig: {
    reflection: ["Kwụsị ntakịrị ma tụgharịa uche n'amamihe."],
    challenge: ["Mee otu nzọụkwụ obi ike taa."],
    promise: ["Jide nkwa a nso taa."],
    gratitude: ["Hụ otu ebere tupu ọsọ amalite."],
  },
  ha: {
    reflection: ["Dakata ka yi tunani cikin hikima."],
    challenge: ["Dauki mataki guda na jarumta yau."],
    promise: ["Rike wannan alkawari kusa da kai yau."],
    gratitude: ["Lura da wata alheri kafin hanzari."],
  },
  tl: {
    reflection: ["Huminto sandali at magnilay nang may karunungan."],
    challenge: ["Gumawa ng isang matapang na hakbang ngayon."],
    promise: ["Hawakan ang pangakong ito ngayong araw."],
    gratitude: ["Pansinin ang isang biyaya bago ang pagmamadali."],
  },
  ar: {
    reflection: ["توقّف قليلًا وتأمّل بحكمة."],
    challenge: ["اتخذ اليوم خطوة شجاعة واحدة."],
    promise: ["تمسّك بهذا الوعد اليوم."],
    gratitude: ["لاحظ نعمة واحدة قبل زحام اليوم."],
  },
  hi: {
    reflection: ["थोड़ा ठहरें और ज्ञान के साथ मनन करें."],
    challenge: ["आज एक साहसी कदम उठाएँ."],
    promise: ["आज इस प्रतिज्ञा को थामे रखें."],
    gratitude: ["भागदौड़ से पहले एक कृपा को पहचानें."],
  },
};

function weeklyCampaignArchetype(localDate: string) {
  const safeDate = new Date(`${localDate}T00:00:00Z`);
  const weekIndex = Math.floor(safeDate.getTime() / (7 * 24 * 60 * 60 * 1000));
  return WEEKLY_CAMPAIGN_ARCHETYPES[Math.abs(weekIndex) % WEEKLY_CAMPAIGN_ARCHETYPES.length] ?? "reflection";
}

function campaignArchetypeOpener(language: LanguageCode, archetype: CampaignArchetype, variantSeed: number) {
  const languageCopy = campaignArchetypeOpeners[language] ?? campaignArchetypeOpeners.en;
  const openers = languageCopy?.[archetype] ?? campaignArchetypeOpeners.en?.[archetype] ?? ["Pause and reflect with wisdom."];
  return openers[variantSeed % openers.length] ?? openers[0]!;
}

function appendPremiumCloser(baseBody: string, language: LanguageCode, variantSeed: number, localHour: number, closers: Partial<Record<LanguageCode, string[]>>) {
  const languageClosers = closers[language] ?? closers.en ?? ["Open now for today's wisdom."];
  const closer = languageClosers[(variantSeed + Math.floor(localHour / 6)) % languageClosers.length] ?? languageClosers[0]!;
  return compactNotificationCopy(`${baseBody} ${closer}`, 172);
}

function normalizeNotificationSegment(value: string, fallback: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

function buildDailyNotificationTitle(input: {
  language: LanguageCode;
  label: string;
  theme: string;
  scripture: string;
  variant: number;
}) {
  const copy = dailyNotificationCopy[input.language] ?? dailyNotificationCopy.en!;
  const cleanTheme = compactNotificationCopy(normalizeNotificationSegment(input.theme, input.label), 34);
  const scriptureReference = compactNotificationCopy(localizedScriptureReference(input.scripture, input.language), 44);
  const cleanLabel = compactNotificationCopy(normalizeNotificationSegment(input.label, "Aletheia"), 34);
  const title = copy.titles[input.variant % copy.titles.length]({
    label: cleanLabel,
    theme: cleanTheme,
    scripture: scriptureReference,
  });
  return compactNotificationCopy(title, 62);
}

function buildDailyNotificationBody(input: {
  language: LanguageCode;
  theme: string;
  practice: string;
  scripture: string;
  principle: string;
  variant: number;
}) {
  const copy = dailyNotificationCopy[input.language] ?? dailyNotificationCopy.en!;
  const cleanTheme = compactNotificationCopy(normalizeNotificationSegment(input.theme, "wisdom"), 34);
  const cleanPractice = compactNotificationCopy(normalizeNotificationSegment(input.practice, "Open today's wisdom card."), 104);
  const cleanPrinciple = compactNotificationCopy(normalizeNotificationSegment(input.principle, cleanPractice), 104);
  const scriptureReference = compactNotificationCopy(localizedScriptureReference(input.scripture, input.language), 48);
  const distinctPrinciple = cleanPrinciple.toLowerCase() !== cleanPractice.toLowerCase() ? cleanPrinciple : cleanPractice;
  const body = copy.bodies[input.variant % copy.bodies.length]({
    theme: cleanTheme,
    practice: cleanPractice,
    scripture: scriptureReference,
    principle: distinctPrinciple,
  });
  return compactNotificationCopy(body, 148);
}

const testNotificationCopy: Partial<Record<LanguageCode, { title: string; body: string }>> = {
  en: {
    title: "Aletheia is ready",
    body: "A calm wisdom prompt can now reach this device at your chosen local time.",
  },
  es: {
    title: "Aletheia está lista",
    body: "Un impulso tranquilo de sabiduría puede llegar a este dispositivo a tu hora local elegida.",
  },
  fr: {
    title: "Aletheia est prête",
    body: "Un rappel paisible de sagesse peut maintenant arriver sur cet appareil à l'heure choisie.",
  },
  pt: {
    title: "Aletheia está pronta",
    body: "Um lembrete tranquilo de sabedoria pode chegar a este dispositivo no horário local escolhido.",
  },
  de: {
    title: "Aletheia ist bereit",
    body: "Ein ruhiger Weisheitsimpuls kann dieses Gerät jetzt zu deiner gewählten Ortszeit erreichen.",
  },
  yo: {
    title: "Aletheia ti ṣetan",
    body: "Ìránṣẹ́ ọgbọ́n pẹ̀lẹ́pẹ̀lẹ́ lè dé ẹrọ yìí ní àkókò agbègbè tí o yàn.",
  },
  ig: {
    title: "Aletheia dị njikere",
    body: "Ozi amamihe dị jụụ nwere ike iru ngwaọrụ a n'oge mpaghara ị họọrọ.",
  },
  ha: {
    title: "Aletheia ta shirya",
    body: "Sakon hikima mai natsuwa zai iya zuwa wannan na'ura a lokacin yankin da ka zaba.",
  },
  tl: {
    title: "Handa na si Aletheia",
    body: "Makakarating na sa device na ito ang isang tahimik na paalala ng karunungan sa napili mong lokal na oras.",
  },
  ar: {
    title: "Aletheia جاهزة",
    body: "يمكن أن يصل إلى هذا الجهاز تذكيرٌ هادئ بالحكمة في الوقت المحلي الذي اخترته.",
  },
  hi: {
    title: "Aletheia तैयार है",
    body: "एक शांत ज्ञान-स्मरण अब आपके चुने हुए स्थानीय समय पर इस डिवाइस तक पहुँच सकता है।",
  },
};

function testNotificationPayload(row: PushRow) {
  const preferences = normalizePreferences({
    language: row.language as LanguageCode,
    region: row.region as RegionCode,
    bibleTranslation: row.bible_translation as BibleTranslation,
    voiceEnabled: Boolean(row.voice_enabled),
  });
  const copy = testNotificationCopy[preferences.language] ?? testNotificationCopy.en!;
  return {
    title: copy.title,
    body: copy.body,
    url: "/?source=notification&focus=today",
    scripture: "Proverbs 3:5-6",
    tag: "aletheia-notification-test",
    notificationId: `test-${row.user_id}`,
    notificationKind: "notification_test",
    test: true,
  };
}

function selectReminderForUser(reminders: DueDecisionReminder[]) {
  const sorted = [...reminders].sort((a, b) => {
    const aTime = Date.parse(a.dueAt);
    const bTime = Date.parse(b.dueAt);
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    if (a.kind === b.kind) {
      return 0;
    }
    return a.kind === "waiting" ? -1 : 1;
  });

  return sorted[0] || null;
}

function reminderCopyLanguage(language: LanguageCode) {
  const copy: Partial<Record<LanguageCode, {
    waitingTitles: string[];
    revisitTitles: string[];
    waitingBodies: string[];
    revisitBodies: string[];
  }>> = {
    en: {
      waitingTitles: ["Time has helped this breathe", "Return to this decision calmly", "Your waiting period is ready"],
      revisitTitles: ["What changed since last time?", "A decision worth reviewing", "Return with clearer eyes"],
      waitingBodies: [
        "has had time to breathe. Reopen it and notice what changed.",
        "was waiting for a calmer look. What feels clearer now?",
        "is ready for a next faithful step, not a rushed one.",
      ],
      revisitBodies: [
        "What is clearer now than when you first carried it?",
        "Revisit the pressure, counsel, cost, and peace around it.",
        "Open the decision timeline and name what changed.",
      ],
    },
    es: {
      waitingTitles: ["El tiempo ayudó a esta decisión", "Vuelve con calma a esta decisión", "Tu espera ya está lista"],
      revisitTitles: ["¿Qué cambió desde la última vez?", "Una decisión que merece revisión", "Vuelve con más claridad"],
      waitingBodies: ["tuvo tiempo para respirar. Ábrela y nota qué cambió.", "esperaba una mirada más tranquila. ¿Qué está más claro ahora?", "está lista para un próximo paso fiel, no apresurado."],
      revisitBodies: ["¿Qué está más claro ahora que cuando la llevabas al inicio?", "Revisa la presión, el consejo, el costo y la paz alrededor de ella.", "Abre la línea de tiempo y nombra qué cambió."],
    },
    fr: {
      waitingTitles: ["Le temps a aidé cette décision", "Reviens-y avec calme", "Ton temps d’attente est prêt"],
      revisitTitles: ["Qu’est-ce qui a changé ?", "Une décision à relire", "Reviens avec un regard plus clair"],
      waitingBodies: ["a eu le temps de respirer. Rouvre-la et remarque ce qui a changé.", "attendait un regard plus calme. Qu’est-ce qui est plus clair maintenant ?", "est prête pour un prochain pas fidèle, pas précipité."],
      revisitBodies: ["Qu’est-ce qui est plus clair qu’au début ?", "Relis la pression, le conseil, le coût et la paix autour d’elle.", "Ouvre la chronologie et nomme ce qui a changé."],
    },
    pt: {
      waitingTitles: ["O tempo ajudou esta decisão", "Volte com calma a esta decisão", "Sua espera está pronta"],
      revisitTitles: ["O que mudou desde a última vez?", "Uma decisão que merece revisão", "Volte com olhos mais claros"],
      waitingBodies: ["teve tempo para respirar. Abra e perceba o que mudou.", "esperava um olhar mais calmo. O que ficou mais claro agora?", "está pronta para um próximo passo fiel, não apressado."],
      revisitBodies: ["O que está mais claro agora do que no início?", "Revise a pressão, o conselho, o custo e a paz ao redor dela.", "Abra a linha do tempo e nomeie o que mudou."],
    },
    de: {
      waitingTitles: ["Diese Entscheidung hatte Zeit", "Kehre ruhig zu dieser Entscheidung zurück", "Deine Wartezeit ist bereit"],
      revisitTitles: ["Was hat sich seitdem verändert?", "Eine Entscheidung zum erneuten Prüfen", "Kehre mit klarerem Blick zurück"],
      waitingBodies: ["hatte Zeit zu atmen. Öffne sie und bemerke, was sich verändert hat.", "wartete auf einen ruhigeren Blick. Was ist jetzt klarer?", "ist bereit für einen nächsten treuen Schritt, nicht für Eile."],
      revisitBodies: ["Was ist klarer als am Anfang?", "Prüfe Druck, Rat, Kosten und Frieden rund um diese Entscheidung.", "Öffne die Zeitleiste und benenne, was sich verändert hat."],
    },
    yo: {
      waitingTitles: ["Ìpinnu yìí ti ní àkókò", "Padà sí ìpinnu yìí pẹ̀lú ìfarabalẹ̀", "Àkókò ìdúró rẹ ti pé"],
      revisitTitles: ["Kí ló yí padà látìgbà yẹn?", "Ìpinnu tó yẹ kí o tún wo", "Padà pẹ̀lú ojú tó mọ́"],
      waitingBodies: ["ti ní àkókò láti mí. Ṣí i, kí o sì wo ohun tó yí padà.", "ń dúró de ìfarabalẹ̀. Kí ló ṣe kedere báyìí?", "ti ṣetan fún ìgbésẹ̀ olóòtítọ́ tó kàn, kì í ṣe ìkánjú."],
      revisitBodies: ["Kí ni ó ṣe kedere ju ìgbà tí o kọ́kọ́ rù ú lọ?", "Tún wo ìkánjú, ìmọ̀ràn, iye, àti àlàáfíà tó yí i ká.", "Ṣí ìtàn ìpinnu náà, kí o sì sọ ohun tó yí padà."],
    },
    ig: {
      waitingTitles: ["Mkpebi a enwetala oge", "Laghachi na mkpebi a nwayọọ", "Oge nchere gị eruola"],
      revisitTitles: ["Gịnị gbanwere kemgbe ahụ?", "Mkpebi kwesịrị ileghachi anya", "Laghachi na anya doro anya"],
      waitingBodies: ["enwetala oge iku ume. Mepee ya ma hụ ihe gbanwere.", "na-eche echiche dị jụụ. Gịnị ka doro anya ugbu a?", "dị njikere maka nzọụkwụ kwesịrị ntụkwasị obi, ọ bụghị ọsọ ọsọ."],
      revisitBodies: ["Gịnị ka doro anya karịa mgbe mbụ ị bu ya?", "Legharịa nrụgide, ndụmọdụ, ọnụ ahịa, na udo gbara ya gburugburu.", "Mepee usoro oge mkpebi ahụ ma kpọọ ihe gbanwere aha."],
    },
    ha: {
      waitingTitles: ["Wannan shawara ta samu lokaci", "Koma ga wannan shawara a hankali", "Lokacin jiran ka ya cika"],
      revisitTitles: ["Me ya canza tun daga baya?", "Shawarar da ta cancanci dubawa", "Koma da ido mafi bayyana"],
      waitingBodies: ["ta samu lokaci ta numfasa. Bude ta ka lura da abin da ya canza.", "tana jiran kallo mai natsuwa. Me ya fi bayyana yanzu?", "ta shirya don mataki mai aminci, ba gaggawa ba."],
      revisitBodies: ["Me ya fi bayyana yanzu fiye da lokacin farko?", "Duba matsin lamba, shawara, farashi, da salama da ke kewaye da ita.", "Bude tarihin shawarar ka ambaci abin da ya canza."],
    },
    tl: {
      waitingTitles: ["Nagkaroon ng oras ang desisyong ito", "Bumalik sa desisyong ito nang mahinahon", "Handa na ang iyong hintay"],
      revisitTitles: ["Ano ang nagbago mula noon?", "Isang desisyong dapat muling suriin", "Bumalik nang mas malinaw ang mata"],
      waitingBodies: ["nagkaroon ng oras huminga. Buksan ito at pansinin kung ano ang nagbago.", "naghihintay ng mas mahinahong pagtingin. Ano ang mas malinaw ngayon?", "handa na para sa susunod na tapat na hakbang, hindi para sa pagmamadali."],
      revisitBodies: ["Ano ang mas malinaw ngayon kaysa noong una mo itong dala?", "Balikan ang pressure, payo, gastos, at kapayapaang nakapalibot dito.", "Buksan ang decision timeline at pangalanan ang nagbago."],
    },
    ar: {
      waitingTitles: ["أُعطي هذا القرار وقتًا", "ارجع إلى هذا القرار بهدوء", "فترة الانتظار جاهزة"],
      revisitTitles: ["ما الذي تغيّر منذ ذلك الحين؟", "قرار يستحق المراجعة", "ارجع بعين أوضح"],
      waitingBodies: ["أُتيح له وقت ليتنفس. افتحه ولاحظ ما الذي تغيّر.", "كان ينتظر نظرة أهدأ. ما الذي أصبح أوضح الآن؟", "هو جاهز لخطوة أمينة تالية، لا لخطوة متسرعة."],
      revisitBodies: ["ما الذي أصبح أوضح الآن مما كان عليه في البداية؟", "راجع الضغط، والمشورة، والكلفة، والسلام المحيط به.", "افتح الخط الزمني للقرار وسمِّ ما الذي تغيّر."],
    },
    hi: {
      waitingTitles: ["इस निर्णय को समय मिला", "इस निर्णय पर शांति से लौटें", "आपका प्रतीक्षा-काल तैयार है"],
      revisitTitles: ["तब से क्या बदला?", "एक निर्णय जिसे फिर से देखना चाहिए", "अधिक स्पष्ट दृष्टि के साथ लौटें"],
      waitingBodies: ["इसे साँस लेने का समय मिला है। इसे खोलिए और देखें क्या बदला है।", "यह अधिक शांत नज़र की प्रतीक्षा कर रहा था। अब क्या अधिक स्पष्ट है?", "यह अगले निष्ठावान कदम के लिए तैयार है, जल्दबाज़ी के लिए नहीं."],
      revisitBodies: ["अब क्या पहले से अधिक स्पष्ट है?", "दबाव, सलाह, लागत, और उसके आसपास की शांति की फिर से जाँच करें.", "निर्णय-समयरेखा खोलिए और नाम दीजिए कि क्या बदला।"],
    },
  };

  return copy[language] ?? copy.en!;
}

const challengeReminderReentryCopy: Partial<Record<LanguageCode, string>> = {
  en: "You missed a day, and you do not need to start over. The practice is still here.",
  es: "Perdiste un día, y no necesitas empezar de nuevo. La práctica sigue aquí.",
  fr: "Tu as manqué un jour, et tu n'as pas besoin de recommencer. La pratique est toujours là.",
  pt: "Você perdeu um dia, e não precisa recomeçar. A prática ainda está aqui.",
  de: "Du hast einen Tag verpasst, und du musst nicht von vorne anfangen. Die Übung ist noch da.",
  yo: "O padanu ọjọ́ kan, o kò sì nílò láti bẹ̀rẹ̀ láti ìbẹ̀rẹ̀. Ìṣe náà ṣi wà níbí.",
  ig: "Ị tụfuru otu ụbọchị, ma ị gaghị amalite ọzọ. Omume ahụ ka nọ ebe a.",
  ha: "Ka rasa wata rana, kuma ba ka bukatar ka fara daga farko. Aikin har yanzu yana nan.",
  tl: "May isang araw na namiss ka, at hindi mo kailangang magsimula ulit. Nandito pa rin ang pagsasanay.",
  ar: "فاتك يوم، ولا تحتاج أن تبدأ من جديد. ما زالت الممارسة هنا.",
  hi: "आपने एक दिन छोड़ दिया, और आपको फिर से शुरू करने की ज़रूरत नहीं है। अभ्यास अभी भी यहाँ है।",
};

const challengeReentryToneCopy: Record<
  LanguageCode,
  { early: string; longer: string }
> = {
  en: {
    early: "Let’s make this easy to pick back up.",
    longer: "Let’s shrink the step and re-enter gently.",
  },
  es: {
    early: "Hagamos que retomar esto sea fácil.",
    longer: "Acortemos el paso y volvamos con suavidad.",
  },
  fr: {
    early: "Rendons la reprise simple.",
    longer: "Réduisons l'effort et revenons en douceur.",
  },
  pt: {
    early: "Vamos facilitar retomar isso.",
    longer: "Vamos diminuir o passo e voltar com gentileza.",
  },
  de: {
    early: "Lass uns den Wiedereinstieg leicht machen.",
    longer: "Lass uns den Schritt verkleinern und sanft zurückkehren.",
  },
  yo: {
    early: "Jẹ́ kí padà sí i rọrùn.",
    longer: "Ẹ jẹ́ ká dín ìgbésẹ̀ kù, ká sì padà pẹ̀lẹ́pẹ̀lẹ́.",
  },
  ig: {
    early: "Ka mee ka ịlaghachi bụrụ ihe dị mfe.",
    longer: "Ka anyị belata nzọụkwụ ma laghachi nwayọ.",
  },
  ha: {
    early: "Mu dawowa ya zama mai sauki.",
    longer: "Mu rage matakin, mu dawo a hankali.",
  },
  tl: {
    early: "Gawin nating madali ang pagbalik.",
    longer: "Paliitin natin ang hakbang at bumalik nang banayad.",
  },
  ar: {
    early: "لنجعل العودة سهلة.",
    longer: "لنصغّر الخطوة ونعود بلطف.",
  },
  hi: {
    early: "इसे फिर से शुरू करना आसान बनाते हैं.",
    longer: "चलिए कदम छोटा करें और नरमी से लौटें.",
  },
};

const challengeReentryTitleCopy: Record<
  LanguageCode,
  { early: string; longer: string }
> = {
  en: {
    early: "Easy restart",
    longer: "Gentle return",
  },
  es: {
    early: "Retoma fácil",
    longer: "Regreso suave",
  },
  fr: {
    early: "Reprise simple",
    longer: "Retour en douceur",
  },
  pt: {
    early: "Retomada fácil",
    longer: "Retorno suave",
  },
  de: {
    early: "Leichter Neustart",
    longer: "Sanfte Rückkehr",
  },
  yo: {
    early: "Padà rọrùn",
    longer: "Padà pẹ̀lẹ́pẹ̀lẹ́",
  },
  ig: {
    early: "Mmepụta mfe",
    longer: "Nloghachi nwayọ",
  },
  ha: {
    early: "Saukin farawa",
    longer: "Dawowa a hankali",
  },
  tl: {
    early: "Madaling balik",
    longer: "Banayad na balik",
  },
  ar: {
    early: "عودة سهلة",
    longer: "عودة بلطف",
  },
  hi: {
    early: "आसान शुरुआत",
    longer: "नरम वापसी",
  },
};

const challengeAwareReentryTitleCopy: Record<ChallengeId, Partial<Record<LanguageCode, { early: string; longer: string }>>> = {
  "gratitude-3day": {
    en: { early: "Back to gratitude", longer: "Returning to gratitude" },
    es: { early: "Vuelve a la gratitud", longer: "Retorno a la gratitud" },
    fr: { early: "Retour à la gratitude", longer: "Reprise de la gratitude" },
    pt: { early: "De volta à gratidão", longer: "Retorno à gratidão" },
    de: { early: "Zur Dankbarkeit zurück", longer: "Rückkehr zur Dankbarkeit" },
    yo: { early: "Padà sí ìdúpẹ́", longer: "Padà sí ìdúpẹ́ pẹ̀lẹ́" },
    ig: { early: "Laghachi na ekele", longer: "Nloghachi na ekele" },
    ha: { early: "Komawa ga godiya", longer: "Komawa cikin godiya" },
    tl: { early: "Balik sa pasasalamat", longer: "Pagbabalik sa pasasalamat" },
    ar: { early: "عودة إلى الامتنان", longer: "العودة إلى الامتنان" },
    hi: { early: "कृतज्ञता पर वापसी", longer: "कृतज्ञता की ओर लौटें" },
  },
  "shared-encouragement-3day": {
    en: { early: "One encouraging word", longer: "A gentler encouragement" },
    es: { early: "Una palabra de ánimo", longer: "Un ánimo más suave" },
    fr: { early: "Un mot d'encouragement", longer: "Un encouragement plus doux" },
    pt: { early: "Uma palavra de incentivo", longer: "Um incentivo mais suave" },
    de: { early: "Ein ermutigendes Wort", longer: "Sanftere Ermutigung" },
    yo: { early: "Ọ̀rọ̀ ìṣírí kan", longer: "Ìṣírí pẹ̀lẹ́pẹ̀lẹ́" },
    ig: { early: "Otu okwu nkwado", longer: "Nkwado dị nro" },
    ha: { early: "Kalma guda ta ƙarfafawa", longer: "Karfafawa mai laushi" },
    tl: { early: "Isang salitang pampalakas", longer: "Mas banayad na pampalakas" },
    ar: { early: "كلمة تشجيع واحدة", longer: "تشجيع ألطف" },
    hi: { early: "एक उत्साहवर्धक शब्द", longer: "और कोमल उत्साह" },
  },
  "waiting-5day": {
    en: { early: "Still waiting", longer: "Waiting with peace" },
    es: { early: "Sigue esperando", longer: "Esperar en paz" },
    fr: { early: "Toujours en attente", longer: "Attendre en paix" },
    pt: { early: "Ainda esperando", longer: "Esperar em paz" },
    de: { early: "Noch im Warten", longer: "Warten mit Frieden" },
    yo: { early: "Ṣì ń dúró", longer: "Dúró pẹ̀lú àlàáfíà" },
    ig: { early: "Ka na-echere", longer: "Ichere n'udo" },
    ha: { early: "Har yanzu jira", longer: "Jira cikin salama" },
    tl: { early: "Naghihintay pa rin", longer: "Paghihintay nang payapa" },
    ar: { early: "ما زال الانتظار", longer: "انتظار بسلام" },
    hi: { early: "अभी भी प्रतीक्षा", longer: "शांति से प्रतीक्षा" },
  },
  "stewardship-7day": {
    en: { early: "Back to stewardship", longer: "Stewardship, calmly" },
    es: { early: "Vuelve a la mayordomía", longer: "Mayordomía con calma" },
    fr: { early: "Retour à l'intendance", longer: "Intendance en paix" },
    pt: { early: "De volta à mordomia", longer: "Mordomia com calma" },
    de: { early: "Zur Treue im Umgang", longer: "Treue im Umgang, ruhig" },
    yo: { early: "Padà sí ìṣàkóso", longer: "Ìṣàkóso pẹ̀lú ìdákẹ́jẹ" },
    ig: { early: "Laghachi na nlekọta", longer: "Nlekọta nwayọ" },
    ha: { early: "Komawa ga kulawa", longer: "Kulawa cikin natsuwa" },
    tl: { early: "Balik sa pagiging katiwala", longer: "Katiwala nang mahinahon" },
    ar: { early: "عودة إلى الأمانة", longer: "الأمانة بهدوء" },
    hi: { early: "अभिभावकता पर वापसी", longer: "शांति से अभिभावकता" },
  },
  "sabbath-rest-5day": {
    en: { early: "Return to rest", longer: "Rest, gently" },
    es: { early: "Vuelve al descanso", longer: "Descanso con suavidad" },
    fr: { early: "Retour au repos", longer: "Repos en douceur" },
    pt: { early: "Volte ao descanso", longer: "Descanso com gentileza" },
    de: { early: "Zur Ruhe zurück", longer: "Sanfte Ruhe" },
    yo: { early: "Padà sí ìsinmi", longer: "Ìsinmi pẹ̀lẹ́" },
    ig: { early: "Laghachi na izu ike", longer: "Izu ike nwayọ" },
    ha: { early: "Komawa ga hutu", longer: "Hutu a hankali" },
    tl: { early: "Balik sa pahinga", longer: "Banayad na pahinga" },
    ar: { early: "عودة إلى الراحة", longer: "راحة بلطف" },
    hi: { early: "आराम पर वापसी", longer: "नरम आराम" },
  },
  "listening-3day": {
    en: { early: "Listen first", longer: "Listening again" },
    es: { early: "Escucha primero", longer: "Escuchar de nuevo" },
    fr: { early: "Écoute d'abord", longer: "Écouter à nouveau" },
    pt: { early: "Ouça primeiro", longer: "Voltando a ouvir" },
    de: { early: "Erst zuhören", longer: "Wieder zuhören" },
    yo: { early: "Gbọ́ kọ́kọ́", longer: "Gbọ́ lẹ́ẹ̀kansi" },
    ig: { early: "Gee ntị mbụ", longer: "Ige ntị ọzọ" },
    ha: { early: "Saurara da farko", longer: "Sauraro kuma" },
    tl: { early: "Makinig muna", longer: "Makinig muli" },
    ar: { early: "أنصت أولًا", longer: "الإنصات من جديد" },
    hi: { early: "पहले सुनें", longer: "फिर से सुनना" },
  },
  "repair-4day": {
    en: { early: "Repair, gently", longer: "A softer repair" },
    es: { early: "Repara, con suavidad", longer: "Una reparación más suave" },
    fr: { early: "Réparer, en douceur", longer: "Une réparation plus douce" },
    pt: { early: "Reparar, com gentileza", longer: "Uma reparação mais suave" },
    de: { early: "Sanft reparieren", longer: "Eine sanftere Reparatur" },
    yo: { early: "Túnṣe pẹ̀lẹ́", longer: "Túnṣe tó rọrùn síi" },
    ig: { early: "Dozie nwayọ", longer: "Ndozi dị nro" },
    ha: { early: "Gyara a hankali", longer: "Gyara mai laushi" },
    tl: { early: "Ayusin nang banayad", longer: "Mas banayad na pag-aayos" },
    ar: { early: "إصلاح بلطف", longer: "إصلاح ألطف" },
    hi: { early: "नरमी से सुधार", longer: "और कोमल सुधार" },
  },
  "generosity-7day": {
    en: { early: "Open hands again", longer: "Give from margin" },
    es: { early: "Manos abiertas otra vez", longer: "Dar desde el margen" },
    fr: { early: "Mains ouvertes à nouveau", longer: "Donner depuis la marge" },
    pt: { early: "Mãos abertas de novo", longer: "Dar a partir da sobra" },
    de: { early: "Wieder offene Hände", longer: "Aus dem Spielraum geben" },
    yo: { early: "Ọwọ́ ṣí lẹ́ẹ̀kansi", longer: "Fi láti àyè rẹ" },
    ig: { early: "Aka-emeghe ọzọ", longer: "Nye site n'ụgwọ" },
    ha: { early: "Bude hannu kuma", longer: "Ba daga abin da ya rage" },
    tl: { early: "Bukas-kamay muli", longer: "Magbigay mula sa sobra" },
    ar: { early: "الأيادي المفتوحة من جديد", longer: "أعطِ من السعة" },
    hi: { early: "फिर से खुले हाथ", longer: "अपनी क्षमता से दें" },
  },
  "attention-fast-5day": {
    en: { early: "A quieter focus", longer: "Return to silence" },
    es: { early: "Un enfoque más quieto", longer: "Volver al silencio" },
    fr: { early: "Un focus plus calme", longer: "Retour au silence" },
    pt: { early: "Um foco mais quieto", longer: "Voltar ao silêncio" },
    de: { early: "Mehr ruhiger Fokus", longer: "Zur Stille zurück" },
    yo: { early: "Ìfojúsùn tó dakẹ́", longer: "Padà sí ìdákẹ́jẹ" },
    ig: { early: "Elezigharị dị jụụ", longer: "Laghachi na nkịtị" },
    ha: { early: "Hankali mai natsuwa", longer: "Komawa ga shiru" },
    tl: { early: "Mas tahimik na pokus", longer: "Balik sa katahimikan" },
    ar: { early: "تركيز أهدأ", longer: "عودة إلى الصمت" },
    hi: { early: "अधिक शांत ध्यान", longer: "सन्नाटे में वापसी" },
  },
  "hidden-service-5day": {
    en: { early: "Quiet service again", longer: "One hidden act" },
    es: { early: "Servicio silencioso otra vez", longer: "Un acto oculto" },
    fr: { early: "Service discret à nouveau", longer: "Un geste caché" },
    pt: { early: "Serviço silencioso de novo", longer: "Um ato escondido" },
    de: { early: "Wieder still dienen", longer: "Eine verborgene Tat" },
    yo: { early: "Ìránṣẹ́ pẹ̀lẹ́ lẹ́ẹ̀kansi", longer: "Ìṣe tí ó farapamọ́ kan" },
    ig: { early: "Ọrụ zoro ezo ọzọ", longer: "Otu omume zoro ezo" },
    ha: { early: "Hidima a hankali kuma", longer: "Aiki guda a ɓoye" },
    tl: { early: "Tahimik na paglilingkod muli", longer: "Isang nakatagong gawa" },
    ar: { early: "خدمة هادئة من جديد", longer: "فعل خفي واحد" },
    hi: { early: "फिर से शांत सेवा", longer: "एक छिपा हुआ काम" },
  },
  "read-with-me-7day": {
    en: { early: "One page more", longer: "A quiet return" },
    es: { early: "Una página más", longer: "Un regreso tranquilo" },
    fr: { early: "Une page de plus", longer: "Un retour paisible" },
    pt: { early: "Mais uma página", longer: "Um retorno silencioso" },
    de: { early: "Eine Seite mehr", longer: "Ruhige Rückkehr" },
    yo: { early: "Ojúewé kan síi", longer: "Padà pẹ̀lẹ́" },
    ig: { early: "Otu ibe ọzọ", longer: "Nloghachi dị jụụ" },
    ha: { early: "Shafi daya kuma", longer: "Dawowa mai natsuwa" },
    tl: { early: "Isa pang pahina", longer: "Tahimik na pagbabalik" },
    ar: { early: "صفحة أخرى", longer: "عودة هادئة" },
    hi: { early: "एक और पन्ना", longer: "शांत वापसी" },
  },
};

const challengeReminderContinueCopy: Partial<Record<LanguageCode, string>> = {
  en: "Continue · {dayLabel}: {practice}",
  es: "Continúa · {dayLabel}: {practice}",
  fr: "Poursuis · {dayLabel} : {practice}",
  pt: "Continua · {dayLabel}: {practice}",
  de: "Weiter · {dayLabel}: {practice}",
  yo: "Tẹ̀síwájú · {dayLabel}: {practice}",
  ig: "Gaa n'ihu · {dayLabel}: {practice}",
  ha: "Ci gaba · {dayLabel}: {practice}",
  tl: "Magpatuloy · {dayLabel}: {practice}",
  ar: "تابع · {dayLabel}: {practice}",
  hi: "जारी रखें · {dayLabel}: {practice}",
};

const challengeReturnOnRampCopy: Record<ChallengeId, Partial<Record<LanguageCode, string[]>>> = {
  "gratitude-3day": {
    en: [
      "Start with one ordinary mercy you can name in 10 seconds.",
      "One gift is enough to reopen the practice.",
    ],
    es: [
      "Empieza con una misericordia cotidiana que puedas nombrar en 10 segundos.",
      "Un solo regalo basta para retomar la práctica.",
    ],
    fr: [
      "Commence par une grâce ordinaire que tu peux nommer en 10 secondes.",
      "Un seul don suffit pour rouvrir la pratique.",
    ],
    pt: [
      "Comece com uma misericórdia comum que você possa nomear em 10 segundos.",
      "Um único presente já basta para reabrir a prática.",
    ],
    de: [
      "Beginne mit einer alltäglichen Gnade, die du in 10 Sekunden benennen kannst.",
      "Eine einzige Gabe reicht, um die Übung wieder zu öffnen.",
    ],
    yo: [
      "Bẹrẹ pẹlu aanu ojoojúmọ́ kan tí o lè darukọ ní aaya 10.",
      "Ẹ̀bùn kan ṣoṣo tó láì tó láti tún ìṣe náà ṣí.",
    ],
    ig: [
      "Bido na otu ebere kwa ụbọchị ị nwere ike ịkpọ aha n'ime sekọnd iri.",
      "Onyinye otu zuru ezu iji mepee omume ahụ ọzọ.",
    ],
    ha: [
      "Ka fara da wata alheri ta yau da kullum da za ka iya ambata cikin sakan 10.",
      "Kyauta guda daya ta isa ta sake bude aikin.",
    ],
    tl: [
      "Magsimula sa isang karaniwang biyaya na kaya mong pangalanan sa 10 segundo.",
      "Sapat na ang isang handog para muling buksan ang pagsasanay.",
    ],
    ar: [
      "ابدأ بنعمةٍ عادية تستطيع أن تذكرها في 10 ثوانٍ.",
      "هدية واحدة تكفي لإعادة فتح الممارسة.",
    ],
    hi: [
      "10 सेकंड में नाम ले सकने वाली एक साधारण कृपा से शुरू करें.",
      "एक उपहार ही अभ्यास को फिर से खोलने के लिए पर्याप्त है.",
    ],
  },
  "shared-encouragement-3day": {
    en: [
      "Send one plain, specific encouragement. That is the whole re-entry.",
      "One kind sentence can restart the rhythm.",
    ],
    es: [
      "Envía un ánimo concreto y sencillo. Esa es toda la vuelta.",
      "Una frase amable puede reiniciar el ritmo.",
    ],
    fr: [
      "Envoie un encouragement simple et précis. C'est tout le retour.",
      "Une phrase bienveillante peut relancer le rythme.",
    ],
    pt: [
      "Envie um encorajamento simples e específico. Isso já é o retorno.",
      "Uma frase gentil pode reiniciar o ritmo.",
    ],
    de: [
      "Sende eine einfache, konkrete Ermutigung. Das ist der ganze Wiedereinstieg.",
      "Ein freundlicher Satz kann den Rhythmus neu starten.",
    ],
    yo: [
      "Rán ọ̀rọ̀ ìṣírí kan tó rọrùn, tó sì dájú. Ìpadà náà niyẹn.",
      "Gbólóhùn onínúure kan lè tún ìrìnàjò náà bẹ̀rẹ̀.",
    ],
    ig: [
      "Ziga otu nkwado dị mfe, kpọmkwem. Nke ahụ bụ nloghachi ahụ dum.",
      "Otu ahịrị obiọma nwere ike ịmaliteghachi usoro ahụ.",
    ],
    ha: [
      "Aika kalmar karfafawa guda daya mai sauki kuma takamaimai. Wannan shi ne dawowa.",
      "Jimla mai tausayi guda daya na iya dawo da tsarin.",
    ],
    tl: [
      "Magpadala ng isang payak at tiyak na pampalakas-loob. Iyan na ang buong pagbabalik.",
      "Isang mabait na pangungusap ang makapag-uumpisa muli ng ritmo.",
    ],
    ar: [
      "أرسل تشجيعًا واحدًا بسيطًا ومحددًا. هذه هي العودة كاملة.",
      "جملة واحدة لطيفة تكفي لإعادة الإيقاع.",
    ],
    hi: [
      "एक सीधा, विशिष्ट उत्साहवर्धन भेजें. यही पूरी वापसी है.",
      "एक दयालु वाक्य लय को फिर से शुरू कर सकता है.",
    ],
  },
  "waiting-5day": {
    en: [
      "Return gently: one breath, one honest note, no rush.",
      "Waiting can resume quietly. Begin where you are.",
    ],
    es: [
      "Vuelve con calma: una respiración, una nota honesta, sin prisa.",
      "La espera puede retomarse en silencio. Empieza donde estás.",
    ],
    fr: [
      "Reviens doucement : une respiration, une note honnête, sans hâte.",
      "L'attente peut reprendre en silence. Commence là où tu es.",
    ],
    pt: [
      "Volte com calma: uma respiração, uma nota honesta, sem pressa.",
      "A espera pode continuar em silêncio. Comece de onde você está.",
    ],
    de: [
      "Kehre sanft zurück: ein Atemzug, eine ehrliche Notiz, keine Eile.",
      "Warten darf leise weitergehen. Beginne dort, wo du bist.",
    ],
    yo: [
      "Padà pẹ̀lẹ́: ìmí kan, àkọsílẹ̀ tòótọ́ kan, kó sì sí ìkánjú.",
      "Dúró le tún bẹ̀rẹ̀ ní ìdákẹ́jẹ. Bẹ̀rẹ̀ níbi tí o wà.",
    ],
    ig: [
      "Laghachi nwayọ: iku ume otu, ndetu eziokwu otu, enweghị ọsọ.",
      "Ichere nwere ike ịga n'ihu nwayọ. Bido ebe ị nọ.",
    ],
    ha: [
      "Ka dawo a hankali: numfashi daya, rubutu daya na gaskiya, babu gaggawa.",
      "Jira na iya ci gaba a hankali. Fara daga inda kake.",
    ],
    tl: [
      "Bumalik nang banayad: isang hininga, isang tapat na tala, walang pagmamadali.",
      "Maaaring magpatuloy ang paghihintay nang tahimik. Magsimula kung nasaan ka.",
    ],
    ar: [
      "ارجع بلطف: نفس واحد، وملاحظة صادقة، بلا استعجال.",
      "يمكن للانتظار أن يستأنف بهدوء. ابدأ من حيث أنت.",
    ],
    hi: [
      "नरमी से लौटें: एक साँस, एक ईमानदार नोट, कोई जल्दबाज़ी नहीं.",
      "प्रतीक्षा शांतिपूर्वक जारी रह सकती है. जहाँ हैं वहीं से शुरू करें.",
    ],
  },
  "stewardship-7day": {
    en: [
      "Come back to the numbers with kindness, not pressure.",
      "One clear, honest check-in is enough to begin again.",
    ],
    es: [
      "Vuelve a los números con amabilidad, no con presión.",
      "Una revisión clara y honesta basta para empezar otra vez.",
    ],
    fr: [
      "Reviens aux chiffres avec douceur, pas avec pression.",
      "Un point clair et honnête suffit pour recommencer.",
    ],
    pt: [
      "Volte aos números com gentileza, não com pressão.",
      "Uma checagem clara e honesta basta para recomeçar.",
    ],
    de: [
      "Kehre mit Freundlichkeit zu den Zahlen zurück, nicht mit Druck.",
      "Ein klarer, ehrlicher Blick reicht, um neu zu beginnen.",
    ],
    yo: [
      "Padà sí àwọn nǹkan ìṣírò pẹ̀lú inúure, kì í ṣe pẹ̀lú ìfipá.",
      "Ìṣàyẹ̀wò kedere kan tó jẹ́ òtítọ́ tó láti bẹ̀rẹ̀ síi.",
    ],
    ig: [
      "Laghachi na ọnụọgụgụ n'obiọma, ọ bụghị nrụgide.",
      "Nlele doro anya, eziokwu otu zuru ezu iji malite ọzọ.",
    ],
    ha: [
      "Ka dawo ga lambobi da tausayi, ba tare da matsin lamba ba.",
      "Duba daya mai bayyana kuma na gaskiya ya isa ka fara kuma.",
    ],
    tl: [
      "Bumalik sa mga numero nang may kabaitan, hindi presyon.",
      "Sapat na ang isang malinaw at tapat na pagsusuri para magsimulang muli.",
    ],
    ar: [
      "عد إلى الأرقام بلطف لا بضغط.",
      "يكفي فحصٌ واحد واضح وصادق لتبدأ من جديد.",
    ],
    hi: [
      "संख्याओं पर दया के साथ लौटें, दबाव के साथ नहीं.",
      "एक स्पष्ट, ईमानदार जाँच फिर से शुरू करने के लिए काफी है.",
    ],
  },
  "sabbath-rest-5day": {
    en: [
      "Let rest return without ceremony. Make one small pause.",
      "Take a quieter breath and let the pace soften.",
    ],
    es: [
      "Deja que el descanso vuelva sin ceremonia. Haz una pausa pequeña.",
      "Toma una respiración más tranquila y deja que el ritmo afloje.",
    ],
    fr: [
      "Laisse le repos revenir sans cérémonie. Fais une petite pause.",
      "Prends une respiration plus calme et laisse le rythme s'adoucir.",
    ],
    pt: [
      "Deixe o descanso voltar sem cerimônia. Faça uma pequena pausa.",
      "Respire com mais calma e deixe o ritmo amolecer.",
    ],
    de: [
      "Lass die Ruhe ohne Zeremonie zurückkommen. Mach eine kleine Pause.",
      "Atme leiser und lass das Tempo sanfter werden.",
    ],
    yo: [
      "Jẹ́ kí ìsinmi padà láìsí ìpẹ̀yà. Gba ìdákẹ́jẹ kékeré kan.",
      "Mí sí i ní kíkankíkan kéré, kí ìtẹ̀síwájú rọra.",
    ],
    ig: [
      "Ka ezumike lọghachi n'enweghị emume. Mee obere nkwụsị.",
      "Kwụsị ume nwayọ ma hapụ ọsọ ndụ ka ọ dị nro.",
    ],
    ha: [
      "Ka hutawa ta dawo ba tare da al'ada ba. Yi dan dakata kaɗan.",
      "Yi numfashi a hankali, ka bar saurin ya lafa.",
    ],
    tl: [
      "Hayaan ang pahinga na bumalik nang walang seremonya. Magpahinga sandali.",
      "Huminga nang mas tahimik at hayaang lumambot ang bilis.",
    ],
    ar: [
      "دع الراحة تعود بلا طقوس. خذ وقفة صغيرة.",
      "خذ نفسًا أهدأ ودع الوتيرة تلين.",
    ],
    hi: [
      "आराम को बिना रस्म के लौटने दें. एक छोटी-सी विराम लें.",
      "थोड़ी शांत साँस लें और गति को नरम होने दें.",
    ],
  },
  "listening-3day": {
    en: [
      "Begin again by listening for one minute before you answer.",
      "Listen first, and let that be enough for today.",
    ],
    es: [
      "Empieza de nuevo escuchando un minuto antes de responder.",
      "Escucha primero y deja que eso baste por hoy.",
    ],
    fr: [
      "Recommence en écoutant une minute avant de répondre.",
      "Écoute d'abord, et cela suffit pour aujourd'hui.",
    ],
    pt: [
      "Comece de novo ouvindo por um minuto antes de responder.",
      "Ouça primeiro, e deixe isso bastar por hoje.",
    ],
    de: [
      "Beginne neu, indem du eine Minute zuhörst, bevor du antwortest.",
      "Hör zuerst zu, und lass das für heute genügen.",
    ],
    yo: [
      "Bẹ̀rẹ̀ síi nípa fífi ìsẹ́jú kan gbọ́ kí o tó dáhùn.",
      "Gbọ́ kọ́kọ́, kí ó sì tó fún òní.",
    ],
    ig: [
      "Malite ọzọ site n'ige ntị otu nkeji tupu ịza.",
      "Gee ntị mbụ, ma hapụ nke ahụ zuo ezu maka taa.",
    ],
    ha: [
      "Fara kuma da sauraro na minti daya kafin ka amsa.",
      "Saurara da farko, kuma hakan ya isa na yau.",
    ],
    tl: [
      "Magsimulang muli sa pakikinig nang isang minuto bago sumagot.",
      "Makinig muna, at hayaang sapat na iyon para ngayon.",
    ],
    ar: [
      "ابدأ من جديد بالإنصات دقيقة واحدة قبل أن تجيب.",
      "أنصت أولًا، ودع ذلك يكفي لليوم.",
    ],
    hi: [
      "जवाब देने से पहले एक मिनट सुनकर फिर से शुरू करें.",
      "पहले सुनें, और आज के लिए इतना ही काफी रहने दें.",
    ],
  },
  "repair-4day": {
    en: [
      "You do not have to fix the whole story today.",
      "Return with one truthful sentence and one kind step.",
    ],
    es: [
      "No tienes que arreglar toda la historia hoy.",
      "Vuelve con una frase honesta y un paso amable.",
    ],
    fr: [
      "Tu n'as pas à réparer toute l'histoire aujourd'hui.",
      "Reviens avec une phrase vraie et un geste bienveillant.",
    ],
    pt: [
      "Você não precisa consertar toda a história hoje.",
      "Volte com uma frase verdadeira e um passo gentil.",
    ],
    de: [
      "Du musst heute nicht die ganze Geschichte reparieren.",
      "Kehre mit einem ehrlichen Satz und einem freundlichen Schritt zurück.",
    ],
    yo: [
      "O kò ní láti tún gbogbo ìtàn náà ṣe lónìí.",
      "Padà pẹ̀lú gbolóhùn òtítọ́ kan àti ìgbésẹ̀ onínúure kan.",
    ],
    ig: [
      "Ị gaghị edozi akụkọ dum taa.",
      "Laghachi na ahịrịokwu eziokwu otu na nzọụkwụ obiọma otu.",
    ],
    ha: [
      "Ba sai ka gyara dukan labarin yau ba.",
      "Ka dawo da jimla guda ta gaskiya da mataki guda na alheri.",
    ],
    tl: [
      "Hindi mo kailangang ayusin ang buong kuwento ngayon.",
      "Bumalik na may isang tapat na pangungusap at isang mabait na hakbang.",
    ],
    ar: [
      "لستَ مضطرًا لإصلاح القصة كلها اليوم.",
      "ارجع بجملة صادقة وخطوة لطيفة.",
    ],
    hi: [
      "आज पूरी कहानी सुधारने की ज़रूरत नहीं है.",
      "एक सच्चे वाक्य और एक दयालु कदम के साथ लौटें.",
    ],
  },
  "generosity-7day": {
    en: [
      "Give from margin, not pressure. One free act is enough.",
      "Re-enter with one open-handed step.",
    ],
    es: [
      "Da desde el margen, no desde la presión. Un acto libre basta.",
      "Vuelve con un paso de mano abierta.",
    ],
    fr: [
      "Donne depuis la marge, pas sous pression. Un geste libre suffit.",
      "Reviens avec un pas ouvert.",
    ],
    pt: [
      "Doe a partir da sobra, não da pressão. Um ato livre basta.",
      "Volte com um passo de mão aberta.",
    ],
    de: [
      "Gib aus dem Spielraum, nicht aus Druck. Eine freie Tat reicht.",
      "Kehre mit einem offenen Schritt zurück.",
    ],
    yo: [
      "Fi láti ẹ̀yà ìdákọja rẹ, kì í ṣe lábẹ́ ìfipá. Ìṣe òmìnira kan tó.",
      "Padà pẹ̀lú ìgbésẹ̀ ọwọ́-ṣí kan.",
    ],
    ig: [
      "Nyee site n'ókè ụsọ, ọ bụghị nrụgide. Omume nnwere onwe otu zuru ezu.",
      "Laghachi na nzọụkwụ aka-emeghe otu.",
    ],
    ha: [
      "Ka bayar daga abin da ya rage, ba daga matsin lamba ba. Aiki guda mai 'yanci ya isa.",
      "Ka dawo da mataki guda mai bude hannu.",
    ],
    tl: [
      "Magbigay mula sa sobra, hindi sa pressure. Sapat na ang isang malayang gawa.",
      "Bumalik na may isang bukas-kamay na hakbang.",
    ],
    ar: [
      "أعطِ من السعة لا من الضغط. يكفي فعلٌ واحدٌ حر.",
      "ارجع بخطوة واحدة منفتحة اليد.",
    ],
    hi: [
      "दबाव से नहीं, अपनी क्षमता से दें. एक मुक्त कार्य पर्याप्त है.",
      "एक खुले हाथ वाले कदम के साथ लौटें.",
    ],
  },
  "attention-fast-5day": {
    en: [
      "Choose one quiet gap from the noise and begin there.",
      "Return by making one small pocket of silence.",
    ],
    es: [
      "Elige un pequeño hueco de silencio dentro del ruido y empieza ahí.",
      "Vuelve creando un pequeño bolsillo de silencio.",
    ],
    fr: [
      "Choisis un petit espace de calme dans le bruit et commence là.",
      "Reviens en créant une petite poche de silence.",
    ],
    pt: [
      "Escolha um pequeno intervalo de silêncio no ruído e comece ali.",
      "Volte criando um pequeno bolso de silêncio.",
    ],
    de: [
      "Wähle eine kleine ruhige Lücke im Lärm und beginne dort.",
      "Kehre zurück, indem du eine kleine Stille schaffst.",
    ],
    yo: [
      "Yan ààyè ìdákẹ́jẹ kan nínú ariwo, kí o sì bẹ̀rẹ̀ níbẹ̀.",
      "Padà nípa ṣíṣe àpò ìdákẹ́jẹ kékeré kan.",
    ],
    ig: [
      "Họrọ oghere dị jụụ n'etiti mkpọtụ wee bido ebe ahụ.",
      "Laghachi site n'ime obere akpa nke nkịtị.",
    ],
    ha: [
      "Zabi wani karamin gurbi na natsuwa daga hayaniya ka fara daga can.",
      "Ka dawo ta hanyar kirkirar karamin aljihun shiru.",
    ],
    tl: [
      "Pumili ng isang tahimik na puwang sa gitna ng ingay at doon magsimula.",
      "Bumalik sa paggawa ng isang maliit na bulsa ng katahimikan.",
    ],
    ar: [
      "اختر فراغًا هادئًا صغيرًا من الضجيج وابدأ منه.",
      "ارجع بصنع جيب صغير من الصمت.",
    ],
    hi: [
      "शोर के बीच एक छोटा शांत विराम चुनें और वहीं से शुरू करें.",
      "सन्नाटे की एक छोटी-सी जेब बनाकर लौटें.",
    ],
  },
  "hidden-service-5day": {
    en: [
      "Do one quiet good thing unseen, and let that count.",
      "Re-enter by serving without needing credit.",
    ],
    es: [
      "Haz una buena acción silenciosa y oculta, y deja que cuente.",
      "Vuelve sirviendo sin buscar reconocimiento.",
    ],
    fr: [
      "Fais une bonne action discrète et cachée, et laisse-la compter.",
      "Reviens en servant sans chercher de crédit.",
    ],
    pt: [
      "Faça uma boa ação silenciosa e escondida, e deixe isso contar.",
      "Volte servindo sem precisar de crédito.",
    ],
    de: [
      "Tu eine stille, verborgene gute Tat und lass sie zählen.",
      "Kehre zurück, indem du dienst, ohne Anerkennung zu brauchen.",
    ],
    yo: [
      "Ṣe ohun rere kan ní ìdákẹ́jẹ, láì jẹ́ kó hàn, kí o sì jẹ́ kó ka.",
      "Padà nípa sísin láì nílò ìyìn.",
    ],
    ig: [
      "Mee ezigbo ihe otu nwayọ, nke a na-ahụghị, ma hapụ ka ọ gụọ.",
      "Laghachi site n'ijere ozi na-enweghị mkpa otuto.",
    ],
    ha: [
      "Yi abuɗe mai kyau guda daya a ɓoye, ka bar shi ya ƙidayu.",
      "Ka dawo ta hanyar yin hidima ba tare da neman yabo ba.",
    ],
    tl: [
      "Gumawa ng isang tahimik at hindi nakikitang kabutihan, at hayaang mabilang iyon.",
      "Bumalik sa paglilingkod nang hindi naghahanap ng papuri.",
    ],
    ar: [
      "افعل خيرًا هادئًا واحدًا في الخفاء، ودعه يُحتسب.",
      "ارجع بالخدمة دون حاجةٍ إلى التصفيق.",
    ],
    hi: [
      "एक शांत, अनदेखा भला काम करें, और उसे गिनने दें.",
      "बिना श्रेय की ज़रूरत के सेवा करके लौटें.",
    ],
  },
  "read-with-me-7day": {
    en: [
      "Open one page, not the whole book.",
      "Ease back in with a single paragraph and no pressure.",
    ],
    es: [
      "Abre una sola página, no todo el libro.",
      "Vuelve con un solo párrafo y sin presión.",
    ],
    fr: [
      "Ouvre une seule page, pas tout le livre.",
      "Reviens avec un seul paragraphe, sans pression.",
    ],
    pt: [
      "Abra uma página, não o livro inteiro.",
      "Volte com um único parágrafo e sem pressão.",
    ],
    de: [
      "Öffne nur eine Seite, nicht das ganze Buch.",
      "Kehre mit einem einzigen Absatz und ohne Druck zurück.",
    ],
    yo: [
      "Ṣí ojúewé kan ṣoṣo, kì í ṣe gbogbo ìwé.",
      "Padà pẹ̀lú àrọ̀kọ kan ṣoṣo, láìsí ìfipá.",
    ],
    ig: [
      "Mepee otu ibe naanị, ọ bụghị akwụkwọ dum.",
      "Laghachi na paragraf otu, enweghị nrụgide.",
    ],
    ha: [
      "Bude shafi daya kawai, ba dukan littafi ba.",
      "Ka dawo da sakin layi guda daya ba tare da matsin lamba ba.",
    ],
    tl: [
      "Buksan ang isang pahina, hindi ang buong libro.",
      "Bumalik na may isang talata lang at walang pressure.",
    ],
    ar: [
      "افتح صفحة واحدة، لا الكتاب كله.",
      "ارجع بفقرة واحدة فقط، بلا ضغط.",
    ],
    hi: [
      "सिर्फ एक पन्ना खोलें, पूरी किताब नहीं.",
      "एक ही अनुच्छेद के साथ, बिना दबाव के वापस आएँ.",
    ],
  },
};

function challengeReminderReentryIntro(language: LanguageCode, challengeId: ChallengeId) {
  const challengeCopy = challengeReturnOnRampCopy[challengeId];
  const challengeSpecific = challengeCopy[language] ?? challengeCopy.en ?? [];
  const base = challengeReminderReentryCopy[language] ?? challengeReminderReentryCopy.en!;
  return [base, ...challengeSpecific];
}

function challengeReentryTone(language: LanguageCode, tone: "early" | "longer") {
  return challengeReentryToneCopy[language]?.[tone] ?? challengeReentryToneCopy.en[tone];
}

function challengeReentryTitleSuffix(language: LanguageCode, tone: "early" | "longer") {
  return challengeReentryTitleCopy[language]?.[tone] ?? challengeReentryTitleCopy.en[tone];
}

function challengeSpecificReentryTitle(input: {
  language: LanguageCode;
  challengeId: ChallengeId;
  tone: "early" | "longer";
}) {
  const challengeCopy = challengeAwareReentryTitleCopy[input.challengeId];
  const localized = challengeCopy[input.language] ?? challengeCopy.en;
  if (localized) {
    return localized[input.tone];
  }

  return challengeReentryTitleSuffix(input.language, input.tone);
}

function localCalendarDayGap(current: string, previous: string) {
  const currentMs = Date.parse(`${current}T00:00:00Z`);
  const previousMs = Date.parse(`${previous}T00:00:00Z`);
  if (!Number.isFinite(currentMs) || !Number.isFinite(previousMs)) {
    return 0;
  }

  return Math.floor((currentMs - previousMs) / (24 * 60 * 60 * 1000));
}

function followupNotificationPayload(reminder: DueDecisionReminder) {
  const trimmedTitle = reminder.title.replace(/\s+/g, " ").trim();
  const copy = reminderCopyLanguage(reminder.language);
  const variant = stableHash(`${reminder.userId}:${reminder.decisionId}:${reminder.kind}:${reminder.dueAt}`) % 3;
  const titleOptions = reminder.kind === "waiting" ? copy.waitingTitles : copy.revisitTitles;
  const bodyOptions = reminder.kind === "waiting" ? copy.waitingBodies : copy.revisitBodies;
  const body = `“${compactNotificationCopy(trimmedTitle, 68)}” ${bodyOptions[variant % bodyOptions.length]}`;

  return {
    title: compactNotificationCopy(titleOptions[variant % titleOptions.length], 72),
    body: compactNotificationCopy(body, 156),
    url: `/?source=notification&focus=decision&decisionId=${encodeURIComponent(reminder.decisionId)}&kind=${reminder.kind}`,
    tag: `aletheia-decision-${reminder.kind}-${notificationTagPart(reminder.decisionId)}-${notificationTagPart(reminder.dueAt.slice(0, 10))}`,
    notificationId: `${reminder.decisionId}:${reminder.kind}:${reminder.dueAt}`,
    decisionId: reminder.decisionId,
    reminderKind: reminder.kind,
    notificationKind: "decision_followup",
  };
}

function challengeReminderBody(input: {
  language: LanguageCode;
  challengeId: ChallengeId;
  tone: "early" | "longer";
  dayLabel: string;
  practiceText: string;
  reentry: boolean;
}) {
  const cleanDayLabel = compactNotificationCopy(normalizeNotificationSegment(input.dayLabel, "Day 1"), 24);
  const cleanPractice = compactNotificationCopy(normalizeNotificationSegment(input.practiceText, "Open today's practice."), 104);
  if (input.reentry) {
    const intro = challengeReminderReentryIntro(input.language, input.challengeId);
    const variant = stableHash(`${input.challengeId}:${input.language}:${cleanDayLabel}:${cleanPractice}`) % Math.max(1, intro.length);
    const selectedIntro = intro[variant] ?? intro[0] ?? challengeReminderReentryCopy.en!;
    return compactNotificationCopy(
      `${challengeReentryTone(input.language, input.tone)} ${selectedIntro} ${cleanDayLabel}: ${cleanPractice}`,
      156
    );
  }

  const copy = challengeReminderContinueCopy[input.language] ?? challengeReminderContinueCopy.en!;
  return compactNotificationCopy(copy.replace("{dayLabel}", cleanDayLabel).replace("{practice}", cleanPractice), 156);
}

function challengeReminderTitle(input: {
  language: LanguageCode;
  baseTitle: string;
  challengeId: ChallengeId;
  tone: "early" | "longer";
  reentry: boolean;
}) {
  if (!input.reentry) {
    return input.baseTitle;
  }

  return compactNotificationCopy(
    `${input.baseTitle} · ${challengeSpecificReentryTitle(input)}`,
    68
  );
}

function fastingReminderBody(input: {
  language: LanguageCode;
  tone: "early" | "longer";
  reentry: boolean;
  dayLabel: string;
  scripture: string;
  practice: string;
  totalLabel: string;
  goal: string;
  translations: ReturnType<typeof loadTranslationsSync>;
}) {
  const lead = input.reentry
    ? challengeReentryTone(input.language, input.tone)
    : compactNotificationCopy(String(getTranslation(input.translations, "challenges.fastingCustom.title", "Fasting Practice")), 48);
  const daySegment = compactNotificationCopy(normalizeNotificationSegment(input.dayLabel, "Day 1"), 24);
  const scriptureSegment = compactNotificationCopy(normalizeNotificationSegment(input.scripture, "Matthew 6:16-18"), 56);
  const practiceSegment = compactNotificationCopy(normalizeNotificationSegment(input.practice, "Begin with one clear intention."), 100);
  const totalSegment = compactNotificationCopy(normalizeNotificationSegment(input.totalLabel, ""), 24);
  const goalLabel = String(getTranslation(input.translations, "labels.goal", "Goal"));
  const goalSegment = input.goal.trim()
    ? compactNotificationCopy(`${goalLabel}: ${normalizeNotificationSegment(input.goal, "")}`, 56)
    : "";

  return compactNotificationCopy(
    [
      lead,
      totalSegment ? `${daySegment} of ${totalSegment}` : daySegment,
      scriptureSegment,
      practiceSegment,
      goalSegment,
    ]
      .filter(Boolean)
      .join(" · "),
    156
  );
}

function localHourForTimezone(date: Date, timezone: string | null | undefined) {
  const safeTimezone = timezone || "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTimezone,
      hour: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? date.getUTCHours());
    return hour === 24 ? 0 : hour;
  } catch {
    return date.getUTCHours();
  }
}

function localDateForTimezone(date: Date, timezone: string | null | undefined) {
  const safeTimezone = timezone || "UTC";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: safeTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function shouldSendAtLocalHour(row: PushRow, now: Date) {
  const preferredLocalHour = Number.isInteger(row.preferred_local_hour)
    ? Math.min(23, Math.max(0, Number(row.preferred_local_hour)))
    : Math.min(23, Math.max(0, Number(row.preferred_hour ?? 8)));
  const localHour = localHourForTimezone(now, row.preferred_timezone);
  const alreadySentToday =
    row.last_sent_at &&
    localDateForTimezone(new Date(row.last_sent_at), row.preferred_timezone) ===
      localDateForTimezone(now, row.preferred_timezone);
  if (alreadySentToday) {
    return false;
  }

  return localHour >= preferredLocalHour;
}

function shouldSendGratitudeAtLocalHour(row: PushRow, now: Date) {
  const localHour = localHourForTimezone(now, row.preferred_timezone);
  const alreadySentToday =
    row.last_gratitude_sent_at &&
    localDateForTimezone(new Date(row.last_gratitude_sent_at), row.preferred_timezone) ===
      localDateForTimezone(now, row.preferred_timezone);
  if (alreadySentToday) {
    return false;
  }

  return localHour >= GRATITUDE_REFLECTION_LOCAL_HOUR;
}

function shouldDeleteBrokenSubscription(error: unknown) {
  if (typeof error !== "object" || !error) {
    return false;
  }

  const statusCode = "statusCode" in error ? Number((error as { statusCode?: unknown }).statusCode) : 0;
  if (statusCode === 404 || statusCode === 410) {
    return true;
  }

  const body = "body" in error ? String((error as { body?: unknown }).body ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  const details = `${body} ${message}`.toLowerCase();

  // Subscriptions created with a different VAPID key pair can never recover.
  if (details.includes("vapidpkhashmismatch")) {
    return true;
  }
  if (details.includes("vapid credentials") && details.includes("do not correspond")) {
    return true;
  }

  return false;
}

function classifyPushFailure(error: unknown): PushFailureKind {
  const statusCode = pushErrorStatusCode(error);
  const body =
    typeof error === "object" && error && "body" in error
      ? String((error as { body?: unknown }).body ?? "")
      : "";
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");
  const details = `${body} ${message}`.toLowerCase();

  if (details.includes("vapidpkhashmismatch")) {
    return "vapid_failure";
  }
  if (details.includes("vapid credentials") && details.includes("do not correspond")) {
    return "vapid_failure";
  }
  if (statusCode === 404 || statusCode === 410) {
    return "endpoint_rejected";
  }
  if (isRetryablePushError(error)) {
    return "retryable_failure";
  }
  return "unknown_failure";
}

function summarizePushFailure(error: unknown, row: PushRow, deleted: boolean): PushFailureSample {
  const statusCode =
    typeof error === "object" && error && "statusCode" in error
      ? Number((error as { statusCode?: unknown }).statusCode) || null
      : null;
  const body =
    typeof error === "object" && error && "body" in error
      ? String((error as { body?: unknown }).body ?? "")
      : "";
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "Unknown push error");
  const reason = `${statusCode ? `${statusCode}: ` : ""}${body || message}`
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

  return {
    id: row.id,
    userId: row.user_id,
    statusCode,
    reason: reason || "Unknown push error",
    deleted,
  };
}

async function recordPushDeliveryFailure(error: unknown, row: PushRow, deleted: boolean) {
  const failureKind = classifyPushFailure(error);
  const statusCode = pushErrorStatusCode(error);
  const body =
    typeof error === "object" && error && "body" in error
      ? String((error as { body?: unknown }).body ?? "")
      : "";
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "Unknown push error");
  const reason = `${statusCode ? `${statusCode}: ` : ""}${body || message}`
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  const now = new Date().toISOString();

  await run(
    `INSERT INTO push_delivery_failures (
       id, subscription_id, user_id, failure_kind, status_code, reason, deleted, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    crypto.randomUUID(),
    row.id,
    row.user_id,
    failureKind,
    statusCode,
    reason || "Unknown push error",
    deleted,
    now,
    now
  ).catch(() => undefined);
}

async function sendPushRows(
  rows: PushRow[],
  payloadForRow: (row: PushRow) => string,
  { lastSentColumn = "last_sent_at" }: { lastSentColumn?: "last_sent_at" | "last_gratitude_sent_at" | null } = {}
) {
  let sent = 0;
  let failed = 0;
  const failureSamples: PushFailureSample[] = [];

  const BATCH_SIZE = 10;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (row) => {
        const subscription: PushSubscription = {
          endpoint: row.endpoint,
          keys: {
            p256dh: row.p256dh,
            auth: row.auth,
          },
        };

        try {
          await sendNotificationWithRetry(subscription, payloadForRow(row));
          const deliveredAt = new Date().toISOString();
          await markPushSubscriptionFreshness(row.id, deliveredAt, lastSentColumn);
          sent += 1;
        } catch (error) {
          failed += 1;
          const deleted = shouldDeleteBrokenSubscription(error);
          const failure = summarizePushFailure(error, row, deleted);
          failureSamples.push(failure);
          await recordPushDeliveryFailure(error, row, deleted);
          console.warn(
            `Push notification failed: subscription=${failure.id} user=${failure.userId} status=${failure.statusCode ?? "n/a"} deleted=${failure.deleted} reason=${failure.reason}`
          );
          if (deleted) {
            await run("DELETE FROM push_subscriptions WHERE id = ?", row.id);
          }
        }
      })
    );
  }

  return { sent, failed, failureSamples };
}

async function challengeCircleNudgeTargetUserIds(circleId: string, senderUserId: string, recipientUserId: string | null) {
  if (recipientUserId) {
    return [recipientUserId];
  }

  const rows = await many<ChallengeCircleNudgeTargetRow>(
    `SELECT user_id
     FROM challenge_circle_members
     WHERE circle_id = ?
       AND user_id <> ?`,
    circleId,
    senderUserId
  );

  return rows.map((row) => row.user_id);
}

export async function sendChallengeCircleNudgeNotifications(input: ChallengeCircleNudgePushInput) {
  if (!isPushConfigured()) {
    return {
      configured: false,
      attempted: 0,
      sent: 0,
      failed: 0,
      failureSamples: [],
    };
  }

  const targetUserIds = await challengeCircleNudgeTargetUserIds(input.circleId, input.senderUserId, input.recipientUserId);
  if (targetUserIds.length === 0) {
    const now = new Date().toISOString();
    const summary: ChallengeCircleNudgeDeliverySummary = {
      id: crypto.randomUUID(),
      nudgeId: input.nudgeId,
      circleId: input.circleId,
      challengeId: input.challengeId,
      senderUserId: input.senderUserId,
      recipientUserId: input.recipientUserId,
      status: "no_push_subscription",
      reason: "no_push_subscription",
      acceptedRecipientCount: 0,
      pushSubscriptionCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      openedCount: 0,
      attemptedAt: null,
      deliveredAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await upsertChallengeCircleNudgeDelivery(summary);
    return {
      configured: true,
      attempted: 0,
      sent: 0,
      failed: 0,
      failureSamples: [],
    };
  }

  const rows = await many<PushRow>(
    `SELECT push_subscriptions.id, push_subscriptions.user_id, endpoint, p256dh, auth, push_subscriptions.enabled, preferred_hour, last_sent_at,
            preferred_local_hour, preferred_timezone, delivery_strategy, last_gratitude_sent_at,
            user_preferences.language, user_preferences.region, user_preferences.bible_translation, user_preferences.voice_enabled,
            user_preferences.counsel_notifications_enabled, user_preferences.formation_notifications_enabled
     FROM push_subscriptions
     LEFT JOIN user_preferences ON user_preferences.user_id = push_subscriptions.user_id
     WHERE push_subscriptions.user_id = ANY(?)`,
    targetUserIds
  );
  const { enabledRows, disabledRecipientCount, missingActiveRecipientCount } = splitPushSubscriptionRows(rows, targetUserIds);
  const eligibleRows = enabledRows.filter((row) => formationNotificationsEnabled(row));
  const eligibleRecipientCount = new Set(eligibleRows.map((row) => row.user_id)).size;

  const { sent, failed, failureSamples } = await sendPushRows(
    eligibleRows,
    (row) => JSON.stringify(challengeCircleNudgeNotificationPayload(row, input)),
    { lastSentColumn: null }
  );

  const summary: ChallengeCircleNudgeDeliverySummary = {
    id: crypto.randomUUID(),
    nudgeId: input.nudgeId,
    circleId: input.circleId,
    challengeId: input.challengeId,
    senderUserId: input.senderUserId,
    recipientUserId: input.recipientUserId,
    status:
      sent > 0 && failed === 0 && missingActiveRecipientCount === 0
        ? "sent_to_push_service"
        : sent > 0 && (failed > 0 || missingActiveRecipientCount > 0)
          ? "partial"
          : failed > 0
            ? "failed"
            : "no_push_subscription",
    reason:
      eligibleRows.length === 0 && enabledRows.length > 0
        ? "muted_by_preferences"
        : missingActiveRecipientCount > 0
        ? disabledRecipientCount > 0
          ? "disabled_push_subscription"
          : "no_push_subscription"
        : failed > 0
          ? "push_failed"
          : null,
    acceptedRecipientCount: targetUserIds.length,
    pushSubscriptionCount: eligibleRecipientCount,
    deliveredCount: sent,
    failedCount: failed,
    openedCount: 0,
    attemptedAt: new Date().toISOString(),
    deliveredAt: sent > 0 ? new Date().toISOString() : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await upsertChallengeCircleNudgeDelivery(summary);

  await sendNativePushFanOut(
    targetUserIds,
    (row) => formationNotificationsEnabled(row),
    (row) => challengeCircleNudgeNotificationPayload(row, input)
  );

  return {
    configured: true,
    attempted: enabledRows.length,
    sent,
    failed,
    failureSamples,
  };
}

async function findDueDecisionReminders() {
  const rows = await many<DueDecisionReminderRow>(
    `SELECT
       wisdom_decisions.id,
       wisdom_decisions.user_id,
       wisdom_decisions.title,
       wisdom_decisions.waiting_until,
       wisdom_decisions.revisit_at,
       user_preferences.language,
       (waiting_until IS NOT NULL AND waiting_until <= NOW() AND (waiting_notified_at IS NULL OR waiting_notified_at < waiting_until)) AS waiting_due,
       (revisit_at IS NOT NULL AND revisit_at <= NOW() AND (revisit_notified_at IS NULL OR revisit_notified_at < revisit_at)) AS revisit_due
     FROM wisdom_decisions
     LEFT JOIN user_preferences ON user_preferences.user_id = wisdom_decisions.user_id
     WHERE status <> 'closed'
       AND (
         (waiting_until IS NOT NULL AND waiting_until <= NOW() AND (waiting_notified_at IS NULL OR waiting_notified_at < waiting_until))
         OR
         (revisit_at IS NOT NULL AND revisit_at <= NOW() AND (revisit_notified_at IS NULL OR revisit_notified_at < revisit_at))
       )`
  );

  const reminders: DueDecisionReminder[] = [];
  for (const row of rows) {
    if (row.waiting_due && row.waiting_until) {
      reminders.push({
        decisionId: row.id,
        userId: row.user_id,
        title: row.title,
        kind: "waiting",
        dueAt: normalizeTimestamp(row.waiting_until),
        language: normalizePreferences({ language: row.language as LanguageCode }).language,
      });
    }
    if (row.revisit_due && row.revisit_at) {
      reminders.push({
        decisionId: row.id,
        userId: row.user_id,
        title: row.title,
        kind: "revisit",
        dueAt: normalizeTimestamp(row.revisit_at),
        language: normalizePreferences({ language: row.language as LanguageCode }).language,
      });
    }
  }

  return reminders;
}

async function markDecisionReminderNotified(reminder: DueDecisionReminder, deliveredAtIso: string) {
  if (reminder.kind === "waiting") {
    await run(
      `UPDATE wisdom_decisions
       SET waiting_notified_at = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
      deliveredAtIso,
      deliveredAtIso,
      reminder.decisionId,
      reminder.userId
    );
    return;
  }

  await run(
    `UPDATE wisdom_decisions
     SET revisit_notified_at = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
    deliveredAtIso,
    deliveredAtIso,
    reminder.decisionId,
    reminder.userId
  );
}

export async function sendDailyWisdomNotifications(now = new Date()) {
  configureWebPush();

  const currentHour = now.getUTCHours();

  // Fetch wisdom entries once for all notifications
  const wisdomEntries = await getWisdomEntries();
  const nativeRows = isNativePushConfigured() ? await loadEnabledNativePushTargets() : [];

  const rows = await many<PushRow>(
    `SELECT push_subscriptions.id, push_subscriptions.user_id, endpoint, p256dh, auth, preferred_hour, last_sent_at,
            preferred_local_hour, preferred_timezone, delivery_strategy, last_gratitude_sent_at,
            user_preferences.language, user_preferences.region, user_preferences.bible_translation, user_preferences.voice_enabled
     FROM push_subscriptions
     LEFT JOIN user_preferences ON user_preferences.user_id = push_subscriptions.user_id
     WHERE enabled = TRUE`,
  );

  const reminders = await findDueDecisionReminders();
  const remindersByUser = new Map<string, DueDecisionReminder[]>();
  for (const reminder of reminders) {
    const bucket = remindersByUser.get(reminder.userId);
    if (bucket) {
      bucket.push(reminder);
    } else {
      remindersByUser.set(reminder.userId, [reminder]);
    }
  }

  const selectedReminders = new Map<string, DueDecisionReminder>();
  for (const [userId, userReminders] of remindersByUser.entries()) {
    const selected = selectReminderForUser(userReminders);
    if (selected) {
      selectedReminders.set(userId, selected);
    }
  }

  let followupAttempted = 0;
  let followupSent = 0;
  let followupFailed = 0;
  const followupFailureSamples: PushFailureSample[] = [];
  let followupDecisionsNotified = 0;
  const followupUsers = new Set(selectedReminders.keys());

  for (const [userId, reminder] of selectedReminders.entries()) {
    const userRows = rows.filter((row) => row.user_id === userId);
    const userNativeRows = nativeRows.filter((row) => row.user_id === userId);
    if (!userRows.length && !userNativeRows.length) {
      continue;
    }

    const payload = followupNotificationPayload(reminder);
    const result = await sendPushRows(userRows, () => JSON.stringify(payload), { lastSentColumn: null });
    const nativeResult = await sendNativePushRows(userNativeRows, () => payload);

    followupAttempted += userRows.length + nativeResult.attempted;
    followupSent += result.sent + nativeResult.sent;
    followupFailed += result.failed + nativeResult.failed;
    followupFailureSamples.push(...result.failureSamples, ...nativeResult.failureSamples);

    if (result.sent > 0 || nativeResult.sent > 0) {
      await markDecisionReminderNotified(reminder, now.toISOString());
      followupDecisionsNotified += 1;
    }
  }

  const dueRows = rows.filter((row) => !followupUsers.has(row.user_id) && shouldSendAtLocalHour(row, now));
  const { sent, failed, failureSamples } = await sendPushRows(dueRows, (row) =>
    JSON.stringify(dailyNotificationPayload(row, wisdomEntries))
  );
  const dailyNativeRows = nativeRows.filter(
    (row) => !followupUsers.has(row.user_id) && shouldSendAtLocalHour(asPushRow(row), now)
  );
  const dailyNativeResult = await sendNativePushRows(
    dailyNativeRows,
    (row) => dailyNotificationPayload(asPushRow(row), wisdomEntries)
  );
  const dailyUsers = new Set([
    ...dueRows.map((row) => row.user_id),
    ...dailyNativeRows.map((row) => row.user_id),
  ]);
  const gratitudeRows = rows.filter(
    (row) => !followupUsers.has(row.user_id) && !dailyUsers.has(row.user_id) && shouldSendGratitudeAtLocalHour(row, now)
  );
  const gratitudeResult = await sendPushRows(
    gratitudeRows,
    (row) => JSON.stringify(gratitudeNotificationPayload(row)),
    { lastSentColumn: "last_gratitude_sent_at" }
  );
  const gratitudeNativeRows = nativeRows.filter(
    (row) =>
      !followupUsers.has(row.user_id) &&
      !dailyUsers.has(row.user_id) &&
      shouldSendGratitudeAtLocalHour(asPushRow(row), now)
  );
  const gratitudeNativeResult = await sendNativePushRows(
    gratitudeNativeRows,
    (row) => gratitudeNotificationPayload(asPushRow(row)),
    { lastSentColumn: "last_gratitude_sent_at" }
  );

  return {
    attempted: dueRows.length + followupAttempted + gratitudeRows.length + dailyNativeResult.attempted + gratitudeNativeResult.attempted,
    sent: sent + followupSent + gratitudeResult.sent + dailyNativeResult.sent + gratitudeNativeResult.sent,
    failed: failed + followupFailed + gratitudeResult.failed + dailyNativeResult.failed + gratitudeNativeResult.failed,
    scanned: rows.length,
    skipped: Math.max(0, rows.length - dueRows.length - followupAttempted - gratitudeRows.length),
    catchupAttempted: 0,
    hour: currentHour,
    followupAttempted,
    followupSent,
    followupFailed,
    followupDecisionsNotified,
    gratitudeAttempted: gratitudeRows.length + gratitudeNativeResult.attempted,
    gratitudeSent: gratitudeResult.sent + gratitudeNativeResult.sent,
    gratitudeFailed: gratitudeResult.failed + gratitudeNativeResult.failed,
    failureSamples: [...followupFailureSamples, ...failureSamples, ...gratitudeResult.failureSamples, ...dailyNativeResult.failureSamples, ...gratitudeNativeResult.failureSamples].slice(0, 5),
  };
}

export async function sendPendingDecisionNotifications(now = new Date()): Promise<PendingDecisionNotificationDeliverySummary> {
  configureWebPush();

  const pending = await getPendingNotifications(now);
  if (pending.length === 0) {
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      pending: 0,
      processed: 0,
      failureSamples: [],
    };
  }

  const pendingByUser = new Map<string, PendingDecisionNotificationRow[]>();
  for (const row of pending) {
    const bucket = pendingByUser.get(row.user_id) ?? [];
    bucket.push(row);
    pendingByUser.set(row.user_id, bucket);
  }

  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let processed = 0;
  const failureSamples: PushFailureSample[] = [];

  for (const [userId, rowsForUser] of pendingByUser.entries()) {
    const pushRows = await pushSubscriptionsForUsers([userId]);
    const { enabledRows } = splitPushSubscriptionRows(pushRows, [userId]);

    for (const row of rowsForUser) {
      const notificationUrl = buildNotificationUrl({
        notificationKind: "decision_followup",
        notificationId: row.id,
        focus: "decision",
        decisionId: row.decision_id,
        tab: "decisions",
      });
      const payload = JSON.stringify({
        title: row.title,
        body: row.body,
        url: notificationUrl,
        tag: `aletheia-decision-followup-${notificationTagPart(row.decision_id)}-${row.day}`,
        notificationKind: "decision_followup",
        notificationId: row.id,
        decisionId: row.decision_id,
        day: row.day,
        recipientUserId: row.user_id,
      });
      const nativePayload: NativePushMessagePayload = {
        title: row.title,
        body: row.body,
        url: notificationUrl,
        tag: `aletheia-decision-followup-${notificationTagPart(row.decision_id)}-${row.day}`,
        notificationKind: "decision_followup",
        notificationId: row.id,
        data: {
          decisionId: row.decision_id,
          day: row.day,
          recipientUserId: row.user_id,
        },
      };

      const result = enabledRows.length > 0
        ? await sendPushRows(enabledRows, () => payload, { lastSentColumn: null })
        : { sent: 0, failed: 0, failureSamples: [] as PushFailureSample[] };
      const nativeResult = await sendNativePushFanOut([userId], () => true, () => nativePayload);

      attempted += enabledRows.length + nativeResult.attempted;
      sent += result.sent + nativeResult.sent;
      failed += result.failed + nativeResult.failed;
      failureSamples.push(...result.failureSamples, ...nativeResult.failureSamples);

      if (result.sent > 0 || nativeResult.sent > 0) {
        await markNotificationSent(row.id, row.decision_id, row.user_id, row.day);
        processed += 1;
      }
    }
  }

  return {
    attempted,
    sent,
    failed,
    pending: pending.length,
    processed,
    failureSamples: failureSamples.slice(0, 5),
  };
}

export async function sendChallengeReminders(now = new Date()): Promise<{
  attempted: number;
  sent: number;
  failed: number;
  suggested: number;
}> {
  configureWebPush();

  // challengeDefinitions and getChallengeById are now statically imported at the top

  // ------------------------------------------------------------------
  // 1. Load all enabled push subscriptions with timing and language
  // ------------------------------------------------------------------
  type ChallengeRow = PushRow & { last_challenge_notified_at: string | null };

  const allRows = await many<ChallengeRow>(
    `SELECT push_subscriptions.id, push_subscriptions.user_id, endpoint, p256dh, auth,
            preferred_hour, preferred_local_hour, preferred_timezone, delivery_strategy,
            last_sent_at, last_gratitude_sent_at, last_challenge_notified_at,
            user_preferences.language, user_preferences.region, user_preferences.bible_translation,
            user_preferences.voice_enabled,
            user_preferences.counsel_notifications_enabled, user_preferences.formation_notifications_enabled
     FROM push_subscriptions
     LEFT JOIN user_preferences ON user_preferences.user_id = push_subscriptions.user_id
     WHERE push_subscriptions.enabled = TRUE`
  );

  if (allRows.length === 0) {
    return { attempted: 0, sent: 0, failed: 0, suggested: 0 };
  }

  // ------------------------------------------------------------------
  // 2. Respect the user's preferred notification hour + dedup per day
  // ------------------------------------------------------------------
  const dueRows = allRows.filter((row) => {
    if (!formationNotificationsEnabled(row)) {
      return false;
    }
    const localHour = localHourForTimezone(now, row.preferred_timezone);
    const preferredLocalHour = Number.isInteger(row.preferred_local_hour)
      ? Math.min(23, Math.max(0, Number(row.preferred_local_hour)))
      : Math.min(23, Math.max(0, Number(row.preferred_hour ?? 8)));
    if (localHour < preferredLocalHour) return false;

    // Deduplicate: only one challenge nudge per local calendar day
    if (row.last_challenge_notified_at) {
      const alreadySentToday =
        localDateForTimezone(new Date(row.last_challenge_notified_at), row.preferred_timezone) ===
        localDateForTimezone(now, row.preferred_timezone);
      if (alreadySentToday) return false;
    }
    return true;
  });

  if (dueRows.length === 0) {
    return { attempted: 0, sent: 0, failed: 0, suggested: 0 };
  }

  // ------------------------------------------------------------------
  // 3. Load active challenge progress per user (started, not finished)
  //    including instance-based fasting circles.
  // ------------------------------------------------------------------
  const userIds = [...new Set(dueRows.map((r) => r.user_id))];

  const progressRows = await many<{
    user_id: string;
    challenge_id: string;
    days_completed: string;
    last_completed_at: string;
  }>(
    `SELECT user_id, challenge_id, COUNT(*) as days_completed,
            MAX(completed_at) as last_completed_at
      FROM challenge_progress
     WHERE user_id = ANY(?)
     GROUP BY user_id, challenge_id`,
    userIds
  );

  const fastingProgressRows = progressRows.filter((row): row is FastingProgressRow => row.challenge_id.startsWith("fasting:"));
  const fastingCircleIds = [...new Set(fastingProgressRows.map((row) => row.challenge_id.slice("fasting:".length)).filter(Boolean))];
  const fastingCircleRows = fastingCircleIds.length
    ? await many<FastingCircleRow>(
        `SELECT id, invite_details_json
         FROM challenge_circles
         WHERE challenge_id = ?
           AND id = ANY(?)`,
        "fasting-custom",
        fastingCircleIds
      )
    : [];
  const fastingCircleById = new Map(
    fastingCircleRows.map((row) => [row.id, normalizeFastingInviteDetails(row.invite_details_json as Partial<FastingInviteDetails>)])
  );

  type ProgressMap = Map<string, ActiveChallengeProgressRow[]>;
  const progressByUser: ProgressMap = new Map();
  for (const row of progressRows) {
    const bucket = progressByUser.get(row.user_id) ?? [];
    if (row.challenge_id.startsWith("fasting:")) {
      const circleId = row.challenge_id.slice("fasting:".length);
      const inviteDetails = fastingCircleById.get(circleId);
      if (inviteDetails?.durationValue) {
        bucket.push({
          challengeId: row.challenge_id,
          daysCompleted: Number(row.days_completed),
          totalDays: inviteDetails.durationValue,
          lastCompletedAt: new Date(row.last_completed_at),
          fastingCircleId: circleId,
          fastingInviteDetails: inviteDetails,
        });
      }
    } else {
      const def = getChallengeById(row.challenge_id as ChallengeId);
      if (def) {
        bucket.push({
          challengeId: row.challenge_id,
          daysCompleted: Number(row.days_completed),
          totalDays: def.totalDays,
          lastCompletedAt: new Date(row.last_completed_at),
        });
      }
    }
    progressByUser.set(row.user_id, bucket);
  }

  function isActiveProgress(progress: ActiveChallengeProgressRow) {
    return progress.daysCompleted < progress.totalDays;
  }

  // ------------------------------------------------------------------
  // 4. Smart suggestion: pick the best challenge for users with none
  //    active, based on their recent mode usage and decision activity
  // ------------------------------------------------------------------
  const usersWithNoActive = userIds.filter((uid) => {
    const progress = progressByUser.get(uid) ?? [];
    return !progress.some(isActiveProgress);
  });

  type ManualContextRow = {
    user_id: string;
    health_context: string;
    finance_context: string;
    work_context: string;
    obligations: string;
    goals: string;
    boundaries: string;
    context_json: unknown;
    use_in_answers: boolean;
  };
  type TextRow = { user_id: string; mode: string | null; text: string | null };

  const [manualContextRows, chatRows, journalRows, decisionRows] = usersWithNoActive.length > 0
    ? await Promise.all([
        many<ManualContextRow>(
          `SELECT user_id, health_context, finance_context, work_context, obligations, goals, boundaries, context_json, use_in_answers
           FROM user_manual_context
           WHERE user_id = ANY(?)`,
          usersWithNoActive
        ),
        many<TextRow>(
          `SELECT user_id, mode, content AS text
           FROM chat_messages
           WHERE user_id = ANY(?)
             AND role = 'user'
             AND created_at >= NOW() - INTERVAL '60 days'`,
          usersWithNoActive
        ),
        many<TextRow>(
          `SELECT user_id, mode, (title || ' ' || body) AS text
           FROM journal_entries
           WHERE user_id = ANY(?)
             AND created_at >= NOW() - INTERVAL '120 days'`,
          usersWithNoActive
        ),
        many<TextRow>(
          `SELECT user_id, mode, (
             title || ' ' ||
             pressure || ' ' ||
             COALESCE(summary, '') || ' ' ||
             COALESCE(learning, '') || ' ' ||
             COALESCE(final_decision, '')
           ) AS text
           FROM wisdom_decisions
           WHERE user_id = ANY(?)
             AND created_at >= NOW() - INTERVAL '180 days'`,
          usersWithNoActive
        ),
      ])
    : [[], [], [], []];

  const manualContextByUser = new Map<string, ManualContextProfile>();
  for (const row of manualContextRows) {
    const contextFromJson =
      row.context_json && typeof row.context_json === "object"
        ? (row.context_json as Partial<ManualContextProfile>)
        : {};
    manualContextByUser.set(
      row.user_id,
      normalizeManualContext({
        ...contextFromJson,
        healthContext: contextFromJson.healthContext ?? row.health_context,
        financeContext: contextFromJson.financeContext ?? row.finance_context,
        workContext: contextFromJson.workContext ?? row.work_context,
        obligations: contextFromJson.obligations ?? row.obligations,
        goals: contextFromJson.goals ?? row.goals,
        boundaries: contextFromJson.boundaries ?? row.boundaries,
        useInAnswers: contextFromJson.useInAnswers ?? row.use_in_answers,
      })
    );
  }

  const modeCountsByUser = new Map<string, Record<string, number>>();
  const recentTextsByUser = new Map<string, string[]>();
  const appendText = (userId: string, text: string | null) => {
    const value = text?.trim();
    if (!value) return;
    const bucket = recentTextsByUser.get(userId) ?? [];
    bucket.push(value);
    recentTextsByUser.set(userId, bucket);
  };
  const addMode = (userId: string, mode: string | null) => {
    if (!mode) return;
    const bucket = modeCountsByUser.get(userId) ?? {};
    bucket[mode] = (bucket[mode] ?? 0) + 1;
    modeCountsByUser.set(userId, bucket);
  };
  for (const row of chatRows) {
    addMode(row.user_id, row.mode);
    appendText(row.user_id, row.text);
  }
  for (const row of journalRows) {
    addMode(row.user_id, row.mode);
    appendText(row.user_id, row.text);
  }
  for (const row of decisionRows) {
    addMode(row.user_id, row.mode);
    appendText(row.user_id, row.text);
  }

  function dominantModeFor(userId: string) {
    const modes = modeCountsByUser.get(userId) ?? {};
    return Object.entries(modes).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  }

  function localizedChallengeTitle(challengeId: string, language: LanguageCode) {
    const challenge = getChallengeById(challengeId);
    if (!challenge) {
      return challengeId;
    }
    const translations = loadTranslationsSync(language);
    return String(getTranslation(translations, challenge.titleKey, challenge.title));
  }

  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let suggested = 0;

  // Group due rows by user to avoid N+1 sends
  const dueByUser = new Map<string, ChallengeRow[]>();
  for (const row of dueRows) {
    const bucket = dueByUser.get(row.user_id) ?? [];
    bucket.push(row);
    dueByUser.set(row.user_id, bucket);
  }

  for (const [userId, userRows] of dueByUser.entries()) {
    const userProgress = progressByUser.get(userId) ?? [];
    const language = normalizePreferences({ language: (userRows[0]?.language ?? "en") as LanguageCode }).language;
    const userTimezone = userRows[0]?.preferred_timezone ?? "UTC";
    const localToday = localDateForTimezone(now, userTimezone);

    // Find the in-progress challenge with the most recent activity
    const active = userProgress
      .filter(isActiveProgress)
      .sort((a, b) => b.lastCompletedAt.getTime() - a.lastCompletedAt.getTime())[0];

    const activeLastCompletedLocalDate = active
      ? localDateForTimezone(active.lastCompletedAt, userTimezone)
      : null;
    const daysSinceLastCompletion =
      activeLastCompletedLocalDate ? localCalendarDayGap(localToday, activeLastCompletedLocalDate) : null;

    if (active && daysSinceLastCompletion === 0) {
      continue;
    }

    let challengeId: string;
    let nextDay: number;
    let practiceKey: string;
    let practiceFallback = "";
    let isSuggestion = false;
    let shouldReengage = false;
    let reentryTone: "early" | "longer" = "early";

    if (active) {
      challengeId = active.challengeId;
      nextDay = active.daysCompleted + 1;
      shouldReengage = Boolean(daysSinceLastCompletion !== null && daysSinceLastCompletion > 1);
      reentryTone = daysSinceLastCompletion !== null && daysSinceLastCompletion >= 3 ? "longer" : "early";
      if (active.challengeId.startsWith("fasting:")) {
        const fastingInviteDetails = active.fastingInviteDetails;
        if (!fastingInviteDetails) continue;
        const fastingDays = buildFastingDayPlan(fastingInviteDetails.durationValue, fastingInviteDetails.goal);
        const dayPrompt = fastingDays.find((d) => d.day === nextDay);
        if (!dayPrompt) continue;
        practiceKey = "";
        practiceFallback = dayPrompt.practice;
      } else {
        const def = getChallengeById(active.challengeId as ChallengeId)!;
        const dayPrompt = def.days.find((d) => d.day === nextDay);
        if (!dayPrompt) continue;
        practiceKey = dayPrompt.practiceKey;
        practiceFallback = dayPrompt.practice;
      }
    } else {
      const completedChallengeIds = userProgress
        .filter((progress) => {
          const def = getChallengeById(progress.challengeId);
          return def && progress.daysCompleted >= def.totalDays;
        })
        .map((progress) => progress.challengeId);
      const recommendation = recommendChallenges({
        language,
        manualContext: manualContextByUser.get(userId) ?? null,
        modeCounts: modeCountsByUser.get(userId) ?? {},
        currentMode: dominantModeFor(userId),
        recentTexts: recentTextsByUser.get(userId) ?? [],
        completedChallengeIds,
      });
      const primaryRecommendation = recommendation.primary;
      if (!primaryRecommendation) continue;
      const suggest = primaryRecommendation.challengeId;
      if (!suggest) continue;
      const def = getChallengeById(suggest);
      if (!def) continue;
      challengeId = suggest;
      nextDay = 1;
      practiceKey = def.days[0]?.practiceKey ?? "";
      practiceFallback = def.days[0]?.practice ?? "";
      isSuggestion = true;
      suggested++;
    }

    const translations = loadTranslationsSync(language);
    const baseTitle = localizedChallengeTitle(challengeId, language);
    
    // Translate the practice key if we have one
    let body: string;
    let title = baseTitle;
    if (active?.challengeId.startsWith("fasting:")) {
      const fastingInviteDetails = active.fastingInviteDetails;
      if (!fastingInviteDetails) continue;
      const fastingDays = buildFastingDayPlan(fastingInviteDetails.durationValue, fastingInviteDetails.goal);
      const dayPrompt = fastingDays.find((d) => d.day === nextDay);
      if (!dayPrompt) continue;
      const dayLabel = String(getTranslation(translations, "challenges.dayLabel")).replace("{day}", String(nextDay));
      const totalLabel = formatFastingDurationLabel(fastingInviteDetails.durationValue);
      body = fastingReminderBody({
        language,
        tone: reentryTone,
        reentry: shouldReengage,
        dayLabel,
        scripture: dayPrompt.scripture,
        practice: dayPrompt.practice,
        totalLabel,
        goal: fastingInviteDetails.goal,
        translations,
      });
      title = String(getTranslation(translations, "challenges.fastingCustom.title", "Fasting Practice"));
    } else if (isSuggestion) {
      const challenge = getChallengeById(challengeId);
      body = compactNotificationCopy(
        challenge ? String(getTranslation(translations, challenge.descriptionKey, challenge.description)) : "",
        136
      );
    } else {
      const practiceText = getTranslation(translations, practiceKey, practiceFallback);
      const dayLabel = String(getTranslation(translations, "challenges.dayLabel")).replace("{day}", String(nextDay));
      body = challengeReminderBody({
        language,
        challengeId: challengeId as ChallengeId,
        tone: reentryTone,
        dayLabel,
        practiceText: typeof practiceText === "string" ? practiceText : practiceText[0] ?? "",
        reentry: shouldReengage,
      });
      title = challengeReminderTitle({
        language,
        baseTitle,
        challengeId: challengeId as ChallengeId,
        tone: reentryTone,
        reentry: shouldReengage,
      });
    }

    const payload = {
      title,
      body,
      url: `/?source=notification&focus=challenge&challenge=${encodeURIComponent(challengeId)}&tab=reflect&section=nudges`,
    };
    const nativePayload: NativePushMessagePayload = {
      title,
      body,
      url: `/?source=notification&focus=challenge&challenge=${encodeURIComponent(challengeId)}&tab=reflect&section=nudges`,
      tag: `aletheia-challenge-reminder-${notificationTagPart(challengeId)}-${userId}`,
      notificationKind: "challenge_reminder",
      notificationId: `${userId}:${challengeId}`,
      data: {
        challengeId,
        userId,
        suggestion: isSuggestion,
        reengage: shouldReengage,
      },
    };

    const nativeResult = await sendNativePushFanOut([userId], () => true, () => nativePayload);
    for (const pushRow of userRows) {
      attempted++;
      try {
        await sendNotificationWithRetry(
          { endpoint: pushRow.endpoint, keys: { p256dh: pushRow.p256dh, auth: pushRow.auth } },
          JSON.stringify(payload)
        );
        const deliveredAt = now.toISOString();
        await markPushSubscriptionFreshness(pushRow.id, deliveredAt, null);
        await run(`UPDATE push_subscriptions SET last_challenge_notified_at = ? WHERE id = ?`, deliveredAt, pushRow.id);
        sent++;
      } catch (err) {
        if (shouldDeleteBrokenSubscription(err)) {
          await run(`DELETE FROM push_subscriptions WHERE id = ?`, pushRow.id).catch(() => undefined);
        }
        failed++;
      }
    }
    attempted += nativeResult.attempted;
    sent += nativeResult.sent;
    failed += nativeResult.failed;

    if (nativeResult.sent > 0) {
      const deliveredAt = now.toISOString();
      await Promise.all(
        userRows.map((pushRow) =>
          run(`UPDATE push_subscriptions SET last_challenge_notified_at = ? WHERE id = ?`, deliveredAt, pushRow.id)
        )
      );
    }
  }

  return { attempted, sent, failed, suggested };
}

export async function sendTestWisdomNotification(userId: string) {
  configureWebPush();

  const rows = await many<PushRow>(
    `SELECT push_subscriptions.id, push_subscriptions.user_id, endpoint, p256dh, auth, preferred_hour, last_sent_at,
            preferred_local_hour, preferred_timezone, delivery_strategy, last_gratitude_sent_at,
            user_preferences.language, user_preferences.region, user_preferences.bible_translation, user_preferences.voice_enabled
     FROM push_subscriptions
     LEFT JOIN user_preferences ON user_preferences.user_id = push_subscriptions.user_id
     WHERE enabled = TRUE AND push_subscriptions.user_id = ?`,
    userId
  );

  const { sent, failed, failureSamples } = await sendPushRows(
    rows,
    (row) => JSON.stringify(testNotificationPayload(row)),
    { lastSentColumn: null }
  );
  const nativeResult = await sendNativePushFanOut(
    [userId],
    () => true,
    (row) => testNotificationPayload(asPushRow(row))
  );

  return {
    attempted: rows.length + nativeResult.attempted,
    sent: sent + nativeResult.sent,
    failed: failed + nativeResult.failed,
    scanned: rows.length,
    skipped: 0,
    failureSamples: [...failureSamples, ...nativeResult.failureSamples].slice(0, 5),
  };
}

async function incrementNotificationMetric(metricKey: string, delta = 1) {
  await run(
    `CREATE TABLE IF NOT EXISTS notification_metrics (
       metric_key TEXT PRIMARY KEY,
       metric_value BIGINT NOT NULL DEFAULT 0,
       updated_at TIMESTAMPTZ NOT NULL
     )`
  );
  const now = new Date().toISOString();
  await run(
    `INSERT INTO notification_metrics (metric_key, metric_value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT (metric_key)
     DO UPDATE SET
       metric_value = notification_metrics.metric_value + EXCLUDED.metric_value,
       updated_at = EXCLUDED.updated_at`,
    metricKey,
    delta,
    now
  );
}

async function notificationMetricValue(metricKey: string) {
  await run(
    `CREATE TABLE IF NOT EXISTS notification_metrics (
       metric_key TEXT PRIMARY KEY,
       metric_value BIGINT NOT NULL DEFAULT 0,
       updated_at TIMESTAMPTZ NOT NULL
     )`
  );
  const row = await one<MetricRow>(
    `SELECT metric_value
     FROM notification_metrics
     WHERE metric_key = ?`,
    metricKey
  );
  return Number(row?.metric_value ?? 0);
}

export async function recordDailyNotificationUnauthorizedHit() {
  await incrementNotificationMetric(DAILY_UNAUTHORIZED_METRIC_KEY, 1);
}

export async function getNotificationHealthSnapshot(): Promise<NotificationHealthSnapshot> {
  const now = new Date();
  const rows = await many<PushRow>(
    `SELECT push_subscriptions.id, push_subscriptions.user_id, endpoint, p256dh, auth, preferred_hour, last_sent_at,
            preferred_local_hour, preferred_timezone, delivery_strategy, last_gratitude_sent_at,
            user_preferences.language, user_preferences.region, user_preferences.bible_translation, user_preferences.voice_enabled
     FROM push_subscriptions
     LEFT JOIN user_preferences ON user_preferences.user_id = push_subscriptions.user_id
     WHERE enabled = TRUE`,
  );

  const dueNow = rows.filter((row) => shouldSendAtLocalHour(row, now) || shouldSendGratitudeAtLocalHour(row, now)).length;
  const unauthorizedHits = await notificationMetricValue(DAILY_UNAUTHORIZED_METRIC_KEY);

  return {
    enabledSubscriptions: rows.length,
    dueNow,
    scanned: rows.length,
    unauthorizedHits,
    hourUtc: now.getUTCHours(),
    generatedAt: now.toISOString(),
  };
}
