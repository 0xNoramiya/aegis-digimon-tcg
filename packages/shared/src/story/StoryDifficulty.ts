export const StoryDifficulty = {
  INTRO: {
    name: "INTRO",
    value: "intro",
    playerSecurity: 5,
    opponentSecurity: 5,
    opponentLevel: null,
    isAggressive: false,
  },
  CHALLENGE: {
    name: "CHALLENGE",
    value: "challenge",
    playerSecurity: 5,
    opponentSecurity: 5,
    opponentLevel: 3,
    isAggressive: false,
  },
  ELITE: {
    name: "ELITE",
    value: "elite",
    playerSecurity: 5,
    opponentSecurity: 6,
    opponentLevel: 4,
    isAggressive: false,
  },
  BOSS: {
    name: "BOSS",
    value: "boss",
    playerSecurity: 4,
    opponentSecurity: 6,
    opponentLevel: 5,
    isAggressive: true,
  },
} as const;

export type StoryDifficulty = (typeof StoryDifficulty)[keyof typeof StoryDifficulty]["value"];

export type StoryDifficultyEntry = (typeof StoryDifficulty)[keyof typeof StoryDifficulty];
