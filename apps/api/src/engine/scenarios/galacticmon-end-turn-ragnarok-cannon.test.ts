import "#api/cards/index";
import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/galacticmon-end-turn-ragnarok-cannon.fixture";

const vemmonTextTrash = ["vemmonA", "vemmonB", "snatchmonA", "snatchmonB"];

describe("Galacticmon end-of-opponent-turn digivolution uses Ragnarok Cannon", () => {
  it("digivolves EX11-046 into BT21-062, places four Vemmon-text cards, and uses Ragnarok Cannon for free", async () => {
    const preferred: string[] = [];
    const s = setupScenario(fixture, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: preferred,
    });
    const id = (alias: string) => s.inst(alias).instanceId;
    preferred.push(id("evolutionGalacticmon"), id("ragnarokCannon"), ...vemmonTextTrash.map(id));
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(1);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding && !s.state.pendingDecision);

      expect(
        s.decisions.filter(({ seat, req }) => seat === 0 && req.kind === "optional").map(({ req }) => req.sourceCardId),
      ).toEqual(["EX11-046", "BT21-062"]);

      const galacticmon = s.perm("assembledGalacticmon");
      expect(galacticmon.topCard.instanceId).toBe(id("evolutionGalacticmon"));
      expect(galacticmon.stack.at(-1)?.instanceId).toBe(id("assembledGalacticmon"));
      expect(
        galacticmon.stack
          .slice(0, 4)
          .map(({ instanceId }) => instanceId)
          .sort(),
      ).toEqual(vemmonTextTrash.map(id).sort());

      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([id("costlyRival")]);
      expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([id("cheapestRival")]);
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(id("ragnarokCannon"));
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(id("ragnarokCannon"));
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([id("unrelatedTrash")]);
      expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);

      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
