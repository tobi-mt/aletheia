import {
  canonicalScriptureReference,
  defaultPreferences,
  hasCompleteLocalizedWisdomEntry,
  localizedCrisisSupportCopy,
  localizedScriptureReference,
  localizedWisdomEntry,
  localizedWisdomResponseCopy,
  type UserPreferences,
} from "@/lib/localization";
import { detectLifeSupportConcern } from "@/lib/life-support";
import { wisdomEntries, type WisdomEntryData } from "@/lib/wisdom-data";
import { scriptureTextMatches } from "@/lib/scripture-text-matches";
import { counselSafetyBoundary, counselSafetyTopic, crisisScriptureConnection, type SafeTopic } from "@/lib/counsel-safety";
import { isLifeMeaningQuestion, modeFitExplicitGoal } from "@/lib/mode-suggestion";
import { getTranslation, loadTranslationsSync } from "@/lib/translations";

const promotion = /\b(?:promotion|new role|more (?:work|hours|responsibility))\b/i;
const fixedWorkload = /\b(?:no (?:duties|responsibilities) (?:can|will) be (?:removed|reduced)|(?:will not|won['’]t|can['’]t|cannot) (?:remove|reduce|drop|offload) (?:any |my |the )?(?:duties|responsibilities|workload)|workload (?:cannot|can['’]t|won['’]t) change)\b/i;
const familyRest = /(?:\b(?:mother|father|parent|mom|dad)\b.*\b(?:visit|weekend)|\b(?:madre|padre|mamá|papá)\b.*\b(?:visit|semana))/iu;
const rest = /\b(?:rest|exhausted|tired|descans\w*|agotad\w*|cansad\w*)\b/i;
const debt = /\b(?:debts?|dettes?|deudas?)\b/i;
const investment = /\b(?:invest\w*|invert\w*|inversi[oó]n)\b/i;
const rentPressure = /\b(?:rent|housing payment)\b/i;
const family = /\b(?:brother|sister|family|parent)\b/i;
const fixedWorkloadNextStep = "If the workload makes the role unsustainable, you can say: “Thank you for trusting me with this opportunity. With my current responsibilities staying in place, I can’t commit to the role as offered.”";
const fixedWorkloadContinuation = "If you decline this offer, what would you want to keep open for your future at work?";
export const answerContinuationPromptPrefix = "Help me explore this one continuation question: ";

const fatigue = /(?:\b(?:exhausted|burned out|worn out|erschöpft|ausgebrannt|agotad\p{L}*|cansad\p{L}*|exaust\p{L}*|napapagod|pagod|gaji)\b|épuis\p{L}*|mú kí n rẹ̀|ike gwụrụ|الإرهاق|مرهق|थक)/iu;
const restPassage = "Matthew 11:28-30";
const restConnection: Record<UserPreferences["language"], string> = {
  en: "Jesus invites those carrying heavy burdens to come to him for rest. Take your exhaustion seriously: name one responsibility someone could share this week.",
  es: "Jesús invita a quienes llevan cargas pesadas a descansar en él. Toma en serio tu cansancio: piensa en una responsabilidad que alguien pueda compartir esta semana.",
  fr: "Jésus invite ceux qui portent de lourds fardeaux à trouver du repos auprès de lui. Prends ta fatigue au sérieux : nomme une responsabilité que quelqu’un pourrait partager cette semaine.",
  de: "Jesus lädt Menschen mit schweren Lasten ein, bei ihm Ruhe zu finden. Nimm deine Erschöpfung ernst: Welche Aufgabe könnte diese Woche jemand mit dir teilen?",
  pt: "Jesus convida quem carrega fardos pesados a descansar nele. Leve seu cansaço a sério: pense em uma responsabilidade que alguém possa dividir com você nesta semana.",
  yo: "Jésù pe àwọn tó ru ẹrù wúwo láti wá ìsinmi lọ́dọ̀ rẹ̀. Má ṣe fojú kéré àárẹ̀ rẹ; ronú nípa ojúṣe kan tí ẹlòmíràn lè bá ọ ṣe lọ́sẹ̀ yìí.",
  ig: "Jizọs na-akpọ ndị bu ibu dị arọ ka ha bịakwute ya nweta izu ike. Elegharala ike ọgwụgwụ gị anya: chee otu ọrụ mmadụ nwere ike inyere gị aka ime n’izu a.",
  ha: "Yesu ya kira masu ɗauke da kaya masu nauyi su zo wurinsa don su sami hutu. Kada ka yi watsi da gajiyarka: ka zaɓi wani aiki da wani zai iya taimaka maka a wannan makon.",
  tl: "Inaanyayahan ni Jesus ang mga may mabigat na pasanin na lumapit sa kanya at magpahinga. Huwag balewalain ang pagod: mag-isip ng isang tungkuling puwedeng ipabahagi sa iba ngayong linggo.",
  ar: "يدعو يسوع من يحملون أعباء ثقيلة إلى أن يجدوا الراحة عنده. لا تتجاهل إرهاقك: حدّد مسؤولية واحدة يمكن لشخص آخر أن يشاركك فيها هذا الأسبوع.",
  hi: "यीशु भारी बोझ उठाने वालों को अपने पास विश्राम पाने के लिए बुलाते हैं। अपनी थकान को हल्के में न लें: एक ज़िम्मेदारी चुनें जिसे इस सप्ताह कोई आपके साथ बाँट सके।",
};

