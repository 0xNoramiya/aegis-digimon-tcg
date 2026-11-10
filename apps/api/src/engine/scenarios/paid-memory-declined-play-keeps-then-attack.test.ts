import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { effectsOf } from "../effects/collect.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("paid memory keeps the Then attack when the play is declined", () => {
  it("offers BlueMeramon's attack after it pays 3 and the player answers No to the trash play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-011", as: "blueMeramon" }], trash: [{ card: "BT22-010", as: "candidate" }] },
      1: { security: [{ card: "BT1-009", as: "enemySecurity" }] },
    });
    await s.ready();
    const source = (
      s.engine as unknown as { cardSourceOf(card: object): Parameters<typeof effectsOf>[1] }
    ).cardSourceOf(s.perm("blueMeramon").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT22-011/"),
    )!.effectKey;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: source.instanceId, effectKey })).toEqual(
      { ok: true },
    );

    const answer = async (accept: boolean): Promise<void> => {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const decisionId = s.state.pendingDecision!.decisionId;
      expect(
        s.engine.applyIntent(0, { type: "respondDecision", decisionId, response: { kind: "optional", accept } }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== decisionId);
    };

    await answer(false);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("candidate").instanceId]);
    await answer(true);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const attackTarget = s.decisions.at(-1)!.req;
    expect(attackTarget.options?.candidateInstanceIds).toContain("player");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attackTarget.decisionId,
        response: { kind: "selectCards", instanceIds: ["player"] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackDeclared"));

    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
    expect(s.perm("blueMeramon").isSuspended).toBe(true);
  });
});
