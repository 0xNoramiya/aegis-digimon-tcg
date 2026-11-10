import { ConnectionErrorCode } from "@aegis/shared/protocol/ConnectionErrorCode";
import type { Translate, TranslationKey } from "@/i18n/translationTypes";

const messages: Record<ConnectionErrorCode, TranslationKey> = {
  [ConnectionErrorCode.MESSAGE_TOO_LARGE.value]: "game.messageTooLarge",
  [ConnectionErrorCode.CONNECTION_LOST.value]: "game.connectionLostDetail",
  [ConnectionErrorCode.RECONNECT_FAILED.value]: "game.reconnectFailed",
  [ConnectionErrorCode.SEAT_TRANSFERRED.value]: "game.seatTransferred",
  [ConnectionErrorCode.SESSION_EXPIRED.value]: "game.sessionExpired",
  [ConnectionErrorCode.TOO_MANY_MESSAGES.value]: "game.tooManyMessages",
  [ConnectionErrorCode.SERVER_UNAVAILABLE.value]: "game.serverUnavailable",
  [ConnectionErrorCode.GUEST_DECLINED.value]: "game.guestApproval.declined",
  [ConnectionErrorCode.HOST_LEFT.value]: "game.guestApproval.hostLeft",
  [ConnectionErrorCode.TOURNAMENT_CANCELLED.value]: "game.tournamentCancelled",
  [ConnectionErrorCode.ROOM_FULL.value]: "game.roomFull",
  [ConnectionErrorCode.NAME_TAKEN.value]: "game.nameTaken",
  [ConnectionErrorCode.ROOM_SETTINGS_MISMATCH.value]: "game.roomSettingsMismatch",
  [ConnectionErrorCode.ROOM_CODE_INVALID.value]: "game.roomCodeInvalid",
  [ConnectionErrorCode.ACCOUNT_REQUIRED.value]: "game.accountRequired",
  [ConnectionErrorCode.ALREADY_IN_MATCH.value]: "game.alreadyInMatch",
  [ConnectionErrorCode.RANKED_SEARCH_ACTIVE.value]: "game.rankedSearchActive",
  [ConnectionErrorCode.JOIN_REFUSED.value]: "game.joinRefused",
};

type Params = {
  error: string | undefined;
  t: Translate;
};

export function getConnectionErrorMessage({ error, t }: Params): string {
  const entry = Object.values(ConnectionErrorCode).find((candidate) => candidate.value === error);
  return entry ? t(messages[entry.value]) : (error ?? t("game.connectionLostDetail"));
}
