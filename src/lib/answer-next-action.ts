export type AnswerNextAction = "wait" | "counsel" | "decision" | "reflection";

const HIGH_PRESSURE = /\b(urgent|urgently|immediately|right now|today|panic|panicking|afraid|fear|anxious|overwhelmed|pressure|rushed|desperate)\b/i;
const RELATIONAL = /\b(spouse|husband|wife|partner|parent|mother|father|family|friend|mentor|pastor|counsel|relationship|marriage|team|boss|coworker|conflict)\b/i;
const FORMATION = /\b(habit|healing|forgive|forgiveness|temptation|addiction|recovery|rest|burnout|pray|prayer|faith|character|discipline|lonely|loneliness|grief|shame)\b/i;
const COMPLEX_DECISION = /\b(decide|decision|choose|choice|whether|option|offer|move|buy|sell|invest|job|career|business|debt|give|giving|commit|quit|leave|start)\b/i;

export function recommendAnswerNextAction(question: string, answer = ""): AnswerNextAction {
  const context = `${question} ${answer}`;
  if (HIGH_PRESSURE.test(context)) return "wait";
  if (RELATIONAL.test(context)) return "counsel";
  if (FORMATION.test(context)) return "reflection";
  if (COMPLEX_DECISION.test(context)) return "decision";
  return "reflection";
}
