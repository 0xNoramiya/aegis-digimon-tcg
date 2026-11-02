export const LobbyMode = {
  CASUAL: { name: "CASUAL", value: "casual" },
  PRACTICE: { name: "PRACTICE", value: "practice" },
  PRIVATE_SEALED: { name: "PRIVATE_SEALED", value: "private-sealed" },
  PRIVATE: { name: "PRIVATE", value: "private" },
} as const;

export type LobbyMode = (typeof LobbyMode)[keyof typeof LobbyMode]["value"];
