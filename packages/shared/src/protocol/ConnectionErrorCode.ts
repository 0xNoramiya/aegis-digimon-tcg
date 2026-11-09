import {
  GUEST_DECLINED_CLOSE_CODE,
  HOST_LEFT_CLOSE_CODE,
  MATCH_EXPIRED_CLOSE_CODE,
  MESSAGE_FLOOD_CLOSE_CODE,
} from "#shared/protocol/closeCodes";
import { SEAT_TRANSFERRED_CLOSE_CODE } from "#shared/protocol/seatTransferredCloseCode";
import { TOURNAMENT_CANCELLED_CLOSE_CODE } from "#shared/protocol/tournamentCancelledCloseCode";

export const ConnectionErrorCode = {
  MESSAGE_TOO_LARGE: { name: "MESSAGE_TOO_LARGE", value: "AEGIS_MESSAGE_TOO_LARGE", codes: [1009, 413] },
  CONNECTION_LOST: { name: "CONNECTION_LOST", value: "AEGIS_CONNECTION_LOST", codes: [1006] },
  RECONNECT_FAILED: { name: "RECONNECT_FAILED", value: "AEGIS_RECONNECT_FAILED", codes: [] },
  SEAT_TRANSFERRED: {
    name: "SEAT_TRANSFERRED",
    value: "AEGIS_SEAT_TRANSFERRED",
    codes: [SEAT_TRANSFERRED_CLOSE_CODE],
  },
  SESSION_EXPIRED: {
    name: "SESSION_EXPIRED",
    value: "AEGIS_SESSION_EXPIRED",
    codes: [MATCH_EXPIRED_CLOSE_CODE, 410, 522, 524, 4212, 4214],
  },
  TOO_MANY_MESSAGES: {
    name: "TOO_MANY_MESSAGES",
    value: "AEGIS_TOO_MANY_MESSAGES",
    codes: [MESSAGE_FLOOD_CLOSE_CODE, 429],
  },
  SERVER_UNAVAILABLE: {
    name: "SERVER_UNAVAILABLE",
    value: "AEGIS_SERVER_UNAVAILABLE",
    codes: [1011, 1013, 502, 503, 504, "AEGIS_GATEWAY_UNAVAILABLE", "AEGIS_DEPLOYMENT_DRAINING"],
  },
  GUEST_DECLINED: { name: "GUEST_DECLINED", value: "AEGIS_GUEST_DECLINED", codes: [GUEST_DECLINED_CLOSE_CODE] },
  HOST_LEFT: { name: "HOST_LEFT", value: "AEGIS_HOST_LEFT", codes: [HOST_LEFT_CLOSE_CODE] },
  TOURNAMENT_CANCELLED: {
    name: "TOURNAMENT_CANCELLED",
    value: "AEGIS_TOURNAMENT_CANCELLED",
    codes: [TOURNAMENT_CANCELLED_CLOSE_CODE],
  },
  ROOM_FULL: { name: "ROOM_FULL", value: "AEGIS_ROOM_FULL", codes: [] },
  NAME_TAKEN: { name: "NAME_TAKEN", value: "AEGIS_NAME_TAKEN", codes: [] },
  ROOM_SETTINGS_MISMATCH: { name: "ROOM_SETTINGS_MISMATCH", value: "AEGIS_ROOM_SETTINGS_MISMATCH", codes: [] },
  ROOM_CODE_INVALID: { name: "ROOM_CODE_INVALID", value: "AEGIS_ROOM_CODE_INVALID", codes: [] },
  ACCOUNT_REQUIRED: { name: "ACCOUNT_REQUIRED", value: "AEGIS_ACCOUNT_REQUIRED", codes: [] },
  ALREADY_IN_MATCH: { name: "ALREADY_IN_MATCH", value: "AEGIS_ALREADY_IN_MATCH", codes: [] },
  RANKED_SEARCH_ACTIVE: { name: "RANKED_SEARCH_ACTIVE", value: "AEGIS_RANKED_SEARCH_ACTIVE", codes: [] },
  JOIN_REFUSED: { name: "JOIN_REFUSED", value: "AEGIS_JOIN_REFUSED", codes: [525] },
} as const;

export type ConnectionErrorCode = (typeof ConnectionErrorCode)[keyof typeof ConnectionErrorCode]["value"];
