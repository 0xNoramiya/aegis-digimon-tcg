import fixtureFaceDownAceNoOverflow from "./face-down-ace-no-overflow.fixture.js";
import { fixturePermanentId, fixtureInstanceId } from "../scenario/references.js";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layScenarioFixture } from "../scenario/fixture.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("Face-down ACE arena scenario", () => {
  it("deleting a host with a face-down ACE source costs no Overflow", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoOrderTriggers: true });
    layScenarioFixture(s.state, fixtureFaceDownAceNoOverflow, [BLUE_DECK, RED_DECK], true);
    void s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: fixturePermanentId("own-face-down-ace-host"),
        target: { kind: "permanent", permanentId: fixturePermanentId("opponent-face-down-ace-wall") },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    const trashed = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(trashed).toEqual(
      expect.arrayContaining([
        fixtureInstanceId("own-card-face-down-ace-host-card"),
        fixtureInstanceId("face-down-ace-blitz-card"),
      ]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
