import { run, one, many } from "@/lib/db";
import type { LanguageCode } from "@/lib/localization";

export interface NotificationSchedule {
  id: string;
  decisionId: string;
  userId: string;
  day: 1 | 3 | 7 | 30;
  scheduledFor: string;
  status: "pending" | "sent" | "failed";
  sentAt?: string;
  title: string;
  body: string;
}

type NotificationCopySet = Record<1 | 3 | 7 | 30, (decisionTitle: string) => { title: string; body: string }>;
type DecisionNotificationRow = {
  notification_sequence_sent: Record<string, string> | null;
};

const NOTIFICATION_COPY: Partial<Record<LanguageCode, NotificationCopySet>> = {
  en: {
    1:  (t) => ({ title: "First Reflection",   body: `How are you feeling about "${t}" today? Take a moment to journal your thoughts.` }),
    3:  (t) => ({ title: "Day 3 Perspective",  body: `You've been seeking wisdom about "${t}" for 3 days. What new perspective have you gained?` }),
    7:  (t) => ({ title: "Weekly Reflection",  body: `One week into discerning "${t}". What have you learned? How has your readiness changed?` }),
    30: (t) => ({ title: "Monthly Outcome",    body: `30 days of seeking wisdom about "${t}". How did this decision turn out? Share your learning.` }),
  },
  es: {
    1:  (t) => ({ title: "Primera Reflexión",     body: `¿Cómo te sientes hoy respecto a "${t}"? Tómate un momento para anotar tus pensamientos.` }),
    3:  (t) => ({ title: "Perspectiva del Día 3", body: `Llevas 3 días buscando sabiduría sobre "${t}". ¿Qué nueva perspectiva has ganado?` }),
    7:  (t) => ({ title: "Reflexión Semanal",     body: `Una semana discerniendo "${t}". ¿Qué aprendiste? ¿Cómo ha cambiado tu disposición?` }),
    30: (t) => ({ title: "Resultado Mensual",     body: `30 días buscando sabiduría sobre "${t}". ¿Cómo resultó esta decisión?` }),
  },
  fr: {
    1:  (t) => ({ title: "Première Réflexion",    body: `Comment vous sentez-vous aujourd'hui par rapport à "${t}" ? Prenez un moment pour noter vos pensées.` }),
    3:  (t) => ({ title: "Perspective Jour 3",    body: `Cela fait 3 jours que vous cherchez la sagesse pour "${t}". Quelle nouvelle perspective avez-vous acquise ?` }),
    7:  (t) => ({ title: "Réflexion Hebdo",       body: `Une semaine de discernement pour "${t}". Qu'avez-vous appris ? Comment votre disposition a-t-elle changé ?` }),
    30: (t) => ({ title: "Résultat Mensuel",      body: `30 jours de sagesse pour "${t}". Comment cette décision s'est-elle avérée ?` }),
  },
  de: {
    1:  (t) => ({ title: "Erste Reflexion",        body: `Wie fühlst du dich heute bei "${t}"? Nimm dir einen Moment und schreibe deine Gedanken auf.` }),
    3:  (t) => ({ title: "Perspektive Tag 3",      body: `Du suchst seit 3 Tagen Weisheit für "${t}". Welche neue Perspektive hast du gewonnen?` }),
    7:  (t) => ({ title: "Wöchentliche Reflexion", body: `Eine Woche Unterscheidung für "${t}". Was hast du gelernt? Wie hat sich deine Bereitschaft verändert?` }),
    30: (t) => ({ title: "Monatliches Ergebnis",   body: `30 Tage Weisheit für "${t}". Wie hat sich diese Entscheidung entwickelt?` }),
  },
  pt: {
    1:  (t) => ({ title: "Primeira Reflexão", body: `Como você se sente hoje em relação a "${t}"? Tome um momento para anotar seus pensamentos.` }),
    3:  (t) => ({ title: "Perspectiva Dia 3", body: `Você está buscando sabedoria sobre "${t}" há 3 dias. Que nova perspectiva você ganhou?` }),
    7:  (t) => ({ title: "Reflexão Semanal",  body: `Uma semana discernindo "${t}". O que você aprendeu? Como sua prontidão mudou?` }),
    30: (t) => ({ title: "Resultado Mensal",  body: `30 dias buscando sabedoria sobre "${t}". Como essa decisão se saiu?` }),
  },
  ar: {
    1:  (t) => ({ title: "التأمل الأول",        body: `كيف تشعر اليوم تجاه "${t}"؟ خذ لحظة لتدوين أفكارك.` }),
    3:  (t) => ({ title: "منظور اليوم الثالث",  body: `مضت 3 أيام وأنت تبحث عن الحكمة في "${t}". ما المنظور الجديد الذي اكتسبته؟` }),
    7:  (t) => ({ title: "التأمل الأسبوعي",    body: `أسبوع من التمييز حول "${t}". ماذا تعلمت؟ كيف تغيرت جاهزيتك؟` }),
    30: (t) => ({ title: "النتيجة الشهرية",     body: `30 يومًا من الحكمة حول "${t}". كيف سارت هذه القرار؟` }),
  },
  ha: {
    1:  (t) => ({ title: "Tunani na Farko",     body: `Yaya kake ji a yau game da "${t}"? Ɗauki lokaci don rubuta tunaninka.` }),
    3:  (t) => ({ title: "Ra'ayi na Rana ta 3", body: `Kwanaki 3 kana neman hikima a kan "${t}". Wane sabon ra'ayi ka samu?` }),
    7:  (t) => ({ title: "Tunani na Mako-mako", body: `Mako ɗaya na yanke shawara a kan "${t}". Me ka ka ka a koya? Yaya shirinka ya canza?` }),
    30: (t) => ({ title: "Sakamakon Wata",      body: `Kwanaki 30 na hikima a kan "${t}". Ta yaya wannan shawarar ta kasance?` }),
  },
  ig: {
    1:  (t) => ({ title: "Ntụgharị uche mbụ",    body: `Ọ dị gị otú o dị taa banyere "${t}"? Were oge dee echiche gị.` }),
    3:  (t) => ({ title: "Echiche nke ụbọchị 3", body: `Ọ bụ ụbọchị 3 ka ị na-achọ ọghụgha maka "${t}". Gị nwetara echiche ọhụrụ ole?` }),
    7:  (t) => ({ title: "Ntụgharị uche ọ Izu",  body: `Izu otu n'ịtụle "${t}". Gị mụtara ihe ole? Ikike gị agbanwere?` }),
    30: (t) => ({ title: "Nsonaazụ Ọnwa",        body: `Ụbọchị 30 n'achọ ọghụgha maka "${t}". Mkpebi a gasịrị otú o dị?` }),
  },
  yo: {
    1:  (t) => ({ title: "Ìrọ̀lẹ́ Àkọ́kọ́",  body: `Báwo ni o ṣe ń fẹ̀ lónìí nípa "${t}"? Gba àkókò láti kọ àwọn ìrònú rẹ sílẹ̀.` }),
    3:  (t) => ({ title: "Ìwòye Ọjọ́ Kẹta",   body: `Ọjọ́ 3 ni o ti ń wá ọgbọ́n fún "${t}". Kí ni ìwòye tuntun tí o ti gba?` }),
    7:  (t) => ({ title: "Ìrọ̀lẹ́ Ọ̀sẹ̀",     body: `Ọ̀sẹ̀ kan ronú nípa "${t}". Kí ni o ti kọ? Báwo ni ìmúrasílẹ̀ rẹ ṣe yí padà?` }),
    30: (t) => ({ title: "Àbájáde Oṣù",        body: `Ọjọ́ 30 ti ọgbọ́n nípa "${t}". Báwo ni ìpinnu yìí ṣe jáde?` }),
  },
  hi: {
    1:  (t) => ({ title: "पहला विचार",              body: `आज आप "${t}" के बारे में कैसा महसूस कर रहे हैं? अपने विचार लिखने के लिए एक पल लें।` }),
    3:  (t) => ({ title: "तीसरे दिन का दृष्टिकोण", body: `आप 3 दिनों से "${t}" पर ज्ञान खोज रहे हैं। आपने क्या नया दृष्टिकोण प्राप्त किया?` }),
    7:  (t) => ({ title: "साप्ताहिक चिंतन",         body: `"${t}" पर विचार करते हुए एक सप्ताह हो गया। आपने क्या सीखा?` }),
    30: (t) => ({ title: "मासिक परिणाम",             body: `"${t}" पर ज्ञान के 30 दिन। यह निर्णय कैसा रहा?` }),
  },
  tl: {
    1:  (t) => ({ title: "Unang Pagninilay",      body: `Paano mo nararamdaman ngayon ang "${t}"? Maglaan ng sandali para isulat ang iyong mga saloobin.` }),
    3:  (t) => ({ title: "Pananaw sa Araw 3",     body: `3 araw ka nang naghahanap ng karunungan para sa "${t}". Anong bagong pananaw ang iyong natamo?` }),
    7:  (t) => ({ title: "Lingguhang Pagninilay", body: `Isang linggo ng pagdidisyerno para sa "${t}". Ano ang natutunan mo?` }),
    30: (t) => ({ title: "Buwanang Kinalabasan",  body: `30 araw ng karunungan para sa "${t}". Paano naging ang desisyong ito?` }),
  },
};

