export type LifeSupportConcern = "self_harm" | "addiction" | "depression" | "loneliness" | "holiness";

export function detectLifeSupportConcern(question: string): LifeSupportConcern | null {
  const normalized = question.toLowerCase();
  if (
    /\b(suicid(?:al|e)?|self[- ]?harm|hurt myself|kill myself|end my life|want to die|overdose|can't go on|cannot go on|take my life)\b/.test(
      normalized
    )
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
