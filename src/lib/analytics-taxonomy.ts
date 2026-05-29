import type { Mode } from "@/lib/wisdom-data";

export type AnalyticsTopic = "money" | "work" | "purpose" | "generosity" | "general";
export type AnalyticsEmotion = "anxious" | "pressured" | "uncertain" | "ashamed" | "hopeful" | "calm" | "unknown";

export function classifyAnalyticsTopic(text: string, mode?: Mode | string | null): AnalyticsTopic {
  const normalized = `${mode ?? ""} ${text}`.toLowerCase();

  if (/\b(money|debt|budget|saving|savings|invest|investment|salary|income|wealth|house|mortgage|rent|finance|financial|spending|generous without losing)\b/.test(normalized)) {
    return "money";
  }
  if (/\b(work|job|career|business|startup|company|boss|leader|leadership|calling|vocation|quit|resign|promotion|burnout)\b/.test(normalized)) {
    return "work";
  }
  if (/\b(purpose|identity|direction|meaning|future|values|discern|discernment|calling|mission)\b/.test(normalized)) {
    return "purpose";
  }
  if (/\b(give|giving|generosity|charity|donate|help family|support family|boundaries|overgiving|gift)\b/.test(normalized)) {
    return "generosity";
  }

  return "general";
}

export function classifyAnalyticsEmotion(text: string): AnalyticsEmotion {
  const normalized = text.toLowerCase();

  if (/\b(anxious|anxiety|afraid|fear|worried|worry|panic|stressed|stress)\b/.test(normalized)) {
    return "anxious";
  }
  if (/\b(pressure|pressured|urgent|urgency|rush|quickly|now|must|have to|forced)\b/.test(normalized)) {
    return "pressured";
  }
  if (/\b(uncertain|confused|unsure|doubt|doubting|not sure|should i|should we|wondering)\b/.test(normalized)) {
    return "uncertain";
  }
  if (/\b(shame|ashamed|guilt|guilty|failed|failure|embarrassed)\b/.test(normalized)) {
    return "ashamed";
  }
  if (/\b(hope|hopeful|grateful|excited|peace|peaceful|ready)\b/.test(normalized)) {
    return "hopeful";
  }
  if (/\b(calm|steady|clear|clarity|settled)\b/.test(normalized)) {
    return "calm";
  }

  return "unknown";
}

export function isDecisionLikeText(text: string) {
  const normalized = text.toLowerCase();
  return /\b(should i|should we|decide|decision|choose|buy|sell|leave|quit|resign|move|invest|start|stop|hire|fire|marry|help|loan|borrow)\b/.test(normalized);
}

export function analyticsQuestionMetadata(text: string, mode?: Mode | string | null) {
  return {
    topic: classifyAnalyticsTopic(text, mode),
    emotional_tone: classifyAnalyticsEmotion(text),
    decision_like: isDecisionLikeText(text),
  };
}
