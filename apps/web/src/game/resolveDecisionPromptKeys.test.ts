import { describe, expect, it } from "vitest";
import { resolveDecisionPromptKeys } from "@/game/resolveDecisionPromptKeys";

describe("resolveDecisionPromptKeys", () => {
  it("routes a decision opened on the opponent's turn to the ping", () => {
    expect(
      resolveDecisionPromptKeys({ promptKey: "decision-1", spectating: false, opponentTurn: true, pingEnabled: true }),
    ).toEqual({ pingPromptKey: "decision-1" });
  });

  it("keeps a decision on the viewer's own turn on the in-tab prompt sound", () => {
    expect(
      resolveDecisionPromptKeys({ promptKey: "decision-1", spectating: false, opponentTurn: false, pingEnabled: true }),
    ).toEqual({ readoutPromptKey: "decision-1" });
    expect(
      resolveDecisionPromptKeys({
        promptKey: "decision-1",
        spectating: false,
        opponentTurn: false,
        pingEnabled: false,
      }),
    ).toEqual({ readoutPromptKey: "decision-1" });
  });

  it("stays silent for opponent-turn decisions when the ping is off", () => {
    expect(
      resolveDecisionPromptKeys({ promptKey: "decision-1", spectating: false, opponentTurn: true, pingEnabled: false }),
    ).toEqual({});
  });

  it("never sounds a prompt for spectators and replays", () => {
    expect(
      resolveDecisionPromptKeys({ promptKey: "decision-1", spectating: true, opponentTurn: true, pingEnabled: true }),
    ).toEqual({});
    expect(
      resolveDecisionPromptKeys({ promptKey: "decision-1", spectating: true, opponentTurn: false, pingEnabled: true }),
    ).toEqual({});
  });
});
