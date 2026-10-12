export const ForumSort = {
  RECENT: { name: "RECENT", value: "recent" },
  SUPPORTED: { name: "SUPPORTED", value: "supported" },
  UNANSWERED: { name: "UNANSWERED", value: "unanswered" },
} as const;
export type ForumSort = (typeof ForumSort)[keyof typeof ForumSort]["value"];
export const FORUM_SORTS = Object.values(ForumSort).map((entry) => entry.value);
