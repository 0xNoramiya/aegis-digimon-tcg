import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { settle } from "../testkit/harness.js";
import { setupScenario } from "../testkit/scenario.js";
import { shoutmonX4SecurityBattleMaterialSave } from "./shoutmon-x4-security-battle-material-save.fixture.js";

describe("Shoutmon X4 Material Save after a Security Digimon battle", () => {
  it.each([
    { aliasOnlyMaterials: false, saved: true },
    { aliasOnlyMaterials: true, saved: false },
  ])(
    "Taiki's attack at negative memory saves printed names only (aliasOnlyMaterials=$aliasOnlyMaterials)",
    async ({ aliasOnlyMaterials, saved }) => {
      const s = setupScenario(shoutmonX4SecurityBattleMaterialSave({ aliasOnlyMaterials }), {
        autoAcceptOptional: true,
        autoSelectCards: true,
        declinePrompts: ["from your hand under this Tamer"],
      });
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        const x4 = s.inst("shoutmonX4").instanceId;
        const materials = [s.inst("shoutmonMaterial").instanceId, s.inst("ballistamonMaterial").instanceId];
        expect(
          s.engine.applyIntent(0, {
            type: "playCard",
            instanceId: x4,
            digiXros: { materialInstanceIds: materials },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.state.turnSeat === 1 && s.state.pendingDecision === undefined);

        const battle = s.events.find((e) => e.kind === "securityChecked");
        expect(battle).toMatchObject({ resolution: "battle", battle: { attackerDeleted: true } });
        expect(s.events.some((e) => e.kind === "memoryChanged" && e.to === -1)).toBe(true);
        const taiki = s.state.players[0]!.battleArea.find(
          (p) => p.topCard.instanceId === s.inst("attackTaiki").instanceId,
        )!;
        expect(taiki.isSuspended).toBe(true);
        expect(s.decisions.some(({ req }) => req.promptText?.includes("Material Save"))).toBe(saved);
        expect(taiki.stack.map((c) => c.instanceId).sort()).toEqual(saved ? [...materials].sort() : []);
        const trash = s.state.players[0]!.trash.map((c) => c.instanceId);
        expect(trash).toContain(x4);
        for (const material of materials) expect(trash.includes(material)).toBe(!saved);
      } finally {
        if (!s.state.gameOver && s.state.phase === Phase.Breeding) {
          const seat = s.state.turnSeat as 0 | 1;
          s.engine.applyIntent(seat, { type: "endPhase" });
          await advance(s.engine).waitForMainPhase(seat);
        }
        if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat as 0 | 1, { type: "surrender" });
        await loop;
      }
    },
  );
});