type CounselFocus = "workCapacity" | "workPriorities" | "familyRest" | "debtInvestment" | "givingCapacity" | "careerComparison" | "fatigue" | "lifeMeaning";

function counselFocus(question: string): CounselFocus | undefined {
  if (isLifeMeaningQuestion(question)) return "lifeMeaning";
  if (promotion.test(question) && hasCapacityPressure(question)) return "workCapacity";
  if (modeFitExplicitGoal(question) === "Work") return "workPriorities";
  if (familyRest.test(question) && rest.test(question)) return "familyRest";
  if (debt.test(question) && investment.test(question)) return "debtInvestment";
  if (rentPressure.test(question) && family.test(question) && /\b(?:give|help|ask\w*|lend|money)\b/i.test(question)) return "givingCapacity";
  if (/\b(?:career|job|work)\b/i.test(question) && /\bcompar\w*\b/i.test(question)) return "careerComparison";
  if (fatigue.test(question)) return "fatigue";
}

const focusReferences: Record<CounselFocus, readonly string[]> = {
  workCapacity: ["Matthew 11:28-30", "Luke 14:28-30"],
  familyRest: ["Mark 6:31", "Galatians 6:2-5"],
  debtInvestment: ["Proverbs 22:7", "Luke 14:28-30"],
  givingCapacity: ["2 Corinthians 8:12-14", "Galatians 6:2-5"],
  careerComparison: ["Colossians 3:23-24", "Proverbs 15:22"],
  fatigue: [restPassage],
  lifeMeaning: ["Ephesians 2:10", "Micah 6:8"],
  workPriorities: ["Proverbs 15:22", "Galatians 6:2-5"],
};

export function preferredCounselReferences(question: string): readonly string[] {
  if (detectLifeSupportConcern(question) === "self_harm") return [];
  if (isFixedWorkloadContinuation(question)) {
    return focusReferences.careerComparison;
  }
  const focus = counselFocus(question);
  return focus ? focusReferences[focus] : [];
}

export function isFixedWorkloadContinuation(question: string) {
  return question.startsWith(`${answerContinuationPromptPrefix}${JSON.stringify(fixedWorkloadContinuation)}`)
    && counselFocus(question) === "workCapacity" && fixedWorkload.test(question);
}

type FocusCopy = { opening: string; nextStep: string; connections?: Record<string, string> };

export function requiredBiblicalEvidenceCount(question: string, sourceCount: number, safeTopic: SafeTopic) {
  if (sourceCount <= 0) return 0;
  if (safeTopic === "crisis") return 1;
  const substantive = isLifeMeaningQuestion(question)
    || question.trim().split(/\s+/u).filter(Boolean).length > 8 || question.trim().length > 80;
  return Math.min(substantive ? 2 : 1, sourceCount);
}

export function closedWorkloadNextStep(question: string, language: UserPreferences["language"]) {
  if (language === "en" && !question.startsWith(answerContinuationPromptPrefix)
    && counselFocus(question) === "workCapacity" && fixedWorkload.test(question)) {
    return fixedWorkloadNextStep;
  }
}

