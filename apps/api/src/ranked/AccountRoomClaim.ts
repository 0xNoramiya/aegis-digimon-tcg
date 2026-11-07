export const AccountRoomClaim = {
  CLAIMED: { name: "CLAIMED", value: "claimed" },
  RANKED_SEARCH_ACTIVE: { name: "RANKED_SEARCH_ACTIVE", value: "ranked_search_active" },
  IN_ANOTHER_ROOM: { name: "IN_ANOTHER_ROOM", value: "in_another_room" },
} as const;

export type AccountRoomClaim = (typeof AccountRoomClaim)[keyof typeof AccountRoomClaim]["value"];
