export const RematchMode = {
  FINISH_SERIES: { name: "FINISH_SERIES", value: "finish", countsFinishedGame: true },
  NEW_SERIES: { name: "NEW_SERIES", value: "new", countsFinishedGame: false },
} as const;

export type RematchMode = (typeof RematchMode)[keyof typeof RematchMode]["value"];