export function focusedContinuation(question: string, language: UserPreferences["language"]): { direction: string; priority?: boolean; reply: FocusCopy } | undefined {
  switch (counselFocus(question)) {
    case "workCapacity":
      if (language === "en" && fixedWorkload.test(question)) return {
        direction: fixedWorkloadContinuation,
        priority: true,
        reply: {
          opening: "This offer is one way to grow at work, not the only one. You can consider what appealed to you about it without having to accept the workload that came with it.",
          nextStep: "Name one part of the role you would still like to grow into, such as mentoring or leading a project. Keep that as a topic for a future career conversation, separate from your decision about this offer.",
          connections: {
            "Colossians 3:23-24": "Paul speaks of working wholeheartedly for the Lord. The value of the work you want to do is not limited to this title or offer.",
            "Proverbs 15:22": "The proverb values counsel as a way to make plans sturdier. A trusted colleague may know where you can grow in the part of the role that mattered to you without taking on the entire job.",
          },
        },
      };
      if (language === "en") return {
        direction: "What would a week in the new role need to look like for you to have time to recover?",
        reply: {
          opening: "A sustainable week is easier to picture than an abstract limit. Start with the parts of your current week that let you recover, rather than fitting rest around whatever work remains.",
          nextStep: "Mark one recovery block on a sample workweek, then check whether the role as described would leave that block intact.",
        },
      };
      break;
    case "familyRest":
      if (language === "es") return {
        direction: "¿Qué forma de estar presente con tu familia te dejaría también tiempo para descansar?",
        reply: {
          opening: "Estar presente no tiene por qué significar pasar todo el fin de semana de visita. Puedes elegir una forma de contacto que sea sincera y que también te deje descansar.",
          nextStep: "Piensa en un gesto pequeño que realmente te apetezca mantener, como una llamada breve, y elige cuándo hacerlo sin ocupar tu tiempo de descanso.",
        },
      };
      break;
    case "debtInvestment":
      if (language === "fr") return {
        direction: "Que diriez-vous à votre ami si vous n’aviez pas à lui donner une réponse tout de suite ?",
        reply: {
          opening: "Vous pouvez reconnaître ce que cette proposition représente pour votre ami sans adopter son échéance. Demander du temps ne vous engage pas à investir plus tard.",
          nextStep: "Préparez une réponse courte : « Merci d’avoir pensé à moi. Je ne prends pas de décision aujourd’hui. Si je souhaite en reparler, je reviendrai vers toi. »",
        },
      };
      break;
    case "givingCapacity":
      if (language === "en") return {
        direction: "What kind of help could you offer your family without using the money set aside for rent?",
        reply: {
          opening: "You do not have to solve the whole problem to show that you care. Support can mean making a hard task less lonely, without taking responsibility for its outcome.",
          nextStep: "If you have the time, offer one bounded task, such as sitting together for twenty minutes to find a local assistance resource.",
        },
      };
      break;
    case "careerComparison":
      if (language === "en") return {
        direction: "What is one low-risk way to try a part of the work you are drawn to?",
        reply: {
          opening: "Trying one ordinary task can tell you more than picturing someone else's success. Notice whether the work itself holds your interest when nobody is watching.",
          nextStep: "Set aside thirty minutes to try one routine task from that role, then write down what energized you and what did not.",
        },
      };
      break;
  }
}

