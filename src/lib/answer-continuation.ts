import type { Mode } from "@/lib/wisdom-data";

export type AnswerContinuation = {
  kind: "boundary" | "counsel" | "next_step" | "clarify";
  direction: string;
  prompt: string;
};

const SIGNALS: Array<{ kind: AnswerContinuation["kind"]; pattern: RegExp }> = [
  { kind: "boundary", pattern: /\b(boundar(?:y|ies)|limit|say no|overcommit)/i },
  { kind: "counsel", pattern: /\b(counsel|trusted (?:voice|person)|mentor|advisor|ask someone)/i },
  { kind: "next_step", pattern: /\b(next (?:faithful )?step|start with|begin by|practice|try|pause|wait)/i },
  { kind: "clarify", pattern: /\b(tension|question beneath|notice|discern|clarify|explore|deeper)/i },
];

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sentences(answer: string) {
  return clean(answer).split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length >= 24 && sentence.length <= 220);
}

export function buildAnswerContinuation(question: string, answer: string, mode: Mode): AnswerContinuation | null {
  const normalizedQuestion = clean(question);
  const candidates = sentences(answer);
  if (!normalizedQuestion || candidates.length === 0) return null;

  for (const signal of SIGNALS) {
    const direction = candidates.find((sentence) => signal.pattern.test(sentence));
    if (direction) {
      return {
        kind: signal.kind,
        direction,
        prompt: `Continue our ${mode} counsel from this specific direction: "${direction}" Relate it to my original question: "${normalizedQuestion.slice(0, 500)}" Give me practical context, one blind spot, and one proportionate next step without claiming certainty.`,
      };
    }
  }

  const direction = candidates.at(-1);
  return direction
    ? {
        kind: "clarify",
        direction,
        prompt: `Help me continue from this part of your answer: "${direction}" Keep the context of my original question: "${normalizedQuestion.slice(0, 500)}" Clarify what this means in practice and offer one proportionate next step without claiming certainty.`,
      }
    : null;
}

export function continuationLabel(direction: string, continueLabel: string, maxLength?: number) {
  const cleanDirection = clean(direction).replace(/[.!?]+$/, "");
  const clipped = maxLength && cleanDirection.length > maxLength
    ? `${cleanDirection.slice(0, maxLength - 1).trimEnd()}…`
    : cleanDirection;
  return `${continueLabel}: ${clipped}`;
}
