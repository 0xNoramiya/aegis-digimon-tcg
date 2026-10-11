import fixtureLm067GundramonFreeOption from "./lm067-gundramon-free-option.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("arena uses Gundramon's revealed P-180 for free and keeps the turn", async () => {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, declinePrompts: ["By trashing"] },
  );
  layScenarioFixture(s.state, fixtureLm067GundramonFreeOption, [BLUE_DECK, RED_DECK], true);
  const securityBefore = s.state.players[1]!.security.length;
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(5);
    const base = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT10-064")!;
    const deckBefore = s.state.players[0]!.deck.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: fixtureInstanceId("gundramon-card"),
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some(
          (event) =>
            event.kind === "effectResolved" &&
            event.sourceCardId === "LM-067" &&
            event.effectKey.includes("reveal-six"),
        ) && s.state.pendingDecision === undefined,
    );
    await advance(s.engine).waitForMainPhase(0);
    expect(base.topCard.cardId).toBe("LM-067");
    expect(base.stack.some((card) => card.instanceId === fixtureInstanceId("gundramon-deck-2-card"))).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(securityBefore - 1);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 2);
    expect(s.state.players[0]!.deck.slice(-5).map((card) => card.cardId)).toEqual([
      "BT1-027",
      "BT1-028",
      "BT1-045",
      "BT1-047",
      "BT1-050",
    ]);
    expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "useOption")).toEqual([]);
    expect(s.state.memory).toBe(1);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.phase).toBe(Phase.Main);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
