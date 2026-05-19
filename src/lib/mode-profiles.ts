import type { Mode } from "@/lib/wisdom-data";

export type ModeProfile = {
  label: Mode;
  intent: string;
  focus: string;
  useWhen: string;
  lens: string;
  diagnosticTracks: string[];
  blindSpots: string[];
  maturitySignals: string[];
  practices: string[];
  responseMoves: string[];
  promptCue: string;
  prompts: string[];
};

export const modeProfiles: Record<Mode, ModeProfile> = {
  Money: {
    label: "Money",
    intent: "Steward resources with peace and clarity.",
    focus: "Budgeting, debt, saving, investing, contentment",
    useWhen: "Use for spending, debt, saving, investing, financial anxiety, or comparison.",
    lens: "A stewardship lens: freedom, enough, patience, risk, and faithful responsibility.",
    diagnosticTracks: [
      "Freedom: will this choice increase or reduce wise options later?",
      "Enough: is the desire clear, or is comparison setting the target?",
      "Risk: what can go wrong, and have I counted the cost soberly?",
      "Peace: is my nervous system driving the decision faster than wisdom would?",
    ],
    blindSpots: [
      "Confusing faith with financial certainty",
      "Calling lifestyle pressure a need",
      "Treating debt capacity as permission",
      "Using generosity to avoid honest budgeting",
    ],
    maturitySignals: [
      "The plan still makes sense after waiting",
      "Numbers are visible, not vague",
      "Counsel has challenged the assumptions",
      "The decision protects both responsibility and generosity",
    ],
    practices: [
      "Name what is enough for this season",
      "Write the repayment, saving, or giving plan plainly",
      "Wait overnight before irreversible spending",
      "Invite one financially sober person to review the plan",
    ],
    responseMoves: [
      "Separate desire, fear, and responsibility",
      "Clarify tradeoffs without shaming the user",
      "Translate scripture into concrete stewardship habits",
      "Encourage counsel for high-stakes financial moves",
    ],
    promptCue:
      "In Money mode, emphasize stewardship, contentment, debt caution, wise risk, long-term responsibility, generosity, and emotional regulation around money. Avoid investment advice or outcome promises.",
    prompts: [
      "How do I build wealth without greed?",
      "What does wisdom say about debt?",
      "How do I stop comparing myself financially?",
    ],
  },
  Work: {
    label: "Work",
    intent: "Discern work, calling, leadership, and sustainable ambition.",
    focus: "Career moves, leadership, business, burnout, vocation",
    useWhen: "Use for job decisions, business ideas, leadership pressure, burnout, or ambition.",
    lens: "A vocation lens: diligence, counsel, cost counting, service, and sustainable pace.",
    diagnosticTracks: [
      "Calling: what kind of service or responsibility is being clarified?",
      "Capacity: does the user's life have room for this commitment?",
      "Counsel: who can test the plan without controlling it?",
      "Cost: what happens if the move takes twice as long or pays half as fast?",
    ],
    blindSpots: [
      "Mistaking restlessness for calling",
      "Using spiritual language to avoid planning",
      "Confusing applause with fruitfulness",
      "Ignoring family, health, or team costs",
    ],
    maturitySignals: [
      "The user can name the tradeoffs honestly",
      "There is a reversible next experiment",
      "Wise counsel has seen the numbers and motives",
      "Ambition is serving people, not only identity",
    ],
    practices: [
      "Define the smallest reversible step",
      "Write the real cost in time, money, and attention",
      "Ask a critic what part of the plan is fragile",
      "Protect one rhythm of rest before increasing responsibility",
    ],
    responseMoves: [
      "Distinguish calling, ambition, escape, and fatigue",
      "Bring the decision down to the next faithful experiment",
      "Use counsel and cost-counting as stabilizers",
      "Keep ambition honorable but accountable",
    ],
    promptCue:
      "In Work mode, emphasize vocation, diligence, wise counsel, leadership character, cost counting, sustainable ambition, and service. Help the user examine motives and tradeoffs before major work decisions.",
    prompts: [
      "Should I leave my stable job?",
      "How do I know if ambition is healthy?",
      "Should I start this business now?",
    ],
  },
  Purpose: {
    label: "Purpose",
    intent: "Slow down and discern the person this decision forms.",
    focus: "Identity, direction, anxiety, values, long-term clarity",
    useWhen: "Use when the real question is identity, direction, peace, timing, or values.",
    lens: "A discernment lens: identity, peace, motives, patience, and the next faithful step.",
    diagnosticTracks: [
      "Identity: what is the user trying to prove, protect, or become?",
      "Peace: what changes when urgency quiets down?",
      "Motives: which desire is good, and which one is distorted?",
      "Next step: what can be obeyed without needing the whole future revealed?",
    ],
    blindSpots: [
      "Waiting for perfect certainty before faithful action",
      "Treating anxiety as discernment",
      "Letting success define identity",
      "Over-spiritualizing what needs ordinary wisdom",
    ],
    maturitySignals: [
      "The next step is clear even if the whole path is not",
      "The user can name motives without self-condemnation",
      "The decision can be held with patience",
      "Peace is joined to responsibility, not passivity",
    ],
    practices: [
      "Name the fear underneath the decision",
      "Write one sentence about the person this choice forms",
      "Choose the next faithful step for the next 24 hours",
      "Share the question with someone grounded and unhurried",
    ],
    responseMoves: [
      "Lower urgency and restore agency",
      "Separate identity from outcome",
      "Invite honest motive examination without shame",
      "Offer a small faithful next step",
    ],
    promptCue:
      "In Purpose mode, emphasize discernment, identity, motives, peace, patience, values, prayerful reflection, and the next faithful step. Keep the guidance grounded and non-mystical; do not claim divine certainty.",
    prompts: [
      "How do I make a decision when I feel unclear?",
      "What if I am chasing success for the wrong reasons?",
      "How do I find peace about my next step?",
    ],
  },
  Generosity: {
    label: "Generosity",
    intent: "Give freely without guilt, pressure, or performance.",
    focus: "Giving, family support, charity, boundaries, sustainability",
    useWhen: "Use for giving, tithing, helping family, boundaries, or sustainable generosity.",
    lens: "A generosity lens: willingness, sustainability, joy, wisdom, and love without coercion.",
    diagnosticTracks: [
      "Freedom: is the gift willing, or driven by guilt and fear?",
      "Sustainability: can this generosity continue without hidden resentment?",
      "Wisdom: does helping here strengthen responsibility or enable harm?",
      "Love: what would serve the person, not just relieve my discomfort?",
    ],
    blindSpots: [
      "Calling guilt generosity",
      "Giving publicly to feel spiritually impressive",
      "Rescuing others from consequences they need to face",
      "Ignoring household obligations in the name of sacrifice",
    ],
    maturitySignals: [
      "The gift is free, not coerced",
      "Boundaries are clear and kind",
      "The giving plan is sustainable",
      "Compassion and responsibility are both present",
    ],
    practices: [
      "Decide the gift before the pressure moment",
      "Set a giving boundary in plain language",
      "Ask whether money is the best form of help",
      "Keep generosity quiet when possible",
    ],
    responseMoves: [
      "Remove guilt and pressure from the center",
      "Protect cheerful generosity and wise boundaries",
      "Ask whether the gift helps or enables",
      "Affirm compassion without romanticizing sacrifice",
    ],
    promptCue:
      "In Generosity mode, emphasize cheerful willingness, sustainability, boundaries, non-coercion, compassion, and responsible giving. Reject guilt-driven or performative giving.",
    prompts: [
      "How do I give without guilt or pressure?",
      "Should I help family financially again?",
      "How much generosity is sustainable for me?",
    ],
  },
};
