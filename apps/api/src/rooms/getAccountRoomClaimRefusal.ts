import { ConnectionErrorCode } from "@aegis/shared/protocol/ConnectionErrorCode";
import { AccountRoomClaim } from "#api/ranked/AccountRoomClaim";

type Params = { claim: AccountRoomClaim };

export function getAccountRoomClaimRefusal({ claim }: Params): ConnectionErrorCode | undefined {
  if (claim === AccountRoomClaim.RANKED_SEARCH_ACTIVE.value) {
    return ConnectionErrorCode.RANKED_SEARCH_ACTIVE.value;
  }
  if (claim === AccountRoomClaim.IN_ANOTHER_ROOM.value) {
    return ConnectionErrorCode.ALREADY_IN_MATCH.value;
  }
  return undefined;
}
