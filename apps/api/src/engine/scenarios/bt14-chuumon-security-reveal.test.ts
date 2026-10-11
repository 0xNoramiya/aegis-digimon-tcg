import fixtureBt14ChuumonSecurityReveal from "./bt14-chuumon-security-reveal.fixture.js";
import { fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("BT14 Chuumon security reveal arena scenario", () => {
  it("reveals the Sukamon the opponent places back on security once", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layScenarioFixture(s.state, fixtureBt14ChuumonSecurityReveal, [BLUE_DECK, RED_DECK], true);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 3;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: fixtureInstanceId("chuumon-play-card") })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((event) => event.kind === "cardRevealed") &&
        s.state.players[1]!.security[0]?.instanceId === fixtureInstanceId("chuumon-sukamon-card") &&
        s.state.pendingDecision === undefined,
    );

    const player = s.state.players[1]!;
    expect(player.security[0]).toMatchObject({
      instanceId: fixtureInstanceId("chuumon-sukamon-card"),
      cardId: "BT14-034",
    });
    expect(player.security[0]!.faceUp).not.toBe(true);
    expect(player.hand.map(({ instanceId }) => instanceId)).not.toContain(fixtureInstanceId("chuumon-sukamon-card"));
    expect(s.events.filter((event) => event.kind === "cardRevealed")).toEqual([
      expect.objectContaining({ seat: 1, cardId: "BT14-034", sourceCardId: "BT14-032" }),
    ]);
  });
});
