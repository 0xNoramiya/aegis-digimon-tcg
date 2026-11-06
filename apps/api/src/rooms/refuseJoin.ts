import { ServerError } from "colyseus";
import type { ConnectionErrorCode } from "@aegis/shared/protocol/ConnectionErrorCode";
import { log } from "#api/logger";

const JOIN_REFUSED_STATUS = 403;

type Params = { roomId: string; reason: ConnectionErrorCode };

export function refuseJoin({ roomId, reason }: Params): never {
  log(`[JOIN_REFUSED] ${JSON.stringify({ roomId, reason })}`);
  throw new ServerError(JOIN_REFUSED_STATUS, reason);
}
