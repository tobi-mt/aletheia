import { MODE_KEYS, type Mode } from "@/lib/mode-keys";

export type ChallengeId =
  | "gratitude-3day"
  | "waiting-5day"
  | "stewardship-7day";

export type ChallengeDayPrompt = {
  day: number;
  scripture: string;
  principleKey: string;
  promptKey: string;
  practiceKey: string;
};

export type ChallengeDefinition = {
  id: ChallengeId;
  titleKey: string;
  descriptionKey: string;
  totalDays: number;
  mode: Mode;
  days: ChallengeDayPrompt[];
};

export const challengeDefinitions: ChallengeDefinition[] = [
  {
    id: "gratitude-3day",
    titleKey: "challenges.gratitude3day.title",
    descriptionKey: "challenges.gratitude3day.description",
    totalDays: 3,
    mode: MODE_KEYS.LIFE,
    days: [
      {
        day: 1,
        scripture: "1 Thessalonians 5:18",
        principleKey: "challenges.gratitude3day.day1.principle",
        promptKey: "challenges.gratitude3day.day1.prompt",
        practiceKey: "challenges.gratitude3day.day1.practice",
      },
      {
        day: 2,
        scripture: "Psalm 107:1",
        principleKey: "challenges.gratitude3day.day2.principle",
        promptKey: "challenges.gratitude3day.day2.prompt",
        practiceKey: "challenges.gratitude3day.day2.practice",
      },
      {
        day: 3,
        scripture: "Philippians 4:11",
        principleKey: "challenges.gratitude3day.day3.principle",
        promptKey: "challenges.gratitude3day.day3.prompt",
        practiceKey: "challenges.gratitude3day.day3.practice",
      },
    ],
  },
  {
    id: "waiting-5day",
    titleKey: "challenges.waiting5day.title",
    descriptionKey: "challenges.waiting5day.description",
    totalDays: 5,
    mode: MODE_KEYS.PURPOSE,
    days: [
      {
        day: 1,
        scripture: "Psalm 27:14",
        principleKey: "challenges.waiting5day.day1.principle",
        promptKey: "challenges.waiting5day.day1.prompt",
        practiceKey: "challenges.waiting5day.day1.practice",
      },
      {
        day: 2,
        scripture: "Proverbs 4:25-26",
        principleKey: "challenges.waiting5day.day2.principle",
        promptKey: "challenges.waiting5day.day2.prompt",
        practiceKey: "challenges.waiting5day.day2.practice",
      },
      {
        day: 3,
        scripture: "Isaiah 40:31",
        principleKey: "challenges.waiting5day.day3.principle",
        promptKey: "challenges.waiting5day.day3.prompt",
        practiceKey: "challenges.waiting5day.day3.practice",
      },
      {
        day: 4,
        scripture: "James 1:5",
        principleKey: "challenges.waiting5day.day4.principle",
        promptKey: "challenges.waiting5day.day4.prompt",
        practiceKey: "challenges.waiting5day.day4.practice",
      },
      {
        day: 5,
        scripture: "Proverbs 3:5-6",
        principleKey: "challenges.waiting5day.day5.principle",
        promptKey: "challenges.waiting5day.day5.prompt",
        practiceKey: "challenges.waiting5day.day5.practice",
      },
    ],
  },
  {
    id: "stewardship-7day",
    titleKey: "challenges.stewardship7day.title",
    descriptionKey: "challenges.stewardship7day.description",
    totalDays: 7,
    mode: MODE_KEYS.MONEY,
    days: [
      {
        day: 1,
        scripture: "Deuteronomy 8:18",
        principleKey: "challenges.stewardship7day.day1.principle",
        promptKey: "challenges.stewardship7day.day1.prompt",
        practiceKey: "challenges.stewardship7day.day1.practice",
      },
      {
        day: 2,
        scripture: "Proverbs 21:5",
        principleKey: "challenges.stewardship7day.day2.principle",
        promptKey: "challenges.stewardship7day.day2.prompt",
        practiceKey: "challenges.stewardship7day.day2.practice",
      },
      {
        day: 3,
        scripture: "Luke 16:10",
        principleKey: "challenges.stewardship7day.day3.principle",
        promptKey: "challenges.stewardship7day.day3.prompt",
        practiceKey: "challenges.stewardship7day.day3.practice",
      },
      {
        day: 4,
        scripture: "Romans 13:8",
        principleKey: "challenges.stewardship7day.day4.principle",
        promptKey: "challenges.stewardship7day.day4.prompt",
        practiceKey: "challenges.stewardship7day.day4.practice",
      },
      {
        day: 5,
        scripture: "2 Corinthians 9:7",
        principleKey: "challenges.stewardship7day.day5.principle",
        promptKey: "challenges.stewardship7day.day5.prompt",
        practiceKey: "challenges.stewardship7day.day5.practice",
      },
      {
        day: 6,
        scripture: "Matthew 6:24",
        principleKey: "challenges.stewardship7day.day6.principle",
        promptKey: "challenges.stewardship7day.day6.prompt",
        practiceKey: "challenges.stewardship7day.day6.practice",
      },
      {
        day: 7,
        scripture: "1 Timothy 6:6",
        principleKey: "challenges.stewardship7day.day7.principle",
        promptKey: "challenges.stewardship7day.day7.prompt",
        practiceKey: "challenges.stewardship7day.day7.practice",
      },
    ],
  },
];

export function getChallengeById(id: string): ChallengeDefinition | undefined {
  return challengeDefinitions.find((c) => c.id === id);
}
