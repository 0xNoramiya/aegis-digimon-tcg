import "#api/cards/index";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import { advance } from "#api/engine/testkit/advance";

describe("Scramble resolves before the draw phase", () => {
  it("returns a card to an empty deck before the mandatory draw", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-027", as: "scramble" }], deck: [], trash: [{ card: "BT1-011", as: "returned" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.perm("scramble").placedByEffect = true;
    s.state.isFirstPlayersFirstTurn = false;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.gameOver).toBe(false);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("returned").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    s.engine.applyIntent(0, { type: "surrender" });
    await turn;
    await settle();
  });
});
