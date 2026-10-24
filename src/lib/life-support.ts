export type LifeSupportConcern = "self_harm" | "addiction" | "depression" | "loneliness" | "holiness";

const multilingualSelfHarmPhrases = [
  // Spanish
  "hacerme daño", "hacerme dano", "matarme", "acabar con mi vida", "quiero morir", "no puedo seguir",
  // French
  "me faire du mal", "me tuer", "mettre fin à mes jours", "mettre fin a mes jours", "mettre fin à ma vie", "je veux mourir", "je ne peux plus continuer",
  // Portuguese
  "me machucar", "me ferir", "me matar", "acabar com minha vida", "quero morrer", "não aguento mais", "nao aguento mais", "não posso continuar", "nao posso continuar",
  // German
  "selbstverletz", "mir etwas antun", "mich umbringen", "mich töten", "mich toten", "mein leben beenden", "sterben will", "kann nicht mehr",
  // Yoruba
  "ìgbẹ̀mí ara ẹni", "igbemi ara eni", "ṣe ara mi nípalára", "se ara mi nipalara", "pa ara mi",
  // Igbo
  "igbu onwe", "merụọ onwe m ahụ", "meruo onwe m ahu", "achọrọ m ịnwụ", "achoro m inwu", "achọghị m ịdị ndụ", "achoghi m idi ndu",
  // Hausa
  "kashe kaina", "cutar da kaina", "ina son mutuwa", "ba zan iya ci gaba ba",
  // Filipino
  "magpakamatay", "saktan ang sarili", "saktan ang sarili ko", "patayin ang sarili", "gusto kong mamatay", "wakasan ang buhay ko",
  // Arabic
  "انتحار", "انتحاري", "أؤذي نفسي", "اؤذي نفسي", "أقتل نفسي", "اقتل نفسي", "أنهي حياتي", "انهي حياتي", "أريد أن أموت", "اريد ان اموت", "جرعة زائدة", "لا أستطيع الاستمرار", "لا استطيع الاستمرار",
  // Hindi
  "आत्महत्या", "खुद को नुकसान", "अपने आप को नुकसान", "खुद को मार", "अपने आप को मार", "जान दे", "मरना चाहता", "मरना चाहती", "जीवन समाप्त", "ओवरडोज",
] as const;

function includesAny(value: string, phrases: readonly string[]) {
  return phrases.some((phrase) => value.includes(phrase));
}

export function detectLifeSupportConcern(question: string): LifeSupportConcern | null {
  const normalized = question.toLowerCase();
  if (
    /\b(suicid(?:al|e)?|self[- ]?harm|hurt myself|kill myself|end my life|want to die|overdose|can't go on|cannot go on|take my life)\b/.test(
      normalized
    ) || includesAny(normalized, multilingualSelfHarmPhrases)
  ) {
    return "self_harm";
  }
  if (/\b(addict(?:ion)?|relapse|porn|alcohol|drug|drugs|substance|gambl(?:ing)?|sober|sobriety|withdrawal|craving|compulsion)\b/.test(normalized)) {
    return "addiction";
  }
  if (/\b(depress(?:ed|ion)?|hopeless|numb|worthless|empty|no point|can't get out of bed|cannot get out of bed|crying all the time)\b/.test(normalized)) {
    return "depression";
  }
  if (/\b(lonely|loneliness|alone|isolated|no one|nobody|abandoned|disconnected)\b/.test(normalized)) {
    return "loneliness";
  }
  if (/\b(holy|holiness|purity|temptation|lust|porn|repent|repentance|confess|confession)\b/.test(normalized)) {
    return "holiness";
  }
  return null;
}
