import type { ConnectionReport } from "@aegis/shared/protocol/ConnectionReport";

const MAX_OFFLINE_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 1000;

type IntegerRangeParams = {
  value: unknown;
  min: number;
  max: number;
};

function isIntegerInRange({ value, min, max }: IntegerRangeParams): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

export function parseConnectionReport(payload: unknown): ConnectionReport | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }
  const { closeCode, offlineMs, attempts, hiddenAtDrop, onlineAtDrop } = payload as Record<string, unknown>;
  if (
    !isIntegerInRange({ value: closeCode, min: 1000, max: 4999 }) ||
    !isIntegerInRange({ value: offlineMs, min: 0, max: MAX_OFFLINE_MS }) ||
    !isIntegerInRange({ value: attempts, min: 0, max: MAX_ATTEMPTS }) ||
    typeof hiddenAtDrop !== "boolean" ||
    typeof onlineAtDrop !== "boolean"
  ) {
    return undefined;
  }
  return {
    closeCode: closeCode as number,
    offlineMs: offlineMs as number,
    attempts: attempts as number,
    hiddenAtDrop,
    onlineAtDrop,
  };
}
