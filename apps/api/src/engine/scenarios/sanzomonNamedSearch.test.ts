import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

it("Discord 1558813188479262720 arena: one DigiXros material and one of each named reveal", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  layDevScenario("arena-ex6-sanzomon-named-search", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const play = (materialInstanceIds: string[]) =>
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: "sanzo-hand-0",
        digiXros: { materialInstanceIds },
      });
    expect(play(["sanzo-hand-1", "sanzo-hand-2"]).ok).toBe(false);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(play(["sanzo-hand-1"])).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.length === 1 &&
        !s.state.pendingDecision &&
        s.engine.mainVerbContinuationsInFlight === 0,
    );
    expect(s.state.memory).toBe(5);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.players[0]!.battleArea[0]!.stack.map((card) => card.instanceId)).toEqual(["sanzo-hand-1"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      ["sanzo-hand-2", "sanzo-hand-3", "sanzo-deck-0", "sanzo-deck-1", "sanzo-deck-3"].sort(),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      "sanzo-deck-5",
      "sanzo-deck-2",
      "sanzo-deck-4",
    ]);
    const revealed = s.events.filter((event) => event.kind === "cardRevealed" && event.sourceCardId === "EX6-025");
    expect(revealed).toHaveLength(4);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});
