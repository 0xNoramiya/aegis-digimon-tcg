import type { ClientErrorReport } from "@aegis/shared/clientErrors/ClientErrorReport";
import { isClientErrorKind } from "@aegis/shared/clientErrors/isClientErrorKind";
import {
  MAX_CLIENT_ERROR_ID,
  MAX_CLIENT_ERROR_MESSAGE,
  MAX_CLIENT_ERROR_RELEASE,
  MAX_CLIENT_ERROR_ROUTE,
  MAX_CLIENT_ERROR_SIGNATURE,
  MAX_CLIENT_ERROR_STACK,
  MAX_CLIENT_ERROR_USER_AGENT,
} from "@aegis/shared/clientErrors/clientErrorLimits";

export type ClientErrorReportFailure =
  | "invalid_body"
  | "invalid_kind"
  | "invalid_message"
  | "invalid_stack"
  | "invalid_signature"
  | "invalid_release"
  | "invalid_route"
  | "invalid_room_id"
  | "invalid_match_id"
  | "invalid_user_agent"
  | "invalid_occurred_at";

export type ParsedClientErrorReport = { report: ClientErrorReport } | { error: ClientErrorReportFailure };

type TextRule = {
  maxLength: number;
  allowEmpty: boolean;
};

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const RELEASE_PATTERN = /^[A-Za-z0-9._-]+$/;

function isText(value: unknown, { maxLength, allowEmpty }: TextRule): value is string {
  return typeof value === "string" && value.length <= maxLength && (allowEmpty || value.trim() !== "");
}

function isOptionalId(value: unknown): value is string | undefined {
  return (
    value === undefined ||
    (isText(value, { maxLength: MAX_CLIENT_ERROR_ID, allowEmpty: false }) && ID_PATTERN.test(value))
  );
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value));
}

function readBody(body: unknown): Record<string, unknown> | undefined {
  if (typeof body === "string") {
    try {
      return readBody(JSON.parse(body));
    } catch {
      return undefined;
    }
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return undefined;
  }
  return body as Record<string, unknown>;
}

export function parseClientErrorReport(body: unknown): ParsedClientErrorReport {
  const input = readBody(body);
  if (!input) {
    return { error: "invalid_body" };
  }
  const { kind, message, stack, signature, release, route, roomId, matchId, userAgent, occurredAt } = input;
  if (!isClientErrorKind(kind)) {
    return { error: "invalid_kind" };
  }
  if (!isText(message, { maxLength: MAX_CLIENT_ERROR_MESSAGE, allowEmpty: false })) {
    return { error: "invalid_message" };
  }
  if (!isText(stack, { maxLength: MAX_CLIENT_ERROR_STACK, allowEmpty: true })) {
    return { error: "invalid_stack" };
  }
  if (!isText(signature, { maxLength: MAX_CLIENT_ERROR_SIGNATURE, allowEmpty: false })) {
    return { error: "invalid_signature" };
  }
  if (!isText(release, { maxLength: MAX_CLIENT_ERROR_RELEASE, allowEmpty: false }) || !RELEASE_PATTERN.test(release)) {
    return { error: "invalid_release" };
  }
  if (!isText(route, { maxLength: MAX_CLIENT_ERROR_ROUTE, allowEmpty: true })) {
    return { error: "invalid_route" };
  }
  if (!isOptionalId(roomId)) {
    return { error: "invalid_room_id" };
  }
  if (!isOptionalId(matchId)) {
    return { error: "invalid_match_id" };
  }
  if (!isText(userAgent, { maxLength: MAX_CLIENT_ERROR_USER_AGENT, allowEmpty: true })) {
    return { error: "invalid_user_agent" };
  }
  if (!isTimestamp(occurredAt)) {
    return { error: "invalid_occurred_at" };
  }
  return {
    report: {
      kind,
      message,
      stack,
      signature,
      release,
      route,
      ...(roomId === undefined ? {} : { roomId }),
      ...(matchId === undefined ? {} : { matchId }),
      userAgent,
      occurredAt,
    },
  };
}
