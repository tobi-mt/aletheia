import webpush, { PushSubscription } from "web-push";
import { createECDH, timingSafeEqual } from "node:crypto";
import { many, one, run } from "@/lib/db";
import { localizedDailyWisdom, normalizePreferences, type BibleTranslation, type LanguageCode, type RegionCode } from "@/lib/localization";
import { getWisdomEntries } from "@/lib/wisdom";
import { selectDailyWisdomIndex } from "@/lib/wisdom-data";
import { getChallengeById } from "@/lib/challenge-data";
import { recommendChallenges } from "@/lib/challenge-recommendations";
import { normalizeManualContext, type ManualContextProfile } from "@/lib/manual-context";
import { loadTranslationsSync, getTranslation } from "@/lib/translations";
import { MODE_KEYS, type Mode } from "@/lib/mode-keys";

type PushRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
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

const DAILY_UNAUTHORIZED_METRIC_KEY = "daily_unauthorized_hits";
const GRATITUDE_REFLECTION_LOCAL_HOUR = 19;
const PUSH_DELIVERY_TIMEOUT_MS = Number(process.env.PUSH_DELIVERY_TIMEOUT_MS ?? 10000);
const PUSH_DELIVERY_MAX_ATTEMPTS = Math.max(1, Number(process.env.PUSH_DELIVERY_MAX_ATTEMPTS ?? 3));
const PUSH_DELIVERY_RETRY_BASE_DELAY_MS = Number(process.env.PUSH_DELIVERY_RETRY_BASE_DELAY_MS ?? 800);

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
    url: "/?source=notification&focus=today",
    scripture: daily.scripture,
    tag: `aletheia-daily-${notificationTagPart(localDate)}-${index}`,
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
    url: "/?source=notification&focus=gratitude",
    tag: `aletheia-gratitude-${notificationTagPart(localDate)}`,
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

