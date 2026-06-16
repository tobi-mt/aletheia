export type ChallengeId =
  | "gratitude-3day"
  | "waiting-5day"
  | "stewardship-7day";

export type ChallengeDayPrompt = {
  day: number;
  scripture: string;
  principle: string;
  prompt: string;
  practice: string;
};

export type ChallengeDefinition = {
  id: ChallengeId;
  titleKey: string;
  descriptionKey: string;
  totalDays: number;
  mode: string;
  days: ChallengeDayPrompt[];
};

export const challengeDefinitions: ChallengeDefinition[] = [
  {
    id: "gratitude-3day",
    titleKey: "challenges.gratitude3day.title",
    descriptionKey: "challenges.gratitude3day.description",
    totalDays: 3,
    mode: "Life",
    days: [
      {
        day: 1,
        scripture: "1 Thessalonians 5:18",
        principle:
          "Give thanks in all circumstances; for this is the will of God in Christ Jesus for you.",
        prompt:
          "Notice one ordinary gift today that you might normally overlook. Write a brief note about it.",
        practice: "Name one ordinary mercy you almost missed.",
      },
      {
        day: 2,
        scripture: "Psalm 107:1",
        principle:
          "Give thanks to the Lord, for he is good; his steadfast love endures forever.",
        prompt:
          "Think about someone whose steadfast presence has shaped your discernment. Write what you are grateful for about them.",
        practice: "Name a person whose steady presence you are grateful for.",
      },
      {
        day: 3,
        scripture: "Philippians 4:11",
        principle:
          "I have learned, in whatever state I am, to be content.",
        prompt:
          "Where has contentment felt difficult this week? What would it look like to choose gratitude over scarcity in that place?",
        practice: "Name one area where gratitude is replacing scarcity today.",
      },
    ],
  },
  {
    id: "waiting-5day",
    titleKey: "challenges.waiting5day.title",
    descriptionKey: "challenges.waiting5day.description",
    totalDays: 5,
    mode: "Purpose",
    days: [
      {
        day: 1,
        scripture: "Psalm 27:14",
        principle:
          "Wait for the Lord; be strong, and let your heart take courage; wait for the Lord.",
        prompt:
          "Name the decision or pressure you are carrying. Write one line describing what urgency is asking you to do.",
        practice: "Name the decision and what urgency is whispering.",
      },
      {
        day: 2,
        scripture: "Proverbs 4:25-26",
        principle:
          "Let your eyes look directly forward, and your gaze be straight before you. Ponder the path of your feet; then all your ways will be sure.",
        prompt:
          "What would it cost to wait three more days before deciding? Write the real fear beneath the urgency.",
        practice: "Name the fear beneath the urgency.",
      },
      {
        day: 3,
        scripture: "Isaiah 40:31",
        principle:
          "They who wait for the Lord shall renew their strength; they shall mount up with wings like eagles.",
        prompt:
          "What is one sign that waiting has been good so far — even something small?",
        practice: "Write one sign that waiting is protecting something good.",
      },
      {
        day: 4,
        scripture: "James 1:5",
        principle:
          "If any of you lacks wisdom, let him ask God, who gives generously to all without reproach, and it will be given him.",
        prompt:
          "Have you asked a trusted voice about this decision? Write what you have heard or what you would ask them.",
        practice: "Write what counsel has said — or what you would ask.",
      },
      {
        day: 5,
        scripture: "Proverbs 3:5-6",
        principle:
          "Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths.",
        prompt:
          "After five days, what has changed in how you see this decision? What is the next faithful step — even if it is another week of waiting?",
        practice: "Name the next faithful step with an open hand.",
      },
    ],
  },
  {
    id: "stewardship-7day",
    titleKey: "challenges.stewardship7day.title",
    descriptionKey: "challenges.stewardship7day.description",
    totalDays: 7,
    mode: "Money",
    days: [
      {
        day: 1,
        scripture: "Deuteronomy 8:18",
        principle:
          "Remember the Lord your God, for it is he who gives you power to get wealth.",
        prompt:
          "Write one way your income or resources have come to you — something you did not fully earn on your own.",
        practice: "Acknowledge one resource that was given, not only earned.",
      },
      {
        day: 2,
        scripture: "Proverbs 21:5",
        principle:
          "The plans of the diligent lead surely to abundance, but everyone who is hasty comes only to poverty.",
        prompt:
          "Where are you making a financial decision in haste? Name it and write what slow discernment would ask.",
        practice: "Name one area where haste is shaping spending.",
      },
      {
        day: 3,
        scripture: "Luke 16:10",
        principle:
          "One who is faithful in a very little is also faithful in much, and one who is dishonest in a very little is also dishonest in much.",
        prompt:
          "What is one small area of financial faithfulness you have practised recently? Write it down as an act of gratitude, not pride.",
        practice: "Name one small area where faithfulness has shown up.",
      },
      {
        day: 4,
        scripture: "Romans 13:8",
        principle: "Owe no one anything, except to love each other.",
        prompt:
          "Look at your debts — student, personal, consumer, or relational. Write one honest sentence about what you owe and what faithful next step looks like.",
        practice: "Write one honest sentence about what you owe.",
      },
      {
        day: 5,
        scripture: "2 Corinthians 9:7",
        principle:
          "Each one must give as he has decided in his heart, not reluctantly or under compulsion, for God loves a cheerful giver.",
        prompt:
          "Write about the last time you gave freely — without guilt or pressure. What made it joyful?",
        practice: "Name one act of giving that came from freedom, not compulsion.",
      },
      {
        day: 6,
        scripture: "Matthew 6:24",
        principle:
          "You cannot serve God and money.",
        prompt:
          "Where is money making a decision that should belong to wisdom, relationships, or rest? Name it without shame.",
        practice: "Name one place where money is leading instead of serving.",
      },
      {
        day: 7,
        scripture: "1 Timothy 6:6",
        principle:
          "Godliness with contentment is great gain.",
        prompt:
          "After seven days, write what is enough for this season. Not an ideal — what is actually enough right now?",
        practice: "Write what is enough for this season, plainly.",
      },
    ],
  },
];

export function getChallengeById(id: string): ChallengeDefinition | undefined {
  return challengeDefinitions.find((c) => c.id === id);
}
