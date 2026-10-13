export const CommunityHubSection = {
  DECKS: { name: "DECKS", value: "decks" },
  ROADMAP: { name: "ROADMAP", value: "roadmap" },
} as const;
export type CommunityHubSection = (typeof CommunityHubSection)[keyof typeof CommunityHubSection]["value"];
