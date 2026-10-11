import fixtureBlackSabbathTrash from "./black-sabbath-trash.fixture.js";
import { fixturePermanentId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("playable Black Sabbath scenario", () => {
  it("uses LM-068 from the trash after Punkmon's [When Attacking] trashes the hand to 3", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureBlackSabbathTrash, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const [human, bot] = [s.state.players[0]!, s.state.players[1]!];
    expect(human.hand).toHaveLength(5);
    expect(s.state.memory).toBe(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: fixturePermanentId("own-punkmon"),
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        bot.battleArea.length === 0 &&
        s.events.some((event) => event.kind === "attackEnded") &&
        s.state.pendingDecision === undefined,
    );

    expect(human.hand).toHaveLength(3);
    expect(s.state.memory).toBe(0);
    expect(human.trash.map((card) => card.cardId)).toContain("LM-068");
    expect(bot.trash.map((card) => card.cardId)).toContain("BT1-020");
    expect(s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "LM-068")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    s.engine.expireMatchTimer(0);
    await loop;
  });
});
