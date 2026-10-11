import fixtureBt22RieKishibeLegalDigivolve from "./bt22-rie-kishibe-legal-digivolve.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("Rie Kishibe legal digivolution arena", () => {
  it("deletes the other CS Tamer, digivolves into EX13 LordKnightmon for 2, and completes the turn", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureBt22RieKishibeLegalDigivolve, [BLUE_DECK, RED_DECK], true);
    const human = s.state.players[0]!;
    expect(human.security).toHaveLength(3);

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const deckBefore = human.deck.length;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && !s.state.pendingDecision);

    const lord = human.battleArea.find(({ permanentId }) => permanentId === fixturePermanentId("own-rie-legal-base"));
    expect(lord?.topCard.cardId).toBe("EX13-064");
    expect(lord?.stack.map(({ cardId }) => cardId)).toEqual(["BT22-090"]);
    expect(human.trash.map(({ instanceId }) => instanceId)).toContain(
      fixtureInstanceId("own-card-rie-legal-payment-card"),
    );
    expect(human.hand.some(({ instanceId }) => instanceId === fixtureInstanceId("rie-legal-lordknightmon-card"))).toBe(
      false,
    );
    expect(human.deck).toHaveLength(deckBefore - 1);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "memoryChanged", reason: "digivolve", from: -3, to: -5 }),
    );
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
