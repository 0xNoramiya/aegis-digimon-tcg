import { Phase } from "@aegis/shared/schema/enums";
import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/breeding-link-limit.fixture";
import "#api/cards/BT24/BT24-091";
import "#api/cards/BT25/BT25-022";
import "#api/cards/BT25/BT25-093";

it("trashes the existing link card when a breeding Digimon at its link limit is linked again", async () => {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] });
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding && !s.state.pendingDecision);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tidalStream").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
    const breeding = s.state.players[0]!.breeding!;
    expect(breeding.permanentId).toBe(s.perm("breedingLunamon").permanentId);
    expect(breeding.linked.map((card) => card.instanceId)).toEqual([s.inst("tidalStream").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("existingLink").instanceId);
    expect(s.state.memory).toBe(1);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.phase).toBe(Phase.Main);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
