import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { setupEngine, settle, type EngineSetup } from "../testkit/harness.js";

function fireOnPlayByEffect(s: EngineSetup, permanentId: string): Promise<void> {
  return (
    s.engine as unknown as { fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void> }
  ).fireTiming(EffectTiming.OnPlay, { subjectPermanentId: permanentId, enteredByEffect: 0 });
}

describe("a paid hand trash keeps the After delete when the return is declined", () => {
  it("deletes with effect-played Witchmon after the player trashes a card and answers No to the Titan return", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-080", as: "witchmon" }],
        hand: [{ card: "BT1-013", as: "cost" }],
        trash: [{ card: "BT24-015", as: "titan" }],
      },
      1: { battleArea: [{ card: "BT24-015", as: "target" }] },
    });
    const targetId = s.perm("target").permanentId;
    const resolution = fireOnPlayByEffect(s, s.perm("witchmon").permanentId);

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const cost = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cost.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("cost").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets" || s.state.pendingDecision === undefined);
    if (s.state.pendingDecision?.kind === "chooseTargets") {
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision.decisionId,
          response: { kind: "chooseTargets", instanceIds: [targetId] },
        }),
      ).toEqual({ ok: true });
    }
    await resolution;

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("cost").instanceId, s.inst("titan").instanceId]),
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
  });
});