async function sendNotificationWithRetry(subscription: PushSubscription, payload: string) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= PUSH_DELIVERY_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await sendNotificationWithTimeout(subscription, payload);
    } catch (error) {
      lastError = error;
      if (!isRetryablePushError(error) || attempt === PUSH_DELIVERY_MAX_ATTEMPTS) {
        throw error;
      }
      await sleep(PUSH_DELIVERY_RETRY_BASE_DELAY_MS * attempt);
    }
  }

  throw lastError ?? new Error("Unknown push delivery error");
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
  const scriptureReference = compactNotificationCopy(input.scripture, 44);
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
  const scriptureReference = compactNotificationCopy(input.scripture, 48);
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
    decisionId: reminder.decisionId,
    reminderKind: reminder.kind,
    notificationKind: "decision_followup",
  };
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

          if (lastSentColumn) {
            const deliveredAt = new Date().toISOString();
            await run(
              `UPDATE push_subscriptions SET ${lastSentColumn} = ?, updated_at = ? WHERE id = ?`,
              deliveredAt,
              deliveredAt,
              row.id
            );
          }
          sent += 1;
        } catch (error) {
          failed += 1;
          const deleted = shouldDeleteBrokenSubscription(error);
          const failure = summarizePushFailure(error, row, deleted);
          failureSamples.push(failure);
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

export async function sendDailyWisdomNotifications() {
  configureWebPush();

  const now = new Date();
  const currentHour = now.getUTCHours();

  // Fetch wisdom entries once for all notifications
  const wisdomEntries = await getWisdomEntries();

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
    if (!userRows.length) {
      continue;
    }

    followupAttempted += userRows.length;
    const result = await sendPushRows(
      userRows,
      () => JSON.stringify(followupNotificationPayload(reminder)),
      { lastSentColumn: null }
    );
    followupSent += result.sent;
    followupFailed += result.failed;
    followupFailureSamples.push(...result.failureSamples);

    if (result.sent > 0) {
      await markDecisionReminderNotified(reminder, now.toISOString());
      followupDecisionsNotified += 1;
    }
  }

  const dueRows = rows.filter((row) => !followupUsers.has(row.user_id) && shouldSendAtLocalHour(row, now));
  const { sent, failed, failureSamples } = await sendPushRows(dueRows, (row) =>
    JSON.stringify(dailyNotificationPayload(row, wisdomEntries))
  );
  const dailyUsers = new Set(dueRows.map((row) => row.user_id));
  const gratitudeRows = rows.filter(
    (row) => !followupUsers.has(row.user_id) && !dailyUsers.has(row.user_id) && shouldSendGratitudeAtLocalHour(row, now)
  );
  const gratitudeResult = await sendPushRows(
    gratitudeRows,
    (row) => JSON.stringify(gratitudeNotificationPayload(row)),
    { lastSentColumn: "last_gratitude_sent_at" }
  );

  return {
    attempted: dueRows.length + followupAttempted + gratitudeRows.length,
    sent: sent + followupSent + gratitudeResult.sent,
    failed: failed + followupFailed + gratitudeResult.failed,
    scanned: rows.length,
    skipped: Math.max(0, rows.length - dueRows.length - followupAttempted - gratitudeRows.length),
    catchupAttempted: 0,
    hour: currentHour,
    followupAttempted,
    followupSent,
    followupFailed,
    followupDecisionsNotified,
    gratitudeAttempted: gratitudeRows.length,
    gratitudeSent: gratitudeResult.sent,
    gratitudeFailed: gratitudeResult.failed,
    failureSamples: [...followupFailureSamples, ...failureSamples, ...gratitudeResult.failureSamples].slice(0, 5),
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
            user_preferences.voice_enabled
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

  type ProgressMap = Map<string, { challengeId: string; daysCompleted: number; lastCompletedAt: Date }[]>;
  const progressByUser: ProgressMap = new Map();
  for (const row of progressRows) {
    const bucket = progressByUser.get(row.user_id) ?? [];
    bucket.push({
      challengeId: row.challenge_id,
      daysCompleted: Number(row.days_completed),
      lastCompletedAt: new Date(row.last_completed_at),
    });
    progressByUser.set(row.user_id, bucket);
  }

  // ------------------------------------------------------------------
  // 4. Smart suggestion: pick the best challenge for users with none
  //    active, based on their recent mode usage and decision activity
  // ------------------------------------------------------------------
  const usersWithNoActive = userIds.filter((uid) => {
    const progress = progressByUser.get(uid) ?? [];
    return !progress.some((p) => {
      const def = getChallengeById(p.challengeId);
      return def && p.daysCompleted < def.totalDays;
    });
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
    return getTranslation(translations, challenge.titleKey, challenge.title);
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

    // Find the in-progress challenge with the most recent activity
    const active = userProgress
      .filter((p) => {
        const def = getChallengeById(p.challengeId);
        return def && p.daysCompleted < def.totalDays;
      })
      .sort((a, b) => b.lastCompletedAt.getTime() - a.lastCompletedAt.getTime())[0];

    let challengeId: string;
    let nextDay: number;
    let practiceKey: string;
    let practiceFallback: string;
    let isSuggestion = false;

    if (active) {
      const def = getChallengeById(active.challengeId)!;
      challengeId = active.challengeId;
      nextDay = active.daysCompleted + 1;
      const dayPrompt = def.days.find((d) => d.day === nextDay);
      if (!dayPrompt) continue;
      practiceKey = dayPrompt.practiceKey;
      practiceFallback = dayPrompt.practice;
    } else {
      const completedChallengeIds = userProgress
        .filter((progress) => {
          const def = getChallengeById(progress.challengeId);
          return def && progress.daysCompleted >= def.totalDays;
        })
        .map((progress) => progress.challengeId);
      const recommendation = recommendChallenges({
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

    const language = normalizePreferences({ language: (userRows[0]?.language ?? "en") as LanguageCode }).language;
    const translations = loadTranslationsSync(language);
    const title = localizedChallengeTitle(challengeId, language);
    
    // Translate the practice key if we have one
    let body: string;
    if (isSuggestion) {
      const challenge = getChallengeById(challengeId);
      body = compactNotificationCopy(
        challenge ? String(getTranslation(translations, challenge.descriptionKey, challenge.description)) : "",
        136
      );
    } else {
      const practiceText = getTranslation(translations, practiceKey, practiceFallback);
      const dayLabel = String(getTranslation(translations, "challenges.dayLabel", "challenges.dayLabel")).replace("{day}", String(nextDay));
      const continueLabel = String(getTranslation(translations, "challenges.continueChallenge", "challenges.continueChallenge"));
      body = `${continueLabel} · ${dayLabel}: ${typeof practiceText === "string" ? practiceText : practiceText[0] ?? practiceFallback}`;
    }

    const payload = JSON.stringify({
      title,
      body,
      url: `/?source=notification&focus=challenge&challenge=${encodeURIComponent(challengeId)}&tab=reflect`,
    });

    for (const pushRow of userRows) {
      attempted++;
      try {
        await webpush.sendNotification(
          { endpoint: pushRow.endpoint, keys: { p256dh: pushRow.p256dh, auth: pushRow.auth } },
          payload
        );
        await run(
          `UPDATE push_subscriptions SET last_challenge_notified_at = ? WHERE id = ?`,
          now.toISOString(),
          pushRow.id
        );
        sent++;
      } catch (err) {
        if (shouldDeleteBrokenSubscription(err)) {
          await run(`DELETE FROM push_subscriptions WHERE id = ?`, pushRow.id).catch(() => undefined);
        }
        failed++;
      }
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

  return {
    attempted: rows.length,
    sent,
    failed,
    scanned: rows.length,
    skipped: 0,
    failureSamples: failureSamples.slice(0, 5),
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
