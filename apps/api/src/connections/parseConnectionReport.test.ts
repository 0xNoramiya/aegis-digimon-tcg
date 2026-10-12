import { describe, expect, it } from "vitest";
import { parseConnectionReport } from "#api/connections/parseConnectionReport";

const report = { closeCode: 1006, offlineMs: 1_500, attempts: 1, hiddenAtDrop: false, onlineAtDrop: true };

describe("connection report from the client", () => {
  it("copies only the known fields", () => {
    expect(parseConnectionReport({ ...report, accountId: "someone-else", seat: 0 })).toEqual(report);
  });

  it.each([
    ["a missing payload", undefined],
    ["an array", [report]],
    ["a close code outside the WebSocket range", { ...report, closeCode: 999 }],
    ["a fractional offline time", { ...report, offlineMs: 1.5 }],
    ["an offline time longer than an hour", { ...report, offlineMs: 3_600_001 }],
    ["a negative attempt count", { ...report, attempts: -1 }],
    ["a non-boolean visibility flag", { ...report, hiddenAtDrop: "yes" }],
    ["a missing online flag", { ...report, onlineAtDrop: undefined }],
  ])("refuses %s", (_label, payload) => {
    expect(parseConnectionReport(payload)).toBeUndefined();
  });
});
