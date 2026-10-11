import fixtureBt23KingDrasilUnsuspendedCost from "./bt23-king-drasil-unsuspended-cost.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";

const KING_DRASIL = fixturePermanentId("own-king-drasil-cost");
const ULFORCE_CARD = fixtureInstanceId("king-drasil-cost-ulforce-card");
const UNSUSPEND_OPTION = 1;

describe("BT23 King Drasil unsuspended-cost arena", () => {
  it("King Drasil pays its suspend cost after Ulforce unsuspends it", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferTriggerKeys: ["EX13-023"],
        preferInstanceIds: [fixtureInstanceId("own-card-king-drasil-cost-card")],
        preferOptionIndex: UNSUSPEND_OPTION,
      },
    );
    layScenarioFixture(s.state, fixtureBt23KingDrasilUnsuspendedCost, [BLUE_DECK, RED_DECK], true);
    const kingDrasil = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === KING_DRASIL)!;
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: KING_DRASIL, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    await settle();
    expect(kingDrasil.isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ULFORCE_CARD })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && kingDrasil.isSuspended, 80);

    const ulforce = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === ULFORCE_CARD)!;
    expect(kingDrasil.isSuspended).toBe(true);
    expect(ulforce.isSuspended).toBe(false);
    for (const keyword of ["Rush", "Raid", "Reboot", "Blocker"] as const) {
      expect(observe(s.engine).hasKeyword(ulforce, keyword)).toBe(true);
    }
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
