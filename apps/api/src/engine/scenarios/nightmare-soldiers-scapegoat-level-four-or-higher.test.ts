import { describe, expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import fixture from "#api/engine/scenarios/nightmare-soldiers-scapegoat-level-four-or-higher.fixture";
import "#api/cards/BT1/BT1-016";
import "#api/cards/EX8/EX8-057";
import "#api/cards/EX8/EX8-059";
import "#api/cards/EX8/EX8-071";

describe("Nightmare Soldiers grants Scapegoat only to level 4 or higher NSo Digimon", () => {
  it("leaves a level 3 NSo Digimon without Scapegoat, so it is deleted in battle", async () => {
    const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true });
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      const levelThreeId = s.inst("levelThreeNso").instanceId;
      const sacrificeId = s.inst("sacrifice").instanceId;
      const survivingIds = [s.perm("levelFourNso").permanentId, s.perm("sacrifice").permanentId];
      expect(observe(s.engine).hasKeyword(s.perm("levelFourNso"), "Scapegoat")).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("levelThreeNso"), "Scapegoat")).toBe(false);
      expect(observe(s.engine).hasKeyword(s.perm("sacrifice"), "Scapegoat")).toBe(false);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("levelThreeNso").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.some((event) => event.kind === "attackEnded") && !s.state.pendingDecision && !s.state.combatWindow,
      );
      const trashIds = s.state.players[1]!.trash.map((card) => card.instanceId);
      expect(trashIds).toContain(levelThreeId);
      expect(trashIds).not.toContain(sacrificeId);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(survivingIds);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  it("lets a level 4 NSo Digimon survive a losing battle by deleting another Digimon", async () => {
    const s = setupScenario(fixture, { autoAcceptOptional: true, autoSelectCards: true });
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      const levelFourId = s.perm("levelFourNso").permanentId;
      const otherIds = [s.inst("levelThreeNso").instanceId, s.inst("sacrifice").instanceId];
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("levelFourNso").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.some((event) => event.kind === "attackEnded") && !s.state.pendingDecision && !s.state.combatWindow,
      );
      expect(s.state.players[1]!.trash).toHaveLength(1);
      expect(otherIds).toContain(s.state.players[1]!.trash[0]!.instanceId);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(levelFourId);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
