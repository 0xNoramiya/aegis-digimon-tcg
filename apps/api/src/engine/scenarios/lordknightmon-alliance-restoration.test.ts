import { expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/lordknightmon-alliance-restoration.fixture";
import "#api/cards/EX13/EX13-064";
import "#api/cards/EX13/EX13-052";
import "#api/cards/ST17/ST17-13";

it("restores Alliance for a newly played Gladimon after security De-Digivolve removes LordKnightmon", async () => {
  const preferred: string[] = [];
  const s = setupScenario(fixture, {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoChooseOption: true,
    preferInstanceIds: preferred,
  });
  preferred.push(s.inst("lord").instanceId, s.inst("gladimon").instanceId);
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 4 && !s.state.pendingDecision && !s.state.combatWindow);
    expect(s.perm("lord").topCard.cardId).toBe("EX13-058");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lord").permanentId,
        instanceId: s.inst("restoredLord").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.combatWindow?.kind === "alliance");
    const prompt = s.events.findLast((event) => event.kind === "alliancePrompt")!;
    expect(prompt).toMatchObject({ eligibleAllyIds: [s.perm("lord").permanentId] });
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("lord").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 2 && !s.state.pendingDecision && !s.state.combatWindow);
    expect(s.perm("lord").isSuspended).toBe(true);
    expect(s.events.filter((event) => event.kind === "allianceResolved")).toHaveLength(1);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
