import fixtureEx11006LinkedAttack from "./ex11-006-linked-attack.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

const TURBOMON = fixturePermanentId("own-turbomon");
const MANEUVERMON = fixtureInstanceId("maneuvermon-card");
const LINKED_MAQUINAMON = fixtureInstanceId("linked-maquinamon-card");

describe("playable Flickmon linked-attack scenario", () => {
  it("reduces the Maquinamon digivolution only when the linked Digimon attacks", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        declinePrompts: ["Play without paying the cost"],
      },
    );
    layScenarioFixture(s.state, fixtureEx11006LinkedAttack, [BLUE_DECK, RED_DECK], true);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const host = () => human.battleArea.find((permanent) => permanent.permanentId === TURBOMON)!;
    expect(s.state.memory).toBe(4);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: TURBOMON, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        host()?.topCard.instanceId === MANEUVERMON &&
        s.state.pendingDecision === undefined &&
        s.state.phase === Phase.Main,
      5000,
    );

    expect(s.state.memory).toBe(3);
    expect(host().stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX11-006", "EX11-027", "EX11-029"]),
    );
    expect(host().linked.map((card) => card.instanceId)).toEqual([LINKED_MAQUINAMON]);
    expect(human.hand.map((card) => card.instanceId)).not.toContain(MANEUVERMON);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
