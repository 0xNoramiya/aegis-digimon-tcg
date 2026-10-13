import "#api/cards/index";
import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "#api/engine/testkit/advance";
import { settle, type EngineSetup } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/vademon-breeding-face-down-reduction.fixture";

const vegiemonRequirementIndex = 1;

async function openMainPhase(s: EngineSetup) {
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
}

async function settleDigivolve(s: EngineSetup) {
  await settle(() => s.state.pendingDecision !== undefined || s.engine.mainVerbContinuationsInFlight === 0);
}

describe("BT22-061 Vademon face-down reduction by area", () => {
  it("charges the full Vegiemon cost when the Vegiemon is in the breeding area", async () => {
    const s = setupScenario(fixture);
    const loop = s.engine.startTurnLoop();
    await openMainPhase(s);
    expect(s.perm("breedingVegiemon").stack.filter(({ faceUp }) => !faceUp)).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("breedingVegiemon").permanentId,
        instanceId: s.inst("breedingVademon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: vegiemonRequirementIndex,
      }),
    ).toEqual({ ok: true });
    await settleDigivolve(s);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.breeding?.topCard.instanceId).toBe(s.inst("breedingVademon").instanceId);
    expect({ turnSeat: s.state.turnSeat, memory: s.state.memory }).toEqual({ turnSeat: 0, memory: 0 });

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("reduces the Vegiemon cost by its face-down card in the battle area", async () => {
    const s = setupScenario(fixture);
    const loop = s.engine.startTurnLoop();
    await openMainPhase(s);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("battleVegiemon").permanentId,
        instanceId: s.inst("battleVademon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: vegiemonRequirementIndex,
      }),
    ).toEqual({ ok: true });
    await settleDigivolve(s);

    expect(s.perm("battleVegiemon").topCard.instanceId).toBe(s.inst("battleVademon").instanceId);
    expect({ turnSeat: s.state.turnSeat, memory: s.state.memory }).toEqual({ turnSeat: 0, memory: 1 });

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