function focusedCopy(question: string, language: UserPreferences["language"]): FocusCopy | undefined {
  if (question.startsWith(answerContinuationPromptPrefix)) {
    const continuation = focusedContinuation(question, language);
    return continuation && question.startsWith(`${answerContinuationPromptPrefix}${JSON.stringify(continuation.direction)}`)
      ? continuation.reply : undefined;
  }
  const focus = counselFocus(question);
  if (focus === "lifeMeaning") {
    const translations = loadTranslationsSync(language);
    const text = (key: string) => {
      const value = getTranslation(translations, `counselLifeMeaning.${key}`);
      if (typeof value !== "string" || !value.trim()) throw new Error(`Missing life-meaning counsel translation for ${language}: ${key}`);
      return value;
    };
    return {
      opening: text("opening"), nextStep: text("nextStep"),
      connections: { "Ephesians 2:10": text("graceConnection"), "Micah 6:8": text("faithfulnessConnection") },
    };
  }
  if (language === "en" && focus === "workPriorities") {
    return {
      opening: "Approach the conversation as a choice about priorities. Be clear about what you can finish well and what would have to wait.",
      nextStep: "Bring two competing tasks to the person who sets priorities and ask, “Which should I finish first, and what can we move or share?”",
      connections: {
        "Proverbs 15:22": "This proverb commends testing plans through counsel. Rather than guessing which deadline matters most, invite the person relying on your work to help you decide.",
        "Galatians 6:2-5": "Paul calls people both to carry one another’s burdens and to take responsibility for their own load. Name what you can own and where sharing a task would help.",
      },
    };
  }
  if (language === "en" && focus === "workCapacity") {
    const closedNextStep = closedWorkloadNextStep(question, language);
    return {
      opening: closedNextStep
        ? "You can appreciate being offered the role without agreeing to terms you already know would stretch you. If the current work stays on your plate, decide based on the role as offered, not on changes you hope might come later."
        : "This may be a good opportunity, and it can still be too much as offered. The exhaustion you named is worth taking seriously; it does not settle the decision, but it changes what you need to know before you say yes.",
      nextStep: closedNextStep ?? "Before committing, ask what would come off your plate if you took on the new responsibilities. Their answer can help you tell whether the role is sustainable as offered or needs different terms.",
      connections: {
        "Matthew 11:28-30": "Jesus offers rest to people carrying heavy burdens. That is not a verdict on the promotion; it lets you take the burden you already carry seriously rather than treating exhaustion as something you must push past.",
        "Luke 14:28-30": "Jesus uses the image of counting the cost before building to teach about discipleship. Applied here, it helps you look honestly at the time and energy the new role would require before making a commitment.",
      },
    };
  }
  if (language === "es" && focus === "familyRest") {
    return {
      opening: "Puedes querer a tu familia y necesitar tiempo para descansar. Sentir culpa al cambiar la frecuencia de las visitas no significa que estés dejando de cuidar esa relación.",
      nextStep: "Propón una fecha de visita que puedas sostener: «Quiero verte. Este fin de semana necesito descansar. ¿Te parece si nos vemos el próximo?»",
      connections: {
        "Mark 6:31": "Jesús invita a sus discípulos a descansar en medio de muchas demandas. El descanso no niega tu cariño; puede ayudarte a estar presente cuando sí puedas visitar.",
        "Galatians 6:2-5": "Pablo habla tanto de ayudarnos como de asumir nuestras propias responsabilidades. Puedes cuidar la relación sin comprometerte a decir que sí todos los fines de semana.",
      },
    };
  }
  if (language === "fr" && focus === "debtInvestment") {
    return {
      opening: "Vous pouvez tenir à votre amitié sans prendre une décision financière au rythme de votre ami. La peur de rater une occasion ne change pas les dettes que vous avez déjà à rembourser.",
      nextStep: "Avant de répondre, notez vos remboursements obligatoires et le montant que vous pourriez perdre sans les compromettre. Si ce montant est nul, dites à votre ami que vous ne pouvez pas vous engager pour le moment.",
      connections: {
        "Proverbs 22:7": "Ce proverbe décrit le poids que la dette peut faire peser sur la liberté de décision. Vos remboursements sont une contrainte réelle, pas un manque de confiance envers votre ami.",
        "Luke 14:28-30": "Jésus prend l’exemple d’un bâtisseur qui évalue le coût avant de commencer pour parler de l’engagement du disciple. Ici, cette image invite à mesurer ce que vous pourriez perdre avant de répondre à la pression d’investir.",
      },
    };
  }
  if (language === "en" && focus === "givingCapacity") {
    return {
      opening: "You want to help someone you love, and you also have a real obligation to keep your own housing stable. Those needs don't have to cancel each other out.",
      nextStep: "Before answering, set your rent money aside. If there is nothing left to give, say what you can honestly offer without promising cash you need for housing.",
      connections: {
        "2 Corinthians 8:12-14": "Paul encourages willing giving from what people have, not from what they do not have. Keeping an essential bill covered does not make your concern for your family less sincere.",
        "Galatians 6:2-5": "Paul holds mutual care and personal responsibility together. You can offer help without taking responsibility for the entire financial problem.",
      },
    };
  }
  if (language === "en" && focus === "careerComparison") {
    return {
      opening: "Seeing someone else's career move can bring your own dissatisfaction into focus, but it doesn't tell you whether you want their path. Give yourself room to distinguish curiosity from pressure to catch up.",
      nextStep: "Write down one change you would still want if none of your peers could see it. Use that as the first question to explore before deciding whether to move.",
    };
  }
}

