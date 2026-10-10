import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("Feedback #6 playable Deramon breeding scenario", () => {
  it("refuses Deramon on Pomumon over Yokomon in breeding and accepts it on Parasaurmon for 3", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-feedback6-deramon-breeding-level", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: "dev-perm-0-feedback6-pomumon",
          instanceId: "dev-feedback6-deramon",
          useAlternateCost,
        }),
      ).toMatchObject({ ok: false });
    }
    expect(human.breeding?.topCard.cardId).toBe("EX9-036");
    expect(human.breeding?.stack.map((card) => card.cardId)).toEqual(["BT21-003"]);
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "dev-perm-0-feedback6-parasaurmon",
        instanceId: "dev-feedback6-deramon",
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.battleArea.some((permanent) => permanent.topCard.instanceId === "dev-feedback6-deramon") &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.turnSeat).toBe(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
