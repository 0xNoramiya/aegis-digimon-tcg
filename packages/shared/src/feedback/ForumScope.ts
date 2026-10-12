export const ForumScope = {
  ALL: { name: "ALL", value: "all" },
  MINE: { name: "MINE", value: "mine" },
  FOLLOWING: { name: "FOLLOWING", value: "following" },
} as const;
export type ForumScope = (typeof ForumScope)[keyof typeof ForumScope]["value"];
export const FORUM_SCOPES = Object.values(ForumScope).map((entry) => entry.value);