export function composeCompanionCounsel(
  question: string,
  sources: WisdomEntryData[],
  preferences: UserPreferences = defaultPreferences,
  topic: SafeTopic = counselSafetyTopic(question),
) {
  const concern = detectLifeSupportConcern(question);
  const crisis = localizedCrisisSupportCopy(preferences.language);
  const copy = localizedWisdomResponseCopy(preferences.language);
  const focused = focusedCopy(question, preferences.language);
  const curatedConnections = focused?.connections ?? (counselFocus(question) === "fatigue"
    ? { [restPassage]: restConnection[preferences.language] } : undefined);
  const candidates = [...new Map((sources.length ? sources : wisdomEntries)
    .map((source) => [source.scripture, source])).values()];
  const preferred = preferredCounselReferences(question);
  const ranked = [
    ...preferred.flatMap((reference) => candidates.filter(({ scripture }) => scripture === reference)),
    ...candidates.filter(({ scripture }) => !preferred.includes(scripture)),
  ];
  const requested = new Set(scriptureTextMatches(question, ranked.map(({ scripture }) => scripture), preferences.language).map(({ scripture }) => scripture));
  const normalize = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
  const words = normalize(question).match(/[\p{L}\p{N}]+/gu) ?? [];
  const questionWords = ` ${words.join(" ")} `;
  const genericKeywords = new Set(["ask", "decision", "help", "life", "next", "plan", "plans", "what", "wisdom", "work"]);
  const relevant = ranked.filter((source) => {
    if (curatedConnections?.[source.scripture]) return true;
    if (!hasCompleteLocalizedWisdomEntry(source, preferences.language)) return false;
    if (requested.has(canonicalScriptureReference(source.scripture))) return true;
    if (preferred.length) return preferred.includes(source.scripture);
    const keywords = preferences.language === "en" ? source.keywords : localizedWisdomEntry(source, preferences).keywords;
    return keywords.some((keyword) => {
      const phrase = (normalize(keyword).match(/[\p{L}\p{N}]+/gu) ?? []).join(" ");
      return phrase.length >= 3 && !genericKeywords.has(phrase) && questionWords.includes(` ${phrase} `);
    });
  });
  const crisisAnchor = topic === "crisis"
    ? candidates.find(({ scripture }) => crisisScriptureConnection(scripture, preferences.language)) ?? candidates[0]
    : undefined;
  const selected = topic === "crisis" ? (crisisAnchor ? [crisisAnchor] : []) : relevant;
  const evidence = selected.map((source, index) => {
    const entry = localizedWisdomEntry(source, preferences);
    const localized = hasCompleteLocalizedWisdomEntry(source, preferences.language);
    const reference = localizedScriptureReference(source.scripture, preferences.language);
    const anchor = index === 0 ? copy.primaryAnchor : copy.secondAnchor;
    const crisisConnection = topic === "crisis" ? crisisScriptureConnection(source.scripture, preferences.language) : undefined;
    return {
      reference: source.scripture,
      connection: crisisConnection
        ? `${reference} — ${crisisConnection}`
        : anchor(reference, curatedConnections?.[source.scripture] ?? (localized ? `${entry.context} ${entry.principle} ${entry.application}` : "")),
      application: localized ? entry.application : "",
    };
  });

  const support = concern === "addiction" ? [crisis.addictionOpening, crisis.addictionNext]
    : concern === "depression" ? [crisis.depressionOpening, crisis.depressionNext]
    : concern === "loneliness" ? [crisis.lonelinessOpening, crisis.lonelinessNext]
    : concern === "holiness" ? [crisis.holinessOpening, crisis.holinessNext]
    : null;
  const opening = focused?.opening ?? copy.opening;
  const nextStep = focused?.nextStep ?? (evidence[0]?.application ? copy.ordinaryLife(evidence[0].application) : copy.nextStepQuestion);
  const qualifiedCounsel = counselSafetyBoundary(topic, preferences.language);
  const paragraphs = concern === "self_harm"
    ? [crisis.selfHarmOpening, crisis.selfHarmImmediate, crisis.selfHarmFollowUp, evidence[0]?.connection]
    : topic === "crisis" ? [qualifiedCounsel, evidence[0]?.connection]
    : [support?.[0] ?? opening, ...evidence.map((item) => item.connection), qualifiedCounsel, support?.[1] ?? nextStep];
  return {
    text: paragraphs.filter(Boolean).join("\n\n"),
    nextStep: concern === "self_harm" ? crisis.selfHarmImmediate : topic === "crisis" ? qualifiedCounsel : support?.[1] ?? nextStep,
    sources: selected,
    biblicalEvidence: evidence.map(({ reference, connection }) => ({ reference, connection })),
  };
}

export function hasCapacityPressure(question: string) {
  return /\b(?:exhaust(?:ed|ion)|burn(?:ed|t)[ -]out|burnout|weary|weariness|overwork(?:ed)?|no capacity)\b/i.test(question);
}

export function isCapacityEvidence(source: WisdomEntryData) {
  return source.emotions.some((emotion) => /^(?:weariness|exhaustion|burnout)$/i.test(emotion));
}
