import "#api/cards/index";
import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/galacticmon-assembly-mixed-materials.fixture";

const vemmonTextMaterials = [
  "tsumemon",
  "ragnarok-cannon",
  "galacticmon",
  "zenith",
  "fusionize",
  "vemmon",
  "snatchmon",
  "destromon",
].map((name) => `galacticmon-material-${name}`);

async function openMainPhase() {
  const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
  const loop = s.engine.runOneTurn();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

describe("Galacticmon Assembly with mixed Vemmon-text materials", () => {
  it("plays from eight trash cards whose [Vemmon] is in effect, inherited, or security text", async () => {
    const { s, loop } = await openMainPhase();
    try {
      const galacticmon = s.inst("galacticmon-galacticmon");
      expect(s.state.memory).toBe(3);
      expect(galacticmon.playableFromHand).toBe(true);
      const materialInstanceIds = vemmonTextMaterials.map((alias) => s.inst(alias).instanceId);

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: galacticmon.instanceId,
          assembly: { materialInstanceIds },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === galacticmon.instanceId) &&
          s.state.pendingDecision === undefined,
      );

      const played = s.state.players[0]!.battleArea.find(
        ({ topCard }) => topCard.instanceId === galacticmon.instanceId,
      )!;
      expect(played.stack.map(({ instanceId }) => instanceId).sort()).toEqual([...materialInstanceIds].sort());
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
        s.inst("galacticmon-material-unrelated").instanceId,
      ]);
      expect(s.state.memory).toBe(-5);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("rejects a trash card without [Vemmon] in its text", async () => {
    const { s, loop } = await openMainPhase();
    try {
      const materialInstanceIds = [...vemmonTextMaterials.slice(1), "galacticmon-material-unrelated"].map(
        (alias) => s.inst(alias).instanceId,
      );
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("galacticmon-galacticmon").instanceId,
          assembly: { materialInstanceIds },
        }),
      ).toMatchObject({ ok: false, reason: "invalid-material" });
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
