import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("an effect returning several Digimon to the deck asks its controller for the order", () => {
  it("lets the Neptunemon player order the opposing Digimon tied for fewest digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-030", as: "neptunemon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          deck: ["BT1-011"],
        },
      },
      { autoOrderCards: false },
    );
    const opponent = s.state.players[1]!;
    const firstId = s.inst("first").instanceId;
    const secondId = s.inst("second").instanceId;
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("neptunemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const decision = s.decisions.at(-1)!;
    expect(decision.seat).toBe(0);
    expect(new Set(decision.req.options?.candidateInstanceIds)).toEqual(new Set([firstId, secondId]));
    expect(opponent.battleArea).toHaveLength(2);

    const order = [secondId, firstId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.req.decisionId,
        response: { kind: "orderCards", order },
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 0 && s.state.pendingDecision === undefined);

    expect(opponent.deck.slice(-2).map((card) => card.instanceId)).toEqual(order);
  });

  it("returns a single Digimon without an order prompt", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT24-030", as: "neptunemon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "only" }], deck: ["BT1-011"] },
    });
    const opponent = s.state.players[1]!;
    s.state.memory = 12;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("neptunemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => opponent.battleArea.length === 0 && s.state.pendingDecision === undefined);

    expect(s.decisions.some((entry) => entry.req.kind === "orderCards")).toBe(false);
    expect(opponent.deck.at(-1)?.instanceId).toBe(s.inst("only").instanceId);
  });
});
