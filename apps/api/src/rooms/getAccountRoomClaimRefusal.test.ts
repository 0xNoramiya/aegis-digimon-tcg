import { describe, expect, it } from "vitest";
import { ConnectionErrorCode } from "@aegis/shared/protocol/ConnectionErrorCode";
import { AccountRoomClaim } from "#api/ranked/AccountRoomClaim";
import { getAccountRoomClaimRefusal } from "#api/rooms/getAccountRoomClaimRefusal";

describe("account room claim refusals", () => {
  it.each([
    [AccountRoomClaim.RANKED_SEARCH_ACTIVE.value, ConnectionErrorCode.RANKED_SEARCH_ACTIVE.value],
    [AccountRoomClaim.IN_ANOTHER_ROOM.value, ConnectionErrorCode.ALREADY_IN_MATCH.value],
    [AccountRoomClaim.CLAIMED.value, undefined],
  ])("explains a %s claim as %s", (claim, refusal) => {
    expect(getAccountRoomClaimRefusal({ claim })).toBe(refusal);
  });
});