function getCopyForLanguage(language: LanguageCode): NotificationCopySet {
  return NOTIFICATION_COPY[language] ?? NOTIFICATION_COPY.en!;
}

/**
 * Schedule notifications for a decision at days 1, 3, 7, and 30
 */
export async function scheduleDecisionNotifications(
  decisionId: string,
  userId: string,
  decisionTitle: string,
  createdAt: string,
  language: LanguageCode = "en"
) {
  const created = new Date(createdAt);
  const days = [1, 3, 7, 30] as const;
  const copy = getCopyForLanguage(language);

  for (const day of days) {
    const scheduledFor = new Date(created.getTime() + day * 24 * 60 * 60 * 1000).toISOString();
    const { title, body } = copy[day](decisionTitle);

    await run(
      `INSERT INTO notification_schedules (decision_id, user_id, day, scheduled_for, status, title, body)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      decisionId,
      userId,
      day,
      scheduledFor,
      "pending",
      title,
      body
    );
  }
}

/**
 * Get pending notifications due for sending
 */
export async function getPendingNotifications(now = new Date()) {
  const currentTime = now.toISOString();
  const notifications = await many<{
    id: string;
    decision_id: string;
    user_id: string;
    day: number;
    title: string;
    body: string;
  }>(
    `SELECT id, decision_id, user_id, day, title, body
     FROM notification_schedules
     WHERE status = 'pending' AND scheduled_for <= ?
     ORDER BY scheduled_for ASC
     LIMIT 100`,
    currentTime
  );
  return notifications || [];
}

/**
 * Mark a notification as sent
 */
export async function markNotificationSent(
  notificationId: string,
  decisionId: string,
  userId: string,
  day: number
) {
  const now = new Date().toISOString();

  // Update notification status
  await run(
    `UPDATE notification_schedules SET status = ?, sent_at = ? WHERE id = ?`,
    "sent",
    now,
    notificationId
  );

  // Update decision's notification_sequence_sent tracking
  const decision = await one<DecisionNotificationRow>(
    `SELECT notification_sequence_sent FROM wisdom_decisions WHERE id = ? AND user_id = ?`,
    decisionId,
    userId
  );

  if (decision) {
    const sequence = { ...(decision.notification_sequence_sent ?? {}) };
    sequence[day] = now;

    await run(
      `UPDATE wisdom_decisions SET notification_sequence_sent = ? WHERE id = ? AND user_id = ?`,
      JSON.stringify(sequence),
      decisionId,
      userId
    );
  }
}

/**
 * Get notification copy for a specific day
 */
export function getNotificationCopy(day: 1 | 3 | 7 | 30, decisionTitle: string, language: LanguageCode = "en") {
  return getCopyForLanguage(language)[day](decisionTitle);
}

/**
 * Get all sent notifications for a decision
 */
export async function getDecisionNotificationHistory(decisionId: string, userId: string) {
  const history = await one<DecisionNotificationRow>(
    `SELECT notification_sequence_sent FROM wisdom_decisions WHERE id = ? AND user_id = ?`,
    decisionId,
    userId
  );

  return history?.notification_sequence_sent ?? {};
}
