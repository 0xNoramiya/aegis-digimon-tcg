import "#api/cards/index";
import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";
import fixture from "#api/engine/scenarios/galacticmon-immunity-loses-examon-battle.fixture";

describe("Galacticmon immunity against Examon's battle", () => {
  it("lets Examon battle the effect-immune Galacticmon and deletes it by the battle rule", async () => {
    const preferred: string[] = [];
    const s = setupScenario(fixture, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds: preferred,
    });
    const id = (alias: string) => s.inst(alias).instanceId;
    preferred.push(id("galacticmon"));
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(1);
      expect(
        s.engine.applyIntent(1, {
          type: "digivolve",
          instanceId: id("galacticmon"),
          permanentId: s.perm("snatchmon").permanentId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding && !s.state.pendingDecision);

      const galacticmon = s.perm("snatchmon");
      expect(galacticmon.topCard.instanceId).toBe(id("galacticmon"));
      expect(s.perm("greenMaterial").topCard.instanceId).toBe(id("greenMaterial"));

      expect(
        s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("blueMaterial").permanentId }),
      ).toEqual({
        ok: true,
      });
      await advance(s.engine).waitForMainPhase(0);
      expect(galacticmon.immuneToOpponentDigimonEffects && galacticmon.immuneToOpponentOptionEffects).toBe(true);
      expect(galacticmon.currentDP).toBe(14_000);

      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          instanceId: id("examon"),
          materialPermanentIds: [s.perm("greenMaterial").permanentId, s.perm("blueMaterial").permanentId],
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.some((event) => event.kind === "attackEnded") && !s.state.pendingDecision && !s.state.combatWindow,
      );

      expect(
        s.decisions.some(
          ({ seat, req }) => seat === 0 && req.sourceCardId === "EX13-045" && req.promptText.includes("battle"),
        ),
      ).toBe(true);
      expect(s.events.some((event) => event.kind === "attackDeclared" && event.redirected)).toBe(false);
      expect(s.state.players[1]!.security).toHaveLength(3);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(id("galacticmon"));
      const examon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.instanceId === id("examon"))!;
      expect(examon.currentDP).toBe(25_000);
      expect(
        s.events.some(
          (event) =>
            event.kind === "battleCompared" &&
            event.effectBattle?.attackerCardId === "EX13-045" &&
            event.defenderPermanentId === galacticmon.permanentId &&
            event.loserPermanentIds.includes(galacticmon.permanentId),
        ),
      ).toBe(true);
      expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
