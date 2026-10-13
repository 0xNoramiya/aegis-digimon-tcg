import type { ClientErrorKind } from "#shared/clientErrors/ClientErrorKind";

export type ClientErrorReport = {
  kind: ClientErrorKind;
  message: string;
  stack: string;
  signature: string;
  release: string;
  route: string;
  roomId?: string;
  matchId?: string;
  userAgent: string;
  occurredAt: string;
};
