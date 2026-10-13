import { CLIENT_ERROR_KINDS, type ClientErrorKind } from "#shared/clientErrors/ClientErrorKind";

export function isClientErrorKind(value: unknown): value is ClientErrorKind {
  return typeof value === "string" && CLIENT_ERROR_KINDS.includes(value as ClientErrorKind);
}
