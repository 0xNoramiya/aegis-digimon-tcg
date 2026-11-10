import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

describe("paid suspension keeps the Then attack when the Option use is declined", () => {
  it("offers the TS attack after Dan & Kanan suspends and the player answers No to using an Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-085", as: "tamer" },
            { card: "BT24-024", as: "attacker" },
          ],
          hand: [{ card: "BT24-092", as: "option" }],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { security: [{ card: "BT1-012", as: "enemySecurity" }], deck: ["BT1-013", "BT1-014"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);

    const answer = async (accept: boolean): Promise<void> => {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const decisionId = s.state.pendingDecision!.decisionId;
      expect(
        s.engine.applyIntent(0, { type: "respondDecision", decisionId, response: { kind: "optional", accept } }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== decisionId);
    };

    await answer(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
    await answer(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    await answer(true);
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length === 1 && !observe(s.engine).isAttacking(),
    );

    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
